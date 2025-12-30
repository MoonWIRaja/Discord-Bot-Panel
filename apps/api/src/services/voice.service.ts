import {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    entersState,
    type VoiceConnection,
    type AudioPlayer,
    NoSubscriberBehavior,
    StreamType
} from '@discordjs/voice';
import play from 'play-dl';
import { createRequire } from 'module';
import * as child_process from 'child_process';
import type { Client, VoiceChannel, TextChannel, Guild } from 'discord.js';
import ffmpegPath from 'ffmpeg-static';
import path from 'path';
import fs from 'fs';

// Import BotRuntime for logging (lazy import to avoid circular dependency)
let BotRuntime: any = null;
const getBotRuntime = async () => {
    if (!BotRuntime) {
        const module = await import('./bot.runtime.js');
        BotRuntime = module.BotRuntime;
    }
    return BotRuntime;
};

const require = createRequire(import.meta.url);
const YTDlpWrapLib = require('yt-dlp-wrap');
const YTDlpWrap = YTDlpWrapLib.default || YTDlpWrapLib;

// Set FFmpeg path for prism-media / discord.js voice
if (ffmpegPath) {
    process.env.FFMPEG_PATH = ffmpegPath as unknown as string;
    console.log(`[VoiceService] Using FFmpeg from: ${ffmpegPath}`);
}

