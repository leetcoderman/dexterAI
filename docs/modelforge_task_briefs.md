# ModelForge — Task Briefs

> All tasks are derived from PRD v2.0. Each brief includes the owning phase, acceptance criteria, and key technical references from the PRD's engineering spec (Part B).

---

## FOUNDATION (Phase 1)

### T-001 · Monorepo Scaffold
**Phase:** 1 | **Priority:** P0

Set up the pnpm monorepo with the following workspace packages as defined in PRD T1:
- `apps/desktop` — Electron entry point
- `packages/antigravity` — internal React component library stub
- `packages/registry-types` — shared TypeScript types
- `packages/i18n` — translation files (`en.json`)
- `packages/shared-utils` — pure utility functions
- `registry/registry.json` — bundled model registry

**Acceptance criteria:**
- `pnpm install` succeeds from root
- TypeScript project references wired between packages
- Shared ESLint + Prettier config applied across all packages
- `pnpm build` compiles all packages without errors

---

### T-002 · Electron Shell Bootstrap
**Phase:** 1 | **Priority:** P0

Configure the Electron app using `electron-vite` (v2.x) with the three-process architecture: `main.ts`, `preload.ts`, and `renderer/app.tsx`. Enforce security defaults:
- `contextIsolation: true`
- `nodeIntegration: false` on all `BrowserWindow` instances
- Content Security Policy: `default-src 'self'`; no `eval`, no inline scripts

Target: macOS Universal binary (Apple Silicon + Intel) via `@electron/universal`.

**Acceptance criteria:**
- `pnpm dev` launches the Electron window with HMR on the renderer
- Main process restarts on file change
- DevTools accessible in development; disabled in production
- Security flags confirmed in `BrowserWindow` config

---

### T-003 · Antigravity Component Library Stub
**Phase:** 1 | **Priority:** P0

Create the `packages/antigravity` package. Implement the foundational components that all feature screens will depend on:
- `Button` (primary, secondary, destructive variants)
- `Input` (text, password with show/hide toggle)
- `Modal` (with confirmation variant)
- `Toast` (success, error, warning)
- `AsyncBoundary` (wraps React Suspense + ErrorBoundary)
- `LiveRegion` (aria-live polite wrapper for streamed output)
- Focus-ring CSS token applied globally

All components must use design tokens (`--color-primary`, `--color-surface`, etc.) — no hardcoded hex values. All interactive elements must expose correct `tabIndex` and ARIA attributes per WCAG 2.1 AA (PRD Accessibility section).

**Acceptance criteria:**
- All components render in isolation (Storybook or simple dev harness)
- `focus-ring` token visible on keyboard navigation
- `LiveRegion` announces content changes to macOS VoiceOver

---

### T-004 · i18n Infrastructure
**Phase:** 1 | **Priority:** P0

Wire `react-i18next` into the renderer. Create `packages/i18n/en.json` as the single source of truth for all user-visible strings. Enforce:
- `t('key')` hook pattern throughout — no hardcoded English strings in JSX
- `Intl.DateTimeFormat` for all dates
- `Intl.NumberFormat` for token counts and costs
- Logical CSS properties (`margin-inline-start`, not `margin-left`) for future RTL support

**Acceptance criteria:**
- Hardcoded string lint rule rejects PRs with raw English in JSX
- `en.json` contains all strings from every screen implemented so far
- Date and number formatting respects system locale in tests

---

### T-005 · SQLite Database Setup
**Phase:** 1 | **Priority:** P0

Implement `better-sqlite3` in the main process with a versioned migration system. Apply the full schema from PRD T3.4:
- `connections` table
- `test_runs` table (with indexes on `model_id` and `category`)
- `prompt_templates` table
- `metadata` table (schema version, registry version, app instance UUID, telemetry consent)

Write migrations as numbered SQL files: `db/migrations/001_initial.sql`, etc. Apply migrations on every app launch before any other DB operation.

**Acceptance criteria:**
- DB file created in `app.getPath('userData')` on first launch
- All four tables exist after migration
- Schema version stored in `metadata` table
- Migration is idempotent (running twice does not error)

---

### T-006 · CI Pipeline — PR Checks
**Phase:** 1 | **Priority:** P0

Configure GitHub Actions `pr-checks.yml` as specified in PRD T5:
1. ESLint + Prettier
2. TypeScript typecheck
3. Vitest unit tests
4. Bundle size check (fail if renderer initial bundle > 500 KB gzipped)

**Acceptance criteria:**
- All four jobs run on every PR to `main`
- Bundle size check uses Vite bundle analyser output
- Test job reports Vitest pass/fail with coverage summary

---

## CORE INFRASTRUCTURE (Phase 2)

### T-007 · IPC Bridge (Preload / contextBridge)
**Phase:** 2 | **Priority:** P0

