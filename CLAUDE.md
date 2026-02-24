# CLAUDE.md

This file provides guidance to Claude Code when working with this repository. Read this first before doing any work.

## Product Overview

**dexterAI** is an Electron + React + TypeScript desktop app that serves as a unified workbench for testing and interacting with AI models from multiple providers. It solves the fragmentation of AI testing by providing a single, local-first interface that handles API connections, model execution, streaming output, and performance evaluation.

**Core value prop:** Connect your own API keys, test any model, compare performance, switch providers seamlessly — all from one app.

### Supported Providers (5 adapters)

| Provider | Adapter | Categories |
|----------|---------|------------|
| OpenAI | `openai.adapter.ts` | text_generation, code_generation |
| Anthropic | `anthropic.adapter.ts` | text_generation, code_generation |
| Google Gemini | `google.adapter.ts` | text_generation, code_generation, image_generation |
| Deepgram | `deepgram.adapter.ts` | audio_transcription, text_to_speech |
| NVIDIA NIM | `nvidia.adapter.ts` | text_generation, code_generation |

### Workspaces (5 task UIs)

| Workspace | File | Purpose |
|-----------|------|---------|
| TextGenWorkspace | `screens/workspaces/TextGenWorkspace.tsx` | Chat interface with system prompt, temperature, tools JSON |
| CodeGenWorkspace | `screens/workspaces/CodeGenWorkspace.tsx` | Code gen with Monaco editor, diff view |
| ImageGenWorkspace | `screens/workspaces/ImageGenWorkspace.tsx` | Image gen with aspect ratios, style presets, history filmstrip |
| ASRWorkspace | `screens/workspaces/ASRWorkspace.tsx` | Audio transcription from file/mic with word timestamps |
| TTSWorkspace | `screens/workspaces/TTSWorkspace.tsx` | Text-to-speech with audio player and download |

---

## Commands

All commands run from `apps/desktop/` unless noted.

```bash
# Install (from repo root)
pnpm install --frozen-lockfile

# Development (Electron + HMR)
npm run dev

# Type checking
npm run typecheck          # both main + renderer
npm run typecheck:node     # main process only
npm run typecheck:web      # renderer only

# Lint
npm run lint

# Format
npm run format

# Build
npm run build              # typecheck + electron-vite build
npm run build:unpack       # unpacked output for local testing
npm run build:mac
npm run build:win
npm run build:linux
```

There are currently no automated tests (`pnpm test` is a no-op).

## Code Style

- Single quotes, no semicolons, print width 100, no trailing commas (Prettier)
- 2-space indentation, LF line endings
- TypeScript strict mode
- Functional React components with hooks (no class components)

---

## Architecture

### Monorepo Structure

```
apps/desktop/                    # Main Electron application
  src/
    main/                        # Electron main process (Node.js)
      index.ts                   # Entry: init DB, register IPC, create window
      adapters/                  # One adapter per AI provider
        base.adapter.ts          # Abstract class: withRetry(), extractRateLimit()
        adapter-registry.ts      # Map of providerId -> adapter instance
        openai.adapter.ts
        anthropic.adapter.ts
        google.adapter.ts
        deepgram.adapter.ts
        nvidia.adapter.ts
      ipc/                       # IPC handler modules
        provider.ipc.ts          # provider:verify, provider:test, provider:cancel
        credentials.ipc.ts       # credentials:save/delete/exists/listConnected
        history.ipc.ts           # history:getRunsForModel, deleteRun, exportAsCSV
        templates.ipc.ts         # templates:list/save/delete
        registry.ipc.ts          # registry:getModels (195 static models)
        files.ipc.ts             # files:openAudioPicker (Electron dialog)
      credentials/
        credential-store.ts      # OS keychain via keytar (never in DB)
      db/
        database.ts              # better-sqlite3 init/get/close
        schema.sql               # 4 tables: connections, test_runs, prompt_templates, metadata
      registry/
        registry-manager.ts      # CDN fetch -> local cache -> bundled fallback
    preload/
      index.ts                   # contextBridge: exposes window.dexterai API
      index.d.ts                 # Type definitions
    renderer/src/
      main.tsx                   # React entry: HashRouter + StrictMode
      App.tsx                    # Conditional routing (onboarded vs not)
      store/index.ts             # Zustand store (persisted to localStorage)
      screens/
        Onboarding.tsx           # 4-step first-run setup
        Home.tsx                 # Use-case gallery (5 categories)
        Catalogue.tsx            # Model browser with search/filter
        Connection.tsx           # API key management per provider
        TestWorkspace.tsx        # Workspace router (picks workspace by model category)
      screens/workspaces/        # 5 task-specific UIs (see table above)
      components/
        EvaluationDrawer.tsx     # Metrics display (TTFT, tokens, timing)
        HistoryTab.tsx           # Test run history with personal bests
        TemplateManager.tsx      # Save/load workspace param presets
        layout/
          AppLayout.tsx          # Sidebar + Topbar + Outlet
          Sidebar.tsx            # Nav + provider logos (custom SVGs)
          Topbar.tsx             # Header with connection count
packages/
  registry-types/                # Shared TS interfaces (models, IPC, DB schemas)
  antigravity/                   # Internal UI component library (Tailwind)
  shared-utils/                  # cn(), sleep(), formatBytes(), detectProviderFromKey()
  i18n/                          # i18next setup (English only)
```

