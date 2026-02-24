-- db/schema.sql
-- Migrations are applied on app startup via a versioned migrator.
-- Migration files: db/migrations/001_initial.sql, 002_templates.sql, etc.

-- Connected providers (lightweight index; truth is in Keychain)
CREATE TABLE IF NOT EXISTS connections (
  provider_id    TEXT PRIMARY KEY,
  model_ids      TEXT NOT NULL,  -- JSON array of verified model IDs
  connected_at   INTEGER NOT NULL,  -- Unix ms
  last_verified  INTEGER,
  token_total    INTEGER DEFAULT 0
);

-- Test run history
CREATE TABLE IF NOT EXISTS test_runs (
  id              TEXT PRIMARY KEY,  -- UUID
  model_id        TEXT NOT NULL,
  provider_id     TEXT NOT NULL,
  category        TEXT NOT NULL,
  params_json     TEXT NOT NULL,     -- Full input params (no API keys)
  output_summary  TEXT,              -- First 500 chars of text output, or metadata
  metrics_json    TEXT NOT NULL,     -- Full EvaluationMetrics JSON
  ran_at          INTEGER NOT NULL,  -- Unix ms
  error           TEXT               -- Null if successful
);
CREATE INDEX IF NOT EXISTS idx_runs_model ON test_runs(model_id, ran_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_category ON test_runs(category, ran_at DESC);

-- Prompt templates
CREATE TABLE IF NOT EXISTS prompt_templates (
  id          TEXT PRIMARY KEY,  -- UUID
  name        TEXT NOT NULL,
  category    TEXT NOT NULL,
  params_json TEXT NOT NULL,     -- Full workspace params snapshot
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_templates_category ON prompt_templates(category);

-- App metadata (schema version, registry version, etc.)
CREATE TABLE IF NOT EXISTS metadata (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL
);

-- v2: Conversations
CREATE TABLE IF NOT EXISTS conversations (
  id            TEXT PRIMARY KEY,
  title         TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  settings_json TEXT DEFAULT '{}'
);

-- v2: Messages
CREATE TABLE IF NOT EXISTS messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role            TEXT NOT NULL,
  content         TEXT NOT NULL,
  model_id        TEXT,
  provider_id     TEXT,
  token_count     INTEGER DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  metadata_json   TEXT DEFAULT '{}',
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at ASC);

-- v2: Full-text search for messages
CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(content, conversation_id UNINDEXED);

CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
  INSERT INTO messages_fts(rowid, content, conversation_id)
  VALUES (new.rowid, new.content, new.conversation_id);
END;

CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
  DELETE FROM messages_fts WHERE rowid = old.rowid;
END;

-- v2: Memories
CREATE TABLE IF NOT EXISTS memories (
  id                       TEXT PRIMARY KEY,
  key                      TEXT NOT NULL,
  content                  TEXT NOT NULL,
  source_conversation_id   TEXT,
  created_at               TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at               TEXT NOT NULL DEFAULT (datetime('now')),
  is_pinned                INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_memories_key ON memories(key);
