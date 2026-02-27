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

const MAX_TOOL_TURNS = 15
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

    try {
      const adapter = AdapterRegistry.get(request.providerId)
      const credentials = await CredentialStore.get(adapter.providerId)

      // Build mutable message history for multi-turn
      const messages: any[] = [...request.messages]
      let turn = 0

      while (turn < MAX_TOOL_TURNS) {
        if (state.cancelled) break
        turn++

        const result = await adapter.executeWithTools(
          {
            requestId: request.requestId,
            modelId: request.modelId,
            providerId: request.providerId,
            category: 'text_generation',
            params: {
              messages,
              temperature: request.params.temperature,
              maxTokens: request.params.maxTokens || 32768,
              ...request.params
            }
          },
          credentials,
          emitter,
          AGENT_TOOLS
        )

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

          console.log(`[Agent] Tool call: ${tc.name}(${JSON.stringify(tc.arguments).slice(0, 200)})`)

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
