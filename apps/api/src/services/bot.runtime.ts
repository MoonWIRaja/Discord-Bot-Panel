import { Client, GatewayIntentBits, Events, Message, REST, Routes, SlashCommandBuilder, ChatInputCommandInteraction, Interaction } from 'discord.js';
import { db } from '../db/index.js';
import { bots, flows } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import VoiceService from './voice.service.js';

// Store active bot clients
// const activeBots: Map<string, Client> = new Map();

export class BotRuntime {
    
    // Store active bot clients and their intervals
    static activeBots: Map<string, Client> = new Map();
    static monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
    static io: any = null;

    static setIO(io: any) {
        this.io = io;
    }

    // Start a bot and connect to Discord
    static async startBot(botId: string): Promise<{ success: boolean; error?: string }> {
        try {
            // Check if already running
            if (this.activeBots.has(botId)) {
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
                    GatewayIntentBits.GuildMembers,
                    GatewayIntentBits.GuildVoiceStates
                ]
            });

            // Attach logger
            (client as any).logger = {
                log: (level: 'info' | 'warn' | 'error' | 'debug', message: string) => {
                    this.sendLog(botId, level, message);
                }
            };

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
                    await this.handleSlashCommand(botId, interaction, client);
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
            client.on(Events.MessageCreate, async (message) => {
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
                this.activeBots.delete(botId);
                await db.update(bots)
                    .set({ status: 'offline', updatedAt: new Date() })
                    .where(eq(bots.id, botId));
            });

            // Login to Discord
            await client.login(token);
            
            // Store the client
            this.activeBots.set(botId, client);

            // Start Monitoring Loop
            this.startMonitoring(botId, client);

