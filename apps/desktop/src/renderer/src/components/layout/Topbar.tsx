import { useLocation, useParams, useNavigate } from 'react-router-dom'
import { Plus, Settings2, Download, ChevronDown, FileText, File as FileIcon, Type } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '../../store'
import { generateMarkdown, generatePDF, generateDOCX } from '../../utils/export-utils'

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Home',
  '/chat': 'Home',
  '/explore': 'Use-case Gallery',
  '/catalogue': 'Model Catalogue',
  '/memory': 'Memory',
  '/settings': 'Settings'
}

export default function Topbar() {
  const location = useLocation()
  const { providerId, modelId, conversationId } = useParams()
  const navigate = useNavigate()
  const connectedProviders = useAppStore((s) => s.connectedProviders)
  const conversations = useAppStore((s) => s.conversations)
  const { isChatSettingsOpen, setIsChatSettingsOpen } = useAppStore()

  const [isExportOpen, setIsExportOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
        setIsExportOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleNewChat = async () => {
    const conv = await window.dexterai.conversations.create()
    if (conv) navigate(`/chat/${conv.id}`)
  }

  const handleExport = async (format: 'markdown' | 'pdf' | 'docx') => {
    if (!conversationId || isExporting) return
    setIsExporting(true)
    setIsExportOpen(false)

    try {
      const conv = conversations.find((c) => c.id === conversationId)
      const title = conv?.title || 'Chat'
      const messages = await window.dexterai.messages.list(conversationId)

      let content: string | Uint8Array
      let extension = ''
      let filterName = ''

      switch (format) {
        case 'markdown':
          content = await generateMarkdown(title, messages)
          extension = 'md'
          filterName = 'Markdown Files'
          break
        case 'pdf':
          content = await generatePDF(title, messages)
          extension = 'pdf'
          filterName = 'PDF Files'
          break
        case 'docx':
          content = await generateDOCX(title, messages)
          extension = 'docx'
          filterName = 'Word Documents'
          break
      }

      await window.dexterai.files.saveFile({
        content,
        title: `Export as ${format.toUpperCase()}`,
        defaultName: `${title.toLowerCase().replace(/\s+/g, '_')}.${extension}`,
        filters: [{ name: filterName, extensions: [extension] }]
      })
    } catch (e) {
      console.error('Failed to export chat:', e)
    } finally {
      setIsExporting(false)
    }
  }

  let title = ROUTE_TITLES[location.pathname] ?? 'dexterAI'
  if (providerId) title = `Connect ${providerId.charAt(0).toUpperCase() + providerId.slice(1)}`
  if (modelId) title = modelId
  if (conversationId) {
    const conv = conversations.find((c) => c.id === conversationId)
    title = conv?.title || 'Chat'
  }

  const count = connectedProviders.length

  return (
    <header className="h-12 shrink-0 border-b border-border-subtle bg-sidebar-bg flex items-center justify-between px-5 drag-region z-10">
      <div className="flex items-center gap-4 no-drag min-w-0">
        <h2 className="text-sm font-semibold text-text-secondary truncate max-w-xs no-select">
          {title}
        </h2>
        {/* Connected Indicator - Beside Title */}
        <div
          className={cn(
            'flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors',
            count > 0
              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
              : 'bg-elevated text-text-muted border border-border-subtle'
          )}
        >
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              count > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-text-muted'
            )}
          />
          {count} Connected
        </div>

        {/* Chat Settings Button - Only in Chat Screen */}
        {conversationId && (
          <button
            onClick={() => setIsChatSettingsOpen(!isChatSettingsOpen)}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              isChatSettingsOpen
                ? 'bg-primary/20 text-primary'
                : 'hover:bg-elevated text-text-secondary hover:text-text'
            )}
            title="Chat settings"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3 no-drag">
        {/* Export Dropdown */}
        {conversationId && (
          <div className="relative" ref={exportRef}>
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold bg-elevated text-text-secondary rounded-lg hover:bg-overlay hover:text-text transition-all border border-border-subtle disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {isExporting ? 'Exporting...' : 'Export'}
              <ChevronDown className={cn('w-3 h-3 transition-transform', isExportOpen && 'rotate-180')} />
            </button>

            {isExportOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-elevated border border-border shadow-xl rounded-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <button
                  onClick={() => handleExport('markdown')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] text-text-secondary hover:bg-sidebar-active hover:text-primary transition-colors text-left"
                >
                  <Type className="w-3.5 h-3.5" />
                  Markdown (.md)
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] text-text-secondary hover:bg-sidebar-active hover:text-primary transition-colors text-left"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Portable Doc (.pdf)
                </button>
                <button
                  onClick={() => handleExport('docx')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] text-text-secondary hover:bg-sidebar-active hover:text-primary transition-colors text-left"
                >
                  <FileIcon className="w-3.5 h-3.5" />
                  Word Doc (.docx)
                </button>
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleNewChat}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold bg-primary text-white rounded-lg hover:bg-primary-hover transition-all shadow-md shadow-primary/20 active:scale-95 transition-colors duration-150"
        >
          <Plus className="w-3.5 h-3.5" />
          New Chat
        </button>
      </div>
    </header>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
