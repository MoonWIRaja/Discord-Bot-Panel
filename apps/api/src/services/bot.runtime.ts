import { Client, GatewayIntentBits, Events, Message, REST, Routes, SlashCommandBuilder, ChatInputCommandInteraction, Interaction, ChannelType, TextChannel, ThreadChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuInteraction, ModalBuilder, TextInputBuilder, TextInputStyle, ModalSubmitInteraction } from 'discord.js';
import { db } from '../db/index.js';
import { bots, flows, aiSessions } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import VoiceService from './voice.service.js';
import { AIService, AIMessage } from './ai.service.js';
import { ToolRegistry } from './tools/index.js';
import { TokenUsageService } from './tokenUsage.service.js';
import { TrainingService } from './training.service.js';
import { KnowledgeService } from './knowledge.service.js';
import puppeteer from 'puppeteer';
import { DiscordTogether } from 'discord-together';
import { randomUUID } from 'crypto';

// Store active bot clients
// const activeBots: Map<string, Client> = new Map();

export interface BotLogEntry {
    id: string;
    timestamp: Date;
    type: 'AI' | 'Command' | 'Error' | 'System' | 'Message';
    message: string;
    user?: string;
    channel?: string;
    details?: any;
}

export class BotRuntime {
    
    // Store active bot clients and their intervals
    static activeBots: Map<string, Client> = new Map();
    static monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
    static io: any = null;

    // In-memory bot activity logs (max 1000 per bot)
    static botLogs: Map<string, BotLogEntry[]> = new Map();
    static readonly MAX_LOGS_PER_BOT = 1000;

    static setIO(io: any) {
        this.io = io;
    }

    // Add a log entry for a bot
    static addBotLog(botId: string, type: BotLogEntry['type'], message: string, extra?: { user?: string; channel?: string; details?: any }) {
        if (!this.botLogs.has(botId)) {
            this.botLogs.set(botId, []);
        }

        const logs = this.botLogs.get(botId)!;
        const entry: BotLogEntry = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            type,
            message,
            user: extra?.user,
            channel: extra?.channel,
            details: extra?.details
        };

        logs.push(entry);

        // Keep only last 1000 logs
        if (logs.length > this.MAX_LOGS_PER_BOT) {
            logs.shift();
        }

        // Also log to console
        console.log(`[Bot ${botId.substring(0, 8)}] [${type}] ${message}`);