            return { success: true };

        } catch (error: any) {
            console.error(`[BotRuntime] Failed to start bot ${botId}:`, error);
            this.sendLog(botId, 'error', `Failed to start bot: ${error.message}`);
            
            // Update status to error
            await db.update(bots)
                .set({ status: 'error', updatedAt: new Date() })
                .where(eq(bots.id, botId));
                
            return { success: false, error: error.message || 'Failed to connect to Discord' };
        }
    }







    // ...

    // Send log to socket
    static sendLog(botId: string, level: 'info' | 'warn' | 'error' | 'debug', message: string) {
        if (this.io) {
            console.log(`[BotRuntime] 📤 Emitting log for ${botId}: ${message} (Socket clients: ${this.io.engine.clientsCount})`);
            this.io.to(`bot-${botId}`).emit('bot:log', {
                timestamp: new Date().toISOString(),
                level,
                message
            });
        } else {
            console.warn('[BotRuntime] IO not initialized, cannot send log to socket');
        }
    }

    // Monitoring Loop for Live Notification
    static startMonitoring(botId: string, client: any) {
        console.log(`[BotRuntime] 🔴 Starting monitoring loop for ${botId}`);
        this.sendLog(botId, 'info', 'Starting live monitoring loop');

        // Initial check
        this.checkLiveStatus(botId, client);

        // Loop every 60 seconds (Simulated 5 mins)
        const interval = setInterval(() => {
            this.checkLiveStatus(botId, client);
        }, 60 * 1000); // 1 minute

        this.monitoringIntervals.set(botId, interval);
    }

    static async checkLiveStatus(botId: string, client: any) {
        if (!client.liveProfiles || !client.liveConfig?.channelId) return;

        // this.sendLog(botId, 'debug', `Checking live status for ${client.liveProfiles.length} profiles...`);

        const channel = await client.channels.fetch(client.liveConfig?.channelId).catch(() => null);
        if (!channel || !channel.isTextBased()) return;

        let updated = false;

        for (const profile of client.liveProfiles) {
            let isLive = false;

            try {
                if (profile.platform === 'youtube') {
                    // Quick fetch check (Simulated for safety without API key)
                    // In production, parse RSS: https://www.youtube.com/feeds/videos.xml?channel_id=CHANNEL_ID
                    const response = await fetch(profile.url);
                    const text = await response.text();
                    isLive = text.includes('"text":"LIVE"');
                } else if (profile.platform === 'twitch') {
                    // Simulated random live status for demo
                    // isLive = Math.random() > 0.8; 
                } else if (profile.platform === 'tiktok') {
                    // Basic heuristic: check for "live-video" class or similar in HTML
                    try {
                        const response = await fetch(profile.url);
                        const text = await response.text();
                        isLive = text.includes('"status":2') || text.includes('live-video');
                    } catch (e) {
                        isLive = false;
                    }
                }

                // Temporary Logic: If detected live and not already notified
                if (isLive && !profile.lastStatus) {
                    await channel.send({
                        content: `🔴 **LIVE ALERT!**\n\n**${profile.url}** is now LIVE on ${profile.platform}!`,
                        components: []
                    });
                    profile.lastStatus = true;
                    updated = true;
                    this.sendLog(botId, 'info', `Live alert sent for ${profile.url}`);
                    console.log(`[Monitor] Alert sent for ${profile.url}`);
                } else if (!isLive && profile.lastStatus) {
                    profile.lastStatus = false;
                    updated = true;
                    this.sendLog(botId, 'info', `${profile.url} went offline`);
                }
            } catch (e: any) {
                console.error(`[Monitor] Error checking ${profile.url}:`, e);
                this.sendLog(botId, 'error', `Error checking ${profile.url}: ${e.message}`);
            }
        }

        // Save state if updated (to persist "lastStatus")
        if (updated) {
            await this.saveBotConfig(botId, client);
        }
    }

    static async saveBotConfig(botId: string, client: any) {
        try {
            await db.update(bots).set({
                config: {
                    liveProfiles: client.liveProfiles,
                    liveConfig: client.liveConfig
                },
                updatedAt: new Date()
            }).where(eq(bots.id, botId));
        } catch (e) {
            console.error('Failed to save bot config', e);
        }
    }

    // Register slash commands with Discord API
    static async registerSlashCommands(botId: string, token: string, clientId: string) {
        try {
            // Get flows for this bot
            const botFlows = await db.select().from(flows).where(eq(flows.botId, botId));
            
            const commands: any[] = [];
            const registeredNames = new Set<string>(); // Track registered command names
            
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
                    
                    // Skip if already registered (prevents duplicates)
                    if (registeredNames.has(commandName)) {
                        console.log(`[BotRuntime] Skipping duplicate command: /${commandName}`);
                        continue;
                    }

                    if (commandName && commandName.length >= 1 && commandName.length <= 32) {
                        const builder = new SlashCommandBuilder()
                            .setName(commandName)
                            .setDescription(commandDescription.substring(0, 100));

                        // Add options if defined
                        if (trigger.data?.options && Array.isArray(trigger.data.options)) {
                            for (const opt of trigger.data.options) {
                                if (!opt.name || !opt.description) continue;

                                const type = opt.type?.toUpperCase() || 'STRING';
                                const required = !!opt.required;

                                switch (type) {
                                    case 'STRING':
                                        builder.addStringOption(option =>
                                            option.setName(opt.name)
                                                .setDescription(opt.description)
                                                .setRequired(required));
                                        break;
                                    case 'INTEGER':
                                        builder.addIntegerOption(option =>
                                            option.setName(opt.name)
                                                .setDescription(opt.description)
                                                .setRequired(required));
                                        break;
                                    case 'BOOLEAN':
                                        builder.addBooleanOption(option =>
                                            option.setName(opt.name)
                                                .setDescription(opt.description)
                                                .setRequired(required));
                                        break;
                                    case 'USER':
                                        builder.addUserOption(option =>
                                            option.setName(opt.name)
                                                .setDescription(opt.description)
                                                .setRequired(required));
                                        break;
                                    case 'CHANNEL':
                                        builder.addChannelOption(option =>
                                            option.setName(opt.name)
                                                .setDescription(opt.description)
                                                .setRequired(required));
                                        break;
                                    case 'ROLE':
                                        builder.addRoleOption(option =>
                                            option.setName(opt.name)
                                                .setDescription(opt.description)
                                                .setRequired(required));
                                        break;
                                }
                            }
                        }

                        commands.push(builder.toJSON());
                        registeredNames.add(commandName);
                        console.log(`[BotRuntime] Registered slash command: /${commandName} with options`);
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
            const client = this.activeBots.get(botId);
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
    static async handleSlashCommand(botId: string, interaction: ChatInputCommandInteraction, client: Client) {
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

                await this.executeSlashAction(actionNode, interaction, client);
            }
            
            return; // Only execute first matching flow
        }

        // No flow matched - send default response
        await interaction.reply({ content: `Command /${commandName} received!`, ephemeral: true });
    }

    // Execute action for slash command
    static async executeSlashAction(node: any, interaction: ChatInputCommandInteraction, client: Client) {
        const label = node.data?.label || '';
        const messageContent = node.data?.messageContent || '';
        const nodeType = node.type || '';
        const code = node.data?.code || '';

        console.log(`[BotRuntime] Executing slash action: ${label} (type: ${nodeType})`);

        try {
            // Handle code nodes
            if (nodeType === 'code' && code) {
                console.log(`[BotRuntime] Executing custom code...`);

                // Create async function with context
                // Create async function with context
                const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
                // Removed 'VoiceService' from args to avoid conflict with user code "const VoiceService ="
                const fn = new AsyncFunction('interaction', 'client', 'fetch', code);

                // Attach VoiceService to client for code access
                (client as any).voiceService = VoiceService;

                // Execute the code
                await fn(interaction, client, fetch);
                return;
            }

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
                await interaction.reply({ content: `Error: ${error}`, ephemeral: true });
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
            const client = this.activeBots.get(botId);
            
            if (client) {
                client.destroy();
                this.activeBots.delete(botId);
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
        const client = this.activeBots.get(botId);
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
        return Array.from(this.activeBots.keys());
    }

    // Cleanup all bots on shutdown
    static async shutdownAll() {
        console.log(`[BotRuntime] Shutting down all bots...`);
        for (const [botId, client] of this.activeBots) {
            try {
                client.destroy();
                await db.update(bots)
                    .set({ status: 'offline', updatedAt: new Date() })
                    .where(eq(bots.id, botId));
            } catch (e) {
                console.error(`[BotRuntime] Error shutting down bot ${botId}:`, e);
            }
        }
        this.activeBots.clear();
        console.log(`[BotRuntime] All bots shut down`);
    }
}
