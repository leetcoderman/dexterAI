import { useState, useCallback } from 'react'
import {
  Copy,
  Check,
  Pencil,
  RefreshCw,
  AlertTriangle,
  Brain,
  ChevronRight,
  Activity,
  Clock,
  Sparkles,
  Code,
  Zap
} from 'lucide-react'
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

// Detect what the model is currently doing based on content patterns
function detectStreamingPhase(
  content: string,
  _thought: string,
  isThinking: boolean,
  isWaiting: boolean
): {
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: string
} {
  if (isWaiting) {
    return { label: 'Connecting', icon: Zap, color: 'text-amber-400' }
  }
  if (isThinking && !content) {
    return { label: 'Reasoning', icon: Brain, color: 'text-purple-400' }
  }
  // Check if the latest content suggests coding
  const lastChunk = content.slice(-200)
  if (
    lastChunk.includes('```') ||
    lastChunk.match(/\b(function|const|import|class|def|return)\b/)
  ) {
    return { label: 'Coding', icon: Code, color: 'text-emerald-400' }
  }
  if (content.length > 0) {
    return { label: 'Writing', icon: Sparkles, color: 'text-blue-400' }
  }
  return { label: 'Thinking', icon: Brain, color: 'text-purple-400' }
}

// Animated dots component
function StreamingDots({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      <span className="w-1 h-1 rounded-full bg-current animate-dot-bounce" />
      <span
        className="w-1 h-1 rounded-full bg-current animate-dot-bounce"
        style={{ animationDelay: '0.16s' }}
      />
      <span
        className="w-1 h-1 rounded-full bg-current animate-dot-bounce"
        style={{ animationDelay: '0.32s' }}
      />
    </span>
  )
}

