<script lang="ts">
    import { page } from '$app/stores';
    import { onMount, onDestroy } from 'svelte';
    import { api } from '$lib/api';
    import { goto } from '$app/navigation';

    let id = $derived($page.params.id);
    let bot = $state<any>(null);
    let loading = $state(true);
    let botStatus = $state<'offline' | 'online' | 'starting' | 'stopping' | 'error'>('offline');
    let logs = $state<any[]>([]);
    let actionLoading = $state(false);
    let logPollInterval: any = null;

    // Token Usage State
    let tokenSummary = $state<any[]>([]);
    let tokenLogs = $state<any[]>([]);
    let tokenLimits = $state<any[]>([]);
    let selectedProvider = $state<string>('');
    let selectedDate = $state<string>(new Date().toISOString().split('T')[0]); // YYYY-MM-DD format
    let showLimitSettings = $state(false);
    let savingLimits = $state(false);

    // Current provider limits for editing
    let editLimits = $state({
        dailyLimit: 0,
        weeklyLimit: 0,
        monthlyLimit: 0,
        autoResetDaily: true,
        autoResetWeekly: true,
        autoResetMonthly: true,
        allowAdminBypass: true,
        notifyOwnerOnLimit: true,
        isEnabled: true
    });

    // Training Mode State
    let trainingStatus = $state<{ isTrainingActive: boolean; totalExamples: number; lastTrainedAt: Date | null }>({
        isTrainingActive: false,
        totalExamples: 0,
        lastTrainedAt: null
    });
    let showStartTrainingModal = $state(false);
    let showStopTrainingModal = $state(false);
    let showDeleteTrainingModal = $state(false);
    let trainingActionLoading = $state(false);

    // Fetch training status
    async function fetchTrainingStatus() {
        if (!id) return;
        try {
            const status = await api.get(`/bots/${id}/training`);
            trainingStatus = status;
        } catch (e) {
            console.error('Failed to fetch training status:', e);
        }
    }

    // Training actions
    async function startTraining() {
        if (!id) return;
        trainingActionLoading = true;
        try {
            await api.post(`/bots/${id}/training/start`);
            showToast('🧠 Training Mode Activated!', 'success');
            showStartTrainingModal = false;
            await fetchTrainingStatus();
            await fetchBotLogs();
        } catch (e: any) {
            showToast(e.message || 'Failed to start training', 'error');
        }
        trainingActionLoading = false;
    }

    async function stopTraining() {
        if (!id) return;
        trainingActionLoading = true;
        try {
            await api.post(`/bots/${id}/training/stop`);
            showToast('✅ Training Mode Stopped!', 'success');
            showStopTrainingModal = false;
            await fetchTrainingStatus();
            await fetchBotLogs();
        } catch (e: any) {
            showToast(e.message || 'Failed to stop training', 'error');
        }
        trainingActionLoading = false;
    }

    async function deleteTraining() {
        if (!id) return;
        trainingActionLoading = true;
        try {
            await api.delete(`/bots/${id}/training`);
            showToast('🗑️ Training Data Deleted!', 'success');
            showDeleteTrainingModal = false;
            await fetchTrainingStatus();
            await fetchBotLogs();
        } catch (e: any) {
            showToast(e.message || 'Failed to delete training', 'error');
        }
        trainingActionLoading = false;
    }

    // Clear AI Channel History State
    let showClearHistoryModal = $state(false);
    let clearHistoryLoading = $state(false);

    async function clearAIHistory() {
        if (!id) return;
        clearHistoryLoading = true;
        try {
            const result = await api.delete(`/bots/${id}/ai-history`);
            showToast(`🗑️ Deleted ${result.deletedCount} messages from ${result.channels?.length || 0} AI channels!`, 'success');
            showClearHistoryModal = false;
            await fetchBotLogs();
        } catch (e: any) {
            showToast(e.message || 'Failed to clear AI history', 'error');
        }
        clearHistoryLoading = false;
    }

    // Toast notification
    let toast = $state<{ show: boolean; message: string; type: 'success' | 'error' | 'info' }>({ show: false, message: '', type: 'success' });

    function showToast(message: string, type: 'success' | 'error' | 'info' = 'success') {
        toast = { show: true, message, type };
        setTimeout(() => {
            toast = { ...toast, show: false };
        }, 3000);
    }

    // Fetch bot activity logs from API
    async function fetchBotLogs() {
        if (!id) return;
        try {
            const data = await api.get(`/bots/${id}/logs?limit=200`);
            if (data.logs) {
                logs = data.logs;
            }
        } catch (e) {
            console.error('Failed to fetch bot logs:', e);
        }
    }

    // Fetch token usage data
    async function fetchTokenData() {
        if (!id) return;
        try {
            const [summaryRes, logsRes, limitsRes] = await Promise.all([
                api.getTokenUsageSummary(id),
                api.getTokenUsageLogs(id, 50),
                api.getTokenLimits(id)
            ]);
            tokenSummary = summaryRes.summary || [];
            tokenLogs = logsRes.logs || [];
            tokenLimits = limitsRes.limits || [];

            // Select first provider if none selected
            if (!selectedProvider && tokenSummary.length > 0) {
                selectedProvider = tokenSummary[0].providerId;
            }
        } catch (e) {
            console.error('Failed to fetch token data:', e);
        }
    }

    // Get current provider's summary
    function getCurrentProviderSummary() {
        return tokenSummary.find(s => s.providerId === selectedProvider) || null;
    }

    // Get current provider's limits
    function getCurrentProviderLimits() {
        return tokenLimits.find(l => l.providerId === selectedProvider) || null;
    }

    // Open limit settings
    function openLimitSettings() {
        const limits = getCurrentProviderLimits();
        if (limits) {
            editLimits = {
                dailyLimit: limits.dailyLimit || 0,
                weeklyLimit: limits.weeklyLimit || 0,
                monthlyLimit: limits.monthlyLimit || 0,
                autoResetDaily: limits.autoResetDaily ?? true,
                autoResetWeekly: limits.autoResetWeekly ?? true,
                autoResetMonthly: limits.autoResetMonthly ?? true,
                allowAdminBypass: limits.allowAdminBypass ?? true,
                notifyOwnerOnLimit: limits.notifyOwnerOnLimit ?? true,
                isEnabled: limits.isEnabled ?? true
            };
        }
        showLimitSettings = true;
    }

    // Save limit settings
    async function saveLimitSettings() {
        if (!id || !selectedProvider) return;
        savingLimits = true;
        try {
            await api.updateTokenLimits(id, selectedProvider, editLimits);
            showToast('Limits saved!', 'success');
            showLimitSettings = false;
            await fetchTokenData();
        } catch (e: any) {
            showToast(e.message || 'Failed to save limits', 'error');
        }
        savingLimits = false;
    }

    // Reset usage
    async function resetUsage(period: 'daily' | 'weekly' | 'monthly' | 'all') {
        if (!id || !selectedProvider) return;
        try {
            await api.resetTokenUsage(id, selectedProvider, period);
            showToast(`${period} usage reset!`, 'success');
            await fetchTokenData();
        } catch (e: any) {
            showToast(e.message || 'Failed to reset', 'error');
        }
    }

    // Generate proper Discord CDN avatar URL (same as dashboard)
    function getAvatarUrl(): string | null {
        if (!bot?.avatar) return null;
        if (bot.avatar.startsWith('http')) return bot.avatar;
        if (bot.clientId) {
            return `https://cdn.discordapp.com/avatars/${bot.clientId}/${bot.avatar}.png`;
        }
        return null;
    }


    async function loadBot() {
        if (!id) return;
        try {
            bot = await api.getBot(id);
            const statusData = await api.getBotStatus(id);
            botStatus = statusData.status || 'offline';
            loading = false;
            
            await fetchBotLogs();
            await fetchTokenData();
            await fetchTrainingStatus();
            addLocalLog('System', 'Panel connected');
        } catch (e) {
            console.error("Failed to load bot", e);
            loading = false;
        }
    }

    async function startBot() {
        if (!id) return;
        actionLoading = true;
        addLocalLog('System', 'Starting bot...');
        botStatus = 'starting';
        
        try {
            await api.startBot(id);
            botStatus = 'online';
            showToast('Bot started successfully!', 'success');
            await fetchBotLogs();
        } catch (e: any) {
            addLocalLog('Error', `Failed to start bot: ${e.message}`);
            botStatus = 'offline';
            showToast(e.message || 'Failed to start bot', 'error');
        } finally {
            actionLoading = false;
        }
    }

    async function stopBot() {
        if (!id) return;
        actionLoading = true;
        addLocalLog('System', 'Stopping bot...');
        botStatus = 'stopping';
        
        try {
            await api.stopBot(id);
            botStatus = 'offline';
            showToast('Bot stopped', 'info');
            await fetchBotLogs();
        } catch (e: any) {
            addLocalLog('Error', `Failed to stop bot: ${e.message}`);
            botStatus = 'online';
            showToast(e.message || 'Failed to stop bot', 'error');
        } finally {
            actionLoading = false;
        }
    }

    async function restartBot() {
        if (!id) return;
        actionLoading = true;
        addLocalLog('System', 'Restarting bot...');
        botStatus = 'stopping';
        
        try {
            botStatus = 'starting';
            await api.restartBot(id);
            botStatus = 'online';
            showToast('Bot restarted successfully!', 'success');
            await fetchBotLogs();
        } catch (e: any) {
            addLocalLog('Error', `Failed to restart bot: ${e.message}`);
            botStatus = 'offline';
            showToast(e.message || 'Failed to restart bot', 'error');
        } finally {
            actionLoading = false;
        }
    }

    function addLocalLog(type: string, message: string) {
        const entry = {
            id: `local-${Date.now()}`,
            timestamp: new Date(),
            type,
            message,
            isLocal: true
        };
        logs = [...logs, entry];
    }

    async function clearLogs() {
        if (!id) return;
        try {
            await api.delete(`/bots/${id}/logs`);
            logs = [];
            addLocalLog('System', 'Logs cleared');
        } catch (e) {
            console.error('Failed to clear logs:', e);
        }
    }

    function goBack() {
        goto(`/bots/${id}/studio`);
    }

    function formatLogTime(timestamp: any): string {
        const date = new Date(timestamp);
        return date.toLocaleTimeString();
    }

    function formatDate(timestamp: any): string {
        if (!timestamp) return 'N/A';
        return new Date(timestamp).toLocaleDateString();
    }

    // Check if date is today
    function isToday(timestamp: any): boolean {
        const date = new Date(timestamp);
        const today = new Date();
        return date.getFullYear() === today.getFullYear() &&
               date.getMonth() === today.getMonth() &&
               date.getDate() === today.getDate();
    }

    function formatUsage(used: number, limit: number): string {
        if (limit === 0) return `${used.toLocaleString()} / ∞`;
        return `${used.toLocaleString()} / ${limit.toLocaleString()}`;
    }

    function getUsagePercent(used: number, limit: number): number {
        if (limit === 0) return 0;
        return Math.min((used / limit) * 100, 100);
    }

    // Check if log date matches selected date
    function matchesSelectedDate(timestamp: any): boolean {
        const logDate = new Date(timestamp);
        const selected = new Date(selectedDate);
        return logDate.getFullYear() === selected.getFullYear() &&
               logDate.getMonth() === selected.getMonth() &&
               logDate.getDate() === selected.getDate();
    }

    // Get filtered logs for selected date and provider
    function getFilteredLogs() {
        return tokenLogs
            .filter(l => l.providerId === selectedProvider)
            .filter(l => matchesSelectedDate(l.createdAt))
            .slice(0, 20);
    }

    // Calculate daily usage for selected date
    function getSelectedDateUsage() {
        const filtered = tokenLogs
            .filter(l => l.providerId === selectedProvider)
            .filter(l => matchesSelectedDate(l.createdAt));
        
        const totalTokens = filtered.reduce((sum, l) => sum + (l.tokensUsed || 0), 0);
        const totalCost = filtered.reduce((sum, l) => sum + (l.costUsd || 0), 0);
        return { tokens: totalTokens, cost: totalCost, count: filtered.length };
    }

    // Calculate weekly usage (from Monday of that week OR 1st of month, whichever is later)
    // Weekly resets both on Monday AND on new month
    function getWeeklyUsage() {
        const selected = new Date(selectedDate);
        const dayOfWeek = selected.getDay();
        
        // Get Monday of the week (0=Sunday, 1=Monday, ... 6=Saturday)
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(selected);
        monday.setDate(selected.getDate() + mondayOffset);
        monday.setHours(0, 0, 0, 0);
        
        // Get 1st of the month
        const monthStart = new Date(selected.getFullYear(), selected.getMonth(), 1);
        monthStart.setHours(0, 0, 0, 0);
        
        // Use whichever is LATER (MAX) - so weekly resets on new month too
        const weekStart = monday > monthStart ? monday : monthStart;
        
        const selectedEnd = new Date(selected);
        selectedEnd.setHours(23, 59, 59, 999);
        
        const filtered = tokenLogs
            .filter(l => l.providerId === selectedProvider)
            .filter(l => {
                const logDate = new Date(l.createdAt);
                return logDate >= weekStart && logDate <= selectedEnd;
            });
        
        const totalTokens = filtered.reduce((sum, l) => sum + (l.tokensUsed || 0), 0);
        const totalCost = filtered.reduce((sum, l) => sum + (l.costUsd || 0), 0);
        return { tokens: totalTokens, cost: totalCost, count: filtered.length };
    }

    // Calculate monthly usage (from 1st of that month up to selected date)
    function getMonthlyUsage() {
        const selected = new Date(selectedDate);
        const monthStart = new Date(selected.getFullYear(), selected.getMonth(), 1);
        monthStart.setHours(0, 0, 0, 0);
        
        const selectedEnd = new Date(selected);
        selectedEnd.setHours(23, 59, 59, 999);
        
        const filtered = tokenLogs
            .filter(l => l.providerId === selectedProvider)
            .filter(l => {
                const logDate = new Date(l.createdAt);
                return logDate >= monthStart && logDate <= selectedEnd;
            });
        
        const totalTokens = filtered.reduce((sum, l) => sum + (l.tokensUsed || 0), 0);
        const totalCost = filtered.reduce((sum, l) => sum + (l.costUsd || 0), 0);
        return { tokens: totalTokens, cost: totalCost, count: filtered.length };
    }

    // Format selected date for display
    function formatSelectedDate(): string {
        const d = new Date(selectedDate);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    onMount(() => {
        // Set today's date at runtime using local timezone
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        selectedDate = `${year}-${month}-${day}`;
        
        loadBot();
        
        logPollInterval = setInterval(async () => {
            if (botStatus === 'online') {
                await fetchBotLogs();
                await fetchTokenData();
            }
        }, 5000);
    });

    onDestroy(() => {
        if (logPollInterval) {
            clearInterval(logPollInterval);
        }
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
    <div class="flex-1 overflow-hidden p-6 lg:p-8 space-y-4">
        <!-- Bot Controls + Profile Card -->
        <div class="bg-dark-surface rounded-xl border border-dark-border p-6">
            <div class="flex flex-col lg:flex-row gap-6">
                <!-- Left: Control Buttons -->
                <div class="flex-1">
                    <h2 class="text-lg font-bold mb-4 flex items-center gap-2">
                        <span class="material-symbols-outlined text-[20px] text-primary">settings_power</span>
                        Bot Controls
                    </h2>
                    <div class="flex flex-wrap gap-4">
                        {#if botStatus === 'offline'}
                            <button onclick={startBot} disabled={actionLoading} class="flex items-center gap-3 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50">
                                {#if actionLoading}
                                    <span class="size-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                {:else}
                                    <span class="material-symbols-outlined">play_arrow</span>
                                {/if}
                                Start Bot
                            </button>
                        {:else if botStatus === 'online'}
                            <button onclick={stopBot} disabled={actionLoading} class="flex items-center gap-3 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50">
                                {#if actionLoading}
                                    <span class="size-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                {:else}
                                    <span class="material-symbols-outlined">stop</span>
                                {/if}
                                Stop Bot
                            </button>
                            <button onclick={restartBot} disabled={actionLoading} class="flex items-center gap-3 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50">
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

                <!-- Right: Bot Profile (same style as dashboard) -->
                <div class="lg:border-l border-dark-border lg:pl-6 flex items-center gap-4">
                    {#if getAvatarUrl()}
                        <div class="w-14 h-14 rounded-lg bg-cover bg-center shadow-inner ring-1 ring-white/10 shrink-0" style="background-image: url('{getAvatarUrl()}');"></div>
                    {:else}
                        <div class="w-14 h-14 rounded-lg bg-gray-700 flex items-center justify-center shadow-inner ring-1 ring-white/10 shrink-0">
                            <span class="text-xl font-bold text-gray-400">{bot?.name?.charAt(0) || '?'}</span>
                        </div>
                    {/if}
                    <div class="text-sm space-y-1">
                        <p class="font-bold text-lg">{bot?.name || 'Loading...'}</p>
                        <p class="text-gray-400">ID: <span class="text-gray-300 font-mono text-xs">{bot?.clientId || '...'}</span></p>
                        <p class="text-gray-400">Created: <span class="text-gray-300">{formatDate(bot?.createdAt)}</span></p>
                    </div>
                </div>

                <!-- Training Controls -->
                <div class="lg:border-l border-dark-border lg:pl-6 flex flex-col gap-2">
                    {#if trainingStatus.isTrainingActive}
                        <button onclick={() => showStopTrainingModal = true} disabled={botStatus !== 'online'} class="flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                            <span class="material-symbols-outlined text-[18px]">stop_circle</span>
                            Stop Training
                        </button>
                    {:else}
                        <button onclick={() => showStartTrainingModal = true} disabled={botStatus !== 'online'} class="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                            <span class="material-symbols-outlined text-[18px]">psychology</span>
                            Start Training
                        </button>
                    {/if}
                    <button onclick={() => showDeleteTrainingModal = true} disabled={trainingStatus.totalExamples === 0} class="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 border border-dark-border hover:border-red-500/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                        <span class="material-symbols-outlined text-[18px]">delete_forever</span>
                        Delete Training
                    </button>
                    <button onclick={() => showClearHistoryModal = true} disabled={botStatus !== 'online'} class="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 border border-dark-border hover:border-red-500/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                        <span class="material-symbols-outlined text-[18px]">cleaning_services</span>
                        Clear AI Chat
                    </button>
                    {#if trainingStatus.totalExamples > 0}
                        <span class="text-xs text-gray-500 text-center">{trainingStatus.totalExamples} examples learned</span>
                    {/if}
                </div>
            </div>
        </div>

        <!-- Logs + Token Usage Grid (50/50) -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100%-160px)]">
            <!-- Bot Logs -->
            <div class="bg-dark-surface rounded-xl border border-dark-border flex flex-col h-full min-h-[300px]">
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
                        <p class="text-gray-600">No logs yet... Bot activity will appear here.</p>
                    {:else}
                        {#each logs as log}
                            <div class="py-0.5 flex gap-2
                                {log.type === 'Error' ? 'text-red-400' : ''}
                                {log.type === 'System' ? 'text-blue-400' : ''}
                                {log.type === 'AI' ? 'text-green-400' : ''}
                                {log.type === 'Command' ? 'text-purple-400' : ''}
                                {log.type === 'Message' ? 'text-cyan-400' : ''}
                                {!['Error', 'System', 'AI', 'Command', 'Message'].includes(log.type) ? 'text-gray-400' : ''}
                            ">
                                <span class="text-gray-600">[{formatLogTime(log.timestamp)}]</span>
                                <span class="font-bold">[{log.type}]</span>
                                <span>{log.message}</span>
                                {#if log.user}
                                    <span class="text-gray-500">- {log.user}</span>
                                {/if}
                            </div>
                        {/each}
                    {/if}
                </div>
            </div>

            <!-- AI Token Usage -->
            <div class="bg-dark-surface rounded-xl border border-dark-border flex flex-col h-full min-h-[300px]">
                <div class="flex items-center justify-between p-4 border-b border-dark-border">
                    <h2 class="text-lg font-bold flex items-center gap-2">
                        <span class="material-symbols-outlined text-[20px] text-purple-400">token</span>
                        AI Token Usage
                    </h2>
                    <div class="flex items-center gap-2">
                        <!-- Date Picker -->
                        <input 
                            type="date" 
                            bind:value={selectedDate}
                            class="px-3 py-1.5 bg-white/5 border border-dark-border rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                        />
                        {#if tokenSummary.length > 0}
                            <select bind:value={selectedProvider} class="px-3 py-1.5 bg-white/5 border border-dark-border rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary">
                                {#each tokenSummary as provider}
                                    <option value={provider.providerId}>{provider.providerLabel}</option>
                                {/each}
                            </select>
                        {/if}
                    </div>
                </div>

                {#if tokenSummary.length === 0}
                    <div class="flex-1 flex items-center justify-center text-gray-500">
                        <div class="text-center">
                            <span class="material-symbols-outlined text-4xl mb-2">analytics</span>
                            <p>No AI providers configured yet</p>
                            <p class="text-sm">Add AI providers in Studio</p>
                        </div>
                    </div>
                {:else}
                    {@const summary = getCurrentProviderSummary()}
                    {@const selectedDateUsage = getSelectedDateUsage()}
                    {@const weeklyUsage = getWeeklyUsage()}
                    {@const monthlyUsage = getMonthlyUsage()}
                    <div class="p-4 space-y-4 overflow-y-auto flex-1">
                        <!-- Usage Stats -->
                        <div class="grid grid-cols-3 gap-3">
                            <!-- Daily (for selected date) -->
                            <div class="bg-white/5 rounded-lg p-3">
                                <div class="flex justify-between items-start">
                                    <p class="text-xs text-gray-400 mb-1">Daily ({formatSelectedDate().split(' ')[0]})</p>
                                    <span class="text-xs text-green-400">${selectedDateUsage.cost.toFixed(2)}</span>
                                </div>
                                <p class="font-bold text-sm">{formatUsage(selectedDateUsage.tokens, summary?.dailyLimit || 0)}</p>
                                <div class="mt-2 h-1.5 bg-dark-border rounded-full overflow-hidden">
                                    <div class="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all" style="width: {getUsagePercent(selectedDateUsage.tokens, summary?.dailyLimit || 0)}%"></div>
                                </div>
                            </div>
                            <!-- Weekly (up to selected date) -->
                            <div class="bg-white/5 rounded-lg p-3">
                                <div class="flex justify-between items-start">
                                    <p class="text-xs text-gray-400 mb-1">Weekly</p>
                                    <span class="text-xs text-green-400">${weeklyUsage.cost.toFixed(2)}</span>
                                </div>
                                <p class="font-bold text-sm">{formatUsage(weeklyUsage.tokens, summary?.weeklyLimit || 0)}</p>
                                <div class="mt-2 h-1.5 bg-dark-border rounded-full overflow-hidden">
                                    <div class="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all" style="width: {getUsagePercent(weeklyUsage.tokens, summary?.weeklyLimit || 0)}%"></div>
                                </div>
                            </div>
                            <!-- Monthly (up to selected date) -->
                            <div class="bg-white/5 rounded-lg p-3">
                                <div class="flex justify-between items-start">
                                    <p class="text-xs text-gray-400 mb-1">Monthly</p>
                                    <span class="text-xs text-green-400">${monthlyUsage.cost.toFixed(2)}</span>
                                </div>
                                <p class="font-bold text-sm">{formatUsage(monthlyUsage.tokens, summary?.monthlyLimit || 0)}</p>
                                <div class="mt-2 h-1.5 bg-dark-border rounded-full overflow-hidden">
                                    <div class="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all" style="width: {getUsagePercent(monthlyUsage.tokens, summary?.monthlyLimit || 0)}%"></div>
                                </div>
                            </div>
                        </div>

                        <!-- Settings Button -->
                        <button onclick={openLimitSettings} class="flex items-center justify-center w-8 h-8 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 hover:text-purple-300 rounded-lg transition-colors border border-purple-500/30" title="Token Limit Settings">
                            <span class="material-symbols-outlined text-[18px]">tune</span>
                        </button>

                        <!-- Usage for Selected Date -->
                        {#if true}
                            {@const dateUsage = getSelectedDateUsage()}
                            <div class="flex flex-col flex-1">
                                <h3 class="text-sm font-bold text-gray-300 mb-2">
                                    Usage for {formatSelectedDate()}
                                    <span class="font-normal text-gray-500 ml-2">({dateUsage.count} requests)</span>
                                </h3>
                                
                                <div class="space-y-1 overflow-y-auto text-xs font-mono flex-1 max-h-80 overscroll-contain">
                                    {#each getFilteredLogs() as log}
                                        {@const logDate = new Date(log.createdAt)}
                                        <div class="flex gap-2 text-purple-300">
                                            <span class="text-purple-500">[{logDate.getDate().toString().padStart(2, '0')}/{(logDate.getMonth() + 1).toString().padStart(2, '0')}/{logDate.getFullYear()}]</span>
                                            <span class="text-purple-500">[{formatLogTime(log.createdAt)}]</span>
                                            <span class="text-purple-400">{log.userName || 'Unknown'}</span>
                                            <span>
                                                {#if log.requestType === 'image'}
                                                    {log.imageCount || 1} image{(log.imageCount || 1) !== 1 ? 's' : ''}
                                                {:else if log.tokensUsed !== null}
                                                    {log.tokensUsed.toLocaleString()} tokens
                                                {:else}
                                                    tokens N/A
                                                {/if}
                                            </span>
                                            <span class="text-green-400">(${(log.costUsd || 0).toFixed(4)})</span>
                                            <span class="text-gray-500">({log.requestType || 'chat'})</span>
                                        </div>
                                    {:else}
                                        <p class="text-gray-600">No usage on this date</p>
                                    {/each}
                                </div>
                            </div>
                        {/if}
                    </div>
                {/if}
            </div>
        </div>
    </div>
</div>

<!-- Limit Settings Modal -->
{#if showLimitSettings}
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions a11y_interactive_supports_focus -->
    <div class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" role="dialog" aria-modal="true" tabindex="-1" onclick={() => showLimitSettings = false} onkeydown={(e) => e.key === 'Escape' && (showLimitSettings = false)}>
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions a11y_no_noninteractive_element_interactions -->
        <div class="bg-dark-surface rounded-2xl border border-purple-500/20 p-6 w-full max-w-md shadow-2xl shadow-purple-500/10" role="presentation" onclick={(e) => e.stopPropagation()}>
            <!-- Header -->
            <div class="flex items-center gap-3 mb-6">
                <div class="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <span class="material-symbols-outlined text-purple-400">tune</span>
                </div>
                <div>
                    <h2 class="text-lg font-bold text-white">Token Limit Settings</h2>
                    <p class="text-xs text-gray-500">Configure usage limits for this provider</p>
                </div>
            </div>
            
            <!-- Limits Section -->
            <div class="space-y-4">
                <div class="grid grid-cols-3 gap-3">
                    <div class="bg-white/5 rounded-xl p-3 border border-purple-500/10">
                        <label for="dailyLimit" class="block text-xs text-purple-400 mb-2 font-medium">Daily</label>
                        <input id="dailyLimit" type="number" bind:value={editLimits.dailyLimit} min="0" class="w-full px-3 py-2 bg-black/30 border border-dark-border rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" placeholder="0" />
                    </div>
                    <div class="bg-white/5 rounded-xl p-3 border border-green-500/10">
                        <label for="weeklyLimit" class="block text-xs text-green-400 mb-2 font-medium">Weekly</label>
                        <input id="weeklyLimit" type="number" bind:value={editLimits.weeklyLimit} min="0" class="w-full px-3 py-2 bg-black/30 border border-dark-border rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500" placeholder="0" />
                    </div>
                    <div class="bg-white/5 rounded-xl p-3 border border-amber-500/10">
                        <label for="monthlyLimit" class="block text-xs text-amber-400 mb-2 font-medium">Monthly</label>
                        <input id="monthlyLimit" type="number" bind:value={editLimits.monthlyLimit} min="0" class="w-full px-3 py-2 bg-black/30 border border-dark-border rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500" placeholder="0" />
                    </div>
                </div>
                <p class="text-xs text-gray-500 text-center">Set to 0 for unlimited</p>
                
                <!-- Options Section -->
                <div class="bg-white/5 rounded-xl p-4 space-y-3 border border-dark-border">
                    <label class="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" bind:checked={editLimits.allowAdminBypass} class="w-4 h-4 rounded bg-black/30 border-gray-600 text-purple-500 focus:ring-purple-500" />
                        <div class="flex-1">
                            <span class="text-sm text-gray-200 group-hover:text-white transition-colors">Allow admin bypass</span>
                            <p class="text-xs text-gray-500">Admins can use unlimited tokens</p>
                        </div>
                    </label>
                    <label class="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" bind:checked={editLimits.notifyOwnerOnLimit} class="w-4 h-4 rounded bg-black/30 border-gray-600 text-purple-500 focus:ring-purple-500" />
                        <div class="flex-1">
                            <span class="text-sm text-gray-200 group-hover:text-white transition-colors">Notify on limit reached</span>
                            <p class="text-xs text-gray-500">Send DM when limit is hit</p>
                        </div>
                    </label>
                    <label class="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" bind:checked={editLimits.isEnabled} class="w-4 h-4 rounded bg-black/30 border-gray-600 text-purple-500 focus:ring-purple-500" />
                        <div class="flex-1">
                            <span class="text-sm text-gray-200 group-hover:text-white transition-colors">Enable limits</span>
                            <p class="text-xs text-gray-500">Turn on usage restrictions</p>
                        </div>
                    </label>
                </div>
            </div>

            <!-- Footer Buttons -->
            <div class="flex gap-3 mt-6">
                <button onclick={() => showLimitSettings = false} class="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-medium transition-colors border border-dark-border">
                    Cancel
                </button>
                <button onclick={saveLimitSettings} disabled={savingLimits} class="flex-1 px-4 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {#if savingLimits}
                        <span class="material-symbols-outlined text-[18px] animate-spin">sync</span>
                        Saving...
                    {:else}
                        <span class="material-symbols-outlined text-[18px]">check</span>
                        Save Settings
                    {/if}
                </button>
            </div>
        </div>
    </div>
{/if}

<!-- Toast Notification -->
{#if toast.show}
    <div class="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border
        {toast.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : ''}
        {toast.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' : ''}
        {toast.type === 'info' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : ''}
    ">
        <span class="material-symbols-outlined text-[20px]">
            {toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : 'info'}
        </span>
        <span class="font-medium text-sm">{toast.message}</span>
        <button onclick={() => toast.show = false} class="ml-2 hover:opacity-70">
            <span class="material-symbols-outlined text-[18px]">close</span>
        </button>
    </div>
{/if}

<!-- Start Training Modal -->
{#if showStartTrainingModal}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <button type="button" class="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-default" onclick={() => showStartTrainingModal = false} aria-label="Close modal"></button>
        <div class="relative w-full max-w-md bg-dark-surface rounded-xl border border-purple-500/30 shadow-2xl flex flex-col overflow-hidden">
            <div class="p-6 text-center">
                <div class="mx-auto size-14 rounded-full bg-purple-500/20 flex items-center justify-center mb-4 text-purple-400">
                    <span class="material-symbols-outlined text-[32px]">psychology</span>
                </div>
                <h3 class="text-xl font-bold text-white mb-2">Start Training Mode?</h3>
                <p class="text-gray-400 text-sm leading-relaxed">
                    AI will learn from all conversations while training mode is active.
                    <br><span class="text-purple-400">You can stop training anytime.</span>
                </p>
            </div>
            <div class="flex items-center border-t border-white/5 bg-white/5 p-4 gap-3">
                <button onclick={() => showStartTrainingModal = false} class="flex-1 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 font-medium text-sm transition-colors">
                    Cancel
                </button>
                <button onclick={startTraining} disabled={trainingActionLoading} class="flex-1 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    {#if trainingActionLoading}
                        <span class="size-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    {:else}
                        <span class="material-symbols-outlined text-[18px]">psychology</span>
                    {/if}
                    Start Training
                </button>
            </div>
        </div>
    </div>
{/if}

<!-- Stop Training Modal -->
{#if showStopTrainingModal}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <button type="button" class="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-default" onclick={() => showStopTrainingModal = false} aria-label="Close modal"></button>
        <div class="relative w-full max-w-md bg-dark-surface rounded-xl border border-amber-500/30 shadow-2xl flex flex-col overflow-hidden">
            <div class="p-6 text-center">
                <div class="mx-auto size-14 rounded-full bg-amber-500/20 flex items-center justify-center mb-4 text-amber-400">
                    <span class="material-symbols-outlined text-[32px]">stop_circle</span>
                </div>
                <h3 class="text-xl font-bold text-white mb-2">Stop Training Mode?</h3>
                <p class="text-gray-400 text-sm leading-relaxed">
                    AI will stop learning and use the <span class="text-amber-400 font-semibold">{trainingStatus.totalExamples} examples</span> collected.
                    <br>You can start training again anytime.
                </p>
            </div>
            <div class="flex items-center border-t border-white/5 bg-white/5 p-4 gap-3">
                <button onclick={() => showStopTrainingModal = false} class="flex-1 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 font-medium text-sm transition-colors">
                    Cancel
                </button>
                <button onclick={stopTraining} disabled={trainingActionLoading} class="flex-1 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    {#if trainingActionLoading}
                        <span class="size-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    {:else}
                        <span class="material-symbols-outlined text-[18px]">check_circle</span>
                    {/if}
                    Stop Training
                </button>
            </div>
        </div>
    </div>
{/if}

<!-- Delete Training Modal -->
{#if showDeleteTrainingModal}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <button type="button" class="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-default" onclick={() => showDeleteTrainingModal = false} aria-label="Close modal"></button>
        <div class="relative w-full max-w-md bg-dark-surface rounded-xl border border-red-500/30 shadow-2xl flex flex-col overflow-hidden">
            <div class="p-6 text-center">
                <div class="mx-auto size-14 rounded-full bg-red-500/20 flex items-center justify-center mb-4 text-red-400">
                    <span class="material-symbols-outlined text-[32px]">delete_forever</span>
                </div>
                <h3 class="text-xl font-bold text-white mb-2">Delete All Training Data?</h3>
                <p class="text-gray-400 text-sm leading-relaxed">
                    This will permanently delete all <span class="text-red-400 font-semibold">{trainingStatus.totalExamples} learned examples</span>.
                    <br>AI will reset to default behavior.
                </p>
            </div>
            <div class="flex items-center border-t border-white/5 bg-white/5 p-4 gap-3">
                <button onclick={() => showDeleteTrainingModal = false} class="flex-1 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 font-medium text-sm transition-colors">
                    Cancel
                </button>
                <button onclick={deleteTraining} disabled={trainingActionLoading} class="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    {#if trainingActionLoading}
                        <span class="size-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    {:else}
                        <span class="material-symbols-outlined text-[18px]">delete_forever</span>
                    {/if}
                    Delete All
                </button>
            </div>
        </div>
    </div>
{/if}

<!-- Clear AI History Modal -->
{#if showClearHistoryModal}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <button type="button" class="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-default" onclick={() => showClearHistoryModal = false} aria-label="Close modal"></button>
        <div class="relative w-full max-w-md bg-dark-surface rounded-xl border border-red-500/30 shadow-2xl flex flex-col overflow-hidden">
            <div class="p-6 text-center">
                <div class="mx-auto size-14 rounded-full bg-red-500/20 flex items-center justify-center mb-4 text-red-400">
                    <span class="material-symbols-outlined text-[32px]">cleaning_services</span>
                </div>
                <h3 class="text-xl font-bold text-white mb-2">Clear AI Chat History?</h3>
                <p class="text-gray-400 text-sm leading-relaxed">
                    This will <span class="text-red-400 font-semibold">permanently delete all messages</span> in AI chat channels.
                    <br>The AI will have no memory of previous conversations.
                </p>
            </div>
            <div class="flex items-center border-t border-white/5 bg-white/5 p-4 gap-3">
                <button onclick={() => showClearHistoryModal = false} class="flex-1 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 font-medium text-sm transition-colors">
                    Cancel
                </button>
                <button onclick={clearAIHistory} disabled={clearHistoryLoading} class="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    {#if clearHistoryLoading}
                        <span class="size-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    {:else}
                        <span class="material-symbols-outlined text-[18px]">cleaning_services</span>
                    {/if}
                    Clear All
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
    /* Custom scrollbar */
    .font-mono::-webkit-scrollbar,
    .overflow-y-auto::-webkit-scrollbar {
        width: 6px;
    }
    .font-mono::-webkit-scrollbar-track,
    .overflow-y-auto::-webkit-scrollbar-track {
        background: transparent;
    }
    .font-mono::-webkit-scrollbar-thumb,
    .overflow-y-auto::-webkit-scrollbar-thumb {
        background: #333;
        border-radius: 3px;
    }
    .font-mono::-webkit-scrollbar-thumb:hover,
    .overflow-y-auto::-webkit-scrollbar-thumb:hover {
        background: #444;
    }
</style>