Implement the complete `window.modelforge` API surface defined in PRD T2.1 in `preload.ts`. Every method returns a `Promise`. Typed interface covers:
- `credentials` — `save`, `delete`, `exists`, `listConnected` (**no** `getKey`)
- `provider` — `verify`, `test`, `cancelTest`
- `registry` — `getModels`, `checkForUpdate`, `applyUpdate`
- `history` — `getRunsForModel`, `exportAsCSV`, `deleteRun`
- `templates` — `list`, `save`, `delete`
- `on(channel, handler)` event subscriptions for: `test:chunk`, `test:done`, `test:error`, `registry:updated`, `job:progress`

**Acceptance criteria:**
- TypeScript type for `window.modelforge` exported from `preload.ts` and consumed by renderer without type errors
- Calling `credentials.getKey` or any method not in the spec throws a type error at compile time
- All `on()` subscriptions return an `UnsubscribeFn` that correctly removes the listener

---

### T-008 · Credential Store (keytar)
**Phase:** 2 | **Priority:** P0

Implement `CredentialStore` in `main/credentials/credential-store.ts` exactly as specified in PRD T3.3:
- Service name: `'modelforge'`
- Account format: `'{providerId}:{appInstanceId}'`
- `appInstanceId` = UUID generated on first launch, stored in `metadata` SQLite table
- Extra fields (org_id, project_id, etc.) stored as `'{account}:{key}'` sub-entries
- `delete()` cleans up all sub-entries for a provider
- `get()` is only callable from main process — never exposed via preload

**Acceptance criteria:**
- API key survives app restart (confirmed by reading back from Keychain)
- `delete()` removes both primary key and all extra fields
- Renderer cannot call `keytar.getPassword()` directly (confirmed by type boundary)
- Credential collision test: two test provider IDs store independent keys

---

### T-009 · ProviderAdapter — Base Class & Registry
**Phase:** 2 | **Priority:** P0

Implement `BaseProviderAdapter` from PRD T3.1:
- Abstract methods: `verify()`, `execute()`
- Protected `withRetry()` with exponential backoff and `retry-after` header respect
- Protected `extractRateLimit()` for `x-ratelimit-remaining-requests` header parsing
- `AdapterRegistry` singleton that maps `provider_id` strings to adapter instances

Create the `IPCEmitter` type and wiring so adapters can emit `test:chunk`, `test:done`, `test:error` events to the renderer via the IPC bridge.

**Acceptance criteria:**
- `AdapterRegistry.get('unknown-provider')` throws a typed `UnknownProviderError`
- `withRetry` correctly backs off on 429 with `retry-after` header
- IPC events are received by the renderer in a unit test using a mock emitter

---

### T-010 · ProviderAdapter Implementations — Top 10 Providers
**Phase:** 2 | **Priority:** P0

Implement concrete adapters for the 13 providers listed in the PRD connection matrix. Each adapter in `main/adapters/`:
1. `openai.adapter.ts` — Bearer, OpenAI SDK, optional `organization`
2. `anthropic.adapter.ts` — `x-api-key` header, `@anthropic-ai/sdk`, `anthropic-version` header (see PRD T3.1 example)
3. `nvidia-nim.adapter.ts` — Bearer, OpenAI-compatible with custom `baseURL`
4. `gemini.adapter.ts` — query param `?key=`, `@google/generative-ai`
5. `vertex.adapter.ts` — OAuth2 Bearer, `@google-cloud/aiplatform`, requires `project_id` and `location`
6. `deepgram.adapter.ts` — Bearer `Token`, `@deepgram/sdk`, WebSocket for streaming
7. `replicate.adapter.ts` — Bearer `Token`, `replicate` npm, version hash per model
8. `huggingface.adapter.ts` — Bearer, plain fetch, `model_id` in URL path
9. `stability.adapter.ts` — Bearer, plain fetch, `organization` header optional
10. `elevenlabs.adapter.ts` — `xi-api-key` header, plain fetch, `voice_id` per request
11. `cohere.adapter.ts` — Bearer, `cohere-ai` npm
12. `ollama.adapter.ts` — no auth, localhost, model must be pulled first
13. `assemblyai.adapter.ts` — `authorization` header key, `assemblyai` npm, WebSocket for real-time

Each adapter must implement `verify()` using the lightweight endpoint from the registry's `verify_endpoint` field, and map provider-specific errors to the standard `ProviderError` shape used in the error handling matrix (PRD Screen 3).

**Acceptance criteria:**
- Each adapter's `verify()` returns `{ success: true }` against a valid key (tested in nightly CI with real test keys)
- Each adapter maps 401 → `INVALID_KEY`, 403 → `INSUFFICIENT_PERMISSIONS`, 429 → `RATE_LIMITED`, 404 → `MODEL_NOT_FOUND`, 503 → `PROVIDER_MAINTENANCE`, network error → `NETWORK_UNREACHABLE`
- Ollama adapter tests against `localhost:11434` in CI via a local Ollama process

---

### T-011 · IPC Handler Registration — All Domains
**Phase:** 2 | **Priority:** P0

