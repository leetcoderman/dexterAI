import { ipcMain } from 'electron'
import { getDatabase } from '../db/database'

export interface TestRunRecord {
  id: string
  model_id: string
  provider_id: string
  category: string
  params_json: string
  output_summary: string
  metrics_json: string
  ran_at: number
  error: string | null
}

export function saveTestRun(record: TestRunRecord) {
  try {
    const db = getDatabase()
    const stmt = db.prepare(`
            INSERT INTO test_runs(id, model_id, provider_id, category, params_json, output_summary, metrics_json, ran_at, error)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
    stmt.run(
      record.id,
      record.model_id,
      record.provider_id,
      record.category,
      record.params_json,
      record.output_summary,
      record.metrics_json,
      record.ran_at,
      record.error
    )
    console.log(`Saved test run ${record.id} to db.`)
  } catch (e) {
    console.error('Failed to save test run:', e)
  }
}

export function registerHistoryHandlers() {
  ipcMain.handle('history:list', async (_, category?: string) => {
    try {
      const db = getDatabase()
      let query = 'SELECT * FROM test_runs'
      const params: any[] = []

      if (category) {
        query += ' WHERE category = ?'
        params.push(category)
      }
      query += ' ORDER BY ran_at DESC'

      const rows = db.prepare(query).all(...params)
      return rows
    } catch (err: any) {
      console.error('history:list error', err)
      return []
    }
  })

  ipcMain.handle('history:getRunsForModel', async (_, modelId: string, limit?: number) => {
    try {
      const db = getDatabase()
      let query = 'SELECT * FROM test_runs WHERE model_id = ? ORDER BY ran_at DESC'
      const params: any[] = [modelId]
      if (limit) {
        query += ' LIMIT ?'
        params.push(limit)
      }
      return db.prepare(query).all(...params)
    } catch (err: any) {
      console.error('history:getRunsForModel error', err)
      return []
    }
  })

  ipcMain.handle('history:delete', async (_, id: string) => {
    try {
      const db = getDatabase()
      db.prepare('DELETE FROM test_runs WHERE id = ?').run(id)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('history:deleteRun', async (_, runId: string) => {
    try {
      const db = getDatabase()
      db.prepare('DELETE FROM test_runs WHERE id = ?').run(runId)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('history:exportAsCSV', async (_, modelId: string) => {
    try {
      const db = getDatabase()
      const rows = db
        .prepare('SELECT * FROM test_runs WHERE model_id = ? ORDER BY ran_at DESC')
        .all(modelId) as TestRunRecord[]
      const header =
        'id,model_id,provider_id,category,ran_at,ttft,prompt_tokens,completion_tokens,error'
      const lines = rows.map((r) => {
        let metrics: any = {}
        try {
          metrics = JSON.parse(r.metrics_json)
        } catch {
          /* ignore */
        }
        return [
          r.id,
          r.model_id,
          r.provider_id,
          r.category,
          new Date(r.ran_at).toISOString(),
          metrics.ttft ?? '',
          metrics.promptTokens ?? '',
          metrics.completionTokens ?? '',
          r.error ?? ''
        ].join(',')
      })
      return [header, ...lines].join('\n')
    } catch (err: any) {
      console.error('history:exportAsCSV error', err)
      return ''
    }
  })
}
