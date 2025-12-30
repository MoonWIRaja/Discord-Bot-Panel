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

    // Convert jsonb (objects) to strings for frontend compatibility
    const serializedFlows = botFlows.map(flow => ({
      ...flow,
      nodes: typeof flow.nodes === 'string' ? flow.nodes : JSON.stringify(flow.nodes),
      edges: typeof flow.edges === 'string' ? flow.edges : JSON.stringify(flow.edges)
    }));

    res.json(serializedFlows);
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
    const flowId = req.body.flowId; // Optional - if provided, update that flow

    // Verify access (owner OR collaborator)
    const bot = await BotService.getBot(botId, user.id);

    if (!bot) {
      res.status(404).json({ error: 'Bot not found or no access' });
        return;
    }

    // Normalize nodes/edges to strings for storage
    const nodesStr = typeof nodes === 'string' ? nodes : JSON.stringify(nodes);
    const edgesStr = typeof edges === 'string' ? edges : JSON.stringify(edges);

    // Extract ALL AI Provider nodes and save to bot config as providers array
    try {
      const nodesArray = typeof nodes === 'string' ? JSON.parse(nodes) : nodes;
      const aiProviderNodes = nodesArray.filter((n: any) => n.type === 'aiProvider');
      console.log(`[FlowRoutes] Found ${aiProviderNodes.length} aiProvider nodes`);

      if (aiProviderNodes.length > 0) {
        // Get current bot config
        const botData = await db.select().from(bots).where(eq(bots.id, botId));
        if (botData[0]) {
          const rawConfig = botData[0].config;
          const config = typeof rawConfig === 'string' ? JSON.parse(rawConfig || '{}') : (rawConfig || {});

          // Build providers array from all AI Provider nodes
          const providers: any[] = [];
          let defaultProvider = '';

          for (const node of aiProviderNodes) {
            const data = node.data || {};
            console.log(`[FlowRoutes] AI Provider node data:`, JSON.stringify(data));
            if (data.provider && data.apiKey && data.isEnabled !== false) {
              providers.push({
                id: data.provider,
                apiKey: data.apiKey,
                // New format: modeX booleans from Studio toggles
                modeChat: data.modeChat,
                modeCode: data.modeCode,
                modeDebug: data.modeDebug,
                modeImage: data.modeImage,
                modeVideo: data.modeVideo,
                modeAudio: data.modeAudio,
                modeMusic: data.modeMusic,
                modeVision: data.modeVision,
                modeTranslate: data.modeTranslate,
                modeSummarize: data.modeSummarize,
                modeResearch: data.modeResearch,
                modeCreative: data.modeCreative,
                // Fetched/validated models from Studio - use these in /set command
                fetchedModels: data.fetchedModels || [],
                // Old format: models object (backward compat)
                models: {
                  chat: data.modelChat || '',
                  code: data.modelCode || '',
                  debug: data.modelDebug || '',
                  image: data.modelImage || '',
                  video: data.modelVideo || '',
                  audio: data.modelAudio || '',
                  music: data.modelMusic || '',
                  vision: data.modelVision || '',
                  translate: data.modelTranslate || '',
                  summarize: data.modelSummarize || '',
                  research: data.modelResearch || '',
                  creative: data.modelCreative || ''
                },
                // Azure/Ollama specific
                azureEndpoint: data.azureEndpoint || '',
                azureDeployment: data.azureDeployment || '',
                ollamaHost: data.ollamaHost || ''
              });

              // First enabled provider is default
              if (!defaultProvider) {
                defaultProvider = data.provider;
              }
            }
          }

          // Update AI config with providers array
          config.ai = {
            providers: providers,
            defaultProvider: defaultProvider || 'gemini',
            defaultMode: config.ai?.defaultMode || 'auto'
          };

          // Save updated config
          await db.update(bots)
            .set({ config: JSON.stringify(config), updatedAt: new Date() })
            .where(eq(bots.id, botId));

          console.log(`[FlowRoutes] AI config saved for bot ${botId}: ${providers.length} providers configured (${providers.map(p => p.id).join(', ')})`);
        }
      }
    } catch (e) {
      console.error('[FlowRoutes] Error extracting AI Provider config:', e);
    }

    // If flowId provided, update that specific flow
    if (flowId) {
      const existingFlow = await db.select().from(flows).where(eq(flows.id, flowId));
      if (existingFlow[0]) {
        await db.update(flows)
          .set({
            name,
            triggerType,
            nodes: nodesStr,
            edges: edgesStr,
            published: published ?? true,
            updatedAt: new Date()
          })
          .where(eq(flows.id, flowId));

        res.json({ id: flowId, name, updated: true });
        return;
      }
    }

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
  } catch (error) {
    console.error("Error saving flow:", error);
    res.status(500).json({ error: 'Failed to save flow' });
  }
});

// Delete all flows for a bot (before saving new merged flow)
router.delete('/bot/:botId', async (req, res) => {
  try {
    const user = (req as any).user;
    const { botId } = req.params;

    // Verify access (owner OR collaborator)
    const bot = await BotService.getBot(botId, user.id);

    if (!bot) {
      res.status(404).json({ error: 'Bot not found or no access' });
      return;
    }

    // Delete all flows for this bot
    await db.delete(flows).where(eq(flows.botId, botId));

    res.json({ success: true, message: 'All flows deleted' });
  } catch (error) {
    console.error("Error deleting flows:", error);
    res.status(500).json({ error: 'Failed to delete flows' });
  }
});

// Delete a single flow by ID
router.delete('/:flowId', async (req, res) => {
  try {
    const user = (req as any).user;
    const { flowId } = req.params;

    // Get the flow first to check access
    const flow = await db.select().from(flows).where(eq(flows.id, flowId));
    if (!flow[0]) {
      res.status(404).json({ error: 'Flow not found' });
      return;
    }

    // Verify access to the bot
    const bot = await BotService.getBot(flow[0].botId, user.id);
    if (!bot) {
      res.status(403).json({ error: 'No access to this flow' });
      return;
    }

    // Delete the flow
    await db.delete(flows).where(eq(flows.id, flowId));

    res.json({ success: true, message: 'Flow deleted' });
  } catch (error) {
    console.error("Error deleting flow:", error);
    res.status(500).json({ error: 'Failed to delete flow' });
  }
});

// Update a flow (rename)
router.put('/:flowId', async (req, res) => {
  try {
    const user = (req as any).user;
    const { flowId } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    // Get the flow first to check access
    const flow = await db.select().from(flows).where(eq(flows.id, flowId));
    if (!flow[0]) {
      res.status(404).json({ error: 'Flow not found' });
      return;
    }

    // Verify access to the bot
    const bot = await BotService.getBot(flow[0].botId, user.id);
    if (!bot) {
      res.status(403).json({ error: 'No access to this flow' });
      return;
    }

    // Update the flow name
    await db.update(flows).set({ name: name.trim(), updatedAt: new Date() }).where(eq(flows.id, flowId));

    res.json({ success: true, message: 'Flow renamed', name: name.trim() });
  } catch (error) {
    console.error("Error updating flow:", error);
    res.status(500).json({ error: 'Failed to update flow' });
  }
});

export const flowRoutes = router;
