# dexterAI v2 — Product Requirements & Technical Feasibility

## Executive Summary

dexterAI is evolving from a **model testing workbench** into a **unified multi-model AI chat platform**. The core addition: a new **Conversations** layer sits above the existing Workspaces in the sidebar. Users open persistent, context-aware chat sessions where they can switch between AI models mid-conversation via a dropdown, without losing history or context. Existing workspaces (ImageGen, ASR, TTS) remain intact for specialized tasks.

Think: **Claude's UI, but model-agnostic** — one chat interface, any provider, with memory that persists across sessions and models. The existing workspace infrastructure stays available for non-chat tasks.

---

## 1. Product Vision

### Current State (v1)
- User selects a **model** from a catalogue → lands on a workspace → runs a one-shot test → sees output + metrics.
- Each workspace is isolated. No conversation continuity. No chat history. No memory.
- Code generation workspace has a Monaco editor + diff view but no conversational flow.
- Text generation workspace has a basic chat UI but conversations are ephemeral (lost on page change or app restart).

### Target State (v2)
- User opens the app → sees **their conversations** as the primary landing (Conversations section at the top of the sidebar).
- They start a new chat → pick a model from a dropdown in the input bar → type and send.
- Mid-conversation, they can switch models. The full conversation history is replayed to the new model as context.
- The app **remembers** key facts across conversations (memory system).
- Code generation is a **capability within the chat**, not a separate workspace — when the model returns code, it renders with syntax highlighting, copy buttons, and optionally a Monaco diff view.
- **Existing workspaces (ImageGen, ASR, TTS) remain** in the sidebar below Conversations for specialized non-chat tasks.
- **Model Catalogue remains** as a sidebar nav item for model browsing and exploration.
- All conversations, messages, and memories persist locally in SQLite.
- Final deliverable: a **macOS .dmg** app.

---

## 2. Functional Requirements

### 2.1 Chat-First Interface

| ID | Requirement | Priority |
|----|-------------|----------|
| F-01 | **Sidebar remains as-is.** A new "Conversations" section is added **above** the existing Workspaces section. Conversations become the primary landing screen. Shows title, last message preview, timestamp, model used. | P0 |
| F-02 | **New conversation** button creates a blank chat. No model pre-selection required — user picks from the input bar. | P0 |
| F-03 | **Input panel** fixed at the bottom of the chat view. Contains: text input (multi-line, shift+enter for newline), model selector dropdown, send button. | P0 |
| F-04 | **Model selector dropdown** beside the send button. Grouped by provider (OpenAI, Anthropic, Google, NVIDIA). Shows **all models**: models with valid API keys show a ✅ green tick and are selectable; models without keys are **grayed out** (visible but disabled). | P0 |
| F-05 | **Message bubbles** above the input panel. User messages on the right, assistant messages on the left. Each assistant message shows which model generated it (badge/label). | P0 |
| F-06 | **Streaming output** — assistant responses stream token-by-token in real time, using the existing `test:chunk` / `test:done` IPC pattern. | P0 |
| F-07 | **Mid-conversation model switching** — user changes the dropdown, next message goes to the new model. Previous messages are sent as context to the new model. | P0 |
| F-08 | **Code blocks** in assistant responses render with syntax highlighting (using existing Monaco or a lighter library like Prism/Shiki), copy button, and language label. | P1 |
| F-09 | **System prompt** configurable per conversation (collapsible settings panel at the top or in a side drawer). | P1 |
| F-10 | **Temperature / max tokens** configurable per conversation via the same settings panel. | P1 |
| F-11 | **Stop generation** button appears during streaming to cancel the current response. Reuses `provider:cancel` IPC. | P0 |
| F-12 | **Regenerate response** — button on the last assistant message to re-run the same prompt. | P2 |
| F-13 | **Edit and resend** — click on a user message to edit it and resubmit (forks the conversation from that point). | P2 |

### 2.2 Persistent Chat History

| ID | Requirement | Priority |
|----|-------------|----------|
| H-01 | All conversations and messages are saved to local SQLite database automatically. | P0 |
| H-02 | Conversations persist across app restarts. User sees their full history on launch. | P0 |
| H-03 | **Search conversations** — full-text search across conversation titles and message content. | P1 |
| H-04 | **Delete conversation** — soft delete (mark as deleted) or hard delete with confirmation. | P0 |
| H-05 | **Rename conversation** — click to edit title. Auto-generated title from first user message if not set. | P1 |
| H-06 | **Export conversation** — as Markdown or JSON. | P2 |
| H-07 | **Conversation metadata** — store model switches, timestamps, token counts per message. | P1 |