export default function MessageBubble({
  message,
  isStreaming,
  isLast,
  onRegenerate,
  onEdit
}: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const [thoughtExpanded, setThoughtExpanded] = useState(false)
  const [msgCopied, setMsgCopied] = useState(false)

  if (isSystem) return null

  const handleCopyMessage = useCallback(() => {
    if (!message.content) return
    navigator.clipboard.writeText(message.content)
    setMsgCopied(true)
    setTimeout(() => setMsgCopied(false), 2000)
  }, [message.content])

  const metadata = message.metadata_json
    ? (() => {
        try {
          return JSON.parse(message.metadata_json)
        } catch {
          return {}
        }
      })()
    : {}

  const { resolvedModel, thought, speed, ttft, isThinking, isWaiting } = metadata

  const handleEditSubmit = () => {
    const trimmed = editText.trim()
    if (trimmed && trimmed !== message.content && onEdit) {
      onEdit(message.id, trimmed)
    }
    setEditing(false)
  }

  // Determine streaming phase for the activity indicator
  const streamPhase = isStreaming
    ? detectStreamingPhase(message.content || '', thought || '', !!isThinking, !!isWaiting)
    : null

  return (
    <div
      className={cn(
        'flex flex-col max-w-[90%] group/bubble',
        isUser ? 'ml-auto items-end' : 'mr-auto items-start'
      )}
    >
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

      {/* Live Activity Bar — shown during streaming, above the bubble */}
      {isStreaming && streamPhase && (
        <div className="flex items-center gap-2 mb-2 ml-1 animate-fade-in-up">
          <div className="relative flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface border border-border-subtle">
            {/* Pulse ring behind icon */}
            <div className="relative">
              <streamPhase.icon className={cn('w-3 h-3 relative z-10', streamPhase.color)} />
              <div
                className={cn(
                  'absolute inset-0 rounded-full animate-pulse-ring',
                  streamPhase.color,
                  'opacity-30'
                )}
              />
            </div>
            <span
              className={cn('text-[10px] font-bold uppercase tracking-wider', streamPhase.color)}
            >
              {streamPhase.label}
            </span>
            <StreamingDots className={cn('ml-0.5', streamPhase.color)} />

            {/* Live speed counter */}
            {speed && Number(speed) > 0 && (
              <span className="text-[9px] font-mono text-text-muted/60 ml-1 tabular-nums">
                {speed} tok/s
              </span>
            )}
          </div>

          {/* TTFT badge */}
          {ttft && (
            <span className="text-[9px] font-mono text-text-muted/40 tabular-nums">
              TTFT {ttft}ms
            </span>
          )}
        </div>
      )}

      {/* Thinking/Reasoning Block — OUTSIDE the message bubble, visually distinct */}
      {!isUser && (thought || isThinking) && (
        <div className="w-full mb-2 animate-fade-in-up">
          <button
            onClick={() => setThoughtExpanded(!thoughtExpanded)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-purple-500/5 transition-colors group/thought"
          >
            <ChevronRight
              className={cn(
                'w-3 h-3 text-purple-400/70 transition-transform duration-200',
                thoughtExpanded && 'rotate-90'
              )}
            />
            <Brain className={cn('w-3.5 h-3.5 text-purple-400', isThinking && 'animate-pulse')} />
            <span className="text-[11px] font-semibold text-purple-400/80">
              {isThinking ? 'Thinking' : 'View thought process'}
            </span>
            {isThinking && <StreamingDots className="text-purple-400 ml-0.5" />}
          </button>
          {thoughtExpanded && (
            <div className="ml-5 mt-1 px-3 py-2.5 rounded-xl bg-purple-500/5 border border-purple-500/10 animate-fade-in">
              <p className="text-[12px] text-text-secondary/70 leading-relaxed italic whitespace-pre-wrap">
                {thought}
                {isThinking && (
                  <span className="inline-block w-1.5 h-3.5 bg-purple-400/40 animate-breathing ml-1 align-middle" />
                )}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Message Content Container */}
      <div
        className={cn(
          'relative px-5 py-3.5 rounded-3xl transition-all duration-300',
          isUser
            ? 'bg-primary text-white rounded-br-md shadow-sm'
            : 'bg-surface border border-border-subtle rounded-bl-md shadow-sm hover:shadow-md',
          // Subtle glow while streaming
          isStreaming && !isUser && 'border-primary/20 shadow-[0_0_15px_rgba(88,101,242,0.08)]'
        )}
      >
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
              <button
                onClick={() => setEditing(false)}
                className="text-[10px] font-bold px-3 py-1 bg-white/10 rounded-lg hover:bg-white/20"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSubmit}
                className="text-[10px] font-bold px-3 py-1 bg-white rounded-lg text-primary hover:bg-white/90"
              >
                Save Changes
              </button>
            </div>
          </div>
        ) : isUser ? (
          <span className="whitespace-pre-wrap text-[15px] leading-relaxed">{message.content}</span>
        ) : (
          /* Assistant Content */
          <div className="flex flex-col min-w-[100px]">
            {/* Answer Content */}
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent text-[15px]">
              {isWaiting && !message.content ? (
                /* Skeleton loading — waiting for connection */
                <div className="flex flex-col gap-3 py-2 animate-fade-in-up">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-400/60 animate-breathing" />
                    <span className="text-[11px] text-text-muted/50 font-medium">
                      Waiting for model response...
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 w-3/4 bg-text-muted/8 rounded-full animate-skeleton" />
                    <div
                      className="h-3 w-1/2 bg-text-muted/8 rounded-full animate-skeleton"
                      style={{ animationDelay: '0.15s' }}
                    />
                    <div
                      className="h-3 w-2/3 bg-text-muted/8 rounded-full animate-skeleton"
                      style={{ animationDelay: '0.3s' }}
                    />
                  </div>
                </div>
              ) : (
                <div className={cn(!message.content && 'min-h-[20px]')}>
                  <Markdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '')
                        const content = String(children).replace(/\n$/, '')
                        return match ? (
                          <CodeBlock language={match[1]}>{content}</CodeBlock>
                        ) : (
                          <code
                            className="px-1.5 py-0.5 rounded bg-white/10 text-[13px] font-mono font-bold"
                            {...props}
                          >
                            {children}
                          </code>
                        )
                      }
                    }}
                  >
                    {message.content}
                  </Markdown>
                </div>
              )}
              {/* Streaming cursor */}
              {isStreaming && !isThinking && message.content && (
                <span className="inline-block w-2 h-5 bg-primary/60 animate-breathing ml-0.5 align-middle rounded-sm shadow-[0_0_8px_rgba(88,101,242,0.4)]" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Metrics & Actions */}
      <div
        className={cn(
          'flex items-center gap-4 mt-2 transition-opacity',
          isUser ? 'mr-2 justify-end' : 'ml-2 justify-start',
          isStreaming ? 'opacity-100' : 'opacity-0 group-hover/bubble:opacity-100'
        )}
      >
        {/* Copy */}
        {!isStreaming && (
          <button
            onClick={handleCopyMessage}
            className="flex items-center gap-1 text-[10px] font-bold text-text-muted hover:text-text transition-colors"
          >
            {msgCopied ? (
              <Check className="w-3 h-3 text-green-500" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
            {msgCopied ? 'Copied' : 'Copy'}
          </button>
        )}

        {/* User edit */}
        {isUser && onEdit && !isStreaming && (
          <button
            onClick={() => {
              setEditText(message.content)
              setEditing(true)
            }}
            className="flex items-center gap-1 text-[10px] font-bold text-text-muted hover:text-text transition-colors"
          >
            <Pencil className="w-3 h-3" />
            Edit
          </button>
        )}

        {/* Assistant metrics */}
        {!isUser && !isStreaming && (
          <>
            {speed && (
              <div
                className="flex items-center gap-1 text-[10px] font-bold text-text-muted"
                title="Generation Speed"
              >
                <Activity className="w-3 h-3" />
                {speed} tok/s
              </div>
            )}
            {ttft && (
              <div
                className="flex items-center gap-1 text-[10px] font-bold text-text-muted"
                title="Time to First Token"
              >
                <Clock className="w-3 h-3" />
                {ttft}ms
              </div>
            )}
            {isLast && onRegenerate && (
              <button
                onClick={onRegenerate}
                className="flex items-center gap-1 text-[10px] font-bold text-text-muted hover:text-primary transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Regenerate
              </button>
            )}
          </>
        )}

        {/* Live metrics during streaming */}
        {!isUser && isStreaming && speed && Number(speed) > 0 && (
          <div className="flex items-center gap-1 text-[10px] font-mono text-text-muted/50 tabular-nums">
            <Activity className="w-3 h-3" />
            {speed} tok/s
          </div>
        )}
      </div>
    </div>
  )
}
