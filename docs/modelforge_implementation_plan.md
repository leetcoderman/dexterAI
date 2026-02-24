# ModelForge — Phased Implementation Plan
## AI-Model Prompts for Antigravity IDE

> Each phase below is a self-contained prompt intended to be pasted directly into the Antigravity AI IDE. The model receives the prompt, builds the deliverables, and hands off to the next phase via a defined **handoff checkpoint**. Phases are sequential; each one explicitly references what was built previously so the model has full context.

---

## PHASE 1 — Monorepo Foundation & Dev Infrastructure

```
You are building ModelForge, a macOS Electron desktop application that lets non-technical Product Managers test and compare AI models from multiple providers without writing code. This is Phase 1 of 10. You are laying the complete development foundation — nothing user-visible is built yet.

TECHNOLOGY STACK (non-negotiable):
- Electron v30 (Node 20 LTS, Chromium 126)
- electron-vite v2.x for build tooling (Vite-based HMR)
- React 18.3 with TypeScript strict mode
- pnpm workspaces for monorepo management
- Zustand v4 for state management
- better-sqlite3 v9 for local database
- ESLint + Prettier with shared config
- Vitest for unit testing
- GitHub Actions for CI

DELIVER THE FOLLOWING:

1. MONOREPO STRUCTURE
Create a pnpm monorepo with this exact workspace layout:
  modelforge/
  ├── apps/desktop/          # Electron app (main + preload + renderer)
  ├── packages/antigravity/  # Internal React UI component library
  ├── packages/registry-types/ # Shared TypeScript types for registry + test schemas
  ├── packages/i18n/         # en.json + react-i18next setup
  ├── packages/shared-utils/ # Pure utility functions (no Node/browser APIs)
  └── registry/              # registry.json (bundled model data — stub for now)

2. ELECTRON SHELL (apps/desktop)
Set up electron-vite with three entry points:
- src/main/main.ts     — app lifecycle, BrowserWindow creation
- src/preload/preload.ts — contextBridge surface (stub, typed interface only)
- src/renderer/app.tsx  — React 18 root (renders "ModelForge Loading..." for now)

CRITICAL SECURITY CONFIG on every BrowserWindow:
  contextIsolation: true
  nodeIntegration: false
  webSecurity: true
  Content-Security-Policy: "default-src 'self'; script-src 'self'; no eval, no inline scripts"

Target macOS Universal binary via @electron/universal. Configure electron-builder for DMG output.

3. ANTIGRAVITY COMPONENT LIBRARY STUB (packages/antigravity)
Build these foundational components, all using design tokens (CSS custom properties) — ZERO hardcoded hex values:
- Button (variants: primary, secondary, destructive; sizes: sm, md, lg)
- Input (variants: text, password with show/hide toggle)
- Modal (base + ConfirmationModal variant with title, body, cancel/confirm CTAs)
- Toast (variants: success, error, warning; auto-dismiss after 4s)
- AsyncBoundary (wraps React Suspense + ErrorBoundary; accepts fallback and errorFallback props)
- LiveRegion (aria-live="polite" wrapper; handles VoiceOver quirks on macOS)

Design token CSS variables to define (in packages/antigravity/src/tokens.css):
  --color-primary, --color-primary-hover
  --color-surface, --color-surface-elevated
  --color-text-primary, --color-text-secondary, --color-text-disabled
  --color-success, --color-warning, --color-error
  --color-border
  --radius-sm, --radius-md, --radius-lg
  --focus-ring: 0 0 0 3px rgba(59, 130, 246, 0.5)

Apply --focus-ring to :focus-visible on ALL interactive elements globally. Never suppress outline without replacing it.

4. I18N INFRASTRUCTURE (packages/i18n)
- Install react-i18next
- Create packages/i18n/en.json with keys for every string that will appear in the app (placeholder structure now, fill as we build)
- Wire i18next provider in the renderer root
- Enforce rule: ALL user-visible strings use t('key') hook. Create an ESLint rule that warns on hardcoded English strings in JSX (regex pattern on string literals containing spaces and letters)
- Use Intl.DateTimeFormat for all dates, Intl.NumberFormat for numbers — no hardcoded format strings anywhere

5. SQLITE DATABASE (apps/desktop/src/main/db/)
Implement with better-sqlite3. The DB file lives at: app.getPath('userData') + '/modelforge.db'
Write a simple migration runner: loads files from db/migrations/ in order, tracks applied migrations in a `schema_migrations` table.

Apply this initial schema (migration 001_initial.sql):

  CREATE TABLE connections (
    provider_id TEXT PRIMARY KEY,
    model_ids TEXT NOT NULL,       -- JSON array
    connected_at INTEGER NOT NULL, -- Unix ms
    last_verified INTEGER,
    token_total INTEGER DEFAULT 0
  );

  CREATE TABLE test_runs (
    id TEXT PRIMARY KEY,           -- UUID
    model_id TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    category TEXT NOT NULL,
    params_json TEXT NOT NULL,
    output_summary TEXT,
    metrics_json TEXT NOT NULL,
    ran_at INTEGER NOT NULL,
    error TEXT
  );
  CREATE INDEX idx_runs_model ON test_runs(model_id, ran_at DESC);
  CREATE INDEX idx_runs_category ON test_runs(category, ran_at DESC);

  CREATE TABLE prompt_templates (
    id TEXT PRIMARY KEY,           -- UUID
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    params_json TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX idx_templates_category ON prompt_templates(category);

  CREATE TABLE metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

On first run, seed metadata with:
  app_instance_id = crypto.randomUUID()
  schema_version = '1'
  onboarding_completed = 'false'
  telemetry_enabled = 'pending'
  last_launch_at = current Unix ms

6. SHARED TYPES (packages/registry-types)
Define and export these TypeScript types (they will be used by both main and renderer processes):

  type Category = 'text_generation' | 'code_generation' | 'image_generation' |
    'image_understanding' | 'audio_transcription' | 'text_to_speech' |
    'embeddings' | 'reranking' | 'document_understanding' | 'object_detection' |
    'video_generation' | 'music_generation' | '3d_generation'

  interface RegistryModel { id, display_name, provider_id, category: Category, model_string,
    release_date, param_count_b?, context_window?, licence, licence_type, local_available,
    local_download_url?, huggingface_id?, pricing?, connection_config: ProviderConnectionConfig,
    tags: string[], deprecated: boolean }

  interface ProviderConnectionConfig { auth_type: 'bearer'|'header_key'|'query_param'|'oauth2'|'none',
    header_name?, additional_headers?, base_url, sdk_wrapper?, verify_endpoint, docs_url,
    pricing_url, status_url }

  type TextGenParams = { prompt, systemPrompt?, history?, temperature, maxTokens, topP,
    stopSequences, seed?, frequencyPenalty, presencePenalty, responseFormat, stream: true }

  type ImageGenParams = { prompt, negativePrompt?, seed?, width, height, steps?, guidanceScale?, stylePreset? }

  type ASRParams = { audioFilePath, language?, diarize, punctuate, timestamps, smartFormat }

  type TestRequest = { requestId: string, modelId: string, category: Category,
    params: TextGenParams | ImageGenParams | ASRParams | Record<string, unknown> }

  interface EvaluationMetrics { requestId, ttft?, totalTime, httpStatus, requestSizeKb,
    responseSizeKb, modelId, providerId, timestamp, appVersion,
    // LLM-specific (optional):
    promptTokens?, completionTokens?, totalTokens?, tokensPerSecond?, estimatedCostUsd?,
    contextWindowUsedPct?, finishReason?, cacheReadTokens?,
    // Image-specific: generationLatencyMs?, seedUsed?, imageDimensions?, fileSizeKb?, stepsExecuted?, safetyFilterTriggered?
    // ASR-specific: audioDurationSec?, rtf?, speakerCount?, avgWordConfidence?, languageDetected?
    // etc. — all optional, typed union by category }

  interface ProviderError { code: 'INVALID_KEY'|'INSUFFICIENT_PERMISSIONS'|'RATE_LIMITED'|
    'MODEL_NOT_FOUND'|'NETWORK_UNREACHABLE'|'MALFORMED_RESPONSE'|'PROVIDER_MAINTENANCE'|
    'KEY_REVOKED'|'EXTRA_CONFIG_MISSING', message: string, retryAfterSec?: number,
    rawStatus?: number, actionUrl?: string }

7. CI PIPELINE (.github/workflows/pr-checks.yml)
Four jobs that run on every PR to main:
  job 1: lint — ESLint + Prettier check
  job 2: typecheck — tsc --noEmit across all packages
  job 3: test — Vitest (all packages)
  job 4: bundle-size — vite build + check that the renderer initial chunk is < 500 KB gzipped

ACCEPTANCE CRITERIA FOR PHASE 1:
✓ `pnpm dev` launches Electron window showing "ModelForge Loading..."
✓ `pnpm build` produces a macOS Universal DMG without errors
✓ `pnpm test` passes all unit tests (write at minimum: migration idempotency test, Token type narrowing test, ProviderError code exhaustiveness test)
✓ All four CI jobs pass on a clean branch
✓ DB file is created in userData on first launch with all four tables
✓ Zero hardcoded hex colours in any component file

HANDOFF: Commit all work to the `phase-1/foundation` branch. The next phase (Phase 2) will implement the IPC bridge, credential store, all provider adapters, and the registry manager. It will import all types from `packages/registry-types` and all utilities from `packages/shared-utils` created here.
```

---

## PHASE 2 — Core Infrastructure: IPC Bridge, Adapters & Registry