### 2.3 Memory System

| ID | Requirement | Priority |
|----|-------------|----------|
| M-01 | **Automatic memory extraction** — after a conversation ends (or at configurable intervals), the app uses the active model to generate a structured summary of key facts. | P1 |
| M-02 | **Memory storage** — key facts stored locally in SQLite as structured JSON (e.g., `{"user_name": "Alex", "preferred_language": "Python", "project": "dexterAI"}`). | P1 |
| M-03 | **Memory injection** — on new conversation start, relevant memories are injected into the system prompt so the model has context from prior sessions. | P1 |
| M-04 | **Memory management UI** — user can view, edit, and delete stored memories from a dedicated settings/memory page. | P1 |
| M-05 | **Memory scoping** — memories are global (apply to all conversations), not per-conversation. | P1 |
| M-06 | **Memory toggle** — user can enable/disable memory injection per conversation. | P2 |
| M-07 | **Memory size limits** — cap injected memory to a configurable token budget (default: 2000 tokens) to avoid eating into context window. | P1 |

### 2.4 Code Generation (Refined)

| ID | Requirement | Priority |
|----|-------------|----------|
| C-01 | Code generation is **not a separate workspace** — it's a capability within the chat interface. Users ask for code in natural language; the model responds with code blocks. | P0 |
| C-02 | Code blocks render with **syntax highlighting**, language detection, copy button, and "Insert into editor" option. | P1 |
| C-03 | **Optional Monaco panel** — togglable split view where code from the conversation can be accumulated/edited. Think of it as a scratchpad. | P2 |
| C-04 | **Diff view** — when the model modifies code, show before/after diff (reuse existing Monaco diff infrastructure). | P2 |
| C-05 | Code-related models (e.g., Codestral, GPT-4o) are tagged in the dropdown so users know which models excel at code. | P1 |

### 2.5 Navigation & Layout Changes

| ID | Requirement | Priority |
|----|-------------|----------|
| N-01 | **Sidebar structure (top → bottom):** [+] New Chat button → Conversations list → Workspaces (ImageGen, ASR, TTS) → Model Catalogue → Connections/API Keys → Settings. | P0 |
| N-02 | **Model Catalogue remains a sidebar nav item.** Models are also discoverable through the dropdown in the chat input bar. Catalogue serves as a dedicated browsing/exploration page. | P0 |
| N-03 | **Remove TextGen and CodeGen workspace routing.** `/workspace/text-gen` and `/workspace/code-gen` are replaced by `/chat/:conversationId`. ImageGen, ASR, and TTS workspaces retain their routes. | P0 |
| N-04 | **Home screen** becomes the conversation list (or last active conversation). | P0 |
| N-05 | **Onboarding** remains but the final step drops the user into a new chat instead of the model catalogue. | P1 |

---

## 3. Technical Architecture

### 3.1 High-Level Changes

```
BEFORE (v1):                          AFTER (v2):
┌──────────┐                          ┌──────────┐
│ Home     │ → Model Catalogue        │ Chat List │ → Conversation View
│          │ → Select Model            │          │ → Model Dropdown in Input
│          │ → Workspace (ephemeral)   │          │ → Persistent Messages
│          │ → One-shot test           │          │ → Streaming Chat
└──────────┘                          │          │
                                       │ Sidebar  │ → Conversations (new, top)
                                       │          │ → Workspaces (ImageGen/ASR/TTS kept)
                                       │          │ → Model Catalogue (kept)
                                       │          │ → Connections / Settings (kept)
                                       └──────────┘
```

### 3.2 Renderer (React) Architecture

