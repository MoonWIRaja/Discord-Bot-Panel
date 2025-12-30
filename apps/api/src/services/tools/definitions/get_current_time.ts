import { ToolDefinition, ToolRegistry } from '../registry.js';

const getCurrentTime: ToolDefinition = {
    name: 'get_current_time',
    description: 'Get the exact current time directly from the server system clock. capable of converting server time to any timezone (e.g. "Asia/Tokyo", "Europe/London"). Use this for ALL time-related queries ("What time is it?", "Time in London?").',
    category: 'info',
    parameters: {
        timezone: {
            type: 'string',
            description: 'Target timezone (e.g. Asia/Kuala_Lumpur, UTC, America/New_York). Defaults to server timezone.',
            required: false
        }
    },
    handler: async ({ timezone }: { timezone?: string }) => {
        const tz = timezone || process.env.SERVER_TIMEZONE || 'Asia/Kuala_Lumpur';
        console.log(`[Tool:get_current_time] Executing! Requested TZ: ${tz}`);
        try {
            const date = new Date();
            console.log(`[Tool:get_current_time] System Time: ${date.toISOString()}`);
            const timeStr = date.toLocaleTimeString('en-US', { 
                timeZone: tz, 
                hour12: true,
                hour: 'numeric',
                minute: '2-digit',
                second: '2-digit'
            });
            const dateStr = date.toLocaleDateString('en-US', { timeZone: tz, dateStyle: 'full' });
            const unixTimestamp = Math.floor(date.getTime() / 1000);
            
            return JSON.stringify({
                time: timeStr,
                date: dateStr,
                timezone: tz,
                unix_timestamp: unixTimestamp,
                day_of_week: date.toLocaleDateString('en-US', { timeZone: tz, weekday: 'long' }),
                full_iso: date.toISOString()
            });
        } catch (e: any) {
            return `Invalid timezone: ${e.message}`;
        }
    }
};

ToolRegistry.register(getCurrentTime);
export default getCurrentTime;
