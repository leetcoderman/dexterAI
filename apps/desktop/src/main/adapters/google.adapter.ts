import { BaseProviderAdapter, IPCEmitter, ToolCallResult } from './base.adapter';
import { TestRequest, ProviderError, VerifyResult, ProviderCredentials, ToolDefinition } from '@dexterai/registry-types';
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

    private mapMessagesToGeminiContents(messages: any[]): { contents: any[], systemInstruction: string } {
        let systemInstruction = '';
        const contents: any[] = [];

        messages.forEach((m: any) => {
            if (m.role === 'system') {
                systemInstruction += (systemInstruction ? '\n' : '') + m.content;
            } else if (m.role === 'tool' || m.role === 'function') {
                contents.push({
                    role: 'user',
                    parts: [{
                        functionResponse: {
                            name: m.name || m.tool_call_id || 'unknown_tool',
                            response: { result: m.content }
                        }
                    }]
                });
            } else {
                const parts: any[] = [];
                const toolCalls = m.tool_calls || m.toolCalls;

                if (Array.isArray(toolCalls)) {
                    toolCalls.forEach((tc: any) => {
                        let args = tc.arguments || tc.function?.arguments || {};
                        if (typeof args === 'string') {
                            try { args = JSON.parse(args); } catch (e) { args = {}; }
                        }

                        const partToPush: any = {
                            functionCall: {
                                name: tc.name || tc.function?.name || 'unknown_tool',
                                args: args
                            }
                        };

                        // Restore the Thought Signature for Gemini 3
                        if (tc.thoughtSignature) {
                            partToPush.thought_signature = tc.thoughtSignature;
                            partToPush.thoughtSignature = tc.thoughtSignature;
                        }

                        parts.push(partToPush);
                    });
                }

                const rawContent = typeof m.content === 'string' ? m.content.trim() : '';
                if (rawContent.length > 0) {
                    parts.push({ text: m.content });
                } else if (parts.length === 0) {
                    parts.push({ text: '[Empty content]' });
                }

                contents.push({
                    role: m.role === 'assistant' ? 'model' : 'user',
                    parts: parts
                });
            }
        });

        return { contents, systemInstruction };
    }

    async execute(request: TestRequest, credentials: ProviderCredentials, emitter: IPCEmitter): Promise<void> {
        const { modelId, params } = request;
        const genAI = new GoogleGenerativeAI(credentials.apiKey);

        const startTime = Date.now();
        let firstTokenTime: number | null = null;
        let promptTokens = 0;
        let completionTokens = 0;

        try {
            const { contents, systemInstruction } = this.mapMessagesToGeminiContents(params.messages || []);

            if (contents.length === 0 && params.prompt) {
                const rawPrompt = typeof params.prompt === 'string' ? params.prompt.trim() : String(params.prompt).trim();
                const safePrompt = rawPrompt.length > 0 ? String(params.prompt) : '[Empty content]';

                contents.push({
                    role: 'user',
                    parts: [{ text: safePrompt }]
                });
            }

            const modelConfig: any = { model: modelId };
            if (systemInstruction) modelConfig.systemInstruction = systemInstruction;

            const model = genAI.getGenerativeModel(modelConfig);

            const generationConfig: GenerationConfig = {
                temperature: Number(params.temperature ?? 0.7),
                maxOutputTokens: Number(params.maxTokens ?? 4096),
                topP: Number(params.topP ?? 1),
            };

            if (params.thinkingLevel && params.thinkingLevel !== 'none') {
                (generationConfig as any).thinkingConfig = {
                    thinkingBudgetTokens: params.maxTokens ? Math.floor(Number(params.maxTokens) * 0.5) : 1024
                };
            }

            if (params.jsonMode) {
                generationConfig.responseMimeType = "application/json";
            }

            if (params.stopSequences && Array.isArray(params.stopSequences)) {
                generationConfig.stopSequences = params.stopSequences;
            }

            const resultStream = await this.withRetry(() =>
                model.generateContentStream({
                    contents,
                    generationConfig
                })
            );

            let accumulatedText = '';
            let finishReason = 'stop';

            for await (const chunk of resultStream.stream) {
                if (!firstTokenTime) firstTokenTime = Date.now();

                const chunkText = chunk.text();
                const thought = (chunk as any).thought || '';
                accumulatedText += chunkText;

                emitter.emit('test:chunk', {
                    requestId: request.requestId,
                    text: chunkText,
                    thought: thought
                });

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

    async executeWithTools(
        request: TestRequest,
        credentials: ProviderCredentials,
        emitter: IPCEmitter,
        tools: ToolDefinition[]
    ): Promise<ToolCallResult> {
        const { modelId, params } = request;
        const genAI = new GoogleGenerativeAI(credentials.apiKey);

        const { contents, systemInstruction } = this.mapMessagesToGeminiContents(params.messages || []);

        const googleTools = [{
            functionDeclarations: tools.map((t) => ({
                name: t.name,
                description: t.description,
                parameters: t.parameters as any
            }))
        }] as any;

        const modelConfig: any = { model: modelId };
        if (systemInstruction) modelConfig.systemInstruction = systemInstruction;

        const model = genAI.getGenerativeModel(modelConfig);

        const generationConfig: GenerationConfig = {
            temperature: Number(params.temperature ?? 0.7),
            maxOutputTokens: Number(params.maxTokens ?? 4096)
        };

        const result = await this.withRetry(() =>
            model.generateContent({
                contents,
                generationConfig,
                tools: googleTools
            })
        );

        const response = result.response;
        let text = '';
        let thought = '';
        const toolCalls: { id: string; name: string; arguments: Record<string, any>, thoughtSignature?: string }[] = [];

        for (const candidate of response.candidates || []) {
            for (const part of candidate.content?.parts || []) {
                if (part.text) {
                    text += part.text;
                    emitter.emit('test:chunk', { requestId: request.requestId, text: part.text });
                }
                if (part.functionCall) {
                    toolCalls.push({
                        id: `google_tc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                        name: part.functionCall.name,
                        arguments: part.functionCall.args as Record<string, any>,
                        // Capture the Thought Signature from the part
                        thoughtSignature: (part as any).thought_signature || (part as any).thoughtSignature
                    });
                }
            }
        }

        const resolvedModel = (response as any).modelVersion || '';
        const promptTokens = response.usageMetadata?.promptTokenCount || 0;
        const completionTokens = response.usageMetadata?.candidatesTokenCount || 0;
        const finishReason = response.candidates?.[0]?.finishReason?.toLowerCase() || 'stop';

        return { text, thought, toolCalls, finishReason, promptTokens, completionTokens, resolvedModel };
    }
}