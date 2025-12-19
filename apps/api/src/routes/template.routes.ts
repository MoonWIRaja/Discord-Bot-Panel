import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { templates, flows } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const router = Router();

// Get all templates
router.get('/', async (req: Request, res: Response) => {
    try {
        const allTemplates = await db.select().from(templates);
        res.json(allTemplates);
    } catch (error: any) {
        console.error('[Templates] Error fetching templates:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get template by ID
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const [template] = await db.select().from(templates).where(eq(templates.id, id));
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }
        res.json(template);
    } catch (error: any) {
        console.error('[Templates] Error fetching template:', error);
        res.status(500).json({ error: error.message });
    }
});

// Import template to a bot (creates a new flow)
router.post('/:id/import/:botId', async (req: Request, res: Response) => {
    try {
        const { id, botId } = req.params;
        
        // Get template
        const [template] = await db.select().from(templates).where(eq(templates.id, id));
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }
        
        // Create new flow from template
        const flowId = randomUUID();
        await db.insert(flows).values({
            id: flowId,
            botId,
            name: template.name,
            triggerType: 'mixed', // Template can have multiple triggers
            nodes: template.nodes,
            edges: template.edges,
            published: false
        });
        
        // Increment download count
        await db.update(templates)
            .set({ downloads: (template.downloads || 0) + 1 })
            .where(eq(templates.id, id));
        
        res.json({ success: true, flowId, message: `Template "${template.name}" imported successfully` });
    } catch (error: any) {
        console.error('[Templates] Error importing template:', error);
        res.status(500).json({ error: error.message });
    }
});

export const templateRoutes = router;
