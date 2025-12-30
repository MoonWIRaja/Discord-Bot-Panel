<script lang="ts">
    import { page } from '$app/stores';
    import { onMount } from 'svelte';
    import { api } from '$lib/api';

    let id = $derived($page.params.id);
    let bot = $state<any>(null);
    let loading = $state(true);
    let saving = $state(false);
    let error = $state<string | null>(null);
    let success = $state<string | null>(null);

    // Form fields
    let displayName = $state('');

    async function loadBot() {
        if (!id) return;
        try {
            loading = true;
            const data = await api.getBot(id);
            bot = data;
            displayName = data.name;
        } catch (e: any) {
            console.error("Failed to load bot:", e);
            error = "Failed to load bot settings.";
        } finally {
            loading = false;
        }
    }

    async function saveChanges() {
        if (!displayName.trim() || !id) return;

        try {
            saving = true;
            error = null;
            success = null;
            
            await api.updateBot(id, displayName);
            
            // Refresh local data
            await loadBot();
            success = "Bot settings updated successfully!";
            
            // Clear success message after 3 seconds
            setTimeout(() => { success = null; }, 3000);
        } catch (e: any) {
            console.error("Failed to save bot:", e);
            error = e.message || "Failed to save changes.";
        } finally {
            saving = false;
        }
    }

    onMount(() => {
        loadBot();
    });
</script>

