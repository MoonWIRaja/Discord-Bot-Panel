<script lang="ts">
    import { Handle, Position } from '@xyflow/svelte';

    let { data } : { data: { 
        label: string; 
        icon: string; 
        color: string;
        mode?: string;
        provider?: string;
        models?: string[];
        command?: 'aichat' | 'aiimage';
    } } = $props();

    // Mode display names
    const modeNames: Record<string, { name: string, icon: string }> = {
        chat: { name: 'Chat', icon: '💬' },
        image: { name: 'Image', icon: '🎨' },
        code: { name: 'Code', icon: '💻' },
        debug: { name: 'Debug', icon: '🔧' }
    };

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
        ollama: 'Ollama'
    };

    let modeInfo = $derived(data.mode ? modeNames[data.mode] : null);
    let providerName = $derived(data.provider ? (providerNames[data.provider] || data.provider) : 'Auto');
    let modelCount = $derived(data.models?.length || 0);
    let commandLabel = $derived(data.command === 'aichat' ? '/aichat' : data.command === 'aiimage' ? '/aiimage' : 'Not linked');
</script>

<Handle type="target" position={Position.Left} class="!bg-gray-500 !w-3 !h-3 !border-2 !border-dark-base" />

<div class="ai-mode-node rounded-xl border-2 shadow-lg bg-dark-surface" style="border-color: {data.color}20; min-width: 220px;">
    <div class="node-header px-3 py-2 rounded-t-lg flex items-center gap-2" style="background: linear-gradient(135deg, {data.color}20, {data.color}10);">
        <div class="size-7 rounded-md flex items-center justify-center" style="background: {data.color}30;">
            <span class="text-lg">{modeInfo?.icon || data.icon || '🤖'}</span>
        </div>
        <div class="flex flex-col">
            <span class="text-white font-semibold text-sm">{data.label || 'AI Mode'}</span>
            <span class="text-xs text-gray-400">{modeInfo?.name || 'Not configured'}</span>
        </div>
    </div>
    <div class="node-body px-3 py-2 text-xs space-y-1">
        <div class="flex justify-between">
            <span class="text-gray-500">Provider:</span>
            <span class="text-gray-300">{providerName}</span>
        </div>
        <div class="flex justify-between">
            <span class="text-gray-500">Models:</span>
            <span class="text-gray-300">{modelCount} selected</span>
        </div>
        <div class="flex justify-between">
            <span class="text-gray-500">Command:</span>
            <span class="text-primary font-mono">{commandLabel}</span>
        </div>
    </div>
</div>

<Handle type="source" position={Position.Right} class="!bg-primary !w-3 !h-3 !border-2 !border-dark-base" />

<style>
    .ai-mode-node {
        font-family: inherit;
    }
</style>
