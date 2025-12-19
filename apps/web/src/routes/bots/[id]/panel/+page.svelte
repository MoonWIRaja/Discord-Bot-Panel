<script lang="ts">
    import { page } from '$app/stores';
    import { onMount, onDestroy } from 'svelte';
    import { api } from '$lib/api';
    import { goto } from '$app/navigation';

    let id = $derived($page.params.id);
    let bot = $state<any>(null);
    let loading = $state(true);
    let botStatus = $state<'offline' | 'online' | 'starting' | 'stopping' | 'error'>('offline');
    let logs = $state<string[]>([]);
    let actionLoading = $state(false);

    // Toast notification
    let toast = $state<{ show: boolean; message: string; type: 'success' | 'error' | 'info' }>({ show: false, message: '', type: 'success' });

    function showToast(message: string, type: 'success' | 'error' | 'info' = 'success') {
        toast = { show: true, message, type };
        setTimeout(() => {
            toast = { ...toast, show: false };
        }, 3000);
    }

    async function loadBot() {
        if (!id) return;
        try {
            bot = await api.getBot(id);
            // Get current status from database
            const statusData = await api.getBotStatus(id);
            botStatus = statusData.status || 'offline';
            loading = false;
            addLog(`[System] Bot status: ${botStatus}`);
        } catch (e) {
            console.error("Failed to load bot", e);
            loading = false;
        }
    }

    async function startBot() {
        if (!id) return;
        actionLoading = true;
        addLog('[System] Starting bot...');
        botStatus = 'starting';
        
        try {
            await api.startBot(id);
            addLog('[System] Connecting to Discord gateway...');
            addLog('[System] Bot is now online!');
            addLog(`[Ready] Logged in as ${bot?.name || 'Bot'}`);
            botStatus = 'online';
            showToast('Bot started successfully!', 'success');
        } catch (e: any) {
            addLog(`[Error] Failed to start bot: ${e.message}`);
            botStatus = 'offline';
            showToast(e.message || 'Failed to start bot', 'error');
        } finally {
            actionLoading = false;
        }
    }

    async function stopBot() {
        if (!id) return;
        actionLoading = true;
        addLog('[System] Stopping bot...');
        botStatus = 'stopping';
        
        try {
            await api.stopBot(id);
            addLog('[System] Disconnected from Discord');
            addLog('[System] Bot is now offline');
            botStatus = 'offline';
            showToast('Bot stopped', 'info');
        } catch (e: any) {
            addLog(`[Error] Failed to stop bot: ${e.message}`);
            botStatus = 'online';
            showToast(e.message || 'Failed to stop bot', 'error');
        } finally {
            actionLoading = false;
        }
    }

    async function restartBot() {
        if (!id) return;
        actionLoading = true;
        addLog('[System] Restarting bot...');
        botStatus = 'stopping';
        
        try {
            addLog('[System] Stopping...');
            botStatus = 'starting';
            addLog('[System] Reconnecting to Discord...');
            await api.restartBot(id);
            addLog('[System] Bot restarted successfully!');
            addLog(`[Ready] Logged in as ${bot?.name || 'Bot'}`);
            botStatus = 'online';
            showToast('Bot restarted successfully!', 'success');
        } catch (e: any) {
            addLog(`[Error] Failed to restart bot: ${e.message}`);
            botStatus = 'offline';
            showToast(e.message || 'Failed to restart bot', 'error');
        } finally {
            actionLoading = false;
        }
    }

    function addLog(message: string) {
        const timestamp = new Date().toLocaleTimeString();
        logs = [...logs, `[${timestamp}] ${message}`];
    }

    function clearLogs() {
        logs = [];
        addLog('[System] Logs cleared');
    }

    function goBack() {
        goto(`/bots/${id}/studio`);
    }

    onMount(() => {
        loadBot();
        addLog('[System] Panel initialized');
        addLog('[System] Loading bot status...');
    });
</script>

