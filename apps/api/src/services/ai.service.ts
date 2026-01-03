/**
 * AI Service - Multi-provider AI with 16 providers and 13 modes
 * 
 * Providers: OpenAI, Gemini, Azure, Claude, Groq, Mistral, Cohere, 
 *            Perplexity, DeepSeek, xAI, Together, Fireworks, Replicate,
 *            AI21, HuggingFace, Ollama
 * 
 * Modes: Auto, Chat, Code, Debug, Image, Video, Audio, Music,
 *        Vision, Translate, Summarize, Research, Creative
 */

export interface ToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}

export interface AIMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string | null;
    tool_calls?: ToolCall[];
    tool_call_id?: string;
    name?: string;
}

export interface AIConfig {
    provider: string;
    apiKey: string;
    model?: string;
    mode?: string;
    systemPrompt?: string;
    tools?: any[]; // Tool definitions
    // Provider-specific
    azureEndpoint?: string;
    azureDeployment?: string;
    azureType?: 'auto' | 'openai' | 'anthropic' | 'serverless' | 'inference' | 'github' | 'responses' | 'custom';
    ollamaHost?: string;
}

export interface AIResponse {
    content: string;
    imageUrl?: string;
    videoUrl?: string;
    audioUrl?: string;
    error?: string;
    tokensUsed?: number | null;
    toolCalls?: ToolCall[];
}

export interface ProviderConfig {
    id: string;
    name: string;
    apiKey: string;
    models: {
        [mode: string]: string;  // mode -> selected model
    };
    endpoint?: string;  // For Azure, Ollama
}

// ==================== PROVIDER DEFINITIONS ====================

export const AI_PROVIDERS = {
    openai: {
        id: 'openai',
        name: 'OpenAI',
        endpoint: 'https://api.openai.com/v1',
        supportsImage: true,
        supportsVideo: false,
        supportsAudio: true
    },
    gemini: {
        id: 'gemini',
        name: 'Gemini (Google)',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta',
        supportsImage: true,
        supportsVideo: true,
        supportsAudio: false
    },
    azure: {
        id: 'azure',
        name: 'Azure AI',
        endpoint: '', // User provides
        supportsImage: true,
        supportsVideo: false,
        supportsAudio: true
    },
    claude: {
        id: 'claude',
        name: 'Claude (Anthropic)',
        endpoint: 'https://api.anthropic.com/v1',
        supportsImage: false,
        supportsVideo: false,
        supportsAudio: false
    },
    groq: {
        id: 'groq',
        name: 'Groq',
        endpoint: 'https://api.groq.com/openai/v1',
        supportsImage: false,
        supportsVideo: false,
        supportsAudio: true
    },
    mistral: {
        id: 'mistral',
        name: 'Mistral AI',
        endpoint: 'https://api.mistral.ai/v1',
        supportsImage: false,
        supportsVideo: false,
        supportsAudio: false
    },
    cohere: {
        id: 'cohere',
        name: 'Cohere',
        endpoint: 'https://api.cohere.ai/v1',
        supportsImage: false,
        supportsVideo: false,
        supportsAudio: false
    },
    perplexity: {
        id: 'perplexity',
        name: 'Perplexity',
        endpoint: 'https://api.perplexity.ai',
        supportsImage: false,
        supportsVideo: false,
        supportsAudio: false
    },
    deepseek: {
        id: 'deepseek',
        name: 'DeepSeek',
        endpoint: 'https://api.deepseek.com/v1',
        supportsImage: false,
        supportsVideo: false,
        supportsAudio: false
    },
    xai: {
        id: 'xai',
        name: 'xAI (Grok)',
        endpoint: 'https://api.x.ai/v1',
        supportsImage: false,
        supportsVideo: false,
        supportsAudio: false
    },
    together: {
        id: 'together',
        name: 'Together AI',
        endpoint: 'https://api.together.xyz/v1',
        supportsImage: true,
        supportsVideo: false,
        supportsAudio: false
    },
    fireworks: {
        id: 'fireworks',
        name: 'Fireworks AI',
        endpoint: 'https://api.fireworks.ai/inference/v1',
        supportsImage: true,
        supportsVideo: false,
        supportsAudio: true
    },
    replicate: {
        id: 'replicate',
        name: 'Replicate',
        endpoint: 'https://api.replicate.com/v1',
        supportsImage: true,
        supportsVideo: true,
        supportsAudio: true
    },
    ai21: {
        id: 'ai21',
        name: 'AI21 Labs',
        endpoint: 'https://api.ai21.com/studio/v1',
        supportsImage: false,
        supportsVideo: false,
        supportsAudio: false
    },
    huggingface: {
        id: 'huggingface',
        name: 'HuggingFace',
        endpoint: 'https://api-inference.huggingface.co',
        supportsImage: true,
        supportsVideo: false,
        supportsAudio: true
    },
    ollama: {
        id: 'ollama',
        name: 'Ollama (Local)',
        endpoint: 'http://localhost:11434',
        supportsImage: false,
        supportsVideo: false,
        supportsAudio: false
    },
    zanai: {
        id: 'zanai',
        name: 'Z.AI (智谱)',
        endpoint: 'https://api.z.ai/api/paas/v4',
        supportsImage: true,
        supportsVideo: false,
        supportsAudio: false
    },
    openrouter: {
        id: 'openrouter',
        name: 'OpenRouter',
        endpoint: 'https://openrouter.ai/api/v1',
        supportsImage: true,
        supportsVideo: false,
        supportsAudio: false
    }
};

// ==================== MODE DEFINITIONS ====================

export const AI_MODES = {
    auto: {
        id: 'auto',
        name: 'Auto',
        description: 'Auto-detect intent',
        icon: '🔮',
        prompt: 'You are a versatile AI assistant. Automatically detect what the user needs based on their message: if they share code, help debug or explain it; if they ask for code, write it; if they want an image, describe what to generate; if they want creative content, be creative; otherwise have a helpful conversation. Adapt your response style accordingly.'
    },
    chat: {
        id: 'chat',
        name: 'Chat',
        description: 'General conversation',
        icon: '💬',
        prompt: 'You are a helpful, friendly assistant. Be conversational, engaging, and informative.'
    },
    code: {
        id: 'code',
        name: 'Code',
        description: 'Programming assistant',
        icon: '💻',
        prompt: 'You are an expert programmer. Provide clean, well-commented code with explanations. Use markdown code blocks with language syntax highlighting. Follow best practices and explain your reasoning.'
    },
    debug: {
        id: 'debug',
        name: 'Debug',
        description: 'Debugging helper',
        icon: '🐛',
        prompt: 'You are an expert debugger. Analyze code for bugs, explain issues clearly, and suggest fixes. Be thorough and systematic in your analysis. Provide step-by-step solutions.'
    },
    image: {
        id: 'image',
        name: 'Image',
        description: 'Image generation',
        icon: '🎨',
        prompt: 'You help create images. When the user describes what they want, create a detailed, vivid prompt optimized for image generation. Include style, mood, lighting, colors, and composition details.'
    },
    video: {
        id: 'video',
        name: 'Video',
        description: 'Video generation',
        icon: '🎬',
        prompt: 'You help create videos. When the user describes what they want, create a detailed prompt optimized for video generation. Include scene descriptions, camera movements, timing, and transitions.'
    },
    audio: {
        id: 'audio',
        name: 'Audio/TTS',
        description: 'Audio & text-to-speech',
        icon: '🔊',
        prompt: 'You help with audio content. You can help transcribe audio, generate speech from text, or discuss audio production.'
    },
    music: {
        id: 'music',
        name: 'Music',
        description: 'Music generation',
        icon: '🎵',
        prompt: 'You help create music. When the user describes what they want, create a detailed prompt for music generation. Include genre, mood, tempo, instruments, and style details.'
    },
    vision: {
        id: 'vision',
        name: 'Vision',
        description: 'Image analysis',
        icon: '👁️',
        prompt: 'You analyze images. Describe what you see in detail, identify objects, text, people, scenes, and provide insights. Be thorough and observant.'
    },
    translate: {
        id: 'translate',
        name: 'Translate',
        description: 'Language translation',
        icon: '🌐',
        prompt: 'You are an expert translator. Translate text accurately while preserving meaning, tone, and cultural nuances. Ask for clarification if the source or target language is unclear.'
    },
    summarize: {
        id: 'summarize',
        name: 'Summarize',
        description: 'Text summarization',
        icon: '📝',
        prompt: 'You are an expert summarizer. Create clear, concise summaries that capture the key points. Maintain accuracy while reducing length. Organize information logically.'
    },
    research: {
        id: 'research',
        name: 'Research',
        description: 'Research assistant',
        icon: '🔬',
        prompt: 'You are a research assistant. Help find information, analyze sources, provide citations, and synthesize knowledge. Be thorough, accurate, and cite your sources when possible.'
    },
    creative: {
        id: 'creative',
        name: 'Creative',
        description: 'Creative writing',
        icon: '✨',
        prompt: 'You are a creative writer. Generate imaginative, unique content including stories, poems, scripts, and more. Think outside the box and embrace creativity.'
    }
};

// ==================== MODELS PER PROVIDER ====================