Wire all IPC handlers in the main process following the pattern in PRD T3.2:
- `credentials.ipc.ts` — `credentials:save`, `credentials:delete`, `credentials:exists`, `credentials:listConnected`
- `provider.ipc.ts` — `provider:verify`, `provider:test`, `provider:cancel` (with `AbortController` tracking in `ActiveRequests` map)
- `history.ipc.ts` — `history:getRuns`, `history:exportCSV`, `history:deleteRun`
- `registry.ipc.ts` — `registry:getModels`, `registry:checkForUpdate`, `registry:applyUpdate`
- `templates.ipc.ts` — `templates:list`, `templates:save`, `templates:delete`
- `files.ipc.ts` — `files:openAudioPicker`, `files:openImagePicker` (spec in PRD T3.6), with extension validation

**Acceptance criteria:**
- All handlers registered in `main.ts` before `BrowserWindow` is created
- `provider:cancel` correctly aborts an in-flight streaming request (tested via a mock adapter with a 2s delay)
- File extension validation rejects a `.exe` path silently and returns `null`

---

### T-012 · Registry Manager
**Phase:** 2 | **Priority:** P0

Implement `loadRegistry()` from PRD T3.5 with three-tier fallback:
1. Remote CDN fetch with 5s timeout and `max-age=3600`
2. Local cache at `app.getPath('userData')/registry-cache.json`
3. Bundled fallback at `registry/registry.json`

Version comparison uses CalVer (`YYYY.MM.patch`). Emit `registry:updated` IPC event to renderer if remote version is newer. Write `registry_version` to `metadata` SQLite table after successful remote fetch.

**Acceptance criteria:**
- App launches without network (offline test) using bundled registry
- App updates the cache file when a newer remote version is available
- `registry:updated` event fires exactly once per session when a new version is found
- 5s timeout does not block app launch (registry fetch is non-blocking; UI renders from cache while fetch completes)

---

### T-013 · Model Registry JSON — v1 Seed Data
**Phase:** 2 | **Priority:** P0

Populate `registry/registry.json` with 100+ models covering all 13 categories. Each entry must conform to the schema in PRD Registry Governance section:
- Required fields: `id`, `display_name`, `provider_id`, `category`, `model_string`, `release_date`, `licence_type`, `connection_config`
- Optional: `param_count_b`, `context_window`, `local_available`, `local_download_url`, `huggingface_id`, `pricing`, `tags`, `deprecated`

Include at minimum the example models listed in the PRD taxonomy table (Step 2), plus coverage ensuring every provider has at least 3 models.

**Acceptance criteria:**
- JSON validates against a JSON Schema generated from `packages/registry-types/src/registry.ts`
- Every `provider_id` references a provider with a corresponding adapter
- Every model with `local_available: true` has a `local_download_url`
- No `deprecated: true` models in the initial seed (clean slate)

---

## APP SHELL & NAVIGATION (Phase 3)

### T-014 · Application Router & Layout Shell
**Phase:** 3 | **Priority:** P0

Implement the top-level screen routing and persistent layout from PRD T2.3:
- Custom `TitleBar` with macOS traffic light buttons and global search bar
- `Sidebar` with `CategoryList` (collapsible sections), `ModelListItem`, and `SettingsButton`
- `MainPanel` that renders the correct screen based on selection state:
  - No selection → `HomeScreen`
  - Category selected, no model → `CatalogueScreen`
  - Model selected, not connected → `ConnectionScreen`
  - Model selected, connected → `TestScreen`

State managed by `modelStore` (Zustand) per PRD T2.2.

**Acceptance criteria:**
- All four main panel states render without crashing
- Sidebar correctly reflects `connectedProviders` from `modelStore`
- Keyboard navigation traverses sidebar → main panel via Tab
- macOS traffic light buttons function correctly (minimise, maximise, close)

---

### T-015 · Home Screen — Use-Case Gallery
**Phase:** 3 | **Priority:** P0

Build `HomeScreen` with 13 `CategoryTile` components in a responsive grid (2 columns at 1280px, 3 columns at 1440px+). Each tile shows:
- Category icon
- Category name (from `en.json`)
- Connected model count badge (derived from `connectedProviders` × registry)
- 'New' indicator for models added since last app launch (stored in `metadata` table as `last_launch_at`)

Include:
- Global search bar filtering across model name, provider, and tags
- 'Connected only' filter chip
- Registry update notification bar when `registry:updated` event fires

**Acceptance criteria:**
- All 13 tiles render with correct icons and names
- Connected count badge updates immediately after a provider is connected/disconnected
- 'New' badge uses `last_launch_at` from metadata (not a hardcoded 14-day window)
- Search filters tiles in < 100ms for 1000 models (tested with a large mock registry)

---

### T-016 · Model Catalogue Screen
**Phase:** 3 | **Priority:** P0

Build `CatalogueScreen` rendering all models for the selected category. Each `ModelRow` shows: model name, provider logo, release date, parameter count, licence type, connection status badge.

