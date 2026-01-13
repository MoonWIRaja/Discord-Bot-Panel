import { db } from '../db/index.js';
import { aiScheduler, bots, aiConfigs } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { BotRuntime } from './bot.runtime.js';
import { AIService } from './ai.service.js';
import { TextChannel } from 'discord.js';

export class SchedulerService {
    private static interval: NodeJS.Timeout | null = null;

    static start() {
        if (this.interval) return;
        
        console.log('[SchedulerService] Starting scheduler (1-minute interval)');
        this.interval = setInterval(() => this.checkTasks(), 60000);
        // Also run once immediately
        this.checkTasks();
    }

    static stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    private static async checkTasks() {
        try {
            const now = new Date();
            const tasks = await db.select().from(aiScheduler).where(eq(aiScheduler.status, 'active'));

            for (const task of tasks) {
                if (this.shouldRun(task, now)) {
                    await this.executeTask(task);
                }
            }
        } catch (error) {
            console.error('[SchedulerService] Error checking tasks:', error);
        }
    }

    private static shouldRun(task: any, now: Date): boolean {
        // Simple cron logic support: 
        // "*/60 * * * *" (hourly)
        // "0 9 * * *" (daily at 9am)
        // "0 0 * * 0" (weekly Sunday midnight)
        
        const cron = task.cronExpression;
        const lastRun = task.lastRunAt ? new Date(task.lastRunAt) : new Date(0);
        const minutesSinceLastRun = (now.getTime() - lastRun.getTime()) / 60000;

        if (cron.startsWith('*/')) {
            const intervalMins = parseInt(cron.split(' ')[0].substring(2));
            return minutesSinceLastRun >= intervalMins;
        }

        if (cron.startsWith('0 ') && cron.includes(' * * *')) {
            // Daily at specific hour: "0 H * * *"
            const hour = parseInt(cron.split(' ')[1]);
            const isTargetHour = now.getHours() === hour && now.getMinutes() < 2;
            const isNewDay = now.getDate() !== lastRun.getDate();
            return isTargetHour && isNewDay;
        }

        // Default: If last run was more than 24h ago and it's a "daily" task
        if (cron === 'daily' && minutesSinceLastRun >= 1430) return true;

        return false;
    }

    private static async executeTask(task: any) {
        console.log(`[SchedulerService] Executing task: ${task.taskName} for bot ${task.botId}`);
        
        try {
            const client = BotRuntime.activeBots.get(task.botId);
            if (!client) return;

            const channel = await client.channels.fetch(task.channelId) as TextChannel;
            if (!channel) return;

            // Get bot config for AI
            const botConfig = await db.select().from(aiConfigs)
                .where(and(eq(aiConfigs.botId, task.botId), eq(aiConfigs.isEnabled, true)))
                .limit(1);
            
            if (botConfig.length === 0) return;
            const config = botConfig[0];

            // Use AI to generate the task content
            const prompt = `You are a scheduled task runner. Your task is: "${task.taskName}". 
            Description: "${task.taskDescription}".
            Please generate a helpful, conversational message for the Discord channel based on this task. 
            If it's a reminder, be friendly. If it's a digest, be informative.
            Current Time: ${new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })} (Malaysia Time)`;

            const response = await AIService.chat({
                provider: config.provider,
                apiKey: config.apiKey,
                model: (config.models as string[])?.[0] || 'gemini-1.5-flash',
                mode: 'chat'
            }, [{ role: 'system', content: prompt }]);

            if (response.content) {
                const chunks = AIService.chunkMessage(response.content);
                for (const chunk of chunks) {
                    await channel.send(chunk);
                }
            }

            // Update last run time
            await db.update(aiScheduler)
                .set({ lastRunAt: new Date(), updatedAt: new Date() })
                .where(eq(aiScheduler.id, task.id));

        } catch (error) {
            console.error(`[SchedulerService] Failed to execute task ${task.id}:`, error);
        }
    }
}