<div class="h-screen flex flex-col bg-dark-base font-display text-white">
    <!-- Header -->
    <header class="h-14 bg-dark-surface border-b border-dark-border flex items-center justify-between px-4 shrink-0">
        <div class="flex items-center gap-3">
            <button onclick={goBack} class="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors">
                <span class="material-symbols-outlined">arrow_back</span>
            </button>
            <div class="h-6 w-px bg-dark-border"></div>
            <h1 class="text-white font-bold text-lg">{bot?.name || 'Loading...'} Panel</h1>
            
            <!-- Status Badge -->
            <div class="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold
                {botStatus === 'online' ? 'bg-green-500/10 text-green-400' : ''}
                {botStatus === 'offline' ? 'bg-gray-500/10 text-gray-400' : ''}
                {botStatus === 'starting' ? 'bg-amber-500/10 text-amber-400' : ''}
                {botStatus === 'stopping' ? 'bg-red-500/10 text-red-400' : ''}
            ">
                <span class="size-2 rounded-full animate-pulse
                    {botStatus === 'online' ? 'bg-green-400' : ''}
                    {botStatus === 'offline' ? 'bg-gray-400' : ''}
                    {botStatus === 'starting' ? 'bg-amber-400' : ''}
                    {botStatus === 'stopping' ? 'bg-red-400' : ''}
                "></span>
                {botStatus.charAt(0).toUpperCase() + botStatus.slice(1)}
            </div>
        </div>
        <div class="flex items-center gap-3">
            <a href="/bots/{id}/studio" class="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg font-medium text-sm transition-colors">
                <span class="material-symbols-outlined text-[18px]">code</span>
                Studio
            </a>
        </div>
    </header>

    <!-- Main Content -->
    <div class="flex-1 overflow-hidden p-6 lg:p-10 space-y-6">
        <!-- Control Buttons -->
        <div class="bg-dark-surface rounded-xl border border-dark-border p-6">
            <h2 class="text-lg font-bold mb-4 flex items-center gap-2">
                <span class="material-symbols-outlined text-[20px] text-primary">settings_power</span>
                Bot Controls
            </h2>
            <div class="flex flex-wrap gap-4">
                {#if botStatus === 'offline'}
                    <button 
                        onclick={startBot}
                        disabled={actionLoading}
                        class="flex items-center gap-3 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                    >
                        {#if actionLoading}
                            <span class="size-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        {:else}
                            <span class="material-symbols-outlined">play_arrow</span>
                        {/if}
                        Start Bot
                    </button>
                {:else if botStatus === 'online'}
                    <button 
                        onclick={stopBot}
                        disabled={actionLoading}
                        class="flex items-center gap-3 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                    >
                        {#if actionLoading}
                            <span class="size-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        {:else}
                            <span class="material-symbols-outlined">stop</span>
                        {/if}
                        Stop Bot
                    </button>
                    <button 
                        onclick={restartBot}
                        disabled={actionLoading}
                        class="flex items-center gap-3 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                    >
                        {#if actionLoading}
                            <span class="size-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        {:else}
                            <span class="material-symbols-outlined">refresh</span>
                        {/if}
                        Restart Bot
                    </button>
                {:else}
                    <div class="flex items-center gap-3 px-6 py-3 bg-white/5 text-gray-400 rounded-xl">
                        <span class="size-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
                        {botStatus === 'starting' ? 'Starting...' : 'Stopping...'}
                    </div>
                {/if}
            </div>
        </div>

        <!-- Logs -->
        <div class="bg-dark-surface rounded-xl border border-dark-border flex flex-col h-[calc(100%-180px)]">
            <div class="flex items-center justify-between p-4 border-b border-dark-border">
                <h2 class="text-lg font-bold flex items-center gap-2">
                    <span class="material-symbols-outlined text-[20px] text-green-400">terminal</span>
                    Bot Logs
                </h2>
                <button onclick={clearLogs} class="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg text-sm transition-colors">
                    <span class="material-symbols-outlined text-[16px]">delete_sweep</span>
                    Clear
                </button>
            </div>
            <div class="flex-1 overflow-y-auto p-4 font-mono text-sm bg-[#0a0a0a] rounded-b-xl">
                {#if logs.length === 0}
                    <p class="text-gray-600">No logs yet...</p>
                {:else}
                    {#each logs as log}
                        <div class="py-0.5 
                            {log.includes('[Error]') ? 'text-red-400' : ''}
                            {log.includes('[System]') ? 'text-blue-400' : ''}
                            {log.includes('[Ready]') ? 'text-green-400' : ''}
                            {log.includes('[Warning]') ? 'text-amber-400' : ''}
                            {!log.includes('[Error]') && !log.includes('[System]') && !log.includes('[Ready]') && !log.includes('[Warning]') ? 'text-gray-400' : ''}
                        ">
                            {log}
                        </div>
                    {/each}
                {/if}
            </div>
        </div>
    </div>
</div>

<!-- Toast Notification -->
{#if toast.show}
    <div 
        class="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border
            {toast.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : ''}
            {toast.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' : ''}
            {toast.type === 'info' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : ''}
        "
    >
        <span class="material-symbols-outlined text-[20px]">
            {toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : 'info'}
        </span>
        <span class="font-medium text-sm">{toast.message}</span>
        <button onclick={() => toast.show = false} class="ml-2 hover:opacity-70">
            <span class="material-symbols-outlined text-[18px]">close</span>
        </button>
    </div>
{/if}

<style>
    /* Custom scrollbar for logs */
    .font-mono::-webkit-scrollbar {
        width: 8px;
    }
    .font-mono::-webkit-scrollbar-track {
        background: transparent;
    }
    .font-mono::-webkit-scrollbar-thumb {
        background: #333;
        border-radius: 4px;
    }
    .font-mono::-webkit-scrollbar-thumb:hover {
        background: #444;
    }
</style>