```
You are continuing the ModelForge build. Phase 1 is complete. You have:
- A working pnpm monorepo with electron-vite
- Electron shell with contextIsolation + nodeIntegration:false
- All shared TypeScript types in packages/registry-types
- SQLite DB with migration system and four tables
- Antigravity component stubs
- i18n infrastructure with react-i18next

Phase 2 builds the entire "backend" (Electron main process) and the typed IPC bridge. No UI is built yet.

DELIVER THE FOLLOWING:

1. IPC BRIDGE — preload.ts
Expose ONLY this typed interface to the renderer via contextBridge. No additional methods. No Node.js APIs.
Name the surface: window.modelforge

  interface ModelforgeAPI {
    credentials: {
      save(providerId: string, key: string, extras?: Record<string,string>): Promise<void>
      delete(providerId: string): Promise<void>
      exists(providerId: string): Promise<boolean>
      listConnected(): Promise<string[]>
      // NOTE: NO getKey method. The renderer NEVER sees the raw key.
    }
    provider: {
      verify(providerId: string, modelId: string): Promise<VerifyResult>
      test(request: TestRequest): Promise<void>   // Results arrive via IPC events, not return value
      cancelTest(requestId: string): Promise<void>
    }
    registry: {
      getModels(category?: string): Promise<RegistryModel[]>
      checkForUpdate(): Promise<{ hasUpdate: boolean; version: string }>
      applyUpdate(): Promise<void>
    }
    history: {
      getRunsForModel(modelId: string, limit?: number): Promise<TestRun[]>
      exportAsCSV(modelId: string): Promise<string>   // Returns file path after save dialog
      deleteRun(runId: string): Promise<void>
    }
    templates: {
      list(category: string): Promise<PromptTemplate[]>
      save(template: Omit<PromptTemplate, 'id' | 'createdAt'>): Promise<PromptTemplate>
      delete(templateId: string): Promise<void>
    }
    files: {
      openAudioPicker(): Promise<string | null>   // Returns absolute file path
      openImagePicker(): Promise<string | null>
    }
    on(channel: 'test:chunk', handler: (chunk: StreamChunk) => void): () => void
    on(channel: 'test:done', handler: (metrics: EvaluationMetrics) => void): () => void
    on(channel: 'test:error', handler: (error: ProviderError) => void): () => void
    on(channel: 'registry:updated', handler: (version: string) => void): () => void
    on(channel: 'job:progress', handler: (progress: JobProgress) => void): () => void
  }

Each IPC method maps to an ipcMain.handle() in the main process. The on() subscriptions use ipcMain.on() with the window's webContents to push events.

2. CREDENTIAL STORE (main/credentials/credential-store.ts)
Use keytar with SERVICE_NAME = 'modelforge'.
Account format: '{providerId}:{appInstanceId}' where appInstanceId comes from the metadata SQLite table.

  CredentialStore.save(providerId, apiKey, extras?)
    — stores primary key + each extra field as '{account}:{fieldName}'
  CredentialStore.get(providerId): Promise<ProviderCredentials>
    — ONLY callable from main process. Not exposed via preload.
    — throws NoCredentialsError if not found
  CredentialStore.delete(providerId)
    — deletes primary entry AND all '{account}:*' sub-entries
  CredentialStore.exists(providerId): Promise<boolean>

3. PROVIDER ADAPTER ARCHITECTURE (main/adapters/)

base.adapter.ts — abstract class BaseProviderAdapter:
  abstract readonly providerId: string
  abstract verify(credentials: ProviderCredentials): Promise<VerifyResult>
  abstract execute(request: TestRequest, credentials: ProviderCredentials, emitter: IPCEmitter): Promise<void>
  protected async withRetry<T>(fn, maxAttempts=3, baseDelayMs=1000): Promise<T>
    — retry on 429 using retry-after header with exponential backoff
    — do NOT retry on 401, 403, 404
  protected extractRateLimit(headers): RateLimitInfo

adapter-registry.ts — AdapterRegistry singleton:
  Map<string, BaseProviderAdapter>
  get(providerId): throws UnknownProviderError if not registered
  register(adapter): void

4. CONCRETE PROVIDER ADAPTERS
Build one adapter file per provider. Each implements verify() using the provider's verify_endpoint and maps errors to ProviderError codes:
  401 → INVALID_KEY
  403 → INSUFFICIENT_PERMISSIONS
  429 → RATE_LIMITED (include retryAfterSec)
  404 → MODEL_NOT_FOUND
  503 → PROVIDER_MAINTENANCE
  Network/timeout → NETWORK_UNREACHABLE
  200 + invalid JSON → MALFORMED_RESPONSE

Adapters to build:
  openai.adapter.ts     — Bearer token, openai npm package, optional organization header
  anthropic.adapter.ts  — x-api-key header + anthropic-version: 2023-06-01, @anthropic-ai/sdk
                          (See execute() pattern in the engineering spec: stream messages, capture
                          firstChunkTime on first content_block_delta, emit test:done with
                          cache_read_input_tokens from finalMessage().usage)
  nvidia-nim.adapter.ts — Bearer token, openai npm with custom baseURL: integrate.api.nvidia.com/v1
  gemini.adapter.ts     — ?key= query param, @google/generative-ai
  vertex.adapter.ts     — OAuth2 Bearer, @google-cloud/aiplatform, requires project_id + location
  deepgram.adapter.ts   — Authorization: Token {key}, @deepgram/sdk, WebSocket for streaming ASR
  replicate.adapter.ts  — Authorization: Token {key}, replicate npm, version hash per model
  huggingface.adapter.ts — Bearer, plain fetch, model_id embedded in URL path
  stability.adapter.ts  — Bearer, plain fetch, organization header optional
  elevenlabs.adapter.ts — xi-api-key header, plain fetch, voice_id per request
  cohere.adapter.ts     — Bearer, cohere-ai npm
  ollama.adapter.ts     — no auth, localhost:11434, verify by listing local models
  assemblyai.adapter.ts — authorization: {key} header, assemblyai npm, WebSocket for real-time

For Phase 2, implement verify() for all 13 adapters and stub execute() (return a mock stream chunk for now). Full execute() implementations come per workspace in later phases.

5. IPC HANDLERS REGISTRATION (main/ipc/)
Create one file per domain. Register all handlers in main.ts before BrowserWindow is created.

credentials.ipc.ts — handles credentials:save, credentials:delete, credentials:exists, credentials:listConnected
  After save: update connections table in SQLite with provider_id and connected_at
  After delete: remove from connections table

provider.ipc.ts — handles provider:verify, provider:test, provider:cancel
  provider:test stores the AbortController in a Map<requestId, AbortController>
  provider:cancel calls abort() on the stored controller
  All errors caught and emitted as test:error events

history.ipc.ts — handles history:getRuns, history:exportCSV, history:deleteRun
  exportAsCSV triggers dialog.showSaveDialog then writes the file

registry.ipc.ts — handles registry:getModels, registry:checkForUpdate, registry:applyUpdate

templates.ipc.ts — handles templates:list, templates:save, templates:delete

files.ipc.ts — handles files:openAudioPicker, files:openImagePicker
  CRITICAL: Validate file extension before returning path:
    audio: ['wav','mp3','m4a','flac','ogg','opus']
    image: ['jpg','jpeg','png','webp','gif']
  Return null if extension validation fails (silently — no error toast)
  Support drag-and-drop paths too: renderer sends path via ipc, main validates extension

6. REGISTRY MANAGER (main/registry/registry-manager.ts)
Implement loadRegistry() with three-tier fallback:
  1. Fetch https://registry.modelforge.app/registry.json with 5s AbortSignal.timeout
     If newer version: save to userData/registry-cache.json, write registry_version to metadata
     Emit registry:updated IPC event to renderer with new version string
  2. Read userData/registry-cache.json
  3. Read bundled registry/registry.json (always present)

Version comparison: CalVer string YYYY.MM.patch — compare as semver-like strings.
loadRegistry() must NOT block app launch. Call it in parallel with BrowserWindow creation.

7. MODEL REGISTRY JSON SEED (registry/registry.json)
Populate with 100+ models covering all 13 categories. Use this schema per model:
  { id, display_name, provider_id, category, model_string, release_date, param_count_b?,
    context_window?, licence, licence_type: 'open'|'commercial', local_available,
    local_download_url?, huggingface_id?, pricing?: { input_per_1m_tokens, output_per_1m_tokens,
    currency, pricing_updated, pricing_url }, connection_config: <ProviderConnectionConfig>,
    tags: string[], deprecated: false }

Include AT MINIMUM these models (add more to reach 100+):
  Text gen: GPT-4o, GPT-4o-mini, Claude 3.5 Sonnet, Claude 3 Haiku, Llama 3.1 405B (NVIDIA NIM),
    Llama 3.1 70B, Mistral Large, Gemma 2 27B, DeepSeek R1
  Code gen: DeepSeek Coder V2, CodeLlama 70B, StarCoder2 15B, Granite Code 34B
  Image gen: SDXL Turbo (NVIDIA NIM), FLUX.1-dev, DALL-E 3, Ideogram v2, Stable Cascade
  VLM: LLaVA 1.6, Phi-3 Vision, GPT-4o Vision, Claude 3.5 Sonnet (vision), Gemini Pro Vision
  ASR: Whisper Large v3, Deepgram Nova-2, NVIDIA Parakeet, AssemblyAI Universal
  TTS: ElevenLabs Turbo v2.5, Kokoro, Bark
  Embeddings: text-embedding-3-large, text-embedding-3-small, NV-EmbedQA, nomic-embed-text
  Reranking: Cohere Rerank 3, NV-RerankQA-Mistral
  Document: Nougat, Gemini Flash (doc), Claude 3.5 (PDF)
  CV: YOLOv10, Grounding DINO, SAM 2
  Video gen: CogVideoX-5B, Kling 1.5, Runway Gen-3 Alpha
  Music gen: MusicGen Large, AudioCraft, Stable Audio 2.0
  3D gen: TripoSR, Zero123++, Shap-E

ACCEPTANCE CRITERIA FOR PHASE 2:
✓ window.modelforge is available in renderer DevTools console
✓ window.modelforge.credentials.getKey — TypeScript compilation error (method does not exist)
✓ Calling credentials.save('openai', 'sk-test') stores a value readable back from Keychain
✓ Calling credentials.delete('openai') removes ALL sub-entries (test with an extras object)
✓ AdapterRegistry.get('unknown') throws UnknownProviderError
✓ AnthropicAdapter.verify() returns { success: false, error: { code: 'INVALID_KEY' } } for a bad key
✓ loadRegistry() completes in under 300ms when CDN responds (measured with a mock CDN)
✓ loadRegistry() returns bundled registry when offline (tested by mocking fetch to reject)
✓ Registry JSON validates against the RegistryModel TypeScript type (tsc --noEmit passes)
✓ Unit tests: withRetry backs off correctly on 429, credential store namespacing, file extension validation

HANDOFF: Commit to phase-2/core-infrastructure. Phase 3 builds the visual application shell — Home screen, Catalogue, routing, and the Onboarding flow — consuming the IPC bridge and registry built here.
```

---

## PHASE 3 — App Shell, Navigation & Onboarding

