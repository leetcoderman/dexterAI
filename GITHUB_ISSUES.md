# Pre-Drafted GitHub Issues

These issues were identified during the v3.2 repository audit. Create them on GitHub before going public so contributors have a clear backlog.

---

## Issue 1 — Refactor

**Title:** `Refactor: Extract common streaming scaffold into BaseProviderAdapter`

**Labels:** `refactor`, `good first issue`

**Body:**
The five streaming adapters (`openai`, `anthropic`, `nvidia`, `github`, `google`) each duplicate approximately 25–35% of their `execute()` method:
- TTFT / `firstChunkTime` calculation pattern
- Token extraction (`promptTokens`, `completionTokens`)
- Stream initialization and timing
- Error handling structure

This duplication means bug fixes or improvements to the streaming loop must be applied to each adapter individually.

**Proposed solution:** Extract a shared `streamWithMetrics()` or `executeStream()` scaffold into `BaseProviderAdapter` (`base.adapter.ts`) that adapters can delegate to, passing only provider-specific SDK invocations as callbacks.

**Files:** `apps/desktop/src/main/adapters/base.adapter.ts` and all `*.adapter.ts` files.

---

## Issue 2 — Security

**Title:** `Security: Evaluate Electron sandbox re-enablement path for native modules`

**Labels:** `security`, `enhancement`

**Body:**
`sandbox: false` is currently set on the `BrowserWindow` to allow the preload script to load native Node modules (`keytar`, `better-sqlite3`, `node-pty`). `contextIsolation` is still enabled via `contextBridge`, which mitigates most renderer-level risks.

As Electron matures, the recommended approach is to move to a utility process model for native modules, which would allow the renderer/preload to run fully sandboxed.

**Track:** Evaluate whether Electron's [utility process API](https://www.electronjs.org/docs/latest/api/utility-process) can be used to host native module calls, restoring `sandbox: true` on the main window.

**File:** `apps/desktop/src/main/index.ts` line ~46.

---

## Issue 3 — Types

**Title:** `Types: Replace \`any\` with proper discriminated unions in adapter payloads`

**Labels:** `refactor`, `typescript`

**Body:**
Several adapter files use `any` types for multi-SDK message payloads (~30+ instances across the codebase):
- `params as any` in execute() methods
- `any[]` for message content arrays in `google.adapter.ts`
- Generic `any` for SDK-agnostic streaming chunk handling

These reduce type safety and make future refactors riskier.

**Proposed solution:** Define a `ProviderMessage` discriminated union in `@dexterai/registry-types` covering all provider SDK message shapes, then update adapters to use it.

**Files:** `apps/desktop/src/main/adapters/google.adapter.ts`, `nvidia.adapter.ts`, `github.adapter.ts`.

---

## Issue 4 — Refactor

**Title:** `Refactor: Split large screen components into sub-components`

**Labels:** `refactor`

**Body:**
Several screen and IPC files are approaching or exceeding maintainability thresholds:

| File | Lines |
|------|-------|
| `NvidiaFleetScreen.tsx` | ~485 |
| `agent.ipc.ts` | ~466 |
| `ASRWorkspace.tsx` | ~458 |
| `CodeChat.tsx` | ~436 |
| `TextGenWorkspace.tsx` | ~403 |

Suggested splits:
- `NvidiaFleetScreen.tsx` → extract `NvidiaModelTable`, `NvidiaFilterPanel`, `NvidiaMetricCards`
- `agent.ipc.ts` → the tool orchestration loop could move to a dedicated `AgentRunner` class
- `ASRWorkspace.tsx` → extract `WaveformRecorder`, `TranscriptDisplay`

---

## Issue 5 — Fix

**Title:** `Fix: Migrate from keytar to Electron safeStorage API`

**Labels:** `dependencies`, `security`

**Body:**
`keytar@^7.9.0` is the current credential storage backend. The package had macOS Keychain prompt behavior changes in recent versions and requires native compilation against each Electron version.

Electron ships a built-in [`safeStorage`](https://www.electronjs.org/docs/latest/api/safe-storage) API that provides OS-native encryption (Keychain on macOS, Credential Store on Windows, libsecret on Linux) without a native addon rebuild requirement.

**Proposed migration:**
1. Replace `keytar.setPassword / getPassword / deletePassword` calls in `credential-store.ts` with `safeStorage.encryptString / decryptString` + a local encrypted file store
2. Remove `keytar` from `package.json`
3. Update `pnpm onlyBuiltDependencies` to remove `keytar`

This eliminates one native addon rebuild from the CI matrix.

**File:** `apps/desktop/src/main/credentials/credential-store.ts`.

---

## Issue 6 — Chore

**Title:** `Chore: Add CI GitHub Actions workflow for build verification`

**Labels:** `ci`, `chore`

**Body:**
The repo currently has a `pr-checks.yml` workflow stub (`.github/workflows/pr-checks.yml`) but no active build-verification steps.

Proposed workflow steps for PRs against `main`:
1. `pnpm install --frozen-lockfile`
2. `npm run typecheck`
3. `npm run lint`
4. `npm run build` (production build, no distributables)

Platform matrix: Ubuntu + macOS (Windows optional due to cost).

**File:** `.github/workflows/pr-checks.yml`.

---

## Issue 7 — Chore

**Title:** `Chore: Add GitHub Issue templates (bug report, feature request)`

**Labels:** `chore`, `documentation`

**Body:**
Add `.github/ISSUE_TEMPLATE/` directory with:
- `bug_report.md` — platform, Electron version, reproduction steps, expected vs actual behaviour
- `feature_request.md` — use case, proposed solution, alternatives considered

This keeps incoming issues consistent and actionable.
