# Model Forge v3.1 Documentation

## App Briefing
Model Forge v3.1 is a premium, high-performance AI development platform built for researchers, developers, and power users. It provides a unified interface for interacting with various LLM providers (OpenAI, Anthropic, Google, NVIDIA NIM) and features a specialized **Agentic Code Workspace** that allows AI models to directly interact with local repositories through a sandboxed tool-calling environment.

Key capabilities include:
- **Agentic Workflows**: Models can read, write, and search code autonomously.
- **Provider Versatility**: Unified adapters for multiple API formats.
- **Visual Excellence**: Modern, responsive UI with real-time streaming and performance metrics.
- **Secure Handling**: Local-first credential and project management.

---

## Core Features & File Mapping

### 1. Agentic Code Workspace
The centerpiece of v3.1, enabling models to perform complex coding tasks.
- **Files**:
    - `src/renderer/src/screens/CodeWorkspaceScreen.tsx`: Main container for the code environment.
    - `src/renderer/src/components/code/CodeChat.tsx`: Dedicated agent chat interface.
    - `src/renderer/src/components/code/FileExplorer.tsx`: Unified file tree with lazy loading.
    - `src/main/ipc/agent.ipc.ts`: The "brain" of the agent, managing multi-turn tool loops and state.
    - `src/main/tools/tool-executor.ts`: Safely executes file operations approved by the user.

### 2. Multi-Provider Chat
A standard chat interface for quick interaction and testing.
- **Files**:
    - `src/renderer/src/screens/ChatScreen.tsx`: Handles message history, regeneration, and model settings.
    - `src/renderer/src/components/chat/ChatInput.tsx`: Advanced input component with multiline support.
    - `src/main/ipc/chat.ipc.ts`: Routes chat requests to the appropriate adapters.

### 3. Unified Adapter System
Abstracts provider-specific logic into a common interface.
- **Files**:
    - `src/main/adapters/base.adapter.ts`: Defines the `BaseProviderAdapter` interface.
    - `src/main/adapters/openai.adapter.ts`: Implementation for OpenAI API.
    - `src/main/adapters/anthropic.adapter.ts`: Implementation for Anthropic Messages API.
    - `src/main/adapters/google.adapter.ts`: Implementation for Google Generative AI.
    - `src/main/adapters/nvidia.adapter.ts`: Implementation for NVIDIA NIM.

### 4. Registry & Model Management
Dynamic registration of models and providers.
- **Files**:
    - `registry/registry.json`: The source of truth for all supported models and their features.
    - `src/main/registry/registry-manager.ts`: Handles loading and filtering the model registry.

---

## Repository Structure (What does what?)

### Root
- `apps/desktop`: The main Electron application (Renderer + Main process).
- `packages/shared-utils`: Shared TypeScript utilities and validation logic.
- `packages/registry-types`: Type definitions for models, agents, and providers.

### apps/desktop/src/main
- `index.ts`: Entry point for the Electron main process.
- `adapters/`: Logic for communicating with LLM APIs.
- `ipc/`: Inter-Process Communication handlers for filesystem, settings, and chat.
- `credentials/`: Secure storage logic for API keys.
- `tools/`: Definitions and execution logic for agentic tools (read, write, search).

### apps/desktop/src/renderer
- `src/screens/`: High-level page components (Home, CodeWorkspace, Settings).
- `src/components/`: Reusable React components (UI kits, Feature-specific blocks).
- `src/store/`: Zustand state management for app-wide state (models, active chat).

---

## Technical Specifications (v3.1)
- **Max Response Tokens**: 32,768 (Default across all agent adapters).
- **Max File Size**: 50,000 characters for agent reading (truncated for safety).
- **Max Agent Turns**: 15 (Configurable in `agent.ipc.ts`).
- **File Support**: 40+ code extensions with syntax highlighting and custom icons.
