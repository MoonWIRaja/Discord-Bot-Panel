<script lang="ts">
    import { browser } from '$app/environment';
    import { useSvelteFlow } from '@xyflow/svelte';
    
    interface Props {
        hoveredEdge: { edgeId: string; centerX: number; centerY: number } | null;
        showDropdown: boolean;
        showConfirm: boolean;
        onDelete: () => void;
        onInsertNode: (type: string, label: string, icon: string, color: string) => void;
        onToggleDropdown: () => void;
        onShowConfirm: () => void;
        onCancel: () => void;
        onClose: () => void;
        onKeepOpen: () => void;
    }
    
    let { 
        hoveredEdge, 
        showDropdown, 
        showConfirm, 
        onDelete, 
        onInsertNode, 
        onToggleDropdown, 
        onShowConfirm, 
        onCancel, 
        onClose,
        onKeepOpen
    }: Props = $props();
    
    // Get SvelteFlow instance for coordinate conversion
    const flow = browser ? useSvelteFlow() : null;
    
    // Convert flow coordinates to screen coordinates
    const screenPos = $derived.by(() => {
        if (!hoveredEdge || !flow || !browser) return null;
        return flow.flowToScreenPosition({ x: hoveredEdge.centerX, y: hoveredEdge.centerY });
    });
    
    // Node options for insertion
    const nodes = [
        { label: 'Send Reply', type: 'action', icon: 'reply', color: '#3b82f6' },
        { label: 'Send DM', type: 'action', icon: 'mail', color: '#ec4899' },
        { label: 'Add Role', type: 'action', icon: 'admin_panel_settings', color: '#10b981' },
        { label: 'Remove Role', type: 'action', icon: 'person_remove', color: '#ef4444' },
        { label: 'Delay', type: 'action', icon: 'schedule', color: '#64748b' },
        { label: 'Custom Code', type: 'code', icon: 'code', color: '#f59e0b' }
    ];
</script>

{#if screenPos && browser}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div 
        class="fixed z-[9999]"
        style="left: {screenPos.x}px; top: {screenPos.y}px; transform: translate(-50%, -50%);"
        onmouseenter={onKeepOpen}
        onmouseleave={() => { if (!showDropdown && !showConfirm) onClose(); }}
    >
        {#if !showConfirm}
            <!-- Action Buttons -->
            <div class="flex items-center gap-3 bg-zinc-900 rounded-2xl px-4 py-2.5 shadow-2xl border border-zinc-700">
                <button 
                    type="button" 
                    class="size-12 rounded-xl bg-red-500 hover:bg-red-400 active:scale-95 text-white flex items-center justify-center transition-all"
                    onmousedown={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
                >
                    <span class="material-symbols-outlined text-[26px] pointer-events-none">delete</span>
                </button>
                <button 
                    type="button" 
                    class="size-12 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white flex items-center justify-center transition-colors"
                    onclick={onToggleDropdown}
                >
                    <span class="material-symbols-outlined text-[26px]">{showDropdown ? 'close' : 'add'}</span>
                </button>
            </div>
        {/if}
        
        <!-- Delete Confirmation -->
        {#if showConfirm}
            <div class="bg-zinc-900 rounded-2xl p-5 shadow-2xl border border-zinc-700 text-center min-w-[220px]">
                <p class="text-white font-medium mb-4">Delete this connection?</p>
                <div class="flex gap-3">
                    <button type="button" class="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold transition-colors" onclick={onDelete}>
                        Delete
                    </button>
                    <button type="button" class="flex-1 py-2.5 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-white font-bold transition-colors" onclick={onCancel}>
                        Cancel
                    </button>
                </div>
            </div>
        {/if}
        
        <!-- Node Dropdown -->
        {#if showDropdown}
            <div class="mt-3 bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-700 overflow-hidden w-[220px]">
                <div class="px-4 py-2.5 bg-zinc-800 border-b border-zinc-700 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Insert Node
                </div>
                {#each nodes as node}
                    <button 
                        type="button"
                        class="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-200 hover:bg-white/10 transition-colors text-left"
                        onclick={() => onInsertNode(node.type, node.label, node.icon, node.color)}
                    >
                        <div class="size-8 rounded-lg flex items-center justify-center" style="background: {node.color}30">
                            <span class="material-symbols-outlined text-lg" style="color: {node.color}">{node.icon}</span>
                        </div>
                        <span class="font-medium">{node.label}</span>
                    </button>
                {/each}
            </div>
        {/if}
    </div>
{/if}
