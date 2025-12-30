<script lang="ts">
    import { useSession } from '$lib/auth';
    import { api } from '$lib/api';
    import { goto } from '$app/navigation';
    
    const session = useSession();
    
    let searchQuery = $state('');
    let searchResults = $state<{ bots: any[], flows: any[] }>({ bots: [], flows: [] });
    let showDropdown = $state(false);
    let searching = $state(false);
    let searchTimeout: ReturnType<typeof setTimeout> | null = null;
    
    // Debounced search
    function handleSearch() {
        if (searchTimeout) clearTimeout(searchTimeout);
        
        if (!searchQuery.trim()) {
            searchResults = { bots: [], flows: [] };
            showDropdown = false;
            return;
        }
        
        searchTimeout = setTimeout(async () => {
            searching = true;
            try {
                // Search bots
                const allBots = await api.get('/bots');
                const filteredBots = allBots.filter((bot: any) => 
                    bot.name.toLowerCase().includes(searchQuery.toLowerCase())
                ).slice(0, 5);
                
                // Search flows (get flows from all bots)
                let allFlows: any[] = [];
                for (const bot of allBots.slice(0, 10)) { // Limit to prevent too many API calls
                    try {
                        const flows = await api.get(`/flows/${bot.id}`);
                        allFlows = allFlows.concat(flows.map((f: any) => ({ ...f, botName: bot.name, botId: bot.id })));
                    } catch (e) {
                        // Ignore individual flow errors
                    }
                }
                const filteredFlows = allFlows.filter((flow: any) => 
                    flow.name.toLowerCase().includes(searchQuery.toLowerCase())
                ).slice(0, 5);
                
                searchResults = { bots: filteredBots, flows: filteredFlows };
                showDropdown = true;
            } catch (error) {
                console.error('Search failed:', error);
            } finally {
                searching = false;
            }
        }, 300); // 300ms debounce
    }
    
    function selectResult(type: 'bot' | 'flow', item: any) {
        showDropdown = false;
        searchQuery = '';
        if (type === 'bot') {
            goto(`/bots/${item.id}/panel`);
        } else {
            goto(`/bots/${item.botId}/studio`);
        }
    }
    
    function handleBlur() {
        // Delay hide to allow click on results
        setTimeout(() => {
            showDropdown = false;
        }, 200);
    }
</script>

<header class="h-16 bg-dark-surface border-b border-dark-border flex items-center justify-between px-6 shrink-0 z-10">
    <div class="flex-1 max-w-md">
        <div class="relative group">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors">
                {#if searching}
                    <span class="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                {:else}
                    <span class="material-symbols-outlined text-[20px]">search</span>
                {/if}
            </span>
            <input 
                bind:value={searchQuery}
                oninput={handleSearch}
                onfocus={() => searchQuery && (showDropdown = true)}
                onblur={handleBlur}
                class="w-full bg-dark-base border border-dark-border text-sm rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-600 focus:ring-1 focus:ring-primary focus:border-primary transition-all" 
                placeholder="Search bots or flows..." 
                type="text"
            />
            
            <!-- Search Results Dropdown -->
            {#if showDropdown && (searchResults.bots.length > 0 || searchResults.flows.length > 0)}
                <div class="absolute top-full left-0 right-0 mt-2 bg-dark-card border border-dark-border rounded-lg shadow-xl overflow-hidden z-50">
                    <!-- Bots Section -->
                    {#if searchResults.bots.length > 0}
                        <div class="p-2 border-b border-dark-border">
                            <span class="text-xs text-gray-500 uppercase font-bold px-2">Bots</span>
                        </div>
                        {#each searchResults.bots as bot}
                            <button 
                                onclick={() => selectResult('bot', bot)}
                                class="w-full px-4 py-3 flex items-center gap-3 hover:bg-dark-border transition-colors text-left"
                            >
                                <span class="material-symbols-outlined text-amber-400">smart_toy</span>
                                <div>
                                    <div class="text-white font-medium">{bot.name}</div>
                                    <div class="text-xs text-gray-500">
                                        {bot.status === 'online' ? '🟢 Online' : '⚫ Offline'}
                                    </div>
                                </div>
                            </button>
                        {/each}
                    {/if}
                    
                    <!-- Flows Section -->
                    {#if searchResults.flows.length > 0}
                        <div class="p-2 border-b border-dark-border {searchResults.bots.length > 0 ? 'border-t' : ''}">
                            <span class="text-xs text-gray-500 uppercase font-bold px-2">Flows</span>
                        </div>
                        {#each searchResults.flows as flow}
                            <button 
                                onclick={() => selectResult('flow', flow)}
                                class="w-full px-4 py-3 flex items-center gap-3 hover:bg-dark-border transition-colors text-left"
                            >
                                <span class="material-symbols-outlined text-blue-400">account_tree</span>
                                <div>
                                    <div class="text-white font-medium">{flow.name}</div>
                                    <div class="text-xs text-gray-500">in {flow.botName}</div>
                                </div>
                            </button>
                        {/each}
                    {/if}
                </div>
            {/if}
            
            <!-- No Results -->
            {#if showDropdown && searchQuery && searchResults.bots.length === 0 && searchResults.flows.length === 0 && !searching}
                <div class="absolute top-full left-0 right-0 mt-2 bg-dark-card border border-dark-border rounded-lg shadow-xl p-4 text-center z-50">
                    <span class="material-symbols-outlined text-gray-500 text-3xl mb-2">search_off</span>
                    <p class="text-gray-500 text-sm">No results for "{searchQuery}"</p>
                </div>
            {/if}
        </div>
    </div>
    <div class="flex items-center gap-4 ml-6">
        {#if $session.data}
            <a href="/settings/profile" class="flex items-center gap-3 group">
                {#if $session.data.user.image}
                    <div class="size-9 rounded-full bg-cover bg-center ring-2 ring-dark-border group-hover:ring-primary/50 transition-all" style="background-image: url('{$session.data.user.image}')"></div>
                {:else}
                    <div class="size-9 rounded-full bg-gray-700 flex items-center justify-center ring-2 ring-dark-border group-hover:ring-primary/50 transition-all">
                        <span class="text-white font-bold text-sm">{$session.data.user.name.charAt(0)}</span>
                    </div>
                {/if}
                <span class="text-sm font-medium text-gray-400 group-hover:text-white transition-colors hidden lg:block">{$session.data.user.name}</span>
            </a>
        {:else}
            <div class="size-9 rounded-full bg-white/5 animate-pulse"></div>
        {/if}
    </div>
</header>
