import OpenAI from 'openai'
import { BaseProviderAdapter, IPCEmitter, ToolCallResult } from './base.adapter'
import {
  VerifyResult,
  ProviderCredentials,
  TestRequest,
  ToolDefinition
} from '@dexterai/registry-types'

export class OpenAIAdapter extends BaseProviderAdapter {
  readonly providerId = 'openai'

  private getClient(apiKey: string): OpenAI {
    return new OpenAI({ apiKey })
  }

  async verify(creds: ProviderCredentials): Promise<VerifyResult> {
    try {
      const client = this.getClient(creds.apiKey)
      await client.models.list()
      return { success: true }
    } catch (err: any) {
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

    const stream = await this.withRetry(() =>
      client.chat.completions.create({
        model: req.modelId,
        messages: params.messages || [{ role: 'user', content: params.prompt }],
        max_tokens: params.maxTokens || 4096,
        temperature: params.temperature,
        stream: true
      })
    )

    let promptTokens = 0
    let completionTokens = 0
    let finishReason = ''
    let resolvedModel = ''

    for await (const chunk of stream) {
      if (!firstChunkTime) firstChunkTime = performance.now()
      if (!resolvedModel && chunk.model) resolvedModel = chunk.model

      const content = chunk.choices[0]?.delta?.content || ''
      const reasoning = (chunk.choices[0]?.delta as any)?.reasoning_content || ''

      if (content || reasoning) {
        emitter.emit('test:chunk', {
          requestId: req.requestId,
          text: content,
          thought: reasoning
        })
      }

      if (chunk.choices[0]?.finish_reason) {
        finishReason = chunk.choices[0].finish_reason
      }

      // Usage info is sent in the last chunk when stream_options.include_usage = true
      if (chunk.usage) {
        promptTokens = chunk.usage.prompt_tokens
        completionTokens = chunk.usage.completion_tokens
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
    })
  }

  async executeWithTools(
    req: TestRequest,
    creds: ProviderCredentials,
    emitter: IPCEmitter,
    tools: ToolDefinition[]
  ): Promise<ToolCallResult> {
    const client = this.getClient(creds.apiKey)
    const params = req.params as any

    const openaiTools = tools.map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters
      }
    }))

    const stream = await this.withRetry(() =>
      client.chat.completions.create({
        model: req.modelId,
        messages: params.messages,
        max_tokens: params.maxTokens || 4096,
        temperature: params.temperature,
        tools: openaiTools,
        stream: true
      })
    )

    let text = ''
    let thought = ''
    let promptTokens = 0
    let completionTokens = 0
    let finishReason = ''
    let resolvedModel = ''

    // Accumulate tool calls from streamed deltas
    const toolCallMap = new Map<number, { id: string; name: string; arguments: string }>()

    for await (const chunk of stream) {
      if (!resolvedModel && chunk.model) resolvedModel = chunk.model

      const delta = chunk.choices[0]?.delta
      const content = delta?.content || ''
      const reasoning = (delta as any)?.reasoning_content || ''

      if (content) {
        text += content
        emitter.emit('test:chunk', { requestId: req.requestId, text: content })
      }
      if (reasoning) {
        thought += reasoning
        emitter.emit('test:chunk', { requestId: req.requestId, thought: reasoning })
      }

      // Accumulate tool call deltas
      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          if (!toolCallMap.has(tc.index)) {
            toolCallMap.set(tc.index, {
              id: tc.id || '',
              name: tc.function?.name || '',
              arguments: ''
            })
          }
          const existing = toolCallMap.get(tc.index)!
          if (tc.id) existing.id = tc.id
          if (tc.function?.name) existing.name = tc.function.name
          if (tc.function?.arguments) existing.arguments += tc.function.arguments
        }
      }

      if (chunk.choices[0]?.finish_reason) {
        finishReason = chunk.choices[0].finish_reason
      }
      if (chunk.usage) {
        promptTokens = chunk.usage.prompt_tokens
        completionTokens = chunk.usage.completion_tokens
      }
    }

    const toolCalls = Array.from(toolCallMap.values()).map((tc) => ({
      id: tc.id,
      name: tc.name,
      arguments: JSON.parse(tc.arguments || '{}')
    }))

    return { text, thought, toolCalls, finishReason, promptTokens, completionTokens, resolvedModel }
  }
}
