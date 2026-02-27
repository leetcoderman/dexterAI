# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Product Overview

**dexterAI** is an Electron + React + TypeScript desktop app — a unified workbench for testing and chatting with AI models from multiple providers. Local-first, owns your API keys, streams output, and evaluates performance.

**Core value prop:** Connect your own API keys, test any model, compare performance, switch providers seamlessly — all from one app.

### Supported Providers (5 adapters)

| Provider | Adapter | Categories |
|----------|---------|------------|
| OpenAI | `openai.adapter.ts` | text_generation, code_generation |
| Anthropic | `anthropic.adapter.ts` | text_generation, code_generation |
| Google Gemini | `google.adapter.ts` | text_generation, code_generation, image_generation |
| Deepgram | `deepgram.adapter.ts` | audio_transcription, text_to_speech |
| NVIDIA NIM | `nvidia.adapter.ts` | text_generation, code_generation |

---

## Commands

All commands run from `apps/desktop/` unless noted.

```bash
pnpm install --frozen-lockfile   # from repo root
npm run dev                       # Electron + HMR
npm run typecheck                 # both main + renderer
npm run lint
npm run format
npm run build                     # typecheck + electron-vite build
npm run build:mac / :win / :linux
```

No automated tests exist (`pnpm test` is a no-op).

## Code Style

- Single quotes, no semicolons, print width 100, no trailing commas (Prettier)
- 2-space indentation, LF line endings, TypeScript strict mode
- Functional React components with hooks (no class components)

---

## Architecture

### Monorepo Structure

```
apps/desktop/src/
  main/                              # Electron main process (Node.js)
    index.ts                         # Entry: init DB, register IPC, create window, zoom menu
    adapters/
      base.adapter.ts                # Abstract: withRetry(), extractRateLimit(), mapError()
      adapter-registry.ts            # Map of providerId → adapter instance
      openai.adapter.ts              # Captures chunk.model as resolvedModel
      anthropic.adapter.ts           # Captures event.message.model as resolvedModel
      google.adapter.ts              # Captures response.modelVersion as resolvedModel
      deepgram.adapter.ts            # Falls back to request.modelId as resolvedModel
      nvidia.adapter.ts              # Captures chunk.model (OpenAI-compatible SDK)
    ipc/
      provider.ipc.ts                # provider:verify, provider:test, provider:cancel
      credentials.ipc.ts             # credentials:save/delete/exists/listConnected
      chat.ipc.ts                    # chat:send/cancel, auto-title, memory injection, context trim
      conversations.ipc.ts           # conversations:list/get/create/update/delete, export
      messages.ipc.ts                # messages:list/add/update/delete, FTS5 search
      memory.ipc.ts                  # memories CRUD + extractMemories() LLM pipeline
      history.ipc.ts                 # history:getRunsForModel, deleteRun, exportAsCSV
      templates.ipc.ts               # templates:list/save/delete
      registry.ipc.ts                # registry:getModels (195 static models)
      files.ipc.ts                   # files:openAudioPicker, files:saveExport (MD/PDF/DOCX)
      settings.ipc.ts                # settings:deleteAllChats/keys/everything
    credentials/
      credential-store.ts            # OS keychain via keytar (never in DB)
    db/
      database.ts                    # better-sqlite3, WAL mode, FKs, migration system
      schema.sql                     # 7 tables + FTS5 (see DB Schema below)
    registry/
      registry-manager.ts            # CDN fetch → local cache → bundled fallback
  preload/
    index.ts                         # contextBridge: window.dexterai API + zoom
    index.d.ts                       # Type definitions
  renderer/src/
    main.tsx                         # React entry: HashRouter + StrictMode
    App.tsx                          # Routing + global zoom engine (Cmd+/-/0)
    store/index.ts                   # Zustand (persisted): providers, models, zoom, sidebar, settings
    screens/
      Onboarding.tsx                 # 4-step first-run setup
      Home.tsx                       # Use-case gallery
      Catalogue.tsx                  # Model browser with search/filter
      Connection.tsx                 # API key management per provider
      ProvidersScreen.tsx            # Provider logos + connection status
      ChatListScreen.tsx             # Conversation list with date grouping + FTS search
      ChatScreen.tsx                 # Core chat: 40fps streaming, regenerate, edit/resend
      MemoryScreen.tsx               # Memory management (grouped by key, edit, pin, delete)
      Settings.tsx                   # Danger zone + appearance (zoom dropdown)
      TestWorkspace.tsx              # Workspace router (picks workspace by model category)
    screens/workspaces/              # 5 task-specific UIs (TextGen, CodeGen, ImageGen, ASR, TTS)
    components/
      EvaluationDrawer.tsx           # Metrics: TTFT, tokens, timing, Model Served card
      HistoryTab.tsx                 # Test run history with personal bests
      TemplateManager.tsx            # Save/load workspace param presets
      chat/
        ChatInput.tsx                # Input with inline model selector
        MessageBubble.tsx            # Markdown, code blocks, thinking block, resolved model badge
        SettingsDrawer.tsx           # System prompt, temperature, max tokens, memory toggle
      layout/
        AppLayout.tsx                # Sidebar + Topbar + Outlet
        Sidebar.tsx                  # Nav rail (collapsible), conversations, tools
        Topbar.tsx                   # Header + chat export (MD/PDF/DOCX)
    utils/
      export-utils.ts               # Multi-format chat export engine
packages/
  registry-types/                    # Shared TS interfaces
  antigravity/                       # Internal UI component library (Tailwind)
  shared-utils/                      # cn(), sleep(), formatBytes(), detectProviderFromKey()
  i18n/                              # i18next setup (English only)
```

