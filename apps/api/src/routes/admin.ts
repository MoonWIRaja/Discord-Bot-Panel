import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { user, bots, plans, subscriptions, transactions, systemSettings, activityLogs, botCollaborators, session, account } from '../db/schema.js';
import { eq, desc, count, like, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export const adminRoutes = Router();

// ============================================================
// DASHBOARD STATS
// ============================================================

adminRoutes.get('/stats', async (req: Request, res: Response) => {
    try {
        const [userCount] = await db.select({ count: count() }).from(user);
        const [botCount] = await db.select({ count: count() }).from(bots);
        const [activeBotCount] = await db.select({ count: count() }).from(bots).where(eq(bots.status, 'online'));
        const [transactionCount] = await db.select({ count: count() }).from(transactions).where(eq(transactions.status, 'completed'));
        
        const [revenue] = await db.select({ 
            total: sql<number>`COALESCE(SUM(amount), 0)` 
        }).from(transactions).where(eq(transactions.status, 'completed'));
        
        res.json({
            users: userCount?.count || 0,
            bots: botCount?.count || 0,
            activeBots: activeBotCount?.count || 0,
            transactions: transactionCount?.count || 0,
            revenue: revenue?.total || 0
        });
    } catch (error) {
        console.error('[Admin] Error getting stats:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

// ============================================================
// USER MANAGEMENT
// ============================================================

adminRoutes.get('/users', async (req: Request, res: Response) => {
    try {
        const search = (req.query.search as string) || '';
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = (page - 1) * limit;
        
        let users;
        if (search) {
            users = await db.select().from(user)
                .where(like(user.name, `%${search}%`))
                .orderBy(desc(user.createdAt))
                .limit(limit).offset(offset);
        } else {
            users = await db.select().from(user)
                .orderBy(desc(user.createdAt))
                .limit(limit).offset(offset);
        }
        
        const [total] = await db.select({ count: count() }).from(user);
        
        res.json({
            users,
            pagination: {
                page,
                limit,
                total: total?.count || 0,
                pages: Math.ceil((total?.count || 0) / limit)
            }
        });
    } catch (error) {
        console.error('[Admin] Error getting users:', error);
        res.status(500).json({ error: 'Failed to get users' });
    }
});

adminRoutes.get('/users/:id', async (req: Request, res: Response) => {
    try {
        const userId = req.params.id;
        const [userData] = await db.select().from(user).where(eq(user.id, userId));
        
        if (!userData) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const userBots = await db.select().from(bots).where(eq(bots.userId, userId));
        
        const [subscription] = await db.select().from(subscriptions)
            .where(eq(subscriptions.userId, userId))
            .orderBy(desc(subscriptions.createdAt))
            .limit(1);
        
        res.json({
            user: userData,
            bots: userBots,
            subscription
        });
    } catch (error) {
        console.error('[Admin] Error getting user:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

adminRoutes.put('/users/:id', async (req: Request, res: Response) => {
    try {
        const userId = req.params.id;
        const { role, plan } = req.body;
        
        const updateData: any = { updatedAt: new Date() };
        if (role) updateData.role = role;
        if (plan) updateData.plan = plan;
        
        await db.update(user).set(updateData).where(eq(user.id, userId));
        
        await db.insert(activityLogs).values({
            id: randomUUID(),
            action: 'update_user',
            resource: 'users',
            resourceId: userId,
            details: { changes: { role, plan } }
        });
        
        res.json({ success: true });
    } catch (error) {
        console.error('[Admin] Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

adminRoutes.delete('/users/:id', async (req: Request, res: Response) => {
    try {
        const userId = req.params.id;
        
        // Get all bots owned by this user
        const userBots = await db.select().from(bots).where(eq(bots.userId, userId));
        const botIds = userBots.map(b => b.id);
        
        // Delete bot collaborators for user's bots
        for (const botId of botIds) {
            await db.delete(botCollaborators).where(eq(botCollaborators.botId, botId));
        }
        
        // Delete collaborator entries where this user is a collaborator
        await db.delete(botCollaborators).where(eq(botCollaborators.userId, userId));
        
        // Delete user's bots
        await db.delete(bots).where(eq(bots.userId, userId));
        
        // Delete transactions
        await db.delete(transactions).where(eq(transactions.userId, userId));
        
        // Delete subscriptions
        await db.delete(subscriptions).where(eq(subscriptions.userId, userId));
        
        // Delete sessions
        await db.delete(session).where(eq(session.userId, userId));
        
        // Delete accounts
        await db.delete(account).where(eq(account.userId, userId));
        
        // Delete activity logs
        await db.delete(activityLogs).where(eq(activityLogs.userId, userId));
        
        // Finally delete the user
        await db.delete(user).where(eq(user.id, userId));
        
        res.json({ success: true });
    } catch (error) {
        console.error('[Admin] Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// ============================================================
// BOT MANAGEMENT
// ============================================================

adminRoutes.get('/bots', async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = (page - 1) * limit;
        
        const allBots = await db.select({
            bot: bots,
            owner: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        })
        .from(bots)
        .leftJoin(user, eq(bots.userId, user.id))
        .orderBy(desc(bots.createdAt))
        .limit(limit)
        .offset(offset);
        
        const [total] = await db.select({ count: count() }).from(bots);
        
        res.json({
            bots: allBots,
            pagination: {
                page,
                limit,
                total: total?.count || 0,
                pages: Math.ceil((total?.count || 0) / limit)
            }
        });
    } catch (error) {
        console.error('[Admin] Error getting bots:', error);
        res.status(500).json({ error: 'Failed to get bots' });
    }
});

adminRoutes.delete('/bots/:id', async (req: Request, res: Response) => {
    try {
        const botId = req.params.id;
        await db.delete(bots).where(eq(bots.id, botId));
        res.json({ success: true });
    } catch (error) {
        console.error('[Admin] Error deleting bot:', error);
        res.status(500).json({ error: 'Failed to delete bot' });
    }
});

// ============================================================
// PLAN MANAGEMENT
// ============================================================

adminRoutes.get('/plans', async (req: Request, res: Response) => {
    try {
        const allPlans = await db.select().from(plans).orderBy(plans.sortOrder);
        res.json(allPlans);
    } catch (error) {
        console.error('[Admin] Error getting plans:', error);
        res.status(500).json({ error: 'Failed to get plans' });
    }
});

adminRoutes.post('/plans', async (req: Request, res: Response) => {
    try {
        const body = req.body;
        const newPlan = {
            id: randomUUID(),
            name: body.name,
            description: body.description || '',
            price: body.price ?? 0,
            currency: body.currency || 'MYR',
            interval: body.interval || 'monthly',
            botLimit: body.botLimit ?? 5,  // Use ?? so 0 is preserved
            flowLimit: body.flowLimit ?? 10,  // Use ?? so 0 is preserved
            features: body.features || [],
            isActive: true,
            sortOrder: body.sortOrder ?? 0,
            contactSupport: body.contactSupport ?? false
        };
        
        await db.insert(plans).values(newPlan);
        res.status(201).json(newPlan);
    } catch (error) {
        console.error('[Admin] Error creating plan:', error);
        res.status(500).json({ error: 'Failed to create plan' });
    }
});

adminRoutes.put('/plans/:id', async (req: Request, res: Response) => {
    try {
        const planId = req.params.id;
        await db.update(plans).set(req.body).where(eq(plans.id, planId));
        res.json({ success: true });
    } catch (error) {
        console.error('[Admin] Error updating plan:', error);
        res.status(500).json({ error: 'Failed to update plan' });
    }
});

adminRoutes.delete('/plans/:id', async (req: Request, res: Response) => {
    try {
        const planId = req.params.id;
        
        // First, delete foreign key references in related tables
        // or set them to default - here we'll just delete related transactions
        await db.delete(transactions).where(eq(transactions.planId, planId));
        await db.delete(subscriptions).where(eq(subscriptions.planId, planId));
        
        // Now delete the plan
        await db.delete(plans).where(eq(plans.id, planId));
        res.json({ success: true });
    } catch (error) {
        console.error('[Admin] Error deleting plan:', error);
        res.status(500).json({ error: 'Failed to delete plan' });
    }
});

// ============================================================
// SYSTEM SETTINGS
// ============================================================

adminRoutes.get('/settings', async (req: Request, res: Response) => {
    try {
        const category = req.query.category as string;
        
        let settings;
        if (category) {
            settings = await db.select().from(systemSettings).where(eq(systemSettings.category, category));
        } else {
            settings = await db.select().from(systemSettings);
        }
        
        const settingsObj: Record<string, any> = {};
        for (const s of settings) {
            settingsObj[s.key] = s.value;
        }
        
        res.json(settingsObj);
    } catch (error) {
        console.error('[Admin] Error getting settings:', error);
        res.status(500).json({ error: 'Failed to get settings' });
    }
});

adminRoutes.put('/settings', async (req: Request, res: Response) => {
    try {
        const { key, value, category, description } = req.body;
        
        const existing = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
        
        if (existing.length > 0) {
            await db.update(systemSettings)
                .set({ value, category, description, updatedAt: new Date() })
                .where(eq(systemSettings.key, key));
        } else {
            await db.insert(systemSettings).values({
                id: randomUUID(),
                key,
                value,
                category: category || 'general',
                description
            });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('[Admin] Error updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

adminRoutes.post('/settings/bulk', async (req: Request, res: Response) => {
    try {
        const { settings, category } = req.body;
        
        for (const [key, value] of Object.entries(settings)) {
            // Convert value to string for storage
            const valueStr = String(value);
            
            const existing = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
            
            if (existing.length > 0) {
                await db.update(systemSettings)
                    .set({ value: valueStr, updatedAt: new Date() })
                    .where(eq(systemSettings.key, key));
            } else {
                await db.insert(systemSettings).values({
                    id: randomUUID(),
                    key,
                    value: valueStr,
                    category: category || 'general'
                });
            }
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('[Admin] Error bulk updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// ============================================================
// ACTIVITY LOGS
// ============================================================

adminRoutes.get('/logs', async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = (page - 1) * limit;
        
        const logs = await db.select({
            log: activityLogs,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        })
        .from(activityLogs)
        .leftJoin(user, eq(activityLogs.userId, user.id))
        .orderBy(desc(activityLogs.createdAt))
        .limit(limit)
        .offset(offset);
        
        const [total] = await db.select({ count: count() }).from(activityLogs);
        
        res.json({
            logs,
            pagination: {
                page,
                limit,
                total: total?.count || 0,
                pages: Math.ceil((total?.count || 0) / limit)
            }
        });
    } catch (error) {
        console.error('[Admin] Error getting logs:', error);
        res.status(500).json({ error: 'Failed to get logs' });
    }
});

// ============================================================
// TRANSACTIONS
// ============================================================

adminRoutes.get('/transactions', async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = (page - 1) * limit;
        
        const allTransactions = await db.select({
            transaction: transactions,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        })
        .from(transactions)
        .leftJoin(user, eq(transactions.userId, user.id))
        .orderBy(desc(transactions.createdAt))
        .limit(limit)
        .offset(offset);
        
        const [total] = await db.select({ count: count() }).from(transactions);
        
        res.json({
            transactions: allTransactions,
            pagination: {
                page,
                limit,
                total: total?.count || 0,
                pages: Math.ceil((total?.count || 0) / limit)
            }
        });
    } catch (error) {
        console.error('[Admin] Error getting transactions:', error);
        res.status(500).json({ error: 'Failed to get transactions' });
    }
});

export default adminRoutes;