```
App.tsx
├── ChatListScreen          (/) — sidebar: conversations, main: last active or empty state
├── ChatScreen              (/chat/:id) — the core experience
│   ├── ChatHeader          — conversation title, settings toggle, model badge
│   ├── MessageList         — scrollable message bubbles with model attribution
│   │   ├── UserMessage     — right-aligned, editable
│   │   ├── AssistantMessage — left-aligned, model badge, code blocks
│   │   └── SystemMessage   — model switch notifications, errors
│   ├── ChatInput           — fixed bottom bar
│   │   ├── TextArea        — multi-line input
│   │   ├── ModelSelector   — dropdown grouped by provider (all models; green ✅ / grayed out)
│   │   └── SendButton      — submit (or Stop during streaming)
│   └── SettingsDrawer      — system prompt, temperature, memory toggle
├── ImageGenWorkspace       (/workspace/image-gen) — KEPT as-is
├── ASRWorkspace            (/workspace/asr) — KEPT as-is
├── TTSWorkspace            (/workspace/tts) — KEPT as-is
├── Catalogue               (/catalogue) — KEPT as sidebar nav item
├── MemoryScreen            (/memory) — view/edit/delete memories
├── ConnectionsScreen       (/connections) — API key management (existing)
└── SettingsScreen          (/settings) — app preferences, data management
```

### 3.3 Zustand Store Changes

```typescript
// New store shape (extends existing)
interface DexterStore {
  // Existing (unchanged)
  isOnboarded: boolean
  connectedProviders: string[]

  // New: Active conversation state
  activeConversationId: string | null
  setActiveConversation: (id: string | null) => void

  // New: Conversations list (lightweight, loaded from DB)
  conversations: ConversationSummary[]
  loadConversations: () => Promise<void>

  // New: Current chat messages (loaded for active conversation)
  messages: Message[]
  loadMessages: (conversationId: string) => Promise<void>
  addMessage: (message: Message) => void
  updateMessage: (id: string, partial: Partial<Message>) => void

  // New: Model selection (all models loaded, connection status derived)
  allModels: RegistryModel[]                   // Full 195-model registry
  loadAllModels: () => Promise<void>
  selectedModelId: string | null
  selectedProviderId: string | null
  setSelectedModel: (modelId: string, providerId: string) => void
  // Derived: isModelConnected(modelId) checks if provider is in connectedProviders

  // New: Streaming state
  isStreaming: boolean
  streamingMessageId: string | null

  // New: Memory
  memories: Memory[]
  loadMemories: () => Promise<void>
}
```

### 3.4 IPC Contract Additions

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `conversations:list` | invoke | Get all conversations (summary: id, title, last message, model, timestamp) |
| `conversations:get` | invoke | Get single conversation with all messages |
| `conversations:create` | invoke | Create new conversation, returns id |
| `conversations:update` | invoke | Update title, settings |
| `conversations:delete` | invoke | Delete conversation and its messages |
| `messages:add` | invoke | Persist a new message to DB |
| `messages:update` | invoke | Update message content (for streaming completion) |
| `messages:search` | invoke | Full-text search across messages |
| `memory:list` | invoke | Get all stored memories |
| `memory:save` | invoke | Save/update a memory entry |
| `memory:delete` | invoke | Delete a memory entry |
| `memory:generate` | invoke | Trigger memory extraction for a conversation (calls the LLM) |
| `chat:send` | invoke | Send a message — includes conversation history for context. Main process calls the adapter. |
| `chat:chunk` | on (main→renderer) | Streaming token (replaces `test:chunk` for chat context) |
| `chat:done` | on (main→renderer) | Stream complete with metadata |
| `chat:error` | on (main→renderer) | Error during generation |

---

## 4. Database Schema

### 4.1 New Tables

```sql
-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
  id            TEXT PRIMARY KEY,           -- UUID
  title         TEXT,                        -- Auto-generated or user-set
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  settings_json TEXT DEFAULT '{}'           -- { systemPrompt, temperature, maxTokens, memoryEnabled }
);

-- Messages  
CREATE TABLE IF NOT EXISTS messages (
  id              TEXT PRIMARY KEY,          -- UUID
  conversation_id TEXT NOT NULL,             -- FK → conversations.id
  role            TEXT NOT NULL,             -- 'user' | 'assistant' | 'system'
  content         TEXT NOT NULL,             -- Message text (supports markdown/code blocks)
  model_id        TEXT,                      -- Which model generated this (null for user messages)
  provider_id     TEXT,                      -- Which provider (null for user messages)
  token_count     INTEGER DEFAULT 0,         -- Tokens used for this message
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  metadata_json   TEXT DEFAULT '{}',         -- { ttft, totalTime, finishReason, etc. }
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- Index for fast conversation loading
CREATE INDEX IF NOT EXISTS idx_messages_conversation 
  ON messages(conversation_id, created_at ASC);

-- Full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts 
  USING fts5(content, conversation_id UNINDEXED);

-- Triggers to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
  INSERT INTO messages_fts(rowid, content, conversation_id) 
  VALUES (new.rowid, new.content, new.conversation_id);
END;

CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
  DELETE FROM messages_fts WHERE rowid = old.rowid;
END;

-- Memory
CREATE TABLE IF NOT EXISTS memories (
  id              TEXT PRIMARY KEY,          -- UUID
  key             TEXT NOT NULL,             -- Category/label (e.g., 'user_preferences', 'project_context')
  content         TEXT NOT NULL,             -- The memory text
  source_conversation_id TEXT,              -- Which conversation it was extracted from
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  is_pinned       INTEGER DEFAULT 0          -- User can pin important memories
);

CREATE INDEX IF NOT EXISTS idx_memories_key ON memories(key);
```