```
You are continuing the ModelForge build. Phases 1 and 2 are complete. You have:
- Full Electron shell with contextIsolation enforced
- window.modelforge IPC bridge (all methods typed and wired)
- CredentialStore (keytar), all 13 ProviderAdapters (verify() implemented)
- Registry manager (3-tier fallback, CDN fetch)
- 100+ model registry.json seed
- SQLite DB with migrations
- Antigravity component library (Button, Input, Modal, Toast, AsyncBoundary, LiveRegion)
- react-i18next with en.json

Phase 3 builds everything the user sees before they enter a test workspace: routing, layout shell, Home screen, Model Catalogue, and the first-run Onboarding flow.

DELIVER THE FOLLOWING:

1. ZUSTAND STORES
Create four stores in renderer/stores/:

  appStore: { initialized: boolean, registryVersion: string, registryLastFetched: number,
    lastLaunchAt: number, onboardingCompleted: boolean, telemetryEnabled: 'pending'|boolean }
  
  modelStore: { models: RegistryModel[], connectedProviders: Set<string>,
    activeCategory: Category|null, activeModelId: string|null,
    compareModeEnabled: boolean, compareModelId: string|null,
    // actions: setActiveCategory, setActiveModel, enableCompareMode, disableCompareMode,
    //          setConnectedProviders, markProviderConnected, markProviderDisconnected }

  testStore: { status: 'idle'|'running'|'streaming'|'done'|'error', requestId: string|null,
    outputText: string, outputImage: string|null, outputAudio: string|null,
    outputDetections: Detection[], metrics: EvaluationMetrics|null, error: ProviderError|null,
    compareStatus, compareOutput..., compareMetrics: EvaluationMetrics|null,
    // actions: startTest, appendChunk, finalise, setError, reset }

  settingsStore: { evaluationDrawerOpen: boolean, sidebarCollapsed: boolean,
    activeTab: 'test'|'history'|'evaluation' }

On app init: call window.modelforge.registry.getModels() → populate modelStore.models.
Call window.modelforge.credentials.listConnected() → populate modelStore.connectedProviders.

2. TOP-LEVEL ROUTING LOGIC
The MainPanel renders one of four screens based on Zustand state (no URL router — state-driven):
  modelStore.activeModelId === null && modelStore.activeCategory === null → HomeScreen
  modelStore.activeCategory !== null && modelStore.activeModelId === null → CatalogueScreen
  modelStore.activeModelId !== null && !isConnected(activeModelId) → ConnectionScreen
  modelStore.activeModelId !== null && isConnected(activeModelId) → TestScreen

isConnected(modelId): looks up model's provider_id, checks if it's in connectedProviders Set.

3. LAYOUT SHELL (renderer/components/layout/)

TitleBar:
  - Custom macOS titlebar (frameless window, traffic lights via electron's titleBarStyle: 'hiddenInset')
  - Global search bar (Antigravity Input, searches across model names, providers, tags)
  - Search results appear as a floating dropdown below the bar; clicking an item navigates to that model's ConnectionScreen or TestScreen
  - ARIA: role="search", input has aria-label="Search models"

Sidebar:
  - CategoryList: all 13 categories as collapsible sections
  - Each section shows models in that category that are connected (from connectedProviders)
  - ModelListItem: model name + provider logo + online/connected indicator dot
  - Clicking a ModelListItem sets modelStore.activeModelId
  - Keyboard: Arrow keys navigate within the list; Enter selects
  - SettingsButton at bottom (no-op for now, just renders the icon)

4. HOME SCREEN (renderer/screens/HomeScreen.tsx)
Responsive grid of 13 CategoryTile components:
  - 2 columns at < 1440px, 3 columns at ≥ 1440px (CSS Grid, not hardcoded breakpoints)
  - Each tile: category icon (use SVG icons, one per category), category name from t('category.{id}'),
    connected model count badge (models in this category whose provider_id is in connectedProviders),
    'New' badge if any models in this category have release_date > last_launch_at from metadata

Global UI above the grid:
  - Registry update notification bar: shown when registry:updated IPC event fires.
    Message: t('registry.updateAvailable', { version }) with 'Update now' action button.
  - 'Connected only' filter chip: when active, hides tiles with 0 connected models

Empty state for first-time users (onboarding_completed === false AND connectedProviders.size === 0):
  Show ambient nudge text in the hero area above the grid: t('home.noConnectionsNudge')
  NOT a modal — just styled helper text. This is the returning-user path.

5. MODEL CATALOGUE SCREEN (renderer/screens/CatalogueScreen.tsx)
Renders models for modelStore.activeCategory.

SortFilterBar:
  Sort options: Release Date (default desc), Provider, Popularity, Licence
  Filter chips (multi-select): Provider (unique list from category models), Licence (open/commercial),
    Local available (boolean)

ModelTable with ModelRow components. Each row:
  model name | provider logo (16x16 img from a map of provider_id → logo asset) | release date
  (Intl.DateTimeFormat) | param count (e.g., "405B") | licence badge | connection status badge

Connection status badge:
  'Connected' (green) if provider_id in connectedProviders
  'Not connected' (grey outline) otherwise
  
Clicking any row sets modelStore.activeModelId (triggers navigation to ConnectionScreen or TestScreen).

Popularity sort: call https://huggingface.co/api/models?sort=likes&limit=100 with the bundled read-only
HF token in the Authorization header. Cache result in modelStore for the session (not per-call).
If the fetch fails or returns an error, disable the Popularity sort option with a tooltip:
  t('catalogue.popularityUnavailable')

'New since last launch' badge on ModelRow: shown if model.release_date > last_launch_at from metadata.

6. ONBOARDING OVERLAY (renderer/components/onboarding/)
Shown when metadata.onboarding_completed === false AND appStore.initialized === true.
Full-screen overlay with 4 steps. Progress dots at top.

OnboardingStep1Welcome:
  - App logo, app name "ModelForge", tagline from t('onboarding.tagline')
  - 'Get started →' CTA (primary Button)
  - 'Skip setup' text link — writes onboarding_completed=true to metadata, dismisses overlay

OnboardingStep2CategoryPick:
  - Heading: t('onboarding.step2.heading')
  - 13 category cards in a 3-column grid (smaller than home tiles)
  - Click one → store selected category in local component state, advance to step 3
  - Selected category is highlighted with --color-primary border

OnboardingStep3Connect:
  - Heading: t('onboarding.step3.heading', { category: selectedCategoryName })
  - Show providers for that category, sorted by 'easiest free API key':
    Define a hardcoded ease_rank (1=easiest) per provider in registry. Providers with free tiers rank highest.
  - Each ProviderCard: provider logo, name, 'Free tier available' badge if applicable,
    'Get API key →' link (opens provider's key generation page in default browser via shell.openExternal)
  - Inline ApiKeyForm + 'Verify →' button (calls window.modelforge.provider.verify())
  - On success: advance to step 4
  - On failure: show ProviderError message inline (below the key input, not a Toast)

OnboardingStep4FirstTest:
  - Write onboarding_completed=true to metadata
  - Navigate to TestScreen for the just-connected model (set activeModelId and activeCategory in modelStore)
  - Show a tooltip overlay (Floating positioned with Popper/CSS) highlighting:
      1. The prompt input field: t('onboarding.tooltip.prompt')
      2. The Run button: t('onboarding.tooltip.run')
      3. The EvaluationDrawer handle: t('onboarding.tooltip.evaluation')
  - 'Got it' button dismisses the tooltip overlay (stored in settingsStore, never shows again)
  - Pre-populate the prompt input with a starter prompt from en.json per category:
      text_generation: "Explain the concept of retrieval-augmented generation in one paragraph."
      code_generation: "Write a Python function that parses a JSON file and returns a list of all keys."
      image_generation: "A photorealistic image of a red fox sitting in a snowy forest at golden hour."
      audio_transcription: "Upload an audio file to transcribe it."
      (define sensible starters for all 13 categories)

Emit telemetry events via window.modelforge on step transitions:
  onboarding_step_completed with { step: 1|2|3|4, category?: string }

ACCESSIBILITY REQUIREMENTS FOR ALL SCREENS IN THIS PHASE:
- All interactive elements reachable via Tab; Tab order follows visual reading order
- Focus ring visible on every interactive element (using Antigravity's --focus-ring token)
- Category tiles: role="button", aria-label includes connected count and New badge state
- All images have meaningful alt text or alt="" for decorative images
- Modal-like overlay (Onboarding): focus trapped inside overlay when active; Escape closes (unless on step 4)
- ARIA live region announces when registry update notification appears

ACCEPTANCE CRITERIA FOR PHASE 3:
✓ Fresh launch with no DB: Onboarding overlay appears on top of Home screen
✓ Completing onboarding step 3 with a valid key navigates to step 4 and shows the tooltip overlay
✓ Skipping onboarding shows Home screen; overlay never appears again on restart
✓ 13 category tiles render with correct icons and names; connected count is 0 on first run
✓ Category tile click navigates to CatalogueScreen showing only models in that category
✓ Model row click navigates to ConnectionScreen (no model connected yet)
✓ Global search finds "GPT-4o" and "claude" correctly (case-insensitive)
✓ Sidebar shows connected models only; no models shown when none are connected
✓ axe-core scan: zero accessibility violations on HomeScreen and CatalogueScreen

HANDOFF: Commit to phase-3/app-shell. Phase 4 builds the full Connection flow (State A and State B) with all 9 error scenarios and the provider verification UX.
```

---

## PHASE 4 — Connection Layer: API Key Setup & Verification

