<script lang="ts">
    import { page } from '$app/stores';
    import { api } from '$lib/api';
    import { goto } from '$app/navigation';

    let token = $state('');
    let loading = $state(false);
    let validating = $state(false);
    let error = $state<string | null>(null);
    let validatedBot = $state<{ id: string; username: string; discriminator: string; avatar: string | null } | null>(null);

    async function handleValidate() {
        if (!token.trim()) return;
        
        validating = true;
        error = null;

        try {
            const botData = await api.validateToken(token);
            validatedBot = botData;
        } catch (e: any) {
            console.error("Token validation failed:", e);
            error = e.message;
        } finally {
            validating = false;
        }
    }

    async function handleAddBot() {
        if (!token.trim() || !validatedBot) return;

        loading = true;
        error = null;

        try {
            const bot = await api.createBot(token);
            await goto(`/bots/${bot.id}/studio`);
        } catch (e: any) {
            console.error("Bot creation failed:", e);
            error = e.message;
        } finally {
            loading = false;
        }
    }

    function cancelValidation() {
        validatedBot = null;
        token = '';
    }
</script>

<div class="bg-background-light dark:bg-background-dark font-display text-bot-primary overflow-hidden h-screen flex relative">
    <!-- Static Sidebar Replica (to form background) -->
    <aside class="w-64 bg-slate-900 text-gray-400 hidden md:flex flex-col h-full shrink-0">
         <div class="h-16 flex items-center px-6 gap-3 text-white border-b border-white/10">
            <div class="size-8 rounded-lg bg-white/10 flex items-center justify-center text-white">
                <span class="material-symbols-outlined text-[20px]">smart_toy</span>
            </div>
            <h1 class="text-lg font-bold tracking-tight">BotPanel</h1>
        </div>
        <div class="p-4">
             <div class="h-8 bg-white/5 rounded w-3/4 mb-4"></div>
             <div class="h-4 bg-white/5 rounded w-1/2 mb-2"></div>
             <div class="h-4 bg-white/5 rounded w-2/3"></div>
        </div>
    </aside>
    
    <!-- Static Content Replica -->
    <main class="flex-1 flex flex-col h-full min-w-0 bg-background-light dark:bg-[#101022] p-6 opacity-30 pointer-events-none select-none filter blur-sm">
         <div class="h-16 w-full bg-white dark:bg-[#202020] rounded-lg mb-8"></div>
         <div class="grid grid-cols-3 gap-4">
             <div class="h-32 bg-white dark:bg-[#202020] rounded-xl"></div>
             <div class="h-32 bg-white dark:bg-[#202020] rounded-xl"></div>
             <div class="h-32 bg-white dark:bg-[#202020] rounded-xl"></div>
         </div>
    </main>

    <!-- Modal Overlay -->
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <a href="/dashboard" aria-label="Close modal" class="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity cursor-default"></a>
        
        {#if !validatedBot}
            <!-- Step 1: Input Token -->
            <div class="relative w-full max-w-lg bg-[#111111] text-gray-100 rounded-2xl shadow-2xl border border-gray-800 transform transition-all scale-100 animate-scaleIn">
                <div class="flex items-center justify-between p-6 border-b border-gray-800">
                    <h3 class="text-xl font-bold text-white tracking-tight">Connect New Bot</h3>
                    <a href="/dashboard" class="text-gray-500 hover:text-white transition-colors">
                        <span class="material-symbols-outlined">close</span>
                    </a>
                </div>
                <div class="p-6">
                    {#if error}
                        <div class="mb-5 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm flex items-start gap-3">
                             <span class="material-symbols-outlined text-[20px] shrink-0">error</span>
                             <span>{error}</span>
                        </div>
                    {/if}

                    <div class="space-y-5">
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2" for="bot-token">
                                Discord Bot Token
                            </label>
                            <div class="relative group">
                                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span class="material-symbols-outlined text-gray-500 text-[20px]">key</span>
                                </div>
                                <input bind:value={token} class="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg pl-10 pr-10 py-3 text-white placeholder-gray-600 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all shadow-inner font-mono text-sm" id="bot-token" placeholder="Enter your bot token here..." type="password"/>
                            </div>
                            <p class="mt-2 text-xs text-gray-500">Found in Discord Developer Portal > Bot > Reset Token</p>
                        </div>
                        
                        <div class="flex items-start gap-3 p-4 rounded-lg bg-[#1a1a1a] border border-amber-500/20">
                            <span class="material-symbols-outlined text-amber-500 text-[20px] shrink-0">verified_user</span>
                            <div class="text-xs text-gray-400 leading-relaxed">
                                We'll validate this token with Discord to fetch your bot's profile. Your token is encrypted before storage.
                            </div>
                        </div>
                    </div>
                </div>
                <div class="flex items-center justify-end gap-3 p-6 pt-2 border-t border-gray-800/50">
                    <a href="/dashboard" class="px-5 py-2.5 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors {validating ? 'pointer-events-none opacity-50' : ''}">
                        Cancel
                    </a>
                    <button onclick={handleValidate} disabled={validating || !token} class="px-6 py-2.5 bg-white text-black rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.1)] disabled:opacity-50 disabled:cursor-not-allowed">
                        {#if validating}
                            <span class="size-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                            <span>Validating...</span>
                        {:else}
                            <span>Next: Verify Profile</span>
                            <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
                        {/if}
                    </button>
                </div>
            </div>
        {:else}
            <!-- Step 2: Confirmation -->
            <div class="relative w-full max-w-lg bg-[#111111] text-gray-100 rounded-2xl shadow-2xl border border-gray-800 transform transition-all scale-100 animate-scaleIn">
                <div class="flex items-center justify-between p-6 border-b border-gray-800">
                    <h3 class="text-xl font-bold text-white tracking-tight">Confirm Bot Identity</h3>
                    <button onclick={() => validatedBot = null} class="text-gray-500 hover:text-white transition-colors">
                        <span class="material-symbols-outlined">arrow_back</span>
                    </button>
                </div>
                <div class="p-8 flex flex-col items-center text-center">
                    {#if validatedBot.avatar}
                        <div class="size-24 rounded-full bg-cover bg-center shadow-2xl ring-4 ring-indigo-500/20 mb-4" style="background-image: url('https://cdn.discordapp.com/avatars/{validatedBot.id}/{validatedBot.avatar}.png');"></div>
                    {:else}
                        <div class="size-24 rounded-full bg-slate-700 flex items-center justify-center text-3xl font-bold text-white mb-4 ring-4 ring-indigo-500/20">
                            {validatedBot.username.charAt(0)}
                        </div>
                    {/if}
                    
                    <h2 class="text-2xl font-bold text-white mb-1">{validatedBot.username}</h2>
                    <p class="text-gray-500 text-sm font-mono mb-6">ID: {validatedBot.id}</p>

                    <div class="w-full bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center justify-center gap-2 text-green-400 text-sm font-medium">
                        <span class="material-symbols-outlined text-[18px]">check_circle</span>
                        Token Validated Successfully
                    </div>
                </div>
                <div class="flex items-center justify-end gap-3 p-6 pt-2 border-t border-gray-800/50">
                    <button onclick={() => validatedBot = null} class="px-5 py-2.5 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors {loading ? 'pointer-events-none opacity-50' : ''}">
                        Back
                    </button>
                    <button onclick={handleAddBot} disabled={loading} class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold transition-all shadow-lg shadow-indigo-500/25 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        {#if loading}
                            <span class="size-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                            <span>Adding...</span>
                        {:else}
                            <span class="material-symbols-outlined text-[18px]">add</span>
                            <span>Add Bot</span>
                        {/if}
                    </button>
                </div>
            </div>
        {/if}
    </div>
</div>
