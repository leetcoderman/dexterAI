# dexterAI Documentation

## Overview
dexterAI is a desktop application built with **Electron, React, and TypeScript**. It serves as a unified workbench and testing environment for developers to interact with and evaluate various AI models across different providers (OpenAI, Anthropic, Google, etc.). The application aims to solve the fragmentation of AI testing by providing a single, local-first interface that handles API connections, model execution, and performance evaluation.

## Application Architecture

dexterAI follows a structured **pnpm monorepo** architecture designed for modularity:

*   **`apps/desktop/`**: The main Electron application, containing the main process, preload script, and React renderer.
*   **`packages/registry-types/`**: Shared TypeScript interfaces defining the contracts for models, IPC communication, and database schemas.
*   **`packages/antigravity/`**: An internal, Tailwind-based UI component library providing foundational building blocks (Buttons, Inputs, Modals, etc.).
*   **`packages/shared-utils/`**: Reusable utility functions shared across the monorepo.
*   **`packages/i18n/`**: Localization and internationalization files (e.g., `en.json`).
*   **`registry/`**: Contains the bundled JSON model registry, acting as the source of truth for supported models and providers.

### Process Architecture (Electron)

1.  **Main Process (`src/main/`)**:
    *   **Core**: Handles application lifecycle, SQLite database initialization (`better-sqlite3`), and window management.
    *   **IPC Handlers**: Acts as the backend server for the renderer, providing channels for executing tests, managing credentials, fetching history, and handling templates.
    *   **Adapters**: Contains provider-specific integration logic (e.g., `openai.adapter.ts`, `anthropic.adapter.ts`). All adapters extend `BaseProviderAdapter` to standardize execution and error handling (retry logic, rate limits).
    *   **Credentials**: Manages API keys securely using the OS keychain via `keytar`. Keys are never stored in plain text or local databases.

2.  **Preload Script (`src/preload/`)**:
    *   Establishes a secure, typed IPC bridge between the Main and Renderer processes via `contextBridge`.

3.  **Renderer Process (`src/renderer/src/`)**:
    *   Built with React and React Router.
    *   **State Management**: Uses Zustand (`useAppStore`) for global state, persisting necessary data to `localStorage`.
    *   **UI Components**: Utilizes components from the `@dexterai/antigravity` package.

## Core Features and Capabilities

### 1. Connection Layer
*   Users can connect their own API keys for various providers.
*   Keys are validated via lightweight verification endpoints and stored securely in the local OS keychain.

### 2. Specialized Test Workspaces
dexterAI provides tailored UI environments for different AI modalities:

*   **Text Generation (`TextGenWorkspace`)**: A conversational interface for LLMs, featuring adjustable parameters (Temperature, Top P), system prompts, JSON mode, and streaming output.
*   **Code Generation (`CodeGenWorkspace`)**: Designed for coding tasks, featuring a source code input pane and a Monaco editor for syntax-highlighted output with a diff comparison tool.
*   **Image Generation (`ImageGenWorkspace`)**: Interface for text-to-image models, supporting aspect ratio constraints, seed generation, and a filmstrip history of recent creations.
*   **Audio Transcription (`ASRWorkspace`)**: Interface for Speech-to-Text models, supporting file uploads and live microphone recording with interactive, timestamped transcripts.

### 3. Evaluation System
A comprehensive system for tracking and analyzing model performance:

*   **Metrics Capture**: Automatically intercepts execution telemetry (Time-To-First-Token, tokens/second, total duration) in the main process.
*   **Evaluation Drawer**: A persistent UI panel that visualizes these metrics with color-coded badges for quick performance assessment.
*   **Run History**: All test runs are persisted locally in SQLite, allowing users to review past executions, parameters, and benchmark their personal bests.

### 4. Prompt Template Library
*   Users can save specific configurations (prompts and parameters) as reusable templates.
*   Templates are scoped by category (e.g., Text templates, Image templates) and stored in the SQLite database, allowing for quick environment recreation.

## Development and Build
*   The application uses `electron-vite` for optimized bundling and hot-module replacement (HMR) during development.
*   It enforces strict security practices, including `contextIsolation`, disabled `nodeIntegration`, and Content Security Policies.
*   The build pipeline targets universal macOS binaries (Apple Silicon + Intel).