```
You are continuing the ModelForge build. Phases 1–3 are complete. You have:
- Full app shell with navigation, Home screen, Catalogue screen, and Onboarding flow
- Zustand stores managing routing state
- All 13 ProviderAdapters with verify() implemented
- The IPC bridge fully wired

Phase 4 builds the complete Connection flow: State A (entering and verifying an API key) and State B (managing an existing connection).

DELIVER THE FOLLOWING:

1. CONNECTION SCREEN — STATE A: Not Connected (renderer/screens/ConnectionScreen.tsx)

ProviderInfoCard:
  - Provider logo (from assets map)
  - Provider display_name
  - Links (use shell.openExternal via a dedicated IPC handler or renderer-side window.open with target='_blank'):
      Docs: connection_config.docs_url
      Pricing: connection_config.pricing_url
      Status: connection_config.status_url
  - Free tier indicator (driven by a free_tier: boolean field — add to registry connection_config)

ApiKeyForm:
  - Label: t('connection.apiKeyLabel', { provider: providerName })
  - Antigravity Input (variant: password, with show/hide toggle)
  - Conditional extra fields: render dynamically from connection_config.
    If provider is 'openai': show optional 'Organization ID' text input with help text: t('connection.openai.orgIdHelp')
    If provider is 'vertex': show required 'Project ID' and 'Location' inputs
    Extra fields are always visually below the primary API key field
    Required extra fields show a red asterisk; optional ones show t('connection.optional')
  - Each field has an associated error state (for EXTRA_CONFIG_MISSING error scenario)

VerifyButton:
  States: idle → 'Verify Connection' | loading → spinner + 'Verifying…' | success | error
  On click: calls window.modelforge.provider.verify(providerId, modelId)
  On success:
    - Show green SuccessBanner: t('connection.verifySuccess')
    - Save key via window.modelforge.credentials.save(providerId, key, extras)
    - Update modelStore.connectedProviders (add this provider_id)
    - Write connection to SQLite via credentials IPC (already handled in ipc/credentials.ipc.ts)
    - Auto-advance to State B after 1.5s delay (or immediately if user clicks 'Open Test Environment' in banner)
  On failure:
    - Show ErrorBanner below the form (NOT a Toast — stays visible)
    - ErrorBanner contains: error message string, action link if available

ERROR HANDLING MATRIX — map every ProviderError code to UI:
  INVALID_KEY → message: t('error.invalidKey') | action: link to connection_config.docs_url + '/authentication'
  INSUFFICIENT_PERMISSIONS → message: t('error.insufficientPermissions') | action: link to pricing_url
  RATE_LIMITED → message: t('error.rateLimited', { seconds: retryAfterSec }) | action: countdown timer + manual retry
    (countdown implemented with useEffect + setInterval, decrements from retryAfterSec to 0, then re-enables button)
  MODEL_NOT_FOUND → message: t('error.modelNotFound') | action: link to docs_url with region info
  NETWORK_UNREACHABLE → message: t('error.networkUnreachable') | action: Retry button (re-triggers verify)
  MALFORMED_RESPONSE → message: t('error.malformedResponse') | action: 'Show raw response' toggle (reveals a code block)
  PROVIDER_MAINTENANCE → message: t('error.providerMaintenance') | action: link to status_url
  KEY_REVOKED → message: t('error.keyRevoked') | action: Re-verify button inline
  EXTRA_CONFIG_MISSING → message: t('error.extraConfigMissing', { field: fieldName }) | action: highlight the missing field with red border + aria-describedby pointing to the error

ACCESSIBILITY:
  - Form errors announced via aria-live (use Antigravity LiveRegion)
  - Errors described in text, NOT by colour alone (each error has a text description)
  - The API key value is NEVER in any aria-label, error message, or DOM attribute

2. CONNECTION SCREEN — STATE B: Already Connected

When modelStore.connectedProviders includes the active model's provider_id, render State B:

  ConnectionInfo card:
    - Provider name + logo
    - "Connected [connection timestamp formatted as 'Feb 23, 2026 at 14:32']"
    - "Last verified [timestamp or 'Never re-verified']"
    - "Tokens used: [totalTokenCount from connections table, formatted with Intl.NumberFormat]"
      If token_total === 0: show t('connection.noTokensYet')

  Re-verify button (secondary variant):
    - Runs the same verify() call as State A
    - Shows inline success/failure without navigating away
    - Updates last_verified in SQLite on success

  Disconnect button (destructive variant, red outline):
    - Opens Antigravity ConfirmationModal:
        title: t('connection.disconnectTitle', { model: modelDisplayName })
        body: t('connection.disconnectBody')
        confirmLabel: t('connection.disconnectConfirm') — 'Disconnect'
        cancelLabel: t('common.cancel')
    - On confirm: window.modelforge.credentials.delete(providerId)
      → remove from modelStore.connectedProviders
      → navigate back to ConnectionScreen State A (re-render triggers automatically via state)
    - Confirm button is styled destructive (red); Cancel is secondary

  'Open Test Environment' primary Button (large, full-width on mobile):
    - Sets settingsStore.activeTab = 'test'
    - MainPanel re-renders TestScreen (triggered by isConnected() returning true)

ACCEPTANCE CRITERIA FOR PHASE 4:
✓ Entering a valid OpenAI key shows success banner and transitions to State B
✓ Entering an invalid key shows the correct error message and action link
✓ Rate limit error shows a countdown timer that counts down from retryAfterSec
✓ EXTRA_CONFIG_MISSING highlights the correct field with red border
✓ Disconnect modal appears; cancelling does nothing; confirming disconnects and returns to State A
✓ After disconnecting, the model's ConnectionScreen shows State A again
✓ The API key value is never visible in any error message, DOM attribute, or console log
✓ Form error announced by VoiceOver (tested manually with VoiceOver on macOS)
✓ All 9 error scenarios render correctly (write unit tests with mocked IPC responses)

HANDOFF: Commit to phase-4/connection-layer. Phase 5 builds the Test Screen shell and the four P0 test workspaces: Text Generation, Code Generation, Image Generation, and Audio Transcription.
```

---

## PHASE 5 — Test Screen Shell & P0 Workspaces

```
You are continuing the ModelForge build. Phases 1–4 are complete. You have:
- Full navigation, Home screen, Catalogue, and Connection flow
- All 13 ProviderAdapters with verify() complete; execute() stubs in place
- IPC bridge streaming events (test:chunk, test:done, test:error) wired but not yet consumed by UI

Phase 5 builds the Test Screen shell and the four P0 workspaces. You will also implement execute() for the four relevant adapters (OpenAI, Anthropic, NVIDIA NIM, Deepgram/AssemblyAI for ASR) to make live testing work.

DELIVER THE FOLLOWING:

1. TEST SCREEN SHELL (renderer/screens/TestScreen.tsx)

Layout:
  Left sidebar (from Phase 3) remains visible and active.
  Main content:
    TestScreenHeader:
      - Model display_name (bold) + provider logo
      - 'Re-verify connection' link (calls verify(), shows inline success/failure)
      - 'Disconnect' link (same as State B disconnect flow from Phase 4)
    
    TabBar: three tabs — 'Test', 'History', 'Evaluation'
      Tab switching must NOT re-mount the active workspace (use CSS visibility, not conditional rendering)
      Active tab stored in settingsStore.activeTab
    
    CompareModeToggle:
      - Visible ONLY when ≥ 2 models in the same category are connected
      - Toggle button in top-right corner of TestScreen
      - When enabled: MainPanel splits into SplitWorkspacePanel (left + right, equal width)
      - Compare mode state in modelStore.compareModeEnabled + compareModelId
      - Selector dropdown appears when enabling compare mode: lists other connected models in same category
    
    WorkspacePanel: renders the correct workspace based on activeModel.category.
      Currently implement: TextGenWorkspace, CodeGenWorkspace, ImageGenWorkspace, ASRWorkspace
      Others will be added in Phase 8.
    
    EvaluationDrawer:
      - Fixed panel at the bottom of TestScreen, collapsible
      - Collapsed state: just a handle bar showing the model name and last TTFT
      - Expanded state: full metrics display (see Phase 6 for full implementation)
      - For Phase 5: show TTFT, Total Response Time, HTTP Status, Token counts (text gen only)
      - Opens automatically (with animation) when test:done event fires
      - Collapse/expand state persisted in settingsStore.evaluationDrawerOpen

2. STREAMING OUTPUT PATTERN — implement in TestScreen and all workspaces
Exact pattern from the engineering spec (T2.4):
  const handleRun = async () => {
    reset()
    const requestId = crypto.randomUUID()
    // Subscribe BEFORE calling provider.test()
    const unsub1 = window.modelforge.on('test:chunk', (chunk) => { appendChunk(chunk) })
    const unsub2 = window.modelforge.on('test:done', (metrics) => { finalise(metrics); unsub1(); unsub2(); unsub3() })
    const unsub3 = window.modelforge.on('test:error', (err) => { setError(err); unsub1(); unsub2(); unsub3() })
    await window.modelforge.provider.test({ requestId, modelId, category, params })
  }
  Use useTransition for outputText state updates to avoid dropped frames during rapid streaming.

3. WORKSPACE: TEXT GENERATION / CHAT (renderer/workspaces/TextGenWorkspace.tsx)

Input Panel:
  - Prompt editor: Antigravity Input but as a <textarea> that auto-resizes (min 4 rows, max 16 rows)
  - System prompt: collapsible (default collapsed), same textarea style
  - Conversation history: shown as chat bubbles above the prompt (user messages right-aligned, assistant left-aligned)
    In Phase 5: implement history display only. Multi-turn send (appending to history) is optional stretch goal.
  - Temperature slider: 0.0–2.0, step 0.1, shows current value inline
  - Max tokens: number input, min 1, max driven by model.context_window from registry
  - Top-p slider: 0.0–1.0, step 0.01
  - Stop sequences: comma-separated tag input (type and press Enter to add, click × to remove)
  - Advanced section (collapsed by default, chevron toggle):
      seed (number input), frequency penalty (-2.0–2.0), presence penalty (-2.0–2.0),
      JSON mode toggle, response_format selector (text / json_object),
      Tool definitions: a Monaco JSON editor — load Monaco via dynamic import() only when Advanced is expanded

Output Panel:
  - Streamed text area: pre-formatted text display, updates via testStore.outputText
  - Live token counter in top-right corner of output panel: updates on each test:chunk (count spaces+1 as approximate)
    Exact token count from test:done metrics replaces the estimate
  - Regenerate button: resets testStore and re-calls handleRun with same params
  - Copy button: copies testStore.outputText to clipboard (window.navigator.clipboard)
  - Run button (primary, large): calls handleRun(); shows spinner + 'Running…' while status === 'running'|'streaming'
  - Cancel button: appears while running, calls window.modelforge.provider.cancelTest(requestId)

Construct TextGenParams from form state and pass to TestRequest.

4. ADAPTER: OpenAI execute() AND Anthropic execute()
Implement full streaming execute() for these two adapters (see Anthropic example in PRD T3.1):

OpenAI execute():
  Use openai npm. Create chat.completions.stream() with model, messages (built from params), temperature, max_tokens, etc.
  On each chunk: emit test:chunk with { requestId, text: delta.choices[0].delta.content }
  On stream end: emit test:done with { requestId, ttft, totalTime, promptTokens, completionTokens,
    finishReason, cachedTokens: usage.prompt_tokens_details?.cached_tokens ?? 0 }

Anthropic execute():
  Use @anthropic-ai/sdk. messages.stream() with model, max_tokens, messages, system, temperature.
  On content_block_delta text_delta: emit test:chunk
  On finalMessage(): emit test:done with cache_read_input_tokens from usage

NVIDIA NIM execute():
  Identical to OpenAI (uses openai npm with custom baseURL). Copy OpenAI execute() and adjust baseURL.

5. WORKSPACE: CODE GENERATION (renderer/workspaces/CodeGenWorkspace.tsx)

Input Panel:
  - Language selector: dropdown populated from a language list in en.json
    (JavaScript, TypeScript, Python, Go, Rust, Java, C++, C#, Ruby, PHP, Swift, Kotlin, SQL, Bash, Other)
  - Task description: resizable textarea
  - Context code pane: 'Add context code (optional)' toggle. When expanded: Monaco editor (lazy-loaded,
    syntax highlighting based on selected language). When no context provided, diff view is hidden.

Output Panel:
  - Monaco editor, read-only, syntax highlighted to selected language
  - Copy button
  - Diff toggle (only visible if context code was provided): shows a side-by-side diff
    Use the Monaco DiffEditor component (same lazy chunk as the main Monaco import)
  - 'Copy to clipboard' button with a persistent tooltip below it:
    t('codeGen.runInIdeHint') = "Paste into your IDE or a Jupyter notebook to run"
    This is intentional — code execution is not implemented in v1.0

6. WORKSPACE: IMAGE GENERATION (renderer/workspaces/ImageGenWorkspace.tsx)

Input Panel:
  - Prompt textarea
  - Negative prompt textarea
  - Seed: number input with a 'Random 🎲' button (sets a random integer 0–2147483647)
  - Width/height sliders: constrained to supported aspect ratios from model's registry entry
    Each model's supported_resolutions: number[][] should be added to the registry
    Default: first supported resolution; slider snaps to supported values
  - Steps slider (only shown if model supports it — add supports_steps: boolean to registry)
  - Guidance scale slider (only shown if model supports it)
  - Style preset dropdown (only shown if model has style_presets: string[] in registry)
  - Run button

Output Panel:
  - Image display: full-width <img> with object-fit: contain
  - Download button: dropdown → PNG / JPEG / WebP
    Image arrives as base64 from adapter; download creates a blob URL
  - Metadata overlay on hover: "Seed: {seedUsed} | {width}×{height}px"
  - Generation history filmstrip (bottom of output panel):
    Last 5 generated images stored in testStore (array of { base64, params, metrics })
    Clickable thumbnails — clicking restores all params to the values used for that generation

ADAPTER: Stability AI execute() AND Replicate execute()
Implement image generation execute() for Stability AI (SDXL) and Replicate:
  On completion: emit test:done with generationLatencyMs, seedUsed, imageDimensions, fileSizeKb,
    stepsExecuted, safetyFilterTriggered

7. WORKSPACE: AUDIO TRANSCRIPTION (renderer/workspaces/ASRWorkspace.tsx)

Input Panel:
  - File picker area: styled drop zone with dashed border and upload icon
    On click: calls window.modelforge.files.openAudioPicker() → displays file name + duration
    Supports drag-and-drop: renderer gets file path from DragEvent.dataTransfer.files[0].path,
    sends to main via IPC for extension validation before use
  - OR: Microphone record button
    Request mic permission via navigator.mediaDevices.getUserMedia({ audio: true })
    If denied: show inline error t('asr.micPermissionDenied') — no crash
    While recording: animated waveform using Web Audio API (AnalyserNode + canvas, lazy-init)
    Record button toggles to Stop; on stop: save audio blob as WAV, send path to main
  - Language selector: dropdown of ISO 639-1 codes + 'Auto' option (first in list)
  - Model-specific toggles (shown based on model.supported_features array in registry):
    Diarization (on/off), Punctuation (on/off), Timestamps ('none'/'word'/'utterance'), Smart Format (on/off)

Output Panel:
  - Inline audio player: <audio> element with custom controls (play/pause, scrubber, time display)
    Only shown after a file has been uploaded or recorded
  - Transcript text display: word-by-word spans if timestamps='word' was requested
    Each span has a data-start attribute; clicking seeks the audio player to that position
  - Speaker labels: if diarization output, prefix each block with "Speaker 1:", "Speaker 2:", etc.
  - Export buttons: SRT / VTT / plain TXT
    SRT export format: index + timecode + text, one block per utterance
    VTT export: same but with WEBVTT header and --> separator
    Plain TXT: just the transcript text

ADAPTER: Deepgram execute() AND AssemblyAI execute()
Implement ASR execute() for Deepgram and AssemblyAI:
  Deepgram: use @deepgram/sdk's transcribeFile() method, pass options from ASRParams
    On completion: emit test:done with audioDurationSec, rtf, speakerCount, avgWordConfidence, languageDetected
  AssemblyAI: use assemblyai npm's Transcriber class
    Pass audio file path; poll for completion; emit test:done with same metrics

ACCEPTANCE CRITERIA FOR PHASE 5:
✓ Text generation workspace: typing a prompt and clicking Run streams tokens to the output panel in real time
✓ useTransition: no dropped frames during streaming (Chrome DevTools Performance tab shows no long tasks)
✓ Cancel button aborts an in-flight Anthropic stream
✓ Code generation workspace: output renders in Monaco with correct syntax highlighting
✓ Diff view appears only when context code is provided
✓ Image generation: SDXL generation via Stability AI returns an image displayed in the output panel
✓ Filmstrip shows last 5 images; clicking one restores all params
✓ ASR workspace: uploading a WAV file and running Deepgram returns a transcript
✓ Timestamp word spans seek the audio player correctly on click
✓ SRT export is spec-compliant (validated against an SRT parser)
✓ EvaluationDrawer opens after test:done and shows correct TTFT and token counts

HANDOFF: Commit to phase-5/workspaces-p0. Phase 6 implements the complete evaluation metrics system, full EvaluationDrawer, test run history persistence, and the Prompt Template Library.
```

