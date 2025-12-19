<script lang="ts">
    import { api } from '$lib/api';
    import { scale } from 'svelte/transition';

    let {
        show = $bindable(false),
        botId,
        botName,
        botAvatar,
        botClientId,
        isOwner = false
    } : {
        show: boolean;
        botId: string;
        botName: string;
        botAvatar: string | null;
        botClientId: string | null;
        isOwner: boolean;
    } = $props();

    let activeTab = $state<'profile' | 'users'>('profile');
    let collaborators = $state<any[]>([]);
    let loadingCollaborators = $state(false);
    let searchQuery = $state('');
    let searchResults = $state<any[]>([]);
    let searching = $state(false);
    let selectedUser = $state<any>(null);
    let addingUser = $state(false);
    let error = $state('');

    async function loadCollaborators() {
        loadingCollaborators = true;
        try {
            collaborators = await api.getCollaborators(botId);
        } catch (e) {
            console.error('Failed to load collaborators', e);
        } finally {
            loadingCollaborators = false;
        }
    }

    async function searchUsers() {
        if (searchQuery.length < 2) return;
        searching = true;
        try {
            searchResults = await api.searchUsers(searchQuery);
        } catch (e) {
            console.error('Failed to search users', e);
        } finally {
            searching = false;
        }
    }

    async function confirmAddUser() {
        if (!selectedUser) return;
        addingUser = true;
        error = '';
        try {
            await api.addCollaborator(botId, selectedUser.id, 'editor');
            selectedUser = null;
            searchQuery = '';
            searchResults = [];
            await loadCollaborators();
        } catch (e: any) {
            error = e.message || 'Failed to add user';
        } finally {
            addingUser = false;
        }
    }

    async function removeUser(collaboratorId: string) {
        try {
            await api.removeCollaborator(botId, collaboratorId);
            await loadCollaborators();
        } catch (e: any) {
            error = e.message || 'Failed to remove user';
        }
    }

    function close() {
        show = false;
        activeTab = 'profile';
        selectedUser = null;
        searchQuery = '';
        searchResults = [];
        error = '';
    }

    $effect(() => {
        if (show && activeTab === 'users') {
            loadCollaborators();
        }
    });
</script>

