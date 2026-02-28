# Claudev3.2.md — Complete Repository Understanding

> **Audited by:** Antigravity (Google DeepMind) | **Date:** 2026-02-28 | **Scope:** Full codebase of `model-forge-v3.02` (v3.2 Update)

---

## 1. Product Identity

**dexterAI** — an Electron + React + TypeScript desktop application for unified AI model testing, chat, and agentic workflows. Users connect their own API keys, test any model (OpenAI, Anthropic, Google, NVIDIA, GitHub, Deepgram), compare performance, and switch providers from one interface.

- **Version:** 3.2.0 (v3.12 fix-phase complete)
- **Architecture:** Monorepo (pnpm workspaces)
- **Runtime:** Electron main process (Node.js) + Chromium renderer (React)
- **Data:** SQLite (WAL mode), OS Keychain (keytar), Zustand (persisted localStorage)

---

## 2. Architecture Overview

```
model-forge-v3.02/
├── apps/desktop/src/
│   ├── main/                        # Electron main process
│   │   ├── index.ts                 # Entry: DB init, IPC, Adapter registration
│   │   ├── adapters/                # 6 Provider adapters (Base, OpenAI, Anthropic, Google, etc.)
│   │   │   ├── github.adapter.ts    # FIXED: Migrated to models.github.ai, ID normalization
│   │   │   └── base.adapter.ts      # Shared: withRetry, mapError, AbortSignal support
│   │   ├── ipc/                     # 14 IPC modules
│   │   │   ├── agent.ipc.ts         # Agent loop: context trimming, recovery, unlimited turns
│   │   │   └── chat.ipc.ts          # Chat streaming, dynamic token limits
│   │   ├── tools/                   # Agent tool definitions + executor
│   │   └── db/                      # SQLite via better-sqlite3
│   ├── preload/index.ts             # contextBridge: window.dexterai
│   └── renderer/src/
│       ├── App.tsx                   # Routing + Zoom engine
│       ├── screens/                 # 13 screens (New: NvidiaFleetScreen)
│       └── components/              # Chat, Code, Layout, ModelSelector
├── packages/
│   ├── registry-types/              # Shared interfaces
│   └── shared-utils/                # cn(), detectProviderFromKey() (GitHub support)
└── registry/
    └── registry.json                # 60+ models across 6 providers (2026 catalog)
```

---

## 3. Key Enhancements in v3.2

### 🌐 GitHub Models (Full Integration)
- **Endpoint**: Migrated from deprecated Azure to `https://models.github.ai/inference`.
- **ID Normalization**: Automatically strips org prefixes (e.g., `openai/gpt-4o` → `gpt-4o`) to match registry.
- **Robustness**: Verification no longer deletes keys on non-auth errors (404/500).
- **Thinking Support**: Extracts `reasoning_content` for models like DeepSeek-R1.

### 🤖 Agentic Workspace (Reliability)
- **Dynamic Turns**: Removed the 15-turn hard cap; now supports long-running tasks with a 200-turn safety valve.
- **Context Management**: New `trimMessagesForContext()` summarization ensures agents don't crash when context windows fill (up to 128k+).
- **Error Recovery**: Automatic retry on rate limits (429) and auto-trimming on context overflow (400).
- **Optimized Tools**: Reduced output sizes (read_file 15KB max) to preserve context budget.

### 🔢 Dynamic Model Capabilities
- **Token Limits**: Manual `maxTokens` setting removed. Now dynamically fetched from `registry.json` using `max_output_tokens` per model.
- **Context Awareness**: `ChatScreen` and `CodeChat` now respect model-specific `context_window` limits for trimming.

### 📊 Nvidia Fleet Integration
- **NVIDIA 2026 Fleet**: Dedicated interactive screen showing model matrices and workflow wizards based on the latest 2026 intelligence deck.

---

## 4. Provider Adapters (6 Total)

| # | Provider | SDK | Key Models | Status |
|---|----------|-----|------------|--------|
| 1 | OpenAI | openai | GPT-4o, o1 | Stable |
| 2 | Anthropic | @anthropic-ai/sdk | Claude 3.7 Sonnet | Stable |
| 3 | Google | @google/generative-ai | Gemini 1.5/2.0/3.1 Pro | Stable |
| 4 | Deepgram | @deepgram/sdk | Nova 2 (ASR), Aura (TTS) | Stable |
| 5 | NVIDIA NIM | openai | Llama 3.3, DeepSeek R1/V3 | Stable |
| 6 | GitHub | openai | GPT-4o, GPT-5, Grok 3, o4-mini | FIXED |

---

## 5. Security & Validation

- **Key Detection**: `KEY_PREFIX_MAP` updated to support `ghp_` and `github_pat_` prefixes.
- **Tool Safety**: `write_file` and `execute_command` include user approval gates.
- **Path Traversal**: `validatePath()` enforced on all filesystem operations.
- **Credential Storage**: keys reside only in OS Keychain (keytar), never stored in plaintext.

---

## 6. Known Constraints & Future Work

1. **AbortSignal**: Request cancellation implemented in base adapter but pending full verification across all SDKs.
2. **Schema Brittle**: Path resolution for `schema.sql` needs build-time optimization.
3. **Registry CDN**: Currently uses bundled `registry.json`; remote CDN fetch has a high timeout.
4. **Agent History**: Context trimming is effective but could be improved with recursive summarization.
