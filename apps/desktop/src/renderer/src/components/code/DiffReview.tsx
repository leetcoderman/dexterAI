import { Check, X, FileEdit } from 'lucide-react'
import { DiffEditor } from '@monaco-editor/react'

interface DiffReviewProps {
  filePath: string
  oldContent: string
  newContent: string
  onApprove: () => void
  onReject: () => void
}

export default function DiffReview({
  filePath,
  oldContent,
  newContent,
  onApprove,
  onReject
}: DiffReviewProps) {
  const isNewFile = oldContent === ''

  return (
    <div className="rounded-lg border-2 border-warning/50 bg-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-warning/10 border-b border-warning/30">
        <div className="flex items-center gap-2">
          <FileEdit className="w-4 h-4 text-warning" />
          <span className="text-[12px] font-bold text-text">
            {isNewFile ? 'Create new file' : 'Modify file'}
          </span>
          <span className="text-[11px] font-mono text-text-secondary">{filePath}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onReject}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors border border-red-500/20"
          >
            <X className="w-3.5 h-3.5" />
            Reject
          </button>
          <button
            onClick={onApprove}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors border border-green-500/20"
          >
            <Check className="w-3.5 h-3.5" />
            Approve
          </button>
        </div>
      </div>

      {/* Diff Editor */}
      <div className="h-[300px]">
        <DiffEditor
          height="100%"
          original={oldContent}
          modified={newContent}
          language={detectLanguageFromPath(filePath)}
          theme="vs-dark"
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 12,
            fontFamily: 'JetBrains Mono, SF Mono, Menlo, monospace',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            renderSideBySide: true,
            lineNumbers: 'on',
            wordWrap: 'on'
          }}
        />
      </div>
    </div>
  )
}

function detectLanguageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescriptreact',
    js: 'javascript',
    jsx: 'javascriptreact',
    py: 'python',
    rs: 'rust',
    go: 'go',
    json: 'json',
    md: 'markdown',
    css: 'css',
    html: 'html',
    sql: 'sql',
    yaml: 'yaml',
    yml: 'yaml',
    sh: 'shell'
  }
  return map[ext] ?? 'plaintext'
}
