import { useAppStore } from './index'
import type {
  StreamChunk,
  EvaluationMetrics,
  ProviderError,
  AgentToolEvent,
  AgentApprovalRequest
} from '@dexterai/registry-types'

export interface ToolStep {
  toolName: string
  args: Record<string, any>
  result: string
  isError?: boolean
}

export interface StreamingSession {
  requestId: string
  conversationId: string
  assistantMsgId: string
  type: 'chat' | 'agent'
  modelId: string
  providerId: string
  accumulatedText: string
  accumulatedThought: string
  textBuffer: string
  thoughtBuffer: string
  startTime: number
  firstChunkTime: number
  status: 'streaming' | 'done' | 'error'
  isViewAttached: boolean
  metrics: EvaluationMetrics | null
  errorMessage: string | null
  toolSteps: ToolStep[]
  pendingApproval: AgentApprovalRequest | null
  isToolProcessing: boolean
}

// Internal maps — the source of truth for in-flight sessions
const sessionsByRequestId = new Map<string, StreamingSession>()
const requestIdByConversation = new Map<string, string>()

let initialized = false
let drainInterval: ReturnType<typeof setInterval> | null = null

function getSession(requestId: string): StreamingSession | undefined {
  return sessionsByRequestId.get(requestId)
}

function syncToStore(session: StreamingSession) {
  const store = useAppStore.getState()
  const elapsed = (Date.now() - session.startTime) / 1000
  const tokensPerSec = elapsed > 0 ? session.accumulatedText.length / 4 / elapsed : 0
  const hasFirstChunk = session.firstChunkTime > 0
  const waitingTime = Date.now() - session.startTime
  const isWaiting = !hasFirstChunk && waitingTime > 800
  const isSlow = hasFirstChunk && waitingTime / (session.accumulatedText.length || 1) > 0.5
  const isThinking =
    session.accumulatedThought.length > 0 &&
    session.textBuffer.length === 0 &&
    session.accumulatedText.length === 0

  store.updateStreamSession(session.conversationId, {
    conversationId: session.conversationId,
    assistantMsgId: session.assistantMsgId,
    status: session.status,
    displayText: session.accumulatedText,
    displayThought: session.accumulatedThought,
    displayMeta: JSON.stringify({
      thought: session.accumulatedThought,
      speed: tokensPerSec.toFixed(1),
      ttft: session.firstChunkTime ? session.firstChunkTime - session.startTime : null,
      isThinking,
      isWaiting,
      isSlow
    }),
    toolSteps: session.toolSteps,
    pendingApproval: session.pendingApproval,
    isToolProcessing: session.isToolProcessing
  })
}

function removeSession(session: StreamingSession) {
  sessionsByRequestId.delete(session.requestId)
  requestIdByConversation.delete(session.conversationId)
  useAppStore.getState().removeStreamSession(session.conversationId)
}

function persistFinalMessage(session: StreamingSession, metrics?: EvaluationMetrics) {
  const finalText = session.accumulatedText
  const finalThought = session.accumulatedThought

  if (!session.assistantMsgId) return

  if (metrics) {
    const metadata = {
      ttft: metrics.ttft,
      totalTime: metrics.totalTime,
      promptTokens: metrics.promptTokens,
      completionTokens: metrics.completionTokens,
      finishReason: metrics.finishReason,
      resolvedModel: metrics.resolvedModel,
      thought: finalThought
    }
    window.dexterai.messages.update(session.assistantMsgId, {
      content: finalText,
      token_count: metrics.completionTokens || 0,
      metadata_json: JSON.stringify(metadata)
    })
  } else {
    // Error or cancel — persist partial content
    if (finalText) {
      window.dexterai.messages.update(session.assistantMsgId, {
        content: finalText
      })
    }
  }
}

// --- Drain loop (one global 25ms interval) ---

