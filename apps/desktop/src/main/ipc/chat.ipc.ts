import { ipcMain } from 'electron'
import { EventEmitter } from 'events'
import { AdapterRegistry } from '../adapters/adapter-registry'
import { CredentialStore } from '../credentials/credential-store'
import { getDatabase } from '../db/database'
import { extractMemories } from './memory.ipc'
import type { IPCEmitter } from '../adapters/base.adapter'

const ActiveChatRequests = new Map<string, AbortController>()

class ChatEmitter extends EventEmitter implements IPCEmitter {
  constructor(private sender: Electron.WebContents) {
    super()
    this.on('test:chunk', (chunk) => this.sender.send('chat:chunk', chunk))
    this.on('test:done', (metrics) => this.sender.send('chat:done', metrics))
    this.on('test:error', (error) => this.sender.send('chat:error', error))
  }
}

export function registerChatHandlers() {
  ipcMain.handle(
    'chat:send',
    async (
      event,
      request: {
        conversationId: string
        requestId: string
        modelId: string
        providerId: string
        messages: { role: string; content: string }[]
        params: Record<string, any>
      }
    ) => {
      console.log(
        `[Chat:Send] modelId="${request.modelId}" providerId="${request.providerId}" convId="${request.conversationId}"`
      )
      const emitter = new ChatEmitter(event.sender)

      try {
        const adapter = AdapterRegistry.get(request.providerId)
        const credentials = await CredentialStore.get(adapter.providerId)

        const abort = new AbortController()
        ActiveChatRequests.set(request.requestId, abort)

        // Memory injection
        let messages = [...request.messages]
        try {
          const db = getDatabase()
          const conv = db
            .prepare('SELECT settings_json FROM conversations WHERE id = ?')
            .get(request.conversationId) as { settings_json: string } | undefined
          const settings = conv?.settings_json ? JSON.parse(conv.settings_json) : {}
          const memoryEnabled = settings.memoryEnabled !== false

          if (memoryEnabled) {
            const memories = db
              .prepare(
                'SELECT content, is_pinned FROM memories ORDER BY is_pinned DESC, updated_at DESC'
              )
              .all() as { content: string; is_pinned: number }[]
            if (memories.length > 0) {
              let tokenBudget = 2000
              const memoryLines: string[] = []
              for (const m of memories) {
                const approxTokens = Math.ceil(m.content.length / 4)
                if (tokenBudget - approxTokens < 0 && memoryLines.length > 0) break
                memoryLines.push(`- ${m.content}`)
                tokenBudget -= approxTokens
              }
              const memoryBlock = `\n\n<user_context>\nHere are things you know about the user:\n${memoryLines.join('\n')}\n</user_context>`
              const sysIdx = messages.findIndex((m) => m.role === 'system')
              if (sysIdx !== -1) {
                messages[sysIdx] = {
                  ...messages[sysIdx],
                  content: messages[sysIdx].content + memoryBlock
                }
              } else {
                messages = [{ role: 'system', content: memoryBlock.trim() }, ...messages]
              }
            }
          }
        } catch (e) {
          console.error('Memory injection failed:', e)
        }

        // Context window management — trim if over budget
        const totalTokens = messages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0)
        const contextLimit = request.params.contextWindow || 128000
        if (totalTokens > contextLimit * 0.9) {
          const system = messages.filter((m) => m.role === 'system')
          const nonSystem = messages.filter((m) => m.role !== 'system')
          const kept = nonSystem.slice(-10)
          messages = [...system, ...kept]
          console.log(
            `Context trimmed: ${totalTokens} tokens → kept system + last ${kept.length} messages`
          )
        }

        await adapter.execute(
          {
            requestId: request.requestId,
            modelId: request.modelId,
            providerId: request.providerId,
            category: 'text_generation',
            params: {
              messages,
              temperature: request.params.temperature,
              maxTokens: request.params.maxTokens,
              ...request.params
            }
          },
          credentials,
          emitter
        )
      } catch (err: any) {
        emitter.emit('test:error', {
          requestId: request.requestId,
          code: err.code || 'CHAT_ERROR',
          message: err.message || 'An error occurred during chat.'
        })
      } finally {
        ActiveChatRequests.delete(request.requestId)

        // Auto-title: if conversation has no title yet, generate one
        try {
          const db = getDatabase()
          const conv = db
            .prepare('SELECT title FROM conversations WHERE id = ?')
            .get(request.conversationId) as { title: string | null } | undefined
          if (conv && !conv.title) {
            const firstUserMsg = request.messages.find((m) => m.role === 'user')
            if (firstUserMsg) {
              autoTitle(
                event.sender,
                request.conversationId,
                request.providerId,
                request.modelId,
                firstUserMsg.content
              )
            }
          }
        } catch (e) {
          console.error('Auto-title check failed:', e)
        }

        // Auto-extract memories after 5+ user messages (once per conversation)
        try {
          const db = getDatabase()
          const userMsgCount = db
            .prepare(
              "SELECT COUNT(*) as cnt FROM messages WHERE conversation_id = ? AND role = 'user'"
            )
            .get(request.conversationId) as { cnt: number }
          console.log(
            `[Memory] Conversation ${request.conversationId}: ${userMsgCount.cnt} user messages`
          )
          if (userMsgCount.cnt >= 5) {
            const convMeta = db
              .prepare('SELECT settings_json FROM conversations WHERE id = ?')
              .get(request.conversationId) as { settings_json: string } | undefined
            const settings = convMeta?.settings_json ? JSON.parse(convMeta.settings_json) : {}
            if (!settings._memoryExtracted) {
              console.log(
                '[Memory] Triggering auto-extraction for conversation:',
                request.conversationId
              )
              settings._memoryExtracted = true
              db.prepare('UPDATE conversations SET settings_json = ? WHERE id = ?').run(
                JSON.stringify(settings),
                request.conversationId
              )
              // Fire and forget
              extractMemories(request.conversationId, request.providerId, request.modelId)
                .then((saved) => console.log(`[Memory] Extracted ${saved.length} memories`))
                .catch((err) => console.error('[Memory] Extraction failed:', err))
            } else {
              console.log('[Memory] Skipping extraction — already extracted for this conversation')
            }
          }
        } catch (e) {
          console.error('Auto-extract check failed:', e)
        }
      }
    }
  )

  ipcMain.handle('chat:cancel', async (_, requestId: string) => {
    ActiveChatRequests.get(requestId)?.abort()
  })
}

