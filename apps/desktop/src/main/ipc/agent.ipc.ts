import { ipcMain } from 'electron'
import { EventEmitter } from 'events'
import { resolve } from 'path'
import { readFile } from 'fs/promises'
import { AdapterRegistry } from '../adapters/adapter-registry'
import { CredentialStore } from '../credentials/credential-store'
import { AGENT_TOOLS } from '../tools/tool-definitions'
import { executeTool } from '../tools/tool-executor'
import type { IPCEmitter } from '../adapters/base.adapter'
import type { AgentRequest, ToolResult } from '@dexterai/registry-types'

// No hard cap — agent runs until model stops calling tools or context is exhausted.
// Safety valve only: prevent infinite loops from misbehaving models.
const ABSOLUTE_SAFETY_LIMIT = 200
const ActiveAgentRequests = new Map<string, { cancelled: boolean }>()

// Pending approval promises — keyed by approvalId
const PendingApprovals = new Map<string, { resolve: (approved: boolean) => void }>()

const TOOLS_REQUIRING_APPROVAL = new Set(['write_file', 'execute_command'])

class AgentEmitter extends EventEmitter implements IPCEmitter {
  constructor(private sender: Electron.WebContents) {
    super()
    this.on('test:chunk', (chunk) => this.sender.send('chat:chunk', chunk))
    this.on('test:done', (metrics) => this.sender.send('chat:done', metrics))
    this.on('test:error', (error) => this.sender.send('chat:error', error))
  }
}

async function readExistingContent(filePath: string, rootPath: string): Promise<string> {
  try {
    const resolved = resolve(rootPath, filePath)
    const root = resolve(rootPath)
    if (!resolved.startsWith(root + '/') && resolved !== root) return ''
    const buffer = await readFile(resolved)
    // Binary check
    const sample = buffer.subarray(0, 512)
    for (let i = 0; i < sample.length; i++) {
      if (sample[i] === 0) return '[Binary file]'
    }
    return buffer.toString('utf-8')
  } catch {
    return '' // File doesn't exist yet — new file
  }
}

function waitForApproval(approvalId: string): Promise<boolean> {
  return new Promise((res) => {
    PendingApprovals.set(approvalId, { resolve: res })
    // Auto-reject after 5 minutes to prevent leaks
    setTimeout(() => {
      if (PendingApprovals.has(approvalId)) {
        PendingApprovals.delete(approvalId)
        res(false)
      }
    }, 300000)
  })
}

/**
 * Estimate token count for a message (rough: 1 token ≈ 4 characters).
 */
function estimateTokens(msg: any): number {
  let text = ''
  if (typeof msg.content === 'string') {
    text = msg.content || ''
  } else if (Array.isArray(msg.content)) {
    text = msg.content.map((c: any) => {
      if (typeof c === 'string') return c
      if (c.text) return c.text
      if (c.content) return c.content
      if (c.result) return c.result
      return JSON.stringify(c)
    }).join('')
  }
  // Also count tool calls / tool results
  if (msg.tool_calls) {
    text += JSON.stringify(msg.tool_calls)
  }
  if (msg.toolCalls) {
    text += JSON.stringify(msg.toolCalls)
  }
  return Math.ceil(text.length / 4)
}

/**
 * Trim older tool-related messages when context grows too large.
 * Preserves: system prompt (index 0), first user message, last 4 messages.
 * Older tool results are replaced with short summaries.
 */
function trimMessagesForContext(messages: any[], maxContextTokens: number): any[] {
  const totalTokens = messages.reduce((sum, m) => sum + estimateTokens(m), 0)

  // Only trim if we're over 75% of context budget
  if (totalTokens < maxContextTokens * 0.75) return messages

  console.log(`[Agent] Context trimming: ${totalTokens} estimated tokens exceeds 75% of ${maxContextTokens}`)

  const trimmed = [...messages]
  // Never touch first message (system) or last 4 messages (recent context)
  // Trim from index 1 up to length-4
  const protectedTail = 4
  const trimEnd = Math.max(1, trimmed.length - protectedTail)

  for (let i = 1; i < trimEnd; i++) {
    const msg = trimmed[i]
    const msgTokens = estimateTokens(msg)

    // Only trim large messages (> 500 tokens)
    if (msgTokens < 500) continue

    // Trim tool result messages
    if (msg.role === 'tool') {
      const summary = typeof msg.content === 'string'
        ? msg.content.slice(0, 200) + (msg.content.length > 200 ? '...[trimmed]' : '')
        : '[tool result trimmed for context]'
      trimmed[i] = { ...msg, content: summary }
    }
    // Trim assistant messages with large content
    else if (msg.role === 'assistant' && typeof msg.content === 'string' && msg.content.length > 2000) {
      trimmed[i] = { ...msg, content: msg.content.slice(0, 1000) + '\n...[earlier response trimmed for context]' }
    }
    // Trim Anthropic-style tool_result blocks
    else if (msg.role === 'user' && Array.isArray(msg.content)) {
      trimmed[i] = {
        ...msg,
        content: msg.content.map((block: any) => {
          if (block.type === 'tool_result' && typeof block.content === 'string' && block.content.length > 500) {
            return { ...block, content: block.content.slice(0, 200) + '...[trimmed]' }
          }
          return block
        })
      }
    }
  }

  const newTotal = trimmed.reduce((sum, m) => sum + estimateTokens(m), 0)
  console.log(`[Agent] Trimmed context: ${totalTokens} → ${newTotal} estimated tokens`)
  return trimmed
}

