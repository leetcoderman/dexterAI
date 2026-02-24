# dexterAI v2 — Implementation Plan

## Phase Overview

| Phase | Focus | Tasks | Depends On |
|-------|-------|-------|------------|
| **Phase 1** | Database & Backend Foundation | 8 tasks | — |
| **Phase 2** | Chat UI Core (P0) | 9 tasks | Phase 1 |
| **Phase 3** | Chat Polish (P1) | 7 tasks | Phase 2 |
| **Phase 4** | Memory System (P1) | 6 tasks | Phase 3 |
| **Phase 5** | Navigation & Cleanup | 5 tasks | Phase 2 |
| **Phase 6** | P2 Features & Final Polish | 6 tasks | Phase 4, 5 |

---

## Phase 1 — Database & Backend Foundation

Everything the main process needs before any UI work begins.

### Task 1.1: Add migration system to database.ts

**File:** `src/main/db/database.ts`

- Add a `runMigrations(db)` function that reads `schema_version` from the `metadata` table (default `1` if not set)
- Define a `MIGRATIONS` array with versioned SQL strings
- After `db.exec(schema)` in `initDatabase()`, call `runMigrations(db)`
- Migration v2 creates the 3 new tables (conversations, messages, memories) + indexes + FTS

**Why first:** Everything else depends on these tables existing.

### Task 1.2: Add v2 tables to schema

**File:** `src/main/db/schema.sql` (add at bottom, guarded with `IF NOT EXISTS`)

New tables:
```sql
conversations (id TEXT PK, title TEXT, created_at TEXT, updated_at TEXT, settings_json TEXT DEFAULT '{}')
messages (id TEXT PK, conversation_id TEXT FK, role TEXT, content TEXT, model_id TEXT, provider_id TEXT, token_count INTEGER, created_at TEXT, metadata_json TEXT DEFAULT '{}')
memories (id TEXT PK, key TEXT, content TEXT, source_conversation_id TEXT, created_at TEXT, updated_at TEXT, is_pinned INTEGER DEFAULT 0)
```

Indexes: `idx_messages_conversation(conversation_id, created_at ASC)`, `idx_memories_key(key)`

FTS: `messages_fts USING fts5(content, conversation_id UNINDEXED)` with insert/delete triggers.

### Task 1.3: Add shared types for v2

**File:** `packages/registry-types/src/index.ts`

Add interfaces:
- `Conversation` — `{ id, title, created_at, updated_at, settings_json }`
- `ConversationSummary` — `{ id, title, last_message_preview, last_message_at, model_id, provider_id, message_count }`
- `ChatMessage` — `{ id, conversation_id, role, content, model_id, provider_id, token_count, created_at, metadata_json }`
- `Memory` — `{ id, key, content, source_conversation_id, created_at, updated_at, is_pinned }`
- `ConversationSettings` — `{ systemPrompt, temperature, maxTokens, memoryEnabled }`
- `ChatRequest` — `{ conversationId, requestId, modelId, providerId, messages, params }`

### Task 1.4: Create conversations IPC handler

**File:** `src/main/ipc/conversations.ipc.ts` (new)

Export `registerConversationHandlers()`. Channels:
- `conversations:list` → `SELECT c.*, (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_preview, (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count FROM conversations c ORDER BY updated_at DESC`
- `conversations:get(id)` → Return conversation row
- `conversations:create(title?, settings_json?)` → INSERT with `crypto.randomUUID()`, return full row
- `conversations:update(id, { title?, settings_json? })` → UPDATE, set `updated_at`
- `conversations:delete(id)` → DELETE (CASCADE deletes messages via FK)

### Task 1.5: Create messages IPC handler

**File:** `src/main/ipc/messages.ipc.ts` (new)

Export `registerMessageHandlers()`. Channels:
- `messages:list(conversationId)` → `SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`
- `messages:add(message)` → INSERT with `crypto.randomUUID()`, return row. Also update `conversations.updated_at`
- `messages:update(id, { content?, token_count?, metadata_json? })` → UPDATE (for streaming completion: append content, set final token count)
- `messages:delete(id)` → DELETE single message
- `messages:search(query)` → `SELECT m.*, c.title FROM messages_fts fts JOIN messages m ON m.rowid = fts.rowid JOIN conversations c ON c.id = m.conversation_id WHERE messages_fts MATCH ? ORDER BY rank LIMIT 50`