### 4.2 Existing Tables — No Changes Needed

The existing `connections`, `test_runs`, `prompt_templates`, and `metadata` tables remain unchanged. `test_runs` can optionally be deprecated over time as the chat system replaces the one-shot testing flow, but there's no urgency.

### 4.3 Migration Strategy

Since the app uses `better-sqlite3` with raw SQL (no ORM), add a migration system:

```typescript
// db/migrations.ts
const MIGRATIONS = [
  {
    version: 2,
    up: `
      CREATE TABLE IF NOT EXISTS conversations (...);
      CREATE TABLE IF NOT EXISTS messages (...);
      CREATE TABLE IF NOT EXISTS memories (...);
      -- indexes, triggers, FTS
    `
  }
]

function runMigrations(db: Database) {
  const current = db.prepare("SELECT value FROM metadata WHERE key = 'schema_version'").get()
  const currentVersion = current ? parseInt(current.value) : 1

  for (const migration of MIGRATIONS) {
    if (migration.version > currentVersion) {
      db.exec(migration.up)
      db.prepare("INSERT OR REPLACE INTO metadata (key, value) VALUES ('schema_version', ?)")
        .run(migration.version.toString())
    }
  }
}
```

---

## 5. Memory System — Deep Design

### 5.1 How Memory Works

```
Conversation ends (or user triggers manually)
        │
        ▼
┌─────────────────────────────────┐
│ Memory Extraction Prompt         │
│                                  │
│ "Given this conversation,        │
│  extract key facts about the     │
│  user, their preferences,        │
│  projects, and any information   │
│  they'd want remembered.         │
│  Return as structured JSON."     │
│                                  │
│ Input: last N messages            │
│ Model: user's currently selected  │
│ Output: { key_facts: [...] }     │
└─────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────┐
│ Deduplication & Merge            │
│                                  │
│ Compare new facts against        │
│ existing memories. Update if     │
│ more recent, add if new,         │
│ skip if duplicate.               │
└─────────────────────────────────┘
        │
        ▼
   Stored in SQLite `memories` table
```

### 5.2 Memory Injection

On new conversation start (or when memory is enabled):

```typescript
function buildSystemPrompt(userSystemPrompt: string, memories: Memory[]): string {
  const memoryBlock = memories
    .map(m => `- ${m.content}`)
    .join('\n')

  return `${userSystemPrompt}

<user_context>
Here is what you know about the user from prior conversations:
${memoryBlock}
</user_context>

