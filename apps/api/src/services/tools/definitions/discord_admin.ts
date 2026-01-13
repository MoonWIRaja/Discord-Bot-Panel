import { ToolDefinition, ToolRegistry } from '../registry.js';
import { BotRuntime } from '../../bot.runtime.js';
import { ChannelType, PermissionFlagsBits } from 'discord.js';

const discordAdminTool: ToolDefinition = {
    name: 'manage_discord',
    description: 'Perform administrative actions on the Discord server. Actions: "create_channel", "delete_channel", "create_role", "delete_role", "kick", "ban".',
    category: 'utility',
    parameters: {
        action: {
            type: 'string',
            description: 'Action to perform: "create_channel", "delete_channel", "create_role", "delete_role", "kick", "ban"',
            required: true
        },
        name: {
            type: 'string',
            description: 'Name for the new channel or role',
            required: false
        },
        id: {
            type: 'string',
            description: 'ID of the channel, role, or user to manage',
            required: false
        },
        reason: {
            type: 'string',
            description: 'Reason for the administrative action',
            required: false
        }
    },
    handler: async ({ action, name, id, reason }, { botId }) => {
        console.log(`[Tool:manage_discord] Action: ${action}`);

        const client = BotRuntime.activeBots.get(botId);
        if (!client) return 'Bot is not active.';

        try {
            // Find the guild from the client (assuming the bot is in the guild where the command was ran)
            // In a real multi-guild scenario, we might need guildId in context. 
            // For now, let's assume the first guild or we'd need to add guildId to ToolContext.
            const guilds = await client.guilds.fetch();
            const guildBase = guilds.first();
            if (!guildBase) return 'Bot is not in any servers.';
            const guild = await guildBase.fetch();

            if (action === 'create_channel') {
                if (!name) return 'Channel name is required.';
                const channel = await guild.channels.create({
                    name: name,
                    type: ChannelType.GuildText,
                    reason: reason || 'Created by AI'
                });
                return `Successfully created channel: ${channel.name} (${channel.id})`;
            }

            if (action === 'delete_channel') {
                if (!id) return 'Channel ID is required.';
                const channel = await guild.channels.fetch(id);
                if (channel) {
                    await channel.delete(reason || 'Deleted by AI');
                    return `Successfully deleted channel with ID: ${id}`;
                }
                return 'Channel not found.';
            }

            if (action === 'create_role') {
                if (!name) return 'Role name is required.';
                const role = await guild.roles.create({
                    name: name,
                    reason: reason || 'Created by AI'
                });
                return `Successfully created role: ${role.name} (${role.id})`;
            }

            if (action === 'delete_role') {
                if (!id) return 'Role ID is required.';
                const role = await guild.roles.fetch(id);
                if (role) {
                    await role.delete(reason || 'Deleted by AI');
                    return `Successfully deleted role with ID: ${id}`;
                }
                return 'Role not found.';
            }

            return 'Unsupported or invalid administrative action.';
        } catch (error: any) {
            return `Error performing Discord admin action: ${error.message}`;
        }
    }
};

ToolRegistry.register(discordAdminTool);
export default discordAdminTool;
