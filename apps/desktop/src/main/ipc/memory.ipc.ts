import { ipcMain } from 'electron'
import { EventEmitter } from 'events'
import { getDatabase } from '../db/database'
import { AdapterRegistry } from '../adapters/adapter-registry'
import { CredentialStore } from '../credentials/credential-store'
import type { IPCEmitter } from '../adapters/base.adapter'
import crypto from 'crypto'

export function registerMemoryHandlers() {
  ipcMain.handle('memory:list', async () => {
    try {
      const db = getDatabase()
      return db.prepare('SELECT * FROM memories ORDER BY is_pinned DESC, updated_at DESC').all()
    } catch (err: any) {
      console.error('memory:list error', err)
      return []
    }
  })

  ipcMain.handle('memory:save', async (_, memory: {
    id?: string
    key: string
    content: string
    source_conversation_id?: string
  }) => {
    try {
      const db = getDatabase()
      const id = memory.id || crypto.randomUUID()
      const now = new Date().toISOString()

      db.prepare(`
        INSERT OR REPLACE INTO memories (id, key, content, source_conversation_id, created_at, updated_at, is_pinned)
        VALUES (?, ?, ?, ?, COALESCE((SELECT created_at FROM memories WHERE id = ?), ?), ?, COALESCE((SELECT is_pinned FROM memories WHERE id = ?), 0))
      `).run(id, memory.key, memory.content, memory.source_conversation_id || null, id, now, now, id)

      return db.prepare('SELECT * FROM memories WHERE id = ?').get(id)
    } catch (err: any) {
      console.error('memory:save error', err)
      return null
    }
  })

  ipcMain.handle('memory:delete', async (_, id: string) => {
    try {
      const db = getDatabase()
      db.prepare('DELETE FROM memories WHERE id = ?').run(id)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('memory:togglePin', async (_, id: string) => {
    try {
      const db = getDatabase()
      db.prepare("UPDATE memories SET is_pinned = CASE WHEN is_pinned = 1 THEN 0 ELSE 1 END, updated_at = datetime('now') WHERE id = ?").run(id)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('memory:extract', async (_, conversationId: string, providerId: string, modelId: string) => {
    return extractMemories(conversationId, providerId, modelId)
  })
}

export async function extractMemories(conversationId: string, providerId: string, modelId: string) {
  try {
    const db = getDatabase()
    const msgs = db.prepare(
      'SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 20'
    ).all(conversationId) as { role: string; content: string }[]

    if (msgs.length === 0) return []

    const transcript = msgs.reverse().map((m) => `${m.role}: ${m.content}`).join('\n')
    const extractionPrompt = `Given this conversation, extract key facts about the user — preferences, project details, technical choices, personal info. Return as JSON array: [{"key": "category", "content": "fact"}]. Only include genuinely useful facts. Be conservative.\n\nConversation:\n${transcript}`

    const adapter = AdapterRegistry.get(providerId)
    const credentials = await CredentialStore.get(providerId)

    let response = ''
    const emitter = new EventEmitter() as IPCEmitter
    emitter.on('test:chunk', (chunk: { text?: string }) => {
      response += chunk.text ?? ''
    })

    await adapter.execute(
      {
        requestId: `mem_${Date.now()}`,
        modelId,
        providerId,
        category: 'text_generation',
        params: {
          messages: [{ role: 'user', content: extractionPrompt }],
          temperature: 0.2,
          maxTokens: 1000
        }
      },
      credentials,
      emitter
    )

    // Parse JSON from response (handle markdown code fences)
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []

    const facts = JSON.parse(jsonMatch[0]) as { key: string; content: string }[]
    const existing = db.prepare('SELECT content FROM memories').all() as { content: string }[]
    const existingSet = new Set(existing.map((m) => m.content.toLowerCase().trim()))

    const saved: { id: string; key: string; content: string }[] = []
    const now = new Date().toISOString()
    for (const fact of facts) {
      if (!fact.key || !fact.content) continue
      if (existingSet.has(fact.content.toLowerCase().trim())) continue

      const id = crypto.randomUUID()
      db.prepare(
        'INSERT INTO memories (id, key, content, source_conversation_id, created_at, updated_at, is_pinned) VALUES (?, ?, ?, ?, ?, ?, 0)'
      ).run(id, fact.key, fact.content, conversationId, now, now)
      saved.push({ id, key: fact.key, content: fact.content })
    }

    return saved
  } catch (err: any) {
    console.error('memory:extract error', err)
    return []
  }
}
