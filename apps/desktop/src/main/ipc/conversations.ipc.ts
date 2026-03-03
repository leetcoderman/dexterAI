import { ipcMain } from 'electron'
import { getDatabase } from '../db/database'
import crypto from 'crypto'

export function registerConversationHandlers() {
  ipcMain.handle('conversations:list', async () => {
    try {
      const db = getDatabase()
      const rows = db
        .prepare(
          `
        SELECT
          c.id, c.title, c.created_at, c.updated_at, c.settings_json,
          (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_preview,
          (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
          (SELECT model_id FROM messages WHERE conversation_id = c.id AND role = 'assistant' ORDER BY created_at DESC LIMIT 1) as model_id,
          (SELECT provider_id FROM messages WHERE conversation_id = c.id AND role = 'assistant' ORDER BY created_at DESC LIMIT 1) as provider_id,
          (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
        FROM conversations c
        ORDER BY c.updated_at DESC
      `
        )
        .all()
      return rows
    } catch (err: any) {
      console.error('conversations:list error', err)
      return []
    }
  })

  ipcMain.handle('conversations:get', async (_, id: string) => {
    try {
      const db = getDatabase()
      return db.prepare('SELECT * FROM conversations WHERE id = ?').get(id) || null
    } catch (err: any) {
      console.error('conversations:get error', err)
      return null
    }
  })

  ipcMain.handle('conversations:create', async (_, title?: string, settingsJson?: string) => {
    try {
      const db = getDatabase()
      const id = crypto.randomUUID()
      const now = new Date().toISOString()
      db.prepare(
        `
        INSERT INTO conversations (id, title, created_at, updated_at, settings_json)
        VALUES (?, ?, ?, ?, ?)
      `
      ).run(id, title || null, now, now, settingsJson || '{}')
      return db.prepare('SELECT * FROM conversations WHERE id = ?').get(id)
    } catch (err: any) {
      console.error('conversations:create error', err)
      return null
    }
  })

  ipcMain.handle(
    'conversations:update',
    async (_, id: string, updates: { title?: string; settings_json?: string }) => {
      try {
        const db = getDatabase()
        const sets: string[] = []
        const params: any[] = []

        if (updates.title !== undefined) {
          sets.push('title = ?')
          params.push(updates.title)
        }
        if (updates.settings_json !== undefined) {
          sets.push('settings_json = ?')
          params.push(updates.settings_json)
        }

        if (sets.length === 0) return { success: true }

        sets.push("updated_at = datetime('now')")
        params.push(id)

        db.prepare(`UPDATE conversations SET ${sets.join(', ')} WHERE id = ?`).run(...params)
        return { success: true }
      } catch (err: any) {
        console.error('conversations:update error', err)
        return { success: false, error: err.message }
      }
    }
  )

  ipcMain.handle('conversations:delete', async (_, id: string) => {
    try {
      const db = getDatabase()
      db.prepare('DELETE FROM conversations WHERE id = ?').run(id)
      return { success: true }
    } catch (err: any) {
      console.error('conversations:delete error', err)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('conversations:export', async (_, id: string, format: 'markdown' | 'json') => {
    try {
      const db = getDatabase()
      const conv = db.prepare('SELECT * FROM conversations WHERE id = ?').get(id) as any
      const msgs = db
        .prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC')
        .all(id) as any[]
      if (!conv) return ''

      if (format === 'json') {
        return JSON.stringify({ conversation: conv, messages: msgs }, null, 2)
      }

      let md = `# ${conv.title || 'Untitled Conversation'}\n\n`
      for (const m of msgs) {
        if (m.role === 'user') md += `## User\n${m.content}\n\n`
        else if (m.role === 'assistant')
          md += `## Assistant (${m.model_id || 'unknown'})\n${m.content}\n\n`
      }
      return md
    } catch (err: any) {
      console.error('conversations:export error', err)
      return ''
    }
  })
}
