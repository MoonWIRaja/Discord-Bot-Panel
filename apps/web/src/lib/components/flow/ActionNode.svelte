<script lang="ts">
    import { Handle, Position } from '@xyflow/svelte';

    let { data } : { data: { label: string; icon: string; color: string } } = $props();
</script>

<Handle type="target" position={Position.Left} class="!bg-gray-500 !w-3 !h-3 !border-2 !border-dark-base" />

<div class="action-node rounded-xl border-2 shadow-lg bg-dark-surface" style="border-color: {data.color}20; min-width: 180px;">
    <div class="node-header px-3 py-2 rounded-t-lg flex items-center gap-2" style="background: linear-gradient(135deg, {data.color}20, {data.color}10);">
        <div class="size-6 rounded-md flex items-center justify-center" style="background: {data.color}30;">
            <span class="material-symbols-outlined text-[16px]" style="color: {data.color};">{data.icon}</span>
        </div>
        <span class="text-white font-semibold text-sm">{data.label}</span>
    </div>
    <div class="node-body px-3 py-2 text-xs text-gray-400">
        Click to configure
    </div>
</div>

<Handle type="source" position={Position.Right} class="!bg-primary !w-3 !h-3 !border-2 !border-dark-base" />

<style>
    .action-node {
        font-family: inherit;
    }
</style>
