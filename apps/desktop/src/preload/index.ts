import { contextBridge, ipcRenderer, webFrame } from 'electron';
import {
  VerifyResult,
  TestRequest,
  RegistryModel,
  TestRun,
  PromptTemplate,
  StreamChunk,
  EvaluationMetrics,
  ProviderError,
  JobProgress,
  Conversation,
  ConversationSummary,
  ChatMessage,
  Memory
} from '@dexterai/registry-types';

type UnsubscribeFn = () => void;

interface DexteraiAPI {
  credentials: {
    save(providerId: string, key: string, extras?: Record<string, string>): Promise<void>;
    delete(providerId: string): Promise<void>;
    exists(providerId: string): Promise<boolean>;
    listConnected(): Promise<{ providers: string[]; models: string[] }>;
  };
  provider: {
    verify(providerId: string, modelId: string): Promise<VerifyResult>;
    test(request: TestRequest): Promise<void>;
    cancelTest(requestId: string): Promise<void>;
  };
  registry: {
    getModels(category?: string): Promise<RegistryModel[]>;
    checkForUpdate(): Promise<{ hasUpdate: boolean; version: string }>;
    applyUpdate(): Promise<void>;
  };
  history: {
    getRunsForModel(modelId: string, limit?: number): Promise<TestRun[]>;
    exportAsCSV(modelId: string): Promise<string>;
    deleteRun(runId: string): Promise<void>;
  };
  templates: {
    list(category: string): Promise<PromptTemplate[]>;
    save(template: Omit<PromptTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<PromptTemplate>;
    delete(templateId: string): Promise<void>;
  };
  files: {
    openAudioPicker(): Promise<{ path: string; name: string } | null>;
    saveFile(args: {
      content: string | Buffer | Uint8Array;
      title: string;
      defaultName: string;
      filters: Electron.FileFilter[];
    }): Promise<{ success: boolean; filePath?: string; error?: string }>;
  };

  conversations: {
    list(): Promise<ConversationSummary[]>;
    get(id: string): Promise<Conversation | null>;
    create(title?: string, settingsJson?: string): Promise<Conversation | null>;
    update(id: string, updates: { title?: string; settings_json?: string }): Promise<{ success: boolean }>;
    delete(id: string): Promise<{ success: boolean }>;
    export(id: string, format: 'markdown' | 'json'): Promise<string>;
  };
  messages: {
    list(conversationId: string): Promise<ChatMessage[]>;
    add(message: {
      conversation_id: string;
      role: string;
      content: string;
      model_id?: string;
      provider_id?: string;
      token_count?: number;
      metadata_json?: string;
    }): Promise<ChatMessage | null>;
    update(id: string, updates: { content?: string; token_count?: number; metadata_json?: string }): Promise<{ success: boolean }>;
    delete(id: string): Promise<{ success: boolean }>;
    search(query: string): Promise<(ChatMessage & { conversation_title: string })[]>;
  };
  chat: {
    send(request: {
      conversationId: string;
      requestId: string;
      modelId: string;
      providerId: string;
      messages: { role: string; content: string }[];
      params: Record<string, any>;
    }): Promise<void>;
    cancel(requestId: string): Promise<void>;
  };
  memory: {
    list(): Promise<Memory[]>;
    save(memory: { id?: string; key: string; content: string; source_conversation_id?: string }): Promise<Memory | null>;
    delete(id: string): Promise<{ success: boolean }>;
    togglePin(id: string): Promise<{ success: boolean }>;
    extract(conversationId: string, providerId: string, modelId: string): Promise<{ id: string; key: string; content: string }[]>;
  };
  settings: {
    deleteData(mode: 'chat' | 'keys_analytics' | 'everything'): Promise<{ success: boolean; error?: string }>;
  };
  zoom: {
    setFactor(factor: number): void;
    getFactor(): number;
  };

  on(channel: 'test:chunk', handler: (chunk: StreamChunk) => void): UnsubscribeFn;
  on(channel: 'test:done', handler: (metrics: EvaluationMetrics) => void): UnsubscribeFn;
  on(channel: 'test:error', handler: (error: ProviderError) => void): UnsubscribeFn;
  on(channel: 'chat:chunk', handler: (chunk: StreamChunk) => void): UnsubscribeFn;
  on(channel: 'chat:done', handler: (metrics: EvaluationMetrics) => void): UnsubscribeFn;
  on(channel: 'chat:error', handler: (error: ProviderError) => void): UnsubscribeFn;
  on(channel: 'chat:title-updated', handler: (data: { conversationId: string; title: string }) => void): UnsubscribeFn;
  on(channel: 'registry:updated', handler: (version: string) => void): UnsubscribeFn;
  on(channel: 'job:progress', handler: (progress: JobProgress) => void): UnsubscribeFn;
}

const api: DexteraiAPI = {
  credentials: {
    save: (providerId, key, extras) => ipcRenderer.invoke('credentials:save', providerId, key, extras),
    delete: (providerId) => ipcRenderer.invoke('credentials:delete', providerId),
    exists: (providerId) => ipcRenderer.invoke('credentials:exists', providerId),
    listConnected: () => ipcRenderer.invoke('credentials:listConnected')
  },
  provider: {
    verify: (providerId, modelId) => ipcRenderer.invoke('provider:verify', providerId, modelId),
    test: (request) => ipcRenderer.invoke('provider:test', request),
    cancelTest: (requestId) => ipcRenderer.invoke('provider:cancel', requestId)
  },
  registry: {
    getModels: (category) => ipcRenderer.invoke('registry:getModels', category),
    checkForUpdate: () => ipcRenderer.invoke('registry:checkForUpdate'),
    applyUpdate: () => ipcRenderer.invoke('registry:applyUpdate')
  },
  history: {
    getRunsForModel: (modelId, limit) => ipcRenderer.invoke('history:getRunsForModel', modelId, limit),
    exportAsCSV: (modelId) => ipcRenderer.invoke('history:exportAsCSV', modelId),
    deleteRun: (runId) => ipcRenderer.invoke('history:deleteRun', runId)
  },
  templates: {
    list: (category) => ipcRenderer.invoke('templates:list', category),
    save: (template) => ipcRenderer.invoke('templates:save', template),
    delete: (templateId) => ipcRenderer.invoke('templates:delete', templateId)
  },
  files: {
    openAudioPicker: () => ipcRenderer.invoke('files:openAudioPicker'),
    saveFile: (args) => ipcRenderer.invoke('files:saveFile', args)
  },
  conversations: {
    list: () => ipcRenderer.invoke('conversations:list'),
    get: (id) => ipcRenderer.invoke('conversations:get', id),
    create: (title?, settingsJson?) => ipcRenderer.invoke('conversations:create', title, settingsJson),
    update: (id, updates) => ipcRenderer.invoke('conversations:update', id, updates),
    delete: (id) => ipcRenderer.invoke('conversations:delete', id),
    export: (id, format) => ipcRenderer.invoke('conversations:export', id, format)
  },
  messages: {
    list: (conversationId) => ipcRenderer.invoke('messages:list', conversationId),
    add: (message) => ipcRenderer.invoke('messages:add', message),
    update: (id, updates) => ipcRenderer.invoke('messages:update', id, updates),
    delete: (id) => ipcRenderer.invoke('messages:delete', id),
    search: (query) => ipcRenderer.invoke('messages:search', query)
  },
  chat: {
    send: (request) => ipcRenderer.invoke('chat:send', request),
    cancel: (requestId) => ipcRenderer.invoke('chat:cancel', requestId)
  },
  memory: {
    list: () => ipcRenderer.invoke('memory:list'),
    save: (memory) => ipcRenderer.invoke('memory:save', memory),
    delete: (id) => ipcRenderer.invoke('memory:delete', id),
    togglePin: (id) => ipcRenderer.invoke('memory:togglePin', id),
    extract: (conversationId, providerId, modelId) => ipcRenderer.invoke('memory:extract', conversationId, providerId, modelId)
  },
  settings: {
    deleteData: (mode) => ipcRenderer.invoke('settings:deleteData', mode)
  },
  zoom: {
    setFactor: (factor: number) => webFrame.setZoomFactor(factor),
    getFactor: () => webFrame.getZoomFactor()
  },

  on: (channel: string, callback: (...args: any[]) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, ...args: any[]) => callback(...args);
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
  }
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('dexterai', api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore
  window.dexterai = api;
}