### IPC Contract

| Channel | Direction | Purpose |
|---|---|---|
| `provider:verify/test/cancel` | invoke/send | Credential validation + streaming inference |
| `test:chunk/done/error` | main→renderer | Streaming events for test workspaces |
| `chat:send/cancel` | invoke | Chat streaming (routes through adapters) |
| `chat:chunk/done/error` | main→renderer | Streaming events for ChatScreen |
| `chat:title-updated` | main→renderer | Auto-generated conversation title |
| `credentials:save/delete/exists/listConnected` | invoke | Keychain CRUD |
| `conversations:list/get/create/update/delete` | invoke | Conversation CRUD |
| `messages:list/add/update/delete/search` | invoke | Message CRUD + FTS |
| `memories:list/save/update/delete` | invoke | Memory CRUD |
| `history:getRunsForModel/deleteRun/exportAsCSV` | invoke | Test run history |
| `templates:list/save/delete` | invoke | Prompt templates |
| `registry:getModels` | invoke | Model catalogue |
| `files:openAudioPicker/saveExport` | invoke | File dialogs |
| `settings:deleteAllChats/deleteAllKeys/deleteEverything` | invoke | Danger zone |

### Database Schema (SQLite — 7 tables)

`app.getPath('userData')/dexterai.sqlite` — WAL mode, FKs enabled:

- **connections** — `provider_id` PK, `model_ids` (JSON), `connected_at`, `last_verified`, `token_total`
- **test_runs** — `id` UUID PK, `model_id`, `provider_id`, `category`, `params_json`, `output_summary`, `metrics_json`, `ran_at`, `error`
- **prompt_templates** — `id` PK, `name`, `category`, `params_json`, `created_at`, `updated_at`
- **metadata** — `key` PK, `value`
- **conversations** — `id` PK, `title`, `created_at`, `updated_at`, `settings_json` (stores system prompt, temperature, maxTokens, memoryEnabled, `_memoryExtracted` flag)
- **messages** — `id` PK, `conversation_id` FK, `role`, `content`, `model_id`, `provider_id`, `token_count`, `created_at`, `metadata_json` (stores ttft, totalTime, tokens, resolvedModel, thought)
- **messages_fts** — FTS5 virtual table on messages.content with insert/delete triggers
- **memories** — `id` PK, `key`, `content`, `source_conversation_id`, `created_at`, `updated_at`, `is_pinned`