async function autoTitle(
  sender: Electron.WebContents,
  conversationId: string,
  providerId: string,
  modelId: string,
  firstUserMessage: string
) {
  try {
    // Wait a brief moment for the assistant message to be persisted by the renderer
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const db = getDatabase()
    const assistantMsg = db
      .prepare(
        "SELECT content FROM messages WHERE conversation_id = ? AND role = 'assistant' ORDER BY created_at ASC LIMIT 1"
      )
      .get(conversationId) as { content: string } | undefined

    const assistantContent = assistantMsg?.content || ''

    const adapter = AdapterRegistry.get(providerId)
    const credentials = await CredentialStore.get(providerId)

    let title = ''
    const titleEmitter = new EventEmitter() as IPCEmitter
    titleEmitter.on('test:chunk', (chunk: { text?: string }) => {
      title += chunk.text ?? ''
    })

    const prompt = `You are a conversation titler. Based on this short exchange, generate a concise, descriptive title (3-6 words).

User: "${firstUserMessage.slice(0, 300)}"
Assistant: "${assistantContent.slice(0, 500)}"

Respond ONLY with the title. No quotes, no markdown, no punctuation at the end.`

    await adapter.execute(
      {
        requestId: `title_${Date.now()}`,
        modelId,
        providerId,
        category: 'text_generation',
        params: {
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          maxTokens: 25
        }
      },
      credentials,
      titleEmitter
    )

    title = title
      .replace(/^["']|["']$/g, '')
      .replace(/\.$/, '')
      .trim()
    if (title && title.length < 100) {
      db.prepare('UPDATE conversations SET title = ? WHERE id = ?').run(title, conversationId)
      sender.send('chat:title-updated', { conversationId, title })
      console.log(`[Auto-Title] Generated: "${title}" for ${conversationId}`)
    }
  } catch (e) {
    console.error('Auto-title generation failed:', e)
  }
}
