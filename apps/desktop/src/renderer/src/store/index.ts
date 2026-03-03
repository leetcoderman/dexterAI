import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  ConversationSummary,
  RegistryModel,
  AgentApprovalRequest
} from '@dexterai/registry-types'
import type { ToolStep } from './streaming-manager'

export interface StreamSessionView {
  conversationId: string
  assistantMsgId: string
  status: 'streaming' | 'done' | 'error'
  displayText: string
  displayThought: string
  displayMeta: string
  toolSteps: ToolStep[]
  pendingApproval: AgentApprovalRequest | null
  isToolProcessing?: boolean
}

interface FileTreeNode {
  name: string
  path: string
  type: 'file' | 'dir'
  children?: FileTreeNode[]
}

interface OpenFile {
  path: string
  name: string
  language: string
  content: string
  originalContent: string
}

interface AppState {
  isOnboarded: boolean
  connectedProviders: string[]
  connectedModels: string[]
  modelsByProvider: Record<string, string[]>
  setOnboarded: (status: boolean) => void
  setConnectedProviders: (providers: string[]) => void
  setConnectedModels: (models: string[]) => void
  addConnectedProvider: (providerId: string) => void
  removeConnectedProvider: (providerId: string) => void
  syncConnectedProviders: () => Promise<void>

  // v2: Conversations
  activeConversationId: string | null
  setActiveConversation: (id: string | null) => void
  conversations: ConversationSummary[]
  loadConversations: () => Promise<void>

  // v2: Model selection
  allModels: RegistryModel[]
  loadAllModels: () => Promise<void>
  selectedModelId: string | null
  selectedProviderId: string | null
  setSelectedModel: (modelId: string | null, providerId: string | null) => void

  // UI state
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  zoomLevel: number
  setZoomLevel: (level: number) => void
  sidebarWidth: number
  setSidebarWidth: (width: number) => void

  // AI Defaults
  defaultSystemPrompt: string
  setDefaultSystemPrompt: (prompt: string) => void
  defaultTemperature: number
  setDefaultTemperature: (temp: number) => void
  preferredModelId: string | null
  preferredProviderId: string | null
  setPreferredModel: (modelId: string | null, providerId: string | null) => void

  // Experimental Features
  showExperimentalFeatures: boolean
  setShowExperimentalFeatures: (show: boolean) => void

  // Project filesystem
  projectRoot: string | null
  setProjectRoot: (root: string | null) => void

  // Chat Local UI
  isChatSettingsOpen: boolean
  setIsChatSettingsOpen: (open: boolean) => void

  // Streaming sessions (transient — not persisted)
  streamingSessions: Record<string, StreamSessionView>
  setStreamSession: (conversationId: string, session: StreamSessionView) => void
  updateStreamSession: (conversationId: string, partial: Partial<StreamSessionView>) => void
  removeStreamSession: (conversationId: string) => void

  // Code workspace (transient — not persisted except projectRoot)
  openFiles: OpenFile[]
  activeFileIndex: number
  codeConversationId: string | null
  fileTree: FileTreeNode[]
  setOpenFiles: (files: OpenFile[]) => void
  setActiveFileIndex: (index: number) => void
  setCodeConversationId: (id: string | null) => void
  setFileTree: (tree: FileTreeNode[]) => void
  openFile: (path: string, name: string, content: string, language: string) => void
  closeFile: (index: number) => void
  updateFileContent: (index: number, content: string) => void
  markFileSaved: (index: number) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      isOnboarded: false,
      connectedProviders: [],
      connectedModels: [],
      modelsByProvider: {},
      setOnboarded: (status) => set({ isOnboarded: status }),
      setConnectedProviders: (providers) => set({ connectedProviders: providers }),
      setConnectedModels: (models) => set({ connectedModels: models }),
      addConnectedProvider: (providerId) =>
        set((state) => ({
          connectedProviders: state.connectedProviders.includes(providerId)
            ? state.connectedProviders
            : [...state.connectedProviders, providerId]
        })),
      removeConnectedProvider: (providerId) =>
        set((state) => ({
          connectedProviders: state.connectedProviders.filter((id) => id !== providerId)
        })),
      syncConnectedProviders: async () => {
        try {
          const result = await window.dexterai.credentials.listConnected()
          set({
            connectedProviders: result.providers,
            connectedModels: result.models,
            modelsByProvider: result.modelsByProvider || {}
          })
        } catch (e) {
          console.error('Failed to sync connected providers from DB:', e)
        }
      },

      // v2: Conversations
      activeConversationId: null,
      setActiveConversation: (id) => set({ activeConversationId: id }),
      conversations: [],
      loadConversations: async () => {
        try {
          const conversations = await window.dexterai.conversations.list()
          set({ conversations })
        } catch (e) {
          console.error('Failed to load conversations:', e)
        }
      },

