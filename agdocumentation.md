# ModelForge (dexterAI) Product Documentation

## Overview
ModelForge (internally referenced as `dexterAI`) is a powerful, local desktop application built to serve as a unified gateway for interacting with, comparing, and evaluating various Large Language Models (LLMs). Built entirely on modern web technologies packaged within Electron, it provides a native-feeling MacOS/Windows experience while ensuring that API keys and conversation histories remain strictly on the user's local machine.

## Core Architecture
The project follows a standard secure Electron architecture:
- **Main Process (Node.js):** Handles local filesystem access, SQLite database operations, secure keychain integrations, and direct HTTP communication with AI Provider APIs.
- **Preload Script:** Acts as a secure bridge, exposing specific API endpoints (`window.dexterai`) to the renderer without allowing direct Node.js access in the browser context.
- **Renderer Process (React):** The frontend UI, responsible for rendering the chat interface, settings, and navigation.

### Tech Stack
- **Frameworks:** Electron, React 19, Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS, `clsx`, `tailwind-merge`
- **Icons:** `lucide-react`
- **State Management:** Zustand (used for global reactive state, like UI scaling and sidebar toggles)
- **Local Database:** `better-sqlite3` (schema manages conversations, messages, templates, and memories)
- **Secret Storage:** `keytar` (integrates with OS native keychain to securely store API keys)
- **Code Editor:** `@monaco-editor/react` (for the testing workspace)

## Key Features

### 1. Unified Multi-Provider Chat
ModelForge acts as a singular UI for multiple AI ecosystems. It uses an internal "Adapter Registry" pattern (`src/main/adapters`) to normalize API requests and streaming responses across:
- **OpenAI** (GPT-4o, etc.)
- **Anthropic** (Claude 3.5 Sonnet, Opus, etc.)
- **Google** (Gemini 1.5 Pro, Flash, etc.)
- **NVIDIA NIM** (Llama 3, Mixtral, Nemotron, Qwen)
- **Deepgram** (Audio transcriptions)

### 2. Conversation & Context Management
- **Local Persistence:** All chats are saved to the local SQLite database.
- **Per-Chat Settings:** Users can open a Right Drawer in any chat to modify the **System Prompt**, **Temperature** (complete with deterministic vs. creative tooltips), and **Max Tokens**.
- **Memory Feature:** The app includes a "Memory Injection" toggle, which tracks long-running context and extracts facts to inject into future prompts automatically.

### 3. Testing & Evaluation Workspace (Catalogue)
Beyond standard chatting, ModelForge includes a dedicated `TestWorkspace`. Developers can use the integrated Monaco editor to write multi-shot prompts, run evaluations against models, and analyze benchmark metrics directly within the desktop client.

### 4. Global UI Responsiveness
The application features a fully responsive design complete with a Global Zoom engine. Utilizing Electron's native `webFrame.setZoomFactor()`, users can trigger browser-style zooming (`Cmd/Ctrl +/-`) that perfectly scales the UI layout, fonts, and SVGs across any monitor resolution.

### 5. Privacy-First "Danger Zone"
In the Settings screen, users have complete control over their local data footprint, with one-click options to wipe specific tables (Chat History, API Keys) or perform a factory reset of the local SQLite vault entirely.
