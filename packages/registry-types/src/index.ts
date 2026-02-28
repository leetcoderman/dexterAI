export type Category =
    | 'text_generation'
    | 'code_generation'
    | 'image_generation'
    | 'audio_transcription'
    | 'image_understanding'
    | 'text_to_speech'
    | 'embeddings'
    | 'object_detection'
    | 'reranking'
    | 'document_understanding'
    | 'music_generation'
    | 'video_generation'
    | '3d_generation';

export interface RegistryPricing {
    input_per_1m_tokens?: number;
    output_per_1m_tokens?: number;
    per_image?: number;
    per_minute?: number;
}

export interface RegistryModel {
    id: string;
    provider_id: string;
    category: Category;
    name: string;
    description: string;
    context_window?: number;
    max_output_tokens?: number;
    pricing?: RegistryPricing;
    pricing_updated?: string;
    supported_features?: string[];
    knowledge_cutoff?: string;
    capabilities?: string[];
    performance_metrics?: {
        speed: number | string;
        reasoning: number;
        coding: number;
    };
    description_long?: string;
}

export interface ProviderConfig {
    provider_id: string;
    display_name: string;
    auth?: Record<string, any>;
    base_url?: string;
    sdk_wrapper?: string;
    verify_endpoint?: string;
    key_generation_url?: string;
    docs_url?: string;
    pricing_url?: string;
    status_url?: string;
    rate_limit_rpm?: number;
    free_tier?: boolean;
    free_tier_note?: string;
}

export interface Registry {
    registry_version: string;
    providers?: ProviderConfig[];
    models: RegistryModel[];
}

// Credentials
export interface ProviderCredentials {
    apiKey: string;
    extras?: Record<string, string>;
}

export interface VerifyResult {
    success: boolean;
    error?: Omit<ProviderError, 'requestId'>;
    accessibleModels?: string[];
}

// IPC Contracts
export interface TestRequest {
    requestId: string;
    modelId: string;
    providerId: string;
    category: Category;
    params: Record<string, any>; // Abstracted for now
}

export interface StreamChunk {
    requestId: string;
    text?: string;
    thought?: string;
}

export interface EvaluationMetrics {
    requestId: string;
    ttft: number | null;
    totalTime: number;
    promptTokens: number;
    completionTokens: number;
    finishReason?: string;
    cacheReadTokens?: number;
    resolvedModel?: string;
}

export interface ProviderError {
    requestId: string;
    code: string;
    message: string;
    isRetryable?: boolean;
    actionLabel?: string;
    actionTarget?: string;
}

export interface TestRun {
    id: string;
    model_id: string;
    provider_id: string;
    category: string;
    params_json: string;
    output_summary: string | null;
    metrics_json: string;
    ran_at: number;
    error: string | null;
}

export interface PromptTemplate {
    id: string;
    name: string;
    category: string;
    params_json: string;
    created_at: number;
    updated_at: number;
}

export interface JobProgress {
    requestId: string;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    progressPct?: number;
    eta?: number;
}

// v2: Chat & Conversations

export interface ConversationSettings {
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    memoryEnabled?: boolean;
}

export interface Conversation {
    id: string;
    title: string | null;
    created_at: string;
    updated_at: string;
    settings_json: string;
}

export interface ConversationSummary {
    id: string;
    title: string | null;
    last_message_preview: string | null;
    last_message_at: string | null;
    model_id: string | null;
    provider_id: string | null;
    message_count: number;
    updated_at: string;
}

export interface ChatMessage {
    id: string;
    conversation_id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    model_id: string | null;
    provider_id: string | null;
    token_count: number;
    created_at: string;
    metadata_json: string;
}

export interface Memory {
    id: string;
    key: string;
    content: string;
    source_conversation_id: string | null;
    created_at: string;
    updated_at: string;
    is_pinned: number;
}

export interface ChatRequest {
    conversationId: string;
    requestId: string;
    modelId: string;
    providerId: string;
    messages: { role: string; content: string }[];
    params: Record<string, any>;
}

// v3: Agentic Tool System

export interface ToolDefinition {
    name: string;
    description: string;
    parameters: Record<string, any>; // JSON Schema
}

export interface ToolCall {
    id: string;
    name: string;
    arguments: Record<string, any>;
}

export interface ToolResult {
    toolCallId: string;
    name: string;
    result: string;
    isError?: boolean;
}

export interface AgentRequest {
    conversationId: string;
    requestId: string;
    modelId: string;
    providerId: string;
    messages: { role: string; content: string }[];
    params: Record<string, any>;
    projectRoot: string;
}

export interface AgentToolEvent {
    requestId: string;
    toolCall: ToolCall;
    result: ToolResult;
}

// v3 Phase 4: Human-in-the-Loop Approval

export interface AgentApprovalRequest {
    requestId: string;
    approvalId: string;
    toolCall: ToolCall;
    approvalType: 'file_write' | 'command';
    // File write fields
    filePath?: string;
    oldContent?: string;
    newContent?: string;
    // Command fields
    command?: string;
    cwd?: string;
}
