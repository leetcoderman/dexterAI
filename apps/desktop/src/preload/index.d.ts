import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  VerifyResult,
  TestRun,
  PromptTemplate,
  RegistryModel,
  EvaluationMetrics,
  StreamChunk,
  ProviderError,
  TestRequest,
  JobProgress,
  Conversation,
  ConversationSummary,
  ChatMessage,
  Memory,
  AgentRequest,
  AgentToolEvent,
  AgentApprovalRequest
} from '@dexterai/registry-types'

interface FileTreeNode {
  name: string
  path: string
  type: 'file' | 'dir'
  children?: FileTreeNode[]
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: unknown
    dexterai: {
      credentials: {
        save(providerId: string, key: string, extras?: Record<string, string>): Promise<void>
        delete(providerId: string): Promise<void>
        exists(providerId: string): Promise<boolean>
        listConnected(): Promise<{ providers: string[]; models: string[] }>
      }
      provider: {
        verify(providerId: string, modelId: string): Promise<VerifyResult>
        test(request: TestRequest): Promise<void>
        cancelTest(requestId: string): Promise<void>
      }
      registry: {
        getModels(category?: string): Promise<RegistryModel[]>
        checkForUpdate(): Promise<{ hasUpdate: boolean; version: string }>
        applyUpdate(): Promise<void>
      }
      history: {
        getRunsForModel(modelId: string, limit?: number): Promise<TestRun[]>
        exportAsCSV(modelId: string): Promise<string>
        deleteRun(runId: string): Promise<void>
      }
      templates: {
        list(category: string): Promise<PromptTemplate[]>
        save(template: Omit<PromptTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<PromptTemplate>
        delete(templateId: string): Promise<void>
      }
      files: {
        openAudioPicker(): Promise<{ path: string; name: string } | null>
        saveFile(args: {
          content: string | Buffer | Uint8Array
          title: string
          defaultName: string
          filters: { name: string; extensions: string[] }[]
        }): Promise<{ success: boolean; filePath?: string; error?: string }>
      }
      fs: {
        openFolder(): Promise<{ rootPath: string; name: string } | null>
        readDir(args: { rootPath: string; ignorePatterns?: string[] }): Promise<FileTreeNode[]>
        readDirShallow(args: { dirPath: string; rootPath: string }): Promise<FileTreeNode[]>
        readFile(args: { filePath: string; rootPath: string }): Promise<{ content: string; size: number } | { error: string }>
        writeFile(args: { filePath: string; rootPath: string; content: string }): Promise<{ success: boolean; error?: string }>
        stat(args: { filePath: string; rootPath: string }): Promise<{ size: number; modified: string; isDir: boolean; extension: string } | { error: string }>
        search(args: { rootPath: string; query: string; filePattern?: string }): Promise<{ results: { filePath: string; line: number; text: string }[]; truncated: boolean }>
      }
      conversations: {
        list(): Promise<ConversationSummary[]>
        get(id: string): Promise<Conversation | null>
        create(title?: string, settingsJson?: string): Promise<Conversation | null>
        update(id: string, updates: { title?: string; settings_json?: string }): Promise<{ success: boolean }>
        delete(id: string): Promise<{ success: boolean }>
        export(id: string, format: 'markdown' | 'json'): Promise<string>
      }
      messages: {
        list(conversationId: string): Promise<ChatMessage[]>
        add(message: {
          conversation_id: string
          role: string
          content: string
          model_id?: string
          provider_id?: string
          token_count?: number
          metadata_json?: string
        }): Promise<ChatMessage | null>
        update(id: string, updates: { content?: string; token_count?: number; metadata_json?: string }): Promise<{ success: boolean }>
        delete(id: string): Promise<{ success: boolean }>
        search(query: string): Promise<(ChatMessage & { conversation_title: string })[]>
      }
      chat: {
        send(request: {
          conversationId: string
          requestId: string
          modelId: string
          providerId: string
          messages: { role: string; content: string }[]
          params: Record<string, any>
        }): Promise<void>
        cancel(requestId: string): Promise<void>
      }
      agent: {
        send(request: AgentRequest): Promise<void>
        cancel(requestId: string): Promise<void>
        approve(approvalId: string): Promise<void>
        reject(approvalId: string): Promise<void>
      }
      terminal: {
        create(args: { id: string; cwd: string; shell?: string }): Promise<{ id: string; error?: string }>
        write(args: { id: string; data: string }): void
        resize(args: { id: string; cols: number; rows: number }): void
        dispose(args: { id: string }): Promise<void>
      }
      memory: {
        list(): Promise<Memory[]>
        save(memory: { id?: string; key: string; content: string; source_conversation_id?: string }): Promise<Memory | null>
        delete(id: string): Promise<{ success: boolean }>
        togglePin(id: string): Promise<{ success: boolean }>
        extract(conversationId: string, providerId: string, modelId: string): Promise<{ id: string; key: string; content: string }[]>
      }
      settings: {
        deleteData(mode: 'chat' | 'keys_analytics' | 'everything'): Promise<{ success: boolean; error?: string }>
      }
      app: {
        openWindow(): Promise<void>
      }
      zoom: {
        setFactor(factor: number): void
        getFactor(): number
      }
      on(channel: 'test:chunk', handler: (chunk: StreamChunk) => void): () => void
      on(channel: 'test:done', handler: (metrics: EvaluationMetrics) => void): () => void
      on(channel: 'test:error', handler: (error: ProviderError) => void): () => void
      on(channel: 'chat:chunk', handler: (chunk: StreamChunk) => void): () => void
      on(channel: 'chat:done', handler: (metrics: EvaluationMetrics) => void): () => void
      on(channel: 'chat:error', handler: (error: ProviderError) => void): () => void
      on(channel: 'chat:title-updated', handler: (data: { conversationId: string; title: string }) => void): () => void
      on(channel: 'registry:updated', handler: (version: string) => void): () => void
      on(channel: 'job:progress', handler: (progress: JobProgress) => void): () => void
      on(channel: 'agent:tool-result', handler: (data: AgentToolEvent) => void): () => void
      on(channel: 'agent:approval-required', handler: (data: AgentApprovalRequest) => void): () => void
      on(channel: 'terminal:data', handler: (data: { id: string; data: string }) => void): () => void
      on(channel: 'terminal:exit', handler: (data: { id: string; exitCode: number }) => void): () => void
    }
  }
}
