import OpenAI from 'openai'
import { BaseProviderAdapter, IPCEmitter, ToolCallResult } from './base.adapter'
import {
  VerifyResult,
  ProviderCredentials,
  TestRequest,
  ToolDefinition
} from '@dexterai/registry-types'

export class GithubAdapter extends BaseProviderAdapter {
  readonly providerId = 'github'

  /**
   * Maps our registry model IDs to the actual model identifiers the
   * GitHub Models API expects.  GitHub's inference endpoint uses
   * vendor-prefixed IDs for non-OpenAI models (e.g. "mistralai/…",
   * "meta-llama/…") while we store shorter, human-friendly IDs in
   * the registry.  OpenAI models (gpt-*, o1*, o3*, o4*) work with
   * bare IDs and don't need an entry here.
   */
  private static readonly MODEL_ID_MAP: Record<string, string> = {
    // Mistral models
    'mistral-7b-instruct-v0.3': 'mistralai/Mistral-7B-Instruct-v0.3',
    'mistral-small-2503': 'mistralai/Mistral-small-2503',
    'mistral-medium-2505': 'mistralai/Mistral-medium-2505',
    'codestral-2501': 'mistralai/Codestral-2501',

    // Meta / Llama models
    'llama-4-maverick-17b-128e-instruct-fp8': 'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8',
    'llama-4-scout-17b-16e-instruct': 'meta-llama/Llama-4-Scout-17B-16E-Instruct',
    'llama-3.3-70b-instruct': 'meta-llama/Llama-3.3-70B-Instruct',
    'llama-3.2-90b-vision-instruct': 'meta-llama/Llama-3.2-90B-Vision-Instruct',
    'llama-3': 'meta-llama/Meta-Llama-3-8B-Instruct',

    // DeepSeek
    'deepseek-r1': 'deepseek/DeepSeek-R1',
    'deepseek-r1-0528': 'deepseek/DeepSeek-R1-0528',
    'deepseek-v3-0324': 'deepseek/DeepSeek-V3-0324',

    // Microsoft
    'phi-4-reasoning': 'microsoft/Phi-4-reasoning',
    'phi-4-multimodal-instruct': 'microsoft/Phi-4-multimodal-instruct',
    'phi-4-mini-instruct': 'microsoft/Phi-4-mini-instruct',
    'mai-ds-r1': 'microsoft/MAI-DS-R1',

    // xAI
    'grok-3': 'xai/grok-3',
    'grok-3-mini': 'xai/grok-3-mini',

    // AI21
    'ai21-jamba-1.5-large': 'AI21-Labs/AI21-Jamba-1.5-Large',

    // Cohere
    'cohere-command-r-plus-08-2024': 'Cohere/Cohere-command-r-plus-08-2024'
  }

  /** Translate a registry model ID to a GitHub API-compatible model ID. */
  private resolveModelId(registryId: string): string {
    return GithubAdapter.MODEL_ID_MAP[registryId] || registryId
  }

  private getClient(apiKey: string): OpenAI {
    return new OpenAI({
      apiKey,
      baseURL: 'https://models.github.ai/inference',
      defaultHeaders: {
        'User-Agent': 'DexterAI/v3.02'
      }
    })
  }

  async verify(creds: ProviderCredentials): Promise<VerifyResult> {
    try {
      const client = this.getClient(creds.apiKey)

      // Use a lightweight chat request to verify the key works.
      // We intentionally return an empty accessibleModels array so the
      // ModelSelector treats ALL registry-listed GitHub models as
      // accessible (the selector treats size===0 as "no restriction").
      // The old approach of building a list from models.list() caused
      // models to be incorrectly strike-throughed because the API returns
      // vendor-prefixed IDs that didn't match our registry IDs.
      await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 1
      })

