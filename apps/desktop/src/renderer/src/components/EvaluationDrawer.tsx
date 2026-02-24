import { useState, useEffect } from 'react'
import { ChevronUp, ChevronDown, Activity, Clock, AlignLeft, CheckCircle2, Box } from 'lucide-react'
import { cn } from '@dexterai/shared-utils'
import { EvaluationMetrics } from '@dexterai/registry-types'

export default function EvaluationDrawer({ modelId }: { modelId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [metrics, setMetrics] = useState<EvaluationMetrics | null>(null)

  useEffect(() => {
    setMetrics(null)
    setIsOpen(false)
  }, [modelId])

  useEffect(() => {
    const unsub = window.dexterai.on('test:done', (data: EvaluationMetrics) => {
      setMetrics(data)
      setIsOpen(true)
    })
    return unsub
  }, [])

  if (!metrics) return null

  const getTTFTColor = (ttft: number | null) => {
    if (ttft === null) return 'text-text-muted'
    if (ttft < 500) return 'text-success'
    if (ttft < 2000) return 'text-warning'
    return 'text-danger'
  }

  return (
    <div className="shrink-0 bg-surface border-t border-border-subtle overflow-hidden flex flex-col transition-all duration-300">
      {/* Toggle header */}
      <button
        className="px-4 py-2.5 bg-elevated flex items-center justify-between hover:bg-overlay transition-colors w-full"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-text">Evaluation Metrics</span>
          {metrics.ttft !== null && (
            <span className="text-[10px] text-text-muted bg-surface px-2 py-0.5 rounded-full ml-1">
              TTFT: {metrics.ttft.toFixed(0)}ms
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
        ) : (
          <ChevronUp className="w-3.5 h-3.5 text-text-muted" />
        )}
      </button>

      {isOpen && (
        <div className="p-3 grid grid-cols-2 lg:grid-cols-4 gap-2 max-h-[200px] overflow-y-auto animate-fade-in">
          <MetricCard
            icon={<Clock className="w-3.5 h-3.5" />}
            label="TTFT"
            value={metrics.ttft !== null ? `${metrics.ttft.toFixed(0)} ms` : 'N/A'}
            valueClass={getTTFTColor(metrics.ttft)}
          />
          <MetricCard
            icon={<Clock className="w-3.5 h-3.5" />}
            label="Total Time"
            value={`${metrics.totalTime.toFixed(0)} ms`}
          />
          {(metrics.promptTokens > 0 || metrics.completionTokens > 0) && (
            <>
              <MetricCard
                icon={<AlignLeft className="w-3.5 h-3.5" />}
                label="Prompt Tokens"
                value={metrics.promptTokens.toLocaleString()}
              />
              <MetricCard
                icon={<AlignLeft className="w-3.5 h-3.5" />}
                label="Completion"
                value={metrics.completionTokens.toLocaleString()}
              />
              {metrics.cacheReadTokens !== undefined && metrics.cacheReadTokens > 0 && (
                <MetricCard
                  icon={<Box className="w-3.5 h-3.5" />}
                  label="Cache Hit"
                  value={`${metrics.cacheReadTokens.toLocaleString()}`}
                  valueClass="text-success"
                />
              )}
              {metrics.finishReason && (
                <MetricCard
                  icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                  label="Finish"
                  value={metrics.finishReason}
                  valueClass="text-text-muted uppercase text-[10px] font-mono"
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function MetricCard({
  icon,
  label,
  value,
  valueClass = 'text-text'
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  valueClass?: string
}) {
  return (
    <div className="bg-elevated rounded-lg p-2.5 flex flex-col gap-1">
      <div className="flex items-center gap-1 text-text-muted">
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wider truncate">{label}</span>
      </div>
      <span className={cn('text-base font-bold', valueClass)}>{value}</span>
    </div>
  )
}
