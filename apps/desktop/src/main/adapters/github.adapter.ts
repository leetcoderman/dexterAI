import OpenAI from 'openai';
import { BaseProviderAdapter, IPCEmitter, ToolCallResult } from './base.adapter';
import { VerifyResult, ProviderCredentials, TestRequest, ToolDefinition } from '@dexterai/registry-types';

export class GithubAdapter extends BaseProviderAdapter {
    readonly providerId = 'github';

    private getClient(apiKey: string): OpenAI {
        return new OpenAI({
            apiKey,
            baseURL: 'https://models.github.ai/inference',
            defaultHeaders: {
                'User-Agent': 'DexterAI/v3.02'
            }
        });
    }

    async verify(creds: ProviderCredentials): Promise<VerifyResult> {
        try {
            const client = this.getClient(creds.apiKey);

            // GitHub Models API is compatible with OpenAI's models.list()
            const response = await client.models.list();
            const accessibleModels: string[] = [];

            for await (const model of response) {
                const fullId = model.id;
                // GitHub often returns IDs like "openai/gpt-4o" or "azure/llama-3".
                // We strip the prefix to match our registry IDs.
                const parts = fullId.split('/');
                const shortId = parts[parts.length - 1];

                accessibleModels.push(shortId.toLowerCase());
                // Also push the full ID just in case the registry uses it
                accessibleModels.push(fullId.toLowerCase());
            }

            // If we successfully got a list (even empty), it's a success
            return { success: true, accessibleModels: Array.from(new Set(accessibleModels)) };
        } catch (err: any) {
            // If the error is not a 401/403, the key might still be valid for specific models
            // even if listing fails (common in restricted environments).
            const status = err.status || err.response?.status;
            if (status && status !== 401 && status !== 403) {
                console.warn('GitHub models.list() failed with non-auth error, assuming success:', err.message);
                return { success: true, accessibleModels: [] };
            }

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

        let rawMessages = params.messages;
        if (!rawMessages || rawMessages.length === 0) {
            rawMessages = [{ role: 'user', content: params.prompt || '[Empty]' }];
        }

        const stream = await this.withRetry(() =>
            client.chat.completions.create({
                model: req.modelId,
                messages: rawMessages,
                max_tokens: params.maxTokens || 4096,
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
                        thought: reasoning || undefined
                    });
                }

                if (chunk.choices[0]?.finish_reason) {
                    finishReason = chunk.choices[0].finish_reason;
                }

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
                resolvedModel
            });
        } catch (err: any) {
            emitter.emit('test:error', {
                requestId: req.requestId,
                ...this.mapError(err)
            });
        }
    }

    async executeWithTools(
        req: TestRequest,
        creds: ProviderCredentials,
        emitter: IPCEmitter,
        tools: ToolDefinition[]
    ): Promise<ToolCallResult> {
        const client = this.getClient(creds.apiKey);
        const params = req.params as any;

        const formattedTools = tools.map((t) => ({
            type: 'function' as const,
            function: {
                name: t.name,
                description: t.description,
                parameters: t.parameters as any
            }
        }));

        let rawMessages = params.messages;
        if (!rawMessages || rawMessages.length === 0) {
            rawMessages = [{ role: 'user', content: params.prompt || '[Empty]' }];
        }

        const response = await this.withRetry(() =>
            client.chat.completions.create({
                model: req.modelId,
                messages: rawMessages,
                tools: formattedTools,
                tool_choice: 'auto',
                max_tokens: params.maxTokens || 4096,
                temperature: params.temperature ?? 0.6,
            })
        );

        const choice = response.choices[0];
        const message = choice.message;

        const text = message.content || '';
        if (text) {
            emitter.emit('test:chunk', {
                requestId: req.requestId,
                text: text
            });
        }

        const toolCalls = (message.tool_calls || []).map((tc: any) => {
            let parsedArgs = {};
            try {
                parsedArgs = tc.function?.arguments ? JSON.parse(tc.function.arguments) : {};
            } catch (e) {
                console.error('Failed to parse tool arguments from GitHub:', e);
            }
            return {
                id: tc.id || `call_${Date.now()}`,
                name: tc.function?.name || 'unknown_tool',
                arguments: parsedArgs
            };
        });

        return {
            text,
            thought: (message as any).reasoning_content || '',
            toolCalls,
            finishReason: choice.finish_reason || 'stop',
            promptTokens: response.usage?.prompt_tokens || 0,
            completionTokens: response.usage?.completion_tokens || 0,
            resolvedModel: response.model
        };
    }
}
