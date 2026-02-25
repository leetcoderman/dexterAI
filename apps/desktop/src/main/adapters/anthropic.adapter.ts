import Anthropic from '@anthropic-ai/sdk';
import { BaseProviderAdapter, IPCEmitter } from './base.adapter';
import { VerifyResult, ProviderCredentials, TestRequest } from '@dexterai/registry-types';

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

        const stream = await this.withRetry(() =>
            client.messages.create({
                model: req.modelId,
                max_tokens: params.maxTokens || 8192,
                messages: params.messages || [{ role: 'user', content: params.prompt }],
                system: params.systemPrompt,
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
}
