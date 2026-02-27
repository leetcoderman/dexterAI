import { useState, useEffect, useRef, useMemo } from 'react'
import { Wrench, FileCode, FolderSearch, Search, FileEdit, TerminalSquare } from 'lucide-react'
import { cn } from '@dexterai/shared-utils'
import { useAppStore } from '../../store'
import {
  startStreamSession,
  attachView,
  detachView,
  cancelSession,
  getActiveSession
} from '../../store/streaming-manager'
import type { ToolStep } from '../../store/streaming-manager'
import ChatInput from '../chat/ChatInput'
import MessageBubble from '../chat/MessageBubble'
import DiffReview from './DiffReview'
import CommandApproval from './CommandApproval'
import type { ChatMessage } from '@dexterai/registry-types'

interface OpenFile {
  path: string
  name: string
  language: string
  content: string
  originalContent: string
}

interface FileTreeNode {
  name: string
  path: string
  type: 'file' | 'dir'
  children?: FileTreeNode[]
}

interface CodeChatProps {
  rootPath: string
  activeFile: OpenFile | null
  openFiles?: OpenFile[]
  fileTree?: FileTreeNode[]
}

const TOOL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  read_file: FileCode,
  write_file: FileEdit,
  list_directory: FolderSearch,
  search_code: Search,
  execute_command: TerminalSquare
}

function ToolResultCard({ step }: { step: ToolStep }) {
  const [expanded, setExpanded] = useState(false)
  const Icon = TOOL_ICONS[step.toolName] || Wrench
  const preview = step.result.slice(0, 120)

  return (
    <div className="rounded-lg border border-border-subtle bg-elevated/30 overflow-hidden text-[12px]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-3 py-2 hover:bg-elevated/50 transition-colors text-left"
      >
        <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="font-mono font-bold text-text-secondary">{step.toolName}</span>
        <span className="text-text-muted truncate flex-1">
          {step.toolName === 'read_file' || step.toolName === 'write_file'
            ? step.args.path
            : step.toolName === 'search_code'
              ? `"${step.args.pattern}"`
              : step.args.path || ''}
        </span>
        {step.isError && <span className="text-red-400 text-[10px] font-bold">ERROR</span>}
      </button>
      {expanded && (
        <pre className={cn(
          'px-3 py-2 border-t border-border-subtle/50 overflow-x-auto max-h-[200px] overflow-y-auto text-[11px] leading-relaxed font-mono whitespace-pre-wrap',
          step.isError ? 'text-red-400' : 'text-text-secondary'
        )}>
          {step.result}
        </pre>
      )}
      {!expanded && (
        <div className="px-3 pb-2 text-[11px] text-text-muted font-mono truncate">
          {preview}{step.result.length > 120 ? '...' : ''}
        </div>
      )}
    </div>
  )
}