        // Emit to Socket.IO if available
        if (this.io) {
            this.io.to(`bot:${botId}`).emit('bot-log', entry);
        }
    }

    // Get logs for a bot
    static getBotLogs(botId: string, limit: number = 100): BotLogEntry[] {
        const logs = this.botLogs.get(botId) || [];
        return logs.slice(-limit);
    }

    // Clear logs for a bot
    static clearBotLogs(botId: string) {
        this.botLogs.set(botId, []);
    }

    /**
     * Clear all chat history in AI channels for a bot
     * Bulk deletes Discord messages in configured AI chat channels
     */
    static async clearAIChannelHistory(botId: string): Promise<{ success: boolean; deletedCount: number; channels: string[] }> {
        const client = this.activeBots.get(botId);
        if (!client) {
            throw new Error('Bot is not online. Please start the bot first.');
        }

        let totalDeleted = 0;
        const clearedChannels: string[] = [];

        try {
            // Get bot config
            const bot = await db.select().from(bots).where(eq(bots.id, botId));
            if (!bot[0]) throw new Error('Bot not found');

            const config = typeof bot[0].config === 'string' ? JSON.parse(bot[0].config) : bot[0].config;
            const publicChannelIds: Set<string> = new Set();

            // Get AI channels from config
            if (config?.ai?.publicChannels) {
                if (config.ai.publicChannels.chat?.channelId && config.ai.publicChannels.chat?.enabled) {
                    publicChannelIds.add(config.ai.publicChannels.chat.channelId);
                }
                if (config.ai.publicChannels.image?.channelId && config.ai.publicChannels.image?.enabled) {
                    publicChannelIds.add(config.ai.publicChannels.image.channelId);
                }
            }

            // Get AI channels from flows (AI_MOD nodes)
            const botFlows = await db.select().from(flows).where(eq(flows.botId, botId));
            for (const flow of botFlows) {
                try {
                    const nodes = Array.isArray(flow.nodes) ? flow.nodes : [];
                    for (const node of nodes as any[]) {
                        if (node.type === 'AI_MOD' && node.data?.channelId) {
                            publicChannelIds.add(node.data.channelId);
                        }
                    }
                } catch (e) { /* skip invalid flow */ }
            }

            console.log(`[BotRuntime] Clearing history for ${publicChannelIds.size} AI channels`);

            // Bulk delete messages in each channel
            for (const channelId of publicChannelIds) {
                try {
                    const channel = await client.channels.fetch(channelId);
                    if (channel && (channel.type === ChannelType.GuildText || channel.type === ChannelType.PublicThread)) {
                        const textChannel = channel as TextChannel;

                        // Fetch messages in batches and delete
                        let deleted = 0;
                        let hasMore = true;
                        const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;

                        while (hasMore) {
                            const messages = await textChannel.messages.fetch({ limit: 100 });
                            if (messages.size === 0) {
                                hasMore = false;
                                break;
                            }

                            // Separate new and old messages
                            const newMessages = messages.filter(m => m.createdTimestamp > twoWeeksAgo);
                            const oldMessages = messages.filter(m => m.createdTimestamp <= twoWeeksAgo);

                            // Bulk delete new messages (fast)
                            if (newMessages.size > 1) {
                                await textChannel.bulkDelete(newMessages, true);
                                deleted += newMessages.size;
                            } else if (newMessages.size === 1) {
                                // Single new message - delete individually
                                await newMessages.first()?.delete();
                                deleted += 1;
                            }

                            // Delete old messages individually (slower but necessary)
                            for (const [, msg] of oldMessages) {
                                try {
                                    await msg.delete();
                                    deleted += 1;
                                    // Rate limit: 1 delete per 500ms for old messages
                                    await new Promise(r => setTimeout(r, 500));
                                } catch (e) {
                                    // Message may already be deleted or bot lacks permission
                                }
                            }

                            // If we got less than 100, we're done
                            if (messages.size < 100) {
                                hasMore = false;
                            }

                            // Rate limit protection between batches
                            await new Promise(r => setTimeout(r, 1000));
                        }

                        totalDeleted += deleted;
                        clearedChannels.push(channelId);
                        console.log(`[BotRuntime] Deleted ${deleted} messages from channel ${channelId}`);
                    }
                } catch (e: any) {
                    console.error(`[BotRuntime] Failed to clear channel ${channelId}:`, e.message);
                }
            }

            this.addBotLog(botId, 'System', `Cleared ${totalDeleted} messages from ${clearedChannels.length} AI channels`);
            return { success: true, deletedCount: totalDeleted, channels: clearedChannels };

        } catch (error: any) {
            console.error('[BotRuntime] Failed to clear AI channel history:', error);
            throw error;
        }
    }

    // Reset all bot statuses to offline (called on server startup)
    static async resetAllBotStatuses() {
        try {
            await db.update(bots)
                .set({ status: 'offline', updatedAt: new Date() });
            console.log('[BotRuntime] All bot statuses reset to offline');
        } catch (error) {
            console.error('[BotRuntime] Failed to reset bot statuses:', error);
        }
    }

    /**
     * Send training mode notification embeds to all active AI threads and public AI channels for a bot
     * Returns message IDs for cleanup later
     */
    static async sendTrainingNotifications(botId: string): Promise<Record<string, string>> {
        const msgIds: Record<string, string> = {};

        try {
            const client = this.activeBots.get(botId);
            if (!client) {
                console.log('[BotRuntime] No active client for bot, cannot send training notifications');
                return msgIds;
            }

            // Get bot info
            const bot = await db.select().from(bots).where(eq(bots.id, botId));
            if (!bot[0]) return msgIds;
            const botName = bot[0].name || 'Bot';

            // Create training mode embed
            const embed = new EmbedBuilder()
                .setColor(0x9333EA) // Purple
                .setTitle('🧠 Training Mode Active')
                .setDescription(`**${botName}** is now learning from conversations!\n\nChat normally and I'll learn your communication style.`)
                .setFooter({ text: 'This message will be deleted when training ends' })
                .setTimestamp();

            // Collect all public AI channel IDs
            const publicChannelIds: Set<string> = new Set();

            // 1. Get public AI channels from bot.config (set by /aichat, /aiimage commands)
            // Stored in config.ai.publicChannels[mode].channelId
            try {
                const config = typeof bot[0].config === 'string' ? JSON.parse(bot[0].config) : bot[0].config;
                if (config?.ai?.publicChannels) {
                    // Check chat channel
                    if (config.ai.publicChannels.chat?.channelId && config.ai.publicChannels.chat?.enabled) {
                        publicChannelIds.add(config.ai.publicChannels.chat.channelId);
                    }
                    // Check image channel
                    if (config.ai.publicChannels.image?.channelId && config.ai.publicChannels.image?.enabled) {
                        publicChannelIds.add(config.ai.publicChannels.image.channelId);
                    }
                }
            } catch (e) {
                // Skip invalid config
            }

            // 2. Get public AI channels from flows (AI_MOD nodes with channelId)
            const botFlows = await db.select().from(flows).where(eq(flows.botId, botId));

            for (const flow of botFlows) {
                try {
                    // flows table has 'nodes' field directly, not 'data'
                    const nodes = typeof flow.nodes === 'string' ? JSON.parse(flow.nodes as string) : flow.nodes;
                    if (Array.isArray(nodes)) {
                        for (const node of nodes) {
                            // AI_MOD nodes have channelId for public AI channels
                            if (node.type === 'AI_MOD' && node.data?.channelId) {
                                publicChannelIds.add(node.data.channelId);
                            }
                        }
                    }
                } catch (e) {
                    // Skip invalid flow data
                }
            }

            console.log(`[BotRuntime] Found ${publicChannelIds.size} public AI channels (from config + flows)`);

            // Send to public AI channels
            for (const channelId of publicChannelIds) {
                try {
                    const channel = await client.channels.fetch(channelId);
                    if (channel && channel.isTextBased() && 'send' in channel) {
                        const msg = await channel.send({ embeds: [embed] });
                        msgIds[channelId] = msg.id;
                        console.log(`[BotRuntime] Sent training notification to public channel ${channelId}`);
                    }
                } catch (e) {
                    console.error(`[BotRuntime] Failed to send training notification to channel ${channelId}:`, e);
                }
            }

            // 2. Get active AI sessions/threads for this bot
            const sessions = await db.select().from(aiSessions).where(eq(aiSessions.botId, botId));
            console.log(`[BotRuntime] Found ${sessions.length} active AI sessions for training notification`);

            // Send to each active AI thread (skip archived/closed threads)
            for (const session of sessions) {
                const threadId = session.threadId;
                if (!threadId) continue;
                if (msgIds[threadId]) continue; // Already sent to this channel

                try {
                    const channel = await client.channels.fetch(threadId);

                    // Skip if thread is archived/closed
                    if (channel && 'archived' in channel && channel.archived) {
                        continue; // Silently skip archived threads
                    }

                    if (channel && channel.isTextBased() && 'send' in channel) {
                        const msg = await channel.send({ embeds: [embed] });
                        msgIds[threadId] = msg.id;
                        console.log(`[BotRuntime] Sent training notification to thread ${threadId}`);
                    }
                } catch (e: any) {
                    // Silently skip Unknown Channel errors (deleted threads)
                    if (e?.code === 10003) {
                        // Channel no longer exists, skip silently
                        continue;
                    }
                    // Log other errors
                    console.error(`[BotRuntime] Failed to send training notification to thread ${threadId}:`, e?.message || e);
                }
            }

            console.log(`[BotRuntime] Sent training notifications to ${Object.keys(msgIds).length} threads`);
        } catch (error) {
            console.error('[BotRuntime] Error sending training notifications:', error);
        }

        return msgIds;
    }

    /**
     * Delete training mode notification embeds from channels
     */
    static async deleteTrainingNotifications(botId: string, msgIds: Record<string, string>): Promise<void> {
        try {
            const client = this.activeBots.get(botId);
            if (!client) return;

            for (const [channelId, messageId] of Object.entries(msgIds)) {
                try {
                    const channel = await client.channels.fetch(channelId);
                    if (channel && channel.isTextBased() && 'messages' in channel) {
                        const msg = await channel.messages.fetch(messageId);
                        if (msg) {
                            await msg.delete();
                        }
                    }
                } catch (e) {
                    console.error(`[BotRuntime] Failed to delete training notification from channel ${channelId}:`, e);
                }
            }

            console.log(`[BotRuntime] Deleted training notifications from ${Object.keys(msgIds).length} channels`);
        } catch (error) {
            console.error('[BotRuntime] Error deleting training notifications:', error);
        }
    }


    // Helper to auto-delete a message after delay (default 5 seconds)
    // Can accept a Message object to delete, or an Interaction to delete its reply
    static autoDeleteMessage(message: any, delayMs: number = 5000) {
        setTimeout(async () => {
            try {
                if (message?.delete) {
                    await message.delete();
                }
            } catch (e) {
                // Ignore - message may already be deleted or not deletable
            }
        }, delayMs);
    }

    // Legacy method for backward compatibility
    static autoDeleteReply(interaction: any, delayMs: number = 10000) {
        // For deferUpdate interactions, don't try to delete - there's no reply to delete
        // For normal interactions, this would delete the reply
        // But we mainly use followUp now, so this is mostly a no-op
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

            // Hydrate status from DB config
            const config = (bot[0].config as any) || {};
            (client as any).liveProfiles = config.liveProfiles || [];
            (client as any).liveConfig = config.liveConfig || {};

            // Attach save helper for custom code to use
            (client as any).saveConfig = async () => {
                await this.saveBotConfig(botId, client);
            };

            // Handle ready event
            client.once(Events.ClientReady, async (readyClient) => {
                console.log(`[BotRuntime] Bot ${botId} logged in as ${readyClient.user.tag}`);
                this.addBotLog(botId, 'System', `Bot logged in as ${readyClient.user.tag}`);

                // Initialize DiscordTogether for Watch Together activities
                (client as any).discordTogether = new DiscordTogether(client as any);

                // Register slash commands
                await this.registerSlashCommands(botId, token, clientId || readyClient.user.id);
                
                // Execute flows triggered by 'ready' event (AI Config, etc.)
                await this.handleFlowEvent(botId, 'ready', client, null);

                // Get bot avatar URL
                const avatarUrl = readyClient.user.displayAvatarURL({ size: 128 });

                // Update status, name, clientId, and avatar in database
                await db.update(bots)
                    .set({
                        status: 'online',
                        name: readyClient.user.username,
                        clientId: readyClient.user.id,
                        avatar: avatarUrl,
                        updatedAt: new Date()
                    })
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
                        await interaction.followUp({ content: 'An error occurred!', flags: 64 });
                    } else {
                        await interaction.reply({ content: 'An error occurred!', flags: 64 });
                    }
                }
            });

            // Handle messages - execute flows (for prefix commands) and AI chat
            client.on(Events.MessageCreate, async (message) => {
                if (message.author.bot) return;
                
                try {
                    // Check if this is an AI thread message
                    await this.handleAIMessage(botId, message, client);

                    // Execute regular message flows
                    await this.executeMessageFlows(botId, 'messageCreate', message);
                } catch (e) {
                    console.error(`[BotRuntime] Error executing flow for bot ${botId}:`, e);
                }
            });

            // Handle button interactions (for AI close button and start chat)
            client.on(Events.InteractionCreate, async (interaction) => {
                if (interaction.isButton()) {
                    if (interaction.customId.startsWith('ai_close_')) {
                        await this.handleAICloseButton(interaction);
                    } else if (interaction.customId === 'ai_start_chat') {
                        await this.handleAIStartChat(botId, interaction, client);
                    } else if (interaction.customId.startsWith('set_close_')) {
                        // Close /set settings message
                        await this.handleSetCloseButton(interaction);
                    } else if (interaction.customId.startsWith('set_custom_model_')) {
                        // Custom model input button - show modal
                        await this.handleCustomModelButton(interaction);
                    }
                } else if (interaction.isStringSelectMenu()) {
                    if (interaction.customId === 'ai_select_provider' || interaction.customId === 'ai_select_mode' || interaction.customId === 'ai_select_model') {
                        await this.handleAISelectMenu(botId, interaction);
                    } else if (interaction.customId.startsWith('set_provider_') || interaction.customId.startsWith('set_mode_') || interaction.customId.startsWith('set_model_')) {
                        await this.handleSetSelectMenu(botId, interaction);
                    }
                } else if (interaction.isModalSubmit()) {
                    if (interaction.customId.startsWith('custom_model_modal_')) {
                        await this.handleCustomModelModalSubmit(interaction);
                    }
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

        // Initial check after 10 seconds
        setTimeout(() => this.checkLiveStatus(botId, client), 10000);

        // Schedule next check with random interval (60-120 seconds)
        const scheduleNext = () => {
            const randomInterval = 60000 + Math.random() * 60000; // 1-2 minutes
            const interval = setTimeout(() => {
            this.checkLiveStatus(botId, client);
                scheduleNext(); // Schedule next check
            }, randomInterval);
        this.monitoringIntervals.set(botId, interval);
        };
        scheduleNext();
    }

    static async checkLiveStatus(botId: string, client: any) {
        if (!client.liveProfiles || !client.liveConfig?.channelId) return;

        this.sendLog(botId, 'debug', `Checking live status for ${client.liveProfiles.length} profiles...`);

        const channel = await client.channels.fetch(client.liveConfig?.channelId).catch(() => null);
        if (!channel || !channel.isTextBased()) {
            this.sendLog(botId, 'error', `Cannot fetch channel ${client.liveConfig?.channelId}`);
            return;
        }

        let updated = false;

        // User-Agent headers to avoid blocks
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5'
        };

        for (const profile of client.liveProfiles) {
            let isLive = false;
            let targetUrl = profile.url;

            try {
                if (profile.platform === 'youtube') {
                    // For YouTube, check channel page or video page for LIVE badge
                    // Best approach: use channel RSS feed to find recent videos
                    const response = await fetch(targetUrl, { headers });
                    const text = await response.text();

                    // Check multiple patterns for YouTube live
                    const hasLiveBadge = text.includes('"text":"LIVE"') || text.includes('"style":"LIVE"');
                    const hasLiveStatus = text.includes('"status":"LIVE"') || text.includes('"isLive":true');
                    const hasLiveBroadcast = text.includes('"isLiveBroadcast":true');

                    isLive = hasLiveBadge || hasLiveStatus || hasLiveBroadcast;
                    this.sendLog(botId, 'debug', `[YouTube] ${targetUrl} -> HTTP ${response.status}, Live: ${isLive} (badge:${hasLiveBadge}, status:${hasLiveStatus})`);

                } else if (profile.platform === 'twitch') {
                    const response = await fetch(targetUrl, { headers });
                    const text = await response.text();
                    isLive = text.includes('"isLiveBroadcast":true');
                    this.sendLog(botId, 'debug', `[Twitch] ${targetUrl} -> HTTP ${response.status}, Live: ${isLive}`);

                } else if (profile.platform === 'tiktok') {
                    // Extract username from URL or use directly
                    let username = targetUrl;
                    if (targetUrl.includes('tiktok.com/@')) {
                        const match = targetUrl.match(/@([^\/\?]+)/);
                        username = match ? match[1] : targetUrl;
                    }
                    username = username.replace('@', '').replace('/live', '');

                    // Use Puppeteer for TikTok (required due to heavy JS rendering)
                    const liveUrl = `https://www.tiktok.com/@${username}/live`;

                    try {
                        this.sendLog(botId, 'debug', `[TikTok] 🌐 Launching browser for @${username}...`);

                        const browser = await puppeteer.launch({
                            headless: true,
                            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
                        });

                        const page = await browser.newPage();
                        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

                        // Navigate to live page
                        await page.goto(liveUrl, { waitUntil: 'networkidle2', timeout: 30000 });

                        // Wait a bit for JS to render
                        await new Promise(resolve => setTimeout(resolve, 3000));

                        // Get page content after JS execution
                        const content = await page.content();

                        // Simple detection: Look for clear LIVE indicators
                        // roomId with actual value is the strongest signal
                        // status:2 means actively streaming
                        const hasValidRoomId = content.includes('"roomId":"') && !content.includes('"roomId":""') && !content.includes('"roomId":"0"');
                        const hasStatus2 = content.includes('"status":2');
                        const hasLiveRoomInfo = content.includes('"liveRoomUserInfo"');

                        // Check for explicit ended text only
                        const hasEnded = content.includes('LIVE has ended') || content.includes('live stream has ended');

                        // If status:2 is found, it's LIVE (most reliable TikTok signal)
                        // Fall back to roomId/liveRoomInfo if status:2 not found
                        isLive = hasStatus2 || ((hasValidRoomId || hasLiveRoomInfo) && !hasEnded);

                        await browser.close();

                        this.sendLog(botId, 'debug', `[TikTok] @${username} -> ${isLive ? '🔴 LIVE!' : '⚫ Offline'} (room:${hasValidRoomId}, status2:${hasStatus2}, info:${hasLiveRoomInfo})`);

                    } catch (puppeteerError: any) {
                        console.error(`[TikTok Puppeteer] Error for @${username}:`, puppeteerError.message);
                        this.sendLog(botId, 'error', `[TikTok] Browser error for @${username}: ${puppeteerError.message}`);
                    }
                }

                // Send alert if newly live (lastStatus prevents duplicates)
                const wasNotified = profile.lastStatus === true;

                if (isLive && !wasNotified) {
                    // Format nice message with username
                    const displayName = profile.url.includes('@')
                        ? profile.url.match(/@([^\/]+)/)?.[1] || profile.url
                        : profile.url;

                    await channel.send({
                        content: `🔴 **LIVE NOW!**\n\n**@${displayName}** is streaming on ${profile.platform.toUpperCase()}!\n${targetUrl.startsWith('http') ? targetUrl : 'https://www.tiktok.com/@' + displayName + '/live'}`,
                    });
                    profile.lastStatus = true;
                    updated = true;
                    this.sendLog(botId, 'info', `✅ Notification sent for @${displayName}`);
                } else if (!isLive && wasNotified) {
                    // Streamer went offline, reset so next live will notify
                    profile.lastStatus = false;
                    updated = true;
                    this.sendLog(botId, 'info', `🔄 Reset: @${profile.url} went offline, ready for next live`);
                }
            } catch (e: any) {
                console.error(`[Monitor] Error checking ${targetUrl}:`, e);
                this.sendLog(botId, 'error', `Error checking ${targetUrl}: ${e.message}`);
            }
        }

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

            // /set - Settings: Change provider, mode, and model (backup - also available in welcome embed)
            commands.push(new SlashCommandBuilder()
                .setName('set')
                .setDescription('AI Settings - Change provider, mode, and model')
                .toJSON());
            registeredNames.add('set');

            // /inv - Invite user to AI room
            commands.push(new SlashCommandBuilder()
                .setName('inv')
                .setDescription('Invite a user to the AI chat room')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to invite')
                        .setRequired(true))
                .toJSON());
            registeredNames.add('inv');

            // /aichannel - Set AI channel
            commands.push(new SlashCommandBuilder()
                .setName('aichannel')
                .setDescription('Set the channel where AI commands can be used')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel for AI commands (leave empty to allow all)')
                        .setRequired(false))
                .toJSON());
            registeredNames.add('aichannel');

            // /aichat - Set public AI chat channel (mode: auto)
            commands.push(new SlashCommandBuilder()
                .setName('aichat')
                .setDescription('Set a public channel for AI chat (everyone can chat)')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel for public AI chat')
                        .setRequired(true))
                .toJSON());
            registeredNames.add('aichat');

            // /aiimage - Set public AI image channel (mode: image)
            commands.push(new SlashCommandBuilder()
                .setName('aiimage')
                .setDescription('Set a public channel for AI image generation')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel for AI image generation')
                        .setRequired(true))
                .toJSON());
            registeredNames.add('aiimage');

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
        this.addBotLog(botId, 'Command', `/${commandName}`, {
            user: interaction.user.displayName || interaction.user.username,
            channel: (interaction.channel as any)?.name || 'DM'
        });

        // Handle built-in commands
        if (commandName === 'ping') {
            await interaction.reply({ content: '🏓 Pong! Bot is online!', ephemeral: false });
            return;
        }

        // Handle /inv command - invite user to AI room
        if (commandName === 'inv') {
            await this.handleInviteCommand(interaction);
            return;
        }

        // Handle /aichannel command - set AI channel
        if (commandName === 'aichannel') {
            await this.handleSetAIChannel(botId, interaction);
            return;
        }

        // Handle /set command - settings popup inside AI room
        if (commandName === 'set') {
            await this.handleSetCommand(botId, interaction);
            return;
        }

        // Handle /aichat command - set public AI chat channel
        if (commandName === 'aichat') {
            await this.handlePublicAIChannel(botId, interaction, 'chat');
            return;
        }

        // Handle /aiimage command - set public AI image channel
        if (commandName === 'aiimage') {
            await this.handlePublicAIChannel(botId, interaction, 'image');
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
        await interaction.reply({ content: `Command /${commandName} received!`, flags: 64 });
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
                const botIdForLog = Array.from(this.activeBots.entries()).find(([id, c]) => c === client)?.[0];
                if (botIdForLog) {
                    this.addBotLog(botIdForLog, 'System', `⚡ Executing: ${(label || 'Code Block').substring(0, 50)}`, {
                        user: interaction.user?.displayName || interaction.user?.username,
                        channel: (interaction.channel as any)?.name || 'Unknown'
                    });
                }

                // NOTE: Don't auto-defer here - custom code handles its own interaction responses

                // Create async function with context
                const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
                // Removed 'VoiceService' from args to avoid conflict with user code "const VoiceService ="
                const fn = new AsyncFunction('interaction', 'client', 'fetch', code);

                // Attach VoiceService to client for code access
                (client as any).voiceService = VoiceService;

                // Execute the code
                await fn(interaction, client, fetch);

                // Auto-save config after code execution (in case liveProfiles/liveConfig changed)
                const botId = Array.from(this.activeBots.entries()).find(([id, c]) => c === client)?.[0];
                if (botId) {
                    await this.saveBotConfig(botId, client);
                }
                return;
            }

            const reply = this.replaceSlashVariables(messageContent || `${label} executed!`, interaction);
            
            switch (label.toLowerCase()) {
                case 'send reply':
                    await interaction.reply({ content: reply });
                    break;
                    
                case 'send dm':
                    await interaction.user.send(reply);
                    await interaction.reply({ content: 'Sent you a DM!', flags: 64 });
                    break;
                    
                default:
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({ content: reply });
                    }
                    break;
            }
        } catch (error: any) {
            console.error(`[BotRuntime] Failed to execute slash action ${label}:`, error);

            // Log error to bot logs
            const botIdForLog = Array.from(this.activeBots.entries()).find(([id, c]) => c === client)?.[0];
            if (botIdForLog) {
                this.addBotLog(botIdForLog, 'Error', `❌ ${label}: ${error.message || error}`, {
                    user: interaction.user?.displayName || interaction.user?.username,
                    channel: (interaction.channel as any)?.name || 'Unknown'
                });
            }

            // Try to send error response
            try {
                if (interaction.deferred) {
                    await interaction.editReply({ content: `✅ ${label} executed` });
                } else if (!interaction.replied) {
                    await interaction.reply({ content: `Error: ${error.message || error}`, flags: 64 });
                }
            } catch (e) {
            // Ignore - interaction expired
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
                // Clear monitoring interval first
                const interval = this.monitoringIntervals.get(botId);
                if (interval) {
                    clearInterval(interval);
                    this.monitoringIntervals.delete(botId);
                    console.log(`[BotRuntime] Monitoring interval cleared for ${botId}`);
                }

                client.destroy();
                this.activeBots.delete(botId);
                console.log(`[BotRuntime] Bot ${botId} stopped`);
                this.addBotLog(botId, 'System', 'Bot stopped');
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

    // Handle flow events - find matching triggers and execute connected nodes
    static async handleFlowEvent(botId: string, eventType: string, client: Client, context: any) {
        try {
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

                // Find trigger nodes matching this event type
                const triggerNodes = nodes.filter((n: any) =>
                    n.type === 'trigger' && n.data?.eventType === eventType
                );

                for (const trigger of triggerNodes) {
                    console.log(`[BotRuntime] Flow event '${eventType}' triggered for bot ${botId}`);

                    // Find connected nodes via edges
                    const connectedEdges = edges.filter((e: any) => e.source === trigger.id);

                    for (const edge of connectedEdges) {
                        const targetNode = nodes.find((n: any) => n.id === edge.target);
                        if (!targetNode) continue;

                        // Execute code nodes
                        if (targetNode.type === 'code' && targetNode.data?.code) {
                            await this.executeCodeNode(botId, targetNode, client, context);
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`[BotRuntime] Error handling flow event '${eventType}':`, error);
        }
    }

    // Execute a code node
    static async executeCodeNode(botId: string, node: any, client: Client, context: any) {
        try {
            const code = node.data.code;
            console.log(`[BotRuntime] Executing code node '${node.data.label}' for bot ${botId}`);

            // Create execution context
            const execContext = {
                client,
                botId,
                db,
                bots,
                eq,
                context,
                console: {
                    log: (...args: any[]) => console.log(`[Code:${node.data.label}]`, ...args),
                    error: (...args: any[]) => console.error(`[Code:${node.data.label}]`, ...args)
                }
            };

            // Wrap code in async function and execute
            const asyncFunction = new Function(
                'client', 'botId', 'db', 'bots', 'eq', 'context', 'console',
                `return (async () => { ${code} })();`
            );

            await asyncFunction(
                execContext.client,
                execContext.botId,
                execContext.db,
                execContext.bots,
                execContext.eq,
                execContext.context,
                execContext.console
            );

            console.log(`[BotRuntime] Code node '${node.data.label}' executed successfully`);
        } catch (error: any) {
            console.error(`[BotRuntime] Error executing code node '${node.data?.label}':`, error.message);
        }
    }

    // Handle /inv command - invite user to AI room
    static async handleInviteCommand(interaction: ChatInputCommandInteraction) {
        try {
            const targetUser = interaction.options.getUser('user');
            if (!targetUser) {
                await interaction.reply({ content: '❌ Please specify a user to invite', flags: 64 });
                return;
            }

            const thread = interaction.channel as ThreadChannel;
            if (!thread || !thread.isThread()) {
                await interaction.reply({ content: '❌ This command can only be used in AI chat rooms', flags: 64 });
                return;
            }

            await thread.members.add(targetUser.id);
            await interaction.reply({ content: `✅ <@${targetUser.id}> has been invited to this AI chat room!` });

        } catch (error) {
            console.error('[BotRuntime] Error inviting user:', error);
            await interaction.reply({ content: '❌ Failed to invite user', flags: 64 });
        }
    }

    // Handle messages in AI chat threads
    static async handleAIMessage(botId: string, message: Message, client: Client) {
        try {
            // Get bot config first
            const bot = await db.select().from(bots).where(eq(bots.id, botId));
            if (!bot[0]) return;

            const rawConfig = bot[0].config;
            const config = typeof rawConfig === 'string' ? JSON.parse(rawConfig || '{}') : (rawConfig || {});
            const aiConfig = config.ai || {};

            // Check if this is a PUBLIC AI channel (not thread)
            const publicChannels = aiConfig.publicChannels || {};
            const channelId = message.channel.id;

            // Check for public chat channel
            if (publicChannels.chat?.channelId === channelId && publicChannels.chat?.enabled) {
                await this.handlePublicAIMessage(botId, message, client, publicChannels.chat, 'chat');
                return;
            }

            // Check for public image channel
            if (publicChannels.image?.channelId === channelId && publicChannels.image?.enabled) {
                await this.handlePublicAIMessage(botId, message, client, publicChannels.image, 'image');
                return;
            }

            // Check if message is in an AI thread (private chat)
            if (!message.channel.isThread()) return;

            const thread = message.channel as ThreadChannel;

            // Get AI session for this thread
            const session = await db.select().from(aiSessions).where(eq(aiSessions.threadId, thread.id));
            if (!session[0] || session[0].status !== 'active') return;

            // Get providers array (aiConfig already loaded above)
            const providers = aiConfig.providers || [];
            if (providers.length === 0) {
                console.log('[BotRuntime] AI not configured - no providers found');
                return;
            }

            // Show typing indicator
            await thread.sendTyping();

            // Get conversation history
            let history: any[] = [];
            let currentMode = (session[0] as any).aiMode || 'auto';
            try {
                history = JSON.parse(session[0].conversationHistory as string || '[]');
                // Check for mode switch marker
                const modeMarker = history.find((m: any) => m.content?.startsWith('MODE_SWITCH:'));
                if (modeMarker) {
                    currentMode = modeMarker.content.replace('MODE_SWITCH:', '');
                    history = history.filter((m: any) => !m.content?.startsWith('MODE_SWITCH:'));
                }
            } catch (e) {
                history = [];
            }

            // Add user message to history
            history.push({ role: 'user', content: message.content });

            // Keep only last 20 messages to avoid token limits
            if (history.length > 20) {
                history = history.slice(-20);
            }

            // Get the selected provider from session or default
            const sessionProviderId = session[0].aiProvider || aiConfig.defaultProvider || providers[0]?.id || 'gemini';

            // Find the provider config from providers array
            const providerConfig = providers.find((p: any) => p.id === sessionProviderId);
            if (!providerConfig) {
                console.log(`[BotRuntime] Provider ${sessionProviderId} not found in config`);
                await message.reply(`❌ Provider "${sessionProviderId}" is not configured. Use /switch to change provider.`);
                return;
            }

            // ====== TOKEN LIMIT CHECK ======
            const providerLabel = providerConfig.label || providerConfig.name || sessionProviderId;
            const isUserAdmin = message.member?.permissions?.has('Administrator') || false;
            const limitCheck = await TokenUsageService.checkLimit(
                botId,
                sessionProviderId,
                providerLabel,
                message.author.id,
                isUserAdmin
            );

            if (!limitCheck.allowed) {
                await message.reply(limitCheck.message || '⚠️ Token limit reached!');
                // Log limit exceeded
                this.addBotLog(botId, 'AI', `Token limit reached for ${providerLabel}`, {
                    user: message.author.username,
                    details: { limitType: limitCheck.limitType, usage: limitCheck.currentUsage, limit: limitCheck.limit }
                });
                return;
            }
            // ====== END TOKEN LIMIT CHECK ======

            // Get API key and model from the selected provider
            const apiKey = providerConfig.apiKey;

            // Get model - priority: session.aiModel > providerConfig.models[mode] > 'auto'
            const sessionModel = (session[0] as any).aiModel;

            // Validate that session model belongs to current provider
            // If model contains other provider name (e.g. 'claude-' for non-claude provider), ignore it
            const providerModelPrefixes: Record<string, string[]> = {
                'gemini': ['gemini-', 'models/'],
                'openai': ['gpt-', 'o1-'],
                'claude': ['claude-'],
                'groq': ['llama', 'mixtral', 'gemma'],
                'azure': [], // Azure uses deployment names, not model names
                'together': ['meta-llama', 'mistralai'],
                'replicate': ['meta/', 'stability-ai/']
            };

            // Check if sessionModel is valid for this provider
            let validModel = sessionModel;

            // Azure uses deployment names, NOT model names - always ignore sessionModel for Azure
            if (sessionProviderId === 'azure') {
                validModel = ''; // Azure will use azureDeployment in chatAzure function
                console.log(`[BotRuntime] Azure provider - ignoring sessionModel, will use azureDeployment`);
            } else if (sessionModel) {
                const validPrefixes = providerModelPrefixes[sessionProviderId] || [];
                const isValidForProvider = validPrefixes.length === 0 || validPrefixes.some(prefix => sessionModel.toLowerCase().includes(prefix.toLowerCase()));
                if (!isValidForProvider) {
                    console.log(`[BotRuntime] Model "${sessionModel}" doesn't match provider "${sessionProviderId}", using default`);
                    validModel = '';
                }
            }

            const selectedModel = validModel || providerConfig.models?.[currentMode] || providerConfig.models?.chat || '';

            console.log(`[BotRuntime] AI - Provider: ${sessionProviderId}, Mode: ${currentMode}, Model: ${selectedModel || 'auto'}`);
            console.log(`[BotRuntime] API Key exists: ${!!apiKey}, Length: ${apiKey?.length || 0}`);

            // ==================== IMAGE GENERATION ====================
            // Detect if user wants an image (mode is image OR message contains image-related keywords)
            const wantsImage = currentMode === 'image' ||
                /\b(generate|create|make|draw|paint|design|imagine)\b.*\b(image|picture|photo|art|illustration|artwork|drawing|painting)\b/i.test(message.content) ||
                /\b(image|picture|photo|art|illustration)\b.*\b(of|for|showing|with)\b/i.test(message.content);

            if (wantsImage) {
                // Handle image generation
                console.log(`[BotRuntime] Generating image...`);
                await message.reply('🎨 Generating your HD image... Please wait.');

                const imageModel = providerConfig.models?.image || selectedModel;
                const response = await AIService.generateImage({
                    provider: sessionProviderId as any,
                    apiKey: apiKey,
                    prompt: message.content,
                    model: imageModel,
                    quality: 'hd',
                    style: 'vivid'
                });

                if (response.error) {
                    await message.reply(`❌ Image Generation Error: ${response.error}`);
                    return;
                }

                if (response.imageUrl) {
                    // Check if it's a base64 image (from Gemini)
                    if (response.imageUrl.startsWith('data:image')) {
                        // Convert base64 to buffer and send as attachment
                        const base64Data = response.imageUrl.replace(/^data:image\/\w+;base64,/, '');
                        const imageBuffer = Buffer.from(base64Data, 'base64');
                        await thread.send({
                            content: response.content || '🎨 Here is your generated image!',
                            files: [{
                                attachment: imageBuffer,
                                name: 'generated_image.png'
                            }]
                        });
                    } else {
                        // Regular URL - embed the image
                        const { EmbedBuilder } = await import('discord.js');
                        const imageEmbed = new EmbedBuilder()
                            .setTitle('🎨 Generated Image')
                            .setDescription(message.content.substring(0, 100) + (message.content.length > 100 ? '...' : ''))
                            .setImage(response.imageUrl)
                            .setColor(0x7C3AED)
                            .setTimestamp()
                            .setFooter({ text: `Generated by ${sessionProviderId} • HD Quality` });

                        await thread.send({ embeds: [imageEmbed] });
                    }
                } else {
                    await message.reply(response.content || '🎨 Image generation completed but no image was returned.');
                }
                return;
            }

            // ==================== TEXT-TO-SPEECH (TTS) ====================
            const wantsTTS = currentMode === 'audio' ||
                /\b(read|speak|say|voice|audio|tts)\b.*\b(this|aloud|out|text|loud)\b/i.test(message.content) ||
                /\b(convert|generate)\b.*\b(speech|audio|voice)\b/i.test(message.content);

            if (wantsTTS && (sessionProviderId === 'openai' || sessionProviderId === 'groq')) {
                console.log(`[BotRuntime] Generating TTS...`);
                await message.reply('🎤 Converting text to speech... Please wait.');

                // Extract text to speak (remove TTS keywords)
                const textToSpeak = message.content
                    .replace(/\b(read|speak|say|voice|audio|tts|convert|generate|speech|this|aloud|out|text|loud)\b/gi, '')
                    .trim() || message.content;

                const ttsResponse = await AIService.generateSpeech({
                    provider: sessionProviderId,
                    apiKey: apiKey,
                    text: textToSpeak,
                    model: sessionProviderId === 'openai' ? 'tts-1-hd' : 'playai-tts',
                    voice: 'alloy' // Default voice
                });

                if (ttsResponse.error) {
                    await message.reply(`❌ TTS Error: ${ttsResponse.error}`);
                    return;
                }

                if (ttsResponse.audioBuffer) {
                    await thread.send({
                        content: '🔊 Here is your audio:',
                        files: [{
                            attachment: ttsResponse.audioBuffer,
                            name: 'speech.mp3'
                        }]
                    });
                } else {
                    await message.reply('❌ TTS generation completed but no audio was returned.');
                }
                return;
            }

            // ==================== VIDEO MODE INFO ====================
            if (currentMode === 'video') {
                await message.reply('🎬 Video generation is currently limited. Models like OpenAI Sora and Google Veo-2 are not yet widely available via API. For now, I can help you create a detailed video concept or script instead!\n\nWhat kind of video would you like me to help conceptualize?');
                return;
            }

            // ==================== MUSIC MODE INFO ====================
            if (currentMode === 'music') {
                await message.reply('🎵 Music generation APIs are still emerging. I can help you:\n• Create detailed music prompts for tools like Suno or Udio\n• Describe melodies, chords, and arrangements\n• Generate song lyrics\n\nWhat kind of music would you like to create?');
                return;
            }


            // Regular text chat
            // Get bot name and user name for AI context
            const botName = client.user?.displayName || client.user?.username || 'AI Assistant';
            const userName = message.author.displayName || message.author.username || 'User';

            // Log private thread AI chat
            this.addBotLog(botId, 'AI', `💬 Private chat from ${userName}`, {
                user: userName,
                channel: thread.name || 'AI Thread'
            });

            // Get thread members and chat history (excluding bot and current user)
            let membersList = '';
            let chatHistoryContext = '';
            try {
                // Fetch recent messages from thread (last 50 messages)
                const recentMessages = await thread.messages.fetch({ limit: 50 });
                console.log(`[BotRuntime] Thread messages count: ${recentMessages.size}`);

                const chatMessages = Array.from(recentMessages.values())
                    .reverse() // Oldest first
                    .filter(m => m.id !== message.id) // Exclude current message
                    .map(m => {
                        const authorName = m.author.bot
                            ? botName
                            : (m.member?.displayName || m.author.displayName || m.author.username);
                        return `${authorName}: ${m.content.substring(0, 500)}`;
                    });

                if (chatMessages.length > 0) {
                    chatHistoryContext = `\n\nRecent chat history in this thread:\n${chatMessages.join('\n')}`;
                }

                // Get unique users from recent messages
                const uniqueUsers = new Set<string>();
                recentMessages.forEach(m => {
                    if (!m.author.bot && m.author.id !== message.author.id) {
                        uniqueUsers.add(m.member?.displayName || m.author.displayName || m.author.username);
                    }
                });

                console.log(`[BotRuntime] Other users in thread: ${uniqueUsers.size > 0 ? Array.from(uniqueUsers).join(', ') : 'none'}`);

                if (uniqueUsers.size > 0) {
                    membersList = `\n\nOther users who have chatted here: ${Array.from(uniqueUsers).join(', ')}.`;
                }
            } catch (e) {
                console.log(`[BotRuntime] Error fetching thread messages:`, e);
            }

            // Get training context if available (learned conversation style)
            let trainingContext = '';
            let knowledgeContext = '';
            let trainingStatus: { isTrainingActive: boolean; totalExamples: number; lastTrainedAt: Date | null } = { isTrainingActive: false, totalExamples: 0, lastTrainedAt: null };
            try {
                trainingStatus = await TrainingService.getStatus(botId);
                if (trainingStatus.totalExamples > 0) {
                    trainingContext = await TrainingService.getTrainingContext(botId);
                }
                // Get knowledge base context (permanent memory)
                knowledgeContext = await KnowledgeService.getKnowledgeContext(botId);
            } catch (e) {
                // Continue without training/knowledge context
            }

            const systemPrompt = `IMPORTANT: Your name is ${botName}. You are a Discord bot assistant BUT you chat like a close friend - casual, fun, and happy! 😊 NEVER say you are Claude, GPT, Gemini, or any other AI name. When asked your name, always say "${botName}". You are currently chatting with ${userName}.

PERSONALITY: Be like a best friend who happens to be super smart! Use casual language, emojis, jokes, and be enthusiastic. Even when explaining coding or technical stuff, keep it light and fun like you're helping a buddy. Don't be too formal or robotic. Celebrate wins, comfort mistakes, and always be encouraging! Use "bro", "dude", "nice!", "awesome!" naturally. Speak like a friendly Malaysian if they speak in Malay.

Always refer to yourself as ${botName}.${membersList}${chatHistoryContext}${knowledgeContext}${trainingContext ? `\n\n${trainingContext}` : ''}`;

            // Prepend system message to history
            const messagesWithSystem = [
                { role: 'system', content: systemPrompt },
                ...history
            ];

            const response = await AIService.chat({
                provider: sessionProviderId as any,
                apiKey: apiKey,
                model: selectedModel,
                mode: currentMode as any,
                azureEndpoint: providerConfig.azureEndpoint,
                azureDeployment: providerConfig.azureDeployment
            }, messagesWithSystem);

            if (response.error) {
                await message.reply(`❌ AI Error: ${response.error}`);
                return;
            }

            // ====== RECORD TOKEN USAGE ======
            const tokensUsed = response.tokensUsed || null; // null = "token not provided"
            await TokenUsageService.recordUsage(
                botId,
                sessionProviderId,
                providerLabel,
                tokensUsed,
                currentMode,
                selectedModel,
                message.author.id,
                message.author.username
            );
            // Log token usage to Bot Logs
            this.addBotLog(botId, 'AI', `🪙 Token Usage: ${tokensUsed !== null ? tokensUsed.toLocaleString() + ' tokens' : 'N/A'} | Provider: ${providerLabel} | Model: ${selectedModel}`, {
                user: message.author.username,
                channel: thread.name || 'AI Thread',
                details: { tokensUsed, provider: sessionProviderId, model: selectedModel, mode: currentMode }
            });
            // ====== END RECORD TOKEN USAGE ======

            // ====== SAVE TRAINING EXAMPLE IF TRAINING MODE ACTIVE ======
            if (trainingStatus.isTrainingActive) {
                try {
                    const userMessage = history[history.length - 1]?.content || message.content;
                    await TrainingService.saveExample(botId, userMessage, response.content, {
                        userId: message.author.id,
                        userName: message.author.username,
                        channelId: message.channel.id
                    });
                    this.addBotLog(botId, 'AI', `📚 Training: Learned example #${trainingStatus.totalExamples + 1}`, {
                        user: message.author.username
                    });

                    // ====== EXTRACT KNOWLEDGE FROM CONVERSATION ======
                    const knowledgeEntries = await KnowledgeService.extractKnowledge(
                        message.content,
                        response.content,
                        config
                    );
                    if (knowledgeEntries.length > 0) {
                        await KnowledgeService.saveKnowledge(botId, knowledgeEntries);
                        this.addBotLog(botId, 'AI', `🧠 Knowledge: Learned ${knowledgeEntries.length} new fact(s)`, {
                            user: message.author.username,
                            details: { facts: knowledgeEntries.map(k => k.key) }
                        });
                    }
                    // ====== END KNOWLEDGE EXTRACTION ======
                } catch (e) {
                    console.error('[BotRuntime] Error saving training example:', e);
                }
            }
            // ====== END TRAINING ======

            // Add AI response to history
            history.push({ role: 'assistant', content: response.content });

            // Update session with new history
            await db.update(aiSessions)
                .set({ conversationHistory: JSON.stringify(history) })
                .where(eq(aiSessions.id, session[0].id));

            // Send AI response (split if too long)
            const maxLength = 2000;
            if (response.content.length <= maxLength) {
                await message.reply(response.content);
            } else {
                // Split into chunks
                const chunks = response.content.match(/.{1,1990}/gs) || [];
                for (const chunk of chunks) {
                    await thread.send(chunk);
                }
            }

        } catch (error) {
            console.error('[BotRuntime] Error handling AI message:', error);
        }
    }

    // Handle AI close button click
    static async handleAICloseButton(interaction: any) {
        try {
            // Defer reply immediately to prevent timeout
            await interaction.deferReply();

            const sessionId = interaction.customId.replace('ai_close_', '');

            // Update session status
            await db.update(aiSessions)
                .set({ status: 'closed', closedAt: new Date() })
                .where(eq(aiSessions.id, sessionId));

            // Reply with close message
            await interaction.editReply({ content: '🔒 AI Chat Session closed. This thread will be archived.' });

            // Archive and lock the thread (lock first, then archive)
            try {
                const thread = interaction.channel as ThreadChannel;
                // Must lock before archiving - archived threads can't be modified
                if (!thread.locked) {
                    await thread.setLocked(true);
                }
                if (!thread.archived) {
                    await thread.setArchived(true);
                }
            } catch (archiveError: any) {
                // Thread already archived/locked or permission issue - ignore
                console.log('[BotRuntime] Thread archive/lock skipped:', archiveError.code || archiveError.message);
            }

        } catch (error) {
            console.error('[BotRuntime] Error closing AI session:', error);
            try {
                await interaction.editReply({ content: '❌ Failed to close session' });
            } catch {
                // Already replied or deferred - try ephemeral reply
                try {
                    await interaction.reply({ content: '❌ Failed to close session', flags: 64 });
                } catch { }
            }
        }
    }

    // Handle /set command - AI Settings with 3 dropdowns (provider, mode, model)
    static async handleSetCommand(botId: string, interaction: ChatInputCommandInteraction) {
        try {
            // Defer reply immediately to prevent 3-second timeout
            await interaction.deferReply({ flags: 64 });

            const thread = interaction.channel as ThreadChannel;
            if (!thread?.isThread()) {
                await interaction.editReply({ content: '❌ Use this command inside an AI chat room' });
                return;
            }

            // Get session
            const session = await db.select().from(aiSessions).where(eq(aiSessions.threadId, thread.id));
            if (!session[0]) {
                await interaction.editReply({ content: '❌ No active AI session in this thread' });
                return;
            }

            // Get bot config
            const bot = await db.select().from(bots).where(eq(bots.id, botId));
            const rawConfig = bot[0]?.config;
            const config = typeof rawConfig === 'string' ? JSON.parse(rawConfig || '{}') : (rawConfig || {});
            const aiConfig = config.ai || {};
            const configuredProviders = aiConfig.providers || [];

            if (configuredProviders.length === 0) {
                await interaction.editReply({ content: '❌ No AI providers configured' });
                return;
            }

            // Get current settings
            const currentProviderId = (session[0] as any).aiProvider || aiConfig.defaultProvider || configuredProviders[0]?.id;
            const currentMode = (session[0] as any).aiMode || 'auto';
            const currentModel = (session[0] as any).aiModel || '';

            // Get provider config
            const providerConfig = configuredProviders.find((p: any) => p.id === currentProviderId);
            const allProvidersMeta = AIService.getProviders();
            const allModes = AIService.getModes();

            // Build available providers list
            const availableProviders = configuredProviders.map((cp: any) => {
                const meta = allProvidersMeta.find((p: { id: string }) => p.id === cp.id);
                return { id: cp.id, name: meta?.name || cp.id };
            });

            // Get configured modes (auto + modes that have models available)
            const configuredModes: any[] = [];
            const autoMode = allModes.find((m: { id: string }) => m.id === 'auto');
            if (autoMode) configuredModes.push(autoMode);

            if (providerConfig) {
                const fetchedModels = providerConfig.fetchedModels || [];
                const hasFetchedModels = Array.isArray(fetchedModels) && fetchedModels.length > 0;

                for (const mode of allModes.filter((m: { id: string }) => m.id !== 'auto')) {
                    // New format: modeChat: "true", modeCode: "true", etc.
                    const modeKey = `mode${mode.id.charAt(0).toUpperCase() + mode.id.slice(1)}`;
                    const isModeEnabled = providerConfig[modeKey] === true || providerConfig[modeKey] === 'true';
                    // Old format: models.chat, models.code, etc.
                    const hasModel = providerConfig.models?.[mode.id];

                    // Check if fetchedModels has models for this mode
                    const hasModelsForMode = hasFetchedModels
                        ? fetchedModels.some((m: any) => m.modes?.includes(mode.id))
                        : true; // If no fetchedModels, allow all enabled modes

                    if ((isModeEnabled || hasModel) && hasModelsForMode) {
                        configuredModes.push(mode);
                    }
                }
            }

            // Get available models for current mode - use fetchedModels from config if available
            let availableModels: string[] = [];
            if (currentMode !== 'auto') {
                // First check if provider has fetchedModels from Studio
                const fetchedModels = providerConfig?.fetchedModels || [];
                if (Array.isArray(fetchedModels) && fetchedModels.length > 0) {
                    // Filter fetched models by mode
                    availableModels = fetchedModels
                        .filter((m: any) => m.modes?.includes(currentMode))
                        .map((m: any) => m.id || m.name);
                    console.log(`[BotRuntime] Using ${availableModels.length} fetchedModels for mode ${currentMode}`);
                } else {
                    // No fetchedModels - user must Fetch Models in Studio first
                    console.log(`[BotRuntime] No fetchedModels for ${currentProviderId} mode ${currentMode} - use Fetch Models in Studio`);
                }
            }

            // Delete any existing settings/welcome embed in this thread (from bot)
            try {
                const messages = await thread.messages.fetch({ limit: 50 });
                const botMessages = messages.filter(m =>
                    m.author.id === interaction.client.user?.id &&
                    m.embeds.length > 0
                );
                for (const [, msg] of botMessages) {
                    try { await msg.delete(); } catch { }
                }
            } catch { }

            // Create settings embed (identical to welcome embed)
            const providerInfo = allProvidersMeta.find((p: { id: string }) => p.id === currentProviderId);
            const modeInfo = allModes.find((m: { id: string }) => m.id === currentMode);
            const userId = interaction.user.id;

            const embed = new EmbedBuilder()
                .setColor(0x10B981)
                .setTitle('🤖 AI Chat Room')
                .setDescription(currentMode === 'auto'
                    ? `Welcome <@${userId}>! Start chatting - AI will detect your intent.\n\n**Provider:** ${providerInfo?.name || currentProviderId}\n**Mode:** Auto (detects intent)`
                    : `Welcome <@${userId}>! Start chatting.\n\n**Provider:** ${providerInfo?.name || currentProviderId}\n**Mode:** ${modeInfo?.name || currentMode}${currentModel ? `\n**Model:** ${currentModel}` : ''}`)
                .setFooter({ text: `Session ID: ${session[0].id.slice(0, 8)} • Use dropdowns below to change settings` })
                .setTimestamp();

            // Provider dropdown (deduplicate to prevent Discord API error)
            const uniqueSetProviders = availableProviders.filter((p: { id: string }, idx: number, arr: { id: string }[]) =>
                arr.findIndex(x => x.id === p.id) === idx
            );
            const providerSelect = new StringSelectMenuBuilder()
                .setCustomId(`set_provider_${session[0].id}`)
                .setPlaceholder('🔧 Select Provider')
                .addOptions(
                    uniqueSetProviders.slice(0, 25).map((p: { id: string; name: string }) => ({
                        label: p.name,
                        value: p.id,
                        default: p.id === currentProviderId
                    }))
                );

            // Mode dropdown (deduplicate to prevent Discord API error)
            const uniqueSetModes = configuredModes.filter((m, idx, arr) =>
                arr.findIndex(x => x.id === m.id) === idx
            );
            const modeSelect = new StringSelectMenuBuilder()
                .setCustomId(`set_mode_${session[0].id}`)
                .setPlaceholder('🎯 Select Mode')
                .addOptions(
                    uniqueSetModes.slice(0, 25).map((m: { id: string; name: string; icon: string }) => ({
                        label: `${m.icon} ${m.name}`,
                        value: m.id,
                        default: m.id === currentMode
                    }))
                );

            // Build action rows
            const row1 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(providerSelect);
            const row2 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(modeSelect);
            const components: any[] = [row1, row2];

            // Model dropdown (only if not auto mode and models available)
            if (currentMode !== 'auto' && availableModels.length > 0) {
                // Add custom model option at the end
                const modelOptions = availableModels.slice(0, 24).map((model: string, idx: number) => ({
                    label: model.length > 25 ? model.slice(0, 22) + '...' : model,
                    value: model,
                    description: idx === 0 ? '⭐ Recommended' : undefined,
                    default: model === currentModel || (idx === 0 && !currentModel)
                }));

                // Add "Custom Model" option
                modelOptions.push({
                    label: '✏️ Custom Model...',
                    value: '__custom_model__',
                    description: 'Enter any model name manually',
                    default: !!(currentModel && !availableModels.includes(currentModel))
                });

                const modelSelect = new StringSelectMenuBuilder()
                    .setCustomId(`set_model_${session[0].id}`)
                    .setPlaceholder('🤖 Select AI Model')
                    .addOptions(modelOptions);
                const row3 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(modelSelect);
                components.push(row3);
            }

            // Custom Model Input Button (always show so user can enter any model)
            const customButton = new ButtonBuilder()
                .setCustomId(`set_custom_model_${session[0].id}`)
                .setLabel('Custom Model')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('✏️');

            // Close Room button (same as Welcome Embed)
            const closeButton = new ButtonBuilder()
                .setCustomId(`ai_close_${session[0].id}`)
                .setLabel('Close Room')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔒');
            const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(customButton, closeButton);
            components.push(buttonRow);

            // Send new settings message
            const settingsMsg = await thread.send({
                embeds: [embed],
                components
            });

            // Reply ephemerally
            await interaction.editReply({ content: '⚙️ Settings opened below!' });
            this.autoDeleteReply(interaction);

        } catch (error) {
            console.error('[BotRuntime] Error handling /set command:', error);
            await interaction.editReply({ content: '❌ Failed to open settings' });
        }
    }

    // Handle /set dropdown selections (provider, mode, model)
    static async handleSetSelectMenu(botId: string, interaction: Interaction) {
        if (!interaction.isStringSelectMenu()) return;

        try {
            // Defer update immediately to prevent timeout
            await interaction.deferUpdate();

            const { customId, values } = interaction;
            const selectedValue = values[0];
            const thread = interaction.channel as ThreadChannel;

            // Extract session ID from customId (set_provider_xxxx, set_mode_xxxx, set_model_xxxx)
            const parts = customId.split('_');
            const type = parts[1]; // provider, mode, or model
            const sessionId = parts.slice(2).join('_');

            console.log(`[BotRuntime] Private Chat - Changing ${type} to: ${selectedValue}`);

            // Get session
            const session = await db.select().from(aiSessions).where(eq(aiSessions.id, sessionId));
            if (!session[0]) {
                await interaction.followUp({ content: '❌ Session not found', flags: 64 });
                return;
            }

            // Get bot config
            const bot = await db.select().from(bots).where(eq(bots.id, botId));
            const rawConfig = bot[0]?.config;
            const config = typeof rawConfig === 'string' ? JSON.parse(rawConfig || '{}') : (rawConfig || {});
            const configuredProviders = config.ai?.providers || [];

            // Update session based on type
            if (type === 'provider') {
                await db.update(aiSessions)
                    .set({
                        aiProvider: selectedValue,
                        aiModel: '', // Reset model when provider changes
                        conversationHistory: JSON.stringify([{ role: 'system', content: 'PROVIDER_SWITCH' }])
                    } as any)
                    .where(eq(aiSessions.id, sessionId));
                console.log(`[BotRuntime] Session ${sessionId.slice(0, 8)} - Provider changed to: ${selectedValue}`);
            } else if (type === 'mode') {
                // Get the provider config for fetchedModels
                const currentProviderId = (session[0] as any).aiProvider || configuredProviders[0]?.id;
                const providerConfig = configuredProviders.find((p: any) => p.id === currentProviderId);
                const fetchedModels = providerConfig?.fetchedModels || [];

                // Get models from fetchedModels if available, otherwise static list
                let modeModels: string[] = [];
                if (selectedValue !== 'auto') {
                    if (Array.isArray(fetchedModels) && fetchedModels.length > 0) {
                        modeModels = fetchedModels
                            .filter((m: any) => m.modes?.includes(selectedValue))
                            .map((m: any) => m.id || m.name);
                        console.log(`[BotRuntime] Mode change - using ${modeModels.length} fetchedModels for ${selectedValue}`);
                    } else {
                        modeModels = AIService.getModels(currentProviderId, selectedValue);
                        console.log(`[BotRuntime] Mode change - getModels(${currentProviderId}, ${selectedValue}):`, modeModels);
                    }
                }
                const firstModel = modeModels.length > 0 ? modeModels[0] : '';

                await db.update(aiSessions)
                    .set({
                        aiMode: selectedValue,
                        aiModel: firstModel, // Set first recommended model or empty for auto
                        conversationHistory: JSON.stringify([{ role: 'system', content: `MODE_SWITCH:${selectedValue}` }])
                    } as any)
                    .where(eq(aiSessions.id, sessionId));
                console.log(`[BotRuntime] Session ${sessionId.slice(0, 8)} - Mode changed to: ${selectedValue}, Model: ${firstModel || 'auto'}`);
            } else if (type === 'model') {
                await db.update(aiSessions)
                    .set({ aiModel: selectedValue } as any)
                    .where(eq(aiSessions.id, sessionId));
                console.log(`[BotRuntime] Session ${sessionId.slice(0, 8)} - Model changed to: ${selectedValue}`);
            }

            // Refresh the embed with updated settings
            const updatedSession = await db.select().from(aiSessions).where(eq(aiSessions.id, sessionId));
            const currentProviderId = (updatedSession[0] as any).aiProvider || configuredProviders[0]?.id;
            const currentMode = (updatedSession[0] as any).aiMode || 'auto';
            const currentModel = (updatedSession[0] as any).aiModel || '';

            const allProvidersMeta = AIService.getProviders();
            const allModes = AIService.getModes();
            const providerConfig = configuredProviders.find((p: any) => p.id === currentProviderId);

            // Get configured modes for this provider (support both new modeX and old models format)
            const configuredModes: any[] = [];
            const autoMode = allModes.find((m: { id: string }) => m.id === 'auto');
            if (autoMode) configuredModes.push(autoMode);

            if (providerConfig) {
                const fetchedModels = providerConfig.fetchedModels || [];
                const hasFetchedModels = Array.isArray(fetchedModels) && fetchedModels.length > 0;

                for (const mode of allModes.filter((m: { id: string }) => m.id !== 'auto')) {
                    // New format: modeChat: "true", modeCode: "true", etc.
                    const modeKey = `mode${mode.id.charAt(0).toUpperCase() + mode.id.slice(1)}`;
                    const isModeEnabled = providerConfig[modeKey] === true || providerConfig[modeKey] === 'true';
                    // Old format: models.chat, models.code, etc.
                    const hasModel = providerConfig.models?.[mode.id];

                    // Check if fetchedModels has models for this mode
                    const hasModelsForMode = hasFetchedModels
                        ? fetchedModels.some((m: any) => m.modes?.includes(mode.id))
                        : true;

                    if ((isModeEnabled || hasModel) && hasModelsForMode) {
                        configuredModes.push(mode);
                    }
                }
            }

            // Get available models for current mode
            const availableModels = currentMode !== 'auto' ?
                AIService.getModels(currentProviderId, currentMode) : [];

            // Build available providers list
            const availableProviders = configuredProviders.map((cp: any) => {
                const meta = allProvidersMeta.find((p: { id: string }) => p.id === cp.id);
                return { id: cp.id, name: meta?.name || cp.id };
            });

            // Create updated embed - keep AI Chat Room style (green)
            const providerInfo = allProvidersMeta.find((p: { id: string }) => p.id === currentProviderId);
            const modeInfo = allModes.find((m: { id: string }) => m.id === currentMode);

            const embed = new EmbedBuilder()
                .setColor(0x10B981) // Green - AI Chat Room style
                .setTitle('🤖 AI Chat Room')
                .setDescription(`Welcome <@${interaction.user.id}>! Start chatting - AI will detect your intent.\n\n**Provider:** ${providerInfo?.name || currentProviderId}\n**Mode:** ${modeInfo?.name || currentMode}${currentModel ? ` (${currentModel})` : ''}\n\nSession ID: ${sessionId.slice(0, 8)} • Use dropdowns below to change settings`)
                .setTimestamp();

            // Provider dropdown
            const providerSelect = new StringSelectMenuBuilder()
                .setCustomId(`set_provider_${sessionId}`)
                .setPlaceholder('🔧 Select Provider')
                .addOptions(
                    availableProviders.slice(0, 25).map((p: { id: string; name: string }) => ({
                        label: p.name,
                        value: p.id,
                        default: p.id === currentProviderId
                    }))
                );

            // Mode dropdown
            const modeSelect = new StringSelectMenuBuilder()
                .setCustomId(`set_mode_${sessionId}`)
                .setPlaceholder('🎯 Select Mode')
                .addOptions(
                    configuredModes.slice(0, 25).map((m: { id: string; name: string; icon: string }) => ({
                        label: `${m.icon} ${m.name}`,
                        value: m.id,
                        default: m.id === currentMode
                    }))
                );

            // Build action rows
            const row1 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(providerSelect);
            const row2 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(modeSelect);
            const components: any[] = [row1, row2];

            // Model dropdown (only if not auto mode and models available)
            if (currentMode !== 'auto' && availableModels.length > 0) {
                const modelSelect = new StringSelectMenuBuilder()
                    .setCustomId(`set_model_${sessionId}`)
                    .setPlaceholder('🤖 Select AI Model')
                    .addOptions(
                        availableModels.slice(0, 25).map((model: string, idx: number) => ({
                            label: model,
                            value: model,
                            description: idx === 0 ? '⭐ Recommended' : undefined,
                            default: model === currentModel || (idx === 0 && !currentModel)
                        }))
                    );
                const row3 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(modelSelect);
                components.push(row3);
            }

            // Custom Model button + Close Room button (in one row)
            const customModelButton = new ButtonBuilder()
                .setCustomId(`set_custom_model_${sessionId}`)
                .setLabel('Custom Model')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('✏️');
            const closeRoomButton = new ButtonBuilder()
                .setCustomId(`ai_close_${sessionId}`)
                .setLabel('Close Room')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔒');
            const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(customModelButton, closeRoomButton);
            components.push(buttonRow);

            // Update the message using editReply since we deferred
            await interaction.editReply({
                embeds: [embed],
                components
            });

        } catch (error) {
            console.error('[BotRuntime] Error handling /set selection:', error);
            try {
                await interaction.followUp({ content: '❌ Selection failed', flags: 64 });
            } catch { }
        }
    }

    // Handle /set close button
    static async handleSetCloseButton(interaction: Interaction) {
        if (!interaction.isButton()) return;

        try {
            // Just delete the message
            await interaction.message.delete();
        } catch (error) {
            console.error('[BotRuntime] Error closing settings:', error);
            try {
                await (interaction as any).reply({ content: '❌ Could not close settings', flags: 64 });
            } catch { }
        }
    }

    // Handle custom model button - show modal for entering custom model name
    static async handleCustomModelButton(interaction: Interaction) {
        if (!interaction.isButton()) return;

        try {
            const sessionId = interaction.customId.replace('set_custom_model_', '');

            // Create modal for custom model input
            const modal = new ModalBuilder()
                .setCustomId(`custom_model_modal_${sessionId}`)
                .setTitle('Enter Custom Model Name');

            const modelInput = new TextInputBuilder()
                .setCustomId('custom_model_name')
                .setLabel('Model Name')
                .setPlaceholder('e.g., gpt-5.2, Llama-4-Maverick-17B, etc.')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMinLength(2)
                .setMaxLength(100);

            const row = new ActionRowBuilder<TextInputBuilder>().addComponents(modelInput);
            modal.addComponents(row);

            await (interaction as any).showModal(modal);
        } catch (error) {
            console.error('[BotRuntime] Error showing custom model modal:', error);
        }
    }

    // Handle custom model modal submit - save custom model to session
    static async handleCustomModelModalSubmit(interaction: ModalSubmitInteraction) {
        try {
            const sessionId = interaction.customId.replace('custom_model_modal_', '');
            const customModel = interaction.fields.getTextInputValue('custom_model_name');

            // Update session with custom model
            await db.update(aiSessions)
                .set({ aiModel: customModel } as any)
                .where(eq(aiSessions.id, sessionId));

            await interaction.reply({
                content: `✅ Custom model set: **${customModel}**\n\n*This model will be used for your next messages.*`,
                flags: 64
            });

            // Auto delete after 5 seconds
            setTimeout(async () => {
                try {
                    await interaction.deleteReply();
                } catch { }
            }, 5000);

        } catch (error) {
            console.error('[BotRuntime] Error handling custom model modal:', error);
            await interaction.reply({ content: '❌ Failed to set custom model', flags: 64 });
        }
    }

    // Handle /aichannel command - set AI channel and send UI embed
    static async handleSetAIChannel(botId: string, interaction: ChatInputCommandInteraction) {
        try {
            // Check if user has Administrator or Manage Guild permission
            const member = interaction.member as any;
            const hasPermission = member?.permissions?.has?.('Administrator') ||
                member?.permissions?.has?.('ManageGuild') ||
                member?.permissions?.has?.(0x20n); // MANAGE_GUILD flag

            if (!hasPermission) {
                await interaction.reply({ content: '❌ You need **Administrator** or **Manage Server** permission to use this command.', flags: 64 });
                return;
            }

            // Defer reply to prevent timeout
            await interaction.deferReply({ flags: 64 });

            const channel = interaction.options.getChannel('channel');

            // Get current bot config
            const bot = await db.select().from(bots).where(eq(bots.id, botId));
            if (!bot[0]) {
                await interaction.editReply({ content: '❌ Bot not found' });
                return;
            }

            const rawConfig = bot[0].config;
            const config = typeof rawConfig === 'string' ? JSON.parse(rawConfig || '{}') : (rawConfig || {});
            config.ai = config.ai || {};

            if (!channel) {
                // Remove restriction
                delete config.ai.channelId;
                await db.update(bots)
                    .set({ config: JSON.stringify(config), updatedAt: new Date() })
                    .where(eq(bots.id, botId));

                await interaction.editReply({ content: `✅ AI commands can now be used in any channel` });
                return;
            }

            // Delete old embed if exists (refresh or channel change)
            if (config.ai.uiMessageId && config.ai.uiChannelId) {
                try {
                    const oldChannel = interaction.guild?.channels.cache.get(config.ai.uiChannelId) as TextChannel;
                    if (oldChannel) {
                        const oldMessage = await oldChannel.messages.fetch(config.ai.uiMessageId).catch(() => null);
                        if (oldMessage) {
                            await oldMessage.delete();
                            console.log(`[BotRuntime] Deleted old AI embed from channel ${config.ai.uiChannelId}`);
                        }
                    }
                } catch (e) {
                    // Ignore - old message may already be deleted
                    console.log('[BotRuntime] Could not delete old AI embed:', e);
                }
            }

            // Set channel
            config.ai = config.ai || {};
            config.ai.channelId = channel.id;
            config.ai.uiChannelId = channel.id; // Store channel for future deletion
            await db.update(bots)
                .set({ config: JSON.stringify(config), updatedAt: new Date() })
                .where(eq(bots.id, botId));

            // Get configured providers from providers array
            const configuredProviders = config.ai.providers || [];
            console.log('[BotRuntime] /aichannel config.ai:', JSON.stringify(config.ai, null, 2));
            const allProvidersMeta = AIService.getProviders();

            // Build available providers list with names
            const availableProviders = configuredProviders.map((cp: any) => {
                const meta = allProvidersMeta.find((p: { id: string }) => p.id === cp.id);
                return { id: cp.id, name: meta?.name || cp.id };
            });

            // If no providers configured, show error
            if (availableProviders.length === 0) {
                await interaction.editReply({ content: '❌ No AI providers configured. Add AI Provider nodes in Studio.' });
                return;
            }

            // Get configured modes from first provider (or any provider with models)
            const allModes = AIService.getModes();
            const configuredModes: any[] = [];

            // Auto mode always available
            const autoMode = allModes.find((m: { id: string }) => m.id === 'auto');
            if (autoMode) configuredModes.push(autoMode);

            // Check first provider for available modes
            // Support both old format (models.X) and new format (modeX boolean)
            const firstProvider = configuredProviders[0];
            console.log('[BotRuntime] /aichannel firstProvider:', JSON.stringify(firstProvider, null, 2));
            if (firstProvider) {
                for (const mode of allModes.filter((m: { id: string }) => m.id !== 'auto')) {
                    // New format: modeChat: "true", modeCode: "true", etc.
                    const modeKey = `mode${mode.id.charAt(0).toUpperCase() + mode.id.slice(1)}`;
                    const isModeEnabled = firstProvider[modeKey] === true || firstProvider[modeKey] === 'true';
                    // Old format: models.chat, models.code, etc.
                    const hasModel = firstProvider.models?.[mode.id];

                    console.log(`[BotRuntime] Mode ${mode.id}: key=${modeKey}, value=${firstProvider[modeKey]}, isModeEnabled=${isModeEnabled}, hasModel=${hasModel}`);

                    if (isModeEnabled || hasModel) {
                        configuredModes.push(mode);
                    }
                }
            }

            // Create embed showing all providers
            const providerList = availableProviders.map((p: { name: string }) => p.name).join(', ');
            const embed = new EmbedBuilder()
                .setColor(0x10B981)
                .setTitle('🤖 AI Assistant')
                .setDescription(`**Available Providers:** ${providerList}\n**Modes:** ${configuredModes.map((m: { name: string }) => m.name).join(', ')}\n\nSelect provider and mode, then click Start Chat!`)
                .setFooter({ text: `${availableProviders.length} provider(s) configured` })
                .setTimestamp();

            // Provider dropdown (shows all configured providers - deduplicate to prevent Discord API error)
            const uniqueProviders = availableProviders.filter((p: { id: string }, idx: number, arr: { id: string }[]) =>
                arr.findIndex(x => x.id === p.id) === idx
            );
            const providerSelect = new StringSelectMenuBuilder()
                .setCustomId('ai_select_provider')
                .setPlaceholder('🔧 Select AI Provider')
                .addOptions(
                    uniqueProviders.slice(0, 25).map((p: { id: string; name: string }, i: number) => ({
                        label: p.name,
                        value: p.id,
                        description: `Use ${p.name}`,
                        default: i === 0
                    }))
                );

            // Mode dropdown (shows only configured modes - deduplicate to prevent Discord API error)
            const uniqueModes = configuredModes.filter((m, idx, arr) =>
                arr.findIndex(x => x.id === m.id) === idx
            );
            const modeSelect = new StringSelectMenuBuilder()
                .setCustomId('ai_select_mode')
                .setPlaceholder('🎯 Select AI Mode')
                .addOptions(
                    uniqueModes.slice(0, 25).map((m: { id: string; name: string; description: string; icon: string }) => ({
                        label: `${m.icon} ${m.name}`,
                        value: m.id,
                        description: m.description.slice(0, 100),
                        default: m.id === 'auto'
                    }))
                );

            // NOTE: Model dropdown NOT shown initially because default mode is "Auto"
            // Auto mode detects intent and picks appropriate mode+model automatically
            // Model dropdown will appear when user changes to a specific mode (handled in handleAISelectMenu)

            // Start Chat button
            const startButton = new ButtonBuilder()
                .setCustomId('ai_start_chat')
                .setLabel('Start Chat')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🚀');

            // Build action rows (no model dropdown for Auto mode)
            const row1 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(providerSelect);
            const row2 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(modeSelect);
            const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(startButton);

            const components: any[] = [row1, row2, buttonRow];

            // Send to channel
            const targetChannel = interaction.guild?.channels.cache.get(channel.id) as TextChannel;
            if (!targetChannel) {
                await interaction.editReply({ content: '❌ Cannot access the specified channel' });
                return;
            }

            const message = await targetChannel.send({
                embeds: [embed],
                components: components
            });

            // Store message ID in config for future updates
            config.ai.uiMessageId = message.id;
            await db.update(bots)
                .set({ config: JSON.stringify(config), updatedAt: new Date() })
                .where(eq(bots.id, botId));

            await interaction.editReply({
                content: `✅ AI Assistant UI sent to <#${channel.id}>\n\nUsers can now select a provider and mode, then click **Start Chat** to begin!`
            });

        } catch (error) {
            console.error('[BotRuntime] Error setting AI channel:', error);
            try { await interaction.editReply({ content: '❌ Failed to set AI channel' }); } catch { }
        }
    }

    // Handle /aichat and /aiimage - Set public AI channel for specific mode
    static async handlePublicAIChannel(botId: string, interaction: ChatInputCommandInteraction, mode: 'chat' | 'image') {
        try {
            // Check permissions
            const member = interaction.member as any;
            const hasPermission = member?.permissions?.has?.('Administrator') ||
                member?.permissions?.has?.('ManageGuild') ||
                member?.permissions?.has?.(0x20n);

            if (!hasPermission) {
                await interaction.reply({ content: '❌ You need **Administrator** or **Manage Server** permission.', flags: 64 });
                return;
            }

            await interaction.deferReply({ flags: 64 });

            const channel = interaction.options.getChannel('channel');
            if (!channel) {
                await interaction.editReply({ content: '❌ Please specify a channel' });
                return;
            }

            // Get bot config
            const bot = await db.select().from(bots).where(eq(bots.id, botId));
            if (!bot[0]) {
                await interaction.editReply({ content: '❌ Bot not found' });
                return;
            }

            const rawConfig = bot[0].config;
            const config = typeof rawConfig === 'string' ? JSON.parse(rawConfig || '{}') : (rawConfig || {});
            config.ai = config.ai || {};
            config.ai.publicChannels = config.ai.publicChannels || {};

            // Get first provider that supports this mode
            const providers = config.ai.providers || [];
            if (providers.length === 0) {
                await interaction.editReply({ content: '❌ No AI providers configured. Add AI Provider nodes in Studio first.' });
                return;
            }

            // For image mode, collect ALL image models from ALL providers
            const targetMode = mode === 'chat' ? 'chat' : 'image';
            const allImageModels: { providerId: string; providerName: string; model: string; endpoint?: string }[] = [];

            for (const p of providers) {
                const fetchedModels = p.fetchedModels || [];
                const providerInfo = AIService.getProviders().find((pr: { id: string }) => pr.id === p.id);
                const providerName = providerInfo?.name || p.id;

                if (Array.isArray(fetchedModels) && fetchedModels.length > 0) {
                    // Use fetched models
                    const imageModels = fetchedModels
                        .filter((m: any) => m.modes?.includes(targetMode) || m.id?.toLowerCase().includes('dall') || m.id?.toLowerCase().includes('image'))
                        .map((m: any) => ({
                            providerId: p.id,
                            providerName,
                            model: m.id || m.name,
                            endpoint: p.endpoint || p.azureEndpoint
                        }));
                    allImageModels.push(...imageModels);
                } else {
                    // Use static models
                    const staticModels = AIService.getModels(p.id, targetMode);
                    for (const modelName of staticModels) {
                        allImageModels.push({
                            providerId: p.id,
                            providerName,
                            model: modelName,
                            endpoint: p.endpoint || p.azureEndpoint
                        });
                    }
                }
            }

            console.log(`[BotRuntime] Found ${allImageModels.length} ${targetMode} models across all providers`);

            // Find the best provider and model (first one with image models)
            let selectedProvider = providers[0];
            let defaultModel = '';
            let correctEndpoint = '';

            if (allImageModels.length > 0) {
                // Use the first image model found
                const firstImageModel = allImageModels[0];
                selectedProvider = providers.find((p: any) => p.id === firstImageModel.providerId) || providers[0];
                defaultModel = firstImageModel.model;
                // Store the correct endpoint from the model (not from wrong provider lookup)
                correctEndpoint = firstImageModel.endpoint || selectedProvider.endpoint || selectedProvider.azureEndpoint;
            } else {
                // Fallback to looking for any provider with modeImage
                for (const p of providers) {
                    const modeKey = `mode${mode.charAt(0).toUpperCase() + mode.slice(1)}`;
                    if (p[modeKey] === true || p[modeKey] === 'true' || p.models?.[mode]) {
                        selectedProvider = p;
                        break;
                    }
                }
                correctEndpoint = selectedProvider.endpoint || selectedProvider.azureEndpoint;
            }

            // Save public channel config
            config.ai.publicChannels[mode] = {
                channelId: channel.id,
                providerId: selectedProvider.id,
                providerEndpoint: correctEndpoint,
                mode: mode === 'chat' ? 'auto' : 'image', // chat uses auto mode, image uses image mode
                model: defaultModel,
                enabled: true
            };

            await db.update(bots)
                .set({ config: JSON.stringify(config), updatedAt: new Date() })
                .where(eq(bots.id, botId));

            // Send welcome embed to channel
            const targetChannel = interaction.guild?.channels.cache.get(channel.id) as TextChannel;
            if (!targetChannel) {
                await interaction.editReply({ content: '❌ Cannot access the specified channel' });
                return;
            }

            const providerInfo = AIService.getProviders().find((p: { id: string }) => p.id === selectedProvider.id);
            const modeLabel = mode === 'chat' ? '💬 Chat (Auto)' : '🎨 Image Generation';

            // Build models list for image mode
            let modelsListText = '';
            if (mode === 'image' && allImageModels.length > 0) {
                const modelsByProvider = new Map<string, string[]>();
                for (const m of allImageModels) {
                    const existing = modelsByProvider.get(m.providerName) || [];
                    existing.push(m.model);
                    modelsByProvider.set(m.providerName, existing);
                }
                const lines: string[] = [];
                modelsByProvider.forEach((models, provName) => {
                    lines.push(`**${provName}:** ${models.join(', ')}`);
                });
                modelsListText = lines.join('\n');
            }

            const embed = new EmbedBuilder()
                .setColor(mode === 'chat' ? 0x10B981 : 0xF59E0B)
                .setTitle(mode === 'chat' ? '💬 Public AI Chat' : '🎨 Public AI Image')
                .setDescription(mode === 'chat'
                    ? `This channel is now an **AI Chat Room**!\n\n**Provider:** ${providerInfo?.name || selectedProvider.id}\n**Mode:** Auto (detects intent)\n**Model:** ${defaultModel || 'auto'}\n\nJust type your message and AI will respond!`
                    : `This channel is now an **AI Image Generator**!\n\n**Selected Provider:** ${providerInfo?.name || selectedProvider.id}\n**Selected Model:** ${defaultModel || 'auto'}\n\n${allImageModels.length > 0 ? `📋 **Available Image Models:**\n${modelsListText}` : '⚠️ No image models found!'}\n\nDescribe what you want to see and AI will create it!`)
                .setFooter({ text: `Public AI Channel • ${mode === 'chat' ? '/aichat' : '/aiimage'}` })
                .setTimestamp();

            await targetChannel.send({ embeds: [embed] });

            await interaction.editReply({
                content: `✅ ${mode === 'chat' ? 'AI Chat' : 'AI Image'} channel set to <#${channel.id}>!\n\n**Provider:** ${providerInfo?.name || selectedProvider.id}\n**Model:** ${defaultModel || 'auto'}\n${mode === 'image' ? `**Found ${allImageModels.length} image model(s)**` : ''}\n\nEveryone can now ${mode === 'chat' ? 'chat with AI' : 'generate images'} in that channel!`
            });

            console.log(`[BotRuntime] Public AI ${mode} channel set: ${channel.id}, Provider: ${selectedProvider.id}, Model: ${defaultModel}`);

        } catch (error) {
            console.error(`[BotRuntime] Error setting public AI ${mode} channel:`, error);
            try { await interaction.editReply({ content: '❌ Failed to set public AI channel' }); } catch { }
        }
    }

    // Handle messages in public AI channels (not threads)
    static async handlePublicAIMessage(botId: string, message: Message, client: Client, channelConfig: any, mode: 'chat' | 'image') {
        try {
            // Check if bot is mentioned or replied to
            const isMentioned = message.mentions.has(client.user?.id || '');
            // Check if reply is to the bot (using mentions.repliedUser which is populated by Discord for replies)
            const isReplyToBot = message.reference && message.mentions.repliedUser?.id === client.user?.id;

            if (!isMentioned && !isReplyToBot) {
                return;
            }

            const channel = message.channel as TextChannel;
            await channel.sendTyping();

            const providerId = channelConfig.providerId;
            const model = channelConfig.model || '';
            const savedEndpoint = channelConfig.providerEndpoint || '';

            // Get bot config for API key
            const bot = await db.select().from(bots).where(eq(bots.id, botId));
            if (!bot[0]) return;

            const rawConfig = bot[0].config;
            const config = typeof rawConfig === 'string' ? JSON.parse(rawConfig || '{}') : (rawConfig || {});
            const providers = config.ai?.providers || [];

            // Find provider - match by endpoint first (for duplicate provider IDs like multiple azure)
            // then fallback to ID match
            let providerConfig = null;
            if (savedEndpoint) {
                providerConfig = providers.find((p: any) =>
                    (p.endpoint || p.azureEndpoint || '').includes(savedEndpoint.split('/')[2]) && p.id === providerId
                );
            }
            if (!providerConfig) {
                providerConfig = providers.find((p: any) => p.id === providerId);
            }

            if (!providerConfig) {
                await message.reply('❌ AI provider not configured');
                return;
            }

            const apiKey = providerConfig.apiKey;
            if (!apiKey) {
                await message.reply('❌ API key not configured for this provider');
                return;
            }

            console.log(`[BotRuntime] Public ${mode} - Provider: ${providerId}, Model: ${model || 'auto'}`);
            this.addBotLog(botId, 'AI', `${mode === 'image' ? '🎨 Image' : '💬 Chat'} from ${message.author.displayName || message.author.username}`, {
                user: message.author.displayName || message.author.username,
                channel: (message.channel as TextChannel).name,
                details: { provider: providerId, model: model || 'auto' }
            });

            // Get provider info for display name
            const providerInfo = AIService.getProviders().find((p: { id: string }) => p.id === providerId);

            if (mode === 'image') {
                // 3-Step Image Generation: Vision → Rewrite → Generate
                await message.react('🎨');

                let finalPrompt = message.content;
                let imageDescription = '';

                // Step 1: Check for image attachments and analyze with vision
                const imageAttachments = message.attachments.filter(att =>
                    att.contentType?.startsWith('image/') ||
                    att.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                );

                if (imageAttachments.size > 0) {
                    const attachment = imageAttachments.first();
                    if (attachment) {
                        // Find a vision-capable provider - prefer non-Azure first, then Azure with vision models
                        const visionProvider = providers.find((p: any) =>
                            (p.modeVision === true || p.modeVision === 'true') &&
                            ['gemini', 'openai', 'claude'].includes(p.id)
                        ) || providers.find((p: any) =>
                            p.modeVision === true || p.modeVision === 'true'
                        ) || providers.find((p: any) =>
                            ['gemini', 'openai', 'claude'].includes(p.id) && p.apiKey
                        );

                        if (visionProvider) {
                            try {
                                await message.react('🔍');
                                console.log(`[BotRuntime] Analyzing reference image with ${visionProvider.id}...`);

                                // Get the vision model from provider config, or use default
                                const visionModel = visionProvider.models?.vision ||
                                    (visionProvider.id === 'gemini' ? 'gemini-2.0-flash' :
                                        visionProvider.id === 'openai' ? 'gpt-4o' :
                                            visionProvider.id === 'claude' ? 'claude-3-5-sonnet-20241022' : 'auto');

                                imageDescription = await AIService.analyzeImage({
                                    provider: visionProvider.id,
                                    apiKey: visionProvider.apiKey,
                                    imageUrl: attachment.url,
                                    prompt: "Describe this image for recreating it. Focus on: colors, shapes, text/letters, style, and composition. Be specific and detailed.",
                                    azureEndpoint: visionProvider.endpoint || visionProvider.azureEndpoint
                                });

                                console.log(`[BotRuntime] Image description: ${imageDescription.substring(0, 100)}...`);

                                // Track vision usage
                                const estimatedVisionTokens = 1000 + Math.ceil(imageDescription.length / 4);
                                await TokenUsageService.recordUsage(
                                    botId,
                                    visionProvider.id,
                                    visionProvider.name || visionProvider.id,
                                    estimatedVisionTokens,
                                    'vision',
                                    visionModel,
                                    message.author.id,
                                    message.author.displayName || message.author.username
                                );
                            } catch (err) {
                                console.error('[BotRuntime] Vision analysis failed:', err);
                            }
                        } else {
                            console.log('[BotRuntime] No vision provider found, proceeding without image analysis');
                        }
                    }
                }

                // Step 2: Rewrite prompt to be safe (remove copyrighted content)
                // Prefer non-Azure providers first, then Azure with chat models
                const rewriteProvider = providers.find((p: any) =>
                    (p.modeChat === true || p.modeChat === 'true') &&
                    ['gemini', 'openai', 'claude', 'groq'].includes(p.id)
                ) || providers.find((p: any) =>
                    p.modeChat === true || p.modeChat === 'true'
                ) || providers.find((p: any) =>
                    ['gemini', 'openai', 'claude', 'groq'].includes(p.id) && p.apiKey
                );

                if (rewriteProvider) {
                    try {
                        await message.react('✨');
                        console.log(`[BotRuntime] Rewriting prompt with ${rewriteProvider.id}...`);

                        // Get the chat model from provider config, or use default
                        const chatModel = rewriteProvider.models?.chat ||
                            (rewriteProvider.id === 'gemini' ? 'gemini-2.5-flash' :
                                rewriteProvider.id === 'openai' ? 'gpt-4o' :
                                    rewriteProvider.id === 'claude' ? 'claude-3-5-sonnet-20241022' :
                                        rewriteProvider.id === 'groq' ? 'llama-3.3-70b-versatile' : 'auto');

                        finalPrompt = await AIService.rewritePromptForImage({
                            provider: rewriteProvider.id,
                            apiKey: rewriteProvider.apiKey,
                            prompt: message.content,
                            imageDescription: imageDescription || undefined,
                            azureEndpoint: rewriteProvider.endpoint || rewriteProvider.azureEndpoint,
                            model: chatModel
                        });

                        console.log(`[BotRuntime] Final prompt: ${finalPrompt.substring(0, 100)}...`);

                        // Track rewrite usage
                        const estimatedRewriteTokens = 200 + Math.ceil(((imageDescription?.length || 0) + message.content.length + finalPrompt.length) / 4);
                        await TokenUsageService.recordUsage(
                            botId,
                            rewriteProvider.id,
                            rewriteProvider.name || rewriteProvider.id,
                            estimatedRewriteTokens,
                            'rewrite',
                            chatModel,
                            message.author.id,
                            message.author.displayName || message.author.username
                        );
                    } catch (err) {
                        console.error('[BotRuntime] Prompt rewrite failed, using original:', err);
                        finalPrompt = imageDescription ? `${imageDescription}. ${message.content}` : message.content;
                    }
                }

                // Step 3: Generate image with safe prompt
                const result = await AIService.generateImage({
                    provider: providerId,
                    apiKey: apiKey,
                    prompt: finalPrompt,
                    model: model,
                    azureEndpoint: channelConfig.providerEndpoint || providerConfig.azureEndpoint || providerConfig.endpoint || ''
                });

                if (!result.error && result.imageUrl) {
                    const embed = new EmbedBuilder()
                        .setColor(0xF59E0B)
                        .setTitle('🎨 AI Generated Image')
                        .setImage(result.imageUrl)
                        .setFooter({ text: `Requested by ${message.author.displayName}` })
                        .setTimestamp();
                    await message.reply({ embeds: [embed] });

                    // Log successful image generation
                    this.addBotLog(botId, 'AI', `🎨 Image generated for ${message.author.displayName || message.author.username}`, {
                        user: message.author.displayName || message.author.username,
                        channel: (message.channel as TextChannel).name
                    });

                    // Track image usage with cost
                    await TokenUsageService.recordImageUsage(
                        botId,
                        providerId,
                        providerInfo?.name || providerId,
                        model || 'unknown',
                        1, // 1 image generated
                        message.author.id,
                        message.author.displayName || message.author.username
                    );
                } else {
                    // Check if it's a content policy error and provide better message
                    const errorMsg = result.error || result.content || 'Failed to generate image';
                    let userMessage = `❌ ${errorMsg}`;

                    if (errorMsg.includes('safety system') || errorMsg.includes('content_policy')) {
                        userMessage = `⚠️ **Content Policy Violation**\n\nYour prompt was rejected by AI safety filters. This usually happens when:\n• The prompt contains copyrighted characters (e.g., Spider-Man, Mickey Mouse)\n• The prompt describes violence, weapons, or inappropriate content\n• The prompt mentions real public figures\n\n💡 **Tips:** Try describing your image without brand names or copyrighted references.`;
                    }

                    await message.reply(userMessage);

                    // Log failed image generation
                    this.addBotLog(botId, 'Error', `❌ Image generation failed: ${result.error || 'Unknown error'}`, {
                        user: message.author.displayName || message.author.username,
                        channel: (message.channel as TextChannel).name
                    });
                }
            } else {
                // Chat mode (auto)
                // Get bot name and user name for AI context
                const botName = client.user?.displayName || client.user?.username || 'AI Assistant';
                const userName = message.author.displayName || message.author.username || 'User';

                // Get channel members (excluding bot and current user)
                let membersList = '';
                let chatHistory = '';
                try {
                    const textChannel = message.channel as TextChannel;

                    // Fetch recent messages from channel (last 50 messages)
                    const recentMessages = await textChannel.messages.fetch({ limit: 50 });
                    const chatMessages = Array.from(recentMessages.values())
                        .reverse() // Oldest first
                        .filter(m => m.id !== message.id) // Exclude current message
                        .map(m => {
                            const authorName = m.author.bot
                                ? botName
                                : (m.member?.displayName || m.author.displayName || m.author.username);
                            return `${authorName}: ${m.content.substring(0, 500)}`;
                        });

                    if (chatMessages.length > 0) {
                        chatHistory = `\n\nRecent chat history in this channel:\n${chatMessages.join('\n')}`;
                    }

                    // Get unique users from recent messages
                    const uniqueUsers = new Set<string>();
                    recentMessages.forEach(m => {
                        if (!m.author.bot && m.author.id !== message.author.id) {
                            uniqueUsers.add(m.member?.displayName || m.author.displayName || m.author.username);
                        }
                    });

                    if (uniqueUsers.size > 0) {
                        membersList = `\n\nOther users who have chatted here: ${Array.from(uniqueUsers).join(', ')}.`;
                    }
                } catch (e) {
                    console.log('[BotRuntime] Error fetching channel history:', e);
                }

                // Get training context if available (learned conversation style)
                let trainingContext = '';
                let knowledgeContext = '';
                let trainingStatus: { isTrainingActive: boolean; totalExamples: number; lastTrainedAt: Date | null } = { isTrainingActive: false, totalExamples: 0, lastTrainedAt: null };
                try {
                    trainingStatus = await TrainingService.getStatus(botId);
                    if (trainingStatus.totalExamples > 0) {
                        trainingContext = await TrainingService.getTrainingContext(botId);
                    }
                    // Get knowledge base context (permanent memory)
                    knowledgeContext = await KnowledgeService.getKnowledgeContext(botId);
                } catch (e) {
                    // Continue without training/knowledge context
                }

                // Get current server time for context
                const now = new Date();
                const serverTimeStr = now.toLocaleString('en-US', {
                    timeZone: process.env.SERVER_TIMEZONE || 'Asia/Kuala_Lumpur',
                    dateStyle: 'full',
                    timeStyle: 'medium'
                });

                const systemPrompt = `IMPORTANT: Your name is ${botName}. You are a Discord bot assistant BUT you chat like a close friend - casual, fun, and happy! 😊 NEVER say you are Claude, GPT, Gemini, or any other AI name. When asked your name, always say "${botName}". You are currently chatting with ${userName}.

CURRENT SERVER TIME: ${serverTimeStr}
(This is the exact time from your server. Use this as truth for any time questions.)

REAL-TIME TOOLS AVAILABLE:
You have access to these tools - USE THEM when asked:
- Time/Date → get_current_time
- Weather → get_weather
- Prayer times → get_prayer_times
- Web search → search_web
- Wikipedia → search_wikipedia
- YouTube → search_youtube
- Currency → convert_currency
- Crypto → get_crypto_price
- Slang → define_slang
- Memes → get_random_meme
- Number facts → get_number_fact
- Read webpage → read_webpage (extract content from URL)
- Jokes → get_joke
- Translate → translate_text (any language)
- Quotes → get_quote (motivational)
- Calculator → calculate (math expressions)
- Shorten URL → shorten_url
- Country info → get_country_info
- Dictionary → get_dictionary (English words)
- Anime/Manga → get_anime_info
- Horoscope → get_horoscope
- GitHub repo → get_github_repo
- Detect language → detect_language

CRITICAL: When asked about real-time info, translations, calculations, or to read websites, you MUST use the appropriate tool. Do NOT guess or make up information.

PERSONALITY: Be like a best friend who happens to be super smart! Use casual language, emojis, jokes, and be enthusiastic. Even when explaining coding or technical stuff, keep it light and fun like you're helping a buddy. Don't be too formal or robotic. Celebrate wins, comfort mistakes, and always be encouraging! Use "bro", "dude", "nice!", "awesome!" naturally. Speak like a friendly Malaysian if they speak in Malay.

Always refer to yourself as ${botName}.${membersList}${chatHistory}${knowledgeContext}${trainingContext ? `\n\n${trainingContext}` : ''}`;

                // Prepare messages
                const messages: AIMessage[] = [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: message.content }
                ];

                // Get tool definitions
                const tools = ToolRegistry.getToolDefinitions();

                // Initial chat call
                let result = await AIService.chat({
                    provider: providerId,
                    apiKey: apiKey,
                    model: model,
                    mode: 'auto',
                    azureEndpoint: providerConfig.azureEndpoint || '',
                    azureDeployment: providerConfig.azureDeployment || '',
                    tools: tools
                }, messages);

                // Handle tool calls (max 5 turns)
                let turnCount = 0;
                while (result.toolCalls && result.toolCalls.length > 0 && turnCount < 5) {
                    turnCount++;

                    // Add assistant message with tool calls to history
                    messages.push({
                        role: 'assistant',
                        content: result.content,
                        tool_calls: result.toolCalls
                    });

                    // Execute tools
                    for (const toolCall of result.toolCalls) {
                        const functionName = toolCall.function.name;
                        let functionArgs = {};
                        try {
                            functionArgs = JSON.parse(toolCall.function.arguments);
                        } catch (e) {
                            console.error(`[BotRuntime] Error parsing args for ${functionName}:`, e);
                        }

                        console.log(`[BotRuntime] Executing tool: ${functionName}`);
                        await channel.sendTyping().catch(() => { });

                        let toolResult = '';
                        const tool = ToolRegistry.getTool(functionName);
                        if (tool) {
                            try {
                                toolResult = await tool.handler(functionArgs);
                            } catch (error: any) {
                                toolResult = `Error executing tool: ${error.message}`;
                            }
                        } else {
                            toolResult = `Tool ${functionName} not found.`;
                        }

                        // Add tool result to history
                        messages.push({
                            role: 'tool',
                            tool_call_id: toolCall.id,
                            name: functionName,
                            content: toolResult
                        });
                    }

                    // Call AI again with tool results
                    result = await AIService.chat({
                        provider: providerId,
                        apiKey: apiKey,
                        model: model,
                        mode: 'auto',
                        azureEndpoint: providerConfig.azureEndpoint || '',
                        azureDeployment: providerConfig.azureDeployment || '',
                        tools: tools
                    }, messages);
                }

                if (!result.error && result.content) {
                    // Record token usage
                    const tokensUsed = result.tokensUsed || null;
                    await TokenUsageService.recordUsage(
                        botId,
                        providerId,
                        providerConfig.label || providerId,
                        tokensUsed,
                        mode,
                        model,
                        message.author.id,
                        message.author.username
                    );
                    // Log token usage to Bot Logs
                    this.addBotLog(botId, 'AI', `🪙 Token Usage: ${tokensUsed !== null ? tokensUsed.toLocaleString() + ' tokens' : 'N/A'} | Provider: ${providerId} | Model: ${model}`, {
                        user: message.author.username,
                        channel: message.channel.id,
                        details: { tokensUsed, provider: providerId, model, mode }
                    });

                    // Save training example if training mode active
                    if (trainingStatus.isTrainingActive) {
                        try {
                            await TrainingService.saveExample(botId, message.content, result.content, {
                                userId: message.author.id,
                                userName: message.author.username,
                                channelId: message.channel.id
                            });
                            this.addBotLog(botId, 'AI', `📚 Training: Learned example #${trainingStatus.totalExamples + 1}`, {
                                user: message.author.username
                            });

                            // Extract knowledge from conversation
                            const knowledgeEntries = await KnowledgeService.extractKnowledge(
                                message.content,
                                result.content,
                                config
                            );
                            if (knowledgeEntries.length > 0) {
                                await KnowledgeService.saveKnowledge(botId, knowledgeEntries);
                                this.addBotLog(botId, 'AI', `🧠 Knowledge: Learned ${knowledgeEntries.length} new fact(s)`, {
                                    user: message.author.username,
                                    details: { facts: knowledgeEntries.map(k => k.key) }
                                });
                            }
                        } catch (e) {
                            console.error('[BotRuntime] Error saving training example:', e);
                        }
                    }

                    // Split long responses
                    const chunks = result.content.match(/[\s\S]{1,1900}/g) || [result.content];
                    for (const chunk of chunks) {
                        await message.reply(chunk);
                    }
                } else {
                    await message.reply(`❌ ${result.error || 'Failed to get AI response'}`);
                }
            }

        } catch (error) {
            console.error(`[BotRuntime] Error handling public AI ${mode} message:`, error);
            await message.reply('❌ An error occurred');
        }
    }

    static async handleAIStartChat(botId: string, interaction: Interaction, client: Client) {
        if (!interaction.isButton()) return;

        try {
            await interaction.deferReply({ flags: 64 });

            // Get bot config
            const bot = await db.select().from(bots).where(eq(bots.id, botId));
            if (!bot[0]) {
                await interaction.editReply({ content: '❌ Bot not found' });
                return;
            }

            const rawConfig = bot[0].config;
            const config = typeof rawConfig === 'string' ? JSON.parse(rawConfig || '{}') : (rawConfig || {});
            const aiConfig = config.ai || {};

            // Get providers array
            const providers = aiConfig.providers || [];
            if (providers.length === 0) {
                await interaction.editReply({ content: '❌ No AI providers configured. Add AI Provider nodes in Studio.' });
                return;
            }

            // Provider from dropdown selection or first configured
            const provider = aiConfig.defaultProvider || providers[0]?.id || 'gemini';
            const mode = aiConfig.defaultMode || 'auto';
            // Model only used if mode is not auto, otherwise let AI auto-select
            const model = mode !== 'auto' ? (aiConfig.defaultModel || '') : '';

            console.log(`[BotRuntime] Start Chat - config: defaultProvider=${aiConfig.defaultProvider}, defaultMode=${aiConfig.defaultMode}, defaultModel=${aiConfig.defaultModel}`);
            console.log(`[BotRuntime] Start Chat - Using: Provider=${provider}, Mode=${mode}, Model=${model || 'auto'}`);

            // Create private thread for AI chat
            const channel = interaction.channel as TextChannel;
            if (!channel || channel.type !== ChannelType.GuildText) {
                await interaction.editReply({ content: '❌ Cannot create AI room in this channel' });
                return;
            }

            const thread = await channel.threads.create({
                name: `🤖 AI Chat - ${interaction.user.displayName}`,
                type: ChannelType.PrivateThread,
                reason: 'AI Chat Session'
            });

            // Add user to thread
            await thread.members.add(interaction.user.id);

            // Create session in database
            const sessionId = randomUUID();
            await db.insert(aiSessions).values({
                id: sessionId,
                botId,
                threadId: thread.id,
                channelId: channel.id,
                userId: interaction.user.id,
                aiProvider: provider,
                aiMode: mode,
                aiModel: model,
                conversationHistory: JSON.stringify([]),
                status: 'active'
            });

            // Send welcome embed with settings dropdowns + close button
            const providerInfo = AIService.getProviders().find((p: { id: string; name: string }) => p.id === provider);
            const modeInfo = AIService.getModes().find((m: { id: string; name: string }) => m.id === mode);
            const allModes = AIService.getModes();
            const allProvidersMeta = AIService.getProviders();

            // Get configured modes for selected provider
            const selectedProviderConfig = providers.find((p: any) => p.id === provider);
            const configuredModes: any[] = [];
            const autoMode = allModes.find((m: { id: string }) => m.id === 'auto');
            if (autoMode) configuredModes.push(autoMode);

            // Check both new format (modeX boolean) and old format (models.X)
            if (selectedProviderConfig) {
                const fetchedModels = selectedProviderConfig.fetchedModels || [];
                const hasFetchedModels = Array.isArray(fetchedModels) && fetchedModels.length > 0;

                for (const m of allModes.filter((m: { id: string }) => m.id !== 'auto')) {
                    // New format: modeChat: "true", modeCode: "true", etc.
                    const modeKey = `mode${m.id.charAt(0).toUpperCase() + m.id.slice(1)}`;
                    const isModeEnabled = selectedProviderConfig[modeKey] === true || selectedProviderConfig[modeKey] === 'true';
                    // Old format: models.chat, models.code, etc.
                    const hasModel = selectedProviderConfig.models?.[m.id];

                    // Check if fetchedModels has models for this mode
                    const hasModelsForMode = hasFetchedModels
                        ? fetchedModels.some((fm: any) => fm.modes?.includes(m.id))
                        : true;

                    if ((isModeEnabled || hasModel) && hasModelsForMode) {
                        configuredModes.push(m);
                    }
                }
            }

            // Build available providers list
            const availableProviders = providers.map((cp: any) => {
                const meta = allProvidersMeta.find((p: { id: string }) => p.id === cp.id);
                return { id: cp.id, name: meta?.name || cp.id };
            });

            const embed = new EmbedBuilder()
                .setColor(0x10B981)
                .setTitle('🤖 AI Chat Room')
                .setDescription(mode === 'auto'
                    ? `Welcome <@${interaction.user.id}>! Start chatting - AI will detect your intent.\n\n**Provider:** ${providerInfo?.name || provider}\n**Mode:** Auto (detects intent)`
                    : `Welcome <@${interaction.user.id}>! Start chatting.\n\n**Provider:** ${providerInfo?.name || provider}\n**Mode:** ${modeInfo?.name || mode}`)
                .setFooter({ text: `Session ID: ${sessionId.slice(0, 8)} • Use dropdowns below to change settings` })
                .setTimestamp();

            // Provider dropdown
            const providerSelect = new StringSelectMenuBuilder()
                .setCustomId(`set_provider_${sessionId}`)
                .setPlaceholder('🔧 Change Provider')
                .addOptions(
                    availableProviders.slice(0, 25).map((p: { id: string; name: string }) => ({
                        label: p.name,
                        value: p.id,
                        default: p.id === provider
                    }))
                );

            // Mode dropdown
            const modeSelect = new StringSelectMenuBuilder()
                .setCustomId(`set_mode_${sessionId}`)
                .setPlaceholder('🎯 Change Mode')
                .addOptions(
                    configuredModes.slice(0, 25).map((m: { id: string; name: string; description: string; icon: string }) => ({
                        label: `${m.icon} ${m.name}`,
                        value: m.id,
                        description: m.description.slice(0, 100),
                        default: m.id === mode
                    }))
                );

            const components: any[] = [
                new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(providerSelect),
                new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(modeSelect)
            ];

            // Model dropdown only for non-auto modes - use fetchedModels if available
            if (mode !== 'auto') {
                const providerConf = providers.find((p: any) => p.id === provider);
                const fetchedModels = providerConf?.fetchedModels || [];
                let modeModels: string[] = [];

                if (Array.isArray(fetchedModels) && fetchedModels.length > 0) {
                    // Deduplicate by model ID to avoid Discord API error
                    const seenIds = new Set<string>();
                    modeModels = fetchedModels
                        .filter((m: any) => m.modes?.includes(mode))
                        .map((m: any) => m.id || m.name)
                        .filter((id: string) => {
                            if (seenIds.has(id)) return false;
                            seenIds.add(id);
                            return true;
                        });
                } else {
                    modeModels = AIService.getModels(provider, mode);
                }

                if (modeModels.length > 0) {
                    // Discord allows up to 25 options, reserve 1 for custom model
                    const modelOptions = modeModels.slice(0, 24).map((model: string, idx: number) => ({
                        label: model.length > 100 ? model.slice(0, 97) + '...' : model,
                        value: model.length > 100 ? model.slice(0, 100) : model,
                        default: idx === 0
                    }));
                    modelOptions.push({
                        label: '✏️ Custom Model...',
                        value: '__custom_model__',
                        default: false
                    });
                    const modelSelect = new StringSelectMenuBuilder()
                        .setCustomId(`set_model_${sessionId}`)
                        .setPlaceholder('🤖 Select Model (optional)')
                        .addOptions(modelOptions);
                    components.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(modelSelect));
                }
            }

            // Buttons row (Custom Model + Close)
            const buttonRow = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`set_custom_model_${sessionId}`)
                        .setLabel('Custom Model')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('✏️'),
                    new ButtonBuilder()
                        .setCustomId(`ai_close_${sessionId}`)
                        .setLabel('Close Room')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🔒')
                );
            components.push(buttonRow);

            await thread.send({ embeds: [embed], components });

            // Reset config to defaults for next user
            config.ai.defaultProvider = providers[0]?.id || 'gemini';
            config.ai.defaultMode = 'auto';
            config.ai.defaultModel = '';
            await db.update(bots)
                .set({ config: JSON.stringify(config), updatedAt: new Date() })
                .where(eq(bots.id, botId));

            // Update the /aichannel embed back to defaults (refresh it)
            if (config.ai.uiMessageId && config.ai.uiChannelId) {
                try {
                    const uiChannel = interaction.guild?.channels.cache.get(config.ai.uiChannelId) as TextChannel;
                    if (uiChannel) {
                        const uiMessage = await uiChannel.messages.fetch(config.ai.uiMessageId).catch(() => null);
                        if (uiMessage) {
                            const firstProvider = providers[0];
                            const firstProviderInfo = allProvidersMeta.find((p: { id: string }) => p.id === firstProvider?.id);

                            // Reset embed to show first provider and auto mode
                            const resetEmbed = new EmbedBuilder()
                                .setColor(0x10B981)
                                .setTitle('🤖 AI Assistant')
                                .setDescription(`**Provider:** ${firstProviderInfo?.name || firstProvider?.id || 'Not configured'}\n**Mode:** Auto (detects intent)\n**Available Modes:** ${configuredModes.map((m: any) => m.name).join(', ')}\n\nClick Start Chat to begin!`)
                                .setFooter({ text: `${providers.length} provider(s) configured` })
                                .setTimestamp();

                            // Reset dropdowns to defaults
                            const resetProviderSelect = new StringSelectMenuBuilder()
                                .setCustomId('ai_select_provider')
                                .setPlaceholder('🔧 Select AI Provider')
                                .addOptions(
                                    availableProviders.slice(0, 25).map((p: { id: string; name: string }, idx: number) => ({
                                        label: p.name,
                                        value: p.id,
                                        default: idx === 0
                                    }))
                                );

                            const resetModeSelect = new StringSelectMenuBuilder()
                                .setCustomId('ai_select_mode')
                                .setPlaceholder('🎯 Select AI Mode')
                                .addOptions(
                                    configuredModes.slice(0, 25).map((m: { id: string; name: string; description: string; icon: string }, idx: number) => ({
                                        label: `${m.icon} ${m.name}`,
                                        value: m.id,
                                        description: m.description?.slice(0, 100),
                                        default: m.id === 'auto'
                                    }))
                                );

                            const resetStartButton = new ButtonBuilder()
                                .setCustomId('ai_start_chat')
                                .setLabel('Start Chat')
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji('🚀');

                            const resetComponents = [
                                new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(resetProviderSelect),
                                new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(resetModeSelect),
                                new ActionRowBuilder<ButtonBuilder>().addComponents(resetStartButton)
                            ];

                            await uiMessage.edit({ embeds: [resetEmbed], components: resetComponents });
                        }
                    }
                } catch (e) {
                    console.log('[BotRuntime] Could not reset /aichannel embed:', e);
                }
            }

            await interaction.editReply({ content: `✅ AI Chat Room created! Check <#${thread.id}>` });
            // Auto-delete after 5 seconds
            setTimeout(async () => { try { await interaction.deleteReply(); } catch { } }, 5000);

        } catch (error) {
            console.error('[BotRuntime] Error starting AI chat:', error);
            await interaction.editReply({ content: '❌ Failed to create AI room' });
        }
    }

    // Handle AI provider/mode select menu
    static async handleAISelectMenu(botId: string, interaction: Interaction) {
        if (!interaction.isStringSelectMenu()) return;

        try {
            // Defer update immediately to prevent timeout
            await interaction.deferUpdate();

            const { customId, values } = interaction;
            const selectedValue = values[0];

            // Get bot config
            const bot = await db.select().from(bots).where(eq(bots.id, botId));
            if (!bot[0]) {
                await interaction.followUp({ content: '❌ Bot not found', flags: 64 });
                return;
            }

            const rawConfig = bot[0].config;
            const config = typeof rawConfig === 'string' ? JSON.parse(rawConfig || '{}') : (rawConfig || {});
            config.ai = config.ai || {};

            if (customId === 'ai_select_provider') {
                config.ai.defaultProvider = selectedValue;
                config.ai.defaultMode = 'auto'; // Reset to auto when provider changes

                // Get configured providers
                const configuredProviders = config.ai.providers || [];
                const selectedProvider = configuredProviders.find((p: any) => p.id === selectedValue);
                const allProvidersMeta = AIService.getProviders();
                const providerInfo = allProvidersMeta.find((p: { id: string; name: string }) => p.id === selectedValue);

                // Get available modes for the SELECTED provider
                const allModes = AIService.getModes();
                const configuredModes: any[] = [];

                // Auto mode always available
                const autoMode = allModes.find((m: { id: string }) => m.id === 'auto');
                if (autoMode) configuredModes.push(autoMode);

                // Add modes that are enabled in the SELECTED provider
                // Check both old format (models.X) and new format (modeX boolean)
                if (selectedProvider) {
                    const fetchedModels = selectedProvider.fetchedModels || [];
                    const hasFetchedModels = Array.isArray(fetchedModels) && fetchedModels.length > 0;

                    for (const mode of allModes.filter((m: { id: string }) => m.id !== 'auto')) {
                        // New format: modeChat: "true", modeCode: "true", etc.
                        const modeKey = `mode${mode.id.charAt(0).toUpperCase() + mode.id.slice(1)}`;
                        const isModeEnabled = selectedProvider[modeKey] === true || selectedProvider[modeKey] === 'true';
                        // Old format: models.chat, models.code, etc.
                        const hasModel = selectedProvider.models?.[mode.id];

                        // Check if fetchedModels has models for this mode
                        const hasModelsForMode = hasFetchedModels
                            ? fetchedModels.some((m: any) => m.modes?.includes(mode.id))
                            : true;

                        if ((isModeEnabled || hasModel) && hasModelsForMode) {
                            configuredModes.push(mode);
                        }
                    }
                }

                // Update the embed message with new mode dropdown
                const message = interaction.message;
                if (message) {
                    // Build available providers list with names
                    const availableProviders = configuredProviders.map((cp: any) => {
                        const meta = allProvidersMeta.find((p: { id: string }) => p.id === cp.id);
                        return { id: cp.id, name: meta?.name || cp.id };
                    });

                    const modeList = configuredModes.map((m: { name: string }) => m.name).join(', ');

                    // Create updated embed
                    const embed = new EmbedBuilder()
                        .setColor(0x10B981)
                        .setTitle('🤖 AI Assistant')
                        .setDescription(`**Provider:** ${providerInfo?.name || selectedValue}\n**Mode:** Auto (detects intent)\n**Available Modes:** ${modeList}\n\nClick Start Chat to begin!`)
                        .setFooter({ text: `${availableProviders.length} provider(s) configured` })
                        .setTimestamp();

                    // Provider dropdown (shows all configured providers)
                    const providerSelect = new StringSelectMenuBuilder()
                        .setCustomId('ai_select_provider')
                        .setPlaceholder('🔧 Select AI Provider')
                        .addOptions(
                            availableProviders.slice(0, 25).map((p: { id: string; name: string }) => ({
                                label: p.name,
                                value: p.id,
                                description: `Use ${p.name}`,
                                default: p.id === selectedValue
                            }))
                        );

                    // Mode dropdown (shows only modes for SELECTED provider, auto is default)
                    const modeSelect = new StringSelectMenuBuilder()
                        .setCustomId('ai_select_mode')
                        .setPlaceholder('🎯 Select AI Mode')
                        .addOptions(
                            configuredModes.slice(0, 25).map((m: { id: string; name: string; description: string; icon: string }) => ({
                                label: `${m.icon} ${m.name}`,
                                value: m.id,
                                description: m.description.slice(0, 100),
                                default: m.id === 'auto'
                            }))
                        );

                    // Start Chat button
                    const startButton = new ButtonBuilder()
                        .setCustomId('ai_start_chat')
                        .setLabel('Start Chat')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🚀');

                    // Build action rows - NO model dropdown for auto mode
                    const row1 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(providerSelect);
                    const row2 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(modeSelect);
                    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(startButton);

                    const components: any[] = [row1, row2, buttonRow];

                    // Update the original message directly (not via editReply which targets deferred response)
                    await message.edit({
                        embeds: [embed],
                        components: components
                    });
                } else {
                    await interaction.followUp({ content: `✅ Selected provider: **${providerInfo?.name || selectedValue}**`, flags: 64 });
                    this.autoDeleteReply(interaction);
                }
            } else if (customId === 'ai_select_mode') {
                config.ai.defaultMode = selectedValue;
                const modeInfo = AIService.getModes().find((m: { id: string; name: string }) => m.id === selectedValue);

                // Dynamically update embed with/without model dropdown based on mode
                const message = interaction.message;
                if (message) {
                    const currentProvider = config.ai.defaultProvider || config.ai.providers?.[0]?.id;
                    const allProvidersMeta = AIService.getProviders();
                    const configuredProviders = config.ai.providers || [];
                    const allModes = AIService.getModes();

                    // Get configured modes for current provider (support both modeX and old models format)
                    const selectedProviderConfig = configuredProviders.find((p: any) => p.id === currentProvider);
                    const configuredModes: any[] = [];
                    const autoMode = allModes.find((m: { id: string }) => m.id === 'auto');
                    if (autoMode) configuredModes.push(autoMode);
                    if (selectedProviderConfig) {
                        const fetchedModels = selectedProviderConfig.fetchedModels || [];
                        const hasFetchedModels = Array.isArray(fetchedModels) && fetchedModels.length > 0;

                        for (const mode of allModes.filter((m: { id: string }) => m.id !== 'auto')) {
                            // New format: modeChat: "true", modeCode: "true", etc.
                            const modeKey = `mode${mode.id.charAt(0).toUpperCase() + mode.id.slice(1)}`;
                            const isModeEnabled = selectedProviderConfig[modeKey] === true || selectedProviderConfig[modeKey] === 'true';
                            // Old format: models.chat, models.code, etc.
                            const hasModel = selectedProviderConfig.models?.[mode.id];

                            // Check if fetchedModels has models for this mode
                            const hasModelsForMode = hasFetchedModels
                                ? fetchedModels.some((m: any) => m.modes?.includes(mode.id))
                                : true;

                            if ((isModeEnabled || hasModel) && hasModelsForMode) {
                                configuredModes.push(mode);
                            }
                        }
                    }

                    // Build providers list
                    const availableProviders = configuredProviders.map((cp: any) => {
                        const meta = allProvidersMeta.find((p: { id: string }) => p.id === cp.id);
                        return { id: cp.id, name: meta?.name || cp.id };
                    });
                    const providerInfo = allProvidersMeta.find((p: { id: string }) => p.id === currentProvider);

                    // Create updated embed
                    const embed = new EmbedBuilder()
                        .setColor(0x10B981)
                        .setTitle('🤖 AI Assistant')
                        .setDescription(selectedValue === 'auto'
                            ? `**Provider:** ${providerInfo?.name || currentProvider}\n**Mode:** Auto (will detect intent)\n\nClick Start Chat to begin!`
                            : `**Provider:** ${providerInfo?.name || currentProvider}\n**Mode:** ${modeInfo?.name || selectedValue}\n\nSelect model (optional), then Start Chat!`)
                        .setFooter({ text: `${availableProviders.length} provider(s) configured` })
                        .setTimestamp();

                    // Provider dropdown
                    const providerSelect = new StringSelectMenuBuilder()
                        .setCustomId('ai_select_provider')
                        .setPlaceholder('🔧 Select AI Provider')
                        .addOptions(
                            availableProviders.slice(0, 25).map((p: { id: string; name: string }) => ({
                                label: p.name,
                                value: p.id,
                                description: `Use ${p.name}`,
                                default: p.id === currentProvider
                            }))
                        );

                    // Mode dropdown
                    const modeSelect = new StringSelectMenuBuilder()
                        .setCustomId('ai_select_mode')
                        .setPlaceholder('🎯 Select AI Mode')
                        .addOptions(
                            configuredModes.slice(0, 25).map((m: { id: string; name: string; description: string; icon: string }) => ({
                                label: `${m.icon} ${m.name}`,
                                value: m.id,
                                description: m.description.slice(0, 100),
                                default: m.id === selectedValue
                            }))
                        );

                    // Start Chat button
                    const startButton = new ButtonBuilder()
                        .setCustomId('ai_start_chat')
                        .setLabel('Start Chat')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🚀');

                    // Build rows - model dropdown only for non-auto modes
                    const row1 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(providerSelect);
                    const row2 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(modeSelect);
                    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(startButton);

                    const components: any[] = [row1, row2];

                    // Add model dropdown only if mode is NOT auto - use fetchedModels if available
                    if (selectedValue !== 'auto') {
                        const providerConfig = configuredProviders.find((p: any) => p.id === currentProvider);
                        const fetchedModels = providerConfig?.fetchedModels || [];
                        let modeModels: string[] = [];

                        if (Array.isArray(fetchedModels) && fetchedModels.length > 0) {
                            // Deduplicate by model ID to avoid Discord API error
                            const seenIds = new Set<string>();
                            modeModels = fetchedModels
                                .filter((m: any) => m.modes?.includes(selectedValue))
                                .map((m: any) => m.id || m.name)
                                .filter((id: string) => {
                                    if (seenIds.has(id)) return false;
                                    seenIds.add(id);
                                    return true;
                                });
                            console.log(`[BotRuntime] Mode change - using ${modeModels.length} fetchedModels for ${selectedValue}`);
                        } else {
                            modeModels = AIService.getModels(currentProvider, selectedValue);
                            console.log(`[BotRuntime] Mode change - getModels(${currentProvider}, ${selectedValue}):`, modeModels);
                        }

                        if (modeModels.length > 0) {
                            const modelOptions = modeModels.slice(0, 24).map((model: string, idx: number) => ({
                                label: model.length > 25 ? model.slice(0, 22) + '...' : model,
                                value: model,
                                description: idx === 0 ? '⭐ Recommended' : undefined,
                                default: idx === 0
                            }));
                            modelOptions.push({
                                label: '✏️ Custom Model...',
                                value: '__custom_model__',
                                description: 'Enter any model name',
                                default: false
                            });
                            const modelSelect = new StringSelectMenuBuilder()
                                .setCustomId('ai_select_model')
                                .setPlaceholder('🤖 Select AI Model (optional)')
                                .addOptions(modelOptions);
                            components.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(modelSelect));
                        }
                    }
                    components.push(buttonRow);

                    await message.edit({
                        embeds: [embed],
                        components: components
                    });
                } else {
                    const followUpMsg = await interaction.followUp({ content: `✅ Selected mode: **${modeInfo?.name || selectedValue}**` });
                    this.autoDeleteMessage(followUpMsg);
                }
            } else if (customId === 'ai_select_model') {
                if (selectedValue === '__custom_model__') {
                    // Show message that custom model feature is available via /set in chat
                    const customModelMsg = await interaction.followUp({
                        content: `💡 To use a custom model, start a chat first, then use the **/set** command and click **✏️ Custom Model** button.`
                    });
                    this.autoDeleteMessage(customModelMsg);
                } else {
                    config.ai.defaultModel = selectedValue;
                    const modelMsg = await interaction.followUp({ content: `✅ Selected model: **${selectedValue}**` });
                    this.autoDeleteMessage(modelMsg);
                }
            }

            // Save config
            await db.update(bots)
                .set({ config: JSON.stringify(config), updatedAt: new Date() })
                .where(eq(bots.id, botId));

        } catch (error) {
            console.error('[BotRuntime] Error handling AI select menu:', error);
            try {
                await interaction.followUp({ content: '❌ Selection failed', flags: 64 });
            } catch { }
        }
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