      return { success: true, accessibleModels: [] }
    } catch (err: any) {
      const status = err.status || err.response?.status

      // Non-auth errors mean the key is probably valid
      if (status && status !== 401 && status !== 403) {
        console.warn(
          'GitHub verify probe failed with non-auth error, assuming success:',
          err.message
        )
        return { success: true, accessibleModels: [] }
      }

      return {
        success: false,
        error: this.mapError(err)
      }
    }
  }

  async execute(req: TestRequest, creds: ProviderCredentials, emitter: IPCEmitter) {
    const client = this.getClient(creds.apiKey)
    const params = req.params as any
    const startTime = performance.now()
    let firstChunkTime: number | null = null

    let rawMessages = params.messages
    if (!rawMessages || rawMessages.length === 0) {
      rawMessages = [{ role: 'user', content: params.prompt || '[Empty]' }]
    }

    const apiModelId = this.resolveModelId(req.modelId)

    const stream = await this.withRetry(() =>
      client.chat.completions.create({
        model: apiModelId,
        messages: rawMessages,
        max_tokens: params.maxTokens || 4096,
        temperature: params.temperature,
        stream: true
      })
    )

    let promptTokens = 0
    let completionTokens = 0
    let finishReason = ''
    let resolvedModel = ''

    try {
      for await (const chunk of stream) {
        if (!firstChunkTime) firstChunkTime = performance.now()
        if (!resolvedModel && chunk.model) resolvedModel = chunk.model

        const content = chunk.choices[0]?.delta?.content || ''
        const reasoning = (chunk.choices[0]?.delta as any)?.reasoning_content || ''
        if (content || reasoning) {
          emitter.emit('test:chunk', {
            requestId: req.requestId,
            text: content,
            thought: reasoning || undefined
          })
        }

        if (chunk.choices[0]?.finish_reason) {
          finishReason = chunk.choices[0].finish_reason
        }

        if ((chunk as any).usage) {
          promptTokens = (chunk as any).usage.prompt_tokens
          completionTokens = (chunk as any).usage.completion_tokens
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
      })
    } catch (err: any) {
      emitter.emit('test:error', {
        requestId: req.requestId,
        ...this.mapError(err)
      })
    }
  }

  async executeWithTools(
    req: TestRequest,
    creds: ProviderCredentials,
    emitter: IPCEmitter,
    tools: ToolDefinition[]
  ): Promise<ToolCallResult> {
    const client = this.getClient(creds.apiKey)
    const params = req.params as any

    const formattedTools = tools.map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters as any
      }
    }))

    let rawMessages = params.messages
    if (!rawMessages || rawMessages.length === 0) {
      rawMessages = [{ role: 'user', content: params.prompt || '[Empty]' }]
    }

    const apiModelId = this.resolveModelId(req.modelId)

    const response = await this.withRetry(() =>
      client.chat.completions.create({
        model: apiModelId,
        messages: rawMessages,
        tools: formattedTools,
        tool_choice: 'auto',
        max_tokens: params.maxTokens || 4096,
        temperature: params.temperature ?? 0.6
      })
    )

    const choice = response.choices[0]
    const message = choice.message

    const text = message.content || ''
    if (text) {
      emitter.emit('test:chunk', {
        requestId: req.requestId,
        text: text
      })
    }

    const toolCalls = (message.tool_calls || []).map((tc: any) => {
      let parsedArgs = {}
      try {
        parsedArgs = tc.function?.arguments ? JSON.parse(tc.function.arguments) : {}
      } catch (e) {
        console.error('Failed to parse tool arguments from GitHub:', e)
      }
      return {
        id: tc.id || `call_${Date.now()}`,
        name: tc.function?.name || 'unknown_tool',
        arguments: parsedArgs
      }
    })

    return {
      text,
      thought: (message as any).reasoning_content || '',
      toolCalls,
      finishReason: choice.finish_reason || 'stop',
      promptTokens: response.usage?.prompt_tokens || 0,
      completionTokens: response.usage?.completion_tokens || 0,
      resolvedModel: response.model
    }
  }
}
