import { Collection } from 'discord.js';

export interface ToolArgument {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    description: string;
    required?: boolean;
    enum?: string[];
}

export interface ToolContext {
    botId: string;
    userId: string;
    channelId: string;
}

export interface ToolResult {
    content: string;
    files?: Array<{ name: string; content: string; size?: number }>;
    sessionId?: string;
    [key: string]: any;
}

export interface ToolDefinition {
    name: string;
    description: string;
    parameters: Record<string, ToolArgument>;
    handler: (args: any, context: ToolContext) => Promise<string | ToolResult>;
    category?: 'utility' | 'search' | 'info' | 'fun';
}

export class ToolRegistry {
    private static tools = new Collection<string, ToolDefinition>();

    static register(tool: ToolDefinition) {
        this.tools.set(tool.name, tool);
        console.log(`[ToolRegistry] Registered tool: ${tool.name}`);
    }

    static getTool(name: string) {
        return this.tools.get(name);
    }

    static getAllTools() {
        return Array.from(this.tools.values());
    }

    /**
     * Convert tools to OpenAI/Gemini compatible format
     */
    static getToolDefinitions() {
        return this.getAllTools().map(tool => ({
            type: 'function',
            function: {
                name: tool.name,
                description: tool.description,
                parameters: {
                    type: 'object',
                    properties: Object.entries(tool.parameters).reduce((acc, [key, conf]) => ({
                        ...acc,
                        [key]: {
                            type: conf.type,
                            description: conf.description,
                            enum: conf.enum
                        }
                    }), {}),
                    required: Object.entries(tool.parameters)
                        .filter(([_, conf]) => conf.required !== false)
                        .map(([key]) => key)
                }
            }
        }));
    }

    /**
     * Calculate cost for tool usage (most are free)
     */
    static getToolCost(toolName: string, args: any): number {
        // Future: Add pricing for paid tools
        return 0;
    }
}