---

## PHASE 6 — Evaluation System, History & Prompt Templates

```
You are continuing the ModelForge build. Phases 1–5 are complete. You have:
- All four P0 workspaces rendering and executing live tests (TextGen, CodeGen, ImageGen, ASR)
- EvaluationDrawer showing basic metrics
- test:done events carrying partial metrics
- SQLite DB with test_runs table (being written, but not fully populated)

Phase 6 completes the evaluation system: all metric categories, the full EvaluationDrawer UI, History tab, and the Prompt Template Library.

DELIVER THE FOLLOWING:

1. COMPLETE METRICS CAPTURE IN ADAPTERS
Ensure every adapter's execute() emits a fully populated EvaluationMetrics object with test:done.

Universal metrics (every adapter):
  ttft: performance.now() delta from request start to first byte/chunk
  totalTime: performance.now() delta to stream end
  httpStatus: HTTP status code from the response
  requestSizeKb: Buffer.byteLength(JSON.stringify(requestPayload)) / 1024
  responseSizeKb: Content-Length header if available, else measure response body
  modelId: exact model string sent in the request
  providerId: adapter.providerId
  timestamp: new Date().toISOString()
  appVersion: app.getVersion() (from electron, passed to adapter via constructor)

LLM-specific (TextGen, CodeGen, Embeddings, Document — categories that return usage):
  promptTokens, completionTokens, totalTokens (from response.usage)
  tokensPerSecond: completionTokens / (totalTime / 1000)
  estimatedCostUsd: compute as (promptTokens/1_000_000 × model.pricing.input_per_1m_tokens) +
                              (completionTokens/1_000_000 × model.pricing.output_per_1m_tokens)
    STALENESS CHECK: if today - pricing_updated > 30 days: set pricingStale: true in metrics
    STALENESS CHECK: if today - pricing_updated > 90 days: set pricingHidden: true in metrics
  contextWindowUsedPct: totalTokens / model.context_window × 100
  finishReason: from response finish_reason / stop_reason
  cacheReadTokens: from Anthropic usage.cache_read_input_tokens or OpenAI prompt_tokens_details.cached_tokens (default 0)

Image-specific:
  generationLatencyMs: totalTime
  seedUsed: actual seed from response (may differ from input)
  imageDimensions: { width, height } from response metadata
  fileSizeKb: base64 decoded byte count / 1024
  stepsExecuted: from response if available
  safetyFilterTriggered: boolean from response safety field

ASR-specific:
  audioDurationSec: from response metadata or computed from file duration
  rtf: (totalTime / 1000) / audioDurationSec
  speakerCount: number of distinct speaker labels in response (0 if diarize=false)
  avgWordConfidence: mean of all word-level confidence scores (0–1), if returned
  languageDetected: ISO 639-1 code from response

2. EVALUATION DRAWER — COMPLETE UI (renderer/components/EvaluationDrawer.tsx)
Full metric display for current test run, organized by metric group.

Layout:
  - Collapsible panel (collapsed = 48px handle bar, expanded = 280px)
  - Handle bar shows: model name + last TTFT with colour dot (green/amber/red) + chevron icon
  - Expanded: scrollable metric grid

Universal metrics section (always shown):
  TTFT badge: colour-coded green <500ms, amber <2000ms, red >2000ms
  Total Response Time: grey
  HTTP Status: badge — 200 green, 4xx red, 5xx orange
  Request / Response Size in KB
  Model ID in monospace font
  Provider logo + name
  Timestamp in ISO 8601 with local time in parentheses
  App Version (small, grey)

LLM metrics section (shown when category is text_generation, code_generation, document_understanding):
  Prompt / Completion / Total Tokens (3-column grid)
  Tokens/Second (throughput)
  Estimated Cost:
    if pricingHidden: show t('metrics.pricingUnverified') + link to pricing_url (no number)
    if pricingStale: show "~$0.0042" with amber '≈ estimated' badge + link to pricing_url
    if fresh: show "$0.0042"
  Context Window Used %: progress bar. Red if >90%, amber if >70%, green otherwise
  Finish Reason: styled chip (stop = green, length = amber, content_filter = red)
  Cache Hit: show 'Cache hit ✓' badge if cacheReadTokens > 0, with cacheReadTokens count

Image metrics section (shown for image_generation):
  Generation Latency, Seed Used, Dimensions, File Size KB, Steps Executed
  Safety Filter Triggered: 'Filtered ⚠' badge if true

ASR metrics section (shown for audio_transcription):
  Audio Duration, RTF with interpretation ("faster than real-time" if RTF < 1),
  Speaker Count, Avg Word Confidence (progress bar 0–1), Language Detected

3. TEST RUN HISTORY — PERSISTENCE
After every test:done event, write to test_runs SQLite table:
  id: crypto.randomUUID()
  model_id, provider_id, category: from the TestRequest
  params_json: JSON.stringify(request.params) — NEVER include API keys (params have none)
  output_summary: first 500 chars of outputText, or for image: "{width}x{height} image",
    for audio: "{duration}s transcript"
  metrics_json: JSON.stringify(evaluationMetrics)
  ran_at: Date.now()
  error: null (error runs also stored, with error JSON in this field)

Write happens in the main process immediately after emitting test:done.
Performance target: SQLite write < 5ms (better-sqlite3 synchronous write).

4. HISTORY TAB UI (renderer/screens/TestScreen — History tab)
  Sortable table with columns: Timestamp, TTFT, Total Time, Tokens, Cost, Finish Reason
  Default sort: Timestamp descending (most recent first)
  Click a row → expand it to show full metrics (slide-down animation, CSS transition)
  Delete button on each row (calls history.deleteRun, optimistic UI update)
  
  Personal Best card (above the table):
    Fastest TTFT across all runs for this model: "{x}ms on {date}"
    Lowest cost per 1k tokens: "${x}/1k tokens on {date}"
    Highest throughput: "{x} tok/s on {date}"
    Computed from SQL aggregates: SELECT MIN(json_extract(metrics_json,'$.ttft')), etc.

  Export button (top-right of History tab):
    'Export CSV' and 'Export JSON' options in a dropdown
    Calls history.exportAsCSV(modelId) which triggers dialog.showSaveDialog in main

5. PROMPT TEMPLATE LIBRARY (renderer/components/PromptTemplateLibrary.tsx)
Implement as a reusable component used in every workspace that has a prompt input.

'Save as Template' button:
  Appears as a small icon button (bookmark icon) in the top-right corner of the prompt textarea
  On click: shows an inline input below the textarea (slide-down) for the template name
  On Enter or 'Save' click: calls window.modelforge.templates.save({
    name: enteredName,
    category: activeCategory,
    params_json: JSON.stringify(currentWorkspaceParams)  // full snapshot, not just prompt text
  })
  On success: dismiss inline input, show Toast success: t('templates.saved', { name })
  Validation: reject empty name (show inline error below the name input)

Template dropdown:
  Appears above the prompt textarea as a collapsed dropdown: "My Templates ({count}) ▾"
  On open: lists templates filtered to current category (calls templates.list(category))
  Each template row: name + created date + delete icon (× button, no confirmation needed)
  Click a template row: calls templates.load which deserializes params_json and
    SETS ALL workspace params — not just the prompt. Each workspace must expose a loadParams(params) method.
  Delete: calls templates.delete(id), removes from dropdown list immediately

Emit template_saved telemetry event on successful save.

Wire the PromptTemplateLibrary into: TextGenWorkspace, CodeGenWorkspace, ImageGenWorkspace, ASRWorkspace.

ACCEPTANCE CRITERIA FOR PHASE 6:
✓ After a successful text generation run, all LLM metrics appear in the EvaluationDrawer
✓ Pricing staleness: a model with pricing_updated 35 days ago shows amber '≈' badge; 95 days ago hides cost entirely (unit test with mocked registry dates)
✓ Context window >90% shows red progress bar (unit test)
✓ Every test run appears in the History tab
✓ History tab personal best card shows correct fastest TTFT after 3 runs (unit test)
✓ Export CSV opens a save dialog and produces a valid CSV
✓ Saving a prompt template with all params, then loading it, restores the exact params (unit test for each workspace)
✓ Template dropdown shows only templates for the current category
✓ SQLite write completes in <5ms for a test run (performance test)
✓ Empty template name shows validation error, does not save

HANDOFF: Commit to phase-6/evaluation-system. Phase 7 adds telemetry, Sentry error monitoring, the complete accessibility audit, and the production release pipeline.
```

