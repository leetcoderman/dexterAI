import { ipcMain } from 'electron'
import { getDatabase } from '../db/database'
import { CredentialStore } from '../credentials/credential-store'

export function registerSettingsHandlers() {
  ipcMain.handle(
    'settings:deleteData',
    async (_, mode: 'chat' | 'keys_analytics' | 'everything') => {
      const db = getDatabase()

      try {
        if (mode === 'chat' || mode === 'everything') {
          db.prepare('DELETE FROM messages').run()
          db.prepare('DELETE FROM conversations').run()
          db.prepare('DELETE FROM memories').run()
        }

        if (mode === 'keys_analytics' || mode === 'everything') {
          // Delete all API keys from OS keychain
          const rows = db.prepare('SELECT provider_id FROM connections').all() as {
            provider_id: string
          }[]
          for (const row of rows) {
            try {
              await CredentialStore.delete(row.provider_id)
            } catch (e) {
              console.error(`Failed to delete keychain entry for ${row.provider_id}:`, e)
            }
          }
          db.prepare('DELETE FROM connections').run()
          db.prepare('DELETE FROM test_runs').run()
          db.prepare('DELETE FROM prompt_templates').run()
        }

        return { success: true }
      } catch (e: any) {
        console.error('settings:deleteData error:', e)
        return { success: false, error: e.message }
      }
    }
  )
}
