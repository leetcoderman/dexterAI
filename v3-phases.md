# ModelForge v3: Agentic Coding Implementation Phases

This document outlines the phased roadmap for transforming ModelForge into an Agentic IDE Assistant.

## Phase 1: File System Backend
**Goal**: Enable secure project-level filesystem access from the Electron main process.
- **[ ]** Implement `filesystem.ipc.ts` with `fs:openFolder`, `fs:readDir`, `fs:readFile`, `fs:writeFile`, and `fs:stat`.
- **[ ]** Implement robust path validation to prevent traversal attacks outside the project root.
- **[ ]** Expand the preload API to expose the `fs` namespace.
- **[ ]** Update the global store to track `projectRoot` and file tree state.

## Phase 2: Code Workspace UI (3-Panel Layout)
**Goal**: Build a premium, multi-panel coding environment.
- **[ ]** Implement `CodeWorkspaceScreen` with resizable panels (Explorer | Editor | Chat).
- **[ ]** Create a lazy-loading `FileExplorer` component with icon support.
- **[ ]** Implement a multi-tab Monaco Editor integration (transitioning from read-only to editable).
- **[ ]** Integrate `CodeChat` as a dedicated assistant sidebar in the coding view.

## Phase 3: Agentic Tool System
**Goal**: Give the assistant the ability to use tools to interact with the codebase.
- **[ ]** Define JSON schemas for tools (`read_file`, `write_file`, `list_directory`, `search_code`).
- **[ ]** Implement a Tool Executor in the main process.
- **[ ]** Extend provider adapters (OpenAI, Anthropic, Google) with an `executeWithTools` loop.
- **[ ]** Implement `agent.ipc.ts` for managing multi-turn agentic conversations.

## Phase 4: Human-in-the-Loop (Diff & Confirm)
**Goal**: Ensure safety and user control over agentic actions.
- **[ ]** Implement an approval pause for high-impact tools (like `write_file`).
- **[ ]** Create a `DiffReview` component using Monaco's DiffEditor.
- **[ ]** Implement IPC handlers for user `agent:approve` and `agent:reject` actions.
- **[ ]** Render tool execution steps and results inline within the chat.

## Phase 5: Polish & Persistence
**Goal**: Finalize the user experience and ensure state persistence.
- **[ ]** Persist the `projectRoot` per conversation in the database.
- **[ ]** Implement in-project global search (grep-like UI).
- **[ ]** Add "Unsaved Changes" indicators and tab management refinements.
- **[ ]** Develop advanced system prompt templates with automatic project context injection.

---
> [!NOTE]
> Terminal integration and code execution sandboxing are currently considered post-v3.0 features.