Sort options: Release Date, Provider, Popularity, Licence.
Filter chips: Provider, Licence Type, Local-available.

Popularity sort: fetch `https://huggingface.co/api/models?sort=likes` using the bundled read-only HF token. Cache results per session. Degrade gracefully (disable sort option) if fetch fails or token is exhausted.

**Acceptance criteria:**
- Default sort is Release Date descending
- All four sort options work without page reload
- Filter chips are multi-select (e.g., filter by two providers simultaneously)
- Popularity fetch result is cached for the session (not re-fetched on tab switch)
- Connection status badge reflects live `connectedProviders` state

---

### T-017 · Onboarding Flow — 4-Step Overlay
**Phase:** 3 | **Priority:** P0

Build `OnboardingOverlay` shown on first launch (detected by absence of `onboarding_completed` in `metadata` table). Four steps per PRD Step 3:

1. `OnboardingStep1Welcome` — app name, value prop, 'Get started' CTA, 'Skip' option
2. `OnboardingStep2CategoryPick` — 13 category cards; click anchors the onboarding to that category
3. `OnboardingStep3Connect` — providers for chosen category, sorted by 'easiest free API key', each with a direct link to their key generation page; API key form + Verify button inline
4. `OnboardingStep4FirstTest` — auto-navigate to test workspace with starter prompt; tooltip overlay on key controls

On skip or completion, write `onboarding_completed: true` to `metadata`. Emit `onboarding_step_completed` telemetry event per step.

**Acceptance criteria:**
- Overlay does not appear on second launch
- 'Skip' correctly bypasses to home screen and marks onboarding complete
- Completing step 3 successfully navigates to step 4 without re-entering the key
- Starter prompts are defined per category in `en.json`
- Tooltip overlay highlights: prompt input, Run button, Evaluation drawer

---

## CONNECTION LAYER (Phase 4)

### T-018 · Connection Screen — State A (Not Connected)
**Phase:** 4 | **Priority:** P0

Build `ConnectionScreen` State A for unauthenticated models. Per PRD Screen 3:
- `ProviderInfoCard`: provider logo, docs link, pricing link, status page link, free tier indicator (all from registry `connection_config`)
- `ApiKeyForm`: password-masked input with Show toggle, conditional extra fields rendered dynamically from registry `connection_config` (org_id, project_id, etc.) with inline help text
- 'Verify Connection' button → spinner + 'Verifying…' state → calls `window.modelforge.provider.verify()`
- On success: green banner, key stored, connection timestamp written to SQLite
- On failure: display error from the 9-scenario error handling matrix (PRD Screen 3 Error Matrix)

**Acceptance criteria:**
- All 9 error scenarios render the correct user message and action link
- Extra fields appear only for providers that require them (tested for OpenAI org_id and Vertex project_id)
- API key is never logged, never appears in error messages
- 'Show' toggle reveals/hides the key text
- Accessibility: form errors announced via aria-live, not colour alone

---

### T-019 · Connection Screen — State B (Already Connected)
**Phase:** 4 | **Priority:** P0

Build `ConnectionScreen` State B showing:
- Provider name, connection timestamp, last test date, cumulative token count
- 'Re-verify' button (runs same lightweight verify call)
- 'Disconnect' button — red outline, single confirmation modal ('Remove API key for [Model]? This cannot be undone.') → calls `credentials.delete()`, resets status
- 'Open Test Environment' primary CTA → navigates to `TestScreen`

**Acceptance criteria:**
- Disconnect modal requires explicit confirmation before deletion
- After disconnect, `connectedProviders` in Zustand is immediately updated (tile count updates)
- 'Re-verify' shows inline success/failure without navigating away
- Token count displays with `Intl.NumberFormat` formatting

---

## TEST WORKSPACES — P0 BATCH (Phase 5)

### T-020 · Test Screen Shell
**Phase:** 5 | **Priority:** P0

Build the `TestScreen` layout wrapper:
- `TestScreenHeader`: model name, provider logo, re-verify link, disconnect link
- `TabBar`: Test | History | Evaluation tabs
- `CompareModeToggle`: visible when ≥ 2 models in same category are connected; activates `SplitWorkspacePanel`
- `WorkspacePanel` rendering the correct workspace component based on `activeModel.category`
- `EvaluationDrawer`: collapsible panel at bottom, shown after each test run with all applicable metrics

Streaming output pattern must match PRD T2.4 exactly: subscribe to IPC events before calling `provider.test()`, use `useTransition` for non-blocking DOM updates during rapid chunk appends.

**Acceptance criteria:**
- Tab switching between Test / History / Evaluation does not re-mount the workspace
- `EvaluationDrawer` opens automatically after `test:done` event
- `useTransition` prevents dropped frames during 50 chunks/second stream test (measured in DevTools)
- `CompareModeToggle` only appears when the precondition (2+ connected models, same category) is met

---

### T-021 · Workspace: Text Generation / Chat
**Phase:** 5 | **Priority:** P0