### Task 1.6: Create chat IPC handler (streaming)

**File:** `src/main/ipc/chat.ipc.ts` (new)

Export `registerChatHandlers()`. This is the conversation-aware equivalent of `provider:test`.

Channels:
- `chat:send(request: ChatRequest)` → Similar to `provider:test` but:
  - Receives full `messages[]` array (already persisted by renderer)
  - Creates `ProviderEmitter` that forwards to `chat:chunk`, `chat:done`, `chat:error` (not `test:*`)
  - On `chat:done`: updates the assistant message in DB with final content + token count + metrics
  - Uses same `ActiveRequests` Map + `AbortController` pattern
  - Calls `AdapterRegistry.get(providerId)` and `CredentialStore.get(providerId)` same as provider.ipc.ts
- `chat:cancel(requestId)` → Same as `provider:cancel`

Event channels (main→renderer): `chat:chunk`, `chat:done`, `chat:error`

### Task 1.7: Register new handlers in main/index.ts

**File:** `src/main/index.ts`

- Import and call `registerConversationHandlers()`, `registerMessageHandlers()`, `registerChatHandlers()`
- Keep all existing handler registrations unchanged

### Task 1.8: Expose new APIs in preload

**File:** `src/preload/index.ts` and `src/preload/index.d.ts`

Add to the `dexterai` API object:
- `conversations: { list, get, create, update, delete }` — all invoke-based
- `messages: { list, add, update, delete, search }` — all invoke-based
- `chat: { send, cancel }` — invoke-based
- `on('chat:chunk', handler)`, `on('chat:done', handler)`, `on('chat:error', handler)` — event subscriptions

Keep all existing APIs unchanged.

### Phase 1 Verification
- Run `npm run typecheck` — should pass
- Run `npm run dev` — app should start, DB migration should run (check console for "schema_version" = 2)
- Verify tables exist: open SQLite DB file and inspect

---

## Phase 2 — Chat UI Core (P0)

The minimum viable chat experience: send messages, see streaming responses, switch models, persist everything.

### Task 2.1: Install new dependencies

**From repo root:**
```bash
cd apps/desktop && pnpm add react-markdown remark-gfm react-syntax-highlighter
pnpm add -D @types/react-syntax-highlighter
```

### Task 2.2: Extend Zustand store

**File:** `src/renderer/src/store/index.ts`

Add to `AppState`:
```typescript
activeConversationId: string | null
setActiveConversation: (id: string | null) => void

conversations: ConversationSummary[]
loadConversations: () => Promise<void>

allModels: RegistryModel[]
loadAllModels: () => Promise<void>

selectedModelId: string | null
selectedProviderId: string | null
setSelectedModel: (modelId: string, providerId: string) => void
```

Implementation:
- `loadConversations()` calls `window.dexterai.conversations.list()` and sets state
- `loadAllModels()` calls `window.dexterai.registry.getModels()` and sets state
- `selectedModelId` / `selectedProviderId` persisted to localStorage (remember last used model)
- Keep all existing state/actions unchanged

### Task 2.3: Create ModelSelector component

**File:** `src/renderer/src/components/ModelSelector.tsx` (new)

Props: `selectedModelId`, `selectedProviderId`, `onSelect(modelId, providerId)`, `connectedProviders[]`

- Dropdown (custom, not native `<select>`) grouped by provider
- Each group header: provider name (OPENAI, ANTHROPIC, GOOGLE, NVIDIA NIM)
- Each model row: model name + green check if provider is in `connectedProviders`, grayed out + disabled if not
- Clicking disabled model: toast/tooltip "Connect {provider} API key in Connections"
- Filter to only `text_generation` and `code_generation` categories
- Search/filter input at top of dropdown

### Task 2.4: Create ChatInput component

**File:** `src/renderer/src/components/chat/ChatInput.tsx` (new)

Props: `onSend(text)`, `onStop()`, `isStreaming`, `modelId`, `providerId`, `onModelChange`

- Multi-line textarea (Shift+Enter for newline, Enter or Cmd+Enter to send)
- ModelSelector dropdown to the left of Send button
- Send button (or Stop button when streaming)
- Fixed at bottom of chat view
- Disabled state when no model selected or provider not connected

