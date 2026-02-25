import OpenAI from 'openai';
import { BaseProviderAdapter, IPCEmitter } from './base.adapter';
import { VerifyResult, ProviderCredentials, TestRequest } from '@dexterai/registry-types';

export class NvidiaAdapter extends BaseProviderAdapter {
    readonly providerId = 'nvidia_nim';

    private getClient(apiKey: string): OpenAI {
        return new OpenAI({
            apiKey,
            baseURL: 'https://integrate.api.nvidia.com/v1',
        });
    }

    async verify(creds: ProviderCredentials): Promise<VerifyResult> {
        try {
            const client = this.getClient(creds.apiKey);
            const response = await client.models.list();
            const accessibleModels: string[] = [];
            for await (const model of response) {
                accessibleModels.push(model.id);
            }
            return { success: true, accessibleModels };
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
                model: req.modelId, // This will be "org/model-name"
                messages: params.messages || [{ role: 'user', content: params.prompt }],
                max_tokens: params.maxTokens || 8192,
                temperature: params.temperature,
                stream: true,
            })
        );

        let promptTokens = 0;
        let completionTokens = 0;
        let finishReason = '';
        let resolvedModel = '';

        try {
            for await (const chunk of stream) {
                if (!firstChunkTime) firstChunkTime = performance.now();
                if (!resolvedModel && chunk.model) resolvedModel = chunk.model;

                const content = chunk.choices[0]?.delta?.content || '';
                const reasoning = (chunk.choices[0]?.delta as any)?.reasoning_content || '';

                if (content || reasoning) {
                    emitter.emit('test:chunk', {
                        requestId: req.requestId,
                        text: content,
                        thought: reasoning
                    });
                }

                if (chunk.choices[0]?.finish_reason) {
                    finishReason = chunk.choices[0].finish_reason;
                }

                // Parse usage if provided
                if ((chunk as any).usage) {
                    promptTokens = (chunk as any).usage.prompt_tokens;
                    completionTokens = (chunk as any).usage.completion_tokens;
                }
            }

            emitter.emit('test:done', {
                requestId: req.requestId,
                ttft: firstChunkTime ? firstChunkTime - startTime : null,
                totalTime: performance.now() - startTime,
                promptTokens: promptTokens,
                completionTokens: completionTokens,
                finishReason: finishReason,
                cacheReadTokens: 0,
                resolvedModel
            });
        } catch (err: any) {
            if (err.status === 503) {
                emitter.emit('test:error', {
                    requestId: req.requestId,
                    code: 'NVIDIA_SERVICE_UNAVAILABLE',
                    message: 'NVIDIA NIM is currently overloaded or unavailable. Please check status.nvidia.com',
                    actionLabel: 'Check Status',
                    actionTarget: 'https://status.nvidia.com'
                });
                return;
            }
            emitter.emit('test:error', {
                requestId: req.requestId,
                ...this.mapError(err)
            });
        }
    }
}