Build `TextGenWorkspace` per PRD Section 5.1:

**Inputs:**
- Multi-line resizable prompt editor
- Collapsible system prompt field
- Conversation history (chat bubble thread)
- Temperature slider (0.0–2.0, step 0.1)
- Max tokens input
- Top-p slider (0.0–1.0)
- Stop sequences input (comma-separated tags)
- Advanced section (collapsed): seed, frequency penalty, presence penalty, JSON mode toggle, `response_format` selector, tool definitions (Monaco JSON editor — lazy loaded)

**Output:**
- Streamed token display with live token counter
- Regenerate button (re-runs with same params)
- Copy button

Construct `TextGenParams` (PRD T2.5) and dispatch via `provider.test()`.

**Acceptance criteria:**
- Tokens stream and counter increments in real time
- Regenerate correctly resets output and re-runs
- Advanced panel toggles without layout shift
- `TextGenParams` type is fully satisfied before `provider.test()` is called (TypeScript enforced)

---

### T-022 · Workspace: Code Generation
**Phase:** 5 | **Priority:** P0

Build `CodeGenWorkspace` per PRD Section 5.2:

**Inputs:**
- Language selector dropdown (populated from a language list in `en.json`)
- Task description textarea
- Optional context code pane (Monaco editor, lazy-loaded, syntax-highlighted)
- Test input/output pair fields

**Output:**
- Monaco editor (read-only) with syntax highlighting
- Copy button
- Diff toggle showing changes vs. input context code
- 'Copy to clipboard' button with tooltip: 'Paste this into your IDE or a Jupyter notebook to run.' (Code execution deferred to P3 per PRD security decision)

**Acceptance criteria:**
- Monaco editor only loads when `CodeGenWorkspace` is activated (lazy import)
- Diff view is shown only when context code was provided as input
- 'Copy to clipboard' tooltip sets correct user expectations (no execution)

---

### T-023 · Workspace: Image Generation
**Phase:** 5 | **Priority:** P0

Build `ImageGenWorkspace` per PRD Section 5.3:

**Inputs:**
- Prompt textarea
- Negative prompt textarea
- Seed input with 'Random' button
- Width/height sliders constrained to aspect ratios from model's registry entry
- Steps slider
- Guidance scale slider
- Style preset dropdown (rendered only if model supports it, per registry)

**Output:**
- Full-width generated image display
- Download button (PNG/JPEG/WebP)
- Metadata overlay: seed used, actual dimensions
- Generation history filmstrip: last 5 results, clickable to restore params

Construct `ImageGenParams` (PRD T2.5) and dispatch via `provider.test()`.

**Acceptance criteria:**
- Filmstrip persists within the session (in Zustand state)
- Clicking a filmstrip item restores the exact params used for that generation
- Downloading saves the correct format based on model output
- Aspect ratio constraints are sourced from the registry, not hardcoded

---

### T-024 · Workspace: Audio Transcription (ASR)
**Phase:** 5 | **Priority:** P0

Build `ASRWorkspace` per PRD Section 5.5:

**Inputs:**
- File picker via `files:openAudioPicker` IPC (WAV/MP3/M4A/FLAC/OGG/OPUS)
- Live microphone record button with waveform visualiser (Web Audio API, lazy-loaded `wavesurfer.js`)
- Language selector (ISO 639-1 codes + 'Auto')
- Model-specific toggles: diarization, punctuation, timestamps (`none`/`word`/`utterance`), `smart_format`

**Output:**
- Transcript text
- If timestamps returned: clickable words that seek the inline audio player
- Speaker labels if diarization enabled
- Export buttons: SRT / VTT / plain TXT

Construct `ASRParams` (PRD T2.5) and dispatch via `provider.test()`.

**Acceptance criteria:**
- File picker filters to audio extensions only
- Microphone record button requests permission gracefully and handles denial
- Timestamp words seek the audio player on click
- SRT/VTT export format is spec-compliant (validated against a known SRT fixture)
- `wavesurfer.js` only loads when `ASRWorkspace` is activated

---

## EVALUATION SYSTEM (Phase 6)

### T-025 · Evaluation Metrics Capture
**Phase:** 6 | **Priority:** P0

Implement the metrics collection logic that fires after every test run. All metrics are computed in the main process and emitted via `test:done`. Per PRD sections 6.1–6.7:

**Universal metrics (all categories):** TTFT, Total Response Time, HTTP Status, Request Size, Response Size, Model ID, Provider, Timestamp, App Version.

**LLM metrics** (text/code/chat/document): Prompt Tokens, Completion Tokens, Total Tokens, Tokens/Second, Estimated Cost (with `pricing_updated` staleness check — amber badge if >30 days, hidden if >90 days), Context Window Used %, Finish Reason, Cache Hit detection (Anthropic `cache_read_input_tokens`, OpenAI `cached_tokens`).

**Image metrics:** Generation Latency, Seed Used, Image Dimensions, File Size, Steps Executed, Safety Filter Triggered.

