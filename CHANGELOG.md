# Changelog

All notable changes to dexterAI are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Version numbering follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [3.2.0] — 2026-03-03

### Added
- **GitHub Models adapter** — connect to Azure-backed GitHub Models endpoint
- **Agentic Workspace** — autonomous agent with filesystem and terminal tool use; requires explicit per-command user approval
- **Dynamic Token Limits** — token budget auto-adjusts based on selected model's context window
- **Code Workspace screen** — integrated editor tabs, file explorer, terminal panel, diff review, and search panel
- **Streaming Manager** — dedicated `streaming-manager.ts` module for 40fps buffer-draining render engine

### Changed
- Improved agentic loop reliability (better error recovery on tool failures)
- Updated provider adapter documentation and registry entries

### Fixed
- GitHub Models authentication flow on re-connect
- CSS build errors with Tailwind arbitrary values in production bundles

---

## [3.1.0] — 2026-02-24

### Added
- **NVIDIA NIM fleet screen** — dedicated UI for browsing and benchmarking NVIDIA-hosted models
- **Premium workspace evolution** — enhanced TextGen, CodeGen, ImageGen, ASR, TTS workspaces
- Improved evaluation metrics display in EvaluationDrawer

### Changed
- Sidebar now collapses to icon rail to maximise screen space
- Model catalogue improved with better search and filter

---

## [2.4.0] — 2026-01-15

### Added
- **Native chat export** — export conversations as Markdown, PDF, or DOCX
- Tailwind Typography plugin for dark-mode prose rendering
- `export-utils.ts` utility module + `files.ipc.ts` file dialog integration

### Fixed
- Build stability issues with arbitrary CSS values in Tailwind
- Topbar export menu layout on smaller windows

---

## [2.3.0] — 2025-12-10

### Added
- **40fps streaming engine** — buffer-draining at 25ms intervals for smooth token display
- **Thinking / reasoning block support** — `thought` field in StreamChunk rendered as collapsible block
- **Context window auto-trim** — system prompt + last 10 messages retained when >90% of context limit reached
- **Auto-titling** — conversations automatically receive a generated title after the first exchange
- **Background memory extraction** — LLM pipeline extracts and stores key facts from conversations

---

## [2.2.0] — 2025-11-20

### Added
- **Resolved model identity** — all 5 adapters capture the API-confirmed model ID (`resolvedModel`)
- Identity badges in MessageBubble (green = API matches request, amber = mismatch)
- "Model Served" metric card in EvaluationDrawer

---

## [2.1.0] — 2025-11-01

### Added
- Global UI zoom engine via `webFrame.setZoomFactor()` with Cmd+/-/0 shortcuts
- Zoom dropdown in Settings screen
- Portal tooltips throughout the UI
- Max tokens default raised to 8192

### Fixed
- Memory persistence issue on conversation reload
- Sidebar collapse state not persisting across sessions

---

## [2.0.0] — 2025-10-01

### Added
- Initial public release of dexterAI (formerly ModelForge)
- Multi-provider adapter registry (OpenAI, Anthropic, Google Gemini, Deepgram, NVIDIA NIM)
- SQLite database with WAL mode, FTS5 full-text search
- OS Keychain credential storage via keytar
- 5 evaluation workspaces: TextGen, CodeGen, ImageGen, ASR, TTS
- Monaco editor integration
- Conversation memory system
- 195-model static registry