// Ensure yt-dlp binary exists
const YTDLP_DIR = path.resolve(process.cwd(), 'bin');
const YTDLP_PATH = path.join(YTDLP_DIR, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');

// Initialize wrapper but don't download yet (async issue)
// We cast to any to avoid TS errors since we used require
const ytDlpWrap = new (YTDlpWrap as any)(YTDLP_PATH);

// Queue item interface
interface QueueItem {
    url: string;
    title: string;
    duration: string;
    requestedBy: string;
}

// Server music queue
interface ServerQueue {
    connection: VoiceConnection;
    player: AudioPlayer;
    queue: QueueItem[];
    textChannel: TextChannel;
    volume: number;
    playing: boolean;
    loop: boolean;
    currentFFmpeg?: child_process.ChildProcess; // FFmpeg process reference
}

// Store queues per guild
const queues = new Map<string, ServerQueue>();

// Store inactivity timers per guild (5 minutes = 300000ms)
const inactivityTimers = new Map<string, NodeJS.Timeout>();
const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export class VoiceService {
    
    // Helper to log voice actions to bot logs
    static async logVoiceAction(client: Client, type: 'System' | 'Message' | 'Error', message: string) {
        try {
            const BR = await getBotRuntime();
            if (BR && BR.activeBots) {
                // Find botId from client
                let foundBotId: string | undefined;
                for (const [id, c] of BR.activeBots.entries()) {
                    if (c === client) {
                        foundBotId = id;
                        break;
                    }
                }
                if (foundBotId) {
                    BR.addBotLog(foundBotId, type, message);
                }
            }
        } catch (e) {
            // Ignore logging errors
        }
    }

    // Check and download yt-dlp if needed
    static async ensureYtDlp() {
        if (!fs.existsSync(YTDLP_DIR)) {
            fs.mkdirSync(YTDLP_DIR, { recursive: true });
        }

        if (!fs.existsSync(YTDLP_PATH)) {
            console.log('[VoiceService] Downloading yt-dlp binary... This may take a moment.');
            try {
                await YTDlpWrap.downloadFromGithub(YTDLP_PATH);
                console.log('[VoiceService] yt-dlp downloaded successfully!');
            } catch (error) {
                console.error('[VoiceService] Failed to download yt-dlp:', error);
                throw new Error('Failed to download yt-dlp binary');
            }
        }
    }

    // Join a voice channel
    static async join(channel: VoiceChannel): Promise<VoiceConnection> {
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            // @ts-ignore - adapter creator type mismatch
            adapterCreator: channel.guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: false
        });

        try {
            await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
            console.log(`[Voice] Joined channel: ${channel.name}`);
            return connection;
        } catch (error) {
            connection.destroy();
            throw error;
        }
    }

    // Get or create server queue
    static getQueue(guildId: string): ServerQueue | undefined {
        return queues.get(guildId);
    }

    // Create server queue
    static async createQueue(
        guild: Guild,
        voiceChannel: VoiceChannel,
        textChannel: TextChannel
    ): Promise<ServerQueue> {
        // Ensure yt-dlp is ready before creating queue
        await this.ensureYtDlp();

        const connection = await this.join(voiceChannel);
        
        const player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Play
            }
        });

        connection.subscribe(player);

        const serverQueue: ServerQueue = {
            connection,
            player,
            queue: [],
            textChannel,
            volume: 100,
            playing: false,
            loop: false
        };

        queues.set(guild.id, serverQueue);

        // Handle player state changes
        player.on(AudioPlayerStatus.Idle, () => {
            this.playNext(guild.id);
        });

        player.on('error', (error) => {
            console.error(`[Voice] Player error:`, error);
            this.playNext(guild.id);
        });

        // Handle connection disconnect
        connection.on(VoiceConnectionStatus.Disconnected, async () => {
            try {
                await Promise.race([
                    entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                    entersState(connection, VoiceConnectionStatus.Connecting, 5_000)
                ]);
            } catch {
                this.destroyQueue(guild.id);
            }
        });

        return serverQueue;
    }

    // Add song to queue
    static async addToQueue(guildId: string, url: string, requestedBy: string): Promise<QueueItem | null> {
        const serverQueue = queues.get(guildId);
        if (!serverQueue) return null;

        try {
            // Use play-dl for Metadata (faster than yt-dlp for just info)
            const info = await play.video_info(url);
            const item: QueueItem = {
                url,
                title: info.video_details.title || 'Unknown',
                duration: info.video_details.durationRaw || '0:00',
                requestedBy
            };

            serverQueue.queue.push(item);

            // If not playing, start playback without skipping
            if (!serverQueue.playing) {
                await this.playNext(guildId, false);
            }

            return item;
        } catch (error) {
            console.error('[Voice] Error adding to queue:', error);
            return null;
        }
    }

    // Search and add song
    static async searchAndPlay(guildId: string, query: string, requestedBy: string): Promise<QueueItem | null> {
        try {
            // Search YouTube
            const results = await play.search(query, { limit: 1 });
            if (results.length === 0) return null;

            const video = results[0];
            return await this.addToQueue(guildId, video.url, requestedBy);
        } catch (error) {
            console.error('[Voice] Search error:', error);
            return null;
        }
    }

    // Play next song in queue
    static async playNext(guildId: string, skipCurrent: boolean = true): Promise<void> {
        const serverQueue = queues.get(guildId);
        if (!serverQueue) return;

        // Skip/Shift logic
        if (skipCurrent) {
            // Loop current song if enabled (move to back)
            if (serverQueue.loop && serverQueue.queue.length > 0) {
                const current = serverQueue.queue[0];
                serverQueue.queue.push(current);
            }

            // Remove played song
            serverQueue.queue.shift();
        }

        if (serverQueue.queue.length === 0) {
            serverQueue.playing = false;

            // Start inactivity timer - disconnect after 5 minutes
            const existingTimer = inactivityTimers.get(guildId);
            if (existingTimer) clearTimeout(existingTimer);

            const timer = setTimeout(() => {
                const queue = queues.get(guildId);
                if (queue && queue.queue.length === 0) {
                    queue.textChannel.send('⏹️ No activity for 5 minutes. Disconnecting...').catch(() => { });
                    this.destroyQueue(guildId);
                }
                inactivityTimers.delete(guildId);
            }, INACTIVITY_TIMEOUT);
            inactivityTimers.set(guildId, timer);

            serverQueue.textChannel.send('📭 Queue is empty. I\'ll leave in 5 minutes if no songs are added.').catch(() => { });
            return;
        }

        const song = serverQueue.queue[0];
        
        // Clear inactivity timer when playing
        const existingTimer = inactivityTimers.get(guildId);
        if (existingTimer) {
            clearTimeout(existingTimer);
            inactivityTimers.delete(guildId);
        }
        try {
            console.log(`[Voice] Preparing to play: ${song.title}`);
            const client = serverQueue.textChannel.client as any;

            // Log to bot logs
            this.logVoiceAction(client, 'Message', `🎵 Now playing: ${song.title} [${song.duration}]`);

            // 1. Get direct stream URL using yt-dlp
            const output = await ytDlpWrap.execPromise([
                song.url,
                '-f', 'bestaudio[ext=opus]/bestaudio/best',
                '-g'
            ]);
            
            const streamUrl = output.trim();
            if (!streamUrl) throw new Error('Failed to extract stream URL');
            
            console.log(`[Voice] Stream URL extracted. Spawning FFmpeg...`);

            // 2. Spawn FFmpeg manually with robust network options
            // -reconnect 1: reconnect if connection drops
            // -reconnect_streamed 1: allow reconnecting streamed resources
            // -reconnect_delay_max 5: max delay
            // Use -f ogg with libopus codec for proper Discord compatibility
            const ffmpegArgs = [
                '-reconnect', '1',
                '-reconnect_streamed', '1',
                '-reconnect_delay_max', '5',
                '-i', streamUrl,
                '-ac', '2',           // 2 channels (stereo)
                '-ar', '48000',       // 48kHz (required by Discord)
                '-acodec', 'libopus', // Opus codec
                '-f', 'ogg',          // Ogg container (OggOpus)
                '-application', 'audio', // Opus application type
                '-frame_duration', '20', // 20ms frames
                '-vbr', 'on',         // Variable bitrate
                '-b:a', '96k',        // 96kbps bitrate
                '-loglevel', 'error', // Only show errors
                '-'                   // Output to stdout
            ];

            const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
            console.log(`[Voice] Using FFmpeg: ${ffmpegPath}`);

            const ffmpegProcess = child_process.spawn(ffmpegPath, ffmpegArgs);

            // Store reference to kill on skip/stop
            serverQueue.currentFFmpeg = ffmpegProcess;

            // Handle FFmpeg errors
            ffmpegProcess.stderr.on('data', (data) => {
                const errorMsg = data.toString().trim();
                if (errorMsg) {
                    console.error(`[FFmpeg stderr] ${errorMsg}`);
                }
            });

            ffmpegProcess.on('error', (err) => {
                console.error('[Voice] FFmpeg process error:', err);
                const client = serverQueue.textChannel.client as any;
                if (client.logger) client.logger.log('error', `FFmpeg error: ${err.message}`);
            });

            ffmpegProcess.on('close', (code, signal) => {
                console.log(`[Voice] FFmpeg process closed with code ${code}, signal ${signal}`);
                if (code !== 0 && code !== null) {
                    console.error(`[Voice] FFmpeg exited with error code ${code}`);
                }
            });

            // Check if stdout stream is available
            if (!ffmpegProcess.stdout) {
                throw new Error('FFmpeg stdout stream is null');
            }

            // Log first data from stdout to confirm stream is working
            let dataReceived = false;
            ffmpegProcess.stdout.once('data', (chunk) => {
                dataReceived = true;
                console.log(`[Voice] FFmpeg stream started, first chunk: ${chunk.length} bytes`);
            });

            // Set a timeout to check if data is received
            setTimeout(() => {
                if (!dataReceived) {
                    console.warn('[Voice] No data received from FFmpeg after 2 seconds');
                }
            }, 2000);

            // 3. Create resource from FFmpeg stdout using OggOpus format
            const resource = createAudioResource(ffmpegProcess.stdout, {
                inputType: StreamType.OggOpus // Use OggOpus for proper decoding
            });

            // Add error handler to resource
            resource.playStream.on('error', (err) => {
                console.error('[Voice] Resource playStream error:', err);
            });

            console.log(`[Voice] Audio resource created (OggOpus format). Starting playback...`);

            serverQueue.player.play(resource);
            serverQueue.playing = true;

            // Log player state after play
            console.log(`[Voice] Player state after play(): ${serverQueue.player.state.status}`);
            
            serverQueue.textChannel.send(`🎵 Now playing: **${song.title}** [${song.duration}]`).catch(() => {});
        } catch (error: any) {
            console.error('[Voice] Playback error:', error);
            const client = serverQueue.textChannel.client as any;
            if (client.logger) client.logger.log('error', `Playback error: ${error.message}`);
            
            serverQueue.textChannel.send(`❌ Failed to play: ${song.title}`).catch(() => {});
            this.playNext(guildId, true); 
        }
    }



    // Skip current song
    static skip(guildId: string): boolean {
        const serverQueue = queues.get(guildId);
        if (!serverQueue || serverQueue.queue.length === 0) return false;
        
        serverQueue.player.stop();
        return true;
    }

    // Pause playback
    static pause(guildId: string): boolean {
        const serverQueue = queues.get(guildId);
        if (!serverQueue) return false;
        
        serverQueue.player.pause();
        return true;
    }

    // Resume playback
    static resume(guildId: string): boolean {
        const serverQueue = queues.get(guildId);
        if (!serverQueue) return false;
        
        serverQueue.player.unpause();
        return true;
    }

    // Stop and clear queue
    static stop(guildId: string): void {
        const serverQueue = queues.get(guildId);
        if (!serverQueue) return;
        
        serverQueue.queue = [];
        serverQueue.player.stop();
        this.destroyQueue(guildId);
    }

    // Get queue info
    static getQueueInfo(guildId: string): { current: QueueItem | null; queue: QueueItem[] } {
        const serverQueue = queues.get(guildId);
        if (!serverQueue) {
            return { current: null, queue: [] };
        }
        
        return {
            current: serverQueue.queue[0] || null,
            queue: serverQueue.queue.slice(1)
        };
    }

    // Destroy queue and disconnect
    static destroyQueue(guildId: string): void {
        const serverQueue = queues.get(guildId);
        if (!serverQueue) return;
        
        // Log to bot logs before destroying
        this.logVoiceAction(serverQueue.textChannel.client, 'System', `🔇 Disconnected from voice channel`);

        serverQueue.connection.destroy();
        queues.delete(guildId);
        console.log(`[Voice] Destroyed queue for guild: ${guildId}`);
    }

    // Toggle loop
    static toggleLoop(guildId: string): boolean {
        const serverQueue = queues.get(guildId);
        if (!serverQueue) return false;
        
        serverQueue.loop = !serverQueue.loop;
        return serverQueue.loop;
    }
}

export default VoiceService;