### Key Shared Types (`@dexterai/registry-types`)

- `StreamChunk` — `{ requestId, text?, thought? }`
- `EvaluationMetrics` — `{ requestId, ttft, totalTime, promptTokens, completionTokens, finishReason?, cacheReadTokens?, resolvedModel? }`
- `ChatMessage` — `{ id, conversation_id, role, content, model_id, provider_id, token_count, created_at, metadata_json }`
- `Conversation`, `ConversationSummary`, `Memory`, `ChatRequest`
- `TestRequest`, `ProviderError`, `ProviderCredentials`, `VerifyResult`, `RegistryModel`

### Security Model

- **API keys**: OS Keychain via `keytar` exclusively. Never in DB, localStorage, or config files.
- **Preload sandbox**: `contextBridge` for type-safe IPC. `sandbox: false` for native modules.
- **Data sanitization**: `params_json` in test_runs scrubbed of secrets.

---

## Development Journey (v2.0 → v2.4)

### v2.0 — Foundation
Multi-process Electron app with adapter registry, SQLite, keychain storage, evaluation workspaces (5 task UIs), Monaco editor integration. Rebrand from ModelForge → dexterAI.

### v2.1 — Scalability
- Global UI zoom via `webFrame.setZoomFactor()` with Cmd+/-/0 shortcuts and menu overrides
- Sidebar collapse to icon rail
- Portal tooltips, max tokens default (8192), memory persistence fix

### v2.2 — Accountability
- Resolved model identity: all 5 adapters capture API-confirmed model ID (`resolvedModel`)
- Identity badges in MessageBubble (green match / amber mismatch)
- "Model Served" metric card in EvaluationDrawer

### v2.3 — Performance
- 40fps streaming engine (buffer-draining at 25ms intervals in ChatScreen)
- Thinking/reasoning block support (`thought` field in StreamChunk)
- Context window auto-trim (system + last 10 messages when >90% of limit)
- Auto-titling + background memory extraction in chat.ipc.ts

### v2.4 — Efficiency & Portability (Current)
- Native chat export: MD, PDF, DOCX via `export-utils.ts` + `files.ipc.ts`
- Tailwind Typography + dark-mode prose overrides
- Build stability fixes for arbitrary CSS values

---

## Key Patterns

1. **New IPC channel**: `ipc/{module}.ipc.ts` → `preload/index.ts` → renderer
2. **New DB table**: `schema.sql` → `getDatabase()` queries in IPC handlers
3. **New adapter capability**: Extend `BaseProviderAdapter` → implement in each adapter → register in `index.ts`
4. **State management**: Zustand (persisted) for UI → SQLite for data → OS Keychain for secrets
5. **Streaming events**: Adapters emit `test:chunk/done/error` → ChatEmitter forwards as `chat:chunk/done/error` → renderer subscribes via `window.dexterai.on()` with **ref-based pattern** (NOT useEffect dep array)
6. **Settings merge**: Always merge with existing `settings_json` to preserve internal flags like `_memoryExtracted`

## Important Notes

- **No automated tests** — manual verification only
- **HashRouter** required — Electron file:// protocol
- **React StrictMode** enabled — effects double-fire in dev
- Pre-existing lint warnings in adapters are known and non-blocking
- 195-model static registry in `registry.ipc.ts` is the catalogue source of truth

## Planned Features (Not Yet Implemented)

- Multi-key provider support (multiple API keys per provider with failover)
- Automatic model switching on rate limit (cross-provider failover with model equivalence groups)
- Streaming TTS, multi-modal conversations, model comparison mode, plugin system
