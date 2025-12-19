<script lang="ts">
    import { api } from '$lib/api';
    import { useSession } from '$lib/auth';
    import BotManageModal from '$lib/components/BotManageModal.svelte';
    
    const session = useSession();
    let bots = $state<any[]>([]);
    let loading = $state(true);
    let error = $state('');
    
    // Modal state
    let showManageModal = $state(false);
    let selectedBot = $state<any>(null);

    $effect(() => {
        loadBots();
    });

    async function loadBots() {
        loading = true;
        error = '';
        try {
            bots = await api.getBots();
        } catch (e) {
            error = 'Failed to load bots';
            console.error(e);
        } finally {
            loading = false;
        }
    }

    function openManageModal(bot: any, e: Event) {
        e.preventDefault();
        e.stopPropagation();
        selectedBot = bot;
        showManageModal = true;
    }
</script>

<div class="flex flex-col gap-8">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 class="text-3xl md:text-4xl font-black tracking-tight text-white mb-2">My Bots</h1>
            <p class="text-gray-500">Manage and monitor all your Discord bots in one place.</p>
        </div>
        <a href="/bots/new" class="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-sm rounded-lg transition-colors shadow-lg shadow-primary/25">
            <span class="material-symbols-outlined text-[20px]">add</span>
            Add New Bot
        </a>
    </div>

    {#if loading}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {#each Array(3) as _}
                <div class="animate-pulse bg-dark-card rounded-xl border border-dark-border p-6">
                    <div class="flex items-center gap-4 mb-4">
                        <div class="size-12 rounded-lg bg-white/5"></div>
                        <div class="flex-1 space-y-2">
                            <div class="h-4 w-24 bg-white/5 rounded"></div>
                            <div class="h-3 w-16 bg-white/5 rounded"></div>
                        </div>
                    </div>
                    <div class="h-8 bg-white/5 rounded"></div>
                </div>
            {/each}
        </div>
    {:else if error}
        <div class="text-center py-12">
            <div class="size-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                <span class="material-symbols-outlined text-[32px] text-red-500">error</span>
            </div>
            <p class="text-red-400">{error}</p>
            <button onclick={loadBots} class="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-gray-400 hover:text-white transition-colors">
                Try Again
            </button>
        </div>
    {:else if bots.length === 0}
        <div class="text-center py-20">
            <div class="size-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <span class="material-symbols-outlined text-[40px] text-primary">robot_2</span>
            </div>
            <h2 class="text-2xl font-bold text-white mb-2">No Bots Yet</h2>
            <p class="text-gray-500 max-w-md mx-auto mb-6">
                Get started by adding your first Discord bot. You'll be able to create automated flows, moderate your server, and more.
            </p>
            <a href="/bots/new" class="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg transition-colors">
                <span class="material-symbols-outlined">add</span>
                Add Your First Bot
            </a>
        </div>
    {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {#each bots as bot}
                <div class="group bg-dark-card rounded-xl border border-dark-border p-5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all">
                    <div class="flex items-center gap-4 mb-4">
                        {#if bot.avatar && bot.clientId}
                            <div class="size-12 rounded-lg bg-cover bg-center ring-1 ring-white/10" style="background-image: url('https://cdn.discordapp.com/avatars/{bot.clientId}/{bot.avatar}.png');"></div>
                        {:else}
                            <div class="size-12 rounded-lg bg-gray-700 flex items-center justify-center ring-1 ring-white/10">
                                <span class="text-xl font-bold text-gray-400">{bot.name.charAt(0)}</span>
                            </div>
                        {/if}
                        <div class="flex-1 min-w-0">
                            <h3 class="font-bold text-white truncate">{bot.name}</h3>
                            <div class="flex items-center gap-1.5 mt-0.5">
                                <span class="size-2 rounded-full {bot.status === 'online' ? 'bg-green-500' : bot.status === 'error' ? 'bg-red-500' : 'bg-gray-500'}"></span>
                                <span class="text-xs text-gray-500 capitalize">{bot.status}</span>
                            </div>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <button 
                            onclick={(e) => openManageModal(bot, e)} 
                            class="flex-1 py-2 px-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                            <span class="material-symbols-outlined text-[16px]">settings</span>
                            Manage
                        </button>
                        <a href="/bots/{bot.id}/studio" class="flex-1 py-2 px-3 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                            <span class="material-symbols-outlined text-[16px]">code</span>
                            Studio
                        </a>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>

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