export const PROVIDER_MODELS: Record<string, Record<string, string[]>> = {
    openai: {
        // Latest Dec 2025: GPT-5.2/5.2-Codex, GPT-5.1, GPT-5, o4-mini, o3-pro, o3-deep-research
        chat: ['gpt-5.2', 'gpt-5.2-pro', 'gpt-5.2-instant', 'gpt-5.2-thinking', 'gpt-5.1', 'gpt-5', 'gpt-5-mini', 'gpt-5-nano', 'gpt-5-chat', 'o3-pro', 'o3', 'o3-mini', 'o4-mini', 'o4-mini-high', 'o1', 'o1-mini', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
        code: ['gpt-5.2-codex', 'gpt-5.2-codex-max', 'gpt-5.2-codex-mini', 'gpt-5.2', 'gpt-5-codex', 'gpt-5-codex-max', 'gpt-5-codex-mini', 'o4-mini', 'o3', 'o3-mini', 'o1', 'gpt-4.1', 'gpt-4o'],
        debug: ['gpt-5.2-codex', 'gpt-5.2', 'o4-mini', 'o3', 'o1', 'gpt-4.1', 'gpt-4o'],
        image: ['gpt-image-1.5', 'gpt-image-1', 'dall-e-3', 'dall-e-2'],
        video: ['sora', 'sora-turbo'],
        audio: ['gpt-realtime', 'gpt-realtime-mini', 'gpt-audio', 'gpt-audio-mini', 'gpt-4o-transcribe-diarize', 'gpt-4o-mini-transcribe', 'gpt-4o-mini-tts', 'whisper-1', 'tts-1', 'tts-1-hd'],
        music: [],
        vision: ['gpt-5.2', 'gpt-5', 'gpt-4.1', 'gpt-4o', 'gpt-4o-mini'],
        translate: ['gpt-5', 'gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
        summarize: ['gpt-5-mini', 'gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
        research: ['o3-deep-research', 'o4-mini-deep-research', 'gpt-5.2-thinking', 'o3-pro', 'o4-mini', 'o3', 'o1'],
        creative: ['gpt-5.2', 'gpt-5', 'gpt-4o', 'gpt-4-turbo']
    },
    gemini: {
        // Dec 2025: Prioritize available models - gemini-2.5-flash works, gemini-3-pro often rate-limited
        chat: ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3-flash-preview', 'gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-2.0-flash', 'gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-3-pro-preview'],
        code: ['gemini-2.5-flash', 'gemini-3-flash-preview', 'gemini-2.0-flash-thinking-exp', 'gemini-1.5-pro', 'gemini-3-pro-preview'],
        debug: ['gemini-2.5-flash', 'gemini-3-flash-preview', 'gemini-2.0-flash-thinking-exp', 'gemini-1.5-pro'],
        image: ['imagen-3.0-generate-002', 'imagen-3.0-fast-generate-001', 'gemini-2.5-flash-image-preview'],
        video: ['veo-2', 'veo'],
        audio: ['gemini-2.5-flash-native-audio-preview', 'gemini-live-2.5-flash-native-audio', 'gemini-2.0-flash-exp'],
        music: [],
        vision: ['gemini-2.5-flash', 'gemini-3-flash-preview', 'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
        translate: ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash', 'gemini-1.5-flash'],
        summarize: ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash', 'gemini-1.5-flash'],
        research: ['gemini-2.5-flash', 'gemini-3-flash-preview', 'gemini-3-pro-preview'],
        creative: ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash', 'gemini-1.5-pro']
    },
    azure: {
        // Azure AI Foundry Dec 2025 - 11,262+ models available, comprehensive list
        chat: [
            // OpenAI GPT-5.x Series (Latest)
            'gpt-5.2', 'gpt-5.2-chat', 'gpt-5.1', 'gpt-5.1-chat', 'gpt-5.1-mini', 'gpt-5-pro', 'gpt-5-chat', 'gpt-5', 'gpt-5-mini', 'gpt-5-nano',
            // OpenAI GPT-4.x Series
            'gpt-4.5-preview', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-35-turbo',
            // OpenAI Reasoning Models (o-series)
            'o3', 'o3-pro', 'o3-mini', 'o3-deep-research', 'o4-mini', 'o4-mini-deep-research',
            // OpenAI Specialized Models
            'gpt-realtime', 'gpt-audio', 'gpt-audio-mini',
            // OpenAI Open Source (OSS)
            'gpt-oss-120B', 'gpt-oss-20B', 'gpt-oss-safeguard-120b', 'gpt-oss-safeguard-20b',
            // xAI Grok Series
            'grok-4', 'grok-4-fast-reasoning', 'grok-4-fast-non-reasoning', 'grok-3', 'grok-3-mini',
            // Meta Llama 4 Series
            'Llama-4-Maverick-17B-128E-Instruct-FP8', 'Llama-4-Maverick-17B', 'Llama-4-Scout-17B-16E-Instruct', 'Llama-4-Scout-17B',
            // Meta Llama 3 Series
            'Llama-3.3-70B-Instruct', 'meta-llama-3-70b-instruct', 'meta-llama-3-8b-instruct', 'meta-llama-guard-2-8b',
            // Mistral AI Series
            'Mistral-Large-3', 'Mistral-Large-2411', 'mistral-large-2407', 'mistral-medium-2505', 'mistral-small-2503', 'Mistral-Small', 'Ministral-3B', 'Mistral-Nemo', 'Mistral-7B-v01', 'Mistral-7B-Instruct-v01',
            // DeepSeek Series
            'DeepSeek-V3.2', 'DeepSeek-V3.2-Speciale', 'DeepSeek-V3.1', 'DeepSeek-V3-0324', 'DeepSeek-V3', 'DeepSeek-R1-0528', 'DeepSeek-R1', 'MAI-DS-R1', 'deepseek-llm-67b-chat', 'deepseek-llm-7b-chat',
            // Claude Series (via Azure)
            'claude-opus-4-5', 'claude-sonnet-4-5', 'claude-haiku-4-5', 'claude-opus-4-1',
            // Microsoft Phi Series
            'Phi-4', 'Phi-4-mini-instruct', 'Phi-4-mini-reasoning', 'Phi-4-multimodal-instruct', 'Phi-3.5-MoE-instruct', 'Phi-3-medium-128k-instruct',
            // Cohere Series
            'Cohere-command-a', 'Cohere-command-r-plus', 'Cohere-command-r',
            // Other Models
            'Kimi-K2-Thinking', 'model-router', 'embed-v-4-0'
        ],
        code: [
            // OpenAI Codex Series
            'gpt-5.1-codex-max', 'gpt-5.1-codex-mini', 'gpt-5-codex', 'gpt-5-codex-max', 'codex-mini',
            // GPT Models for Code
            'gpt-5.2', 'gpt-5.1', 'gpt-4.1', 'gpt-4o', 'gpt-4',
            // xAI Grok Code
            'grok-code-fast-1', 'grok-4',
            // DeepSeek Code
            'DeepSeek-V3.2', 'DeepSeek-Coder-V2', 'deepseek-coder-6.7b-instruct',
            // Claude
            'claude-opus-4-5', 'claude-sonnet-4-5',
            // Llama & Mistral
            'Llama-4-Maverick-17B', 'Llama-3.3-70B-Instruct', 'Mistral-Large-3',
            // Microsoft Phi
            'Phi-4', 'Phi-4-mini-reasoning'
        ],
        debug: [
            'gpt-5.2', 'gpt-5.1', 'gpt-4.1', 'gpt-4o', 'gpt-4',
            'grok-4', 'DeepSeek-V3.2', 'claude-opus-4-5', 'Llama-4-Maverick-17B', 'Phi-4'
        ],
        image: [
            'gpt-image-1', 'gpt-image-1.5', 'dall-e-3', 'dall-e-2',
            'FLUX.1-schnell', 'FLUX.1-dev', 'FLUX-1-Redux-dev'
        ],
        video: ['sora-2', 'sora', 'Sora-preview'],
        audio: [
            'gpt-4o-transcribe', 'gpt-4o-transcribe-diarize', 'gpt-4o-mini-transcribe',
            'gpt-4o-tts', 'gpt-4o-mini-tts', 'gpt-audio', 'gpt-audio-mini',
            'whisper-large-v3', 'whisper', 'tts-1-hd', 'tts-1'
        ],
        music: [],
        vision: [
            'gpt-5.2', 'gpt-5.1', 'gpt-4.1', 'gpt-4o', 'gpt-4o-mini', 'gpt-4-vision',
            'grok-4', 'Llama-4-Maverick-17B', 'claude-opus-4-5', 'Phi-4-multimodal-instruct', 'Phi-4'
        ],
        translate: ['gpt-5.2', 'gpt-5', 'gpt-4o', 'gpt-4', 'Llama-3.3-70B-Instruct', 'Mistral-Large-3'],
        summarize: ['gpt-5-mini', 'gpt-4o-mini', 'gpt-35-turbo', 'Llama-3.3-70B-Instruct', 'Mistral-Nemo', 'Phi-4-mini-instruct'],
        research: [
            'o3', 'o3-pro', 'o3-deep-research', 'o4-mini', 'o4-mini-deep-research',
            'gpt-5.2', 'gpt-5.1', 'gpt-4.1', 'gpt-4o',
            'grok-4-fast-reasoning', 'DeepSeek-R1', 'DeepSeek-R1-0528', 'MAI-DS-R1', 'Kimi-K2-Thinking'
        ],
        creative: ['gpt-5.2', 'gpt-5-chat', 'gpt-4o', 'gpt-4-turbo', 'grok-4', 'claude-opus-4-5', 'Llama-4-Maverick-17B']
    },
    claude: {
        // Latest Dec 2025: Claude Opus 4.5, Sonnet 4.5, Haiku 4.5, Opus 4.1, Sonnet 4, Opus 4
        chat: ['claude-opus-4.5-20251124', 'claude-sonnet-4.5-20250929', 'claude-haiku-4.5-20251016', 'claude-opus-4.1-20250805', 'claude-sonnet-4-20250522', 'claude-opus-4-20250522', 'claude-3-7-sonnet-20250219', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
        code: ['claude-opus-4.5-20251124', 'claude-sonnet-4.5-20250929', 'claude-opus-4.1-20250805', 'claude-opus-4-20250522', 'claude-3-7-sonnet-20250219', 'claude-3-5-sonnet-20241022'],
        debug: ['claude-opus-4.5-20251124', 'claude-opus-4.1-20250805', 'claude-opus-4-20250522', 'claude-3-7-sonnet-20250219'],
        image: [],
        video: [],
        audio: [],
        music: [],
        vision: ['claude-opus-4.5-20251124', 'claude-sonnet-4.5-20250929', 'claude-opus-4-20250522', 'claude-3-7-sonnet-20250219', 'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'],
        translate: ['claude-haiku-4.5-20251016', 'claude-sonnet-4.5-20250929', 'claude-3-5-haiku-20241022'],
        summarize: ['claude-haiku-4.5-20251016', 'claude-sonnet-4.5-20250929', 'claude-3-5-haiku-20241022'],
        research: ['claude-opus-4.5-20251124', 'claude-opus-4.1-20250805', 'claude-3-7-sonnet-20250219'],
        creative: ['claude-opus-4.5-20251124', 'claude-sonnet-4.5-20250929', 'claude-3-5-sonnet-20241022']
    },
    groq: {
        // Latest Dec 2025: Llama 4 Scout/Maverick, Llama Guard 4, OpenAI GPT-OSS, Qwen, Groq Compound
        chat: ['meta-llama/llama-4-maverick-17b-128e-instruct', 'meta-llama/llama-4-scout-17b-16e-instruct', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3-32b', 'qwen-qwq-32b', 'moonshotai/kimi-k2-instruct', 'llama-3.3-70b-versatile', 'llama-3.3-70b-specdec', 'llama-3.2-90b-vision-preview', 'llama-3.2-11b-vision-preview', 'llama-3.1-8b-instant', 'llama3-70b-8192', 'llama3-8b-8192', 'mixtral-8x7b-32768', 'gemma2-9b-it', 'mistral-saba-24b'],
        code: ['openai/gpt-oss-120b', 'qwen-2.5-coder-32b', 'llama-3.3-70b-versatile', 'meta-llama/llama-4-maverick-17b-128e-instruct', 'mixtral-8x7b-32768'],
        debug: ['openai/gpt-oss-120b', 'llama-3.3-70b-versatile', 'qwen-qwq-32b'],
        image: [],
        video: [],
        audio: ['whisper-large-v3', 'whisper-large-v3-turbo', 'distil-whisper-large-v3-en'],
        music: [],
        vision: ['llama-3.2-90b-vision-preview', 'llama-3.2-11b-vision-preview', 'meta-llama/llama-4-scout-17b-16e-instruct'],
        translate: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768', 'qwen-qwq-32b'],
        summarize: ['llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
        research: ['openai/gpt-oss-120b', 'llama-3.3-70b-versatile', 'qwen-qwq-32b'],
        creative: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768', 'meta-llama/llama-4-maverick-17b-128e-instruct']
    },
    mistral: {
        // Latest Dec 2025: Mistral Large 3, Devstral 2, Mistral Medium 3.1, Voxtral, Magistral
        chat: ['mistral-large-3', 'mistral-medium-3.1', 'mistral-medium-3', 'mistral-small-3.2', 'mistral-small-3.1', 'ministral-3-14b', 'ministral-3-8b', 'ministral-3-3b', 'mistral-large-2411', 'mistral-large-latest', 'mistral-small-latest', 'open-mistral-nemo', 'mistral-7b'],
        code: ['devstral-2-123b', 'devstral-small-2-24b', 'codestral-latest', 'codestral-mamba-latest', 'mistral-large-3'],
        debug: ['devstral-2-123b', 'codestral-latest', 'mistral-large-3'],
        image: [],
        video: [],
        audio: ['voxtral-mini-transcribe', 'voxtral-mini', 'voxtral-small'],
        music: [],
        vision: ['pixtral-large-2411', 'pixtral-large-latest', 'pixtral-12b-2409'],
        translate: ['mistral-large-3', 'mistral-small-latest'],
        summarize: ['mistral-small-latest', 'mistral-large-3'],
        research: ['magistral-medium', 'magistral-small', 'mistral-large-3'],
        creative: ['mistral-large-3', 'mistral-small-latest']
    },
    cohere: {
        // Latest Dec 2025: Command A, Command A Reasoning/Vision/Translate, Rerank v4, Embed v4
        chat: ['command-a-03-2025', 'command-a-reasoning-08-2025', 'command-r-plus-08-2024', 'command-r-08-2024', 'command-nightly'],
        code: ['command-a-03-2025', 'command-a-reasoning-08-2025'],
        debug: ['command-a-03-2025', 'command-a-reasoning-08-2025'],
        image: [],
        video: [],
        audio: [],
        music: [],
        vision: ['command-a-vision-07-2025'],
        translate: ['command-a-translate-08-2025', 'command-a-03-2025'],
        summarize: ['command-a-03-2025', 'command-r-08-2024'],
        research: ['command-a-reasoning-08-2025', 'command-a-03-2025'],
        creative: ['command-a-03-2025']
    },
    perplexity: {
        // Latest Dec 2025: Sonar, Sonar Pro, R1-1776, Search API
        chat: ['sonar', 'sonar-pro', 'sonar-pro-reasoning', 'r1-1776', 'llama-3.1-sonar-large-128k-online', 'llama-3.1-sonar-small-128k-online'],
        code: ['sonar-pro', 'sonar', 'llama-3.1-sonar-large-128k-chat'],
        debug: ['sonar-pro', 'sonar'],
        image: [],
        video: [],
        audio: [],
        music: [],
        vision: ['sonar-pro'],
        translate: ['sonar', 'llama-3.1-sonar-large-128k-online'],
        summarize: ['sonar', 'llama-3.1-sonar-small-128k-online'],
        research: ['sonar-pro-reasoning', 'sonar-pro', 'r1-1776'],
        creative: ['sonar-pro', 'sonar']
    },
    deepseek: {
        // Latest Dec 2025: DeepSeek-V3.2/V3.2-Speciale (Dec 1), deepseek-chat/reasoner
        chat: ['deepseek-v3.2', 'deepseek-v3.2-speciale', 'deepseek-chat', 'deepseek-reasoner', 'deepseek-v3', 'deepseek-r1'],
        code: ['deepseek-v3.2', 'deepseek-v3.2-speciale', 'deepseek-coder-v2', 'deepseek-coder'],
        debug: ['deepseek-v3.2', 'deepseek-reasoner', 'deepseek-coder'],
        image: [],
        video: [],
        audio: [],
        music: [],
        vision: ['deepseek-vl2', 'deepseek-vl'],
        translate: ['deepseek-chat', 'deepseek-v3.2'],
        summarize: ['deepseek-chat', 'deepseek-v3.2'],
        research: ['deepseek-reasoner', 'deepseek-v3.2-speciale', 'deepseek-r1'],
        creative: ['deepseek-chat', 'deepseek-v3.2']
    },
    xai: {
        chat: ['grok-2', 'grok-2-mini', 'grok-beta', 'grok-2-1212'],
        code: ['grok-2'],
        debug: ['grok-2'],
        image: [],
        video: [],
        audio: [],
        music: [],
        vision: ['grok-2-vision-1212'],
        translate: ['grok-2'],
        summarize: ['grok-2-mini'],
        research: ['grok-2'],
        creative: ['grok-2']
    },
    together: {
        chat: ['meta-llama/Llama-3.3-70B-Instruct-Turbo', 'Qwen/Qwen2.5-72B-Instruct-Turbo', 'mistralai/Mixtral-8x22B-Instruct-v0.1'],
        code: ['Qwen/Qwen2.5-Coder-32B-Instruct', 'codellama/CodeLlama-70b-Instruct-hf'],
        debug: ['meta-llama/Llama-3.3-70B-Instruct-Turbo'],
        image: ['black-forest-labs/FLUX.1-schnell-Free', 'stabilityai/stable-diffusion-xl-base-1.0'],
        video: [],
        audio: [],
        music: ['meta/musicgen-large'],
        vision: ['meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo'],
        translate: ['meta-llama/Llama-3.3-70B-Instruct-Turbo'],
        summarize: ['mistralai/Mixtral-8x7B-Instruct-v0.1'],
        research: ['meta-llama/Llama-3.3-70B-Instruct-Turbo'],
        creative: ['meta-llama/Llama-3.3-70B-Instruct-Turbo']
    },
    fireworks: {
        chat: ['accounts/fireworks/models/llama-v3p3-70b-instruct', 'accounts/fireworks/models/mixtral-8x22b-instruct'],
        code: ['accounts/fireworks/models/qwen2p5-coder-32b-instruct'],
        debug: ['accounts/fireworks/models/llama-v3p1-70b-instruct'],
        image: ['accounts/fireworks/models/flux-1-dev-fp8', 'accounts/fireworks/models/stable-diffusion-xl-1024-v1-0'],
        video: [],
        audio: ['accounts/fireworks/models/whisper-v3'],
        music: [],
        vision: ['accounts/fireworks/models/llama-v3p2-90b-vision-instruct'],
        translate: ['accounts/fireworks/models/llama-v3p3-70b-instruct'],
        summarize: ['accounts/fireworks/models/mixtral-8x7b-instruct'],
        research: ['accounts/fireworks/models/llama-v3p3-70b-instruct'],
        creative: ['accounts/fireworks/models/llama-v3p3-70b-instruct']
    },
    replicate: {
        chat: ['meta/llama-3.1-405b-instruct', 'meta/llama-3.3-70b-instruct'],
        code: ['meta/codellama-70b-instruct'],
        debug: ['meta/llama-3.1-405b-instruct'],
        image: ['black-forest-labs/flux-schnell', 'black-forest-labs/flux-dev', 'stability-ai/sdxl'],
        video: ['luma/ray', 'minimax/video-01'],
        audio: ['openai/whisper', 'cjwbw/seamless_communication'],
        music: ['meta/musicgen', 'suno-ai/bark'],
        vision: ['yorickvp/llava-v1.6-34b'],
        translate: ['cjwbw/seamless_communication'],
        summarize: ['meta/llama-3.1-405b-instruct'],
        research: ['meta/llama-3.1-405b-instruct'],
        creative: ['meta/llama-3.1-405b-instruct']
    },
    ai21: {
        chat: ['jamba-1.5-large', 'jamba-1.5-mini'],
        code: ['jamba-1.5-large'],
        debug: ['jamba-1.5-large'],
        image: [],
        video: [],
        audio: [],
        music: [],
        vision: [],
        translate: ['jamba-1.5-large'],
        summarize: ['jamba-1.5-mini'],
        research: ['jamba-1.5-large'],
        creative: ['jamba-1.5-large']
    },
    huggingface: {
        chat: ['meta-llama/Llama-3.3-70B-Instruct', 'Qwen/Qwen2.5-72B-Instruct', 'mistralai/Mixtral-8x7B-Instruct-v0.1'],
        code: ['Qwen/Qwen2.5-Coder-32B-Instruct', 'bigcode/starcoder2-15b'],
        debug: ['meta-llama/Llama-3.3-70B-Instruct'],
        image: ['black-forest-labs/FLUX.1-dev', 'stabilityai/stable-diffusion-xl-base-1.0'],
        video: [],
        audio: ['openai/whisper-large-v3', 'facebook/mms-tts'],
        music: ['facebook/musicgen-large'],
        vision: ['llava-hf/llava-v1.6-34b-hf'],
        translate: ['facebook/nllb-200-distilled-600M'],
        summarize: ['facebook/bart-large-cnn'],
        research: ['meta-llama/Llama-3.3-70B-Instruct'],
        creative: ['meta-llama/Llama-3.3-70B-Instruct']
    },
    ollama: {
        chat: ['llama3.3', 'qwen2.5', 'mistral', 'phi3', 'gemma2'],
        code: ['qwen2.5-coder', 'codellama', 'deepseek-coder', 'starcoder2'],
        debug: ['llama3.3', 'qwen2.5', 'deepseek-coder'],
        image: [],
        video: [],
        audio: [],
        music: [],
        vision: ['llava', 'llava-llama3', 'moondream'],
        translate: ['llama3.3', 'qwen2.5'],
        summarize: ['llama3.3', 'mistral', 'phi3'],
        research: ['llama3.3', 'qwen2.5'],
        creative: ['llama3.3', 'mistral']
    },
    zanai: {
        // Z.AI (智谱) models - GLM series
        chat: ['glm-4-plus', 'glm-4-0520', 'glm-4-air', 'glm-4-airx', 'glm-4-long', 'glm-4-flashx', 'glm-4-flash', 'glm-4.7', 'glm-4'],
        code: ['codegeex-4', 'glm-4-plus', 'glm-4-0520'],
        debug: ['glm-4-plus', 'glm-4-0520', 'glm-4'],
        image: ['cogview-3-plus', 'cogview-3'],
        video: ['cogvideox'],
        audio: [],
        music: [],
        vision: ['glm-4v-plus', 'glm-4v', 'glm-4v-flash'],
        translate: ['glm-4-flash', 'glm-4'],
        summarize: ['glm-4-flash', 'glm-4-air'],
        research: ['glm-4-plus', 'glm-4-long'],
        creative: ['glm-4-plus', 'glm-4']
    },
    openrouter: {
        // OpenRouter - aggregates many providers, popular models
        chat: [
            'openai/gpt-4o', 'openai/gpt-4-turbo', 'openai/gpt-3.5-turbo',
            'anthropic/claude-3.5-sonnet', 'anthropic/claude-3-opus', 'anthropic/claude-3-haiku',
            'google/gemini-pro-1.5', 'google/gemini-flash-1.5',
            'meta-llama/llama-3.1-405b-instruct', 'meta-llama/llama-3.1-70b-instruct',
            'mistralai/mistral-large', 'mistralai/mixtral-8x22b-instruct',
            'deepseek/deepseek-chat', 'deepseek/deepseek-coder',
            'qwen/qwen-2.5-72b-instruct'
        ],
        code: [
            'deepseek/deepseek-coder', 'openai/gpt-4o', 'anthropic/claude-3.5-sonnet',
            'qwen/qwen-2.5-coder-32b-instruct', 'meta-llama/codellama-70b-instruct'
        ],
        debug: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet', 'deepseek/deepseek-coder'],
        image: ['black-forest-labs/flux-1.1-pro', 'stability-ai/sdxl', 'openai/dall-e-3'],
        video: [],
        audio: [],
        music: [],
        vision: [
            'openai/gpt-4o', 'anthropic/claude-3.5-sonnet', 'google/gemini-pro-1.5-vision',
            'meta-llama/llama-3.2-90b-vision-instruct'
        ],
        translate: ['openai/gpt-4o', 'google/gemini-flash-1.5', 'meta-llama/llama-3.1-70b-instruct'],
        summarize: ['openai/gpt-4o-mini', 'anthropic/claude-3-haiku', 'google/gemini-flash-1.5'],
        research: ['openai/gpt-4o', 'anthropic/claude-3-opus', 'perplexity/sonar-pro'],
        creative: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet', 'meta-llama/llama-3.1-405b-instruct']
    }
};

// ==================== DEFAULT MODELS ====================

export const DEFAULT_MODELS: Record<string, string> = {
    openai: 'gpt-4o',
    gemini: 'gemini-2.5-flash',  // Changed from gemini-3-pro-preview (often rate-limited)
    azure: 'gpt-4o',
    claude: 'claude-opus-4.5-20251124',
    groq: 'meta-llama/llama-4-maverick-17b-128e-instruct',
    mistral: 'mistral-large-3',
    cohere: 'command-a-03-2025',
    perplexity: 'sonar-pro',
    deepseek: 'deepseek-v3.2',
    xai: 'grok-2',
    together: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    fireworks: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
    replicate: 'meta/llama-3.1-405b-instruct',
    ai21: 'jamba-1.5-large',
    huggingface: 'meta-llama/Llama-3.3-70B-Instruct',
    ollama: 'llama3.3',
    zanai: 'glm-4-plus',
    openrouter: 'openai/gpt-4o'
};

// ==================== AI SERVICE CLASS ====================

export class AIService {

    /**
     * Get all available providers
     */
    static getProviders() {
        return Object.values(AI_PROVIDERS).map(p => ({
            id: p.id,
            name: p.name,
            supportsImage: p.supportsImage,
            supportsVideo: p.supportsVideo,
            supportsAudio: p.supportsAudio
        }));
    }

    /**
     * Get all available modes
     */
    static getModes() {
        return Object.values(AI_MODES).map(m => ({
            id: m.id,
            name: m.name,
            description: m.description,
            icon: m.icon
        }));
    }

    /**
     * Get models for a provider and mode
     */
    static getModels(provider: string, mode?: string): string[] {
        const providerModels = PROVIDER_MODELS[provider];
        if (!providerModels) return [];
        
        if (mode && providerModels[mode]) {
            return providerModels[mode];
        }
        
        // Return all unique models for this provider
        const allModels = new Set<string>();
        Object.values(providerModels).forEach(models => {
            models.forEach(m => allModels.add(m));
        });
        return Array.from(allModels);
    }

    /**
     * Get default model for provider
     */
    static getDefaultModel(provider: string): string {
        return DEFAULT_MODELS[provider] || '';
    }

    /**
     * Detect intent from user message for Auto mode
     */
    static detectIntent(message: string): string {
        const lowerMsg = message.toLowerCase();
        
        // Image generation
        if (lowerMsg.includes('generate image') || lowerMsg.includes('create image') || 
            lowerMsg.includes('draw') || lowerMsg.includes('make a picture') ||
            lowerMsg.includes('generate a') || lowerMsg.includes('create a picture')) {
            return 'image';
        }
        
        // Video generation
        if (lowerMsg.includes('generate video') || lowerMsg.includes('create video') ||
            lowerMsg.includes('make a video')) {
            return 'video';
        }
        
        // Code
        if (lowerMsg.includes('write code') || lowerMsg.includes('code for') ||
            lowerMsg.includes('function') || lowerMsg.includes('implement') ||
            lowerMsg.includes('create a script') || lowerMsg.includes('programming')) {
            return 'code';
        }
        
        // Debug
        if (lowerMsg.includes('debug') || lowerMsg.includes('fix this') ||
            lowerMsg.includes('error') || lowerMsg.includes('bug') ||
            lowerMsg.includes('not working') || lowerMsg.includes('issue with')) {
            return 'debug';
        }
        
        // Translate
        if (lowerMsg.includes('translate') || lowerMsg.includes('in english') ||
            lowerMsg.includes('to english') || lowerMsg.includes('say in')) {
            return 'translate';
        }
        
        // Summarize
        if (lowerMsg.includes('summarize') || lowerMsg.includes('summary') ||
            lowerMsg.includes('tldr') || lowerMsg.includes('brief')) {
            return 'summarize';
        }
        
        // Research
        if (lowerMsg.includes('research') || lowerMsg.includes('find out') ||
            lowerMsg.includes('look up') || lowerMsg.includes('information about')) {
            return 'research';
        }
        
        // Creative
        if (lowerMsg.includes('story') || lowerMsg.includes('poem') ||
            lowerMsg.includes('creative') || lowerMsg.includes('write me')) {
            return 'creative';
        }
        
        // Music
        if (lowerMsg.includes('music') || lowerMsg.includes('song') ||
            lowerMsg.includes('melody') || lowerMsg.includes('compose')) {
            return 'music';
        }
        
        // Default to chat
        return 'chat';
    }

    /**
     * Send a message to AI and get response
     */
    static async chat(config: AIConfig, messages: AIMessage[]): Promise<AIResponse> {
        try {
            const { provider, apiKey, model, mode } = config;
            
            // Get mode-specific system prompt
            const modeKey = (mode || 'chat') as keyof typeof AI_MODES;
            const modeConfig = AI_MODES[modeKey] || AI_MODES.chat;
            const modePrompt = modeConfig.prompt;
            
            // Check if caller already provided a system message (with identity info)
            const existingSystemMsg = messages.find(m => m.role === 'system');
            const identityPrompt = existingSystemMsg?.content || '';
            
            // Combine identity prompt with mode prompt
            // Identity prompt takes priority (contains bot name, user name)
            const finalSystemPrompt = identityPrompt 
                ? `${identityPrompt}\n\nFor this conversation, also follow these guidelines: ${modePrompt}`
                : (config.systemPrompt || modePrompt);
            
            // Auto mode: detect intent and adjust
            let actualMode = mode || 'chat';
            if (mode === 'auto' && messages.length > 0) {
                const lastMsg = messages[messages.length - 1];
                if (lastMsg.role === 'user') {
                    actualMode = this.detectIntent(lastMsg.content || '');
                }
            }
            
            // Build messages - filter out any existing system message since we combined them
            const allMessages: AIMessage[] = [
                { role: 'system', content: finalSystemPrompt },
                ...messages.filter(m => m.role !== 'system')
            ];
            
            // Route to provider
            switch (provider) {
                case 'openai':
                case 'groq':
                case 'together':
                case 'fireworks':
                case 'perplexity':
                case 'deepseek':
                case 'xai':
                case 'mistral':
                case 'zanai':
                case 'openrouter':
                    return await this.chatOpenAICompatible(provider, apiKey, model || DEFAULT_MODELS[provider], allMessages, config.tools);
                case 'azure':
                    return await this.chatAzure(config, allMessages);
                case 'gemini':
                    return await this.chatGemini(apiKey, model || DEFAULT_MODELS.gemini, allMessages, config.tools);
                case 'claude':
                    return await this.chatClaude(apiKey, model || DEFAULT_MODELS.claude, allMessages);
                case 'cohere':
                    return await this.chatCohere(apiKey, model || DEFAULT_MODELS.cohere, allMessages);
                case 'ai21':
                    return await this.chatAI21(apiKey, model || DEFAULT_MODELS.ai21, allMessages);
                case 'huggingface':
                    return await this.chatHuggingFace(apiKey, model || DEFAULT_MODELS.huggingface, allMessages);
                case 'ollama':
                    return await this.chatOllama(config.ollamaHost || 'http://localhost:11434', model || DEFAULT_MODELS.ollama, allMessages);
                case 'replicate':
                    return await this.chatReplicate(apiKey, model || DEFAULT_MODELS.replicate, allMessages);
                default:
                    return { content: '', error: `Unknown provider: ${provider}` };
            }
        } catch (error: any) {
            console.error('[AIService] Chat error:', error);
            return { content: '', error: error.message || 'Unknown error' };
        }
    }

    // ==================== PROVIDER IMPLEMENTATIONS ====================

    /**
     * OpenAI-compatible API (OpenAI, Groq, Together, Fireworks, etc.)
     */
    /**
     * OpenAI-compatible API (OpenAI, Groq, Together, Fireworks, etc.)
     */
    static async chatOpenAICompatible(provider: string, apiKey: string, model: string, messages: AIMessage[], tools?: any[]): Promise<AIResponse> {
        const endpoints: Record<string, string> = {
            openai: 'https://api.openai.com/v1/chat/completions',
            groq: 'https://api.groq.com/openai/v1/chat/completions',
            together: 'https://api.together.xyz/v1/chat/completions',
            fireworks: 'https://api.fireworks.ai/inference/v1/chat/completions',
            perplexity: 'https://api.perplexity.ai/chat/completions',
            deepseek: 'https://api.deepseek.com/v1/chat/completions',
            xai: 'https://api.x.ai/v1/chat/completions',
            mistral: 'https://api.mistral.ai/v1/chat/completions',
            zanai: 'https://api.z.ai/api/paas/v4/chat/completions',
            openrouter: 'https://openrouter.ai/api/v1/chat/completions'
        };

        const response = await fetch(endpoints[provider], {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                messages: messages.map(m => ({ 
                    role: m.role, 
                    content: m.content, 
                    tool_calls: m.tool_calls,
                    tool_call_id: m.tool_call_id,
                    name: m.name
                })),
                max_tokens: 4096,
                tools: tools && tools.length > 0 ? tools : undefined
            })
        });
        
        // DEBUG: Log if tools are being sent
        if (tools && tools.length > 0) {
            console.log(`[AIService] Sending ${tools.length} tools to ${provider}`);
        } else {
            console.log(`[AIService] No tools sent to ${provider}`);
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API error: ${response.status}`);
        }

        const data = await response.json();
        // OpenAI-compatible APIs return usage.total_tokens
        const tokensUsed = data.usage?.total_tokens || 
            ((data.usage?.prompt_tokens || 0) + (data.usage?.completion_tokens || 0)) || null;
        return { 
            content: data.choices?.[0]?.message?.content || '',
            tokensUsed 
        };
    }

    /**
 * Azure AI - Supports multiple endpoint types:
 * 1. Azure OpenAI: /openai/deployments/{deployment}/chat/completions
 * 2. Azure Anthropic: /anthropic/v1/messages
 * 3. Azure AI Serverless: /models/{model}/chat/completions (Llama, Mistral, DeepSeek, Cohere, xAI, etc.)
 * 4. Azure AI Inference: Generic OpenAI-compatible endpoint
 */
static async chatAzure(config: AIConfig, messages: AIMessage[]): Promise<AIResponse> {
    // Azure requires endpoint - check first
    if (!config.azureEndpoint) {
        return { content: '', error: '❌ Azure endpoint not configured. Please set Azure Endpoint in AI Provider settings.' };
    }

    // Clean endpoint - extract base URL, remove any existing paths and query strings
    let endpoint = config.azureEndpoint.replace(/\/$/, '');

    // Store original endpoint for some Azure types that need full URL
    const originalEndpoint = endpoint;

    // Remove common Azure OpenAI paths to get base URL
    endpoint = endpoint.replace(/\/openai\/deployments\/.*$/i, '');
    endpoint = endpoint.replace(/\/openai\/responses.*$/i, '');
    endpoint = endpoint.replace(/\/openai\/.*$/i, '');
    endpoint = endpoint.replace(/\/anthropic\/.*$/i, '');
    endpoint = endpoint.replace(/\/models\/.*$/i, '');
    endpoint = endpoint.replace(/\/v1\/.*$/i, '');
    endpoint = endpoint.replace(/\?api-version=.*$/i, '');

    const model = config.model || config.azureDeployment || 'gpt-4o';
    
    // Determine Azure type - explicit config takes priority, then URL detection as fallback
    let azureType = config.azureType || 'auto';

    if (azureType === 'auto') {
        // Fallback to URL-based detection for backward compatibility
        if (originalEndpoint.includes('/anthropic')) {
            azureType = 'anthropic';
        } else if (originalEndpoint.includes('.models.ai.azure.com') || originalEndpoint.includes('/models/')) {
            azureType = 'serverless';
        } else if (originalEndpoint.includes('.services.ai.azure.com') && !originalEndpoint.includes('/anthropic')) {
            azureType = 'inference';
        } else if (originalEndpoint.includes('models.inference.ai.azure.com') || originalEndpoint.includes('github')) {
            azureType = 'github';
        } else if (originalEndpoint.includes('/openai/responses')) {
            azureType = 'responses';
        } else {
            azureType = 'openai';
        }
    }
    
    console.log(`[AIService] Azure type: ${azureType}, endpoint: ${endpoint}, model: ${model}, deployment: ${config.azureDeployment || 'not set'}`);
    
    // 1. Azure Anthropic (Claude) - uses Claude messages API
    if (azureType === 'anthropic') {
        try {
            // Extract system prompt - prefer first system message
            const systemMessage = messages.find(m => m.role === 'system');
            const systemPrompt = systemMessage?.content || '';
            
            console.log(`[AIService] Azure Anthropic - System prompt length: ${systemPrompt.length}`);
            console.log(`[AIService] Azure Anthropic - System prompt: ${systemPrompt.substring(0, 100)}...`);
            
            const response = await fetch(`${endpoint}/v1/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': config.apiKey,
                    'api-key': config.apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: model,
                    max_tokens: 4096,
                    system: systemPrompt,
                    messages: messages
                        .filter(m => m.role !== 'system')
                        .map(m => ({ role: m.role, content: m.content }))
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `Azure Anthropic API error: ${response.status}`);
            }

            const data = await response.json();
            // Azure Anthropic returns usage.input_tokens + output_tokens
            const tokensUsed = data.usage ? 
                (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0) : null;
            return { content: data.content?.[0]?.text || data.content || '', tokensUsed };
        } catch (error: any) {
            console.error('[AIService] Azure Anthropic error:', error);
            return { content: '', error: error.message || 'Azure Anthropic API error' };
        }
    }
    
    // 2. Azure AI Serverless (Llama, Mistral, DeepSeek, Cohere, xAI, etc.)
    // Endpoint format: https://{model-name}.{region}.models.ai.azure.com/v1/chat/completions
    if (azureType === 'serverless' || azureType === 'github') {
        try {
            // Serverless endpoints use OpenAI-compatible format
            const apiUrl = endpoint.includes('/v1/') ? endpoint : `${endpoint}/v1/chat/completions`;
            
            const makeRequest = async (useMaxCompletionTokens = false) => {
                const body: any = {
                    model: model,
                    messages: messages.map(m => ({ role: m.role, content: m.content }))
                };

                if (useMaxCompletionTokens) {
                    body.max_completion_tokens = 4096;
                } else {
                    body.max_tokens = 4096;
                }

                return await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${config.apiKey}`,
                        'api-key': config.apiKey
                    },
                    body: JSON.stringify(body)
                });
            };

            let response = await makeRequest(false);

            // Retry architecture
            if (response.status === 400) {
                const clone = response.clone();
                const text = await clone.text();
                if (text.includes("max_tokens' is not supported")) {
                    console.log('[AIService] Azure Serverless - Retrying with max_completion_tokens');
                    response = await makeRequest(true);
                }
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `Azure Serverless API error: ${response.status}`);
            }

            const data = await response.json();
            // Azure Serverless OpenAI-compatible format
            const tokensUsed = data.usage?.total_tokens || 
                ((data.usage?.prompt_tokens || 0) + (data.usage?.completion_tokens || 0)) || null;
            
            const message = data.choices?.[0]?.message;
            return { 
                content: message?.content || '', 
                tokensUsed,
                toolCalls: message?.tool_calls
            };
        } catch (error: any) {
            console.error('[AIService] Azure Serverless error:', error);
            return { content: '', error: error.message || 'Azure Serverless API error' };
        }
    }
    
    // 3. Azure AI Inference (Generic OpenAI-compatible)
    // Endpoint format: https://{resource}.services.ai.azure.com/models/chat/completions
    if (azureType === 'inference') {
        try {
            const apiUrl = endpoint.includes('/chat/completions') ? endpoint : `${endpoint}/models/chat/completions`;
            
            const makeRequest = async (useMaxCompletionTokens = false) => {
                const body: any = {
                    model: model,
                    messages: messages.map(m => ({ role: m.role, content: m.content }))
                };

                if (useMaxCompletionTokens) {
                    body.max_completion_tokens = 4096;
                } else {
                    body.max_tokens = 4096;
                }

                return await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'api-key': config.apiKey,
                        'Authorization': `Bearer ${config.apiKey}`
                    },
                    body: JSON.stringify(body)
                });
            };

            let response = await makeRequest(false);

            if (response.status === 400) {
                const clone = response.clone();
                const text = await clone.text();
                if (text.includes("max_tokens' is not supported")) {
                    console.log('[AIService] Azure AI Inference - Retrying with max_completion_tokens');
                    response = await makeRequest(true);
                }
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `Azure AI Inference error: ${response.status}`);
            }

            const data = await response.json();
            // Azure AI Inference OpenAI-compatible format
            const tokensUsed = data.usage?.total_tokens || 
                ((data.usage?.prompt_tokens || 0) + (data.usage?.completion_tokens || 0)) || null;
            return { content: data.choices?.[0]?.message?.content || '', tokensUsed };
        } catch (error: any) {
            console.error('[AIService] Azure AI Inference error:', error);
            return { content: '', error: error.message || 'Azure AI Inference error' };
        }
    }
    
    // 4. Standard Azure OpenAI - use deployment name
    const deployment = config.azureDeployment || config.model;
    if (!deployment) {
        return { content: '', error: '❌ Azure deployment not configured. Please set Azure Deployment or Model name.' };
    }

    try {
        const makeRequest = async (useMaxCompletionTokens = false) => {
            const body: any = {
                messages: messages.map(m => ({ role: m.role, content: m.content }))
            };

            if (useMaxCompletionTokens) {
                body.max_completion_tokens = 4096;
            } else {
                body.max_tokens = 4096;
            }

            return await fetch(
                `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-02-01`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'api-key': config.apiKey
                    },
                    body: JSON.stringify(body)
                }
            );
        };

        let response = await makeRequest(false);

        if (response.status === 400) {
            const clone = response.clone();
            const text = await clone.text();
            if (text.includes("max_tokens' is not supported")) {
                console.log('[AIService] Azure OpenAI - Retrying with max_completion_tokens');
                response = await makeRequest(true);
            }
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            if (response.status === 404) {
                return { content: '', error: `❌ Azure deployment "${deployment}" not found. Make sure deployment name matches your Azure OpenAI deployment.` };
            }
            throw new Error(errorData.error?.message || `Azure API error: ${response.status}`);
        }

        const data = await response.json();
        // Standard Azure OpenAI format
        const tokensUsed = data.usage?.total_tokens || 
            ((data.usage?.prompt_tokens || 0) + (data.usage?.completion_tokens || 0)) || null;
        return { content: data.choices?.[0]?.message?.content || '', tokensUsed };
    } catch (error: any) {
        console.error('[AIService] Azure OpenAI error:', error);
        return { content: '', error: error.message || 'Azure OpenAI API error' };
    }
}

    /**
     * Google Gemini
     */
    static async chatGemini(apiKey: string, model: string, messages: AIMessage[], tools?: any[]): Promise<AIResponse> {
        // Convert messages to Gemini format
        const geminiMessages = messages
            .filter(m => m.role !== 'system')
            .map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            }));

        const systemMessage = messages.find(m => m.role === 'system');
        
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: geminiMessages,
                    systemInstruction: systemMessage ? { parts: [{ text: systemMessage.content }] } : undefined,
                    tools: tools && tools.length > 0 ? [{ function_declarations: tools.map(t => t.function) }] : undefined,
                    generationConfig: { maxOutputTokens: 8192 }
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        // Extract token usage from Gemini's usageMetadata
        const tokensUsed = data.usageMetadata?.totalTokenCount || 
                          (data.usageMetadata?.promptTokenCount || 0) + (data.usageMetadata?.candidatesTokenCount || 0) ||
                          null;
        // Extract function calls if any
        const toolCalls = data.candidates?.[0]?.content?.parts?.filter((p: any) => p.functionCall).map((p: any) => ({
            id: 'call_' + Math.random().toString(36).substr(2, 9),
            type: 'function',
            function: {
                name: p.functionCall.name,
                arguments: JSON.stringify(p.functionCall.args)
            }
        }));

        // Debug logging
        console.log(`[AIService:Gemini] Response parts:`, JSON.stringify(data.candidates?.[0]?.content?.parts?.slice(0, 2)));
        console.log(`[AIService:Gemini] Tool calls found:`, toolCalls?.length || 0);

        return { 
            content: data.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text || '',
            tokensUsed,
            toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined
        };
    }

    /**
     * Anthropic Claude
     */
    static async chatClaude(apiKey: string, model: string, messages: AIMessage[]): Promise<AIResponse> {
        const systemMessage = messages.find(m => m.role === 'system');
        const chatMessages = messages.filter(m => m.role !== 'system');

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model,
                max_tokens: 4096,
                system: systemMessage?.content || '',
                messages: chatMessages.map(m => ({ role: m.role, content: m.content }))
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `Claude API error: ${response.status}`);
        }

        const data = await response.json();
        // Claude returns usage.input_tokens and usage.output_tokens
        const tokensUsed = data.usage ? 
            (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0) : null;
        return { 
            content: data.content?.[0]?.text || '',
            tokensUsed 
        };
    }

    /**
     * Cohere
     */
    static async chatCohere(apiKey: string, model: string, messages: AIMessage[]): Promise<AIResponse> {
        const systemMessage = messages.find(m => m.role === 'system');
        const lastMessage = messages[messages.length - 1];
        const chatHistory = messages.slice(0, -1).filter(m => m.role !== 'system');

        const response = await fetch('https://api.cohere.ai/v1/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                message: lastMessage.content,
                preamble: systemMessage?.content || '',
                chat_history: chatHistory.map(m => ({
                    role: m.role === 'assistant' ? 'CHATBOT' : 'USER',
                    message: m.content
                }))
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Cohere API error: ${response.status}`);
        }

        const data = await response.json();
        return { content: data.text || '' };
    }

    /**
     * AI21 Labs
     */
    static async chatAI21(apiKey: string, model: string, messages: AIMessage[]): Promise<AIResponse> {
        const response = await fetch('https://api.ai21.com/studio/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                messages: messages.map(m => ({ role: m.role, content: m.content }))
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `AI21 API error: ${response.status}`);
        }

        const data = await response.json();
        return { content: data.choices?.[0]?.message?.content || '' };
    }

    /**
     * HuggingFace Inference
     */
    static async chatHuggingFace(apiKey: string, model: string, messages: AIMessage[]): Promise<AIResponse> {
        const response = await fetch(`https://api-inference.huggingface.co/models/${model}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                messages: messages.map(m => ({ role: m.role, content: m.content })),
                max_tokens: 4096
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HuggingFace API error: ${response.status}`);
        }

        const data = await response.json();
        return { content: data.choices?.[0]?.message?.content || '' };
    }

    /**
     * Ollama (Local)
     */
    static async chatOllama(host: string, model: string, messages: AIMessage[]): Promise<AIResponse> {
        const response = await fetch(`${host}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                messages: messages.map(m => ({ role: m.role, content: m.content })),
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama error: ${response.status}`);
        }

        const data = await response.json();
        return { content: data.message?.content || '' };
    }

    /**
     * Replicate
     */
    static async chatReplicate(apiKey: string, model: string, messages: AIMessage[]): Promise<AIResponse> {
        // Replicate uses a different API structure
        const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n');
        
        const response = await fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${apiKey}`
            },
            body: JSON.stringify({
                version: model,
                input: { prompt }
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Replicate API error: ${response.status}`);
        }

        const prediction = await response.json();
        
        // Poll for completion
        let result = prediction;
        while (result.status !== 'succeeded' && result.status !== 'failed') {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const pollResponse = await fetch(result.urls.get, {
                headers: { 'Authorization': `Token ${apiKey}` }
            });
            result = await pollResponse.json();
        }

        if (result.status === 'failed') {
            throw new Error(result.error || 'Replicate prediction failed');
        }

        return { content: Array.isArray(result.output) ? result.output.join('') : result.output || '' };
    }

    /**
     * Rewrite prompt for image generation - removes copyrighted content, violence, etc.
     * Uses a chat AI to clean prompts before sending to image generator
     */
    static async rewritePromptForImage(config: {
        provider: string;
        apiKey: string;
        prompt: string;
        imageDescription?: string; // From vision analysis
        azureEndpoint?: string;
        model?: string;
    }): Promise<string> {
        const { provider, apiKey, prompt, imageDescription, azureEndpoint, model } = config;

        const systemPrompt = `You are an expert prompt engineer for AI image generation. Your job is to create DETAILED, ENHANCED prompts that are safe and will produce accurate results.

RULES:
1. ENHANCE the prompt with specific visual details (colors, shapes, lighting, composition, style)
2. If reference image description is provided, incorporate ALL visual details (exact colors, shapes, patterns, textures, layout)
3. Replace copyrighted characters with DETAILED generic descriptions:
   - "Spider-Man logo" → "a bold red and blue emblem with intricate web patterns radiating from center, dynamic angular design"
   - "Mickey Mouse" → "a cheerful cartoon character with large round ears, friendly expression, classic animation style"
4. Remove violence, weapons, gore - replace with safe alternatives
5. Remove real public figures - describe their style instead
6. KEEP the user's creative intent and make it MORE detailed, not less
7. Add quality keywords: "high quality, detailed, professional, sharp focus"

OUTPUT FORMAT:
Create a rich, detailed prompt that includes:
- Main subject with specific details
- Colors (be specific: "lime green", "deep forest green", not just "green")
- Style (pixelated, 3D, minimalist, etc.)
- Composition and layout
- Background details
- Lighting and mood

Return ONLY the enhanced prompt, nothing else.`;

        const userMessage = imageDescription 
            ? `REFERENCE IMAGE DETAILS:\n${imageDescription}\n\nUSER REQUEST: ${prompt}\n\nCreate an enhanced, detailed prompt that captures the reference image style while fulfilling the user's request:`
            : `USER REQUEST: ${prompt}\n\nCreate an enhanced, detailed prompt for image generation:`;

        try {
            const messages: AIMessage[] = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ];
            
            const result = await this.chat({
                provider,
                apiKey,
                azureEndpoint,
                model
            }, messages);

            // Extract just the prompt from response (remove any extra text)
            const rewrittenPrompt = result.content?.trim() || prompt;
            console.log(`[AIService] Prompt rewritten: "${prompt.substring(0, 50)}..." → "${rewrittenPrompt.substring(0, 50)}..."`);
            return rewrittenPrompt;
        } catch (error) {
            console.error('[AIService] Error rewriting prompt, using original:', error);
            return prompt; // Fallback to original if rewriting fails
        }
    }

    /**
     * Analyze image with vision model - describe what's in the image
     */
    static async analyzeImage(config: {
        provider: string;
        apiKey: string;
        imageUrl: string;
        prompt?: string;
        azureEndpoint?: string;
    }): Promise<string> {
        const { provider, apiKey, imageUrl, prompt, azureEndpoint } = config;

        const analysisPrompt = prompt || "Describe this image in detail for recreating it.";

        const visionSystemPrompt = `You are an expert visual analyst. Describe images in TECHNICAL DETAIL for AI image recreation.

DESCRIBE THESE ELEMENTS:
1. COLORS: Use specific color names (lime green, deep forest green, crimson red, navy blue) not just "green" or "red"
2. SHAPES: Exact geometric shapes, curves, angles, proportions
3. TEXT/LETTERS: What letters/words are visible, their font style (bold, thin, serif, blocky, pixelated)
4. STYLE: Art style (pixelated, 3D, flat, minimalist, retro, modern, hand-drawn)
5. COMPOSITION: Layout, positioning, foreground/background, negative space
6. TEXTURES: Smooth, rough, glossy, matte, gradient patterns
7. LIGHTING: Bright, dark, shadows, highlights, contrast level

DO NOT:
- Use copyrighted character names (describe their appearance instead)
- Use brand names (describe the visual style instead)
- Make assumptions about meaning, just describe what you SEE

OUTPUT: A detailed technical description that could be used to recreate this image.`;

        try {
            // For vision analysis, we need to pass the image URL
            // Most vision models accept images either as URL or base64
            const messages: AIMessage[] = [
                { role: 'system', content: visionSystemPrompt },
                { role: 'user', content: `${analysisPrompt}\n\nImage URL: ${imageUrl}` }
            ];
            
            const result = await this.chat({
                provider,
                apiKey,
                azureEndpoint
            }, messages);

            console.log(`[AIService] Image analyzed: "${result.content?.substring(0, 100)}..."`);
            return result.content || "Unable to analyze image";
        } catch (error) {
            console.error('[AIService] Error analyzing image:', error);
            throw error;
        }
    }

    /**
     * Generate image - High quality output for all providers
     */
    static async generateImage(config: {
        provider: string;
        apiKey: string;
        prompt: string;
        model?: string;
        size?: string;
        style?: 'vivid' | 'natural';
        quality?: 'standard' | 'hd';
        azureEndpoint?: string;
    }): Promise<AIResponse> {
        const { provider, apiKey, prompt, model, size, style, quality, azureEndpoint } = config;

        // Enhance prompt for better quality
        const enhancedPrompt = `Create a stunning, high-quality, visually striking image: ${prompt}. The image should be detailed, vibrant, and professionally rendered.`;

        try {
            switch (provider) {
                case 'openai':
                    return await this.generateImageOpenAI(apiKey, enhancedPrompt, model || 'dall-e-3', size, style || 'vivid', quality || 'hd');
                case 'gemini':
                    return await this.generateImageGemini(apiKey, enhancedPrompt, model || 'imagen-3.0-generate-002');
                case 'azure':
                    return await this.generateImageAzure(apiKey, azureEndpoint || '', enhancedPrompt, model || 'dall-e-3', size);
                case 'together':
                    return await this.generateImageTogether(apiKey, enhancedPrompt, model || 'black-forest-labs/FLUX.1-schnell-Free');
                case 'replicate':
                    return await this.generateImageReplicate(apiKey, enhancedPrompt, model || 'black-forest-labs/flux-schnell');
                default:
                    // For unsupported providers, return helpful message
                    return { content: `🎨 Image generation is available with OpenAI (DALL-E), Google Gemini (Imagen), Together AI, and Replicate. Your current provider (${provider}) does not support image generation. Please switch to a supported provider.`, error: undefined };
            }
        } catch (error: any) {
            console.error(`[AIService] Image generation error:`, error);
            return { content: '', error: error.message };
        }
    }

    /**
     * Generate image with OpenAI DALL-E 3 - HD Quality
     */
    static async generateImageOpenAI(apiKey: string, prompt: string, model: string, size?: string, style: 'vivid' | 'natural' = 'vivid', quality: 'standard' | 'hd' = 'hd'): Promise<AIResponse> {
        console.log(`[AIService] Generating HD image with OpenAI ${model}...`);
        
        const response = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                prompt,
                n: 1,
                size: size || '1024x1024',
                quality, // 'hd' for high detail
                style    // 'vivid' for striking colors
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || 'OpenAI image generation failed');
        }

        const data = await response.json();
        console.log(`[AIService] OpenAI image generated successfully`);
        return { content: '🎨 Here is your generated image!', imageUrl: data.data?.[0]?.url };
    }

    /**
     * Generate image with Google Gemini (Native Image Generation)
     * Uses gemini-2.0-flash-exp or gemini-2.5-flash-preview-image-generation
     */
    static async generateImageGemini(apiKey: string, prompt: string, model: string): Promise<AIResponse> {
        // Use user-selected model, fallback to default if empty
        const imageModel = model || 'gemini-2.0-flash-exp'; // Default model that supports native image output
        console.log(`[AIService] Generating image with Gemini ${imageModel}...`);
        
        // Gemini 2.0 Flash Exp supports native image generation via generateContent
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${imageModel}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Generate a high-quality, stunning image: ${prompt}. Be creative and visually striking.`
                    }]
                }],
                generationConfig: {
                    responseModalities: ['TEXT', 'IMAGE'],
                    responseMimeType: 'text/plain'
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('[AIService] Gemini image error:', errorData);
            
            // Handle quota exceeded (429)
            if (response.status === 429) {
                return { 
                    content: `⚠️ **Gemini API Quota Exceeded!**\n\nYour Gemini API key has reached its free tier limit.\n\n**Solutions:**\n1. Tunggu beberapa saat dan cuba lagi\n2. Upgrade ke Gemini paid plan\n3. Guna provider lain: **OpenAI DALL-E 3** (recommended)\n\nGuna \`/switch\` untuk tukar ke OpenAI.`,
                    error: undefined
                };
            }
            
            // If native image gen not available, return helpful message
            if (response.status === 400 || response.status === 404) {
                return { 
                    content: `🎨 Gemini image generation requires 'gemini-2.0-flash-exp' model with image output enabled. Your API key may not have access to this feature yet.\n\n**Alternatives:**\n• Use OpenAI DALL-E 3 for HD images\n• Use Together AI with FLUX model\n• Use Replicate with SDXL\n\nSwitch provider with \`/switch\` command.`,
                    error: undefined
                };
            }
            throw new Error(errorData.error?.message || 'Gemini image generation failed');
        }

        const data = await response.json();
        
        // Check if response contains image
        const candidates = data.candidates || [];
        for (const candidate of candidates) {
            const parts = candidate.content?.parts || [];
            for (const part of parts) {
                // Check for inline image data
                if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
                    const imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    console.log(`[AIService] Gemini image generated successfully`);
                    return { content: '🎨 Here is your generated image!', imageUrl };
                }
            }
        }
        
        // If no image in response, return the text explanation
        const textContent = candidates[0]?.content?.parts?.[0]?.text || '';
        if (textContent) {
            return { 
                content: `🎨 Gemini responded with a description instead of an image:\n\n${textContent}\n\n*Note: For direct image generation, try OpenAI DALL-E or Together AI.*`,
                error: undefined
            };
        }
        
        return { content: '🎨 Gemini could not generate an image. Try using OpenAI DALL-E or Together AI instead.', error: undefined };
    }

    static async generateImageAzure(apiKey: string, endpoint: string, prompt: string, model: string = 'dall-e-3', size?: string): Promise<AIResponse> {
        // Clean endpoint - remove any existing /openai paths to prevent duplicates
        const baseEndpoint = endpoint.replace(/\/$/, '').replace(/\/openai.*$/, '');
        const url = `${baseEndpoint}/openai/deployments/${model}/images/generations?api-version=2024-02-01`;
        console.log(`[AIService] Azure Image URL: ${url}`);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': apiKey
            },
            body: JSON.stringify({
                prompt,
                n: 1,
                size: size || '1024x1024'
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || 'Azure image generation failed');
        }

        const data = await response.json();
        return { content: '', imageUrl: data.data?.[0]?.url };
    }

    static async generateImageTogether(apiKey: string, prompt: string, model: string): Promise<AIResponse> {
        const response = await fetch('https://api.together.xyz/v1/images/generations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                prompt,
                n: 1
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || 'Together image generation failed');
        }

        const data = await response.json();
        return { content: '', imageUrl: data.data?.[0]?.url };
    }

    static async generateImageReplicate(apiKey: string, prompt: string, model: string): Promise<AIResponse> {
        const response = await fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${apiKey}`
            },
            body: JSON.stringify({
                version: model,
                input: { prompt }
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Replicate image generation failed');
        }

        const prediction = await response.json();
        
        // Poll for completion
        let result = prediction;
        while (result.status !== 'succeeded' && result.status !== 'failed') {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const pollResponse = await fetch(result.urls.get, {
                headers: { 'Authorization': `Token ${apiKey}` }
            });
            result = await pollResponse.json();
        }

        if (result.status === 'failed') {
            throw new Error(result.error || 'Image generation failed');
        }

        const imageUrl = Array.isArray(result.output) ? result.output[0] : result.output;
        return { content: '', imageUrl };
    }

    // ==================== AUDIO GENERATION ====================

    /**
     * Generate speech from text (TTS)
     */
    static async generateSpeech(config: {
        provider: string;
        apiKey: string;
        text: string;
        model?: string;
        voice?: string;
    }): Promise<{ audioBuffer: Buffer | null; error?: string }> {
        const { provider, apiKey, text, model, voice } = config;

        try {
            switch (provider) {
                case 'openai':
                    return await this.generateSpeechOpenAI(apiKey, text, model || 'tts-1-hd', voice || 'alloy');
                case 'groq':
                    return await this.generateSpeechGroq(apiKey, text, voice || 'aura');
                default:
                    return { audioBuffer: null, error: `TTS not supported for ${provider}. Use OpenAI or Groq.` };
            }
        } catch (error: any) {
            console.error(`[AIService] TTS error:`, error);
            return { audioBuffer: null, error: error.message };
        }
    }

    /**
     * OpenAI Text-to-Speech (HD Quality)
     */
    static async generateSpeechOpenAI(apiKey: string, text: string, model: string, voice: string): Promise<{ audioBuffer: Buffer | null; error?: string }> {
        console.log(`[AIService] Generating speech with OpenAI ${model}, voice: ${voice}...`);
        
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                input: text,
                voice,
                response_format: 'mp3'
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || 'OpenAI TTS failed');
        }

        const audioBuffer = Buffer.from(await response.arrayBuffer());
        console.log(`[AIService] OpenAI TTS generated successfully`);
        return { audioBuffer };
    }

    /**
     * Groq Text-to-Speech
     */
    static async generateSpeechGroq(apiKey: string, text: string, voice: string): Promise<{ audioBuffer: Buffer | null; error?: string }> {
        console.log(`[AIService] Generating speech with Groq, voice: ${voice}...`);
        
        const response = await fetch('https://api.groq.com/openai/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'playai-tts',
                input: text,
                voice
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || 'Groq TTS failed');
        }

        const audioBuffer = Buffer.from(await response.arrayBuffer());
        console.log(`[AIService] Groq TTS generated successfully`);
        return { audioBuffer };
    }

    /**
     * Transcribe audio to text (STT/Speech-to-Text)
     */
    static async transcribeAudio(config: {
        provider: string;
        apiKey: string;
        audioBuffer: Buffer;
        model?: string;
    }): Promise<{ text: string; error?: string }> {
        const { provider, apiKey, audioBuffer, model } = config;

        try {
            switch (provider) {
                case 'openai':
                    return await this.transcribeOpenAI(apiKey, audioBuffer, model || 'whisper-1');
                case 'groq':
                    return await this.transcribeGroq(apiKey, audioBuffer, model || 'whisper-large-v3');
                default:
                    return { text: '', error: `Transcription not supported for ${provider}. Use OpenAI or Groq.` };
            }
        } catch (error: any) {
            console.error(`[AIService] Transcription error:`, error);
            return { text: '', error: error.message };
        }
    }

    /**
     * OpenAI Whisper Transcription
     */
    static async transcribeOpenAI(apiKey: string, audioBuffer: Buffer, model: string): Promise<{ text: string; error?: string }> {
        console.log(`[AIService] Transcribing with OpenAI ${model}...`);
        
        const formData = new FormData();
        formData.append('file', new Blob([new Uint8Array(audioBuffer)]), 'audio.mp3');
        formData.append('model', model);

        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || 'OpenAI transcription failed');
        }

        const data = await response.json();
        console.log(`[AIService] OpenAI transcription completed`);
        return { text: data.text };
    }

    /**
     * Groq Whisper Transcription (Fast)
     */
    static async transcribeGroq(apiKey: string, audioBuffer: Buffer, model: string): Promise<{ text: string; error?: string }> {
        console.log(`[AIService] Transcribing with Groq ${model}...`);
        
        const formData = new FormData();
        formData.append('file', new Blob([new Uint8Array(audioBuffer)]), 'audio.mp3');
        formData.append('model', model);

        const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || 'Groq transcription failed');
        }

        const data = await response.json();
        console.log(`[AIService] Groq transcription completed`);
        return { text: data.text };
    }
}
