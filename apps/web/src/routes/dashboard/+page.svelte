<script lang="ts">
    import { onMount } from 'svelte';
    import { api } from '$lib/api';
    import { useSession } from '$lib/auth';
    import BotManageModal from '$lib/components/BotManageModal.svelte';
    
    const session = useSession();
    let stats = $state({ totalBots: 0, onlineBots: 0, events: 0 });
    let bots = $state<any[]>([]);
    let recentActivity = $state<any[]>([]);
    let loading = $state(true);
    let error = $state<string | null>(null);

    // Delete Modal State
    let showDeleteModal = $state(false);
    let botToDelete = $state<any>(null);
    let deleting = $state(false);

    // Manage Modal State
    let showManageModal = $state(false);
    let selectedBot = $state<any>(null);

    function openManageModal(bot: any) {
        selectedBot = bot;
        showManageModal = true;
    }

    function confirmDelete(bot: any) {
        botToDelete = bot;
        showDeleteModal = true;
    }

    function cancelDelete() {
        showDeleteModal = false;
        botToDelete = null;
    }

    async function deleteBot() {
        if (!botToDelete) return;
        
        deleting = true;
        try {
            await api.deleteBot(botToDelete.id);
            // Refresh list
            await loadData();
            cancelDelete();
        } catch (e: any) {
            console.error("Failed to delete bot:", e);
            alert("Failed to delete bot: " + e.message);
        } finally {
            deleting = false;
        }
    }

    async function loadData() {
        try {
            loading = true;
            const [fetchedBots] = await Promise.all([
                api.getBots()
            ]);
            
            bots = fetchedBots;
            
            // Calculate stats locally for now since we don't have a dedicated endpoint yet
            stats.totalBots = fetchedBots.length;
            stats.onlineBots = fetchedBots.filter(b => b.status === 'online').length;
            stats.events = 0; // Mock for now

            // Derive recent activity from bots (mocked activity based on creation/updates)
            // In a real app we would have an activity log table
            recentActivity = fetchedBots.slice(0, 5).map(b => ({
                botName: b.name,
                action: 'Bot status checked',
                time: 'Recently',
                details: 'System check'
            }));

        } catch (e: any) {
            console.error("Dashboard load error:", e);
            error = "Failed to load dashboard data. " + e.message;
        } finally {
            loading = false;
        }
    }

    onMount(() => {
        loadData();
    });
</script>

<svelte:head>
	<title>Dashboard Overview - BotPanel</title>
</svelte:head>

