import { db } from './db/index.js';
import { templates } from './db/schema.js';
import { randomUUID } from 'crypto';

type TemplateCategory = 'notification' | 'music' | 'utility' | 'moderation' | 'fun';

// Default templates data
const defaultTemplates: Array<{
    id: string;
    name: string;
    description: string;
    category: TemplateCategory;
    icon: string;
    color: string;
    nodes: any;
    edges: any;
    isDefault: boolean;
    downloads: number;
}> = [
    // ============================================
    // LIVE NOTIFICATION BOT
    // ============================================
    {
        id: randomUUID(),
        name: 'Live Notification Bot',
        description: 'Monitor TikTok, YouTube, and Twitch profiles. Get notified in a specific channel when they go live!',
        category: 'notification',
        icon: 'live_tv',
        color: '#ef4444',
        nodes: [
            {
                id: 'trigger-setchannel',
                type: 'trigger',
                position: { x: 100, y: 50 },
                data: { 
                    label: 'Slash Command', 
                    icon: 'terminal', 
                    color: '#8b5cf6',
                    eventType: 'interactionCreate',
                    commandName: 'setchannel',
                    commandDescription: 'Set the notification channel for live alerts',
                    options: [
                        { name: 'channel', description: 'The text channel for notifications', type: 'CHANNEL', required: true }
                    ]
                }
            },
            {
                id: 'code-setchannel',
                type: 'code',
                position: { x: 400, y: 50 },
                data: { 
                    label: 'Set Channel', 
                    icon: 'code', 
                    color: '#f59e0b',
                    code: `// Set the notification channel
const channel = interaction.options.getChannel('channel');
if (!channel || channel.type !== 0) {
    return interaction.reply({ content: '❌ Please select a text channel!', ephemeral: true });
}

// Store in bot data
client.liveConfig = client.liveConfig || {};
client.liveConfig.channelId = channel.id;
client.liveConfig.guildId = interaction.guild.id;

await client.saveConfig();
await interaction.reply(\`✅ Live notifications will be sent to <#\${channel.id}>\`);`
                }
            },
            {
                id: 'trigger-addlive',
                type: 'trigger',
                position: { x: 100, y: 200 },
                data: { 
                    label: 'Slash Command', 
                    icon: 'terminal', 
                    color: '#8b5cf6',
                    eventType: 'interactionCreate',
                    commandName: 'addlive',
                    commandDescription: 'Track a streamer on TikTok, YouTube, or Twitch',
                    options: [
                        { name: 'platform', description: 'Platform (tiktok, youtube, twitch)', type: 'STRING', required: true },
                        { name: 'url', description: 'Profile URL or Username', type: 'STRING', required: true }
                    ]
                }
            },
            {
                id: 'code-addlive',
                type: 'code',
                position: { x: 400, y: 200 },
                data: { 
                    label: 'Add Profile', 
                    icon: 'code', 
                    color: '#f59e0b',
                    code: `const platform = interaction.options.getString('platform').toLowerCase();
const url = interaction.options.getString('url');

if (!['tiktok', 'youtube', 'twitch'].includes(platform)) {
    return interaction.reply({ content: '❌ Platform must be: tiktok, youtube, or twitch', ephemeral: true });
}

client.liveProfiles = client.liveProfiles || [];
client.liveProfiles.push({ 
    platform, 
    url, 
    addedBy: interaction.user.id,
    lastLive: false
});

await client.saveConfig();
await interaction.reply(\`✅ Added \${platform} profile to monitoring: \${url}\`);`
                }
            },
            {
                id: 'trigger-listlive',
                type: 'trigger',
                position: { x: 100, y: 350 },
                data: { 
                    label: 'Slash Command', 
                    icon: 'terminal', 
                    color: '#8b5cf6',
                    eventType: 'interactionCreate',
                    commandName: 'listlive',
                    commandDescription: 'List all tracked streamers'
                }
            },
            {
                id: 'code-listlive',
                type: 'code',
                position: { x: 400, y: 350 },
                data: { 
                    label: 'List Profiles', 
                    icon: 'code', 
                    color: '#f59e0b',
                    code: `const profiles = client.liveProfiles || [];
const config = client.liveConfig || {};

if (profiles.length === 0) {
    return interaction.reply('📺 No profiles are being monitored. Use /addlive to add one!');
}

const list = profiles.map((p, i) => \`\${i+1}. [\${p.platform.toUpperCase()}] \${p.url}\`).join('\\n');
const channelInfo = config.channelId ? \`<#\${config.channelId}>\` : 'Not set (use /setchannel)';

await interaction.reply(\`📺 **Live Monitoring Status**\\n\\n**Notification Channel:** \${channelInfo}\\n\\n**Profiles:**\\n\${list}\`);`
                }
            },
            {
                id: 'trigger-removelive',
                type: 'trigger',
                position: { x: 100, y: 500 },
                data: { 
                    label: 'Slash Command', 
                    icon: 'terminal', 
                    color: '#8b5cf6',
                    eventType: 'interactionCreate',
                    commandName: 'removelive',
                    commandDescription: 'Remove a profile from monitoring',
                    options: [
                        { name: 'url', description: 'Profile URL to remove', type: 'STRING', required: true }
                    ]
                }
            },
            {
                id: 'code-removelive',
                type: 'code',
                position: { x: 400, y: 500 },
                data: { 
                    label: 'Remove Profile', 
                    icon: 'code', 
                    color: '#f59e0b',
                    code: `const url = interaction.options.getString('url');
const profiles = client.liveProfiles || [];

const index = profiles.findIndex(p => p.url === url);
if (index === -1) {
    return interaction.reply({ content: \`❌ URL not found in list: \${url}\`, ephemeral: true });
}

profiles.splice(index, 1);
client.liveProfiles = profiles;

await client.saveConfig();
await interaction.reply(\`🗑️ Removed profile: \${url}\`);`
                }
            }
        ],
        edges: [
            { id: 'e1', source: 'trigger-setchannel', target: 'code-setchannel' },
            { id: 'e2', source: 'trigger-addlive', target: 'code-addlive' },
            { id: 'e3', source: 'trigger-listlive', target: 'code-listlive' },
            { id: 'e4', source: 'trigger-removelive', target: 'code-removelive' }
        ],
        isDefault: true,
        downloads: 0
    },

    // ============================================
    // MUSIC BOT (Full Voice)
    // ============================================
    {
        id: randomUUID(),
        name: 'Music Bot',
        description: 'Full-featured music bot! Join voice channel, play from YouTube URL or search, queue, skip, pause, and more!',
        category: 'music',
        icon: 'music_note',
        color: '#22c55e',
        nodes: [
            {
                id: 'trigger-play',
                type: 'trigger',
                position: { x: 100, y: 50 },
                data: { 
                    label: 'Slash Command', 
                    icon: 'terminal', 
                    color: '#8b5cf6',
                    eventType: 'interactionCreate',
                    commandName: 'play',
                    commandDescription: 'Play a song from YouTube/Spotify',
                    options: [
                        { name: 'query', description: 'YouTube URL or Search Term', type: 'STRING', required: true }
                    ]
                }
            },
            {
                id: 'code-play',
                type: 'code',
                position: { x: 400, y: 50 },
                data: { 
                    label: 'Play Music', 
                    icon: 'code', 
                    color: '#f59e0b',
                    code: `// Import voice service (available in bot runtime)
const VoiceService = client.voiceService;
const query = interaction.options.getString('query');

// Check if user is in voice channel
const voiceChannel = interaction.member.voice?.channel;
if (!voiceChannel) {
    return interaction.reply({ content: '❌ You need to be in a voice channel!', ephemeral: true });
}

await interaction.deferReply();

// Get or create queue
let queue = VoiceService.getQueue(interaction.guild.id);
if (!queue) {
    queue = await VoiceService.createQueue(interaction.guild, voiceChannel, interaction.channel);
}

// Check if URL or search
const isUrl = query.startsWith('http');
let song;

if (isUrl) {
    song = await VoiceService.addToQueue(interaction.guild.id, query, interaction.user.tag);
} else {
    song = await VoiceService.searchAndPlay(interaction.guild.id, query, interaction.user.tag);
}

if (song) {
    await interaction.editReply(\`🎵 Added to queue: **\${song.title}** [\${song.duration}]\`);
} else {
    await interaction.editReply('❌ Could not find or play that song.');
}`
                }
            },
            {
                id: 'trigger-skip',
                type: 'trigger',
                position: { x: 100, y: 200 },
                data: { 
                    label: 'Slash Command', 
                    icon: 'terminal', 
                    color: '#8b5cf6',
                    eventType: 'interactionCreate',
                    commandName: 'skip',
                    commandDescription: 'Skip the current song'
                }
            },
            {
                id: 'code-skip',
                type: 'code',
                position: { x: 400, y: 200 },
                data: { 
                    label: 'Skip Song', 
                    icon: 'code', 
                    color: '#f59e0b',
                    code: `const VoiceService = client.voiceService;
const skipped = VoiceService.skip(interaction.guild.id);

if (skipped) {
    await interaction.reply('⏭️ Skipped to next song!');
} else {
    await interaction.reply('❌ No song is playing.');
}`
                }
            },
            {
                id: 'trigger-stop',
                type: 'trigger',
                position: { x: 100, y: 300 },
                data: { 
                    label: 'Slash Command', 
                    icon: 'terminal', 
                    color: '#8b5cf6',
                    eventType: 'interactionCreate',
                    commandName: 'stop',
                    commandDescription: 'Stop playback and leave channel'
                }
            },
            {
                id: 'code-stop',
                type: 'code',
                position: { x: 400, y: 300 },
                data: { 
                    label: 'Stop Music', 
                    icon: 'code', 
                    color: '#f59e0b',
                    code: `const VoiceService = client.voiceService;
VoiceService.stop(interaction.guild.id);
await interaction.reply('⏹️ Stopped music and left voice channel.');`
                }
            },
            {
                id: 'trigger-queue',
                type: 'trigger',
                position: { x: 100, y: 400 },
                data: { 
                    label: 'Slash Command', 
                    icon: 'terminal', 
                    color: '#8b5cf6',
                    eventType: 'interactionCreate',
                    commandName: 'queue',
                    commandDescription: 'View current music queue'
                }
            },
            {
                id: 'code-queue',
                type: 'code',
                position: { x: 400, y: 400 },
                data: { 
                    label: 'Show Queue', 
                    icon: 'code', 
                    color: '#f59e0b',
                    code: `const VoiceService = client.voiceService;
const { current, queue } = VoiceService.getQueueInfo(interaction.guild.id);

if (!current) {
    return interaction.reply('🎵 Queue is empty! Use /play to add music.');
}

let msg = \`🎵 **Now Playing:** \${current.title} [\${current.duration}]\\n\\n\`;

if (queue.length > 0) {
    msg += '**Up Next:**\\n';
    msg += queue.slice(0, 10).map((s, i) => \`\${i+1}. \${s.title} [\${s.duration}]\`).join('\\n');
    if (queue.length > 10) msg += \`\\n...and \${queue.length - 10} more\`;
} else {
    msg += '*No more songs in queue*';
}

await interaction.reply(msg);`
                }
            },
            {
                id: 'trigger-pause',
                type: 'trigger',
                position: { x: 100, y: 500 },
                data: { 
                    label: 'Slash Command', 
                    icon: 'terminal', 
                    color: '#8b5cf6',
                    eventType: 'interactionCreate',
                    commandName: 'pause',
                    commandDescription: 'Pause playback'
                }
            },
            {
                id: 'code-pause',
                type: 'code',
                position: { x: 400, y: 500 },
                data: { 
                    label: 'Pause', 
                    icon: 'code', 
                    color: '#f59e0b',
                    code: `const VoiceService = client.voiceService;
VoiceService.pause(interaction.guild.id);
await interaction.reply('⏸️ Paused. Use /resume to continue.');`
                }
            },
            {
                id: 'trigger-resume',
                type: 'trigger',
                position: { x: 700, y: 50 },
                data: { 
                    label: 'Slash Command', 
                    icon: 'terminal', 
                    color: '#8b5cf6',
                    eventType: 'interactionCreate',
                    commandName: 'resume',
                    commandDescription: 'Resume playback'
                }
            },
            {
                id: 'code-resume',
                type: 'code',
                position: { x: 1000, y: 50 },
                data: { 
                    label: 'Resume', 
                    icon: 'code', 
                    color: '#f59e0b',
                    code: `const VoiceService = client.voiceService;
VoiceService.resume(interaction.guild.id);
await interaction.reply('▶️ Resumed playback!');`
                }
            }
        ],
        edges: [
            { id: 'e1', source: 'trigger-play', target: 'code-play' },
            { id: 'e2', source: 'trigger-skip', target: 'code-skip' },
            { id: 'e3', source: 'trigger-stop', target: 'code-stop' },
            { id: 'e4', source: 'trigger-queue', target: 'code-queue' },
            { id: 'e5', source: 'trigger-pause', target: 'code-pause' },
            { id: 'e6', source: 'trigger-resume', target: 'code-resume' }
        ],
        isDefault: true,
        downloads: 0
        },
    // ============================================
        // AI ASSISTANT BOT - Multi-Provider
    // ============================================
    {
        id: randomUUID(),
        name: 'AI Assistant Bot',
        description: 'Complete AI system with Gemini AI, private rooms (/aichannel), public chat (/aichat), and image generation (/aiimage)!',
        category: 'utility',
        icon: 'smart_toy',
        color: '#10b981',
        nodes: [
            // AI Provider 1 - Gemini
            {
                id: 'ai-provider-gemini',
                type: 'aiProvider',
                position: { x: 100, y: 50 },
                data: {
                    label: 'Gemini Provider',
                    icon: 'smart_toy',
                    color: '#8b5cf6',
                    provider: 'gemini',
                    apiKey: '',
                    modeChat: true,
                    modeCode: true,
                    modeImage: true,
                    modeVision: true,
                    models: {
                        chat: 'gemini-2.0-flash-exp',
                        code: 'gemini-2.0-flash-exp',
                        image: 'imagen-3.0-generate-001',
                        vision: 'gemini-2.0-flash-exp'
                    }
                }
            },
            // /aichannel - Private AI rooms
            {
                id: 'trigger-aichannel',
                type: 'trigger',
                position: { x: 100, y: 250 },
                data: {
                    label: '/aichannel',
                    icon: 'forum',
                    color: '#06b6d4',
                    eventType: 'interactionCreate',
                    commandName: 'aichannel',
                    commandDescription: 'Set channel for private AI rooms'
                }
            },
            // /aichat - Public chat (auto mode)
            {
                id: 'trigger-aichat',
                type: 'trigger',
                position: { x: 400, y: 250 },
                data: {
                    label: '/aichat',
                    icon: 'chat',
                    color: '#10b981',
                    eventType: 'interactionCreate',
                    commandName: 'aichat',
                    commandDescription: 'Set public AI chat channel'
                }
            },
            // /aiimage - Public image (image mode)
            {
                id: 'trigger-aiimage',
                type: 'trigger',
                position: { x: 700, y: 250 },
                data: {
                    label: '/aiimage',
                    icon: 'image',
                    color: '#f59e0b',
                    eventType: 'interactionCreate',
                    commandName: 'aiimage',
                    commandDescription: 'Set public AI image channel'
                }
            },
            // /set - Settings (private room only)
            {
                id: 'trigger-set',
                type: 'trigger',
                position: { x: 100, y: 400 },
                data: {
                    label: '/set',
                    icon: 'settings',
                    color: '#8b5cf6',
                    eventType: 'interactionCreate',
                    commandName: 'set',
                    commandDescription: 'Change AI settings (private room)'
                }
            },
            // /inv - Invite user (private room only)
            {
                id: 'trigger-inv',
                type: 'trigger',
                position: { x: 400, y: 400 },
                data: {
                    label: '/inv',
                    icon: 'person_add',
                    color: '#64748b',
                    eventType: 'interactionCreate',
                    commandName: 'inv',
                    commandDescription: 'Invite user to private AI room'
                }
            }
        ],
        edges: [],
            isDefault: true,
            downloads: 0
        }
    ];

async function seedTemplates() {
    console.log('[Seed] Checking default templates...');

    try {
        // Check existing templates
        const existing = await db.select().from(templates);
        console.log(`[Seed] Found ${existing.length} existing templates`);

        // Only add templates that don't exist yet
        for (const template of defaultTemplates) {
            const exists = existing.find(t => t.name === template.name && t.isDefault);
            if (!exists) {
                await db.insert(templates).values(template);
                console.log(`[Seed] ✅ Added default template: ${template.name}`);
            } else {
                console.log(`[Seed] ⏭️  Template already exists: ${template.name}`);
            }
        }
        console.log('[Seed] Default templates ready!');
    } catch (error) {
        console.error('[Seed] Error seeding templates:', error);
    }
}

seedTemplates();