function drainTick() {
  for (const session of sessionsByRequestId.values()) {
    if (!session.isViewAttached || session.status !== 'streaming') continue

    const textToDrain = session.textBuffer.slice(0, 8)
    const thoughtToDrain = session.thoughtBuffer.slice(0, 12)

    const now = Date.now()
    const hasFirstChunk = session.firstChunkTime > 0
    const waitingTime = now - session.startTime
    const isWaiting = !hasFirstChunk && waitingTime > 800
    const isSlow = hasFirstChunk && waitingTime / (session.accumulatedText.length || 1) > 0.5

    if (textToDrain || thoughtToDrain || isWaiting || isSlow) {
      session.textBuffer = session.textBuffer.slice(textToDrain.length)
      session.thoughtBuffer = session.thoughtBuffer.slice(thoughtToDrain.length)
      session.accumulatedText += textToDrain
      session.accumulatedThought += thoughtToDrain

      syncToStore(session)
    }
  }
}

// --- Public API ---

export function startStreamSession(opts: {
  requestId: string
  conversationId: string
  assistantMsgId: string
  type: 'chat' | 'agent'
  modelId: string
  providerId: string
}) {
  // Clean up any existing session for this conversation
  const existingReqId = requestIdByConversation.get(opts.conversationId)
  if (existingReqId) {
    sessionsByRequestId.delete(existingReqId)
  }

  const session: StreamingSession = {
    ...opts,
    accumulatedText: '',
    accumulatedThought: '',
    textBuffer: '',
    thoughtBuffer: '',
    startTime: Date.now(),
    firstChunkTime: 0,
    status: 'streaming',
    isViewAttached: true, // caller is always mounted when starting
    metrics: null,
    errorMessage: null,
    toolSteps: [],
    pendingApproval: null,
    isToolProcessing: false
  }

  sessionsByRequestId.set(opts.requestId, session)
  requestIdByConversation.set(opts.conversationId, opts.requestId)

  useAppStore.getState().setStreamSession(opts.conversationId, {
    conversationId: opts.conversationId,
    assistantMsgId: opts.assistantMsgId,
    status: 'streaming',
    displayText: '',
    displayThought: '',
    displayMeta: '{}',
    toolSteps: [],
    pendingApproval: null,
    isToolProcessing: false
  })
}

export function attachView(conversationId: string) {
  const reqId = requestIdByConversation.get(conversationId)
  if (!reqId) return
  const session = sessionsByRequestId.get(reqId)
  if (!session) return

  session.isViewAttached = true

  // Move any accumulated text (from background) into display immediately
  // by syncing current state to store
  syncToStore(session)
}

export function detachView(conversationId: string) {
  const reqId = requestIdByConversation.get(conversationId)
  if (!reqId) return
  const session = sessionsByRequestId.get(reqId)
  if (!session) return

  // Flush any remaining buffer into accumulated before detaching
  session.accumulatedText += session.textBuffer
  session.accumulatedThought += session.thoughtBuffer
  session.textBuffer = ''
  session.thoughtBuffer = ''

  session.isViewAttached = false
}

export function getActiveSession(conversationId: string): StreamingSession | null {
  const reqId = requestIdByConversation.get(conversationId)
  if (!reqId) return null
  return sessionsByRequestId.get(reqId) || null
}

export function approveToolAction(conversationId: string) {
  const reqId = requestIdByConversation.get(conversationId)
  if (!reqId) return
  const session = sessionsByRequestId.get(reqId)
  if (!session) return

  session.pendingApproval = null
  session.isToolProcessing = true
  syncToStore(session)
}

export function rejectToolAction(conversationId: string) {
  const reqId = requestIdByConversation.get(conversationId)
  if (!reqId) return
  const session = sessionsByRequestId.get(reqId)
  if (!session) return

  session.pendingApproval = null
  session.isToolProcessing = true
  syncToStore(session)
}

