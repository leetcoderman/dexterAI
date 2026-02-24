import OpenAI from 'openai';
import { BaseProviderAdapter, IPCEmitter } from './base.adapter';
import { VerifyResult, ProviderCredentials, TestRequest } from '@dexterai/registry-types';

export class OpenAIAdapter extends BaseProviderAdapter {
    readonly providerId = 'openai';

    private getClient(apiKey: string): OpenAI {
        return new OpenAI({ apiKey });
    }

    async verify(creds: ProviderCredentials): Promise<VerifyResult> {
        try {
            const client = this.getClient(creds.apiKey);
            await client.models.list();
            return { success: true };
        } catch (err: any) {
            return {
                success: false,
                error: this.mapError(err)
            };
        }
    }

    async execute(req: TestRequest, creds: ProviderCredentials, emitter: IPCEmitter) {
        const client = this.getClient(creds.apiKey);
        const params = req.params as any;
        const startTime = performance.now();
        let firstChunkTime: number | null = null;

        const stream = await this.withRetry(() =>
            client.chat.completions.create({
                model: req.modelId,
                messages: params.messages || [{ role: 'user', content: params.prompt }],
                max_tokens: params.maxTokens || 1024,
                temperature: params.temperature,
                stream: true,
            })
        );

        let promptTokens = 0;
        let completionTokens = 0;
        let finishReason = '';

        for await (const chunk of stream) {
            if (!firstChunkTime) firstChunkTime = performance.now();

            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
                emitter.emit('test:chunk', { requestId: req.requestId, text: content });
            }

            if (chunk.choices[0]?.finish_reason) {
                finishReason = chunk.choices[0].finish_reason;
            }

            // Usage info is sent in the last chunk when stream_options.include_usage = true
            if (chunk.usage) {
                promptTokens = chunk.usage.prompt_tokens;
                completionTokens = chunk.usage.completion_tokens;
            }
        }

        emitter.emit('test:done', {
            requestId: req.requestId,
            ttft: firstChunkTime ? firstChunkTime - startTime : null,
            totalTime: performance.now() - startTime,
            promptTokens: promptTokens,
            completionTokens: completionTokens,
            finishReason: finishReason,
            cacheReadTokens: 0
        });
    }
}