---

## PHASE 7 — Telemetry, Crash Reporting, Accessibility Audit & Release Pipeline

```
You are continuing the ModelForge build. Phases 1–6 are complete. The core product is feature-complete for P0. Phase 7 hardens the app for production: telemetry, crash reporting, a full WCAG 2.1 AA audit, and the macOS release pipeline.

DELIVER THE FOLLOWING:

1. OPT-IN TELEMETRY (main/telemetry/telemetry.ts)

The telemetry system must be COMPLETELY INERT until the user explicitly opts in.
Where is consent stored: metadata table, key 'telemetry_enabled', value 'true'|'false'|'pending'

Consent prompt (shown in Onboarding step 1 if not yet answered — add to OnboardingStep1Welcome):
  Heading: t('telemetry.consentHeading')
  Body: t('telemetry.consentBody') — explain what is and isn't collected. Be specific.
  'Yes, share anonymous data' → writes 'true'
  'No thanks' → writes 'false'
  Both choices advance to step 2.
  The word 'anonymous' in the consent body must link to a privacy policy page (can be a placeholder URL for now).

Implement track() function per PRD T3.7:
  Only fires if telemetry_enabled === 'true'
  Uses PostHog SDK (self-hosted option available)
  distinct_id = app_instance_id from metadata (never PII)
  
ALLOWED_EVENTS (compile-time enforced via TypeScript const array + template literal type):
  'app_launched', 'onboarding_step_completed', 'provider_verify_attempt',
  'provider_verify_success', 'provider_verify_error', 'test_run_started',
  'test_run_completed', 'compare_mode_activated', 'template_saved',
  'export_triggered', 'registry_updated'

PROHIBITED in any event payload (enforced by a unit test):
  - Strings matching /sk-[a-zA-Z0-9]/, /xi-[a-zA-Z0-9]/, /Bearer\s+\S+/ — API key patterns
  - The words 'prompt', 'output', 'transcript' as payload keys
  - Any key containing 'path' or 'file'

Wire track() calls at the appropriate points:
  app_launched: in main.ts after BrowserWindow ready
  onboarding_step_completed: in each OnboardingStep component (already stubbed in Phase 3)
  provider_verify_attempt / success / error: in credentials.ipc.ts after verify IPC handler
  test_run_started / completed: in provider.ipc.ts
  compare_mode_activated: in modelStore.enableCompareMode
  template_saved: already wired in Phase 6
  export_triggered: in history.ipc.ts after showSaveDialog
  registry_updated: in registry-manager.ts after applying update

2. SENTRY ERROR MONITORING (main/telemetry/sentry.ts)

Initialize Sentry Electron SDK. Init only if telemetry_enabled === 'true'.
Capture unhandled exceptions in both main process AND renderer.

beforeSend hook — strip from every error event:
  - File path patterns: replace /\/Users\/[^\/]+\/[^\s"]+/g with '[filepath]'
  - API key patterns: replace /sk-[A-Za-z0-9]+/g, /xi-[A-Za-z0-9]+/g, /Bearer\s+\S+/g with '[REDACTED]'
  - event.extra.prompt, event.extra.output, event.extra.transcript: delete these keys
  - breadcrumbs: filter out any breadcrumb message containing file paths or key patterns

Sentry DSN: read from environment variable SENTRY_DSN at build time (electron-vite defines support).
Disabled: in development environment (process.env.NODE_ENV !== 'production').

3. WCAG 2.1 AA ACCESSIBILITY AUDIT & FIXES
Run a comprehensive audit of ALL P0 screens. This is a launch requirement, not optional.

Automated audit:
  Run axe-core via Playwright on each screen:
    HomeScreen, CatalogueScreen, ConnectionScreen (State A + B),
    OnboardingOverlay (all 4 steps), TestScreen (all 3 tabs), EvaluationDrawer
  
  Fix ALL violations. Common issues to address:
  - Missing aria-label on icon-only buttons (copy, download, regenerate, etc.)
  - Streaming output area (testStore.outputText display): must use <LiveRegion politeness='polite'>
    so VoiceOver announces new content as it streams
  - Colour contrast: run all colour token combinations through Colour Contrast Analyser
    Minimum 4.5:1 for body text, 3:1 for large text (≥18pt or ≥14pt bold)
    Fix any failing combinations by adjusting token values
  - Modal focus trap: when ConnectionModal or ConfirmationModal is open, Tab must not escape
    Use a focus trap hook (implement in packages/antigravity/src/hooks/useFocusTrap.ts)
  - Error identification: every form error must have role="alert" or be in an aria-live region
  - Resizable text: test all screens at macOS Accessibility → Display → Larger Text (200%)
    Fix any clipped or overlapping text
  - Skip link: add a "Skip to main content" link as the first focusable element in the app
    (appears on keyboard focus, hidden otherwise)

Manual VoiceOver test script:
  1. Navigate from app launch to running a text generation test using ONLY keyboard
  2. VoiceOver must announce: each category tile (name + connected count), connection success/failure,
     streaming output tokens, and evaluation metrics
  Document each test step with pass/fail.

4. PERFORMANCE HARDENING — verify all budgets from PRD T2.7 and T3.8:
  Renderer initial bundle < 500 KB gzipped (check with vite-bundle-visualizer)
  Monaco lazy chunk < 2 MB gzipped
  Three.js lazy chunk < 800 KB gzipped (will be used in Phase 10)
  Cold launch to interactive < 1.5s on M1 MacBook Air (Playwright performance.timing)
  Stream chunk → DOM update < 16ms (Chrome DevTools trace)
  SQLite write (test run) < 5ms (already validated in Phase 6, confirm here)
  Main process cold start to BrowserWindow ready < 800ms

Fix any budget violations with:
  - Additional dynamic imports (lazy-load workspaces on first activation)
  - Component memoization (React.memo on heavy list items like ModelRow)
  - Image optimization (use WebP for provider logos)

5. RELEASE PIPELINE (.github/workflows/)

release.yml (triggered by tag v*.*.*):
  Steps:
  1. Install deps: pnpm install
  2. Build: pnpm run build (electron-vite)
  3. Package: electron-builder --mac --universal
     Output: dist/ModelForge-{version}-universal.dmg
  4. Notarise: @electron/notarize with Apple ID + app-specific password from GitHub secrets
  5. Staple the notarisation ticket to the DMG
  6. Publish to GitHub Releases: upload DMG as release asset
  7. electron-updater: publish update metadata (latest-mac.yml) to releases

nightly.yml (cron: '0 2 * * *'):
  Matrix strategy over 10 providers: [openai, anthropic, nvidia_nim, gemini, deepgram,
    replicate, huggingface, stability, elevenlabs, cohere]
  For each: run the adapter's verify() using CI test API keys (GitHub secrets)
  On any failure: post to Slack via SLACK_WEBHOOK_URL secret
  The nightly job uses Node directly (no Electron needed) — run adapters in isolation

registry-publish.yml (triggered by push to registry/registry.json):
  1. Validate registry.json against JSON Schema
  2. Upload to Cloudflare R2 using wrangler CLI with R2_ACCOUNT_ID + R2_ACCESS_KEY secrets
  3. Invalidate CDN cache (Cloudflare API call)
  4. Post Slack notification with new registry_version

ACCEPTANCE CRITERIA FOR PHASE 7:
✓ Zero axe-core violations on all P0 screens (Playwright E2E test)
✓ VoiceOver test script: all 5 steps pass on macOS
✓ Telemetry: no event fires before consent is given (unit test + Playwright test)
✓ Telemetry: a mock track() call with a fake API key pattern is stripped in the prohibited payload test
✓ Sentry beforeSend strips file paths and key patterns (unit test with injected mock error)
✓ Release build: DMG produced, < 180 MB
✓ DMG passes macOS Gatekeeper on a clean macOS 14 install (tested manually in CI via a macOS runner)
✓ electron-updater: v1.0.0 → v1.0.1 update delivered successfully in staging
✓ Nightly smoke test: all 10 providers return verify_success with CI test keys
✓ All performance budgets met (automated checks in PR CI)

HANDOFF: Commit to phase-7/production-hardening. This completes the P0 MVP. Phase 8 adds P1 features: VLM, TTS, Embeddings, CV workspaces, Compare Mode for all categories, and history export.
```

---

