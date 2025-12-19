<script lang="ts">
    import { Handle, Position } from '@xyflow/svelte';

    interface ReactionData {
        id: string;
        code: string;
        emoji: string;
    }

    let { data } : { 
        data: { 
            label: string; 
            icon: string; 
            color: string;
            eventType?: string;
            reactions?: ReactionData[];
        } 
    } = $props();

    // For reaction trigger, we need multiple output handles
    $effect(() => {
        // Reactions array for multiple outputs
    });
</script>

<div class="trigger-node rounded-xl border-2 shadow-lg bg-dark-surface" style="border-color: {data.color}20; min-width: 180px;">
    <div class="node-header px-3 py-2 rounded-t-lg flex items-center gap-2" style="background: linear-gradient(135deg, {data.color}20, {data.color}10);">
        <div class="size-6 rounded-md flex items-center justify-center" style="background: {data.color}30;">
            <span class="material-symbols-outlined text-[16px]" style="color: {data.color};">{data.icon}</span>
        </div>
        <span class="text-white font-semibold text-sm">{data.label}</span>
    </div>
    
    {#if data.eventType === 'messageReactionAdd' && data.reactions && data.reactions.length > 0}
        <!-- Reaction trigger with multiple outputs -->
        <div class="node-body px-2 py-1.5 space-y-1">
            {#each data.reactions as reaction, i}
                <div class="flex items-center justify-between text-xs bg-dark-base rounded px-2 py-1">
                    <span class="text-gray-300">{reaction.emoji || reaction.code}</span>
                    <span class="text-[10px] text-primary font-bold">OUT {i + 1}</span>
                </div>
            {/each}
        </div>
    {:else}
        <div class="node-body px-3 py-2 text-xs text-gray-400">
            {#if data.eventType === 'messageReactionAdd'}
                Add reactions in properties
            {:else if data.eventType === 'guildMemberAdd'}
                Triggers on member join
            {:else}
                Configure trigger settings
            {/if}
        </div>
    {/if}
</div>

<!-- Output handles -->
{#if data.eventType === 'messageReactionAdd' && data.reactions && data.reactions.length > 0}
    <!-- Multiple handles for each reaction -->
    {#each data.reactions as reaction, i}
        <Handle 
            type="source" 
            position={Position.Right} 
            id={`reaction-${reaction.id}`}
            class="!bg-green-500 !w-3 !h-3 !border-2 !border-dark-base"
            style="top: {52 + (i * 28)}px;"
        />
    {/each}
{:else}
    <!-- Single default output handle -->
    <Handle type="source" position={Position.Right} class="!bg-green-500 !w-3 !h-3 !border-2 !border-dark-base" />
{/if}

<style>
    .trigger-node {
        font-family: inherit;
    }
</style>