export function cancelSession(conversationId: string) {
  const reqId = requestIdByConversation.get(conversationId)
  if (!reqId) return
  const session = sessionsByRequestId.get(reqId)
  if (!session) return

  // Flush buffers
  session.accumulatedText += session.textBuffer
  session.accumulatedThought += session.thoughtBuffer
  session.textBuffer = ''
  session.thoughtBuffer = ''

  persistFinalMessage(session)
  removeSession(session)
}

// --- Initialization (called once from App.tsx) ---

export function initStreamingManager(): () => void {
  if (initialized) return () => {}
  initialized = true

  // Start drain loop
  drainInterval = setInterval(drainTick, 25)

  // --- IPC listeners ---

  const unsubChunk = window.dexterai.on('chat:chunk', (data: StreamChunk) => {
    const session = getSession(data.requestId)
    if (!session) return

    // Model is generating again — clear processing state
    session.isToolProcessing = false

    if (!session.firstChunkTime) {
      session.firstChunkTime = Date.now()
    }

    if (session.isViewAttached) {
      // Buffer for 40fps drain
      if (data.text) session.textBuffer += data.text
      if (data.thought) session.thoughtBuffer += data.thought
    } else {
      // No view — accumulate directly (no smoothing needed)
      if (data.text) session.accumulatedText += data.text
      if (data.thought) session.accumulatedThought += data.thought
    }
  })

  const unsubDone = window.dexterai.on('chat:done', (data: EvaluationMetrics) => {
    const session = getSession(data.requestId)
    if (!session) return

    // Flush buffers
    session.accumulatedText += session.textBuffer
    session.accumulatedThought += session.thoughtBuffer
    session.textBuffer = ''
    session.thoughtBuffer = ''
    session.status = 'done'
    session.metrics = data

    // Persist to DB
    persistFinalMessage(session, data)

    // Sync final state to store
    syncToStore(session)

    // Clean up after a short delay so the view can read final state
    setTimeout(() => removeSession(session), 1000)
  })

  const unsubError = window.dexterai.on('chat:error', (data: ProviderError) => {
    const session = getSession(data.requestId)
    if (!session) return

    // Flush buffers
    session.accumulatedText += session.textBuffer
    session.accumulatedThought += session.thoughtBuffer
    session.textBuffer = ''
    session.thoughtBuffer = ''

    // Append error to accumulated text
    session.accumulatedText = session.accumulatedText
      ? session.accumulatedText + `\n\n[Error: ${data.message}]`
      : `[Error: ${data.message}]`
    session.status = 'error'
    session.errorMessage = data.message

    // Persist error content
    persistFinalMessage(session)

    syncToStore(session)
    setTimeout(() => removeSession(session), 1000)
  })

  const unsubTitle = window.dexterai.on('chat:title-updated', () => {
    useAppStore.getState().loadConversations()
  })

  const unsubToolResult = window.dexterai.on('agent:tool-result', (data: AgentToolEvent) => {
    const session = getSession(data.requestId)
    if (!session) return

    // Clear pending approval and processing state — tool executed (or was rejected)
    session.pendingApproval = null
    session.isToolProcessing = false

    session.toolSteps = [
      ...session.toolSteps,
      {
        toolName: data.toolCall.name,
        args: data.toolCall.arguments,
        result: data.result.result,
        isError: data.result.isError
      }
    ]

    if (session.isViewAttached) {
      syncToStore(session)
    }
  })

  const unsubApproval = window.dexterai.on(
    'agent:approval-required',
    (data: AgentApprovalRequest) => {
      const session = getSession(data.requestId)
      if (!session) return

      session.pendingApproval = data

      if (session.isViewAttached) {
        syncToStore(session)
      }
    }
  )

  return () => {
    if (drainInterval) clearInterval(drainInterval)
    unsubChunk()
    unsubDone()
    unsubError()
    unsubTitle()
    unsubToolResult()
    unsubApproval()
    initialized = false
  }
}
