<script lang="ts">
    import { onMount } from 'svelte';
    import { api } from '$lib/api';
    import { goto } from '$app/navigation';

    interface Template {
        id: string;
        name: string;
        description: string;
        category: string;
        icon: string;
        color: string;
        downloads: number;
    }

    interface Bot {
        id: string;
        name: string;
    }

    let templates = $state<Template[]>([]);
    let bots = $state<Bot[]>([]);
    let loading = $state(true);
    let selectedCategory = $state<string | null>(null);
    
    // Import modal state
    let showImportModal = $state(false);
    let selectedTemplate = $state<Template | null>(null);
    let selectedBotId = $state<string>('');
    let importing = $state(false);

    const categories = [
        { id: 'notification', label: 'Notification', icon: 'notifications', color: '#ef4444' },
        { id: 'music', label: 'Music', icon: 'music_note', color: '#22c55e' },
        { id: 'utility', label: 'Utility', icon: 'build', color: '#3b82f6' },
        { id: 'moderation', label: 'Moderation', icon: 'shield', color: '#f59e0b' },
        { id: 'fun', label: 'Fun', icon: 'celebration', color: '#ec4899' }
    ];

    onMount(async () => {
        try {
            templates = await api.getTemplates();
            bots = await api.getBots();
        } catch (e) {
            console.error('Failed to load templates:', e);
        } finally {
            loading = false;
        }
    });

    function openImportModal(template: Template) {
        selectedTemplate = template;
        selectedBotId = bots[0]?.id || '';
        showImportModal = true;
    }

    async function importTemplate() {
        if (!selectedTemplate || !selectedBotId) return;
        importing = true;
        try {
            await api.importTemplate(selectedTemplate.id, selectedBotId);
            showImportModal = false;
            goto(`/bots/${selectedBotId}/studio`);
        } catch (e) {
            console.error('Failed to import template:', e);
        } finally {
            importing = false;
        }
    }

    const filteredTemplates = $derived(
        selectedCategory 
            ? templates.filter(t => t.category === selectedCategory)
            : templates
    );
</script>

<div class="flex flex-col gap-8">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 class="text-3xl md:text-4xl font-black tracking-tight text-white mb-2">Templates</h1>
            <p class="text-gray-500">Pre-built bot flows ready to import and customize.</p>
        </div>
    </div>

    <!-- Category Filters -->
    <div class="flex flex-wrap gap-2">
        <button 
            onclick={() => selectedCategory = null}
            class="px-4 py-2 rounded-lg text-sm font-medium transition-colors {selectedCategory === null ? 'bg-primary text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}"
        >
            All
        </button>
        {#each categories as cat}
            <button 
                onclick={() => selectedCategory = cat.id}
                class="px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 {selectedCategory === cat.id ? 'bg-primary text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}"
            >
                <span class="material-symbols-outlined text-[18px]" style="color: {selectedCategory === cat.id ? 'white' : cat.color}">{cat.icon}</span>
                {cat.label}
            </button>
        {/each}
    </div>

    <!-- Templates Grid -->
    {#if loading}
        <div class="flex items-center justify-center py-20">
            <div class="size-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin"></div>
        </div>
    {:else if filteredTemplates.length === 0}
        <div class="flex flex-col items-center justify-center py-20 text-center">
            <div class="size-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <span class="material-symbols-outlined text-[32px] text-gray-600">folder_open</span>
            </div>
            <p class="text-gray-500">No templates found in this category.</p>
        </div>
    {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {#each filteredTemplates as template}
                <div class="bg-dark-surface border border-dark-border rounded-xl overflow-hidden hover:border-primary/50 transition-colors">
                    <!-- Header -->
                    <div class="p-6 pb-4">
                        <div class="flex items-start gap-4">
                            <div class="size-14 rounded-xl flex items-center justify-center shrink-0" style="background: {template.color}20">
                                <span class="material-symbols-outlined text-[28px]" style="color: {template.color}">{template.icon}</span>
                            </div>
                            <div class="flex-1 min-w-0">
                                <h3 class="text-lg font-bold text-white mb-1">{template.name}</h3>
                                <p class="text-sm text-gray-500 line-clamp-2">{template.description}</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Footer -->
                    <div class="px-6 py-4 border-t border-dark-border flex items-center justify-between">
                        <span class="text-xs text-gray-500 flex items-center gap-1">
                            <span class="material-symbols-outlined text-[14px]">download</span>
                            {template.downloads} imports
                        </span>
                        <button 
                            onclick={() => openImportModal(template)}
                            class="px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2"
                        >
                            <span class="material-symbols-outlined text-[18px]">add</span>
                            Import
                        </button>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>

<!-- Import Modal -->
{#if showImportModal && selectedTemplate}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <button type="button" class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick={() => showImportModal = false} aria-label="Close"></button>
        <div class="relative w-full max-w-md bg-dark-surface rounded-xl border border-dark-border shadow-2xl">
            <div class="p-6">
                <div class="flex items-center gap-4 mb-6">
                    <div class="size-12 rounded-xl flex items-center justify-center" style="background: {selectedTemplate.color}20">
                        <span class="material-symbols-outlined text-[24px]" style="color: {selectedTemplate.color}">{selectedTemplate.icon}</span>
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-white">Import Template</h3>
                        <p class="text-sm text-gray-500">{selectedTemplate.name}</p>
                    </div>
                </div>
                
                <div class="mb-6">
                    <label for="bot-select" class="block text-sm font-medium text-gray-400 mb-2">Select a bot to import to:</label>
                    <select 
                        id="bot-select"
                        bind:value={selectedBotId}
                        class="w-full bg-dark-base border border-dark-border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    >
                        {#each bots as bot}
                            <option value={bot.id}>{bot.name}</option>
                        {/each}
                    </select>
                </div>

                <div class="flex gap-3">
                    <button 
                        onclick={() => showImportModal = false}
                        class="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onclick={importTemplate}
                        disabled={importing || !selectedBotId}
                        class="flex-1 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {#if importing}
                            <div class="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        {:else}
                            <span class="material-symbols-outlined text-[18px]">download</span>
                            Import
                        {/if}
                    </button>
                </div>
            </div>
        </div>
    </div>
{/if}
