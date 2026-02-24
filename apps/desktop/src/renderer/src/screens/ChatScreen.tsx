import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Loader2, Settings2 } from 'lucide-react'
import { useAppStore } from '../store'
import ChatInput from '../components/chat/ChatInput'
import MessageBubble from '../components/chat/MessageBubble'
import SettingsDrawer from '../components/chat/SettingsDrawer'
import type { ChatMessage, ConversationSettings } from '@dexterai/registry-types'

export default function ChatScreen() {
  const { conversationId } = useParams<{ conversationId: string }>()

  const {
    allModels,
    loadAllModels,
    connectedProviders,
    selectedModelId,
    selectedProviderId,
    setSelectedModel,
    loadConversations
  } = useAppStore()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState<string | null>(null)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [settings, setSettings] = useState<ConversationSettings>({})

  const requestIdRef = useRef<string | null>(null)
  const assistantMsgIdRef = useRef<string | null>(null)
  const accumulatedTextRef = useRef('')
  const endOfMessagesRef = useRef<HTMLDivElement>(null)
  const settingsRef = useRef<ConversationSettings>({})

  // Load models once
  useEffect(() => {
    if (allModels.length === 0) loadAllModels()
  }, [])

  // Load conversation messages
  useEffect(() => {
    if (!conversationId) return
    setLoading(true)
    Promise.all([
      window.dexterai.messages.list(conversationId),
      window.dexterai.conversations.get(conversationId)
    ]).then(([msgs, conv]) => {
      setMessages(msgs)
      setTitle(conv?.title || null)
      const parsed = conv?.settings_json ? JSON.parse(conv.settings_json) : {}
      setSettings(parsed)
      settingsRef.current = parsed
      setLoading(false)
    })
  }, [conversationId])

  // Auto-scroll
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // IPC subscriptions — ref-based, registered once
  useEffect(() => {
    const unsubChunk = window.dexterai.on('chat:chunk', (data) => {
      if (data.requestId !== requestIdRef.current) return
      accumulatedTextRef.current += data.text ?? ''
      const text = accumulatedTextRef.current
      setMessages((prev) => {
        const next = [...prev]
        const idx = next.findIndex((m) => m.id === assistantMsgIdRef.current)
        if (idx !== -1) {
          next[idx] = { ...next[idx], content: text }
        }
        return next
      })
    })

    const unsubDone = window.dexterai.on('chat:done', (data) => {
      if (data.requestId !== requestIdRef.current) return
      const msgId = assistantMsgIdRef.current
      const finalText = accumulatedTextRef.current

      // Persist final content to DB
      if (msgId) {
        window.dexterai.messages.update(msgId, {
          content: finalText,
          token_count: data.completionTokens || 0,
          metadata_json: JSON.stringify({
            ttft: data.ttft,
            totalTime: data.totalTime,
            promptTokens: data.promptTokens,
            completionTokens: data.completionTokens,
            finishReason: data.finishReason
          })
        })
      }

      requestIdRef.current = null
      assistantMsgIdRef.current = null
      accumulatedTextRef.current = ''
      setIsStreaming(false)
    })

    const unsubError = window.dexterai.on('chat:error', (data) => {
      if (data.requestId !== requestIdRef.current) return
      const msgId = assistantMsgIdRef.current
      const errorText = accumulatedTextRef.current
        ? accumulatedTextRef.current + `\n\n[Error: ${data.message}]`
        : `[Error: ${data.message}]`

      setMessages((prev) => {
        const next = [...prev]
        const idx = next.findIndex((m) => m.id === msgId)
        if (idx !== -1) {
          next[idx] = { ...next[idx], content: errorText }
        }
        return next
      })

      if (msgId) {
        window.dexterai.messages.update(msgId, { content: errorText })
      }

      requestIdRef.current = null
      assistantMsgIdRef.current = null
      accumulatedTextRef.current = ''
      setIsStreaming(false)
    })

    const unsubTitle = window.dexterai.on('chat:title-updated', (data) => {
      if (data.conversationId === conversationId) {
        setTitle(data.title)
        loadConversations()
      }
    })

    return () => {
      unsubChunk()
      unsubDone()
      unsubError()
      unsubTitle()
    }
  }, [])

  const handleSend = async (text: string) => {
    if (!conversationId || !selectedModelId || !selectedProviderId) return

    // 1. Persist user message
    const userMsg = await window.dexterai.messages.add({
      conversation_id: conversationId,
      role: 'user',
      content: text
    })
    if (!userMsg) return
    setMessages((prev) => [...prev, userMsg])

    // 2. Create placeholder assistant message
    const assistantMsg = await window.dexterai.messages.add({
      conversation_id: conversationId,
      role: 'assistant',
      content: '',
      model_id: selectedModelId,
      provider_id: selectedProviderId
    })
    if (!assistantMsg) return
    setMessages((prev) => [...prev, assistantMsg])

    // 3. Set refs synchronously
    const reqId = `chat_${Date.now()}`
    requestIdRef.current = reqId
    assistantMsgIdRef.current = assistantMsg.id
    accumulatedTextRef.current = ''
    setIsStreaming(true)

    // 4. Build message history for context
    const allMsgs = [...messages, userMsg]
    const s = settingsRef.current
    const contextMessages = [
      ...(s.systemPrompt ? [{ role: 'system', content: s.systemPrompt }] : []),
      ...allMsgs.map((m) => ({ role: m.role, content: m.content }))
    ]

    // 5. Send to backend
    try {
      await window.dexterai.chat.send({
        conversationId,
        requestId: reqId,
        modelId: selectedModelId,
        providerId: selectedProviderId,
        messages: contextMessages,
        params: {
          temperature: s.temperature,
          maxTokens: s.maxTokens
        }
      })
    } catch (e: any) {
      if (requestIdRef.current === reqId) {
        const errorText = `[Error: ${e.message}]`
        setMessages((prev) => {
          const next = [...prev]
          const idx = next.findIndex((m) => m.id === assistantMsg.id)
          if (idx !== -1) next[idx] = { ...next[idx], content: errorText }
          return next
        })
        window.dexterai.messages.update(assistantMsg.id, { content: errorText })
        requestIdRef.current = null
        assistantMsgIdRef.current = null
        accumulatedTextRef.current = ''
        setIsStreaming(false)
      }
    }

    // Refresh sidebar conversation list
    loadConversations()
  }

  const handleStop = async () => {
    if (requestIdRef.current) {
      await window.dexterai.chat.cancel(requestIdRef.current)
      // Persist partial content
      if (assistantMsgIdRef.current && accumulatedTextRef.current) {
        await window.dexterai.messages.update(assistantMsgIdRef.current, {
          content: accumulatedTextRef.current
        })
      }
      requestIdRef.current = null
      assistantMsgIdRef.current = null
      accumulatedTextRef.current = ''
      setIsStreaming(false)
    }
  }

  const handleTitleClick = () => {
    setEditTitle(title || '')
    setIsEditingTitle(true)
  }

  const handleTitleSave = async () => {
    setIsEditingTitle(false)
    const newTitle = editTitle.trim() || null
    if (newTitle !== title && conversationId) {
      setTitle(newTitle)
      await window.dexterai.conversations.update(conversationId, { title: newTitle || undefined })
      loadConversations()
    }
  }

  const handleSettingsSave = (s: ConversationSettings) => {
    setSettings(s)
    settingsRef.current = s
  }

  const handleRegenerate = async () => {
    if (!conversationId || !selectedModelId || !selectedProviderId || isStreaming) return
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')
    if (!lastAssistant || !lastUser) return

    // Delete last assistant message
    await window.dexterai.messages.delete(lastAssistant.id)
    setMessages((prev) => prev.filter((m) => m.id !== lastAssistant.id))

    // Re-send with last user message
    await handleSend(lastUser.content)
  }

  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!conversationId || !selectedModelId || !selectedProviderId || isStreaming) return

    // Delete this message and all after it
    const idx = messages.findIndex((m) => m.id === messageId)
    if (idx === -1) return
    const toDelete = messages.slice(idx)
    for (const m of toDelete) {
      await window.dexterai.messages.delete(m.id)
    }
    setMessages((prev) => prev.slice(0, idx))

    // Re-send with edited content
    await handleSend(newContent)
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 's') {
        e.preventDefault()
        setDrawerOpen((v) => !v)
      }
      if (e.key === 'Escape') {
        setDrawerOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="px-6 py-3 border-b border-border bg-background shrink-0 flex items-center justify-between">
        {isEditingTitle ? (
          <input
            autoFocus
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTitleSave()
              if (e.key === 'Escape') setIsEditingTitle(false)
            }}
            className="text-sm font-semibold text-text bg-transparent border-b border-primary outline-none flex-1 mr-2"
          />
        ) : (
          <h2
            onClick={handleTitleClick}
            className="text-sm font-semibold text-text truncate cursor-pointer hover:text-primary transition-colors"
            title="Click to rename"
          >
            {title || 'New Conversation'}
          </h2>
        )}
        <button
          onClick={() => setDrawerOpen(!drawerOpen)}
          className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          title="Chat settings"
        >
          <Settings2 className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.filter((m) => m.role !== 'system').length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 space-y-3 py-16">
            <p className="text-lg font-medium">Start a conversation</p>
            <p className="text-sm">Select a model below and type your message.</p>
          </div>
        ) : (
          messages.map((m, i) => (
            <MessageBubble
              key={m.id}
              message={m}
              isStreaming={isStreaming && m.id === assistantMsgIdRef.current}
              isLast={i === messages.length - 1}
              onRegenerate={m.role === 'assistant' && i === messages.length - 1 ? handleRegenerate : undefined}
              onEdit={m.role === 'user' ? handleEditMessage : undefined}
            />
          ))
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
        onModelChange={setSelectedModel}
      />

      {/* Settings Drawer */}
      {conversationId && (
        <SettingsDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          conversationId={conversationId}
          settings={settings}
          onSave={handleSettingsSave}
        />
      )}
    </div>
  )
}
