import { useState } from 'react'
import { Copy, Check, Pencil, RefreshCw, AlertTriangle, Brain, ChevronDown, Activity, Clock } from 'lucide-react'
import { cn } from '@dexterai/shared-utils'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import type { ChatMessage } from '@dexterai/registry-types'

interface MessageBubbleProps {
  message: ChatMessage
  isStreaming?: boolean
  isLast?: boolean
  onRegenerate?: () => void
  onEdit?: (messageId: string, newContent: string) => void
}

function CodeBlock({ language, children }: { language: string; children: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="relative group rounded-lg overflow-hidden my-3 border border-border">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#1e1e1e] text-gray-400 text-[10px] font-mono uppercase tracking-wider">
        <span>{language || 'code'}</span>
        <button onClick={copy} className="flex items-center gap-1 text-[10px] hover:text-white transition-colors">
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter language={language || 'text'} style={oneDark} customStyle={{ margin: 0, borderRadius: 0, fontSize: '13px' }} showLineNumbers={false} wrapLongLines>
        {children}
      </SyntaxHighlighter>
    </div>
  )
}

export default function MessageBubble({ message, isStreaming, isLast, onRegenerate, onEdit }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const [thoughtExpanded, setThoughtExpanded] = useState(true)

  if (isSystem) return null

  const metadata = message.metadata_json ? (() => {
    try { return JSON.parse(message.metadata_json) } catch { return {} }
  })() : {}

  const { resolvedModel, thought, speed, ttft, isThinking } = metadata

  const handleEditSubmit = () => {
    const trimmed = editText.trim()
    if (trimmed && trimmed !== message.content && onEdit) {
      onEdit(message.id, trimmed)
    }
    setEditing(false)
  }

  return (
    <div className={cn('flex flex-col max-w-[90%] group/bubble', isUser ? 'ml-auto items-end' : 'mr-auto items-start')}>
      {/* Model Header */}
      {!isUser && message.model_id && (
        <div className="flex items-center gap-2 mb-1.5 ml-1">
          <span className="text-[10px] font-bold text-text-muted/60 uppercase tracking-widest">
            {message.model_id.split('/').pop()}
          </span>
          {resolvedModel && resolvedModel !== message.model_id && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[9px] font-mono border border-amber-500/20">
              <AlertTriangle className="w-2.5 h-2.5" />
              {resolvedModel}
            </span>
          )}
        </div>
      )}

      {/* Message Content Container */}
      <div className={cn(
        'relative px-5 py-3.5 rounded-3xl transition-all duration-300',
        isUser
          ? 'bg-primary text-white rounded-br-md shadow-sm'
          : 'bg-surface border border-border-subtle rounded-bl-md shadow-sm hover:shadow-md'
      )}>
        {/* User Content */}
        {isUser && editing ? (
          <div className="space-y-2 min-w-[300px]">
            <textarea
              autoFocus
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={4}
              className="w-full text-sm bg-white/10 rounded-xl px-3 py-2 text-white resize-none focus:outline-none border border-white/20"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditing(false)} className="text-[10px] font-bold px-3 py-1 bg-white/10 rounded-lg hover:bg-white/20">Cancel</button>
              <button onClick={handleEditSubmit} className="text-[10px] font-bold px-3 py-1 bg-white rounded-lg text-primary hover:bg-white/90">Save Changes</button>
            </div>
          </div>
        ) : isUser ? (
          <>
            <span className="whitespace-pre-wrap text-[15px] leading-relaxed">{message.content}</span>
            {onEdit && (
              <button
                onClick={() => { setEditText(message.content); setEditing(true) }}
                className="absolute -left-10 top-1/2 -translate-y-1/2 p-2 rounded-full opacity-0 group-hover/bubble:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
              >
                <Pencil className="w-3.5 h-3.5 text-text-muted" />
              </button>
            )}
          </>
        ) : (
          /* Assistant Content */
          <div className="flex flex-col gap-3">
            {/* Thinking Block */}
            {(thought || isThinking) && (
              <div className="flex flex-col bg-elevated/50 rounded-2xl border border-border-subtle overflow-hidden">
                <button
                  onClick={() => setThoughtExpanded(!thoughtExpanded)}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-elevated/80 transition-colors"
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-text-muted">
                    <Brain className={cn("w-3.5 h-3.5", isThinking && "animate-pulse text-purple-500")} />
                    <span>{isThinking ? 'Thinking...' : 'Reasoning Process'}</span>
                  </div>
                  <ChevronDown className={cn("w-3.5 h-3.5 text-text-muted transition-transform duration-300", !thoughtExpanded && "-rotate-90")} />
                </button>
                {thoughtExpanded && (
                  <div className="px-4 pb-4 text-[13px] text-text-secondary leading-relaxed font-serif italic border-t border-border-subtle/30 pt-3">
                    {thought}
                    {isThinking && <span className="inline-block w-1.5 h-3.5 bg-purple-500/50 animate-pulse ml-1 align-middle" />}
                  </div>
                )}
              </div>
            )}

            {/* Answer Content */}
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-headings:my-3 prose-pre:my-0 prose-pre:p-0 prose-pre:bg-transparent text-[15px] leading-relaxed">
              <Markdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '')
                    const content = String(children).replace(/\n$/, '')
                    return match
                      ? <CodeBlock language={match[1]}>{content}</CodeBlock>
                      : <code className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 text-[13px] font-mono font-bold" {...props}>{children}</code>
                  }
                }}
              >
                {message.content}
              </Markdown>
              {isStreaming && !isThinking && (
                <span className="inline-block w-1.5 h-4.5 bg-primary/80 animate-pulse ml-1 align-middle rounded-sm" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Assistant Footer Footer Metrics */}
      {!isUser && !isSystem && (
        <div className="flex items-center gap-4 mt-2 ml-2 opacity-0 group-hover/bubble:opacity-100 transition-opacity">
          {speed && (
            <div className="flex items-center gap-1 text-[10px] font-bold text-text-muted" title="Generation Speed">
              <Activity className="w-3 h-3" />
              {speed} tok/s
            </div>
          )}
          {ttft && (
            <div className="flex items-center gap-1 text-[10px] font-bold text-text-muted" title="Time to First Token">
              <Clock className="w-3 h-3" />
              {ttft}ms
            </div>
          )}
          {isLast && !isStreaming && onRegenerate && (
            <button
              onClick={onRegenerate}
              className="flex items-center gap-1 text-[10px] font-bold text-text-muted hover:text-primary transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Regenerate
            </button>
          )}
        </div>
      )}
    </div>
  )
}
