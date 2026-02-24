import { ipcMain } from 'electron'
import { getDatabase } from '../db/database'
import crypto from 'crypto'

export function registerMessageHandlers() {
  ipcMain.handle('messages:list', async (_, conversationId: string) => {
    try {
      const db = getDatabase()
      return db.prepare(
        'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC'
      ).all(conversationId)
    } catch (err: any) {
      console.error('messages:list error', err)
      return []
    }
  })

  ipcMain.handle('messages:add', async (_, message: {
    conversation_id: string
    role: string
    content: string
    model_id?: string
    provider_id?: string
    token_count?: number
    metadata_json?: string
  }) => {
    try {
      const db = getDatabase()
      const id = crypto.randomUUID()
      const now = new Date().toISOString()

      db.prepare(`
        INSERT INTO messages (id, conversation_id, role, content, model_id, provider_id, token_count, created_at, metadata_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        message.conversation_id,
        message.role,
        message.content,
        message.model_id || null,
        message.provider_id || null,
        message.token_count || 0,
        now,
        message.metadata_json || '{}'
      )

      // Update conversation's updated_at
      db.prepare("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?")
        .run(message.conversation_id)

      return db.prepare('SELECT * FROM messages WHERE id = ?').get(id)
    } catch (err: any) {
      console.error('messages:add error', err)
      return null
    }
  })

  ipcMain.handle('messages:update', async (_, id: string, updates: {
    content?: string
    token_count?: number
    metadata_json?: string
  }) => {
    try {
      const db = getDatabase()
      const sets: string[] = []
      const params: any[] = []

      if (updates.content !== undefined) {
        sets.push('content = ?')
        params.push(updates.content)
      }
      if (updates.token_count !== undefined) {
        sets.push('token_count = ?')
        params.push(updates.token_count)
      }
      if (updates.metadata_json !== undefined) {
        sets.push('metadata_json = ?')
        params.push(updates.metadata_json)
      }

      if (sets.length === 0) return { success: true }

      params.push(id)
      db.prepare(`UPDATE messages SET ${sets.join(', ')} WHERE id = ?`).run(...params)
      return { success: true }
    } catch (err: any) {
      console.error('messages:update error', err)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('messages:delete', async (_, id: string) => {
    try {
      const db = getDatabase()
      db.prepare('DELETE FROM messages WHERE id = ?').run(id)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('messages:search', async (_, query: string) => {
    try {
      const db = getDatabase()
      return db.prepare(`
        SELECT m.*, c.title as conversation_title
        FROM messages_fts fts
        JOIN messages m ON m.rowid = fts.rowid
        JOIN conversations c ON c.id = m.conversation_id
        WHERE messages_fts MATCH ?
        ORDER BY rank
        LIMIT 50
      `).all(query)
    } catch (err: any) {
      console.error('messages:search error', err)
      return []
    }
  })
}
