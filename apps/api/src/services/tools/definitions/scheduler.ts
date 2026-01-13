import { ToolDefinition, ToolRegistry } from '../registry.js';
import { db } from '../../../db/index.js';
import { aiScheduler } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const schedulerTool: ToolDefinition = {
    name: 'manage_schedule',
    description: 'Create, list, or delete scheduled tasks (reminders, weekly announcements, prayer times). Example: "remind me to drink water every hour" or "digest news every Monday at 8am".',
    category: 'utility',
    parameters: {
        action: {
            type: 'string',
            description: 'Action to perform: "create", "list", "delete", "pause", "resume"',
            required: true
        },
        taskName: {
            type: 'string',
            description: 'A unique name for the task',
            required: true
        },
        description: {
            type: 'string',
            description: 'Detailed description of what the task should do',
            required: false
        },
        cron: {
            type: 'string',
            description: 'Cron expression (e.g., "0 9 * * *" for daily at 9am, or "*/60 * * * *" for every hour)',
            required: false
        }
    },
    handler: async ({ action, taskName, description, cron }, { botId, userId, channelId }) => {
        console.log(`[Tool:manage_schedule] Action: ${action}, Task: ${taskName}`);

        try {
            if (action === 'create') {
                if (!cron) return 'Cron expression is required for creating a task.';
                
                await db.insert(aiScheduler).values({
                    id: randomUUID(),
                    botId,
                    userId,
                    channelId,
                    taskName,
                    taskDescription: description || '',
                    cronExpression: cron,
                    status: 'active',
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                return `Task "${taskName}" scheduled with cron "${cron}". I will handle it at the specified times.`;
            }

            if (action === 'list') {
                const tasks = await db.select().from(aiScheduler).where(eq(aiScheduler.botId, botId));
                if (tasks.length === 0) return 'No scheduled tasks found for this bot.';
                
                return 'Scheduled Tasks:\n' + tasks.map(t => `- [${t.status}] ${t.taskName}: ${t.cronExpression} (${t.taskDescription})`).join('\n');
            }

            if (action === 'delete') {
                await db.delete(aiScheduler)
                    .where(eq(aiScheduler.botId, botId))
                    .where(eq(aiScheduler.taskName, taskName));
                return `Task "${taskName}" has been deleted.`;
            }

            if (action === 'pause' || action === 'resume') {
                await db.update(aiScheduler)
                    .set({ status: action === 'pause' ? 'paused' : 'active', updatedAt: new Date() })
                    .where(eq(aiScheduler.botId, botId))
                    .where(eq(aiScheduler.taskName, taskName));
                return `Task "${taskName}" has been ${action === 'pause' ? 'paused' : 'resumed'}.`;
            }

            return 'Invalid action. Use "create", "list", "delete", "pause", or "resume".';
        } catch (error: any) {
            return `Error managing schedule: ${error.message}`;
        }
    }
};

ToolRegistry.register(schedulerTool);
export default schedulerTool;