Use this context naturally. Don't explicitly reference that you "remember" things unless the user asks.`
}
```

### 5.3 Token Budget Management

- Default memory budget: **2000 tokens** (configurable in settings).
- Memories are sorted by: pinned first, then recency.
- If total memory exceeds budget, older unpinned memories are trimmed.
- Approximate token count using `content.length / 4` (rough heuristic) or use `tiktoken` for accuracy.

---

## 6. Multi-Model Context Handling

### 6.1 The Core Challenge

When a user switches from GPT-4o to Claude Sonnet mid-conversation, the new model has no knowledge of prior messages. The solution: **replay the full message history** as context in every API call.

### 6.2 Message Format Normalization

Different providers expect different formats. The IPC handler normalizes:

```typescript
// In the main process, before calling the adapter
function buildProviderMessages(
  messages: Message[],
  providerId: string
): ProviderMessage[] {
  // All providers support the OpenAI-style format:
  // [{ role: 'system' | 'user' | 'assistant', content: string }]
  return messages.map(m => ({
    role: m.role,
    content: m.content
  }))
}
```

All five current adapters (OpenAI, Anthropic, Google, NVIDIA, Deepgram) accept this format with minor variations that the adapters already handle.

### 6.3 Context Window Management

When conversation history exceeds a model's context window:

1. **Always include**: system prompt + memories + last N messages.
2. **Summarize middle**: Use the model to compress older messages into a summary.
3. **Token counting**: Track `token_count` per message in DB. Before sending, sum tokens and truncate from the oldest.

```
Priority (highest to lowest):
1. System prompt + memory injection     (~2000 tokens)
2. Last 10 messages                     (variable)
3. Summarized earlier context           (~1000 tokens)
4. Older messages (truncated if needed)
```

---

## 7. Feasibility Analysis

### 7.1 What Already Exists (Can Reuse)

| Component | Status | Reuse Strategy |
|-----------|--------|----------------|
| Adapter system (5 providers) | ✅ Working | Reuse directly. Adapters already handle streaming. Add a `chat()` method alongside existing `execute()`. |
| IPC infrastructure | ✅ Working | Extend with new channels. Pattern is well-established. |
| SQLite via better-sqlite3 | ✅ Working | Add new tables. Same DB file, same connection pattern. |
| Credential storage (keytar) | ✅ Working | No changes needed. |
| Zustand store | ✅ Working | Extend shape. Keep localStorage persistence for UI state. |
| Streaming (chunk/done/error) | ✅ Working | Reuse pattern. Rename channels from `test:*` to `chat:*` or alias. |
| Ref-based IPC subscription | ✅ Working | Apply same pattern to new ChatScreen. |
| macOS build pipeline | ✅ Working | `npm run build:mac` already produces .dmg. |

### 7.2 What Needs to Be Built

| Component | Effort | Complexity | Notes |
|-----------|--------|------------|-------|
| Conversations DB schema + IPC | 2-3 days | Low | Straightforward CRUD. FTS adds ~1 day. |
| ChatScreen UI | 5-7 days | Medium | Core new screen. Message list, input bar, model dropdown. |
| Model selector dropdown | 1-2 days | Low | Show all models grouped by provider. Green ✅ for connected, grayed out for unconnected. |
| Message persistence | 2-3 days | Low | Save/load messages to SQLite on send/receive. |
| Memory extraction | 3-4 days | Medium | LLM-based summarization. Prompt engineering + deduplication logic. |
| Memory injection | 1-2 days | Low | System prompt assembly with token budgeting. |
| Memory management UI | 2-3 days | Low | CRUD screen for viewing/editing memories. |
| Context window management | 2-3 days | Medium | Token counting, truncation, optional summarization. |
| Navigation refactor | 1-2 days | Low | Additive: add Conversations section to sidebar. Remove only TextGen/CodeGen workspace routes. Keep ImageGen/ASR/TTS/Catalogue. |
| Code block rendering | 1-2 days | Low | Syntax highlighting in chat messages. Libraries exist. |
| Migration system | 1 day | Low | Simple version-based SQL migrations. |
| **Total estimate** | **~24-33 days** | | For a single developer. Parallelizable components could cut this. |

### 7.3 Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Context window overflow on model switch | Messages may exceed new model's limit | Token counting + smart truncation. Always check before sending. |
| Memory extraction quality | LLM may extract irrelevant facts or hallucinate | User review of memories. Editable. Conservative extraction prompt. |
| FTS performance on large histories | Slow search with 100k+ messages | SQLite FTS5 handles millions of rows well. Index properly. |
| Conversation replay latency | Sending 50+ messages as context is slow | Summarize older messages. Lazy-load in UI. |
| Migration breaking existing data | Users lose test_runs or connections | Additive-only migrations. Never drop existing tables. |

---

## 8. Local Storage Architecture (macOS .dmg Context)

### 8.1 Data Locations

Since this is a local-first macOS app packaged as a .dmg:

```
~/Library/Application Support/dexterai/
├── dexterai.sqlite              # Main database (conversations, messages, memories, existing tables)
├── dexterai.sqlite-wal          # SQLite WAL file (auto-managed)
└── dexterai.sqlite-shm          # SQLite shared memory (auto-managed)

~/Library/Application Support/dexterai/   # Or wherever Electron's app.getPath('userData') points
└── registry-cache.json          # Existing: cached model registry

OS Keychain (via keytar)
└── API keys per provider        # Existing: never touches disk as plaintext