### Task 2.5: Create MessageBubble component

**File:** `src/renderer/src/components/chat/MessageBubble.tsx` (new)

Props: `message: ChatMessage`, `isStreaming?: boolean`

- User messages: right-aligned, primary color background
- Assistant messages: left-aligned, subtle background, model badge (small label showing model name)
- System messages: centered, muted style
- Render content as markdown using `react-markdown` + `remark-gfm`
- Code blocks: use `react-syntax-highlighter` with language detection, copy button per block
- Streaming indicator: blinking cursor at end when `isStreaming` is true

### Task 2.6: Create ChatScreen

**File:** `src/renderer/src/screens/ChatScreen.tsx` (new)

The core experience. Route: `/chat/:conversationId`

Structure:
- Header: conversation title (editable), model badge for last used model
- Message list: scrollable area of `MessageBubble` components, auto-scroll on new messages
- ChatInput at bottom

State management:
- Load messages from DB via `window.dexterai.messages.list(conversationId)` on mount
- Use ref-based IPC subscription pattern for `chat:chunk`, `chat:done`, `chat:error` (same pattern as fixed workspaces)
- `requestIdRef` for tracking active request
- On send:
  1. Create user message in DB via `messages:add`
  2. Create placeholder assistant message in DB via `messages:add` (empty content, with model_id/provider_id)
  3. Set `requestIdRef.current` synchronously
  4. Call `window.dexterai.chat.send({ conversationId, requestId, modelId, providerId, messages })`
  5. On `chat:chunk`: append text to assistant message in local state
  6. On `chat:done`: update assistant message in DB with final content + metrics via `messages:update`
  7. On `chat:error`: update assistant message with error text
- Model switching: just change the dropdown — next message uses new model, previous messages sent as context

### Task 2.7: Create ChatListScreen

**File:** `src/renderer/src/screens/ChatListScreen.tsx` (new)

Route: `/` (replaces Home as landing when onboarded)

- Load conversations via `store.loadConversations()` on mount
- Group by time: Today, Yesterday, Last 7 Days, Older
- Each row: title (or "New conversation"), last message preview (truncated), timestamp, model icon/badge
- Click row → navigate to `/chat/:id`
- Empty state: "Start your first conversation" with New Chat button
- Delete conversation: swipe or right-click context menu → confirm → `conversations:delete`

### Task 2.8: Add routes for chat screens

**File:** `src/renderer/src/App.tsx`

Add new routes inside the `AppLayout` group:
- `/` → `<ChatListScreen />` (replaces `<Home />` for onboarded users)
- `/chat/:conversationId` → `<ChatScreen />`

Keep all existing routes (`/catalogue`, `/provider/:providerId`, `/test/:modelId`).
Move `<Home />` to `/explore` or keep it accessible from sidebar as "Explore" if desired.

### Task 2.9: Add "New Chat" action

**File:** Multiple

- In ChatListScreen: "New Chat" button at top → calls `conversations:create()` → navigates to `/chat/:newId`
- In Sidebar (Task 5.1): "New Chat" button at top of Conversations section
- Auto-select last used model (from Zustand `selectedModelId`)

### Phase 2 Verification
- Start app → see conversation list (empty state)
- Click "New Chat" → land on ChatScreen with input bar and model dropdown
- Select a connected model → type message → see streaming response
- Close and reopen app → conversation and messages persist
- Switch models mid-conversation → next response comes from new model with full history as context

---

## Phase 3 — Chat Polish (P1)

Features that make the chat experience feel complete.

### Task 3.1: Conversation auto-titling

**File:** `src/main/ipc/chat.ipc.ts`

After the first assistant response completes (`chat:done` for the first exchange):
- Call the same model with a prompt: "Generate a short title (3-6 words) for this conversation based on the user's first message: '{firstUserMessage}'. Reply with just the title, no quotes."
- Update `conversations.title` with the result
- Send a `chat:title-updated` event to renderer so UI updates

### Task 3.2: Conversation search

**File:** `src/renderer/src/screens/ChatListScreen.tsx` + existing `messages:search` IPC

- Add search input at top of conversation list
- On type (debounced 300ms): call `messages:search(query)`
- Show matching conversations with highlighted snippets
- Click result → navigate to `/chat/:conversationId`