export default function CodeChat({ rootPath, activeFile, openFiles: openFilesProp, fileTree }: CodeChatProps) {
  const {
    allModels,
    loadAllModels,
    connectedProviders,
    connectedModels,
    selectedModelId,
    selectedProviderId,
    setSelectedModel,
    codeConversationId,
    setCodeConversationId
  } = useAppStore()

  // Read streaming session from global manager via Zustand
  const streamSession = useAppStore(
    (s) => codeConversationId ? s.streamingSessions[codeConversationId] : undefined
  )
  const isStreaming = streamSession?.status === 'streaming'
  const toolSteps = streamSession?.toolSteps ?? []
  const pendingApproval = streamSession?.pendingApproval ?? null

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const endOfMessagesRef = useRef<HTMLDivElement>(null)

  // Track props in refs for system prompt building
  const rootPathRef = useRef(rootPath)
  const activeFileRef = useRef(activeFile)
  const openFilesRef = useRef(openFilesProp)
  const fileTreeRef = useRef(fileTree)
  rootPathRef.current = rootPath
  activeFileRef.current = activeFile
  openFilesRef.current = openFilesProp
  fileTreeRef.current = fileTree

  useEffect(() => {
    if (allModels.length === 0) loadAllModels()
  }, [])

  // Load messages when conversation changes
  useEffect(() => {
    if (!codeConversationId) {
      setMessages([])
      return
    }
    window.dexterai.messages.list(codeConversationId).then(setMessages)
  }, [codeConversationId])

  // Attach/detach view for streaming manager
  useEffect(() => {
    if (!codeConversationId) return
    attachView(codeConversationId)
    return () => detachView(codeConversationId)
  }, [codeConversationId])

  // When stream completes, reload messages from DB
  useEffect(() => {
    if (streamSession?.status === 'done' || streamSession?.status === 'error') {
      if (codeConversationId) {
        window.dexterai.messages.list(codeConversationId).then(setMessages)
      }
    }
  }, [streamSession?.status])

  // Merge streaming display text into messages
  const displayMessages = useMemo(() => {
    if (!streamSession || !streamSession.assistantMsgId) return messages
    if (streamSession.status !== 'streaming') return messages

    return messages.map((m) => {
      if (m.id === streamSession.assistantMsgId) {
        return {
          ...m,
          content: streamSession.displayText,
          metadata_json: streamSession.displayMeta || m.metadata_json
        }
      }
      return m
    })
  }, [messages, streamSession?.displayText, streamSession?.displayMeta, streamSession?.assistantMsgId, streamSession?.status])

  // Auto-scroll
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const { scrollHeight, scrollTop, clientHeight } = container
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150

    if (isNearBottom) {
      endOfMessagesRef.current?.scrollIntoView({ behavior: 'auto' })
    }
  }, [displayMessages, toolSteps])

  const buildSystemPrompt = (): string => {
    let prompt = `You are an expert coding assistant with access to tools for reading, writing, searching, and listing files in the user's project at: ${rootPathRef.current}.

Use your tools to explore the codebase before answering questions. When the user asks you to make changes, use write_file to apply them directly. Always read relevant files first to understand context before making modifications.`

    // Inject project structure summary (top-level files/dirs)
    const tree = fileTreeRef.current
    if (tree && tree.length > 0) {
      const summary = tree
        .slice(0, 40)
        .map((n) => `${n.type === 'dir' ? '📁' : '📄'} ${n.name}`)
        .join('\n')
      prompt += `\n\nProject structure (top-level):\n${summary}`
      if (tree.length > 40) prompt += `\n... and ${tree.length - 40} more entries`
    }

    // Inject list of open files
    const allOpen = openFilesRef.current
    if (allOpen && allOpen.length > 0) {
      const openList = allOpen.map((f) => {
        const dirty = f.content !== f.originalContent ? ' (unsaved)' : ''
        return `- ${f.path}${dirty}`
      }).join('\n')
      prompt += `\n\nCurrently open files:\n${openList}`
    }

    // Inject active file content
    const file = activeFileRef.current
    if (file) {
      const preview = file.content.slice(0, 4000)
      prompt += `\n\nThe user is currently viewing: ${file.path}\n\`\`\`${file.language}\n${preview}\n\`\`\``
    }

    return prompt
  }

  const handleSend = async (text: string) => {
    if (!selectedModelId || !selectedProviderId) return

    // Create conversation lazily on first send
    let convId = codeConversationId
    if (!convId) {
      const conv = await window.dexterai.conversations.create(
        'Code Session',
        JSON.stringify({ _isCodeWorkspace: true, projectRoot: rootPath })
      )
      if (!conv) return
      convId = conv.id
      setCodeConversationId(convId)
    }

    // 1. Persist user message
    const userMsg = await window.dexterai.messages.add({
      conversation_id: convId,
      role: 'user',
      content: text
    })
    if (!userMsg) return
    setMessages((prev) => [...prev, userMsg])

    // 2. Create placeholder assistant message
    const assistantMsg = await window.dexterai.messages.add({
      conversation_id: convId,
      role: 'assistant',
      content: '',
      model_id: selectedModelId,
      provider_id: selectedProviderId
    })
    if (!assistantMsg) return
    setMessages((prev) => [...prev, assistantMsg])

    // 3. Register with streaming manager
    const reqId = `agent_${Date.now()}`
    startStreamSession({
      requestId: reqId,
      conversationId: convId,
      assistantMsgId: assistantMsg.id,
      type: 'agent',
      modelId: selectedModelId,
      providerId: selectedProviderId
    })

    // 4. Build context messages
    const allMsgs = [...messages, userMsg]
    const contextMessages = [
      { role: 'system', content: buildSystemPrompt() },
      ...allMsgs.map((m) => ({ role: m.role, content: m.content }))
    ]

    // 5. Send to agent backend (multi-turn tool loop)
    try {
      await window.dexterai.agent.send({
        conversationId: convId,
        requestId: reqId,
        modelId: selectedModelId,
        providerId: selectedProviderId,
        messages: contextMessages,
        params: {},
        projectRoot: rootPath
      })
    } catch (e: any) {
      const errorText = `[Error: ${e.message}]`
      window.dexterai.messages.update(assistantMsg.id, { content: errorText })
      cancelSession(convId)
      setMessages((prev) =>
        prev.map((m) => m.id === assistantMsg.id ? { ...m, content: errorText } : m)
      )
    }
  }

  const handleStop = async () => {
    if (!codeConversationId) return
    const session = getActiveSession(codeConversationId)
    if (!session) return

    await window.dexterai.agent.cancel(session.requestId)
    cancelSession(codeConversationId)
  }

  const handleApprove = async () => {
    if (!pendingApproval) return
    await window.dexterai.agent.approve(pendingApproval.approvalId)
    // Manager will clear pendingApproval when next tool-result arrives
  }

  const handleReject = async () => {
    if (!pendingApproval) return
    await window.dexterai.agent.reject(pendingApproval.approvalId)
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border-subtle shrink-0">
        <Wrench className="w-3.5 h-3.5 text-primary" />
        <span className="text-[11px] font-bold text-text-muted uppercase tracking-widest">
          Agent Chat
        </span>
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {displayMessages.filter((m) => m.role !== 'system').length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-text-muted space-y-2 py-8">
            <Wrench className="w-8 h-8 opacity-30" />
            <p className="text-sm font-medium">Agentic coding assistant</p>
            <p className="text-xs opacity-60 max-w-[200px]">
              Ask questions or request changes — the agent can read, write, and search your codebase
            </p>
          </div>
        ) : (
          displayMessages.map((m, i) => (
            <MessageBubble
              key={m.id}
              message={m}
              isStreaming={isStreaming && m.id === streamSession?.assistantMsgId}
              isLast={i === displayMessages.length - 1}
            />
          ))
        )}

        {/* Tool steps (shown during streaming) */}
        {toolSteps.length > 0 && (
          <div className="space-y-2 ml-1">
            {toolSteps.map((step, i) => (
              <ToolResultCard key={i} step={step} />
            ))}
          </div>
        )}

        {/* Pending approval */}
        {pendingApproval && (
          <div className="ml-1">
            {pendingApproval.approvalType === 'command' ? (
              <CommandApproval
                command={pendingApproval.command || ''}
                cwd={pendingApproval.cwd || rootPath}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ) : (
              <DiffReview
                filePath={pendingApproval.filePath || ''}
                oldContent={pendingApproval.oldContent || ''}
                newContent={pendingApproval.newContent || ''}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            )}
          </div>
        )}

        <div ref={endOfMessagesRef} />
      </div>

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        onStop={handleStop}
        isStreaming={isStreaming}
        models={allModels}
        selectedModelId={selectedModelId}
        selectedProviderId={selectedProviderId}
        connectedProviders={connectedProviders}
        connectedModels={connectedModels}
        onModelChange={setSelectedModel}
        agentMode={true}
      />
    </div>
  )
}
