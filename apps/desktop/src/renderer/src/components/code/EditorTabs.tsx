import { useState, useEffect, useRef } from 'react'
import { X, FileCode } from 'lucide-react'
import { cn } from '@dexterai/shared-utils'
import Editor from '@monaco-editor/react'

interface OpenFile {
  path: string
  name: string
  language: string
  content: string
  originalContent: string
}

interface EditorTabsProps {
  files: OpenFile[]
  activeIndex: number
  onTabSelect: (index: number) => void
  onTabClose: (index: number) => void
  onContentChange: (index: number, content: string) => void
  onSave: (index: number) => void
}

interface ContextMenu {
  x: number
  y: number
  tabIndex: number
}

export default function EditorTabs({
  files,
  activeIndex,
  onTabSelect,
  onTabClose,
  onContentChange,
  onSave
}: EditorTabsProps) {
  const activeFile = files[activeIndex] ?? null
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Cmd+S handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's' && !e.shiftKey) {
        e.preventDefault()
        if (activeIndex >= 0 && activeIndex < files.length) {
          onSave(activeIndex)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeIndex, files.length, onSave])

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [contextMenu])

  const confirmClose = (index: number) => {
    const file = files[index]
    if (file && file.content !== file.originalContent) {
      const confirmed = window.confirm(`"${file.name}" has unsaved changes. Close anyway?`)
      if (!confirmed) return
    }
    onTabClose(index)
  }

  const closeOthers = (keepIndex: number) => {
    // Close from end to start to maintain correct indices
    for (let i = files.length - 1; i >= 0; i--) {
      if (i === keepIndex) continue
      onTabClose(i)
    }
    setContextMenu(null)
  }

  const closeAll = () => {
    const hasDirty = files.some((f) => f.content !== f.originalContent)
    if (hasDirty) {
      const confirmed = window.confirm('Some files have unsaved changes. Close all anyway?')
      if (!confirmed) return
    }
    for (let i = files.length - 1; i >= 0; i--) {
      onTabClose(i)
    }
    setContextMenu(null)
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-background text-text-muted">
        <FileCode className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm font-medium">Select a file to begin editing</p>
        <p className="text-xs mt-1 opacity-60">Choose a file from the explorer</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Tab bar */}
      <div className="flex items-center border-b border-border-subtle bg-surface overflow-x-auto shrink-0 scrollbar-thin">
        {files.map((file, i) => {
          const isDirty = file.content !== file.originalContent
          const isActive = i === activeIndex
          return (
            <button
              key={file.path}
              onClick={() => onTabSelect(i)}
              onContextMenu={(e) => {
                e.preventDefault()
                setContextMenu({ x: e.clientX, y: e.clientY, tabIndex: i })
              }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium border-b-2 shrink-0 transition-colors group/tab',
                isActive
                  ? 'bg-background border-primary text-text'
                  : 'bg-surface border-transparent text-text-secondary hover:bg-elevated'
              )}
              title={file.path}
            >
              <span className="truncate max-w-[120px]">{file.name}</span>
              {isDirty && (
                <span className="w-2 h-2 rounded-full bg-warning shrink-0" title="Unsaved changes" />
              )}
              <span
                onClick={(e) => {
                  e.stopPropagation()
                  confirmClose(i)
                }}
                className="p-0.5 rounded opacity-0 group-hover/tab:opacity-100 hover:bg-elevated transition-all shrink-0 ml-1"
              >
                <X className="w-3 h-3" />
              </span>
            </button>
          )
        })}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-surface border border-border-subtle rounded-lg shadow-lg py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => { confirmClose(contextMenu.tabIndex); setContextMenu(null) }}
            className="w-full text-left px-3 py-1.5 text-[12px] text-text hover:bg-elevated transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => closeOthers(contextMenu.tabIndex)}
            className="w-full text-left px-3 py-1.5 text-[12px] text-text hover:bg-elevated transition-colors"
          >
            Close Others
          </button>
          <button
            onClick={closeAll}
            className="w-full text-left px-3 py-1.5 text-[12px] text-text hover:bg-elevated transition-colors"
          >
            Close All
          </button>
          <div className="border-t border-border-subtle my-1" />
          <button
            onClick={() => {
              navigator.clipboard.writeText(files[contextMenu.tabIndex].path)
              setContextMenu(null)
            }}
            className="w-full text-left px-3 py-1.5 text-[12px] text-text hover:bg-elevated transition-colors"
          >
            Copy Path
          </button>
        </div>
      )}

      {/* Path breadcrumb */}
      {activeFile && (
        <div className="px-3 py-1 text-[10px] text-text-muted font-mono bg-surface/50 border-b border-border-subtle/50 truncate shrink-0">
          {activeFile.path}
          {activeFile.content !== activeFile.originalContent && (
            <span className="text-warning ml-2">(unsaved)</span>
          )}
        </div>
      )}

      {/* Monaco Editor */}
      <div className="flex-1 min-h-0">
        {activeFile && (
          <Editor
            key={activeFile.path}
            height="100%"
            language={activeFile.language}
            value={activeFile.content}
            theme="vs-dark"
            onChange={(v) => onContentChange(activeIndex, v ?? '')}
            options={{
              minimap: { enabled: false },
              wordWrap: 'on',
              fontSize: 13,
              fontFamily: 'JetBrains Mono, SF Mono, Menlo, monospace',
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              renderWhitespace: 'selection',
              bracketPairColorization: { enabled: true }
            }}
            loading={
              <div className="flex flex-col items-center justify-center h-full bg-background text-text-muted space-y-3">
                <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <span className="text-[11px] font-medium opacity-50">Initializing editor...</span>
              </div>
            }
          />
        )}
      </div>
    </div>
  )
}