**ASR metrics:** Audio Duration, RTF, Speaker Count, Average Word Confidence, Language Detected.

**TTS metrics:** Output Duration, Characters/Second, Output File Size, Sample Rate, Voice ID Used.

**CV metrics:** Objects Detected, Unique Classes, Average Confidence, Inference Latency, Input Resolution.

**Acceptance criteria:**
- All universal metrics captured for every successful test run regardless of category
- Estimated cost shows amber 'approx.' badge when pricing data is 31 days old (unit test with mocked date)
- Estimated cost column hidden when pricing data is 91 days old
- Cache hit badge shown for Anthropic and OpenAI when `cache_read_input_tokens > 0`
- TTFT uses `performance.now()` delta, not `Date.now()` (unit test confirms sub-millisecond precision)

---

### T-026 · Evaluation Drawer UI
**Phase:** 6 | **Priority:** P0

Build `EvaluationDrawer` shown at the bottom of `TestScreen` after each test. Displays all applicable metrics for the current model category with colour coding:
- TTFT: green <500ms, amber <2000ms, red >2000ms
- HTTP Status: 200 green, 4xx red, 5xx orange
- Context Window Used %: red badge if >90%

Drawer is collapsible. State persists per session (open/closed preference in `settingsStore`).

**Acceptance criteria:**
- Correct metric subset shown per category (no LLM metrics shown for image gen, etc.)
- Colour coding matches PRD T2.1 display specs
- ARIA labels on all metric values for screen reader announcement

---

### T-027 · Test Run History — Persistence & History Tab
**Phase:** 6 | **Priority:** P0

Persist every test run to the `test_runs` SQLite table immediately after `test:done`. Implement the History tab in `TestScreen`:
- Sortable table: TTFT, cost, tokens, finish reason, timestamp
- Click a row to view full metrics
- Delete individual runs
- Personal best card per model: fastest TTFT, lowest cost/1k tokens, highest throughput

**Acceptance criteria:**
- Test run is written to DB within 5ms of `test:done` (measured in CI smoke test)
- History tab renders without full-page reload on tab switch
- Deleting a run removes it from the UI immediately (optimistic update)
- Personal best card updates correctly after a new run beats a previous best

---

### T-028 · Prompt Template Library
**Phase:** 6 | **Priority:** P0 *(reclassified from P2 in PRD v2.0)*

Implement the prompt template system backed by the `prompt_templates` SQLite table:
- 'Save as Template' button in every prompt input field (TextGen, CodeGen, ASR, ImageGen, etc.)
- Template name input (inline, not a modal)
- Templates dropdown above prompt field showing category-scoped templates
- One-click load (populates all workspace params from template snapshot)
- One-click delete (confirmation not required for templates)
- Templates are scoped per category (text gen templates not shown in image gen workspace)

Emit `template_saved` telemetry event on save.

**Acceptance criteria:**
- Template saves the full `params_json` snapshot (all workspace params, not just prompt text)
- Loading a template populates all param fields (temperature, system prompt, etc.), not just the prompt
- Category scoping confirmed: creating a template in TextGen does not appear in ImageGen dropdown
- Template name input validation: reject empty names

---

## TELEMETRY, ACCESSIBILITY & RELEASE (Phase 7)

### T-029 · Telemetry — PostHog Integration
**Phase:** 7 | **Priority:** P0

Implement `track()` from PRD T3.7. Telemetry is opt-in; no event fires before the user responds to the first-launch prompt. Allowed events allowlist enforced at compile time.

**Strict prohibitions in any payload:**
- API keys (even partial)
- Prompt text or model output
- File paths
- User-provided reference transcripts

All events include: `app_version`, `platform`, `arch`, anonymous `distinct_id` (UUID from `metadata` table).

**Acceptance criteria:**
- First-launch opt-in prompt shown before any `track()` call
- Opt-out stores `telemetry_enabled: false` in `metadata`
- A unit test asserting that no event payload contains strings matching API key patterns (`sk-`, `claude-`, etc.)
- Telemetry disabled in development environment

---

### T-030 · Error Monitoring — Sentry Integration
**Phase:** 7 | **Priority:** P0

Integrate Sentry Electron SDK. Opt-in (same consent gate as telemetry). Configure `beforeSend` hook to strip:
- File paths (regex: `/\/[a-zA-Z0-9_\-\.]+\/[a-zA-Z0-9_\-\.]+/g`)
- Prompt text and model output (captured in `test_runs` — strip from error context)
- API key patterns (`/sk-[a-zA-Z0-9]+/g`, `xi-[a-zA-Z0-9]+`, etc.)

Target crash rate: <0.1% of sessions (PRD success metrics).

**Acceptance criteria:**
- Unhandled exceptions in both main and renderer are captured
- `beforeSend` scrubbing test: inject a mock error with a fake API key pattern → confirm it is absent in the captured event
- Sentry DSN is an environment variable, not hardcoded in source

---

