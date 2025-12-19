<script lang="ts">
    import { page } from '$app/stores';
    import { onMount, onDestroy } from 'svelte';
    import { getSocket, connectSocket } from '$lib/socket';
    import type { Socket } from 'socket.io-client';

    let id = $derived($page.params.id);
    let logs: Array<{ timestamp: string; level: string; message: string }> = $state([]);
    let socket: Socket | null = $state(null);
    let isConnected = $state(false);
    let containerRef: HTMLDivElement;

    function addLog(log: any) {
        logs = [...logs, log];
        // Auto scroll
        if (containerRef) {
            setTimeout(() => {
                containerRef.scrollTop = containerRef.scrollHeight;
            }, 0);
        }
    }

    onMount(() => {
        const s = getSocket();
        
        if (!s || !s.connected) {
            console.log('[Logs] Socket not connected, initializing...');
            socket = connectSocket();
        } else {
            socket = s;
        }
        
        if (socket) {
            isConnected = socket.connected;

            const joinLogs = () => {
                console.log(`[Logs] Joining logs for bot ${id}`);
                socket?.emit('join-bot-logs', id);
            };

            socket.on('connect', () => {
                isConnected = true;
                joinLogs();
            });

            socket.on('disconnect', () => {
                isConnected = false;
            });

            socket.on('connect_error', (err) => {
                console.error('[Logs] Connection error:', err);
                const debugBox = document.getElementById('debug-info');
                if (debugBox) debugBox.innerHTML += `<p class="text-red-400">Error: ${err.message}</p>`;
            });

            if (socket.connected) {
                joinLogs();
            }

            socket.on('bot:log', (data) => {
                addLog(data);
            });
        }

        // Add initial system log
        addLog({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'Attaching to log stream...'
        });
    });

    onDestroy(() => {
        if (socket) {
            socket.off('bot:log');
        }
    });

    function getLevelColor(level: string) {
        switch (level) {
            case 'info': return 'text-blue-400';
            case 'warn': return 'text-amber-400';
            case 'error': return 'text-red-400';
            case 'debug': return 'text-gray-400';
            default: return 'text-slate-200';
        }
    }

    function formatTime(iso: string) {
        return new Date(iso).toLocaleTimeString([], { hour12: false });
    }
</script>

<div class="flex flex-col h-full gap-4 font-mono text-sm p-6 overflow-hidden">
    <div class="flex items-center justify-between shrink-0">
        <div>
            <h1 class="text-2xl font-bold bg-gradient-to-r from-bot-primary to-purple-400 bg-clip-text text-transparent">System Logs</h1>
            <p class="text-slate-500 text-xs">Real-time output from BotRuntime & VoiceService</p>
        </div>
        <div class="flex items-center gap-2">
            <div class="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full border border-slate-700">
                <div class="size-2 rounded-full bg-green-500 animate-pulse"></div>
                <span class="text-xs text-slate-300">Live</span>
            </div>
            <button onclick={() => logs = []} class="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors" title="Clear Logs">
                <span class="material-symbols-outlined text-[20px]">block</span>
            </button>
        </div>
    </div>

    <div bind:this={containerRef} class="flex-1 bg-[#0f0f13] rounded-xl border border-slate-800/50 p-4 overflow-y-auto font-mono scroll-smooth relative group">
        {#if logs.length === 0}
            <div class="absolute inset-0 flex flex-col items-center justify-center text-slate-600">
                <span class="material-symbols-outlined text-4xl mb-2 opacity-50">terminal</span>
                <p>Waiting for logs...</p>
                <div id="debug-info" class="mt-4 text-xs font-mono text-slate-700 bg-slate-900/50 p-2 rounded text-left">
                    <p>Debug Info:</p>
                    <p>Bot ID: {id}</p>
                    <p>Socket Connected: {isConnected ? 'Yes' : 'No'}</p>
                    <p>Socket ID: {socket?.id || 'null'}</p>
                </div>
            </div>
        {/if}

        <div class="flex flex-col gap-1">
            {#each logs as log}
                <div class="flex gap-3 hover:bg-white/5 px-2 py-0.5 rounded transition-colors break-words">
                    <span class="text-slate-500 shrink-0 select-none">[{formatTime(log.timestamp)}]</span>
                    <span class={`uppercase font-bold text-xs w-12 shrink-0 ${getLevelColor(log.level)}`}>{log.level}</span>
                    <span class="text-slate-300 flex-1 whitespace-pre-wrap">{log.message}</span>
                </div>
            {/each}
        </div>
    </div>
</div>
