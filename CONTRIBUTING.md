# Contributing to dexterAI

Thank you for your interest in contributing! This document covers everything you need to get started.

---

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Code Style](#code-style)
- [Branch & PR Workflow](#branch--pr-workflow)
- [Adding a New Provider Adapter](#adding-a-new-provider-adapter)
- [Reporting Security Vulnerabilities](#reporting-security-vulnerabilities)
- [Logo & Brand Assets](#logo--brand-assets)

---

## Development Setup

**Prerequisites:**
- Node.js >= 20 (LTS recommended)
- pnpm >= 9
- macOS, Windows 10+, or Linux (Ubuntu 20.04+)

**Install:**
```bash
git clone https://github.com/leetcoderman/dexterAI.git
cd dexterAI
pnpm install --frozen-lockfile
```

**Run in development:**
```bash
cd apps/desktop
npm run dev        # Starts Electron + HMR renderer
```

**Type-check:**
```bash
npm run typecheck  # Checks both main and renderer processes
```

**Lint / Format:**
```bash
npm run lint
npm run format
```

**Build:**
```bash
npm run build           # Full production build
npm run build:mac       # macOS distributable (.dmg)
npm run build:win       # Windows distributable (.exe)
npm run build:linux     # Linux distributable (.AppImage / .deb)
```

> **Note:** There are currently no automated tests. All verification is manual. If you add a feature, please describe in your PR how you tested it.

---

## Project Structure

```
apps/desktop/src/
  main/           # Electron main process (Node.js)
    adapters/     # One file per AI provider
    ipc/          # IPC handler modules (one per domain)
    db/           # SQLite schema + migrations
    credentials/  # OS keychain integration
    tools/        # Agent tool execution engine
  preload/        # contextBridge API surface
  renderer/src/   # React + TypeScript frontend
    screens/      # Full-page views
    components/   # Reusable UI components
    store/        # Zustand state
    utils/        # Pure utility functions
packages/
  registry-types/ # Shared TypeScript interfaces
  shared-utils/   # Utility functions (cn, sleep, detectProviderFromKey)
  i18n/           # i18next setup
  antigravity/    # Internal UI component library
```

---

## Code Style

- **Formatter:** Prettier — run `npm run format` before committing
- **Linter:** ESLint — run `npm run lint` and fix all errors
- **TypeScript:** Strict mode. Avoid `any`; use discriminated unions where possible
- **React:** Functional components with hooks only. No class components
- **Quotes:** Single quotes, no semicolons, 2-space indent, 100-char print width

The project uses `.editorconfig` and `.prettierrc.yaml` — most editors will auto-apply these.

---

## Branch & PR Workflow

1. **Fork** the repository and create a feature branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Make your changes. Keep commits focused and atomic
3. Run `npm run typecheck && npm run lint` — fix any issues
4. Open a pull request against `main` with:
   - A clear description of what changed and why
   - Steps to manually test the feature
   - Screenshots or screen recordings for UI changes

**Branch naming:**
- `feat/` — new feature
- `fix/` — bug fix
- `refactor/` — code restructure with no behavior change
- `docs/` — documentation only
- `chore/` — tooling, deps, config

---

## Adding a New Provider Adapter

1. Create `apps/desktop/src/main/adapters/{provider}.adapter.ts`
2. Extend `BaseProviderAdapter` from `base.adapter.ts`
3. Implement `execute()`, `transcribe()`, `synthesize()`, or `generateImage()` as applicable
4. Register the adapter in `adapter-registry.ts` and instantiate it in `main/index.ts`
5. Add provider logo to `apps/desktop/src/renderer/src/assets/logos/`
6. Add the provider entry to `registry/registry.json`
7. Update `ProvidersScreen.tsx` with the new provider card

Refer to `openai.adapter.ts` or `anthropic.adapter.ts` as canonical references.

---

## Reporting Security Vulnerabilities

**Do not open a public GitHub Issue for security bugs.**

Please email the maintainer directly or use GitHub's private security advisory feature. See [SECURITY.md](./SECURITY.md) for the full responsible disclosure process.

---

## Logo & Brand Assets

Provider logos (OpenAI, Anthropic, Google, NVIDIA, Deepgram, GitHub) are used purely for product identification within the app. They are the property of their respective owners and are used in accordance with each provider's brand guidelines. Do not redistribute these assets or use them outside the context of this application.
