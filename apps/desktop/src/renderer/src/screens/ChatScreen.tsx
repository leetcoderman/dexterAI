import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAppStore } from '../store'
import { startStreamSession, attachView, detachView, cancelSession, getActiveSession } from '../store/streaming-manager'
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
    connectedModels,
    selectedModelId,
    selectedProviderId,
    setSelectedModel,
    loadConversations,
    isChatSettingsOpen,
    setIsChatSettingsOpen
  } = useAppStore()

  // Read streaming session from global manager via Zustand
  const streamSession = useAppStore(
    (s) => conversationId ? s.streamingSessions[conversationId] : undefined
  )
  const isStreaming = streamSession?.status === 'streaming'

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<ConversationSettings>({})

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
      const parsed = conv?.settings_json ? JSON.parse(conv.settings_json) : {}
      setSettings(parsed)
      settingsRef.current = parsed
      setLoading(false)
    })
  }, [conversationId])

  // Attach/detach view for streaming manager
  useEffect(() => {
    if (!conversationId) return
    attachView(conversationId)
    return () => detachView(conversationId)
  }, [conversationId])

  // When stream completes (status goes to 'done' or 'error'), reload messages from DB
  // so the final persisted content replaces the live display
  useEffect(() => {
    if (streamSession?.status === 'done' || streamSession?.status === 'error') {
      if (conversationId) {
        window.dexterai.messages.list(conversationId).then(setMessages)
      }
    }
  }, [streamSession?.status])

  // Merge streaming display text into messages for rendering
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
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [displayMessages])

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

    // 3. Register with streaming manager
    const reqId = `chat_${Date.now()}`
    startStreamSession({
      requestId: reqId,
      conversationId,
      assistantMsgId: assistantMsg.id,
      type: 'chat',
      modelId: selectedModelId,
      providerId: selectedProviderId
    })

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
      // Error will be handled by the streaming manager's chat:error listener
      // But if the IPC invoke itself throws (not adapter error), handle it:
      const errorText = `[Error: ${e.message}]`
      if (assistantMsg) {
        window.dexterai.messages.update(assistantMsg.id, { content: errorText })
      }
      cancelSession(conversationId)
      setMessages((prev) =>
        prev.map((m) => m.id === assistantMsg.id ? { ...m, content: errorText } : m)
      )
    }

    // Refresh sidebar conversation list
    loadConversations()
  }

  const handleStop = async () => {
    if (!conversationId) return
    const session = getActiveSession(conversationId)
    if (!session) return

    await window.dexterai.chat.cancel(session.requestId)
    cancelSession(conversationId)
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
        setIsChatSettingsOpen(!isChatSettingsOpen)
      }
      if (e.key === 'Escape') {
        setIsChatSettingsOpen(false)
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
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {displayMessages.filter((m) => m.role !== 'system').length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 space-y-3 py-16">
            <p className="text-lg font-medium">Start a conversation</p>
            <p className="text-sm">Select a model below and type your message.</p>
          </div>
        ) : (
          displayMessages.map((m, i) => (
            <MessageBubble
              key={m.id}
              message={m}
              isStreaming={isStreaming && m.id === streamSession?.assistantMsgId}
              isLast={i === displayMessages.length - 1}
              onRegenerate={m.role === 'assistant' && i === displayMessages.length - 1 ? handleRegenerate : undefined}
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
        connectedModels={connectedModels}
        onModelChange={setSelectedModel}
      />

      {/* Settings Drawer */}
      {conversationId && (
        <SettingsDrawer
          open={isChatSettingsOpen}
          onClose={() => setIsChatSettingsOpen(false)}
          conversationId={conversationId}
          settings={settings}
          onSave={handleSettingsSave}
        />
      )}
    </div>
  )
}