{#if show}
<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <button type="button" class="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-default" onclick={close} aria-label="Close modal"></button>
    
    <div transition:scale={{duration: 200, start: 0.95}} class="relative w-full max-w-2xl bg-dark-surface rounded-2xl border border-dark-border shadow-2xl flex overflow-hidden max-h-[80vh]">
        <!-- Sidebar -->
        <div class="w-48 bg-dark-base border-r border-dark-border p-4 flex flex-col gap-2 shrink-0">
            <h2 class="text-sm font-bold text-gray-500 uppercase tracking-wider px-3 mb-2">Bot Settings</h2>
            <button 
                onclick={() => activeTab = 'profile'} 
                class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors {activeTab === 'profile' ? 'bg-primary text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}">
                <span class="material-symbols-outlined text-[18px]">smart_toy</span>
                Profile
            </button>
            <button 
                onclick={() => activeTab = 'users'} 
                class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors {activeTab === 'users' ? 'bg-primary text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}">
                <span class="material-symbols-outlined text-[18px]">group</span>
                Users
            </button>
        </div>

        <!-- Content -->
        <div class="flex-1 flex flex-col overflow-hidden">
            <!-- Header -->
            <div class="px-6 py-4 border-b border-dark-border flex items-center justify-between">
                <h3 class="text-lg font-bold text-white">
                    {activeTab === 'profile' ? 'Bot Profile' : 'Manage Users'}
                </h3>
                <button onclick={close} class="p-1 text-gray-500 hover:text-white transition-colors rounded">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>

            <!-- Body -->
            <div class="flex-1 overflow-y-auto p-6">
                {#if activeTab === 'profile'}
                    <!-- Bot Profile -->
                    <div class="flex items-center gap-4 mb-6">
                        {#if botAvatar && botClientId}
                            <div class="size-20 rounded-xl bg-cover bg-center ring-2 ring-dark-border" style="background-image: url('https://cdn.discordapp.com/avatars/{botClientId}/{botAvatar}.png');"></div>
                        {:else}
                            <div class="size-20 rounded-xl bg-gray-700 flex items-center justify-center ring-2 ring-dark-border">
                                <span class="text-3xl font-bold text-white">{botName.charAt(0)}</span>
                            </div>
                        {/if}
                        <div>
                            <h4 class="text-xl font-bold text-white">{botName}</h4>
                            <p class="text-sm text-gray-500">Discord Bot</p>
                        </div>
                    </div>
                    
                    <div class="space-y-4">
                        <div class="bg-dark-base rounded-lg p-4 border border-dark-border">
                            <span class="text-xs font-bold text-gray-500 uppercase">Bot ID</span>
                            <p class="text-white font-mono text-sm mt-1">{botClientId || 'N/A'}</p>
                        </div>
                        <div class="bg-dark-base rounded-lg p-4 border border-dark-border">
                            <span class="text-xs font-bold text-gray-500 uppercase">Status</span>
                            <p class="text-green-400 text-sm mt-1 flex items-center gap-2">
                                <span class="size-2 rounded-full bg-green-500"></span>
                                Ready
                            </p>
                        </div>
                    </div>

                    <!-- Studio Button -->
                    <div class="mt-6 pt-6 border-t border-dark-border">
                        <a href="/bots/{botId}/studio" class="w-full flex items-center justify-center gap-3 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-primary/20">
                            <span class="material-symbols-outlined">code</span>
                            Open Studio
                        </a>
                        <p class="text-center text-gray-500 text-xs mt-2">Build flows and automations for this bot</p>
                    </div>

                {:else if activeTab === 'users'}
                    <!-- User Management -->
                    {#if isOwner}
                        <div class="mb-6">
                            <label for="user-search" class="text-sm font-medium text-gray-400 mb-2 block">Add User by Discord Name or Email</label>
                            <div class="flex gap-2">
                                <input 
                                    id="user-search"
                                    bind:value={searchQuery}
                                    onkeydown={(e) => e.key === 'Enter' && searchUsers()}
                                    class="flex-1 bg-dark-base border border-dark-border rounded-lg px-4 py-2 text-white placeholder-gray-600 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                                    placeholder="Search by Discord name or email..."
                                />
                                <button onclick={searchUsers} disabled={searching || searchQuery.length < 2} class="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium text-sm disabled:opacity-50">
                                    {searching ? 'Searching...' : 'Search'}
                                </button>
                            </div>
                        </div>

                        {#if selectedUser}
                            <!-- Confirm Add User -->
                            <div class="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6">
                                <p class="text-sm text-green-400 mb-3">Confirm adding this user:</p>
                                <div class="flex items-center gap-4 mb-4">
                                    {#if selectedUser.image}
                                        <div class="size-12 rounded-full bg-cover bg-center ring-2 ring-green-500/30" style="background-image: url('{selectedUser.image}');"></div>
                                    {:else}
                                        <div class="size-12 rounded-full bg-gray-700 flex items-center justify-center ring-2 ring-green-500/30">
                                            <span class="text-lg font-bold text-white">{selectedUser.name.charAt(0)}</span>
                                        </div>
                                    {/if}
                                    <div>
                                        <p class="font-bold text-white">{selectedUser.name}</p>
                                        <p class="text-sm text-gray-400">{selectedUser.email}</p>
                                    </div>
                                </div>
                                <div class="flex gap-2">
                                    <button onclick={() => selectedUser = null} class="flex-1 py-2 rounded-lg bg-white/5 text-gray-400 hover:text-white font-medium text-sm">
                                        Cancel
                                    </button>
                                    <button onclick={confirmAddUser} disabled={addingUser} class="flex-1 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold text-sm disabled:opacity-50">
                                        {addingUser ? 'Adding...' : 'Confirm Add'}
                                    </button>
                                </div>
                            </div>
                        {:else if searchResults.length > 0}
                            <!-- Search Results -->
                            <div class="mb-6 space-y-2">
                                <p class="text-sm text-gray-500 mb-2">Search Results:</p>
                                {#each searchResults as user}
                                    <button onclick={() => selectedUser = user} class="w-full flex items-center gap-3 p-3 bg-dark-base rounded-lg border border-dark-border hover:border-primary/50 text-left transition-colors">
                                        {#if user.image}
                                            <div class="size-10 rounded-full bg-cover bg-center" style="background-image: url('{user.image}');"></div>
                                        {:else}
                                            <div class="size-10 rounded-full bg-gray-700 flex items-center justify-center">
                                                <span class="font-bold text-white">{user.name.charAt(0)}</span>
                                            </div>
                                        {/if}
                                        <div class="flex-1 min-w-0">
                                            <p class="font-medium text-white truncate">{user.name}</p>
                                            <p class="text-sm text-gray-500 truncate">{user.email}</p>
                                        </div>
                                        <span class="text-xs text-primary">Select</span>
                                    </button>
                                {/each}
                            </div>
                        {/if}

                        {#if error}
                            <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 text-red-400 text-sm">
                                {error}
                            </div>
                        {/if}
                    {/if}

                    <!-- Current Collaborators -->
                    <div>
                        <h4 class="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Current Users</h4>
                        {#if loadingCollaborators}
                            <div class="animate-pulse space-y-2">
                                <div class="h-14 bg-white/5 rounded-lg"></div>
                                <div class="h-14 bg-white/5 rounded-lg"></div>
                            </div>
                        {:else if collaborators.length === 0}
                            <p class="text-gray-500 text-sm">No collaborators yet.</p>
                        {:else}
                            <div class="space-y-2">
                                {#each collaborators as collab}
                                    <div class="flex items-center gap-3 p-3 bg-dark-base rounded-lg border border-dark-border">
                                        {#if collab.user.image}
                                            <div class="size-10 rounded-full bg-cover bg-center" style="background-image: url('{collab.user.image}');"></div>
                                        {:else}
                                            <div class="size-10 rounded-full bg-gray-700 flex items-center justify-center">
                                                <span class="font-bold text-white">{collab.user.name.charAt(0)}</span>
                                            </div>
                                        {/if}
                                        <div class="flex-1 min-w-0">
                                            <p class="font-medium text-white truncate">{collab.user.name}</p>
                                            <p class="text-xs text-gray-500">{collab.role === 'owner' ? 'Owner' : 'Editor'}</p>
                                        </div>
                                        {#if isOwner && collab.role !== 'owner'}
                                            <button onclick={() => removeUser(collab.id)} class="text-red-400 hover:text-red-300 text-sm">
                                                Remove
                                            </button>
                                        {/if}
                                    </div>
                                {/each}
                            </div>
                        {/if}
                    </div>
                {/if}
            </div>
        </div>
    </div>
</div>
{/if}
