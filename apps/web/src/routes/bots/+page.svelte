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
    
    // Delete modal state
    let showDeleteModal = $state(false);
    let botToDelete = $state<any>(null);
    let deleting = $state(false);

    // Generate proper Discord CDN avatar URL
    function getAvatarUrl(bot: any): string | null {
        if (!bot?.avatar) return null;
        // If already a full URL, return as-is
        if (bot.avatar.startsWith('http')) return bot.avatar;
        // Generate from hash + clientId
        if (bot.clientId) {
            return `https://cdn.discordapp.com/avatars/${bot.clientId}/${bot.avatar}.png`;
        }
        return null;
    }

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
    
    function confirmDelete(bot: any, e: Event) {
        e.preventDefault();
        e.stopPropagation();
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
            await loadBots();
            cancelDelete();
        } catch (e: any) {
            console.error("Failed to delete bot:", e);
            alert("Failed to delete bot: " + e.message);
        } finally {
            deleting = false;
        }
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
                <div 
                    role="button"
                    tabindex="0"
                    onclick={(e) => { if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.card-content')) window.location.href = `/bots/${bot.id}/panel`; }}
                    onkeydown={(e) => { if (e.key === 'Enter') window.location.href = `/bots/${bot.id}/panel`; }}
                    class="group bg-dark-card rounded-xl border border-dark-border p-5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer"
                >
                    <div class="card-content flex items-start gap-4 mb-4">
                        {#if getAvatarUrl(bot)}
                            <div class="size-12 rounded-lg bg-cover bg-center ring-1 ring-white/10 shrink-0" style="background-image: url('{getAvatarUrl(bot)}');"></div>
                        {:else}
                            <div class="size-12 rounded-lg bg-gray-700 flex items-center justify-center ring-1 ring-white/10 shrink-0">
                                <span class="text-xl font-bold text-gray-400">{bot.name.charAt(0)}</span>
                            </div>
                        {/if}
                        <div class="flex-1 min-w-0">
                            <h3 class="font-bold text-white truncate group-hover:text-primary transition-colors">{bot.name}</h3>
                            <div class="flex items-center gap-1.5 mt-0.5">
                                <span class="size-2 rounded-full {bot.status === 'online' ? 'bg-green-500' : bot.status === 'error' ? 'bg-red-500' : 'bg-gray-500'}"></span>
                                <span class="text-xs text-gray-500 capitalize">{bot.status}</span>
                            </div>
                        </div>
                        <!-- Delete button (only for owner) -->
                        {#if $session.data?.user?.id === bot.userId}
                            <button 
                                onclick={(e) => confirmDelete(bot, e)}
                                class="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                                title="Delete Bot"
                            >
                                <span class="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                        {/if}
                    </div>
                    <div class="flex gap-2">
                        <button 
                            onclick={(e) => openManageModal(bot, e)} 
                            class="flex-1 py-2 px-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                            <span class="material-symbols-outlined text-[16px]">settings</span>
                            Manage
                        </button>
                        <a 
                            href="/bots/{bot.id}/studio"
                            class="flex-1 py-2 px-3 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2">
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