~/.config/dexterai/              # Optional: user preferences export/backup
```

### 8.2 Why SQLite Is the Right Choice

For a local macOS desktop app, SQLite is ideal:

- **No server process** — it's just a file. Electron main process reads/writes directly.
- **ACID compliant** — no data corruption even on crashes.
- **FTS5** — built-in full-text search, no need for Elasticsearch or similar.
- **WAL mode** — concurrent reads during writes (good for streaming + UI reads).
- **Single file backup** — user can copy the .sqlite file to back up everything.
- **Performance** — handles millions of rows. A user would need thousands of conversations with hundreds of messages each before any concern.
- **Already in use** — dexterAI v1 already uses better-sqlite3. Zero new dependencies.

### 8.3 Data Size Estimates

| Data | Average Size | 1 Year Estimate (heavy user) |
|------|-------------|------------------------------|
| 1 message | ~500 bytes | — |
| 1 conversation (50 msgs) | ~25 KB | — |
| 1000 conversations/year | — | ~25 MB |
| Memories (500 entries) | — | ~250 KB |
| FTS index | ~30% of content | ~8 MB |
| **Total DB after 1 year** | | **~35 MB** |

This is tiny. No storage concerns for a local app.

### 8.4 Backup & Data Portability

- **Auto-backup**: On app launch, copy `dexterai.sqlite` to `dexterai.sqlite.bak` (keep last 3 backups).
- **Export**: Allow exporting all conversations as JSON or individual conversations as Markdown.
- **Import**: Allow importing conversations from JSON backup.
- **Reset**: Settings option to clear all conversations/memories while keeping API keys.

---

## 9. UI/UX Specifications

### 9.1 Chat Input Bar (The Core Interaction)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                   │
│  [Message bubbles scroll area]                                    │
│                                                                   │
│  ┌─ User ──────────────────────────────────────────────────────┐ │
│  │ How do I implement a binary search tree in Python?          │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─ Claude Sonnet 4 ───────────────────────────────────────────┐ │
│  │ Here's a clean implementation:                               │ │
│  │ ```python                                                    │ │
│  │ class Node:                                                  │ │
│  │     def __init__(self, val):                                 │ │
│  │         self.val = val           [Copy] [Insert to Editor]   │ │
│  │ ```                                                          │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────┐ ┌──────────┐ ┌──────┐ │
│ │ Ask anything...                       │ │ ▼ Model  │ │  ➤   │ │
│ │                                       │ │Claude 4  │ │ Send │ │
│ └───────────────────────────────────────┘ └──────────┘ └──────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 Model Selector Dropdown

```
┌──────────────────────────────┐
│ ▾ Select Model                │
├──────────────────────────────┤
│ ANTHROPIC                     │
│   ✅ Claude Sonnet 4          │
│   ✅ Claude Haiku 3.5         │
├──────────────────────────────┤
│ OPENAI                        │
│   ✅ GPT-4o                   │
│   ✅ GPT-4o Mini              │
│   ✅ o1-preview               │
├──────────────────────────────┤
│ GOOGLE                        │
│   ░░ Gemini 2.0 Flash    ←── grayed out (no API key)
│   ░░ Gemini 1.5 Pro      ←── grayed out (no API key)
├──────────────────────────────┤
│ NVIDIA                        │
│   ░░ Llama 3.1 405B      ←── grayed out (no API key)
└──────────────────────────────┘
  ✅ = connected provider, selectable
  ░░ = no API key, visible but disabled
  Clicking a grayed model shows tooltip: "Connect API key in Settings →"