/**
 * Delay helper for retry backoff.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function registerAgentHandlers() {
  // Approval responses from renderer
  ipcMain.handle('agent:approve', async (_, approvalId: string) => {
    const pending = PendingApprovals.get(approvalId)
    if (pending) {
      PendingApprovals.delete(approvalId)
      pending.resolve(true)
    }
  })

  ipcMain.handle('agent:reject', async (_, approvalId: string) => {
    const pending = PendingApprovals.get(approvalId)
    if (pending) {
      PendingApprovals.delete(approvalId)
      pending.resolve(false)
    }
  })

  ipcMain.handle('agent:send', async (event, request: AgentRequest) => {
    console.log(`[Agent:Send] model="${request.modelId}" provider="${request.providerId}" project="${request.projectRoot}"`)

    const state = { cancelled: false }
    ActiveAgentRequests.set(request.requestId, state)
    const emitter = new AgentEmitter(event.sender)
    const startTime = performance.now()
    let firstChunkTime: number | null = null
    let totalPromptTokens = 0
    let totalCompletionTokens = 0
    let resolvedModel = ''

    // Determine context window for this model (from registry or sensible default)
    const maxContextTokens = request.params.contextWindow || 128000

    try {
      const adapter = AdapterRegistry.get(request.providerId)
      const credentials = await CredentialStore.get(adapter.providerId)

      // Build mutable message history for multi-turn
      let messages: any[] = [...request.messages]
      let turn = 0
      let consecutiveErrors = 0

      while (turn < ABSOLUTE_SAFETY_LIMIT) {
        if (state.cancelled) break
        turn++

        // Trim context if needed before each API call
        messages = trimMessagesForContext(messages, maxContextTokens)

        let result: any
        try {
          result = await adapter.executeWithTools(
            {
              requestId: request.requestId,
              modelId: request.modelId,
              providerId: request.providerId,
              category: 'text_generation',
              params: {
                messages,
                temperature: request.params.temperature,
                maxTokens: request.params.maxTokens || 4096,
                ...request.params
              }
            },
            credentials,
            emitter,
            AGENT_TOOLS
          )
          // Reset consecutive error count on success
          consecutiveErrors = 0
        } catch (turnErr: any) {
          consecutiveErrors++
          const errMsg = turnErr.message || ''
          const errStatus = turnErr.status || turnErr.response?.status || 0

          console.error(`[Agent] Turn ${turn} error (consecutive: ${consecutiveErrors}):`, errMsg)

          // Rate limited — wait and retry
          if (errStatus === 429 && consecutiveErrors <= 3) {
            const waitMs = Math.min(2000 * consecutiveErrors, 10000)
            console.log(`[Agent] Rate limited, waiting ${waitMs}ms before retry...`)
            emitter.emit('test:chunk', {
              requestId: request.requestId,
              text: `\n\n_⏳ Rate limited, retrying in ${waitMs / 1000}s..._\n\n`
            })
            await delay(waitMs)
            turn-- // Don't count this as a real turn
            continue
          }

          // Context overflow — try aggressive trimming and retry once
          if ((errStatus === 400 || errStatus === 413) &&
            (errMsg.includes('context length') || errMsg.includes('too many tokens') || errMsg.includes('max_tokens')) &&
            consecutiveErrors <= 2) {
            console.log('[Agent] Context overflow detected, aggressively trimming...')
            // Force aggressive trim by halving the budget
            messages = trimMessagesForContext(messages, Math.floor(maxContextTokens * 0.5))
            emitter.emit('test:chunk', {
              requestId: request.requestId,
              text: '\n\n_⚠️ Context window full — trimming older messages and continuing..._\n\n'
            })
            continue
          }

          // Too many consecutive errors — abort
          if (consecutiveErrors >= 3) {
            emitter.emit('test:chunk', {
              requestId: request.requestId,
              text: `\n\n_❌ Agent stopped: ${consecutiveErrors} consecutive errors. Last: ${errMsg.slice(0, 200)}_`
            })
            break
          }

          // Single non-retryable error — notify and break
          emitter.emit('test:chunk', {
            requestId: request.requestId,
            text: `\n\n_❌ Error on turn ${turn}: ${errMsg.slice(0, 300)}_`
          })
          break
        }

        if (!firstChunkTime && (result.text || result.thought)) {
          firstChunkTime = performance.now()
        }
        totalPromptTokens += result.promptTokens
        totalCompletionTokens += result.completionTokens
        if (result.resolvedModel) resolvedModel = result.resolvedModel

        // No tool calls — model is done
        if (!result.toolCalls || result.toolCalls.length === 0) {
          break
        }

        // Model wants to use tools — add assistant response to history
        if (request.providerId === 'anthropic') {
          const contentBlocks: any[] = []
          if (result.text) contentBlocks.push({ type: 'text', text: result.text })
          for (const tc of result.toolCalls) {
            contentBlocks.push({ type: 'tool_use', id: tc.id, name: tc.name, input: tc.arguments })
          }
          messages.push({ role: 'assistant', content: contentBlocks })
        } else if (request.providerId === 'google') {
          // Google Gemini requires thoughtSignature to be preserved on tool calls
          // for thinking models (Gemini 3+). Without it, the API returns 400.
          messages.push({
            role: 'assistant',
            content: result.text || null,
            toolCalls: result.toolCalls.map((tc: any) => ({
              id: tc.id,
              name: tc.name,
              arguments: tc.arguments,
              thoughtSignature: tc.thoughtSignature || undefined
            }))
          })
        } else {
          messages.push({
            role: 'assistant',
            content: result.text || null,
            tool_calls: result.toolCalls.map((tc) => ({
              id: tc.id,
              type: 'function',
              function: { name: tc.name, arguments: JSON.stringify(tc.arguments) }
            }))
          })
        }

        // Execute each tool (with approval gate for write_file)
        const toolResults: ToolResult[] = []
        for (const tc of result.toolCalls) {
          if (state.cancelled) break

          console.log(`[Agent] Tool call #${turn}: ${tc.name}(${JSON.stringify(tc.arguments).slice(0, 200)})`)

          // Approval gate for destructive tools
          if (TOOLS_REQUIRING_APPROVAL.has(tc.name)) {
            const approvalId = `approval_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

            if (tc.name === 'execute_command') {
              event.sender.send('agent:approval-required', {
                requestId: request.requestId,
                approvalId,
                toolCall: tc,
                approvalType: 'command',
                command: (tc.arguments as any).command || '',
                cwd: request.projectRoot
              })
            } else {
              const filePath = (tc.arguments as any).path || ''
              const newContent = (tc.arguments as any).content || ''
              const oldContent = await readExistingContent(filePath, request.projectRoot)
              event.sender.send('agent:approval-required', {
                requestId: request.requestId,
                approvalId,
                toolCall: tc,
                approvalType: 'file_write',
                filePath,
                oldContent,
                newContent
              })
            }

            // Wait for user response
            const approved = await waitForApproval(approvalId)

            if (!approved) {
              const rejectMsg = tc.name === 'execute_command'
                ? `User rejected executing "${(tc.arguments as any).command}". Do not retry.`
                : `User rejected file write to "${(tc.arguments as any).path}". Do not retry.`
              toolResults.push({
                toolCallId: tc.id,
                name: tc.name,
                result: rejectMsg,
                isError: true
              })

              event.sender.send('agent:tool-result', {
                requestId: request.requestId,
                toolCall: tc,
                result: toolResults[toolResults.length - 1]
              })
              continue
            }
          }

          // Execute the tool
          const toolResult = await executeTool(tc, request.projectRoot)
          toolResults.push(toolResult)

          event.sender.send('agent:tool-result', {
            requestId: request.requestId,
            toolCall: tc,
            result: toolResult
          })
        }

        // Add tool results to message history
        if (request.providerId === 'anthropic') {
          messages.push({
            role: 'user',
            content: toolResults.map((tr) => ({
              type: 'tool_result',
              tool_use_id: tr.toolCallId,
              content: tr.result
            }))
          })
        } else {
          for (const tr of toolResults) {
            messages.push({
              role: 'tool',
              tool_call_id: tr.toolCallId,
              name: tr.name,
              content: tr.result
            })
          }
        }
      }

      // If we hit the absolute safety limit, notify the user
      if (turn >= ABSOLUTE_SAFETY_LIMIT) {
        emitter.emit('test:chunk', {
          requestId: request.requestId,
          text: `\n\n_⚠️ Agent reached ${ABSOLUTE_SAFETY_LIMIT} tool turns safety limit. Please continue in a new message if more work is needed._`
        })
      }

      // Emit done
      emitter.emit('test:done', {
        requestId: request.requestId,
        ttft: firstChunkTime ? firstChunkTime - startTime : null,
        totalTime: performance.now() - startTime,
        promptTokens: totalPromptTokens,
        completionTokens: totalCompletionTokens,
        finishReason: state.cancelled ? 'cancelled' : 'stop',
        resolvedModel
      })
    } catch (err: any) {
      console.error(`[Agent:Error] requestId=${request.requestId} error:`, err)
      emitter.emit('test:error', {
        requestId: request.requestId,
        code: err.code || 'AGENT_ERROR',
        message: err.message || 'An error occurred during agent execution.'
      })
    } finally {
      ActiveAgentRequests.delete(request.requestId)
    }
  })

  ipcMain.handle('agent:cancel', async (_, requestId: string) => {
    const state = ActiveAgentRequests.get(requestId)
    if (state) state.cancelled = true
  })
}
