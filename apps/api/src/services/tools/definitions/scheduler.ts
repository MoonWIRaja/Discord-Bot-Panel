import { ToolDefinition, ToolRegistry } from '../registry.js';
import { db } from '../../../db/index.js';
import { aiScheduler } from '../../../db/schema.js';
import { eq, and, or } from 'drizzle-orm';
import { randomUUID } from 'crypto';

/**
 * Parse natural language time to cron expression or timestamp
 * Examples:
 * - "tomorrow at 5pm" → cron for next day 17:00
 * - "every day at 9am" → "0 9 * * *"
 * - "every Monday at 8am" → "0 8 * * 1"
 * - "in 30 minutes" → timestamp
 * - "every hour" → "0 * * * *"
 */
function parseTimeToSchedule(timeStr: string, timezone: string = 'UTC'): { type: 'cron' | 'timestamp'; value: string | number; display: string } | null {
    const now = new Date();
    const lower = timeStr.toLowerCase().trim();

    // One-time reminders with specific time
    // "in X minutes/hours/days"
    const inMatch = lower.match(/in\s+(\d+)\s+(minute|hour|day)s?\s*(at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)?/i);
    if (inMatch) {
        const amount = parseInt(inMatch[1]);
        const unit = inMatch[2];
        const targetTime = new Date(now);

        if (unit === 'minute') {
            targetTime.setMinutes(targetTime.getMinutes() + amount);
        } else if (unit === 'hour') {
            targetTime.setHours(targetTime.getHours() + amount);
        } else if (unit === 'day') {
            targetTime.setDate(targetTime.getDate() + amount);
        }

        // If there's a specific time mentioned
        if (inMatch[3]) {
            const timePart = inMatch[3].replace(/at\s+/i, '');
            const [hours, minutes = 0] = parseTime(hoursTo24(timePart));
            targetTime.setHours(hours, minutes, 0, 0);
        }

        return {
            type: 'timestamp',
            value: targetTime.getTime(),
            display: targetTime.toLocaleString()
        };
    }

    // "tomorrow at X" / "today at X" / specific date/time
    const dayMatch = lower.match(/(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
    if (dayMatch) {
        const day = dayMatch[1].toLowerCase();
        const timeStr = dayMatch[2];
        const [hours, minutes = 0] = parseTime(hoursTo24(timeStr));
        const targetDate = new Date(now);
        targetDate.setHours(hours, minutes, 0, 0);

        if (day === 'tomorrow') {
            targetDate.setDate(targetDate.getDate() + 1);
        } else if (day !== 'today') {
            const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const targetDay = daysOfWeek.indexOf(day);
            const currentDay = now.getDay();
            let daysUntil = targetDay - currentDay;
            if (daysUntil <= 0) daysUntil += 7;
            targetDate.setDate(targetDate.getDate() + daysUntil);
        }

        return {
            type: 'timestamp',
            value: targetDate.getTime(),
            display: targetDate.toLocaleString()
        };
    }

    // Recurring patterns
    // "every X minutes/hours"
    const everyMatch = lower.match(/every\s+(\d+)\s+(minute|hour)s?\s*/i);
    if (everyMatch) {
        const amount = parseInt(everyMatch[1]);
        const unit = everyMatch[2];
        if (unit === 'minute') {
            return { type: 'cron', value: `*/${amount} * * * *`, display: `Every ${amount} minutes` };
        } else if (unit === 'hour') {
            return { type: 'cron', value: `0 */${amount} * * *`, display: `Every ${amount} hours` };
        }
    }

    // "every hour" → hourly
    if (lower === 'every hour' || lower === 'hourly') {
        return { type: 'cron', value: '0 * * * *', display: 'Every hour' };
    }

    // "every minute" → every minute
    if (lower === 'every minute' || lower === 'minutely') {
        return { type: 'cron', value: '* * * * *', display: 'Every minute' };
    }

    // "every day at X" / "daily at X"
    const dailyMatch = lower.match(/(?:every|daily)\s+day\s*(?:at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?))?/i);
    if (dailyMatch || lower === 'daily' || lower === 'every day') {
        if (dailyMatch && dailyMatch[1]) {
            const [hours, minutes = 0] = parseTime(hoursTo24(dailyMatch[1]));
            return { type: 'cron', value: `${minutes} ${hours} * * *`, display: `Daily at ${padTime(hours, minutes)}` };
        }
        return { type: 'cron', value: '0 9 * * *', display: 'Daily at 9:00 AM' };
    }

    // "every week at X" / "weekly at X"
    const weeklyMatch = lower.match(/(?:every|weekly)\s+week\s*(?:on\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday))?\s*(?:at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?))?/i);
    if (weeklyMatch || lower === 'weekly' || lower === 'every week') {
        if (weeklyMatch && weeklyMatch[1]) {
            const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const dayIndex = days.indexOf(weeklyMatch[1].toLowerCase());
            const hours = weeklyMatch[2] ? parseTime(hoursTo24(weeklyMatch[2]))[0] : 9;
            return { type: 'cron', value: `0 ${hours} * * ${dayIndex}`, display: `Every ${weeklyMatch[1]} at ${padTime(hours, 0)}` };
        }
        return { type: 'cron', value: '0 9 * * 1', display: 'Every Monday at 9:00 AM' };
    }

    // "every monday/tuesday/etc at X"
    const dayOfWeekMatch = lower.match(/every\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s*(?:at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?))?/i);
    if (dayOfWeekMatch) {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayIndex = days.indexOf(dayOfWeekMatch[1].toLowerCase());
        const [hours, minutes = 0] = dayOfWeekMatch[2] ? parseTime(hoursTo24(dayOfWeekMatch[2])) : [9, 0];
        return { type: 'cron', value: `${minutes} ${hours} * * ${dayIndex}`, display: `Every ${dayOfWeekMatch[1]} at ${padTime(hours, minutes)}` };
    }

    // "every month at X" / "monthly at X"
    const monthlyMatch = lower.match(/(?:every|monthly)\s+month\s*(?:on\s+day\s+(\d+))?\s*(?:at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?))?/i);
    if (monthlyMatch || lower === 'monthly' || lower === 'every month') {
        const day = monthlyMatch && monthlyMatch[1] ? parseInt(monthlyMatch[1]) : 1;
        const [hours, minutes = 0] = monthlyMatch && monthlyMatch[2] ? parseTime(hoursTo24(monthlyMatch[2])) : [9, 0];
        return { type: 'cron', value: `${minutes} ${hours} ${day} * *`, display: `Monthly on day ${day} at ${padTime(hours, minutes)}` };
    }

    // Direct cron expression (for advanced users)
    if (/^[\d\*\/\-\,]+\s+[\d\*\/\-\,]+\s+[\d\*\/\-\,]+\s+[\d\*\/\-\,]+\s+[\d\*\/\-\,]+$/.test(lower)) {
        return { type: 'cron', value: lower, display: `Cron: ${lower}` };
    }

    // Default: couldn't parse
    return null;
}