### Task 3.3: Code block rendering upgrade

**File:** `src/renderer/src/components/chat/MessageBubble.tsx`

Enhance the markdown renderer's code block handling:
- Detect language from markdown fence (```python, ```typescript, etc.)
- Syntax highlighting via `react-syntax-highlighter` with `oneDark` theme
- Copy button (top-right of code block)
- Language label (top-left of code block)
- Wrap long lines option

### Task 3.4: Conversation settings drawer

**File:** `src/renderer/src/components/chat/SettingsDrawer.tsx` (new)

Slide-out panel accessible from ChatScreen header:
- System prompt textarea (default: "You are a helpful AI assistant.")
- Temperature slider (0-2, default 0.7)
- Max tokens input (default 2048)
- Memory toggle (on/off, default on) — wired up in Phase 4
- Settings saved to `conversations.settings_json` via `conversations:update`

### Task 3.5: Conversation rename

**File:** `src/renderer/src/screens/ChatScreen.tsx`

- Click on conversation title in header → inline edit mode
- On blur/enter → save via `conversations:update`
- If title is empty, revert to auto-generated title

### Task 3.6: Stop/Cancel generation

**File:** `src/renderer/src/screens/ChatScreen.tsx`

- During streaming: Send button becomes Stop button
- On click: call `window.dexterai.chat.cancel(requestIdRef.current)`
- Update assistant message with whatever content was received so far
- Save partial content to DB

### Task 3.7: Model tags in dropdown

**File:** `src/renderer/src/components/ModelSelector.tsx`

- Add small badge/tag next to models indicating strengths: "Code", "Vision", "Fast"
- Data source: `supported_features` from registry models + category
- Code models (category `code_generation`): show "Code" tag
- Models with `vision` in `supported_features`: show "Vision" tag
- Models with `thinking` in `supported_features`: show "Reasoning" tag

### Phase 3 Verification
- Send first message → title auto-generates after response
- Type in search → matching conversations filter
- Model returns code → renders with syntax highlighting + copy button
- Open settings drawer → change temperature → next response uses new temperature
- Click title → rename inline
- Click stop during streaming → generation stops, partial content preserved

---

## Phase 4 — Memory System (P1)

### Task 4.1: Create memory IPC handler

**File:** `src/main/ipc/memory.ipc.ts` (new)

Export `registerMemoryHandlers()`. Channels:
- `memory:list` → `SELECT * FROM memories ORDER BY is_pinned DESC, updated_at DESC`
- `memory:save(memory)` → INSERT or UPDATE (upsert by id)
- `memory:delete(id)` → DELETE
- `memory:toggle-pin(id)` → Toggle `is_pinned` value

Register in `main/index.ts`, expose in preload.

### Task 4.2: Memory extraction pipeline

**File:** `src/main/ipc/memory.ipc.ts`

New channel: `memory:extract(conversationId)`

Implementation:
- Load last N messages from conversation (N = 20 or configurable)
- Build extraction prompt: "Given this conversation, extract key facts about the user — preferences, project details, technical choices, personal info. Return as JSON array: [{key: 'category', content: 'fact'}]. Only include genuinely useful facts. Be conservative."
- Call the user's currently selected model via `AdapterRegistry.get(providerId).execute()`
- Parse the JSON response
- Deduplicate against existing memories (compare `content` similarity — simple string matching or exact match)
- Insert new memories, update existing ones with newer content
- Return the list of new/updated memories

### Task 4.3: Memory injection into system prompt

**File:** `src/main/ipc/chat.ipc.ts`

Before sending messages to the adapter in `chat:send`:
- Check conversation settings for `memoryEnabled` (default true)
- If enabled: load memories from DB, sort by pinned first then recency
- Apply token budget (default 2000 tokens, approximate with `content.length / 4`)
- Trim oldest unpinned memories if over budget
- Build system prompt: user's system prompt + `<user_context>` block with memory bullets
- Prepend as first message in the messages array sent to the adapter

### Task 4.4: Auto-extract trigger

**File:** `src/main/ipc/chat.ipc.ts`

After `chat:done` event:
- Count user messages in conversation
- If `>= 5` user messages AND no memory extraction has been done for this conversation:
  - Queue a background memory extraction (non-blocking)
  - Mark conversation as "memory extracted" in `metadata_json` or a flag

