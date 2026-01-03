<script lang="ts">
    import { Handle, Position } from '@xyflow/svelte';

    let { data } : { data: { 
        label: string; 
        icon: string; 
        color: string;
        provider?: string;
        apiKey?: string;
        models?: Record<string, string>;
    } } = $props();

    // Provider display name
    const providerNames: Record<string, string> = {
        openai: 'OpenAI',
        gemini: 'Gemini',
        azure: 'Azure OpenAI',
        claude: 'Claude',
        groq: 'Groq',
        mistral: 'Mistral AI',
        cohere: 'Cohere',
        perplexity: 'Perplexity',
        deepseek: 'DeepSeek',
        xai: 'xAI (Grok)',
        together: 'Together AI',
        fireworks: 'Fireworks',
        replicate: 'Replicate',
        ai21: 'AI21 Labs',
        huggingface: 'HuggingFace',
        ollama: 'Ollama',
        zanai: 'Z.AI (智谱)',
        openrouter: 'OpenRouter'
    };

    let providerName = $derived(data.provider ? (providerNames[data.provider] || data.provider) : 'Not configured');
    let isConfigured = $derived(!!data.apiKey);
</script>

<Handle type="target" position={Position.Left} class="!bg-gray-500 !w-3 !h-3 !border-2 !border-dark-base" />

<div class="ai-provider-node rounded-xl border-2 shadow-lg bg-dark-surface" style="border-color: {data.color}20; min-width: 200px;">
    <div class="node-header px-3 py-2 rounded-t-lg flex items-center gap-2" style="background: linear-gradient(135deg, {data.color}20, {data.color}10);">
        <div class="size-7 rounded-md flex items-center justify-center" style="background: {data.color}30;">
            <span class="material-symbols-outlined text-[18px]" style="color: {data.color};">{data.icon || 'smart_toy'}</span>
        </div>
        <div class="flex flex-col">
            <span class="text-white font-semibold text-sm">{data.label || 'AI Provider'}</span>
            <span class="text-xs text-gray-400">{providerName}</span>
        </div>
        {#if isConfigured}
            <span class="ml-auto text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400">✓</span>
        {:else}
            <span class="ml-auto text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400">⚠</span>
        {/if}
    </div>
    <div class="node-body px-3 py-2 text-xs text-gray-400">
        {#if isConfigured}
            API Key configured
        {:else}
            Click to configure API key
        {/if}
    </div>
</div>

<Handle type="source" position={Position.Right} class="!bg-primary !w-3 !h-3 !border-2 !border-dark-base" />

<style>
    .ai-provider-node {
        font-family: inherit;
    }
</style>