      // v2: Model selection
      allModels: [],
      loadAllModels: async () => {
        try {
          const allModels = await window.dexterai.registry.getModels()
          set({ allModels })
        } catch (e) {
          console.error('Failed to load models:', e)
        }
      },
      selectedModelId: null,
      selectedProviderId: null,
      setSelectedModel: (modelId, providerId) =>
        set({ selectedModelId: modelId, selectedProviderId: providerId }),

      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      zoomLevel: 100,
      setZoomLevel: (level) => set({ zoomLevel: level }),
      sidebarWidth: 20, // percentage
      setSidebarWidth: (width) => set({ sidebarWidth: width }),

      defaultSystemPrompt: 'You are a helpful AI assistant.',
      setDefaultSystemPrompt: (prompt) => set({ defaultSystemPrompt: prompt }),
      defaultTemperature: 0.7,
      setDefaultTemperature: (temp) => set({ defaultTemperature: temp }),
      preferredModelId: null,
      preferredProviderId: null,
      setPreferredModel: (modelId, providerId) =>
        set({ preferredModelId: modelId, preferredProviderId: providerId }),

      showExperimentalFeatures: false,
      setShowExperimentalFeatures: (show) => set({ showExperimentalFeatures: show }),

      projectRoot: null,
      setProjectRoot: (root) => set({ projectRoot: root }),

      isChatSettingsOpen: false,
      setIsChatSettingsOpen: (open) => set({ isChatSettingsOpen: open }),

      // Streaming sessions
      streamingSessions: {},
      setStreamSession: (conversationId, session) =>
        set((state) => ({
          streamingSessions: { ...state.streamingSessions, [conversationId]: session }
        })),
      updateStreamSession: (conversationId, partial) =>
        set((state) => {
          const existing = state.streamingSessions[conversationId]
          if (!existing) return {}
          return {
            streamingSessions: {
              ...state.streamingSessions,
              [conversationId]: { ...existing, ...partial }
            }
          }
        }),
      removeStreamSession: (conversationId) =>
        set((state) => {
          const next = { ...state.streamingSessions }
          delete next[conversationId]
          return { streamingSessions: next }
        }),

      // Code workspace
      openFiles: [],
      activeFileIndex: -1,
      codeConversationId: null,
      fileTree: [],
      setOpenFiles: (files) => set({ openFiles: files }),
      setActiveFileIndex: (index) => set({ activeFileIndex: index }),
      setCodeConversationId: (id) => set({ codeConversationId: id }),
      setFileTree: (tree) => set({ fileTree: tree }),
      openFile: (path, name, content, language) =>
        set((state) => {
          const existing = state.openFiles.findIndex((f) => f.path === path)
          if (existing !== -1) return { activeFileIndex: existing }
          const file: OpenFile = { path, name, language, content, originalContent: content }
          return {
            openFiles: [...state.openFiles, file],
            activeFileIndex: state.openFiles.length
          }
        }),
      closeFile: (index) =>
        set((state) => {
          const next = state.openFiles.filter((_, i) => i !== index)
          let nextIndex = state.activeFileIndex
          if (next.length === 0) {
            nextIndex = -1
          } else if (index <= state.activeFileIndex) {
            nextIndex = Math.max(0, state.activeFileIndex - 1)
          }
          return { openFiles: next, activeFileIndex: nextIndex }
        }),
      updateFileContent: (index, content) =>
        set((state) => {
          const next = [...state.openFiles]
          if (next[index]) next[index] = { ...next[index], content }
          return { openFiles: next }
        }),
      markFileSaved: (index) =>
        set((state) => {
          const next = [...state.openFiles]
          if (next[index]) next[index] = { ...next[index], originalContent: next[index].content }
          return { openFiles: next }
        })
    }),
    {
      name: 'dexterai-storage',
      partialize: (state) => ({
        isOnboarded: state.isOnboarded,
        connectedProviders: state.connectedProviders,
        connectedModels: state.connectedModels,
        modelsByProvider: state.modelsByProvider,
        selectedModelId: state.selectedModelId,
        selectedProviderId: state.selectedProviderId,
        sidebarCollapsed: state.sidebarCollapsed,
        zoomLevel: state.zoomLevel,
        projectRoot: state.projectRoot,
        codeConversationId: state.codeConversationId,
        defaultSystemPrompt: state.defaultSystemPrompt,
        defaultTemperature: state.defaultTemperature,
        preferredModelId: state.preferredModelId,
        preferredProviderId: state.preferredProviderId,
        showExperimentalFeatures: state.showExperimentalFeatures,
        sidebarWidth: state.sidebarWidth
      })
    }
  )
)