/** Convert "9am"/"9pm"/"9:30am" to 24h format [hours, minutes] */
function hoursTo24(timeStr: string): string {
    let str = timeStr.toLowerCase().trim();
    let hasPm = str.includes('pm');
    let hasAm = str.includes('am');
    str = str.replace(/am|pm/g, '').trim();

    let [hours, minutes = '0'] = str.split(':').map(s => parseInt(s) || 0);
    if (hasPm && hours !== 12) hours += 12;
    if (hasAm && hours === 12) hours = 0;
    return `${hours}:${minutes}`;
}

/** Parse "H:M" string to [hours, minutes] */
function parseTime(timeStr: string): [number, number] {
    const [hours, minutes = 0] = timeStr.split(':').map(s => parseInt(s) || 0);
    return [hours, minutes];
}

/** Format time as "H:MM AM/PM" */
function padTime(hours: number, minutes: number): string {
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h = hours % 12 || 12;
    const m = minutes.toString().padStart(2, '0');
    return `${h}:${m} ${ampm}`;
}

const schedulerTool: ToolDefinition = {
    name: 'manage_schedule',
    description: '⏰ SCHEDULE TOOL - Creates REAL automatic reminders that will run at specified times. Use this tool DIRECTLY when user asks for reminders, schedules, or recurring tasks. DO NOT provide code snippets - just create the schedule.\n\nIMPORTANT: Extract the target channel from user message. If user says "send to #channel-name" or "hantar ke #channel", use targetChannel parameter with that channel name.\n\nExamples: "remind me every day at 9am", "daily prayer times", "weekly meeting every Monday at 2pm", "remind in 30 minutes", "send to #announcements". All times use Malaysia timezone (UTC+8) automatically.',
    category: 'utility',
    parameters: {
        action: {
            type: 'string',
            description: 'Action: "create" (make new reminder), "list" (show all reminders), "delete" (remove reminder), "pause" (temporary stop), "resume" (restart paused)',
            required: true
        },
        taskName: {
            type: 'string',
            description: 'Short unique name for this reminder (required for create): "prayer_times", "daily_standup", "water_reminder", etc.',
            required: false
        },
        description: {
            type: 'string',
            description: 'What message to send when reminder triggers: "Time for Subuh prayer!", "Daily standup meeting", "Drink water now!", etc.',
            required: false
        },
        time: {
            type: 'string',
            description: 'When to trigger (natural language): "every day at 6am", "every Monday at 9am", "in 30 minutes", "daily at 8am and 6pm", "every hour". Auto-converts to cron.',
            required: false
        },
        cron: {
            type: 'string',
            description: 'Direct cron expression (advanced): "0 6 * * *" for daily 6am, "0 9 * * 1" for Monday 9am, etc.',
            required: false
        },
        targetChannel: {
            type: 'string',
            description: 'Target channel ID or name (e.g., "apprentices", "1455631099408683131"). If not specified, uses current chat channel.',
            required: false
        }
    },
    handler: async ({ action, taskName, description, time, cron, targetChannel }, { botId, userId, channelId }) => {
        console.log(`[Tool:manage_schedule] Action: ${action}, Task: ${taskName}, Time: ${time}, TargetChannel: ${targetChannel}`);

        try {
            if (action === 'create') {
                if (!taskName) {
                    return '❌ Please provide a task name. Example: "prayer_times" or "daily_reminder"';
                }

                let scheduleInfo;
                let cronExpression = cron;

                // Parse natural language time if provided
                if (time && !cronExpression) {
                    scheduleInfo = parseTimeToSchedule(time);
                    if (!scheduleInfo) {
                        return `❌ Could not understand the time: "${time}". Try formats like:\n• "every day at 6am"\n• "daily at 9am"\n• "in 30 minutes"\n• "every Monday at 8am"`;
                    }
                    if (scheduleInfo.type === 'cron') {
                        cronExpression = scheduleInfo.value;
                    } else {
                        // One-time reminder - use timestamp
                        cronExpression = `ONE_TIME:${scheduleInfo.value}`;
                    }
                }

                if (!cronExpression) {
                    return '❌ Please specify when to remind using "time" parameter (natural language) or "cron" parameter.';
                }

                // Determine target channel - try to resolve from mentions or use provided ID
                let finalChannelId = channelId; // Default to current channel

                if (targetChannel) {
                    // If it looks like a channel ID (numeric), use it directly
                    if (/^\d{17,19}$/.test(targetChannel.trim())) {
                        finalChannelId = targetChannel.trim();
                    } else {
                        // Try to find channel by name using the bot
                        const { BotRuntime } = await import('../../bot.runtime.js');
                        const client = BotRuntime.activeBots.get(botId);
                        if (client) {
                            const channels = await client.channels.fetch(targetChannel).catch(() => null);
                            if (channels) {
                                finalChannelId = channels.id;
                            } else {
                                // Try to search for channel by name
                                const guild = client.guilds.cache.first();
                                if (guild) {
                                    const foundChannel = guild.channels.cache.find((ch: any) =>
                                        ch.name.toLowerCase().includes(targetChannel.toLowerCase()) ||
                                        ch.name.toLowerCase() === targetChannel.toLowerCase()
                                    );
                                    if (foundChannel) {
                                        finalChannelId = foundChannel.id;
                                    }
                                }
                            }
                        }
                        // If still not found, keep the original targetChannel name (will be resolved by scheduler)
                        if (finalChannelId === channelId) {
                            finalChannelId = targetChannel; // Store the name for later resolution
                        }
                    }
                }

                await db.insert(aiScheduler).values({
                    id: randomUUID(),
                    botId,
                    userId,
                    channelId: finalChannelId,
                    taskName,
                    taskDescription: description || taskName,
                    cronExpression,
                    status: 'active',
                    createdAt: new Date(),
                    updatedAt: new Date()
                });

                const scheduleDisplay = scheduleInfo?.display || cronExpression;
                const channelDisplay = finalChannelId !== channelId ? ` to channel "${targetChannel}"` : '';
                return `✅ Reminder "${taskName}" scheduled${channelDisplay}! Will run: ${scheduleDisplay}\n\n💭 The bot will send: "${description || taskName}"`;
            }

            if (action === 'list') {
                const tasks = await db.select().from(aiScheduler).where(eq(aiScheduler.botId, botId));
                if (tasks.length === 0) return '📋 No scheduled reminders found.';

                const taskList = tasks.map(t => {
                    let schedule = t.cronExpression;
                    if (schedule.startsWith('ONE_TIME:')) {
                        const ts = parseInt(schedule.replace('ONE_TIME:', ''));
                        schedule = `One-time: ${new Date(ts).toLocaleString()}`;
                    }
                    return `- [${t.status}] **${t.taskName}**: ${schedule}\n  └ ${t.taskDescription}`;
                }).join('\n\n');
                return `📋 Scheduled Reminders (${tasks.length}):\n\n${taskList}`;
            }

            if (action === 'delete') {
                if (!taskName) {
                    return '❌ Please specify which reminder to delete (task name).';
                }
                const result = await db.delete(aiScheduler)
                    .where(and(eq(aiScheduler.botId, botId), eq(aiScheduler.taskName, taskName)));
                return `🗑️ Reminder "${taskName}" has been deleted.`;
            }

            if (action === 'pause' || action === 'resume') {
                if (!taskName) {
                    return `❌ Please specify which reminder to ${action}.`;
                }
                await db.update(aiScheduler)
                    .set({ status: action === 'pause' ? 'paused' : 'active', updatedAt: new Date() })
                    .where(and(eq(aiScheduler.botId, botId), eq(aiScheduler.taskName, taskName)));
                return action === 'pause'
                    ? `⏸️ Reminder "${taskName}" has been paused.`
                    : `▶️ Reminder "${taskName}" has been resumed.`;
            }

            return '❌ Invalid action. Use "create", "list", "delete", "pause", or "resume".';
        } catch (error: any) {
            console.error('[Scheduler] Error:', error);
            return `❌ Error managing schedule: ${error.message}`;
        }
    }
};

ToolRegistry.register(schedulerTool);
export default schedulerTool;