### Task 4.5: Memory management screen

**File:** `src/renderer/src/screens/MemoryScreen.tsx` (new)

Route: `/memory`

- List all memories grouped by `key` (category)
- Each memory: content text, source conversation link, created/updated dates, pin toggle
- Edit button → inline edit of content
- Delete button → confirm → `memory:delete`
- Manual "Extract from conversation" button → select conversation → `memory:extract`
- Show total memory token count at top

### Task 4.6: Wire memory into store and settings

**File:** `src/renderer/src/store/index.ts`

Add:
- `memories: Memory[]`
- `loadMemories: () => Promise<void>` → calls `window.dexterai.memory.list()`

**File:** `src/renderer/src/components/chat/SettingsDrawer.tsx`

- Memory toggle checkbox wired to `conversationSettings.memoryEnabled`
- Show current memory count: "X memories will be injected"

### Phase 4 Verification
- Have a few conversations mentioning personal details (name, language preference, project)
- Trigger memory extraction → see memories appear in Memory screen
- Start new conversation → memories injected in system prompt (verify in adapter logs)
- Edit/delete/pin memories → changes reflected
- Toggle memory off for a conversation → memories not injected

---

## Phase 5 — Navigation & Cleanup

Run in parallel with Phase 3/4 where possible.

### Task 5.1: Restructure Sidebar

**File:** `src/renderer/src/components/layout/Sidebar.tsx`

New structure (top to bottom):
1. **[+] New Chat** button (prominent, at very top)
2. **Conversations** section: search input + conversation list (from store, grouped by date)
3. **Workspaces** section: Image Generation, Audio Transcription, Text-to-Speech (keep existing links, but route to `/test/:modelId` as before)
4. **Model Catalogue** nav item (keep existing `/catalogue` route)
5. **Connections** section: provider logos (keep existing `/provider/:providerId` routes)
6. **Memory** nav item → `/memory`
7. **Settings** nav item → `/settings` (placeholder for now)