```

### 9.3 Sidebar

```
┌──────────────────────────┐
│ [+] New Chat              │
├──────────────────────────┤
│ CONVERSATIONS             │
│ 🔍 Search...              │
│                            │
│ TODAY                      │
│  Binary search tree        │
│  Email draft for Tom       │
│ YESTERDAY                  │
│  API design review         │
│  React hooks tutorial      │
│ LAST 7 DAYS                │
│  Project planning          │
│  ...                       │
├──────────────────────────┤
│ WORKSPACES                 │
│  🖼 Image Generation       │
│  🎤 Audio Transcription    │
│  🔊 Text-to-Speech         │
├──────────────────────────┤
│ 📦 Model Catalogue         │
├──────────────────────────┤
│ 🔑 API Connections         │
│ 🧠 Memory                  │
│ ⚙ Settings                │
└──────────────────────────┘
```

---

## 10. Implementation Phases

### Phase 1 — Foundation (Week 1-2)
- Database schema: `conversations`, `messages`, `memories` tables + migration system
- New IPC channels: conversations CRUD, messages CRUD
- Basic ChatScreen with message list and input bar
- Model selector dropdown (uses existing `registry:getModels` + `credentials:listConnected` to show all models with connection status)
- Message persistence (save on send, save on stream complete)
- Navigation update: add Conversations section to sidebar above Workspaces, set as primary landing

### Phase 2 — Chat Polish (Week 3-4)
- Streaming integration with ref-based pattern
- Model switching mid-conversation with full history replay
- Conversation auto-titling (use LLM to generate title from first exchange)
- Search (FTS5 integration)
- Code block rendering with syntax highlighting
- System prompt and parameter settings per conversation
- Stop/cancel generation

### Phase 3 — Memory System (Week 5-6)
- Memory extraction pipeline (prompt engineering + LLM call)
- Memory storage and deduplication
- Memory injection into system prompt
- Memory management UI (view, edit, delete, pin)
- Token budget management
- Context window overflow handling (truncation + optional summarization)

### Phase 4 — Polish & Package (Week 7-8)
- Keyboard shortcuts (Cmd+N for new chat, Cmd+K for search, etc.)
- Conversation export (Markdown, JSON)
- Auto-backup system
- Data management (clear history, clear memories, reset)
- macOS .dmg build testing and optimization
- Edge cases: offline behavior, API errors mid-conversation, very long conversations
- Performance testing with large conversation histories

---

## 11. Dependencies (New)

| Package | Purpose | Already in Project? |
|---------|---------|---------------------|
| `better-sqlite3` | DB engine | ✅ Yes |
| `uuid` | Generate conversation/message IDs | Check — may already use crypto.randomUUID() |
| `react-markdown` + `remark-gfm` | Render markdown in messages | ❌ New |
| `react-syntax-highlighter` or `shiki` | Code block highlighting | ❌ New (Monaco exists but is heavy for inline blocks) |
| `tiktoken` (optional) | Accurate token counting | ❌ New (can start with heuristic) |

No new infrastructure dependencies. No cloud services. No additional Electron APIs beyond what's already used.

---

## 12. What Gets Deprecated (Not Removed Immediately)

- **TextGenWorkspace** — replaced by ChatScreen. Can coexist during transition behind its existing route.
- **CodeGenWorkspace** — replaced by code capabilities within ChatScreen. Same transition strategy.
- **TestWorkspace router** (the workspace-picker that routes to TextGen/CodeGen based on model category) — replaced by conversation router for text/code models. Remains functional for ImageGen/ASR/TTS models.
- **Home screen (use-case gallery)** — replaced by conversation list as landing page.
- **`test:chunk` / `test:done` / `test:error`** — replaced by `chat:chunk` / `chat:done` / `chat:error` for conversation context. Keep originals alive for ImageGen/ASR/TTS workspaces that still use the one-shot pattern.

**NOT deprecated (kept as-is):**
- **ImageGenWorkspace** — remains as a dedicated sidebar workspace.
- **ASRWorkspace** — remains as a dedicated sidebar workspace.
- **TTSWorkspace** — remains as a dedicated sidebar workspace.
- **Model Catalogue** — remains as a sidebar nav item.
- **Connections screen** — remains as-is.

These should be kept in the codebase behind feature flags or routes during development so v1 functionality isn't broken until v2 is stable.

---

## 13. Open Questions

1. **~~Should ImageGen/ASR/TTS remain as separate workspaces?~~** ✅ **RESOLVED: Yes.** They remain in the sidebar under a "Workspaces" section below Conversations. Long-term, consider multi-modal chat (images inline, voice messages) but not for v2.

2. **How aggressive should auto-memory be?** Should every conversation trigger memory extraction, or only longer ones (>10 messages)? Recommendation: only conversations with >5 user messages, with a manual "Save to memory" button always available.

3. **Should the model dropdown remember the last-used model?** Yes — persist in Zustand (localStorage). Different from per-conversation model.

4. **Rate limit failover (from CLAUDE.md roadmap)** — implement in Phase 3 or defer to v3? Recommendation: defer. Get the chat + memory foundation right first.

5. **Multi-modal messages (images in chat)?** Defer to v3. Google's adapter already supports image generation — could send image prompts and display results inline, but this adds significant complexity.

6. **Should grayed-out models in the dropdown be clickable?** Recommendation: clicking a grayed-out model shows a tooltip/toast with "Connect {Provider} API key in Settings →" linking to the Connections page. This drives discoverability of the connection flow.