<div class="max-w-4xl mx-auto flex flex-col gap-8 pb-20">
    <!-- Page Heading -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div class="flex flex-col gap-2">
            <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">Bot Settings</h1>
            <p class="text-slate-500 dark:text-[#9d9db9] text-base">Configure identity, permissions, and integrations.</p>
        </div>
        {#if bot}
        <div class="flex items-center gap-2 px-3 py-1.5 rounded-full {bot.status === 'online' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-gray-500/10 border-gray-500/20 text-gray-400'} border text-sm font-medium">
            <span class="relative flex h-2.5 w-2.5">
                {#if bot.status === 'online'}
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                {:else}
                <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-gray-500"></span>
                {/if}
            </span>
            System {bot.status === 'online' ? 'Online' : 'Offline'}
        </div>
        {/if}
    </div>

    {#if loading}
        <div class="p-12 text-center text-gray-500">Loading settings...</div>
    {:else if !bot}
        <div class="p-6 bg-red-500/10 text-red-500 rounded-lg">Bot not found.</div>
    {:else}
        <!-- Alerts -->
        {#if error}
            <div class="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg flex items-center gap-2">
                <span class="material-symbols-outlined">error</span>
                {error}
            </div>
        {/if}
        {#if success}
            <div class="p-4 bg-green-500/10 border border-green-500/20 text-green-500 rounded-lg flex items-center gap-2">
                <span class="material-symbols-outlined">check_circle</span>
                {success}
            </div>
        {/if}

        <!-- Tabs -->
        <div class="w-full border-b border-slate-200 dark:border-bot-border">
            <div class="flex gap-6 overflow-x-auto">
                <button class="relative pb-3 pt-2 text-bot-primary border-b-2 border-bot-primary font-bold text-sm tracking-wide">
                    General
                </button>
                <button class="relative pb-3 pt-2 text-slate-500 dark:text-[#9d9db9] border-b-2 border-transparent hover:text-slate-800 dark:hover:text-white font-medium text-sm tracking-wide transition-colors">
                    Permissions
                </button>
                <button class="relative pb-3 pt-2 text-slate-500 dark:text-[#9d9db9] border-b-2 border-transparent hover:text-slate-800 dark:hover:text-white font-medium text-sm tracking-wide transition-colors">
                    Integrations
                </button>
                <button class="relative pb-3 pt-2 text-slate-500 dark:text-[#9d9db9] border-b-2 border-transparent hover:text-slate-800 dark:hover:text-white font-medium text-sm tracking-wide transition-colors">
                    Advanced
                </button>
            </div>
        </div>
        <!-- Tab Content: General -->
        <div class="flex flex-col gap-8">
            <!-- Section: Profile -->
            <section class="bg-white dark:bg-bot-surface rounded-xl border border-slate-200 dark:border-bot-border p-6 shadow-sm">
                <div class="flex flex-col gap-6">
                    <h2 class="text-lg font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-bot-border pb-3">Bot Identity</h2>
                    <div class="flex flex-col sm:flex-row gap-8 items-start">
                        <div class="flex flex-col items-center gap-3 shrink-0">
                            <!-- Helper for avatar fallback -->
                            {#if bot.avatar}
                                <div class="size-24 rounded-full bg-slate-100 dark:bg-bot-surface-lighter bg-center bg-cover border-2 border-slate-200 dark:border-bot-border" style='background-image: url("https://cdn.discordapp.com/avatars/{bot.id}/{bot.avatar}.png");'></div>
                            {:else}
                                <div class="size-24 rounded-full bg-slate-700 flex items-center justify-center text-4xl font-bold text-gray-400 border-2 border-slate-600">
                                    {bot.name.charAt(0)}
                                </div>
                            {/if}
                            <p class="text-xs text-slate-400 dark:text-[#6f6f88]">Managed via Discord</p>
                        </div>
                        <div class="flex flex-col gap-5 flex-1 w-full">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm font-semibold text-slate-700 dark:text-slate-200" for="display_name">Display Name</label>
                                    <input bind:value={displayName} id="display_name" class="w-full rounded-lg bg-slate-50 dark:bg-bot-bg-dark border border-slate-200 dark:border-bot-border px-3 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-bot-primary focus:border-transparent outline-none transition-shadow text-sm placeholder-slate-400" type="text"/>
                                    <p class="text-xs text-slate-400">Changing this will update your bot's username on Discord.</p>
                                </div>
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm font-semibold text-slate-700 dark:text-slate-200" for="prefix">Command Prefix</label>
                                    <input id="prefix" class="w-full rounded-lg bg-slate-50 dark:bg-bot-bg-dark border border-slate-200 dark:border-bot-border px-3 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-bot-primary focus:border-transparent outline-none transition-shadow text-sm font-mono placeholder-slate-400" type="text" value="!"/>
                                </div>
                            </div>
                            <!-- <div class="flex flex-col gap-1.5">
                                <label class="text-sm font-semibold text-slate-700 dark:text-slate-200" for="desc">Short Description</label>
                                <textarea id="desc" class="w-full rounded-lg bg-slate-50 dark:bg-bot-bg-dark border border-slate-200 dark:border-bot-border px-3 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-bot-primary focus:border-transparent outline-none transition-shadow text-sm placeholder-slate-400 resize-none" rows="3">An advanced moderation bot for Discord communities, helping keep chats clean and safe.</textarea>
                                <p class="text-xs text-slate-400 text-right">0/140</p>
                            </div> -->
                        </div>
                    </div>
                </div>
            </section>
        </div>
    {/if}
</div>

<!-- Sticky Footer Actions -->
{#if bot}
<div class="absolute bottom-0 left-0 w-full p-4 border-t border-slate-200 dark:border-bot-border bg-white/80 dark:bg-[#111118]/90 backdrop-blur-md z-30">
    <div class="max-w-4xl mx-auto flex items-center justify-between md:px-10 lg:px-20">
        <!-- <p class="text-xs text-slate-400 hidden sm:block">Last saved: 2 minutes ago</p> -->
        <div class="ml-auto flex gap-3">
            <button onclick={loadBot} disabled={saving} class="px-5 py-2.5 rounded-lg text-slate-600 dark:text-white hover:bg-slate-100 dark:hover:bg-bot-surface font-medium text-sm transition-colors disabled:opacity-50">
                Discard
            </button>
            <button onclick={saveChanges} disabled={saving} class="px-5 py-2.5 rounded-lg bg-bot-primary hover:bg-bot-primary-hover text-white font-medium text-sm shadow-lg shadow-bot-primary/25 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {#if saving}
                    <span class="size-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Saving...
                {:else}
                    <span class="material-symbols-outlined text-[18px]">save</span>
                    Save Changes
                {/if}
            </button>
        </div>
    </div>
</div>
{/if}
