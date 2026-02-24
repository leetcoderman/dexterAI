import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ConversationSummary, RegistryModel } from '@dexterai/registry-types'

interface AppState {
  isOnboarded: boolean
  connectedProviders: string[]
  setOnboarded: (status: boolean) => void
  setConnectedProviders: (providers: string[]) => void
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
  setSelectedModel: (modelId: string, providerId: string) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      isOnboarded: false,
      connectedProviders: [],
      setOnboarded: (status) => set({ isOnboarded: status }),
      setConnectedProviders: (providers) => set({ connectedProviders: providers }),
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
          const providers = await window.dexterai.credentials.listConnected()
          set({ connectedProviders: providers })
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
        set({ selectedModelId: modelId, selectedProviderId: providerId })
    }),
    {
      name: 'dexterai-storage',
      partialize: (state) => ({
        isOnboarded: state.isOnboarded,
        connectedProviders: state.connectedProviders,
        selectedModelId: state.selectedModelId,
        selectedProviderId: state.selectedProviderId
      })
    }
  )
)