<section>
    <h2 class="text-xl font-bold text-white mb-4">Overview</h2>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-dark-card p-6 rounded-xl border border-dark-border shadow-sm flex flex-col gap-1 hover:border-primary/30 transition-colors">
            <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-gray-400">Total Bots</span>
                <div class="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                    <span class="material-symbols-outlined text-[24px]">smart_toy</span>
                </div>
            </div>
            <div class="flex items-baseline gap-2">
                <span class="text-3xl font-bold text-white">
                    {#if loading}...{:else}{stats.totalBots}{/if}
                </span>
                <!-- <span class="text-xs font-medium text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">+0%</span> -->
            </div>
        </div>
        <div class="bg-dark-card p-6 rounded-xl border border-dark-border shadow-sm flex flex-col gap-1 hover:border-primary/30 transition-colors">
            <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-gray-400">Bots Online</span>
                <div class="p-2 rounded-lg bg-green-500/10 text-green-400">
                    <span class="material-symbols-outlined text-[24px]">wifi</span>
                </div>
            </div>
            <div class="flex items-baseline gap-2">
                <span class="text-3xl font-bold text-white">
                     {#if loading}...{:else}{stats.onlineBots}{/if}
                </span>
            </div>
        </div>
        <div class="bg-dark-card p-6 rounded-xl border border-dark-border shadow-sm flex flex-col gap-1 hover:border-primary/30 transition-colors">
            <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-gray-400">Events (24h)</span>
                <div class="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                    <span class="material-symbols-outlined text-[24px]">bolt</span>
                </div>
            </div>
            <div class="flex items-baseline gap-2">
                <span class="text-3xl font-bold text-white">
                     {#if loading}...{:else}{stats.events}{/if}
                </span>
            </div>
        </div>
    </div>
</section>

<section>
    <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-bold text-white">My Bots</h2>
        <a href="/bots/new" class="text-sm font-medium text-primary hover:text-primary-hover transition-colors">
            <span class="hidden sm:inline">Add New</span>
            <span class="sm:hidden">+</span>
        </a>
    </div>

    {#if loading}
        <div class="p-8 text-center text-gray-500">Loading bots...</div>
    {:else if error}
        <div class="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg">
            {error}
        </div>
    {:else if bots.length === 0}
        <div class="text-center py-12 bg-dark-card rounded-xl border border-dark-border">
            <div class="flex justify-center mb-4">
               <div class="p-4 bg-dark-base rounded-full">
                    <span class="material-symbols-outlined text-4xl text-gray-600">smart_toy</span>
               </div>
            </div>
            <h3 class="text-lg font-medium text-white mb-2">No bots yet</h3>
            <p class="text-gray-400 mb-6 max-w-sm mx-auto">Create your first bot to start building flows and managing your server.</p>
            <a href="/bots/new" class="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors">
                <span class="material-symbols-outlined text-xl">add</span>
                Create Bot
            </a>
        </div>
    {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {#each bots as bot}
                <div class="group bg-dark-card rounded-xl border border-dark-border p-4 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 relative">
                    <div class="flex items-start justify-between mb-4">
                        <div class="flex gap-4">
                            {#if bot.avatar && bot.clientId}
                                <div class="size-12 rounded-lg bg-cover bg-center shadow-inner ring-1 ring-white/10" style="background-image: url('https://cdn.discordapp.com/avatars/{bot.clientId}/{bot.avatar}.png');"></div>
                            {:else}
                                 <div class="size-12 rounded-lg bg-gray-700 flex items-center justify-center shadow-inner ring-1 ring-white/10">
                                     <span class="text-xl font-bold text-gray-400">{bot.name.charAt(0)}</span>
                                 </div>
                            {/if}
                            <div>
                                <h3 class="font-bold text-white text-lg leading-tight group-hover:text-primary transition-colors">{bot.name}</h3>
                                <div class="flex items-center gap-1.5 mt-1">
                                    <div class="size-2 rounded-full {bot.status === 'online' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-500'}"></div>
                                    <span class="text-xs text-gray-400 font-medium capitalize">{bot.status}</span>
                                </div>
                            </div>
                        </div>
                        <button onclick={() => confirmDelete(bot)} class="text-gray-500 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-500/10" title="Delete Bot">
                            <span class="material-symbols-outlined">delete</span>
                        </button>
                    </div>
                    <!-- Stats (Mocked or from DB if available) -->
                    <div class="flex items-center gap-4 mb-5 text-sm text-gray-400">
                        <div class="flex items-center gap-1">
                            <span class="material-symbols-outlined text-[18px]">account_tree</span>
                            <span>0 Flows</span>
                        </div>
                    </div>
                    <button onclick={() => openManageModal(bot)} class="w-full bg-dark-border hover:bg-primary text-gray-300 hover:text-white font-bold py-2 px-4 rounded-lg text-sm transition-all flex items-center justify-center gap-2">
                        <span>Manage Bot</span>
                        <span class="material-symbols-outlined text-[18px]">settings</span>
                    </button>
                </div>
            {/each}

            <!-- Add New Card -->
             <a href="/bots/new" class="group bg-transparent rounded-xl border-2 border-dashed border-dark-border p-4 flex flex-col items-center justify-center gap-3 hover:border-primary hover:bg-dark-card/50 transition-all cursor-pointer min-h-[180px]">
                <div class="size-12 rounded-full bg-dark-border flex items-center justify-center text-gray-500 group-hover:bg-primary group-hover:text-white group-hover:scale-110 transition-all shadow-lg group-hover:shadow-primary/25">
                    <span class="material-symbols-outlined text-[28px]">add</span>
                </div>
                <span class="font-bold text-gray-400 group-hover:text-white transition-colors">Add New Bot</span>
            </a>
        </div>
    {/if}
</section>

{#if !loading && recentActivity.length > 0}
<section>
    <h2 class="text-xl font-bold text-white mb-4">Recent Activity</h2>
    <!-- (Table code remains same, omitted for brevity if unchanged) -->
    <div class="bg-dark-card rounded-xl border border-dark-border overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
                <thead class="bg-dark-surface text-gray-400 font-medium border-b border-dark-border">
                    <tr>
                        <th class="px-6 py-3">Bot</th>
                        <th class="px-6 py-3">Action</th>
                        <th class="px-6 py-3">Time</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-dark-border">
                    {#each recentActivity as activity}
                    <tr class="hover:bg-dark-surface transition-colors">
                        <td class="px-6 py-4 font-medium text-white flex items-center gap-2">
                            <div class="size-6 rounded bg-indigo-500 shadow-sm"></div>
                            {activity.botName}
                        </td>
                        <td class="px-6 py-4 text-gray-300">{activity.action}</td>
                        <td class="px-6 py-4 text-gray-500 text-xs">{activity.time}</td>
                    </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    </div>
</section>
{/if}

{#if showDeleteModal && botToDelete}
<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <button type="button" class="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-default" onclick={cancelDelete} aria-label="Close modal"></button>
    <div class="relative w-full max-w-md bg-[#1a1a1a] rounded-xl border border-red-500/30 shadow-2xl flex flex-col overflow-hidden animate-scaleIn">
        <div class="p-6 text-center">
            <div class="mx-auto size-14 rounded-full bg-red-500/10 flex items-center justify-center mb-4 text-red-500">
                <span class="material-symbols-outlined text-[32px]">warning</span>
            </div>
            <h3 class="text-xl font-bold text-white mb-2">Delete {botToDelete.name}?</h3>
            <p class="text-gray-400 text-sm leading-relaxed">
                Are you sure you want to delete this bot? <br>
                <span class="text-red-400 font-semibold">All data, flows, and settings will be permanently lost.</span>
            </p>
        </div>
        <div class="flex items-center border-t border-white/5 bg-white/5 p-4 gap-3">
            <button onclick={cancelDelete} class="flex-1 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 font-medium text-sm transition-colors">
                Cancel
            </button>
            <button onclick={deleteBot} class="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-900/20 transition-all flex items-center justify-center gap-2">
                {#if deleting}
                    <span class="size-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Deleting...
                {:else}
                    <span class="material-symbols-outlined text-[18px]">delete</span>
                    Confirm Delete
                {/if}
            </button>
        </div>
    </div>
</div>
{/if}

{#if selectedBot}
    <BotManageModal 
        bind:show={showManageModal}
        botId={selectedBot.id}
        botName={selectedBot.name}
        botAvatar={selectedBot.avatar}
        botClientId={selectedBot.clientId}
        isOwner={$session.data?.user?.id === selectedBot.userId}
    />
{/if}
