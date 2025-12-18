import { Router } from 'express';
import { db } from '../db/index.js';
import { flows, bots } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
router.use(requireAuth);

const saveFlowSchema = z.object({
  botId: z.string(),
  name: z.string(),
  triggerType: z.string(),
  nodes: z.array(z.any()), // Validate stricter later
  edges: z.array(z.any())
});

// Get flows for a bot
router.get('/:botId', async (req, res) => {
  try {
    const user = (req as any).user;
    const { botId } = req.params;

    // Verify ownership
    const bot = await db.query.bots.findFirst({
        where: and(eq(bots.id, botId), eq(bots.userId, user.id))
    });

    if (!bot) {
        res.status(404).json({ error: 'Bot not found' });
        return;
    }

    const botFlows = await db.select().from(flows).where(eq(flows.botId, botId));
    res.json(botFlows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch flows' });
  }
});

// Save a flow
router.post('/', async (req, res) => {
  try {
    const result = saveFlowSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
    }
    
    const user = (req as any).user;
    const { botId, name, triggerType, nodes, edges } = result.data;

    // Verify ownership
    const bot = await db.query.bots.findFirst({
        where: and(eq(bots.id, botId), eq(bots.userId, user.id))
    });

    if (!bot) {
        res.status(404).json({ error: 'Bot not found' });
        return;
    }

    // Upsert logic or Create (simplified create for now)
    const id = uuidv4();
    await db.insert(flows).values({
        id,
        botId,
        name,
        triggerType,
        nodes,
        edges
    });

    res.status(201).json({ id, name });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save flow' });
  }
});

export const flowRoutes = router;
