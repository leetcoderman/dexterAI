import { BaseProviderAdapter, IPCEmitter } from './base.adapter';
import { TestRequest, ProviderError, VerifyResult, ProviderCredentials } from '@dexterai/registry-types';
import { GoogleGenerativeAI, GenerationConfig } from '@google/generative-ai';

export class GoogleAdapter extends BaseProviderAdapter {
    providerId = 'google';

    async verify(credentials: ProviderCredentials): Promise<VerifyResult> {
        try {
            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models?key=${credentials.apiKey}`
            );
            if (!res.ok) {
                const status = res.status;
                if (status === 403 || status === 401 || status === 400) {
                    return { success: false, error: { code: 'INVALID_KEY', message: 'Invalid or unauthorized Google API Key', isRetryable: false } };
                }
                return {
                    success: false,
                    error: {
                        code: 'PROVIDER_ERROR',
                        message: `Google API Error: HTTP ${status}`,
                        isRetryable: this.isRetryable(status)
                    }
                };
            }
            const data = await res.json();
            const accessibleModels: string[] = (data.models || [])
                .map((m: any) => (m.name || '').replace('models/', ''))
                .filter(Boolean);
            return { success: true, accessibleModels };
        } catch (e: any) {
            if (e.message?.includes('API key not valid') || e.status === 403 || e.status === 401) {
                return { success: false, error: { code: 'INVALID_KEY', message: 'Invalid or unauthorized Google API Key', isRetryable: false } };
            }
            return {
                success: false,
                error: {
                    code: 'PROVIDER_ERROR',
                    message: `Google API Error: ${e.message}`,
                    isRetryable: this.isRetryable(e.status)
                }
            };
        }
    }

    async execute(request: TestRequest, credentials: ProviderCredentials, emitter: IPCEmitter): Promise<void> {
        const { modelId, params } = request;
        const genAI = new GoogleGenerativeAI(credentials.apiKey);

        const startTime = Date.now();
        let firstTokenTime: number | null = null;
        let promptTokens = 0;
        let completionTokens = 0;

        try {
            const messages = params.messages || [];
            let systemInstruction = params.systemPrompt || '';
            const contents: any[] = [];

            messages.forEach((m: any) => {
                if (m.role === 'system') {
                    systemInstruction = m.content;
                } else {
                    contents.push({
                        role: m.role === 'assistant' ? 'model' : 'user',
                        parts: [{ text: m.content }]
                    });
                }
            });

            // Fallback for single prompt if no messages provided
            if (contents.length === 0 && params.prompt) {
                contents.push({
                    role: 'user',
                    parts: [{ text: String(params.prompt) }]
                });
            }

            const modelConfig: any = {
                model: modelId
            };

            if (systemInstruction) {
                modelConfig.systemInstruction = systemInstruction;
            }

            const model = genAI.getGenerativeModel(modelConfig);

            const generationConfig: GenerationConfig = {
                temperature: Number(params.temperature ?? 0.7),
                maxOutputTokens: Number(params.maxTokens ?? 8192),
                topP: Number(params.topP ?? 1),
            };

            // Thinking level config. According to Gemini 3.1 preview docs, it might be nested in generationConfig.
            if (params.thinkingLevel && params.thinkingLevel !== 'none') {
                (generationConfig as any).thinkingConfig = {
                    thinkingBudgetTokens: params.maxTokens ? Math.floor(Number(params.maxTokens) * 0.5) : 1024 // arbitrary logic for now
                };
            }

            if (params.jsonMode) {
                generationConfig.responseMimeType = "application/json";
            }

            if (params.stopSequences && Array.isArray(params.stopSequences)) {
                generationConfig.stopSequences = params.stopSequences;
            }

            // Execute Streaming
            const resultStream = await this.withRetry(() =>
                model.generateContentStream({
                    contents,
                    generationConfig
                })
            );

            let accumulatedText = '';
            let finishReason = 'stop';

            for await (const chunk of resultStream.stream) {
                if (!firstTokenTime) {
                    firstTokenTime = Date.now();
                }

                const chunkText = chunk.text();
                // Google "Thinking" models often put the thought in a specific part if available.
                // The current SDK might consolidate them into text() or have a separate field.
                // We'll treat standard text as text, but if we detect bracketed thoughts or specific fields, we handle them.
                const thought = (chunk as any).thought || '';

                accumulatedText += chunkText;

                emitter.emit('test:chunk', {
                    requestId: request.requestId,
                    text: chunkText,
                    thought: thought
                });

                if (chunk.promptFeedback) {
                    // We could log blockReason if it hit safety issues
                }

                if (chunk.candidates && chunk.candidates[0]?.finishReason) {
                    finishReason = chunk.candidates[0].finishReason.toLowerCase();
                }
            }

            const response = await resultStream.response;
            const resolvedModel = (response as any).modelVersion || '';

            if (response.usageMetadata) {
                promptTokens = response.usageMetadata.promptTokenCount;
                completionTokens = response.usageMetadata.candidatesTokenCount;
            }

            const endTime = Date.now();
            const totalTime = endTime - startTime;
            const ttft = firstTokenTime ? firstTokenTime - startTime : totalTime;

            emitter.emit('test:done', {
                requestId: request.requestId,
                ttft,
                totalTime,
                promptTokens,
                completionTokens,
                finishReason,
                resolvedModel
            });

        } catch (e: any) {
            const providerError: ProviderError = {
                requestId: request.requestId,
                code: 'GOOGLE_ERROR',
                message: e.message || 'An unknown error occurred with Google Gemini'
            };
            emitter.emit('test:error', providerError);
        }
    }
}
