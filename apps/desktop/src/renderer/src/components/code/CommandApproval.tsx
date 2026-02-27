import { AlertTriangle, Play, X } from 'lucide-react'

interface CommandApprovalProps {
  command: string
  cwd: string
  onApprove: () => void
  onReject: () => void
}

export default function CommandApproval({ command, cwd, onApprove, onReject }: CommandApprovalProps) {
  return (
    <div className="border border-warning/30 rounded-xl overflow-hidden bg-surface my-2">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-warning/5 border-b border-warning/20">
        <div className="flex items-center gap-2 text-warning">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm font-semibold">Execute Command</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onReject}
            className="px-3 py-1 text-xs font-medium text-text-muted hover:text-text bg-background border border-border rounded-lg hover:bg-elevated transition-colors"
          >
            <X className="w-3 h-3 inline mr-1" />
            Reject
          </button>
          <button
            onClick={onApprove}
            className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
          >
            <Play className="w-3 h-3 inline mr-1" />
            Run
          </button>
        </div>
      </div>

      {/* Command */}
      <div className="p-4">
        <pre className="bg-background rounded-lg p-3 font-mono text-sm text-text overflow-x-auto">
          <span className="text-primary">$</span> {command}
        </pre>
        <p className="mt-2 text-xs text-text-muted">
          cwd: <span className="font-mono">{cwd}</span>
        </p>
      </div>
    </div>
  )
}