## PHASE 8 — P1 Features: Remaining Workspaces & Compare Mode

```
You are continuing the ModelForge build. Phases 1–7 are complete. The P0 MVP is production-ready and notarised. Phase 8 adds all P1 features from the backlog.

DELIVER THE FOLLOWING:

1. WORKSPACE: IMAGE UNDERSTANDING / VLM (renderer/workspaces/VLMWorkspace.tsx)
Per PRD Section 5.4:
  Input: Image drop zone (JPG/PNG/WebP/GIF, max 20MB, validated in main via IPC), text question field,
    detail level toggle (low/high — only shown if model.supported_features includes 'detail_level' in registry)
  Output: Streamed text response via the standard streaming pattern
  Bounding box overlay: if metrics_json response contains detections array (YOLO or COCO JSON format),
    render as SVG overlay on the displayed image
    Bounding box colour = hashed from class label string (deterministic, distinct colours)
    SVG positioned absolutely over the image, using the image's natural vs displayed dimensions to scale coordinates

Implement execute() for: LLaVA (via Ollama adapter), GPT-4o Vision (OpenAI adapter image message),
Claude 3.5 Vision (Anthropic adapter image content block), Gemini Pro Vision (Gemini adapter).

2. WORKSPACE: TEXT-TO-SPEECH (renderer/workspaces/TTSWorkspace.tsx)
Per PRD Section 5.6:
  Input: Textarea with live character count and a progress bar showing count vs model.max_characters from registry
    Warning state at 90% of limit; disabled state at 100%
  Voice selector: dropdown listing available voices (fetched from provider on connect, cached in SQLite)
    Each voice option has a ▶ preview button that plays a sample clip (if provider supports preview)
  Speed slider (0.5x–2.0x), Pitch slider (shown only if model supports it), Emotion/style selector (if supported)
  Output: Inline audio player (wavesurfer.js, lazy loaded), Download button (MP3/WAV dropdown),
    Playback speed control (client-side on the <audio> element, 0.5x–2.0x)

Implement execute() for ElevenLabs adapter (response is binary audio, emit as base64 blob via test:done).

3. WORKSPACE: EMBEDDINGS / SEMANTIC SEARCH (renderer/workspaces/EmbeddingsWorkspace.tsx)
Per PRD Section 5.7:
  Input: Single text input OR batch mode toggle → CSV file upload or line-separated textarea
    Encoding format selector (float / base64 / int8 — options driven by model.supported_encodings in registry)
  Output:
    Vector preview: first 10 dimensions shown as a horizontal series of coloured cells (heatmap row)
      Colour scale: blue (negative) → white (zero) → red (positive)
      'Show full vector' button reveals all dimensions in a scrollable code block
    Dimension count: e.g., "1536 dimensions"
    Cosine similarity calculator:
      'Compare with another text' input
      On submit: call the same embedding API for the second text, compute cosine similarity client-side
      Display similarity score 0.00–1.00 with a label ('Very similar', 'Related', 'Unrelated')
    Batch mode: heatmap showing all vectors as rows (up to 20 rows; truncate with 'Show all')

Implement execute() for: text-embedding-3-large (OpenAI), nomic-embed-text (Ollama), NV-EmbedQA (NVIDIA NIM).

4. WORKSPACE: OBJECT DETECTION / CV (renderer/workspaces/CVWorkspace.tsx)
Per PRD Section 5.9:
  Input: Image drop zone. Confidence threshold slider (0.0–1.0, default 0.5).
    NMS threshold slider (0.0–1.0, shown only if model.supports_nms in registry, default 0.45)
  Output:
    Canvas element with bounding box overlays (not SVG — use canvas 2D API for performance with many boxes)
    Colour-coded by class label (deterministic colour hash from class name)
    Detection results table: Class | Confidence | x1 | y1 | x2 | y2
    Confidence threshold slider live-filters displayed detections (updates canvas without re-calling API)
    Export buttons:
      JSON (COCO format): { images, annotations, categories } structure
      CSV: one row per detection

Implement execute() for YOLOv10 (NVIDIA NIM) adapter.

5. EVALUATION METRICS — New categories
Add Embeddings metrics to EvaluationDrawer:
  Dimensions, Input Tokens, Throughput (strings/sec for batch), Cosine Similarity (if computed)

Add TTS metrics:
  Output Duration (seconds), Characters/Second, Output File Size (KB), Sample Rate (Hz), Voice ID Used

6. COMPARE MODE — ALL CATEGORIES (renderer/components/SplitWorkspacePanel.tsx)
Full per-category Compare Mode per PRD Compare Mode section.

SplitWorkspacePanel renders two instances of the active workspace side-by-side.
Input mirroring: by default, changing any input in the left panel immediately mirrors to the right panel.
Chain icon ⛓ between panels: when clicked, breaks the mirror link (each panel becomes independent).
Chain icon shows 'linked' state vs 'unlinked' state with accessible label.

Per-category differentiators (render below the outputs, in a 'Comparison' row):
  Text/Code/Chat: side-by-side diff highlight using a word-diff algorithm (compare final outputs)
    Token count delta badge: "{+120 tokens}" in amber if more, green if fewer
  Image Generation: toggle between side-by-side and overlay mode
    Overlay mode: stack both images with an opacity slider controlling blend
  ASR: diff highlighted words between transcript A and B (using diff-match-patch library)
    WER delta: shown if reference transcript was provided
  TTS: duration delta (seconds), file size delta (KB)
    'Play simultaneously' button: plays both audio players in sync
  Embeddings: cosine similarity between the two models' embeddings (auto-computed on test:done for both)
  Object Detection: detection count delta, class overlap summary (classes in both / only in A / only in B)
  Video Generation: independent async polling; labelled desktop notifications 'Model A ready' / 'Model B ready'
  3D Generation: polygon count delta, render time delta (both placeholders for Phase 10)

Emit compare_mode_activated telemetry event when Compare Mode is enabled.

7. WER COMPUTATION FOR ASR (renderer/workspaces/ASRWorkspace.tsx — enhancement)
Add to the ASR output panel, below the transcript:
  'Compute WER' section (collapsed by default):
    Textarea: 'Paste reference transcript here'
    On input: compute WER client-side using: (S + D + I) / N where S=substitutions, D=deletions,
      I=insertions, N=reference word count
    Algorithm: standard dynamic programming word-level edit distance
    Display: "WER: {x}%" with interpretation (Excellent <5%, Good <15%, Fair <30%, Poor >30%)
  Appears in EvaluationDrawer as a manually-entered metric

ACCEPTANCE CRITERIA FOR PHASE 8:
✓ VLM workspace: uploading an image and asking "What is in this image?" returns a text description
✓ Bounding box overlay renders correctly on a YOLO-format response (unit test with fixture)
✓ TTS workspace: ElevenLabs returns audio; wavesurfer waveform renders; download works
✓ Embeddings workspace: single text returns a vector; 'Show full vector' reveals all dimensions
✓ Cosine similarity calculator: "cat" vs "dog" returns ~0.8+ from a shared embedding model
✓ CV workspace: YOLO inference returns boxes; confidence threshold slider live-filters without re-calling API
✓ COCO JSON export validates against the COCO annotation schema (unit test)
✓ Compare Mode: text generation test runs on two models simultaneously; token count delta shown
✓ Compare Mode: image overlay mode opacity slider blends two images
✓ Breaking the mirror link in Compare Mode allows independent input on each side
✓ WER: "the cat sat on the mat" vs "the cat sat on a mat" = 1/6 ≈ 16.7% (unit test)

HANDOFF: Commit to phase-8/p1-features. Phase 9 adds P2 features: Reranking, Document Understanding, Music Generation, Windows support, and historical run comparison.
```

---

## PHASE 9 — P2 Features: Remaining Workspaces, Windows & Advanced History

```
You are continuing the ModelForge build. Phases 1–8 are complete. Phase 9 delivers all P2 backlog items.

DELIVER THE FOLLOWING:

1. WORKSPACE: RERANKING (renderer/workspaces/RerankerWorkspace.tsx)
Per PRD Section 5.8:
  Input:
    Query string: single-line input
    Candidate passages: dynamic list of textareas (add/remove rows)
      'Add passage' button appends a new textarea
      '×' removes a row (minimum 2 passages)
      'Import CSV' button: opens file dialog, parses CSV (one passage per row), populates the list
    Top-N selector: number input (default 10, max = passage count)
  Output:
    Ranked table: Original Rank | New Rank | Relevance Score | Score Delta column
    Score delta: green if score is above median, red if below, formatted as "+0.23" or "-0.11"
    Passage text preview in each row (first 100 chars, expandable)
  
Implement execute() for Cohere Rerank adapter (already stubbed in Phase 2).

2. WORKSPACE: DOCUMENT UNDERSTANDING (renderer/workspaces/DocumentWorkspace.tsx)
Input: PDF file picker (files:openDocumentPicker IPC handler — add this to files.ipc.ts, filter: .pdf)
  Text question input
Output: Structured text display:
  If model returns extracted tables: render as HTML table
  If model returns extracted fields (key-value): render as a definition list
  Text answer: streamed or returned as complete text

Implement execute() for: Claude 3.5 (PDF native via Anthropic adapter — base64 PDF in content block),
Gemini Flash (document adapter).

3. WORKSPACE: MUSIC / AUDIO GENERATION (renderer/workspaces/MusicGenWorkspace.tsx)
Per PRD Section 5.11:
  Input: Text prompt (style, mood, instrumentation description), duration selector (5s, 10s, 15s, 30s, 60s),
    seed input, optional melody conditioning: audio file upload (shown only if model supports it per registry)
  Output: Inline audio player with wavesurfer waveform, WAV/MP3 download button,
    Metadata overlay: BPM + key if returned in response metadata

Implement execute() for MusicGen Large (via Replicate adapter or HuggingFace adapter).

4. WINDOWS SUPPORT
  a. CredentialStore: confirm keytar's DPAPI path works on Windows.
     Add a platform check in credential-store.ts: if (process.platform === 'win32') — no code change needed,
     keytar handles it, but add a comment + integration test stub for future CI validation.
  b. electron-builder config (electron-builder.yml): add windows target:
       win:
         target: nsis
         signingHashAlgorithms: ['sha256']
       nsis:
         oneClick: false
         allowToChangeInstallationDirectory: true
  c. Code-signing pipeline: add to release.yml a conditional job for Windows signing
     (requires WINDOWS_CERTIFICATE secret — add stub with TODO comment for future setup)
  d. Cross-platform audit: search the codebase for any macOS-specific API calls outside CredentialStore.
     Fix any found. Add a CI lint rule checking for darwin-specific code outside the credential-store.ts file.

5. PER-MODEL PERSONAL BEST STATS CARD — enhance (Phase 6 built basic version)
  Add to the History tab personal best card:
    Most consistent latency: stddev of TTFT across last 20 runs (lower = more consistent)
    Best cost efficiency run: run with lowest cost-per-token
  Update card SQL: use window functions or subqueries in better-sqlite3 for efficient computation.

6. HISTORICAL RUN COMPARISON (renderer/screens/TestScreen — History tab enhancement)
  Add a 'Compare runs' mode to the History tab:
    Checkbox on each row (multi-select)
    'Compare selected' button appears when exactly 2 rows are checked
    Opens a comparison panel below the table (or a modal on smaller windows):
      Side-by-side display of all numeric metrics with delta indicators
      Green: current run is better (lower latency, lower cost, higher throughput)
      Amber: current run is worse
      Grey: same value
    Params comparison: diff view of params_json between the two runs (highlights changed fields)

ACCEPTANCE CRITERIA FOR PHASE 9:
✓ Reranking workspace: submitting a query + 5 passages returns a ranked table with correct score deltas
✓ Document workspace: uploading a PDF and asking "What is the total revenue?" returns the correct value from a test PDF
✓ Music generation workspace: MusicGen returns a playable audio clip
✓ Windows build: electron-builder produces an NSIS installer without errors (run on a Windows GitHub Actions runner)
✓ CredentialStore: no macOS-specific imports outside credential-store.ts (lint rule passes)
✓ Historical run comparison: selecting two history rows and comparing shows correct deltas (unit test)
✓ Params diff: changing temperature from 0.7 to 0.9 between two runs shows the diff correctly

HANDOFF: Commit to phase-9/p2-features. Phase 10 delivers P3 features: Video Generation, 3D Generation, Ollama sidecar, and the code execution sandbox (post security review).
```

