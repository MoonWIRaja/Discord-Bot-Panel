import { ToolDefinition, ToolRegistry } from '../registry.js';
import { BotRuntime } from '../../bot.runtime.js';

const monitoringTool: ToolDefinition = {
    name: 'check_status',
    description: 'Check the bot health, uptime, and recent activity logs. Use this to troubleshoot issues or see what the bot has been doing.',
    category: 'utility',
    parameters: {
        type: {
            type: 'string',
            description: 'What to check: "health", "uptime", "logs"',
            required: true
        },
        limit: {
            type: 'number',
            description: 'Number of log entries to retrieve (max 50)',
            required: false
        }
    },
    handler: async ({ type, limit }, { botId }) => {
        console.log(`[Tool:check_status] Type: ${type}`);

        const client = BotRuntime.activeBots.get(botId);
        if (!client) return 'Bot is not active.';

        try {
            if (type === 'health') {
                const ping = client.ws.ping;
                const guilds = client.guilds.cache.size;
                const channels = client.channels.cache.size;
                const status = client.isReady() ? 'Healthy' : 'Degraded';
                
                return `Bot Health: ${status}\nWebsocket Ping: ${ping}ms\nServers: ${guilds}\nChannels: ${channels}`;
            }

            if (type === 'uptime') {
                const uptime = process.uptime();
                const days = Math.floor(uptime / 86400);
                const hours = Math.floor((uptime % 86400) / 3600);
                const minutes = Math.floor((uptime % 3600) / 60);
                
                return `Bot Process Uptime: ${days}d ${hours}h ${minutes}m`;
            }

            if (type === 'logs') {
                const logs = BotRuntime.getBotLogs(botId, limit || 20);
                if (logs.length === 0) return 'No recent activity logs found.';
                
                return 'Recent Activity Logs:\n' + logs.map(l => {
                    const time = l.timestamp.toLocaleTimeString();
                    return `[${time}] [${l.type}] ${l.message}`;
                }).join('\n');
            }

            return 'Invalid check type. Use "health", "uptime", or "logs".';
        } catch (error: any) {
            return `Error checking status: ${error.message}`;
        }
    }
};

ToolRegistry.register(monitoringTool);
export default monitoringTool;
