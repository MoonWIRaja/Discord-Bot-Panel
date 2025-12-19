import { Router } from 'express';
import { BotService } from '../services/bot.service.js';
import { BotRuntime } from '../services/bot.runtime.js';
import { requireAuth } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

// Protect all bot routes
router.use(requireAuth);

const createBotSchema = z.object({
  token: z.string().min(1),
  name: z.string().optional() // Name is now optional as we fetch it from Discord
});

const updateBotSchema = z.object({
  name: z.string().min(1)
});

const addCollaboratorSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['editor', 'viewer']).optional()
});

router.get('/', async (req, res) => {
  try {
    const user = (req as any).user;
    const bots = await BotService.getUserBots(user.id);
    res.json(bots);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bots' });
  }
});

// Validate token without creating
router.post('/validate', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      res.status(400).json({ error: 'Token is required' });
      return;
    }

    // Check if token is already registered
    const isDuplicate = await BotService.isTokenDuplicate(token);
    if (isDuplicate) {
      res.status(400).json({ error: 'This bot is already registered in the system' });
      return;
    }

    const discordBot = await BotService.validateToken(token);
    if (!discordBot) {
      res.status(400).json({ error: 'Invalid Bot Token' });
      return;
    }
    res.json(discordBot);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Search users by Discord name or email
router.get('/users/search', async (req, res) => {
  try {
    const query = req.query.q as string;
    if (!query || query.length < 2) {
      res.status(400).json({ error: 'Search query must be at least 2 characters' });
      return;
    }
    const users = await BotService.searchUsers(query);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search users' });
  }
});

router.post('/', async (req, res) => {
  try {
    const result = createBotSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
    }

    const user = (req as any).user;
    // We pass token only, name is fetched from Discord
    const bot = await BotService.createBot(user.id, result.data.token);
    res.status(201).json(bot);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const user = (req as any).user;
    const bot = await BotService.getBot(req.params.id, user.id);
    if (!bot) {
        res.status(404).json({ error: 'Bot not found' });
        return;
    }
    // Mask token for safety
    const maskedBot = { ...bot, token: '******' };
    res.json(maskedBot);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bot' });
  }
});

// Get bot collaborators
router.get('/:id/collaborators', async (req, res) => {
  try {
    const user = (req as any).user;
    const bot = await BotService.getBot(req.params.id, user.id);
    if (!bot) {
      res.status(404).json({ error: 'Bot not found' });
      return;
    }
    const collaborators = await BotService.getCollaborators(req.params.id);
    res.json(collaborators);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch collaborators' });
  }
});

// Add collaborator
router.post('/:id/collaborators', async (req, res) => {
  try {
    const result = addCollaboratorSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    const user = (req as any).user;
    const bot = await BotService.getBot(req.params.id, user.id);
    if (!bot) {
      res.status(404).json({ error: 'Bot not found' });
      return;
    }

    // Only owner can add collaborators
    if (bot.userId !== user.id) {
      res.status(403).json({ error: 'Only bot owner can add collaborators' });
      return;
    }

    await BotService.addCollaborator(req.params.id, result.data.userId, result.data.role || 'editor');
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Remove collaborator
router.delete('/:id/collaborators/:collaboratorId', async (req, res) => {
  try {
    const user = (req as any).user;
    const bot = await BotService.getBot(req.params.id, user.id);
    if (!bot) {
      res.status(404).json({ error: 'Bot not found' });
      return;
    }

    // Only owner can remove collaborators
    if (bot.userId !== user.id) {
      res.status(403).json({ error: 'Only bot owner can remove collaborators' });
      return;
    }

    await BotService.removeCollaborator(req.params.id, req.params.collaboratorId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const result = updateBotSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    const user = (req as any).user;
    const bot = await BotService.getBot(req.params.id, user.id);
    if (!bot) {
      res.status(404).json({ error: 'Bot not found' });
      return;
    }

    // Update on Discord
    const token = Buffer.from(bot.token, 'base64').toString('ascii');
    await BotService.updateBotDiscordProfile(token, result.data.name);

    res.json({ success: true, name: result.data.name });

  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ----- Bot Control Endpoints -----

// Get bot status
router.get('/:id/status', async (req, res) => {
  try {
    const user = (req as any).user;
    const bot = await BotService.getBot(req.params.id, user.id);
    if (!bot) {
      res.status(404).json({ error: 'Bot not found' });
      return;
    }
    res.json({ status: bot.status || 'offline' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get bot status' });
  }
});

// Start bot
router.post('/:id/start', async (req, res) => {
  try {
    const user = (req as any).user;
    const bot = await BotService.getBot(req.params.id, user.id);
    if (!bot) {
      res.status(404).json({ error: 'Bot not found' });
      return;
    }

    // Actually start the bot and connect to Discord
    const result = await BotRuntime.startBot(req.params.id);

    if (!result.success) {
      res.status(500).json({ error: result.error || 'Failed to start bot' });
      return;
    }

    res.json({ success: true, status: 'online', message: 'Bot started and connected to Discord' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to start bot' });
  }
});

// Stop bot
router.post('/:id/stop', async (req, res) => {
  try {
    const user = (req as any).user;
    const bot = await BotService.getBot(req.params.id, user.id);
    if (!bot) {
      res.status(404).json({ error: 'Bot not found' });
      return;
    }

    // Actually stop the bot and disconnect from Discord
    const result = await BotRuntime.stopBot(req.params.id);

    if (!result.success) {
      res.status(500).json({ error: result.error || 'Failed to stop bot' });
      return;
    }

    res.json({ success: true, status: 'offline', message: 'Bot stopped' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to stop bot' });
  }
});

// Restart bot
router.post('/:id/restart', async (req, res) => {
  try {
    const user = (req as any).user;
    const bot = await BotService.getBot(req.params.id, user.id);
    if (!bot) {
      res.status(404).json({ error: 'Bot not found' });
      return;
    }

    // Actually restart the bot
    const result = await BotRuntime.restartBot(req.params.id);

    if (!result.success) {
      res.status(500).json({ error: result.error || 'Failed to restart bot' });
      return;
    }

    res.json({ success: true, status: 'online', message: 'Bot restarted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to restart bot' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const user = (req as any).user;
    await BotService.deleteBot(req.params.id, user.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete bot' });
  }
});

export const botRoutes = router;