### Process Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Main Process (Node.js)                                       │
│  ┌──────────┐  ┌──────────────┐  ┌─────────────────────┐   │
│  │ Adapters  │  │ IPC Handlers │  │ SQLite (better-s3)  │   │
│  │ (5 provs) │  │ (6 modules)  │  │ dexterai.sqlite     │   │
│  └──────────┘  └──────────────┘  └─────────────────────┘   │
│  ┌──────────────────┐  ┌────────────────────┐              │
│  │ CredentialStore   │  │ RegistryManager    │              │
│  │ (OS Keychain)     │  │ (CDN + cache)      │              │
│  └──────────────────┘  └────────────────────┘              │
└─────────────────────────┬───────────────────────────────────┘
                          │ IPC (typed channels)
┌─────────────────────────┴───────────────────────────────────┐
│ Preload (contextBridge)                                      │
│  window.dexterai.{provider, credentials, history, ...}       │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────┐
│ Renderer (React 19 + Zustand + Tailwind)                     │
│  Screens → Workspaces → Components                           │
│  Store: isOnboarded, connectedProviders                      │
└─────────────────────────────────────────────────────────────┘
```

### IPC Contract

| Channel | Direction | Purpose |
|---|---|---|
| `provider:verify` | invoke | Validate API credentials |
| `provider:test` | invoke | Start streaming inference |
| `provider:cancel` | send | Abort in-flight request |
| `test:chunk` | on (main→renderer) | Streaming token chunks |
| `test:done` | on (main→renderer) | Final metrics on completion |
| `test:error` | on (main→renderer) | Error during inference |
| `credentials:save/delete/exists/listConnected` | invoke | CRUD for stored credentials |
| `history:getRunsForModel/deleteRun/exportAsCSV` | invoke | Query/delete test run history |
| `templates:list/save/delete` | invoke | Prompt template CRUD |
| `registry:getModels/checkForUpdate` | invoke | Model catalogue |
| `files:openAudioPicker` | invoke | Electron file dialog |

### Database Schema (SQLite)

Four tables in `app.getPath('userData')/dexterai.sqlite`:

- **connections** — `provider_id` (PK), `model_ids` (JSON array), `connected_at`, `last_verified`, `token_total`
- **test_runs** — `id` (UUID PK), `model_id`, `provider_id`, `category`, `params_json`, `output_summary`, `metrics_json`, `ran_at`, `error`
- **prompt_templates** — `id` (PK), `name`, `category`, `params_json`, `created_at`, `updated_at`
- **metadata** — `key` (PK), `value`

### Key Shared Types (`@dexterai/registry-types`)

- `Category` — 13 AI task categories (text_generation, code_generation, image_generation, etc.)
- `RegistryModel` — Model metadata (id, provider_id, category, name, context_window, pricing)
- `TestRequest` — `{ requestId, modelId, providerId, category, params }`
- `StreamChunk` — `{ requestId, text? }`
- `EvaluationMetrics` — `{ requestId, ttft, totalTime, promptTokens, completionTokens, finishReason }`
- `ProviderError` — `{ requestId, code, message, isRetryable? }`
- `ProviderCredentials` — `{ apiKey, extras? }`
- `VerifyResult` — `{ success, error? }`

### Adding a New Provider Adapter

1. Create `apps/desktop/src/main/adapters/{provider}.adapter.ts` extending `BaseProviderAdapter`
2. Implement `providerId`, `verify()`, and `execute()` (emit `test:chunk`, `test:done`, `test:error` on the passed emitter)
3. Register it in `AdapterRegistry` in `src/main/index.ts`
4. Add provider metadata to `@dexterai/registry-types`
5. Add provider logo SVG to `Sidebar.tsx`

### TypeScript Config

Two separate tsconfig files in `apps/desktop/`:
- `tsconfig.node.json` — main + preload processes
- `tsconfig.web.json` — renderer (JSX: `react-jsx`, path alias `@renderer/*`)

Both extend `@electron-toolkit/tsconfig` base configs.

### Security Model

- **API keys**: Stored exclusively in OS Keychain via `keytar`. Never in DB, localStorage, or config files.
- **Preload sandbox**: Uses `contextBridge` for type-safe IPC. `sandbox: false` for native module access (keytar, better-sqlite3).
- **Data sanitization**: `params_json` in test_runs is scrubbed of secrets before persisting.

---

## Development Journey & Recent Work

### Rebrand: ModelForge → dexterAI

The app was originally called "ModelForge" and was rebranded to "dexterAI". This involved renaming:
- All IPC bridge references (`window.modelforge` → `window.dexterai`)
- Zustand storage key (`modelforge-storage` → `dexterai-storage`)
- Service names, app IDs, CSS classes
- Database file path

### Bug Fix: Streaming Output Not Appearing (Feb 2025)

After the rebrand, text generation (and all workspaces) showed no output when prompts were submitted. Root cause: **stale closure in IPC event subscription pattern**.

**The problem:** All 5 workspaces used `useEffect([currentRequestId])` to subscribe to IPC events. In `handleRun`, `setCurrentRequestId(reqId)` is async — React batches the state update. The IPC `invoke` starts streaming in the main process, but chunks arrive before the `useEffect` re-fires with the new requestId. The OLD listener (with `currentRequestId = null`) silently drops them via the `data.requestId !== currentRequestId` guard.

**The fix:** Replaced with a **ref-based pattern** across all 5 workspaces:
- Added `useRef` to track request ID (synchronously up-to-date)
- Registered IPC listeners once with `useEffect([], [])` (empty deps)
- Handlers read from `requestIdRef.current` instead of closure
- `handleRun` sets `requestIdRef.current = reqId` synchronously before IPC call
- Removed the unused `currentRequestId` state entirely (the ref is the source of truth)
- For ImageGenWorkspace, added `requestParamsRef` to snapshot params at request time (prevents stale `prompt`, `width`, etc. in the done handler's history entry)

---

## Planned Features & Roadmap

The following features represent the vision for dexterAI's evolution from a testing tool into a full AI assistant platform. When implementing these, follow the existing patterns (adapter pattern, IPC contracts, SQLite persistence, Zustand state).

### 1. Persistent Chat History (DB-backed)

**Goal:** Save complete chat conversations to SQLite so users can resume sessions across app restarts.

**Approach:**
- New `conversations` table: `id`, `title`, `model_id`, `provider_id`, `created_at`, `updated_at`
- New `messages` table: `id`, `conversation_id` (FK), `role`, `content`, `created_at`, `token_count`
- New IPC channels: `conversations:list`, `conversations:get`, `conversations:create`, `conversations:delete`
- TextGenWorkspace loads/saves messages to DB instead of ephemeral state
- Sidebar or panel to browse/search past conversations

### 2. Chat Memory (Context Persistence)

**Goal:** Maintain a summarized memory of past conversations that can be injected as context, so the AI "remembers" prior interactions.

**Approach:**
- New `chat_memory` table: `id`, `conversation_id`, `summary`, `key_facts` (JSON), `created_at`
- After each conversation ends (or at intervals), use the connected LLM to generate a summary
- On new conversation start, inject relevant memories as system prompt context
- Allow users to view/edit/delete stored memories

### 3. Multi-Key Provider Support (Multiple API Keys per Provider)

**Goal:** Allow users to connect multiple API keys for the same provider, enabling failover when rate limits are hit.

**Approach:**
- Extend `CredentialStore` to support multiple keys per provider (e.g., `openai:key1`, `openai:key2`)
- New `api_keys` table or extend `connections` to store multiple key entries with usage tracking
- Round-robin or failover strategy in adapter execution
- UI in Connection.tsx to manage multiple keys per provider

### 4. Automatic Model Switching on Rate Limit

**Goal:** If a model hits its rate limit (429), automatically switch to another available model (same or different provider) and continue the conversation seamlessly.

**Approach:**
- `BaseProviderAdapter.withRetry()` already handles 429s with backoff — extend to support cross-model failover
- Define model equivalence groups (e.g., GPT-4o ↔ Claude Sonnet ↔ Gemini Pro)
- When all retries exhausted, check for equivalent model with available quota
- Seamlessly continue the conversation with the new model, noting the switch in the UI
- Requires chat history (feature 1) to replay context to the new model

### 5. Future Considerations

- **Streaming TTS**: Real-time audio streaming instead of file-based playback
- **Multi-modal conversations**: Images + text in the same chat
- **Model comparison mode**: Side-by-side same-prompt testing across models
- **Plugin system**: User-installable provider adapters
- **Export/import**: Conversation export (JSON, Markdown) and workspace sharing

---

## Key Patterns to Follow

When implementing new features, follow these established patterns:

1. **New IPC channel**: Define in `ipc/{module}.ipc.ts` → expose in `preload/index.ts` → consume in renderer
2. **New DB table**: Add to `schema.sql` → use `getDatabase()` for queries in IPC handlers
3. **New adapter capability**: Extend `BaseProviderAdapter` → implement in each adapter → register in `index.ts`
4. **State management**: Zustand for UI state → SQLite for persistent data → OS Keychain for secrets
5. **Streaming events**: Main process emits `test:chunk`/`test:done`/`test:error` → renderer subscribes via `window.dexterai.on()` with ref-based pattern (NOT useEffect dep array)
6. **Error handling**: Adapters use `withRetry()` for transient errors → `mapError()` for user-facing messages → `test:error` event for renderer

## Important Notes

- **No tests exist** — manual verification is the current approach
- **Pre-existing lint warnings** exist in adapter files (formatting) — these are known and non-blocking
- **React 18 StrictMode** is enabled (`main.tsx`) — effects double-fire on mount in dev mode
- **HashRouter** is used (not BrowserRouter) — Electron file:// protocol requires it
- The 195-model static registry in `registry.ipc.ts` is the source of truth for the catalogue
