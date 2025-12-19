import { Router } from 'express';
import { db } from '../db/index.js';
import { flows, bots } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { BotService } from '../services/bot.service.js';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
router.use(requireAuth);

const saveFlowSchema = z.object({
  botId: z.string(),
  name: z.string(),
  triggerType: z.string(),
  nodes: z.union([z.string(), z.array(z.any())]),
  edges: z.union([z.string(), z.array(z.any())]),
  published: z.boolean().optional()
});

// Get flows for a bot (owner OR collaborator can access)
router.get('/:botId', async (req, res) => {
  try {
    const user = (req as any).user;
    const { botId } = req.params;

    // Verify access (owner OR collaborator)
    const bot = await BotService.getBot(botId, user.id);

    if (!bot) {
      res.status(404).json({ error: 'Bot not found or no access' });
        return;
    }

    const botFlows = await db.select().from(flows).where(eq(flows.botId, botId));
    res.json(botFlows);
  } catch (error) {
    console.error("Error fetching flows:", error);
    res.status(500).json({ error: 'Failed to fetch flows' });
  }
});

// Save a flow (owner OR collaborator can save)
router.post('/', async (req, res) => {
  try {
    const result = saveFlowSchema.safeParse(req.body);
    if (!result.success) {
      console.error("Flow validation error:", result.error);
      res.status(400).json({ error: 'Invalid flow data', details: result.error });
        return;
    }
    
    const user = (req as any).user;
    const { botId, name, triggerType, nodes, edges, published } = result.data;

    // Verify access (owner OR collaborator)
    const bot = await BotService.getBot(botId, user.id);

    if (!bot) {
      res.status(404).json({ error: 'Bot not found or no access' });
        return;
    }

    // Check if flow already exists for this bot
    const existingFlow = await db.query.flows.findFirst({
      where: eq(flows.botId, botId)
    });

    // Normalize nodes/edges to strings for storage
    const nodesStr = typeof nodes === 'string' ? nodes : JSON.stringify(nodes);
    const edgesStr = typeof edges === 'string' ? edges : JSON.stringify(edges);

    if (existingFlow) {
      // Update existing flow
      await db.update(flows)
        .set({
          name,
          triggerType,
          nodes: nodesStr,
          edges: edgesStr,
          published: published ?? true,
          updatedAt: new Date()
        })
        .where(eq(flows.id, existingFlow.id));

      res.json({ id: existingFlow.id, name, updated: true });
    } else {
      // Create new flow
      const id = uuidv4();
      await db.insert(flows).values({
        id,
        botId,
        name,
        triggerType,
        nodes: nodesStr,
        edges: edgesStr,
        published: published ?? true
      });

      res.status(201).json({ id, name, created: true });
    }
  } catch (error) {
    console.error("Error saving flow:", error);
    res.status(500).json({ error: 'Failed to save flow' });
  }
});

export const flowRoutes = router;
