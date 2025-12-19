import { Client, GatewayIntentBits, Events, Message, REST, Routes, SlashCommandBuilder, ChatInputCommandInteraction, Interaction } from 'discord.js';
import { db } from '../db/index.js';
import { bots, flows } from '../db/schema.js';
import { eq } from 'drizzle-orm';

// Store active bot clients
const activeBots: Map<string, Client> = new Map();

export class BotRuntime {
    
    // Start a bot and connect to Discord
    static async startBot(botId: string): Promise<{ success: boolean; error?: string }> {
        try {
            // Check if already running
            if (activeBots.has(botId)) {
                console.log(`[BotRuntime] Bot ${botId} is already running`);
                return { success: true };
            }

            // Get bot from database
            const bot = await db.select().from(bots).where(eq(bots.id, botId));
            if (!bot[0]) {
                return { success: false, error: 'Bot not found' };
            }

            // Decrypt token (currently base64 encoded)
            const token = Buffer.from(bot[0].token, 'base64').toString('ascii');
            const clientId = bot[0].clientId;

            // Create Discord client
            const client = new Client({
                intents: [
                    GatewayIntentBits.Guilds,
                    GatewayIntentBits.GuildMessages,
                    GatewayIntentBits.MessageContent,
                    GatewayIntentBits.GuildMessageReactions,
                    GatewayIntentBits.GuildMembers
                ]
            });

            // Handle ready event
            client.once(Events.ClientReady, async (readyClient) => {
                console.log(`[BotRuntime] Bot ${botId} logged in as ${readyClient.user.tag}`);
                
                // Register slash commands
                await this.registerSlashCommands(botId, token, clientId || readyClient.user.id);
                
                // Update status in database
                await db.update(bots)
                    .set({ status: 'online', updatedAt: new Date() })
                    .where(eq(bots.id, botId));
            });

            // Handle slash command interactions
            client.on(Events.InteractionCreate, async (interaction: Interaction) => {
                if (!interaction.isChatInputCommand()) return;
                
                try {
                    await this.handleSlashCommand(botId, interaction);
                } catch (e) {
                    console.error(`[BotRuntime] Error handling slash command for bot ${botId}:`, e);
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({ content: 'An error occurred!', ephemeral: true });
                    } else {
                        await interaction.reply({ content: 'An error occurred!', ephemeral: true });
                    }
                }
            });

            // Handle messages - execute flows (for prefix commands)
            client.on(Events.MessageCreate, async (message: Message) => {
                if (message.author.bot) return;
                
                try {
                    await this.executeMessageFlows(botId, 'messageCreate', message);
                } catch (e) {
                    console.error(`[BotRuntime] Error executing flow for bot ${botId}:`, e);
                }
            });

            // Handle errors
            client.on(Events.Error, (error) => {
                console.error(`[BotRuntime] Bot ${botId} error:`, error);
            });

            // Handle disconnect
            client.on(Events.ShardDisconnect, async () => {
                console.log(`[BotRuntime] Bot ${botId} disconnected`);
                activeBots.delete(botId);
                await db.update(bots)
                    .set({ status: 'offline', updatedAt: new Date() })
                    .where(eq(bots.id, botId));
            });

            // Login to Discord
            await client.login(token);
            
            // Store the client
            activeBots.set(botId, client);

            return { success: true };

        } catch (error: any) {
            console.error(`[BotRuntime] Failed to start bot ${botId}:`, error);
            
            // Update status to error
            await db.update(bots)
                .set({ status: 'error', updatedAt: new Date() })
                .where(eq(bots.id, botId));
                
            return { success: false, error: error.message || 'Failed to connect to Discord' };
        }
    }

    // Register slash commands with Discord API
    static async registerSlashCommands(botId: string, token: string, clientId: string) {
        try {
            // Get flows for this bot
            const botFlows = await db.select().from(flows).where(eq(flows.botId, botId));
            
            const commands: any[] = [];
            
            for (const flow of botFlows) {
                if (!flow.published) continue;
                
                let nodes: any[] = [];
                try {
                    nodes = typeof flow.nodes === 'string' ? JSON.parse(flow.nodes) : flow.nodes;
                } catch (e) {
                    continue;
                }

                // Find slash command triggers
                const slashTriggers = nodes.filter(n => 
                    n.type === 'trigger' && 
                    (n.data?.eventType === 'interactionCreate' || n.data?.label?.toLowerCase().includes('slash'))
                );
                
                for (const trigger of slashTriggers) {
                    const commandName = (trigger.data?.commandName || trigger.data?.filter || 'test').toLowerCase().replace(/[^a-z0-9]/g, '');
                    const commandDescription = trigger.data?.commandDescription || trigger.data?.label || 'A bot command';
                    
                    if (commandName && commandName.length >= 1 && commandName.length <= 32) {
                        commands.push(
                            new SlashCommandBuilder()
                                .setName(commandName)
                                .setDescription(commandDescription.substring(0, 100))
                                .toJSON()
                        );
                        console.log(`[BotRuntime] Registered slash command: /${commandName}`);
                    }
                }
            }

            if (commands.length === 0) {
                // Register a default test command if no slash commands defined
                commands.push(
                    new SlashCommandBuilder()
                        .setName('ping')
                        .setDescription('Check if bot is online')
                        .toJSON()
                );
                console.log(`[BotRuntime] No slash commands in flow, registered default /ping`);
            }

            // Register commands with Discord - use GUILD commands for instant appearance
            const rest = new REST({ version: '10' }).setToken(token);
            
            console.log(`[BotRuntime] Registering ${commands.length} slash commands...`);
            
            // Get all guilds the bot is in and register commands to each
            const client = activeBots.get(botId);
            if (client && client.guilds.cache.size > 0) {
                // Register to each guild for instant appearance
                for (const [guildId, guild] of client.guilds.cache) {
                    try {
                        await rest.put(
                            Routes.applicationGuildCommands(clientId, guildId),
                            { body: commands }
                        );
                        console.log(`[BotRuntime] Registered commands to guild: ${guild.name}`);
                    } catch (e) {
                        console.error(`[BotRuntime] Failed to register to guild ${guild.name}:`, e);
                    }
                }
                console.log(`[BotRuntime] Successfully registered slash commands to ${client.guilds.cache.size} guilds`);
            } else {
                // Fallback to global commands (takes up to 1 hour)
                await rest.put(
                    Routes.applicationCommands(clientId),
                    { body: commands }
                );
                console.log(`[BotRuntime] Registered global slash commands (may take up to 1 hour to appear)`);
            }
            
        } catch (error) {
            console.error('[BotRuntime] Failed to register slash commands:', error);
        }
    }

    // Handle slash command interaction
    static async handleSlashCommand(botId: string, interaction: ChatInputCommandInteraction) {
        const commandName = interaction.commandName;
        console.log(`[BotRuntime] Slash command received: /${commandName}`);

        // Handle built-in commands
        if (commandName === 'ping') {
            await interaction.reply({ content: '🏓 Pong! Bot is online!', ephemeral: false });
            return;
        }

        // Get flows for this bot
        const botFlows = await db.select().from(flows).where(eq(flows.botId, botId));
        
        for (const flow of botFlows) {
            if (!flow.published) continue;
            
            let nodes: any[] = [];
            let edges: any[] = [];
            try {
                nodes = typeof flow.nodes === 'string' ? JSON.parse(flow.nodes) : flow.nodes;
                edges = typeof flow.edges === 'string' ? JSON.parse(flow.edges) : flow.edges;
            } catch (e) {
                continue;
            }

            // Find matching slash command trigger
            const trigger = nodes.find(n => {
                if (n.type !== 'trigger') return false;
                const nodeCommandName = (n.data?.commandName || n.data?.filter || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                return nodeCommandName === commandName;
            });

            if (!trigger) continue;

            console.log(`[BotRuntime] Matched trigger for /${commandName}`);

            // Find and execute connected actions
            const connectedEdges = edges.filter((e: any) => e.source === trigger.id);
            
            for (const edge of connectedEdges) {
                const actionNode = nodes.find(n => n.id === edge.target);
                if (!actionNode) continue;

                await this.executeSlashAction(actionNode, interaction);
            }
            
            return; // Only execute first matching flow
        }

        // No flow matched - send default response
        await interaction.reply({ content: `Command /${commandName} received!`, ephemeral: true });
    }

    // Execute action for slash command
    static async executeSlashAction(node: any, interaction: ChatInputCommandInteraction) {
        const label = node.data?.label || '';
        const messageContent = node.data?.messageContent || '';

        console.log(`[BotRuntime] Executing slash action: ${label}`);

        try {
            const reply = this.replaceSlashVariables(messageContent || `${label} executed!`, interaction);
            
            switch (label.toLowerCase()) {
                case 'send reply':
                    await interaction.reply({ content: reply });
                    break;
                    
                case 'send dm':
                    await interaction.user.send(reply);
                    await interaction.reply({ content: 'Sent you a DM!', ephemeral: true });
                    break;
                    
                default:
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({ content: reply });
                    }
                    break;
            }
        } catch (error) {
            console.error(`[BotRuntime] Failed to execute slash action ${label}:`, error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'Failed to execute command', ephemeral: true });
            }
        }
    }

    // Replace variables for slash commands
    static replaceSlashVariables(content: string, interaction: ChatInputCommandInteraction): string {
        return content
            .replace(/{user}/gi, interaction.user.toString())
            .replace(/{username}/gi, interaction.user.username)
            .replace(/{channel}/gi, interaction.channel?.toString() || 'DM')
            .replace(/{server}/gi, interaction.guild?.name || 'DM')
            .replace(/{command}/gi, interaction.commandName);
    }

    // Stop a bot
    static async stopBot(botId: string): Promise<{ success: boolean; error?: string }> {
        try {
            const client = activeBots.get(botId);
            
            if (client) {
                client.destroy();
                activeBots.delete(botId);
                console.log(`[BotRuntime] Bot ${botId} stopped`);
            }

            // Update status in database
            await db.update(bots)
                .set({ status: 'offline', updatedAt: new Date() })
                .where(eq(bots.id, botId));

            return { success: true };

        } catch (error: any) {
            console.error(`[BotRuntime] Failed to stop bot ${botId}:`, error);
            return { success: false, error: error.message };
        }
    }

    // Restart a bot
    static async restartBot(botId: string): Promise<{ success: boolean; error?: string }> {
        await this.stopBot(botId);
        return await this.startBot(botId);
    }

    // Check if bot is running
    static isRunning(botId: string): boolean {
        const client = activeBots.get(botId);
        return client?.isReady() || false;
    }

    // Execute message flows (prefix commands)
    static async executeMessageFlows(botId: string, eventType: string, message: Message) {
        try {
            const botFlows = await db.select().from(flows).where(eq(flows.botId, botId));
            
            for (const flow of botFlows) {
                if (!flow.published) continue;
                
                let nodes: any[] = [];
                try {
                    nodes = typeof flow.nodes === 'string' ? JSON.parse(flow.nodes) : flow.nodes;
                } catch (e) {
                    continue;
                }

                const triggerNodes = nodes.filter(n => n.type === 'trigger');
                
                for (const trigger of triggerNodes) {
                    const triggerEventType = trigger.data?.eventType || 'messageCreate';
                    
                    // Skip slash command triggers for message events
                    if (triggerEventType === 'interactionCreate') continue;
                    if (triggerEventType !== eventType) continue;
                    
                    const filter = trigger.data?.filter || '';
                    if (filter) {
                        const content = message.content.toLowerCase();
                        const filterLower = filter.toLowerCase();
                        
                        if (filterLower.startsWith('starts with ')) {
                            const prefix = filterLower.replace('starts with ', '');
                            if (!content.startsWith(prefix)) continue;
                        } else if (!content.includes(filterLower) && content !== filterLower) {
                            continue;
                        }
                    }

                    console.log(`[BotRuntime] Message trigger matched for bot ${botId}: ${trigger.data?.label}`);
                    
                    let edges: any[] = [];
                    try {
                        edges = typeof flow.edges === 'string' ? JSON.parse(flow.edges) : flow.edges;
                    } catch (e) {
                        continue;
                    }

                    const connectedEdges = edges.filter((e: any) => e.source === trigger.id);
                    
                    for (const edge of connectedEdges) {
                        const actionNode = nodes.find(n => n.id === edge.target);
                        if (!actionNode) continue;
                        await this.executeMessageAction(actionNode, message);
                    }
                }
            }
        } catch (error) {
            console.error(`[BotRuntime] Error executing message flows:`, error);
        }
    }

    // Execute action for message
    static async executeMessageAction(node: any, message: Message) {
        const label = node.data?.label || '';
        const messageContent = node.data?.messageContent || '';

        try {
            switch (label.toLowerCase()) {
                case 'send reply':
                    if (messageContent) {
                        const reply = this.replaceMessageVariables(messageContent, message);
                        await message.reply(reply);
                    }
                    break;
                    
                case 'send dm':
                    if (messageContent) {
                        const dm = this.replaceMessageVariables(messageContent, message);
                        await message.author.send(dm);
                    }
                    break;
                    
                default:
                    if (messageContent) {
                        const reply = this.replaceMessageVariables(messageContent, message);
                        await message.reply(reply);
                    }
                    break;
            }
        } catch (error) {
            console.error(`[BotRuntime] Failed to execute message action ${label}:`, error);
        }
    }

    // Replace variables for message
    static replaceMessageVariables(content: string, message: Message): string {
        return content
            .replace(/{user}/gi, message.author.toString())
            .replace(/{username}/gi, message.author.username)
            .replace(/{channel}/gi, message.channel.toString())
            .replace(/{server}/gi, message.guild?.name || 'DM')
            .replace(/{message}/gi, message.content);
    }

    // Get all running bots
    static getRunningBots(): string[] {
        return Array.from(activeBots.keys());
    }

    // Cleanup all bots on shutdown
    static async shutdownAll() {
        console.log(`[BotRuntime] Shutting down all bots...`);
        for (const [botId, client] of activeBots) {
            try {
                client.destroy();
                await db.update(bots)
                    .set({ status: 'offline', updatedAt: new Date() })
                    .where(eq(bots.id, botId));
            } catch (e) {
                console.error(`[BotRuntime] Error shutting down bot ${botId}:`, e);
            }
        }
        activeBots.clear();
        console.log(`[BotRuntime] All bots shut down`);
    }
}
