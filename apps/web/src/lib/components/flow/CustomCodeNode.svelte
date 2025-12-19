<script lang="ts">
    import { Handle, Position } from '@xyflow/svelte';

    let { data } : { data: { label: string; code?: string } } = $props();
</script>

<Handle type="target" position={Position.Left} class="!bg-gray-500 !w-3 !h-3 !border-2 !border-dark-base" />

<div class="code-node rounded-xl border-2 border-amber-500/20 shadow-lg bg-dark-surface min-w-[200px]">
    <div class="node-header px-3 py-2 rounded-t-lg flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-amber-500/10">
        <div class="size-6 rounded-md flex items-center justify-center bg-amber-500/30">
            <span class="material-symbols-outlined text-[16px] text-amber-500">code</span>
        </div>
        <span class="text-white font-semibold text-sm">{data.label}</span>
    </div>
    <div class="node-body p-2">
        <div class="bg-dark-base rounded-lg p-2 font-mono text-xs text-gray-400 max-h-[60px] overflow-hidden">
            <span class="text-amber-400">// Node.js / discord.js</span><br/>
            <span class="text-gray-500">client.on('ready', ...)</span>
        </div>
    </div>
</div>

<Handle type="source" position={Position.Right} class="!bg-amber-500 !w-3 !h-3 !border-2 !border-dark-base" />

<style>
    .code-node {
        font-family: inherit;
    }
</style>
