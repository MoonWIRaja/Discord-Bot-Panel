import { Router } from 'express';
import { BotService } from '../services/bot.service.js';
import { requireAuth } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

// Protect all bot routes
router.use(requireAuth);

const createBotSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(1)
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

router.post('/', async (req, res) => {
  try {
    const result = createBotSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
    }

    const user = (req as any).user;
    const bot = await BotService.createBot(user.id, result.data.token, result.data.name);
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
    res.json(bot);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bot' });
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
