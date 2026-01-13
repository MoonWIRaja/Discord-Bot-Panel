import { ToolDefinition, ToolRegistry } from '../registry.js';
import { KnowledgeService } from '../../knowledge.service.js';

const memoryTool: ToolDefinition = {
    name: 'manage_memory',
    description: 'Explicitly save or retrieve important information, user preferences, or server settings to the long-term knowledge base. Use this to remember things like "User X likes short answers" or "Default channel for announcements is Y".',
    category: 'utility',
    parameters: {
        action: {
            type: 'string',
            description: 'The action to perform: "save", "retrieve", or "delete"',
            required: true
        },
        key: {
            type: 'string',
            description: 'The topic or key of the information (e.g., "user_preference", "server_config")',
            required: true
        },
        value: {
            type: 'string',
            description: 'The value or information to remember (required for "save")',
            required: false
        },
        category: {
            type: 'string',
            description: 'Optional category (preference, fact, config, person, company)',
            required: false
        }
    },
    handler: async ({ action, key, value, category }, { botId }) => {
        console.log(`[Tool:manage_memory] Action: ${action}, Key: ${key}`);

        try {
            if (action === 'save') {
                if (!value) return 'Value is required to save information.';
                await KnowledgeService.addManualEntry(botId, category || 'fact', key, value);
                return `Successfully remembered: ${key} = ${value}`;
            }

            if (action === 'retrieve') {
                const results = await KnowledgeService.getKnowledge(botId);
                const match = results.find(r => r.key.toLowerCase().includes(key.toLowerCase()));
                if (match) {
                    return `Found information for "${key}": ${match.value} (Category: ${match.category})`;
                }
                return `No information found for "${key}".`;
            }

            if (action === 'delete') {
                const results = await KnowledgeService.getKnowledge(botId);
                const match = results.find(r => r.key.toLowerCase() === key.toLowerCase());
                if (match) {
                    await KnowledgeService.deleteEntry(botId, match.id);
                    return `Successfully deleted memory for "${key}".`;
                }
                return `Memory for "${key}" not found.`;
            }

            return 'Invalid action. Use "save", "retrieve", or "delete".';
        } catch (error: any) {
            return `Error managing memory: ${error.message}`;
        }
    }
};

ToolRegistry.register(memoryTool);
export default memoryTool;
