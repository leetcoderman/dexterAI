import { useState } from 'react'
import { Copy, Check, Pencil, RefreshCw } from 'lucide-react'
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
        <button
          onClick={copy}
          className="flex items-center gap-1 text-[10px] hover:text-white transition-colors"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        customStyle={{ margin: 0, borderRadius: 0, fontSize: '13px' }}
        showLineNumbers={false}
        wrapLongLines
      >
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

  if (isSystem) return null

  const handleEditSubmit = () => {
    const trimmed = editText.trim()
    if (trimmed && trimmed !== message.content && onEdit) {
      onEdit(message.id, trimmed)
    }
    setEditing(false)
  }

  return (
    <div className={cn('flex flex-col max-w-[85%]', isUser ? 'ml-auto items-end' : 'mr-auto items-start')}>
      {!isUser && message.model_id && (
        <span className="text-[10px] text-gray-400 font-medium mb-1 ml-1">
          {message.model_id}
          {message.provider_id && (
            <span className="text-gray-500"> via {message.provider_id}</span>
          )}
        </span>
      )}

      <div
        className={cn(
          'px-4 py-3 rounded-2xl text-sm group relative',
          isUser
            ? 'bg-primary text-white rounded-br-sm'
            : 'bg-black/5 dark:bg-white/5 rounded-bl-sm border border-border text-text'
        )}
      >
        {isUser && editing ? (
          <div className="space-y-2">
            <textarea
              autoFocus
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={3}
              className="w-full text-sm bg-white/10 rounded px-2 py-1 text-white resize-none focus:outline-none min-w-[200px]"
            />
            <div className="flex gap-1.5 justify-end">
              <button onClick={handleEditSubmit} className="text-[10px] px-2 py-0.5 bg-white/20 rounded hover:bg-white/30">Save</button>
              <button onClick={() => setEditing(false)} className="text-[10px] px-2 py-0.5 bg-white/10 rounded hover:bg-white/20">Cancel</button>
            </div>
          </div>
        ) : isUser ? (
          <>
            <span className="whitespace-pre-wrap">{message.content}</span>
            {onEdit && (
              <button
                onClick={() => { setEditText(message.content); setEditing(true) }}
                className="absolute -left-7 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-opacity"
                title="Edit"
              >
                <Pencil className="w-3 h-3 text-gray-400" />
              </button>
            )}
          </>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-pre:my-0 prose-pre:p-0 prose-pre:bg-transparent">
            <Markdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '')
                  const content = String(children).replace(/\n$/, '')

                  if (match) {
                    return <CodeBlock language={match[1]}>{content}</CodeBlock>
                  }

                  return (
                    <code
                      className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 text-[13px] font-mono"
                      {...props}
                    >
                      {children}
                    </code>
                  )
                },
                pre({ children }) {
                  return <>{children}</>
                }
              }}
            >
              {message.content}
            </Markdown>
            {isStreaming && (
              <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5 align-middle rounded-sm" />
            )}
          </div>
        )}
      </div>

      {/* Regenerate button on last assistant message */}
      {!isUser && isLast && !isStreaming && onRegenerate && (
        <button
          onClick={onRegenerate}
          className="flex items-center gap-1 mt-1 ml-1 text-[10px] text-gray-400 hover:text-text transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Regenerate
        </button>
      )}
    </div>
  )
}
