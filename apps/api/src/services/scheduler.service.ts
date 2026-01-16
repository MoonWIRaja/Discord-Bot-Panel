import { db } from '../db/index.js';
import { aiScheduler, bots } from '../db/schema.js';
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
            const tz = process.env.SERVER_TIMEZONE || 'Asia/Kuala_Lumpur';
            const nowDisplay = now.toLocaleString('en-MY', { timeZone: tz, dateStyle: 'short', timeStyle: 'medium' });
            const tasks = await db.select().from(aiScheduler).where(eq(aiScheduler.status, 'active'));

            if (tasks.length > 0) {
                console.log(`[SchedulerService] Checking ${tasks.length} active tasks at ${nowDisplay} (${tz})`);
            }

            for (const task of tasks) {
                const shouldRun = this.shouldRun(task, now);
                const isOneTime = task.cronExpression.startsWith('ONE_TIME:');

                if (shouldRun) {
                    console.log(`[SchedulerService] Executing task: ${task.taskName} (one-time: ${isOneTime})`);
                    await this.executeTask(task);

                    // Delete one-time tasks after execution
                    if (isOneTime) {
                        await db.delete(aiScheduler).where(eq(aiScheduler.id, task.id));
                        console.log(`[SchedulerService] Deleted one-time task: ${task.taskName}`);
                    }
                }
            }
        } catch (error) {
            console.error('[SchedulerService] Error checking tasks:', error);
        }
    }

    private static shouldRun(task: any, now: Date): boolean {
        const cron = task.cronExpression;
        const lastRun = task.lastRunAt ? new Date(task.lastRunAt) : new Date(0);

        // ONE_TIME reminders - check if time has passed
        if (cron.startsWith('ONE_TIME:')) {
            const targetTime = parseInt(cron.replace('ONE_TIME:', ''));
            const shouldRun = now.getTime() >= targetTime && (!task.lastRunAt || new Date(task.lastRunAt).getTime() < targetTime);
            console.log(`[SchedulerService] ONE_TIME check: task=${task.taskName}, target=${new Date(targetTime).toISOString()}, now=${now.toISOString()}, shouldRun=${shouldRun}`);
            return shouldRun;
        }

        const minutesSinceLastRun = (now.getTime() - lastRun.getTime()) / 60000;

        // "*/X * * * *" - Every X minutes
        if (cron.startsWith('*/')) {
            const parts = cron.split(' ');
            const intervalMins = parseInt(parts[0].substring(2));
            return minutesSinceLastRun >= intervalMins;
        }

        // "* * * * *" - Every minute
        if (cron === '* * * * *') {
            return minutesSinceLastRun >= 1;
        }

        // "0 * * * *" - Every hour
        if (cron === '0 * * * *') {
            return minutesSinceLastRun >= 60;
        }

        // "0 */X * * *" - Every X hours
        if (cron.startsWith('0 */') && cron.split(' ').length === 5) {
            const intervalHours = parseInt(cron.split(' ')[1].substring(2));
            return minutesSinceLastRun >= (intervalHours * 60);
        }

        // "M H * * *" or "M H D * *" or "M H D M *" - Daily/Weekly/Monthly at specific time
        // Format: minute hour day month weekday
        const parts = cron.split(' ');
        if (parts.length === 5) {
            const [cronMin, cronHour, cronDay, cronMonth, cronWeekday] = parts;

            // ====== TIMEZONE FIX ======
            // Use configured timezone to get correct local time components
            const tz = process.env.SERVER_TIMEZONE || 'Asia/Kuala_Lumpur';
            const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: tz,
                hour: 'numeric',
                minute: 'numeric',
                day: 'numeric',
                month: 'numeric',
                weekday: 'short',
                hour12: false
            });
            const nowParts = formatter.formatToParts(now);
            const currentMin = parseInt(nowParts.find(p => p.type === 'minute')?.value || '0');
            const currentHour = parseInt(nowParts.find(p => p.type === 'hour')?.value || '0');
            const currentDay = parseInt(nowParts.find(p => p.type === 'day')?.value || '1');
            const currentMonth = parseInt(nowParts.find(p => p.type === 'month')?.value || '1');
            const weekdayStr = nowParts.find(p => p.type === 'weekday')?.value || 'Sun';
            const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
            const currentWeekday = weekdayMap[weekdayStr] ?? 0;

            // Also get lastRun in the same timezone
            const lastRunParts = formatter.formatToParts(lastRun);
            const lastRunMin = parseInt(lastRunParts.find(p => p.type === 'minute')?.value || '0');
            const lastRunHour = parseInt(lastRunParts.find(p => p.type === 'hour')?.value || '0');
            const lastRunDay = parseInt(lastRunParts.find(p => p.type === 'day')?.value || '1');
            const lastRunMonth = parseInt(lastRunParts.find(p => p.type === 'month')?.value || '1');
            // ====== END TIMEZONE FIX ======

            // Check if we're in the right minute window (within the last minute)
            const isRightMinute = currentMin === parseInt(cronMin);
            const isRightHour = currentHour === parseInt(cronHour);
            const isRightMonth = cronMonth === '*' || currentMonth === parseInt(cronMonth);
            const isRightDay = cronDay === '*' || currentDay === parseInt(cronDay);
            const isRightWeekday = cronWeekday === '*' || currentWeekday === parseInt(cronWeekday);

            // Check if we haven't run this task in this time period yet
            let alreadyRanThisPeriod = false;

            if (cronDay !== '*' && cronWeekday === '*') {
                // Monthly/yearly - check if same day and haven't run this day
                alreadyRanThisPeriod = lastRunDay === currentDay && lastRunMonth === currentMonth;
            } else if (cronWeekday !== '*') {
                // Weekly - check if same weekday (use timezone-aware weekday)
                const lastRunWeekdayStr = lastRunParts.find(p => p.type === 'weekday')?.value || 'Sun';
                const lastRunWeekday = weekdayMap[lastRunWeekdayStr] ?? 0;
                const daysSinceLastRun = Math.floor((now.getTime() - lastRun.getTime()) / (1000 * 60 * 60 * 24));
                alreadyRanThisPeriod = daysSinceLastRun < 7 && lastRunWeekday === currentWeekday;
            } else {
                // Daily - check if same day (use timezone-aware comparison)
                alreadyRanThisPeriod = lastRunDay === currentDay && lastRunMonth === currentMonth;
            }

            // Also check if we already ran this hour/minute
            if (lastRunMonth === currentMonth && lastRunDay === currentDay) {
                if (lastRunHour === currentHour && lastRunMin === currentMin) {
                    alreadyRanThisPeriod = true;
                }
            }

            return isRightMinute && isRightHour && isRightMonth && isRightDay && isRightWeekday && !alreadyRanThisPeriod;
        }

        // Legacy support for "daily" string
        if (cron === 'daily' && minutesSinceLastRun >= 1430) return true;

        return false;
    }

    private static async executeTask(task: any) {
        console.log(`[SchedulerService] Executing task: ${task.taskName} for bot ${task.botId}, targetChannel: ${task.channelId}`);

        try {
            const client = BotRuntime.activeBots.get(task.botId);
            if (!client) {
                console.log(`[SchedulerService] Bot ${task.botId} not active`);
                return;
            }

            let channel = await client.channels.fetch(task.channelId).catch(() => null) as TextChannel;

            // If fetch failed, try to find channel by name
            if (!channel) {
                console.log(`[SchedulerService] Channel ID ${task.channelId} not found, trying to find by name...`);
                const guild = client.guilds.cache.first();
                if (guild) {
                    channel = guild.channels.cache.find(ch =>
                        ch.id === task.channelId ||
                        ch.name.toLowerCase().includes(task.channelId.toLowerCase()) ||
                        ch.name.toLowerCase() === task.channelId.toLowerCase()
                    ) as TextChannel;
                }
            }

            if (!channel) {
                console.log(`[SchedulerService] Channel ${task.channelId} still not found, skipping task`);
                return;
            }

            console.log(`[SchedulerService] Found channel: ${channel.name} (${channel.id})`);

            // For scheduled reminders, just send the taskDescription directly - no need for AI generation
            // This is more reliable and faster
            let messageToSend = task.taskDescription || task.taskName;

            // Add timestamp for context
            const currentTime = new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit' });
            messageToSend = `⏰ [${currentTime}] ${messageToSend}`;

            console.log(`[SchedulerService] Sending message: ${messageToSend.substring(0, 100)}`);

            const chunks = AIService.chunkMessage(messageToSend);
            for (const chunk of chunks) {
                await channel.send(chunk);
            }

            // Update last run time (except for one-time tasks which get deleted)
            if (!task.cronExpression.startsWith('ONE_TIME:')) {
                await db.update(aiScheduler)
                    .set({ lastRunAt: new Date(), updatedAt: new Date() })
                    .where(eq(aiScheduler.id, task.id));
            }

        } catch (error) {
            console.error(`[SchedulerService] Failed to execute task ${task.id}:`, error);
        }
    }
}
