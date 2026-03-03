import OpenAI from 'openai'
import { BaseProviderAdapter, IPCEmitter, ToolCallResult } from './base.adapter'
import {
  VerifyResult,
  ProviderCredentials,
  TestRequest,
  ToolDefinition
} from '@dexterai/registry-types'

export class NvidiaAdapter extends BaseProviderAdapter {
  readonly providerId = 'nvidia_nim'

  private getClient(apiKey: string): OpenAI {
    return new OpenAI({
      apiKey,
      baseURL: 'https://integrate.api.nvidia.com/v1'
    })
  }

  // Helper to fix NVIDIA's strict Pydantic validation on empty strings
  private sanitizeMessages(messages: any[]) {
    return messages.map((m) => {
      const msg = { ...m }
      if (typeof msg.content === 'string' && msg.content === '') {
        // OpenAI spec allows null content for assistant messages with tool calls
        if (msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0) {
          msg.content = null
        } else if (msg.role === 'assistant' || msg.role === 'system') {
          // Strict models like DeepSeek V3.1 Terminus prefer a single space over [Empty]
          msg.content = ' '
        } else {
          msg.content = '[Empty]'
        }
      }
      return msg
    })
  }

  async verify(creds: ProviderCredentials): Promise<VerifyResult> {
    try {
      const client = this.getClient(creds.apiKey)
      const response = await client.models.list()
      const accessibleModels: string[] = []
      for await (const model of response) {
        accessibleModels.push(model.id)
      }
      return { success: true, accessibleModels }
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

    let rawMessages = params.messages
    if (!rawMessages || rawMessages.length === 0) {
      rawMessages = [{ role: 'user', content: params.prompt || '[Empty]' }]
    }
    const sanitizedMessages = this.sanitizeMessages(rawMessages)

    const stream = await this.withRetry(() =>
      client.chat.completions.create({
        model: req.modelId, // This will be "org/model-name"
        messages: sanitizedMessages,
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
            thought: reasoning
          })
        }

        if (chunk.choices[0]?.finish_reason) {
          finishReason = chunk.choices[0].finish_reason
        }

        // Parse usage if provided
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
        cacheReadTokens: 0,
        resolvedModel
      })
    } catch (err: any) {
      if (err.status === 503) {
        emitter.emit('test:error', {
          requestId: req.requestId,
          code: 'NVIDIA_SERVICE_UNAVAILABLE',
          message:
            'NVIDIA NIM is currently overloaded or unavailable. Please check status.nvidia.com',
          actionLabel: 'Check Status',
          actionTarget: 'https://status.nvidia.com'
        })
        return
      }
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
    const sanitizedMessages = this.sanitizeMessages(rawMessages)

    let response: any
    let usedTools = true
    try {
      response = await this.withRetry(() =>
        client.chat.completions.create({
          model: req.modelId,
          messages: sanitizedMessages,
          tools: formattedTools,
          tool_choice: 'auto',
          max_tokens: params.maxTokens || 4096,
          temperature: params.temperature ?? 0.6
        })
      )
    } catch (err: any) {
      // Model doesn't support tools — retry without them
      const msg = (err.message || '').toLowerCase()
      if (
        err.status === 400 ||
        err.status === 422 ||
        msg.includes('tool') ||
        msg.includes('function')
      ) {
        console.warn(
          `[NVIDIA] Model ${req.modelId} does not support tools, falling back to plain chat`
        )
        usedTools = false
        response = await this.withRetry(() =>
          client.chat.completions.create({
            model: req.modelId,
            messages: sanitizedMessages,
            max_tokens: params.maxTokens || 4096,
            temperature: params.temperature ?? 0.6
          })
        )
      } else {
        throw err
      }
    }

    const choice = response.choices[0]
    const message = choice.message

    const text = message.content || ''
    const thought = (message as any).reasoning_content || ''

    if (text || thought) {
      emitter.emit('test:chunk', {
        requestId: req.requestId,
        text: text,
        thought: thought
      })
    }

    const toolCalls = usedTools
      ? (message.tool_calls || []).map((tc: any) => {
          let parsedArgs = {}
          try {
            parsedArgs = tc.function?.arguments ? JSON.parse(tc.function.arguments) : {}
          } catch (e) {
            console.error('Failed to parse tool arguments from NVIDIA:', e)
          }
          return {
            id: tc.id || `call_${Date.now()}`,
            name: tc.function?.name || 'unknown_tool',
            arguments: parsedArgs
          }
        })
      : []

    return {
      text,
      thought,
      toolCalls,
      finishReason: choice.finish_reason || 'stop',
      promptTokens: response.usage?.prompt_tokens || 0,
      completionTokens: response.usage?.completion_tokens || 0,
      resolvedModel: response.model
    }
  }
}
