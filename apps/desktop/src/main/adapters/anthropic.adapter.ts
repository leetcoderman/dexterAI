import Anthropic from '@anthropic-ai/sdk';
import { BaseProviderAdapter, IPCEmitter, ToolCallResult } from './base.adapter';
import { VerifyResult, ProviderCredentials, TestRequest, ToolDefinition } from '@dexterai/registry-types';

export class AnthropicAdapter extends BaseProviderAdapter {
    readonly providerId = 'anthropic';

    private getClient(apiKey: string): Anthropic {
        return new Anthropic({ apiKey });
    }

    async verify(creds: ProviderCredentials): Promise<VerifyResult> {
        try {
            const client = this.getClient(creds.apiKey);
            // Simple verify call. Not all APIs have a models.list, but it's the standard test.
            await client.models.list();
            return { success: true };
        } catch (err: any) {
            return {
                success: false,
                error: {
                    code: err.error?.type || err.name || 'UNKNOWN',
                    message: err.message,
                    isRetryable: this.isRetryable(err.status)
                }
            };
        }
    }

    async execute(req: TestRequest, creds: ProviderCredentials, emitter: IPCEmitter) {
        const client = this.getClient(creds.apiKey);
        const params = req.params as any;
        const startTime = performance.now();
        let firstChunkTime: number | null = null;

        // Anthropic requires system messages as a separate top-level param, not in messages array
        const allMessages = params.messages || [{ role: 'user', content: params.prompt }];
        let systemPrompt = params.systemPrompt || '';
        const filteredMessages: any[] = [];
        for (const m of allMessages) {
            if (m.role === 'system') {
                systemPrompt = systemPrompt ? systemPrompt + '\n\n' + m.content : m.content;
            } else {
                filteredMessages.push(m);
            }
        }

        const stream = await this.withRetry(() =>
            client.messages.create({
                model: req.modelId,
                max_tokens: params.maxTokens || 32768,
                messages: filteredMessages,
                system: systemPrompt || undefined,
                temperature: params.temperature,
                stream: true
            })
        );

        let inputTokens = 0;
        let outputTokens = 0;
        let stopReason = '';
        let resolvedModel = '';

        for await (const event of stream) {
            if (event.type === 'message_start') {
                inputTokens = event.message.usage.input_tokens;
                resolvedModel = event.message.model || '';
            } else if (event.type === 'message_delta') {
                stopReason = event.delta.stop_reason || '';
                if (event.usage) outputTokens = event.usage.output_tokens;
            } else if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                if (!firstChunkTime) firstChunkTime = performance.now();
                emitter.emit('test:chunk', { requestId: req.requestId, text: event.delta.text });
            }
        }

        emitter.emit('test:done', {
            requestId: req.requestId,
            ttft: firstChunkTime ? firstChunkTime - startTime : null,
            totalTime: performance.now() - startTime,
            promptTokens: inputTokens,
            completionTokens: outputTokens,
            finishReason: stopReason,
            cacheReadTokens: 0,
            resolvedModel
        });
    }

    async executeWithTools(
        req: TestRequest,
        creds: ProviderCredentials,
        emitter: IPCEmitter,
        tools: ToolDefinition[]
    ): Promise<ToolCallResult> {
        const client = this.getClient(creds.apiKey);
        const params = req.params as any;

        const anthropicTools = tools.map((t) => ({
            name: t.name,
            description: t.description,
            input_schema: t.parameters as any
        }));

        // Separate system from messages (Anthropic requires system as a top-level param)
        const allMessages = params.messages || [];
        let systemPrompt = params.systemPrompt || '';
        const messages: any[] = [];
        for (const m of allMessages) {
            if (m.role === 'system') {
                systemPrompt = systemPrompt ? systemPrompt + '\n\n' + m.content : m.content;
            } else {
                messages.push(m);
            }
        }

        const stream = await this.withRetry(() =>
            client.messages.create({
                model: req.modelId,
                max_tokens: params.maxTokens || 32768,
                messages,
                system: systemPrompt || undefined,
                temperature: params.temperature,
                tools: anthropicTools,
                stream: true
            })
        );

        let text = '';
        let thought = '';
        let inputTokens = 0;
        let outputTokens = 0;
        let stopReason = '';
        let resolvedModel = '';

        // Track tool_use content blocks
        const toolCalls: { id: string; name: string; arguments: Record<string, any> }[] = [];
        let currentToolId = '';
        let currentToolName = '';
        let currentToolInput = '';

        for await (const event of stream) {
            if (event.type === 'message_start') {
                inputTokens = event.message.usage.input_tokens;
                resolvedModel = event.message.model || '';
            } else if (event.type === 'message_delta') {
                stopReason = event.delta.stop_reason || '';
                if (event.usage) outputTokens = event.usage.output_tokens;
            } else if (event.type === 'content_block_start') {
                if (event.content_block.type === 'tool_use') {
                    currentToolId = event.content_block.id;
                    currentToolName = event.content_block.name;
                    currentToolInput = '';
                }
            } else if (event.type === 'content_block_delta') {
                if (event.delta.type === 'text_delta') {
                    text += event.delta.text;
                    emitter.emit('test:chunk', { requestId: req.requestId, text: event.delta.text });
                } else if (event.delta.type === 'input_json_delta') {
                    currentToolInput += (event.delta as any).partial_json || '';
                }
            } else if (event.type === 'content_block_stop') {
                if (currentToolId) {
                    try {
                        toolCalls.push({
                            id: currentToolId,
                            name: currentToolName,
                            arguments: JSON.parse(currentToolInput || '{}')
                        });
                    } catch {
                        toolCalls.push({
                            id: currentToolId,
                            name: currentToolName,
                            arguments: {}
                        });
                    }
                    currentToolId = '';
                    currentToolName = '';
                    currentToolInput = '';
                }
            }
        }

        return { text, thought, toolCalls, finishReason: stopReason, promptTokens: inputTokens, completionTokens: outputTokens, resolvedModel };
    }
}
