import { ipcMain } from 'electron';
import { RegistryModel } from '@dexterai/registry-types';

const STATIC_MODELS: RegistryModel[] = [
    // Text Generation
    {
        id: 'gpt-4o', provider_id: 'openai', category: 'text_generation',
        name: 'GPT-4o', description: 'Most capable OpenAI model. Multimodal with high intelligence.',
        context_window: 128000, pricing: { input_per_1m_tokens: 2.50, output_per_1m_tokens: 10.00 }
    },
    {
        id: 'gpt-4o-mini', provider_id: 'openai', category: 'text_generation',
        name: 'GPT-4o Mini', description: 'Affordable small model for lightweight tasks.',
        context_window: 128000, pricing: { input_per_1m_tokens: 0.15, output_per_1m_tokens: 0.60 }
    },
    {
        id: 'gpt-3.5-turbo', provider_id: 'openai', category: 'text_generation',
        name: 'GPT-3.5 Turbo', description: 'Fast and cost-effective for simple tasks.',
        context_window: 16385, pricing: { input_per_1m_tokens: 0.50, output_per_1m_tokens: 1.50 }
    },
    {
        id: 'claude-3-5-sonnet-20241022', provider_id: 'anthropic', category: 'text_generation',
        name: 'Claude 3.5 Sonnet', description: 'Anthropic\'s most intelligent model. Best for complex tasks.',
        context_window: 200000, pricing: { input_per_1m_tokens: 3.00, output_per_1m_tokens: 15.00 }
    },
    {
        id: 'claude-3-5-haiku-20241022', provider_id: 'anthropic', category: 'text_generation',
        name: 'Claude 3.5 Haiku', description: 'Fastest and most compact Claude model.',
        context_window: 200000, pricing: { input_per_1m_tokens: 0.80, output_per_1m_tokens: 4.00 }
    },
    {
        id: 'claude-3-opus-20240229', provider_id: 'anthropic', category: 'text_generation',
        name: 'Claude 3 Opus', description: 'Powerful model for highly complex tasks.',
        context_window: 200000, pricing: { input_per_1m_tokens: 15.00, output_per_1m_tokens: 75.00 }
    },
    {
        id: 'gemini-3.1-pro-preview', provider_id: 'google', category: 'text_generation',
        name: 'Gemini 3.1 Pro', description: 'Google most capable model with advanced reasoning and thinking levels.',
        context_window: 1000000, pricing: { input_per_1m_tokens: 2.00, output_per_1m_tokens: 12.00 },
        supported_features: ['thinking_levels', 'vision', 'system_prompt']
    },
    {
        id: 'gemini-3-pro-preview', provider_id: 'google', category: 'text_generation',
        name: 'Gemini 3 Pro', description: 'Best for complex tasks requiring broad world knowledge across modalities.',
        context_window: 1000000, pricing: { input_per_1m_tokens: 2.00, output_per_1m_tokens: 12.00 },
        supported_features: ['vision', 'system_prompt']
    },
    {
        id: 'gemini-3-flash-preview', provider_id: 'google', category: 'text_generation',
        name: 'Gemini 3 Flash', description: 'Google fast and cost-effective frontier model.',
        context_window: 1000000, pricing: { input_per_1m_tokens: 0.50, output_per_1m_tokens: 3.00 },
        supported_features: ['vision', 'system_prompt']
    },
    {
        id: 'meta/llama-4-maverick-17b-128e-instruct', provider_id: 'nvidia_nim', category: 'text_generation',
        name: 'Llama 4 Maverick 17B', description: 'NVIDIA NIM: Fast reasoning model.', context_window: 128000
    },
    {
        id: 'meta/llama-4-scout-17b-16e-instruct', provider_id: 'nvidia_nim', category: 'text_generation',
        name: 'Llama 4 Scout 17B', description: 'NVIDIA NIM: Efficient instruct model.', context_window: 16000
    },
    {
        id: 'meta/llama-3.3-70b-instruct', provider_id: 'nvidia_nim', category: 'text_generation',
        name: 'Llama 3.3 70B Instruct', description: 'NVIDIA NIM: High quality open model.', context_window: 128000
    },
    {
        id: 'nvidia/nemotron-3-nano-30b-a3b', provider_id: 'nvidia_nim', category: 'text_generation',
        name: 'Nemotron 3 Nano 30B', description: 'NVIDIA NIM: In-house small model.', context_window: 8000
    },
    {
        id: 'qwen/qwen3.5-397b-a17b', provider_id: 'nvidia_nim', category: 'text_generation',
        name: 'Qwen 3.5 397B', description: 'NVIDIA NIM: Flagship MoE model (397B/17B active). Native reasoning, tool calling, and multimodal.',
        context_window: 262144, pricing: { input_per_1m_tokens: 0.60, output_per_1m_tokens: 3.60 },
        supported_features: ['thinking', 'tool_calling', 'vision']
    },

    // Code Generation
    {
        id: 'gpt-4o', provider_id: 'openai', category: 'code_generation',
        name: 'GPT-4o', description: 'Excellent at code generation, debugging, and explanation.',
        context_window: 128000, pricing: { input_per_1m_tokens: 2.50, output_per_1m_tokens: 10.00 }
    },
    {
        id: 'claude-3-5-sonnet-20241022', provider_id: 'anthropic', category: 'code_generation',
        name: 'Claude 3.5 Sonnet', description: 'Top-tier code generation with deep understanding.',
        context_window: 200000, pricing: { input_per_1m_tokens: 3.00, output_per_1m_tokens: 15.00 }
    },
    {
        id: 'gemini-3.1-pro-preview', provider_id: 'google', category: 'code_generation',
        name: 'Gemini 3.1 Pro', description: 'Google most capable model with advanced reasoning and thinking levels.',
        context_window: 1000000, pricing: { input_per_1m_tokens: 2.00, output_per_1m_tokens: 12.00 },
        supported_features: ['thinking_levels', 'vision', 'system_prompt']
    },
    {
        id: 'gemini-3-pro-preview', provider_id: 'google', category: 'code_generation',
        name: 'Gemini 3 Pro', description: 'Best for complex tasks requiring broad world knowledge across modalities.',
        context_window: 1000000, pricing: { input_per_1m_tokens: 2.00, output_per_1m_tokens: 12.00 },
        supported_features: ['vision', 'system_prompt']
    },
    {
        id: 'gemini-3-flash-preview', provider_id: 'google', category: 'code_generation',
        name: 'Gemini 3 Flash', description: 'Google fast and cost-effective frontier model.',
        context_window: 1000000, pricing: { input_per_1m_tokens: 0.50, output_per_1m_tokens: 3.00 },
        supported_features: ['vision', 'system_prompt']
    },
    {
        id: 'qwen/qwen2.5-coder-32b-instruct', provider_id: 'nvidia_nim', category: 'code_generation',
        name: 'Qwen 2.5 Coder 32B', description: 'NVIDIA NIM: Top-tier open coding model.', context_window: 32000
    },
    {
        id: 'qwen/qwen3.5-397b-a17b', provider_id: 'nvidia_nim', category: 'code_generation',
        name: 'Qwen 3.5 397B', description: 'NVIDIA NIM: Flagship MoE model (397B/17B active). Native reasoning, tool calling, and multimodal.',
        context_window: 262144, pricing: { input_per_1m_tokens: 0.60, output_per_1m_tokens: 3.60 },
        supported_features: ['thinking', 'tool_calling', 'vision']
    },

    // Image Generation
    {
        id: 'gemini-3-pro-image-preview', provider_id: 'google', category: 'image_generation',
        name: 'Nano Banana Pro', description: 'Google highest quality image generation model yet.',
        pricing: { per_image: 0.134 },
        supported_features: []
    },
    {
        id: 'dall-e-3', provider_id: 'openai', category: 'image_generation',
        name: 'DALL·E 3', description: 'Latest OpenAI image generation model with high fidelity.',
        pricing: { per_image: 0.04 }
    },
    {
        id: 'dall-e-2', provider_id: 'openai', category: 'image_generation',
        name: 'DALL·E 2', description: 'Lower cost image generation model.',
        pricing: { per_image: 0.018 }
    },

    // Image Understanding (VLM)
    {
        id: 'qwen/qwen3.5-397b-a17b', provider_id: 'nvidia_nim', category: 'image_understanding',
        name: 'Qwen 3.5 397B', description: 'NVIDIA NIM: Flagship MoE model (397B/17B active). Native vision and video understanding with reasoning.',
        context_window: 262144, pricing: { input_per_1m_tokens: 0.60, output_per_1m_tokens: 3.60 },
        supported_features: ['thinking', 'tool_calling', 'vision']
    },
    {
        id: 'nvidia/cosmos-reason2-8b', provider_id: 'nvidia_nim', category: 'image_understanding',
        name: 'Cosmos Reason2 8B', description: 'NVIDIA NIM: Multimodal reasoning.', context_window: 8000
    },
    {
        id: 'moonshotai/kimi-k2.5', provider_id: 'nvidia_nim', category: 'image_understanding',
        name: 'Kimi K2.5 Multimodal', description: 'NVIDIA NIM: General purpose vision.', context_window: 64000
    },

    // Audio Transcription
    {
        id: 'whisper-1', provider_id: 'openai', category: 'audio_transcription',
        name: 'Whisper v1', description: 'General-purpose speech recognition model. Supports 50+ languages.',
        pricing: { per_minute: 0.006 }
    },
    {
        id: 'nova-2', provider_id: 'deepgram', category: 'audio_transcription',
        name: 'Nova 2', description: 'Deepgram highly accurate general-purpose model.',
        pricing: { per_minute: 0.0043 }
    },
    {
        id: 'nova-3', provider_id: 'deepgram', category: 'audio_transcription',
        name: 'Nova 3', description: 'Deepgram latest high-performance ASR model.',
        pricing: { per_minute: 0.005 }
    },
    {
        id: 'whisper-cloud', provider_id: 'deepgram', category: 'audio_transcription',
        name: 'Whisper Cloud', description: 'Deepgram fully managed Whisper model.',
        pricing: { per_minute: 0.0048 }
    },
    {
        id: 'nvidia/parakeet-ctc-0.6b', provider_id: 'nvidia_nim', category: 'audio_transcription',
        name: 'Parakeet CTC 0.6B', description: 'NVIDIA NIM: Fast English ASR.',
        pricing: { per_minute: 0.0000 }
    },

    // Text to Speech
    {
        id: 'aura-2-apollo-en', provider_id: 'deepgram', category: 'text_to_speech',
        name: 'Aura 2 Apollo', description: 'Deepgram high-quality English male voice. Sub-200ms TTFB.',
        supported_features: ['streaming']
    },
    {
        id: 'aura-2-theia-en', provider_id: 'deepgram', category: 'text_to_speech',
        name: 'Aura 2 Theia', description: 'Deepgram high-quality English female voice. Sub-200ms TTFB.',
        supported_features: ['streaming']
    },
    {
        id: 'aura-2-andromeda-en', provider_id: 'deepgram', category: 'text_to_speech',
        name: 'Aura 2 Andromeda', description: 'Deepgram warm English female voice with natural cadence.',
        supported_features: ['streaming']
    },
    {
        id: 'aura-2-orpheus-en', provider_id: 'deepgram', category: 'text_to_speech',
        name: 'Aura 2 Orpheus', description: 'Deepgram deep English male voice for narration.',
        supported_features: ['streaming']
    },

    // Retrieval (Embeddings + Reranking)
    {
        id: 'nvidia/nv-embedqa-e5-v5', provider_id: 'nvidia_nim', category: 'embeddings',
        name: 'NV EmbedQA E5 v5', description: 'NVIDIA NIM: High quality embeddings.', context_window: 512
    },
    {
        id: 'nvidia/nv-rerankqa-mistral-4b-v3', provider_id: 'nvidia_nim', category: 'reranking',
        name: 'NV RerankQA Mistral 4B v3', description: 'NVIDIA NIM: Text reranker.', context_window: 8000
    }
];

export function registerRegistryHandlers() {
    ipcMain.handle('registry:getModels', async (_, category?: string) => {
        if (category) {
            return STATIC_MODELS.filter(m => m.category === category);
        }
        // Deduplicate by id+category for display
        return STATIC_MODELS;
    });

    ipcMain.handle('registry:checkForUpdate', async () => {
        return { hasUpdate: false, version: '2026.02.1' };
    });

    ipcMain.handle('registry:applyUpdate', async () => {
        // no-op for static registry
    });
}