---

## PHASE 10 — P3 Features: Video, 3D, Local Models & Code Execution

```
You are continuing the ModelForge build. Phases 1–9 are complete. Phase 10 delivers the P3 backlog. These features involve longer-running async jobs, WebAssembly sandboxing, and native process management.

DELIVER THE FOLLOWING:

1. WORKSPACE: VIDEO GENERATION (renderer/workspaces/VideoGenWorkspace.tsx)
Per PRD Section 5.10:

Async polling pattern:
  Video generation APIs return a job_id, not immediate output. The adapter must:
    POST to start job → receive job_id
    Poll status endpoint every 5 seconds (using setInterval in the main process)
    Emit job:progress IPC events with { requestId, status: 'queued'|'processing'|'completed'|'failed', progressPct?, eta? }
    On completed: fetch the output URL, download bytes, emit test:done

Input:
  Text prompt, optional reference image upload (files:openImagePicker IPC), duration selector (3s, 5s, 8s, 10s),
  aspect ratio selector (16:9, 9:16, 1:1 — options from model.supported_aspect_ratios in registry),
  motion intensity slider (if model supports it — from registry), seed input

Output:
  Progress bar: shows progressPct from job:progress events
  Estimated time remaining: countdown derived from eta field
  Status text: 'Queued...', 'Processing...', 'Almost ready...'
  Desktop notification on completion (Electron Notification API):
    title: "ModelForge — Video ready"
    body: t('video.notificationBody', { model: modelName })
    Click on notification → focuses the app window and selects the active workspace
  In-app video player: <video> element with controls after completion
  Download button (MP4)
  Thumbnail grid: last 3 generations as video thumbnails (screenshot first frame)

Implement execute() for CogVideoX adapter (via Replicate — async job pattern).
Implement execute() for Runway Gen-3 Alpha (direct API if available, else via Replicate).

2. WORKSPACE: 3D GENERATION (renderer/workspaces/Gen3DWorkspace.tsx)
Per PRD Section 5.12:

Three.js viewer must run in a CONTEXT-ISOLATED renderer process (a separate hidden BrowserWindow or
a sandboxed <webview> tag). This isolates Three.js from the main renderer process.

Implementation approach:
  Create a second BrowserWindow (3d-viewer.html) with:
    contextIsolation: true, nodeIntegration: false, sandbox: true
    Load Three.js r160 and render the 3D scene inside it
  Main renderer communicates with the 3D viewer window via a separate IPC channel: '3d:loadModel'
  The 3D viewer window emits '3d:ready' when the scene has loaded

Input: Text prompt OR reference image upload, quality preset (fast/balanced/high)
Output (rendered in the Three.js viewer BrowserWindow embedded via <iframe> with allow="..."):
  3D model with OrbitControls (click and drag to rotate, scroll to zoom)
  Download button: .obj or .glb format (dropdown)
  Polygon count: displayed below the viewer ("42,318 polygons")
  Render time delta in Compare Mode

Implement execute() for TripoSR (via Replicate async job pattern).

3. OLLAMA SIDECAR INTEGRATION (main/local-models/ollama-manager.ts)

Manage an Ollama child process from the Electron main process:

  OllamaManager:
    start(): spawn Ollama process via child_process.spawn('ollama', ['serve'])
      Check if Ollama is installed: try to locate binary via which/where
      If not installed: show a notification with a link to ollama.ai/download
    stop(): gracefully terminate the process on app quit
    pull(modelName): run `ollama pull {modelName}` as a child process
      Emit progress events via IPC as stdout is parsed
    listInstalled(): call localhost:11434/api/tags → return installed models
    unload(modelName): call DELETE /api/tags/{modelName}

'My Downloads' section in the sidebar (below the CategoryList):
  Collapsible section: 'Local Models ({count})'
  Each item: model name | size on disk | version | 'Update' button | 'Delete' button
  'Update' button: runs pull again; if new version exists, replaces the model
  Disk usage: shown per model and as total at the bottom of the section
  'Download more' link: navigates to the Catalogue with 'Local available' filter pre-applied

Wire OllamaManager: start on app launch (non-blocking; show 'Ollama starting...' in sidebar if takes >2s),
stop in app.on('will-quit').

4. CODE EXECUTION SANDBOX (REQUIRES SECURITY REVIEW — IMPLEMENT WITH FULL TESTS)

NOTE: This feature MUST NOT ship without a completed security review checklist.
Create docs/security-review-code-execution.md and fill in every item before merging.

Implementation using WebAssembly-based isolation:

Python execution via Pyodide:
  Load Pyodide in a SANDBOXED renderer iframe (sandbox="allow-scripts", no allow-same-origin)
  The iframe has NO access to contextBridge, no Node.js APIs, no filesystem access
  Communication: postMessage API between renderer and iframe
  Timeout: 10 seconds max execution; terminate worker if exceeded
  Supported stdlib modules: math, json, re, datetime, collections, itertools (explicit allowlist)
  BLOCKED: os, sys, subprocess, socket, http, urllib, importlib, eval, exec

JavaScript execution via QuickJS-NG compiled to WASM:
  Same sandboxed iframe approach
  No access to window, document, XMLHttpRequest, fetch, or any browser globals
  Execution timeout: 5 seconds

UI integration (CodeGenWorkspace.tsx — replaces 'Copy to clipboard' hint):
  'Run in sandbox' button appears below the output Monaco editor
  Shows a results panel below the code: stdout, stderr, exit code, execution time
  Error messages are sanitized (no file paths or system info in display)
  A persistent disclaimer: t('codeExecution.disclaimer') — 'Code runs in an isolated environment'

SECURITY CHECKLIST for docs/security-review-code-execution.md:
  [ ] Pyodide runs only in a sandboxed iframe (sandbox attribute confirmed, no allow-same-origin)
  [ ] QuickJS-NG runs only in a sandboxed iframe
  [ ] No eval() in main process or renderer process outside the sandboxed iframe
  [ ] ESLint no-eval rule passes across all non-iframe files
  [ ] Execution timeouts enforced at 10s (Python) and 5s (JS) — tested with an infinite loop
  [ ] Allowlisted Python stdlib only — test that `import os` raises ImportError
  [ ] No network access from executed code — test that `import urllib` raises ImportError
  [ ] postMessage messages are validated (type-checked on receipt; malformed messages rejected)
  [ ] No user-provided code is ever sent to any AI provider or telemetry system
  [ ] Code execution output is NOT included in test_runs metrics_json

5. LINUX SUPPORT (stretch goal — document as todo if not fully completed)
  libsecret credential storage: keytar already supports Secret Service API on Linux
  electron-builder linux target: add AppImage format
  CI pipeline: add a Linux build job using ubuntu-latest runner
  Test: run all unit tests on Linux runner

ACCEPTANCE CRITERIA FOR PHASE 10:
✓ Video generation: CogVideoX job polls until complete; progress bar advances; desktop notification fires
✓ Clicking the completion notification brings the app to the foreground and shows the video
✓ 3D workspace: Three.js viewer loads a TripoSR output .glb file and orbit controls work
✓ Ollama sidecar: OllamaManager starts Ollama on app launch (if installed); listInstalled() returns models
✓ 'My Downloads' sidebar section lists installed local models with size and version
✓ Code execution sandbox: Python `print("hello")` returns 'hello' in the results panel
✓ Code execution sandbox: `import os` raises ImportError (security test)
✓ Code execution sandbox: infinite loop (`while True: pass`) is terminated after 10 seconds
✓ Security review checklist: all items checked before merge (reviewer: human engineer)
✓ ESLint no-eval: zero violations across all non-iframe files

FINAL HANDOFF: Commit to phase-10/p3-features. Tag v1.0.0 for the Phase 7 build, v1.1.0 for Phase 8, v1.2.0 for Phase 9, and v2.0.0 for Phase 10.
```

---

## Phase Summary

| Phase | Name | Tasks | Priority Coverage |
|---|---|---|---|
| 1 | Monorepo Foundation | T-001–T-006 | Infrastructure |
| 2 | Core Infrastructure | T-007–T-013 | Infrastructure / P0 |
| 3 | App Shell & Navigation | T-014–T-017 | P0 |
| 4 | Connection Layer | T-018–T-019 | P0 |
| 5 | P0 Workspaces | T-020–T-024 | P0 |
| 6 | Evaluation System | T-025–T-028 | P0 |
| 7 | Telemetry, A11y & Release | T-029–T-033 | P0 (launch gate) |
| 8 | P1 Workspaces & Compare Mode | T-034–T-040 | P1 |
| 9 | P2 Features & Windows | T-041–T-046 | P2 |
| 10 | P3 Features | T-047–T-052 | P3 |

**Release milestones:**
- `v1.0.0` → Phase 7 complete (P0 MVP, notarised macOS build)
- `v1.1.0` → Phase 8 complete (all P1 workspaces, Compare Mode)
- `v1.2.0` → Phase 9 complete (P2 workspaces, Windows support)
- `v2.0.0` → Phase 10 complete (Video, 3D, local models, code sandbox)
