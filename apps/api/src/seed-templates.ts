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
    nodes: string;
    edges: string;
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
        nodes: JSON.stringify([
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

await interaction.reply(\`🗑️ Removed profile: \${url}\`);`
                }
            }
        ]),
        edges: JSON.stringify([
            { id: 'e1', source: 'trigger-setchannel', target: 'code-setchannel' },
            { id: 'e2', source: 'trigger-addlive', target: 'code-addlive' },
            { id: 'e3', source: 'trigger-listlive', target: 'code-listlive' },
            { id: 'e4', source: 'trigger-removelive', target: 'code-removelive' }
        ]),
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
        nodes: JSON.stringify([
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
        ]),
        edges: JSON.stringify([
            { id: 'e1', source: 'trigger-play', target: 'code-play' },
            { id: 'e2', source: 'trigger-skip', target: 'code-skip' },
            { id: 'e3', source: 'trigger-stop', target: 'code-stop' },
            { id: 'e4', source: 'trigger-queue', target: 'code-queue' },
            { id: 'e5', source: 'trigger-pause', target: 'code-pause' },
            { id: 'e6', source: 'trigger-resume', target: 'code-resume' }
        ]),
        isDefault: true,
        downloads: 0
    },

    // ============================================
    // MOVIE BOT
    // ============================================
    {
        id: randomUUID(),
        name: 'Movie Bot',
        description: 'Search for movies, get recommendations, and watch movies together in voice chat!',
        category: 'utility',
        icon: 'movie',
        color: '#3b82f6',
        nodes: JSON.stringify([
            {
                id: 'trigger-movie',
                type: 'trigger',
                position: { x: 100, y: 50 },
                data: { 
                    label: 'Slash Command', 
                    icon: 'terminal', 
                    color: '#8b5cf6',
                    eventType: 'interactionCreate',
                    commandName: 'movie',
                    commandDescription: 'Get movie information',
                    options: [
                        { name: 'title', description: 'Movie title to search', type: 'STRING', required: true }
                    ]
                }
            },
            {
                id: 'code-movie',
                type: 'code',
                position: { x: 400, y: 50 },
                data: { 
                    label: 'Search Movie', 
                    icon: 'code', 
                    color: '#f59e0b',
                    code: `const title = interaction.options.getString('title');
await interaction.deferReply();

try {
    // Using OMDb API for movie info
    const response = await fetch(\`http://www.omdbapi.com/?t=\${encodeURIComponent(title)}&apikey=2e20b33c\`);
    const movie = await response.json();

    if (movie.Response === 'False') {
        return interaction.editReply(\`❌ Movie not found: \${title}\`);
    }

    const embed = {
        title: \`🎬 \${movie.Title} (\${movie.Year})\`,
        description: movie.Plot,
        thumbnail: { url: movie.Poster !== 'N/A' ? movie.Poster : null },
        fields: [
            { name: '⭐ Rating', value: movie.imdbRating || 'N/A', inline: true },
            { name: '🎭 Genre', value: movie.Genre || 'N/A', inline: true },
            { name: '🎬 Director', value: movie.Director || 'N/A', inline: true },
            { name: '🕐 Runtime', value: movie.Runtime || 'N/A', inline: true }
        ],
        color: 0x3b82f6,
        footer: { text: 'Use /watch to stream this movie in voice chat!' }
    };

    await interaction.editReply({ embeds: [embed] });
} catch (error) {
    await interaction.editReply('❌ Error searching for movie.');
}`
                }
            },
            {
                id: 'trigger-recommend',
                type: 'trigger',
                position: { x: 100, y: 200 },
                data: { 
                    label: 'Slash Command', 
                    icon: 'terminal', 
                    color: '#8b5cf6',
                    eventType: 'interactionCreate',
                    commandName: 'recommend',
                    commandDescription: 'Get a movie recommendation',
                    options: [
                        { name: 'genre', description: 'Genre (optional)', type: 'STRING', required: false }
                    ]
                }
            },
            {
                id: 'code-recommend',
                type: 'code',
                position: { x: 400, y: 200 },
                data: { 
                    label: 'Recommend', 
                    icon: 'code', 
                    color: '#f59e0b',
                    code: `const genre = (interaction.options.getString('genre') || 'any').toLowerCase();

const movies = {
    action: ['John Wick', 'Mad Max: Fury Road', 'The Dark Knight', 'Die Hard', 'Mission: Impossible'],
    comedy: ['Superbad', 'The Hangover', 'Step Brothers', 'Bridesmaids', 'Anchorman'],
    horror: ['Get Out', 'Hereditary', 'The Conjuring', 'A Quiet Place', 'It'],
    scifi: ['Inception', 'Interstellar', 'The Matrix', 'Blade Runner 2049', 'Dune'],
    drama: ['The Shawshank Redemption', 'Forrest Gump', 'The Godfather', 'Schindler\\'s List', 'Parasite'],
    any: ['Inception', 'The Dark Knight', 'Pulp Fiction', 'Fight Club', 'The Matrix', 'Interstellar']
};

const list = movies[genre] || movies.any;
const random = list[Math.floor(Math.random() * list.length)];

await interaction.reply(\`🎬 **Movie Recommendation** (\${genre.toUpperCase()})\\n\\n🍿 **\${random}**\\n\\nUse \\\`/movie \${random}\\\` to get more info!\\nUse \\\`/watch \${random}\\\` to stream in voice chat!\`);`
                }
            },
            {
                id: 'trigger-watch',
                type: 'trigger',
                position: { x: 100, y: 350 },
                data: { 
                    label: 'Slash Command', 
                    icon: 'terminal', 
                    color: '#8b5cf6',
                    eventType: 'interactionCreate',
                    commandName: 'watch',
                    commandDescription: 'Generate a stream link',
                    options: [
                        { name: 'title', description: 'Movie title to watch', type: 'STRING', required: true }
                    ]
                }
            },
            {
                id: 'code-watch',
                type: 'code',
                position: { x: 400, y: 350 },
                data: {
                    label: 'Watch Movie',
                    icon: 'code',
                    color: '#f59e0b',
                    code: `const title = interaction.options.getString('title');
// Generate fake stream link (or real if available)
await interaction.reply(\`🍿 Watch **\${title}** here: https://tv7.lk21official.cc/search?q=\${encodeURIComponent(title)}\\n\\n*Please share your screen to watch with friends!*\`);`
                }
            }
        ]),
        edges: JSON.stringify([
            { id: 'e1', source: 'trigger-movie', target: 'code-movie' },
            { id: 'e2', source: 'trigger-recommend', target: 'code-recommend' },
            { id: 'e3', source: 'trigger-watch', target: 'code-watch' }
        ]),
        isDefault: true,
        downloads: 0
    }
];

async function seedTemplates() {
    console.log('[Seed] Seeding default templates...');
    
    try {
        // Clear existing default templates first
        await db.delete(templates);
        
        for (const template of defaultTemplates) {
            await db.insert(templates).values(template);
            console.log(`[Seed] Added template: ${template.name}`);
        }
        console.log('[Seed] Templates seeded successfully!');
    } catch (error) {
        console.error('[Seed] Error seeding templates:', error);
    }
}

seedTemplates();