### T-031 · WCAG 2.1 AA Accessibility Audit
**Phase:** 7 | **Priority:** P0

Conduct a full accessibility audit of all P0 screens (Home, Catalogue, Connection, Test, Onboarding). Fix all failures against the requirements in PRD Accessibility section:
- Keyboard navigation for all interactive elements (Tab order follows visual order)
- Visible focus rings on all elements (no suppressed outlines)
- Colour contrast ≥ 4.5:1 for normal text, ≥ 3:1 for large text (run Stark or Colour Contrast Analyser)
- Screen reader: macOS VoiceOver announces all UI states (use `aria-live` on streamed output via `<LiveRegion>`)
- Error identification: form errors described in text, not colour alone
- Resizable text: UI does not clip at macOS Accessibility 200% font size

**Acceptance criteria:**
- Zero WCAG 2.1 AA failures on all P0 screens via automated axe-core scan in Playwright
- Manual VoiceOver walkthrough of onboarding and text generation test passes with correct announcements
- 200% font size test: no clipped text or overlapping elements

---

### T-032 · Release Pipeline — macOS Notarisation & Distribution
**Phase:** 7 | **Priority:** P0

Configure the GitHub Actions `release.yml` workflow from PRD T5:
1. `electron-vite build`
2. `electron-builder` → universal macOS DMG
3. `@electron/notarize` — Apple notary service
4. `electron-updater` publish to GitHub Releases
5. Registry publish workflow: validate schema → upload to Cloudflare R2 → invalidate CDN cache

Environments: development (local registry), staging (staging CDN, no notarisation), production (full notarisation, production CDN).

**Acceptance criteria:**
- Tag push `v*.*.*` triggers full release build
- DMG is notarised and passes Gatekeeper on a clean macOS install
- `electron-updater` successfully delivers an incremental update from v1.0.0 to v1.0.1 in a staging test
- Bundle size: DMG < 180 MB (checked in CI)

---

### T-033 · Nightly Smoke Tests
**Phase:** 7 | **Priority:** P0

Configure GitHub Actions `nightly.yml` cron job (02:00 UTC) that calls `verify_endpoint` for each of the top 10 providers using CI-managed test API keys. Post Slack alert on failure. This implements the provider API breaking change detection from the risk register.

**Acceptance criteria:**
- All 10 provider smoke tests run nightly
- Slack alert fires within 5 minutes of a failure
- CI test keys stored as GitHub Actions secrets (never in source)

---

## P1 FEATURES (Phase 8)

### T-034 · Workspace: Image Understanding / VLM
**Phase:** 8 | **Priority:** P1

Build `VLMWorkspace` per PRD Section 5.4:
- Image drop zone (JPG/PNG/WebP/GIF, max 20MB), text question field, detail level toggle
- Streamed text output
- If model returns bounding box coordinates (YOLO or COCO JSON format), render as SVG overlay on the image

**Acceptance criteria:**
- SVG overlay is correctly positioned over the original image at all window sizes
- Bounding box colours are distinct per class label
- Detail toggle only appears for models that support it (driven by registry tags)

---

### T-035 · Workspace: Text-to-Speech (TTS)
**Phase:** 8 | **Priority:** P1

Build `TTSWorkspace` per PRD Section 5.6:
- Textarea with character count vs. model limit (from registry)
- Voice selector dropdown with preview play per voice
- Speed slider, pitch slider (if supported), emotion/style selector (if supported)
- Inline audio player with waveform (wavesurfer.js), download (MP3/WAV), playback speed control (0.5x–2x)

**Acceptance criteria:**
- Voice preview plays a sample clip without submitting a full request
- Character limit warning appears at 90% of model's limit
- Playback speed control updates in real time

---

### T-036 · Workspace: Embeddings / Semantic Search
**Phase:** 8 | **Priority:** P1

Build `EmbeddingsWorkspace` per PRD Section 5.7:
- Single text input or batch mode (CSV upload or line-separated textarea)
- Encoding format selector
- Vector preview (first 10 dimensions, 'Show full vector' toggle)
- Dimension count
- Cosine similarity calculator (paste a second string → compute inline)
- Heatmap row visualisation

**Acceptance criteria:**
- Cosine similarity computed client-side (no extra API call)
- Heatmap renders for both single and batch outputs
- 'Show full vector' toggle reveals all dimensions without layout overflow

---

### T-037 · Workspace: Object Detection / CV
**Phase:** 8 | **Priority:** P1

Build `CVWorkspace` per PRD Section 5.9:
- Image drop zone with confidence threshold slider and NMS threshold slider
- Canvas with colour-coded bounding box overlays
- Detection results table (class, confidence, x1/y1/x2/y2)
- Export as JSON (COCO format) or CSV

**Acceptance criteria:**
- Bounding boxes are accurately positioned relative to the original image dimensions
- COCO JSON export validates against the COCO annotation schema
- Confidence threshold slider live-filters the displayed detections

---

### T-038 · Compare Mode — All Categories
**Phase:** 8 | **Priority:** P1

