# dexterAI v3.2 🚀

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](./LICENSE)
[![Electron](https://img.shields.io/badge/Electron-39-47848F?logo=electron)](https://electronjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://typescriptlang.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)

dexterAI is a **local-first, desktop-native AI workbench** for developers. Connect your own API keys, stream responses from multiple providers, run evaluations, and let the agent autonomously work on your codebase — all from one app, with your data staying on your machine.

---

## ✨ Key Features

### 🌈 Multi-Provider Hub
Connect and chat with all major AI providers in one place.
- **6 Adapters**: OpenAI, Anthropic, Google Gemini, GitHub Models, NVIDIA NIM, and Deepgram
- **Rich Media**: Built-in Speech-to-Text and Text-to-Speech via Deepgram
- **Model Catalogue**: Browse and compare 195 models across all providers

### 🤖 Agentic Workspace (Experimental)
Transform chat into a powerful autonomous workbench.
- **Tool Use**: AI-driven filesystem operations and terminal commands
- **Security Gates**: Explicit user approval required for every destructive OS-level action
- **Long-running Loops**: Dynamic context trimming for 128k+ token support

### 🔐 Sovereignty & Privacy
Your data, your machine — always.
- **Local Persistence**: Conversation history and memories stored in local SQLite only
- **Native Security**: API keys reside strictly in your OS Keychain (never on disk or in the DB)
- **No Telemetry**: Zero data collection or analytics

### 🖥 Professional Developer UX (Experimental)
- **Integrated Terminal**: Real-time shell access within the app
- **40fps Streaming**: Smooth, buffer-drained token rendering
- **Persistent Memory**: AI that learns your preferences and project context over time
- **Chat Export**: Export conversations as Markdown, PDF, or DOCX

---

## 📋 Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | >= 20 LTS |
| pnpm | >= 9 |
| OS | macOS 12+, Windows 10+, Ubuntu 20.04+ |

---

## 🚀 Installation

### Option A — Download a Release (Recommended)

Download the latest pre-built binary for your platform from the [Releases page](https://github.com/leetcoderman/dexterAI/releases).

- **macOS**: `.dmg`
- **Windows**: `.exe` (NSIS installer)
- **Linux**: `.AppImage` or `.deb`

### Option B — Build from Source

```bash
# 1. Clone the repository
git clone https://github.com/leetcoderman/dexterAI.git
cd dexterAI

# 2. Install all workspace dependencies (from repo root)
pnpm install --frozen-lockfile

# 3. Run in development mode (Electron + Hot Module Reload)
cd apps/desktop
npm run dev
```

To build a distributable for your platform:
```bash
# From apps/desktop/
npm run build:mac    # macOS (.dmg)
npm run build:win    # Windows (.exe)
npm run build:linux  # Linux (.AppImage)
```

---

## 🔑 Getting Started

1. **Launch** the app and complete the 4-step onboarding
2. **Connect** your provider API keys in the **Providers** screen
   - Supported: OpenAI, Anthropic, Google, GitHub Models, NVIDIA NIM, Deepgram
   - Keys are stored in your OS Keychain — never in the app's database
3. **Chat** — select a model and start a conversation in the **Chat** screen
4. **Agent** — open a project folder and use the **Code Workspace** to let the AI autonomously work on your code
5. **Evaluate** — use the **Test Workspace** to benchmark models side-by-side

---

## 🏗 Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Electron 39 + electron-vite |
| Frontend | React 19 + TypeScript 5.9 + Tailwind CSS |
| State | Zustand (persisted) |
| Database | SQLite (better-sqlite3) — WAL mode + FTS5 |
| Credentials | OS Keychain via keytar |
| Terminal | node-pty + xterm.js |
| Editor | Monaco Editor |
| Build | pnpm workspaces monorepo |

---

## 📁 Repository Structure

```
apps/desktop/          # Main Electron application
  src/main/            # Node.js main process (adapters, IPC, DB)
  src/renderer/        # React frontend
  src/preload/         # contextBridge API surface
packages/
  registry-types/      # Shared TypeScript interfaces
  shared-utils/        # Utility functions
  i18n/                # i18next setup (English)
  antigravity/         # Internal UI component library
registry/
  registry.json        # 195-model static catalogue (CDN fallback)
```

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before submitting a pull request.

---

## 🔒 Security

For responsible disclosure of security vulnerabilities, see [SECURITY.md](./SECURITY.md). **Do not open public Issues for security bugs.**

---

## 📜 Changelog

See [CHANGELOG.md](./CHANGELOG.md) for a full version history.

---

## 📄 License

[ISC](./LICENSE) © 2026 dexterAI
