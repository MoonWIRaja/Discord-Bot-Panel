<script lang="ts">
    import { onMount } from 'svelte';
    import { api } from '$lib/api';
    
    let allBots = $state<any[]>([]);
    let loading = $state(true);
    let pagination = $state({ page: 1, limit: 20, total: 0, pages: 0 });
    
    onMount(async () => {
        await loadBots();
    });
    
    async function loadBots() {
        loading = true;
        try {
            const response = await api.get(`/admin/bots?page=${pagination.page}`);
            allBots = response.bots;
            pagination = response.pagination;
        } catch (error) {
            console.error('Failed to load bots:', error);
        } finally {
            loading = false;
        }
    }
    
    async function deleteBot(botId: string) {
        if (!confirm('Are you sure you want to delete this bot?')) return;
        try {
            await api.delete(`/admin/bots/${botId}`);
            await loadBots();
        } catch (error) {
            console.error('Failed to delete bot:', error);
        }
    }
    
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
</script>

<div class="flex flex-col gap-4 sm:gap-6">
    <div class="flex items-center justify-between">
        <div>
            <h1 class="text-xl sm:text-2xl font-bold text-white">All Bots</h1>
            <p class="text-gray-500 text-sm sm:text-base">Monitor and manage all bots in the system</p>
        </div>
    </div>
    
    <!-- Stats -->
    <div class="grid grid-cols-3 gap-4">
        <div class="bg-dark-card rounded-xl border border-dark-border p-4">
            <p class="text-gray-500 text-sm">Total Bots</p>
            <p class="text-2xl font-bold text-white">{pagination.total}</p>
        </div>
        <div class="bg-dark-card rounded-xl border border-dark-border p-4">
            <p class="text-gray-500 text-sm">Online</p>
            <p class="text-2xl font-bold text-emerald-400">{allBots.filter(b => b.bot?.status === 'online').length}</p>
        </div>
        <div class="bg-dark-card rounded-xl border border-dark-border p-4">
            <p class="text-gray-500 text-sm">Offline</p>
            <p class="text-2xl font-bold text-gray-400">{allBots.filter(b => b.bot?.status !== 'online').length}</p>
        </div>
    </div>
    
    <!-- Bots Table -->
    <div class="bg-dark-card rounded-xl border border-dark-border overflow-hidden">
        <div class="overflow-x-auto">
        <table class="w-full min-w-[500px]">
            <thead class="bg-dark-surface border-b border-dark-border">
                <tr>
                    <th class="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-500 uppercase">Bot</th>
                    <th class="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-500 uppercase">Owner</th>
                    <th class="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                    <th class="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-500 uppercase hidden sm:table-cell">Created</th>
                    <th class="px-4 sm:px-6 py-3 sm:py-4 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-dark-border">
                {#if loading}
                    <tr><td colspan="5" class="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
                {:else if allBots.length === 0}
                    <tr><td colspan="5" class="px-6 py-8 text-center text-gray-500">No bots found</td></tr>
                {:else}
                    {#each allBots as item}
                        <tr class="hover:bg-white/5">
                            <td class="px-6 py-4">
                                <div class="flex items-center gap-3">
                                    {#if getAvatarUrl(item.bot)}
                                        <img 
                                            src={getAvatarUrl(item.bot)} 
                                            alt={item.bot?.name || 'Bot'} 
                                            class="size-10 rounded-full object-cover"
                                            onerror={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
                                        />
                                        <div class="size-10 rounded-full bg-emerald-500/20 hidden items-center justify-center">
                                            <span class="material-symbols-outlined text-emerald-400">smart_toy</span>
                                        </div>
                                    {:else}
                                        <div class="size-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                            <span class="material-symbols-outlined text-emerald-400">smart_toy</span>
                                        </div>
                                    {/if}
                                    <div>
                                        <p class="text-white font-medium">{item.bot?.name || 'Unknown'}</p>
                                        <p class="text-gray-500 text-xs">{item.bot?.clientId || 'No ID'}</p>
                                    </div>
                                </div>
                            </td>
                            <td class="px-6 py-4">
                                <p class="text-white">{item.owner?.name || 'Unknown'}</p>
                                <p class="text-gray-500 text-xs">{item.owner?.email || ''}</p>
                            </td>
                            <td class="px-6 py-4">
                                <span class="px-2 py-1 rounded text-xs font-bold uppercase {
                                    item.bot?.status === 'online' ? 'bg-emerald-500/10 text-emerald-400' :
                                    item.bot?.status === 'error' ? 'bg-red-500/10 text-red-400' :
                                    'bg-gray-500/10 text-gray-400'
                                }">
                                    {item.bot?.status || 'offline'}
                                </span>
                            </td>
                            <td class="px-4 sm:px-6 py-3 sm:py-4 text-gray-400 text-sm hidden sm:table-cell">
                                {item.bot?.createdAt ? new Date(item.bot.createdAt).toLocaleDateString() : '-'}
                            </td>
                            <td class="px-6 py-4 text-right">
                                <button onclick={() => deleteBot(item.bot?.id)} class="p-2 text-gray-400 hover:text-red-400">
                                    <span class="material-symbols-outlined text-[20px]">delete</span>
                                </button>
                            </td>
                        </tr>
                    {/each}
                {/if}
            </tbody>
        </table>
        </div>
    </div>
</div>