Implement `SplitWorkspacePanel` for all 8 category types with the per-category interaction specs from PRD Compare Mode section:
- Mirrored inputs by default; chain icon to delink
- Category-specific differentiator display (see PRD table)
- For async categories (video generation): independent polling with labelled completion notifications

**Acceptance criteria:**
- Unlinking inputs in one panel does not affect the other
- Delta indicators show correct arithmetic difference between both metric sets
- Image Generation overlay mode: opacity slider correctly blends both images

---

### T-039 · History Export (CSV & JSON)
**Phase:** 8 | **Priority:** P1

Implement export from the History tab: full `test_runs` history for a selected model, or all models in a category. Formats: CSV (flat, all metric columns) and JSON (structured `TestRun[]`).

**Acceptance criteria:**
- CSV opens correctly in Excel and Numbers (tested with a 1000-row fixture)
- JSON round-trips cleanly (parse → stringify → parse produces identical object)
- Export triggers a native 'Save File' dialog via `dialog.showSaveDialog` in main

---

### T-040 · ASR Metrics: Word Error Rate (WER)
**Phase:** 8 | **Priority:** P1

Add WER computation to the ASR evaluation panel. User enters a reference transcript; the app computes WER client-side using the standard formula: `(S + D + I) / N` where S = substitutions, D = deletions, I = insertions, N = reference word count.

**Acceptance criteria:**
- WER computed in under 100ms for a 1000-word transcript
- WER field only appears when reference transcript is non-empty
- Algorithm is unit-tested against known WER fixtures

---

## P2 FEATURES (Phase 9)

### T-041 · Workspace: Reranking
**Phase:** 9 | **Priority:** P2

Build `RerankerWorkspace` per PRD Section 5.8:
- Query string input
- Candidate passages (add/remove textarea rows, or CSV import)
- Top-N selector
- Output: ranked table with original rank, new rank, relevance score, score delta column

### T-042 · Workspace: Document Understanding
**Phase:** 9 | **Priority:** P2

Build document understanding workspace with PDF file picker, text question input, and structured output display (extracted tables, field values, text answer).

### T-043 · Workspace: Music / Audio Generation
**Phase:** 9 | **Priority:** P2

Build `MusicGenWorkspace` per PRD Section 5.11:
- Text prompt, duration selector (5s–60s), seed, optional melody conditioning input (audio file upload)
- Inline audio player with waveform, WAV/MP3 download, BPM/key metadata overlay

### T-044 · Windows Support
**Phase:** 9 | **Priority:** P2

Replace macOS Keychain calls with DPAPI via `keytar` (the library already supports this; requires only `keytar` config change per PRD platform section). Add Windows code-signing pipeline to GitHub Actions. Confirm no macOS-specific APIs are used outside `CredentialStore`.

### T-045 · Per-Model Personal Best Stats Card
**Phase:** 9 | **Priority:** P2

Add a stats card in the History tab showing: fastest TTFT, lowest cost per 1k tokens, highest token throughput — computed from `test_runs` table aggregates.

### T-046 · Historical Run Comparison
**Phase:** 9 | **Priority:** P2

Add ability to select two historical runs from the History tab and view them side-by-side with amber/green delta indicators on all numeric fields.

---

## P3 FEATURES (Phase 10)

### T-047 · Workspace: Video Generation (Async Polling)
**Phase:** 10 | **Priority:** P3

Build `VideoGenWorkspace` per PRD Section 5.10. Async job with polling pattern, `job:progress` IPC events, Electron `Notification` API for desktop completion notifications.

### T-048 · Workspace: 3D Generation
**Phase:** 10 | **Priority:** P3

Build `Gen3DWorkspace` per PRD Section 5.12 using Three.js (r160) in a context-isolated renderer iframe. Orbit controls, .obj/.glb download, polygon count display.

### T-049 · Ollama Sidecar Integration
**Phase:** 10 | **Priority:** P3

Manage an Ollama child process from the Electron main process. Expose model pull, status, and unload via IPC. 'My Downloads' sidebar section showing installed models, disk usage, version, and one-click update.

### T-050 · Code Execution Sandbox
**Phase:** 10 | **Priority:** P3

Implement Pyodide (Python) and QuickJS (JS) execution in a context-isolated renderer process. Requires formal security review before shipping. No `eval()` anywhere in the codebase (enforced by ESLint `no-eval` rule throughout all phases).

### T-051 · Team Workspace (Encrypted Key Vault Sync)
**Phase:** 10 | **Priority:** P3

Opt-in encrypted sync of API key vaults. Requires backend service design (out of scope for Phase 10 spec).

### T-052 · Linux Support
**Phase:** 10 | **Priority:** P3

Add `libsecret` / Secret Service API credential store via `keytar`. Linux build target in `electron-builder`. CI pipeline for Linux packaging.

---

*Total tasks: 52 | P0: 33 | P1: 7 | P2: 6 | P3: 6*