Remove: Hub section header, TextGen and CodeGen workspace links (since they're now in chat).
Keep: ImageGen, ASR, TTS workspace links.

### Task 5.2: Update App.tsx routing

**File:** `src/renderer/src/App.tsx`

Updated route table:
- `/` → `<ChatListScreen />` (was `<Home />`)
- `/chat/:conversationId` → `<ChatScreen />`
- `/catalogue` → `<Catalogue />` (unchanged)
- `/provider/:providerId` → `<Connection />` (unchanged)
- `/test/:modelId` → `<TestWorkspace />` (unchanged — still needed for ImageGen/ASR/TTS)
- `/memory` → `<MemoryScreen />`
- `/explore` → `<Home />` (optional: move old Home here for category browsing)

### Task 5.3: Update Topbar

**File:** `src/renderer/src/components/layout/Topbar.tsx`

- Add route-aware title for new routes: `/chat/:id` → conversation title, `/memory` → "Memory"
- Keep existing title logic for other routes

### Task 5.4: Update onboarding final step

**File:** `src/renderer/src/screens/Onboarding.tsx`

- After onboarding completes, navigate to `/` (conversation list) instead of `/catalogue`
- Auto-create first conversation and navigate to `/chat/:id` for immediate engagement

### Task 5.5: Sync store on app load

**File:** `src/renderer/src/App.tsx`

On mount (for onboarded users):
- Call `store.syncConnectedProviders()` (already exists)
- Call `store.loadConversations()`
- Call `store.loadAllModels()`

### Phase 5 Verification
- App opens → sidebar shows new structure with conversations at top
- New Chat button works from sidebar
- Clicking conversation in sidebar navigates to chat
- ImageGen/ASR/TTS workspace links still work
- Catalogue, Connections still accessible
- Onboarding drops user into new chat

---

## Phase 6 — P2 Features & Final Polish

Optional features that enhance the experience but aren't core.

### Task 6.1: Regenerate response

**File:** `src/renderer/src/screens/ChatScreen.tsx`

- Add "Regenerate" button on the last assistant message
- On click: delete the last assistant message from DB, re-send the last user message to the current model
- Use same streaming flow

### Task 6.2: Edit and resend

**File:** `src/renderer/src/screens/ChatScreen.tsx` + `MessageBubble.tsx`

- Click on a user message → inline edit mode
- On submit: delete all messages after this one (fork), resend edited message
- Update DB accordingly (delete forked messages, add new ones)

### Task 6.3: Export conversation

**File:** `src/main/ipc/conversations.ipc.ts`

New channel: `conversations:export(id, format: 'markdown' | 'json')`
- Markdown: format as `## User\n{content}\n\n## Assistant ({model})\n{content}\n\n`
- JSON: dump full conversation + messages array
- Return string content, let renderer trigger file download

### Task 6.4: Monaco scratchpad

**File:** `src/renderer/src/components/chat/CodeScratchpad.tsx` (new)

- Toggle-able split panel in ChatScreen
- Click "Insert to editor" on a code block → appends to scratchpad
- Full Monaco editor for editing
- Copy all / clear buttons

### Task 6.5: Keyboard shortcuts

**File:** `src/renderer/src/screens/ChatScreen.tsx` and global

- `Cmd+N` → New Chat
- `Cmd+K` → Focus search in sidebar
- `Cmd+Shift+S` → Toggle settings drawer
- `Escape` → Close dropdown/drawer
- Register via `useEffect` with `keydown` listener

### Task 6.6: Context window management

**File:** `src/main/ipc/chat.ipc.ts`

Before sending messages to adapter:
- Sum `token_count` across all messages
- Compare against model's `context_window` from registry
- If exceeding: keep system prompt + memories + last 10 messages
- Optionally: summarize older messages using LLM (add `chat:summarize` internal function)
- Log truncation in console for debugging

### Phase 6 Verification
- Regenerate button works on last message
- Edit a user message → conversation forks correctly
- Export as Markdown/JSON produces valid output
- Keyboard shortcuts work
- Very long conversations don't crash (context window management)

---

## Dependency Graph

```
Phase 1 (DB + Backend)
    │
    ├──► Phase 2 (Chat UI Core)
    │        │
    │        ├──► Phase 3 (Chat Polish)
    │        │        │
    │        │        └──► Phase 4 (Memory System)
    │        │                 │
    │        │                 └──► Phase 6 (P2 + Polish)
    │        │
    │        └──► Phase 5 (Navigation)
    │                 │
    │                 └──► Phase 6 (P2 + Polish)
```

## Files Summary

### New Files (13)
| File | Phase |
|------|-------|
| `src/main/ipc/conversations.ipc.ts` | 1 |
| `src/main/ipc/messages.ipc.ts` | 1 |
| `src/main/ipc/chat.ipc.ts` | 1 |
| `src/main/ipc/memory.ipc.ts` | 4 |
| `src/renderer/src/screens/ChatScreen.tsx` | 2 |
| `src/renderer/src/screens/ChatListScreen.tsx` | 2 |
| `src/renderer/src/screens/MemoryScreen.tsx` | 4 |
| `src/renderer/src/components/ModelSelector.tsx` | 2 |
| `src/renderer/src/components/chat/ChatInput.tsx` | 2 |
| `src/renderer/src/components/chat/MessageBubble.tsx` | 2 |
| `src/renderer/src/components/chat/SettingsDrawer.tsx` | 3 |
| `src/renderer/src/components/chat/CodeScratchpad.tsx` | 6 |

### Modified Files (10)
| File | Phase(s) |
|------|----------|
| `src/main/db/database.ts` | 1 |
| `src/main/db/schema.sql` | 1 |
| `src/main/index.ts` | 1, 4 |
| `src/preload/index.ts` | 1, 4 |
| `src/preload/index.d.ts` | 1, 4 |
| `packages/registry-types/src/index.ts` | 1 |
| `src/renderer/src/store/index.ts` | 2 |
| `src/renderer/src/App.tsx` | 2, 5 |
| `src/renderer/src/components/layout/Sidebar.tsx` | 5 |
| `src/renderer/src/components/layout/Topbar.tsx` | 5 |
| `src/renderer/src/screens/Onboarding.tsx` | 5 |

### Untouched (Kept As-Is)
- All 5 adapter files
- ImageGenWorkspace, ASRWorkspace, TTSWorkspace
- CredentialStore
- RegistryManager
- EvaluationDrawer, HistoryTab, TemplateManager
- credentials.ipc.ts, history.ipc.ts, templates.ipc.ts, files.ipc.ts, registry.ipc.ts
