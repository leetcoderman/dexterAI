import { useState, useEffect } from 'react'
import { Trash2, Zap, Trophy, Clock } from 'lucide-react'
import { cn } from '@dexterai/shared-utils'

interface TestRunRow {
  id: string
  model_id: string
  provider_id: string
  category: string
  params_json: string
  output_summary: string | null
  metrics_json: string
  ran_at: number
  error: string | null
}

export default function HistoryTab({
  modelId,
  category
}: {
  modelId: string
  category?: string
}) {
  const [runs, setRuns] = useState<TestRunRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadHistory = async () => {
    setIsLoading(true)
    try {
      const data = await window.dexterai.history.getRunsForModel(modelId)
      setRuns(data)
    } catch (e) {
      console.error('Failed to load history', e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [modelId, category])

  const handleDelete = async (id: string) => {
    await window.dexterai.history.deleteRun(id)
    setRuns(runs.filter((r) => r.id !== id))
  }

  const formatMetrics = (run: TestRunRow) => {
    try {
      return JSON.parse(run.metrics_json)
    } catch {
      return null
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 p-6 overflow-y-auto flex items-center justify-center text-text-muted text-sm">
        Loading history...
      </div>
    )
  }

  if (runs.length === 0) {
    return (
      <div className="flex-1 p-6 overflow-y-auto flex flex-col items-center justify-center text-text-muted animate-fade-in">
        <Clock className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm">No test runs recorded for {modelId} yet.</p>
      </div>
    )
  }

  const validTTFTs = runs
    .map((r) => formatMetrics(r)?.ttft)
    .filter((t) => typeof t === 'number' && t > 0)
  const fastestTTFT = validTTFTs.length > 0 ? Math.min(...validTTFTs) : null

  return (
    <div className="flex-1 p-5 overflow-y-auto space-y-4 animate-fade-in">
      {/* Personal Bests */}
      <div className="bg-surface rounded-xl border border-border-subtle p-4">
        <div className="flex items-center gap-2 text-text font-semibold text-sm mb-3">
          <Trophy className="w-4 h-4 text-amber-400" />
          Personal Bests
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-elevated rounded-lg p-3">
            <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">
              Fastest TTFT
            </div>
            <div className="text-lg font-bold flex items-center gap-1.5">
              {fastestTTFT ? `${fastestTTFT.toFixed(0)} ms` : '--'}
              {fastestTTFT && <Zap className="w-3.5 h-3.5 text-success" />}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-xl border border-border-subtle overflow-hidden">
        <table className="w-full text-left text-sm text-text">
          <thead>
            <tr className="bg-elevated text-[10px] uppercase text-text-muted tracking-wider border-b border-border-subtle">
              <th className="px-4 py-2.5 font-medium">Time</th>
              <th className="px-4 py-2.5 font-medium">TTFT</th>
              <th className="px-4 py-2.5 font-medium">Tokens (P/C)</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {runs.map((run) => {
              const metrics = formatMetrics(run)
              const date = new Date(run.ran_at).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                second: '2-digit'
              })
              return (
                <tr
                  key={run.id}
                  className="hover:bg-elevated/50 transition-colors"
                >
                  <td className="px-4 py-2.5 text-xs font-medium">{date}</td>
                  <td className="px-4 py-2.5">
                    {metrics?.ttft ? (
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-semibold',
                          metrics.ttft < 500
                            ? 'bg-[rgba(35,165,90,0.1)] text-success'
                            : metrics.ttft < 2000
                              ? 'bg-[rgba(240,178,50,0.1)] text-warning'
                              : 'bg-[rgba(237,66,69,0.1)] text-danger'
                        )}
                      >
                        {metrics.ttft.toFixed(0)}ms
                      </span>
                    ) : (
                      '--'
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-text-muted">
                    {metrics?.promptTokens || metrics?.completionTokens
                      ? `${metrics.promptTokens} / ${metrics.completionTokens}`
                      : '--'}
                  </td>
                  <td className="px-4 py-2.5 max-w-[200px] truncate text-xs text-text-muted">
                    {run.error ? (
                      <span className="text-danger">Error: {run.error}</span>
                    ) : (
                      <span>{run.output_summary || 'Completed'}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => handleDelete(run.id)}
                      className="p-1.5 text-text-muted hover:text-danger hover:bg-[rgba(237,66,69,0.1)] rounded-md transition-colors"
                      title="Delete run"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
