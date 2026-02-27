# dexterAI (v3.02) Documentation

## 1. Current Status & Project Overview
**dexterAI** (formerly ModelForge) is a high-performance Electron + React + TypeScript desktop application designed as a unified workbench for AI interaction. It operates on a "Bring Your Own Key" (BYOK) model, ensuring user data privacy and direct control over costs and model selection.

### Core Features
- **Unified Workbench**: A single interface for Chat, Code, and Performance Evaluation.
- **Local-First Architecture**: All conversations, settings, and test results are stored locally in an SQLite database.
- **Persistent Resizable UI**: The workspace features a 3-panel layout (Explorer, Editor, Chat) that is fully resizable and remembers your layout across sessions.
- **Robust Model Registry**: A catalogue of 195+ models across text, code, image, and audio categories.
- **Memory System**: Context-aware memory extraction and injection for long-running projects.

---

## 2. Abilities & Functionality

### 💬 Advanced Chat
- **40fps Streaming Engine**: Smooth, low-latency streaming with a buffer-draining mechanism.
- **Thinking/Reasoning Blocks**: Support for models that output internal reasoning or "thought" chains.
- **Context Management**: Automatic context trimming to stay within model limits while preserving the system prompt and recent history.
- **Auto-Titling**: Real-time generation of conversation titles based on dialogue.
- **Multi-Format Export**: Export chats to Markdown, PDF, or DOCX.

### 💻 Code Workspace
- **Multi-Panel Layout**: Integrated File Explorer, Editor (Monaco), and Code-Specific Chat.
- **File System Interaction**: Direct read/write access to project folders.
- **Intelligent Navigation**: Fast tree loading and deep scanning (up to 4 levels by default) for project visibility.
- **Session Persistence**: Remembers the open project and tab state.

### 🧪 Evaluation & Performance
- **Model Comparison**: Side-by-side performance metrics including Time to First Token (TTFT), total generation time, and token counts.
- **Unified Workspaces**: Specialized UIs for:
  - **Text Generation**
  - **Code Generation**
  - **Image Generation**
  - **ASR (Speech-to-Text)**
  - **TTS (Text-to-Speech)**

---

## 3. Adapters & Connectors
Adapters are the localized "drivers" that translate dexterAI requests into provider-specific API calls. All adapters inherit from `BaseProviderAdapter`.

| Adapter | Provider | Categories Supported | Confirmable Model Identity |
|:---|:---|:---|:---|
| `openai.adapter.ts` | OpenAI | Text, Code | Yes (`chunk.model`) |
| `anthropic.adapter.ts` | Anthropic | Text, Code | Yes (`event.message.model`) |
| `google.adapter.ts` | Google Gemini | Text, Code, Image | Yes (`response.modelVersion`) |
| `nvidia.adapter.ts` | NVIDIA NIM | Text, Code | Yes (OpenAI-compatible) |
| `deepgram.adapter.ts` | Deepgram | ASR, TTS | Managed via modelId |

---

## 4. Expanding the Ecosystem

### How to add new Providers (e.g., GitHub Models, OpenRouter)
The architecture is designed for extensibility. To add a new provider:

1.  **Create the Adapter**:
    - Add a new file in `apps/desktop/src/main/adapters/{provider}.adapter.ts`.
    - Inherit from `BaseProviderAdapter`.
    - If the provider is OpenAI-compatible (like GitHub Models or OpenRouter), you can simply extend `OpenAIAdapter` and override the `getClient` method to point to the correct `baseURL`.

2.  **Register the Adapter**:
    - In `apps/desktop/src/main/index.ts`, import your new adapter and call `AdapterRegistry.register(new YourAdapter())`.

3.  **Update the Registry**:
    - Add the model metadata to `registry/registry.json`. The application dynamically loads this file, so no code changes are required for new models under existing providers.

4.  **UI Integration**:
    - The `Connection.tsx` screen automatically scales based on the `providerId`. Add the provider's logo to the `logos` folder and update `PROVIDER_LABELS` in the frontend constants.

---

## 5. Security & Persistence
- **API Keys**: Stored exclusively in the OS Keychain (via `keytar`). Never logged or stored in the database.
- **Database**: SQLite with WAL (Write-Ahead Logging) for concurrent access and data integrity.
- **Preload Sandbox**: ContextBridge ensures that the renderer process has zero access to Node.js internals or the file system outside of defined IPC channels.
