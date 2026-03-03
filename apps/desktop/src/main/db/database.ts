import DatabaseType from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { readFileSync } from 'fs'

let db: DatabaseType.Database | null = null

export function initDatabase(): DatabaseType.Database {
  if (db) return db

  const dbPath = join(app.getPath('userData'), 'dexterai.sqlite')
  // verbose logging only in development — avoids leaking SQL queries in production builds
  db = new DatabaseType(dbPath, { verbose: process.env.NODE_ENV !== 'production' ? console.log : undefined })

  // Enable WAL mode for concurrent reads during streaming
  db.pragma('journal_mode = WAL')
  // Enable foreign keys (needed for CASCADE deletes)
  db.pragma('foreign_keys = ON')

  // Read and execute schema
  const schemaPath = join(__dirname, '../../src/main/db/schema.sql')
  try {
    const schema = readFileSync(schemaPath, 'utf8')
    db.exec(schema)
    console.log('Database schema initialized.')
  } catch (e) {
    console.error('Failed to initialize database schema:', e)
  }

  // Run migrations
  runMigrations(db)

  return db
}

export function getDatabase(): DatabaseType.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

function runMigrations(database: DatabaseType.Database): void {
  const row = database.prepare("SELECT value FROM metadata WHERE key = 'schema_version'").get() as
    | { value: string }
    | undefined
  const currentVersion = row ? parseInt(row.value, 10) : 1

  const migrations = [
    {
      version: 2,
      description: 'Add conversations, messages, memories tables',
      up: () => {
        // Tables already created by schema.sql IF NOT EXISTS
        // This migration just marks the version bump
        console.log('Migration v2: conversations/messages/memories tables ready.')
      }
    }
  ]

  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      console.log(`Running migration v${migration.version}: ${migration.description}`)
      migration.up()
      database
        .prepare("INSERT OR REPLACE INTO metadata (key, value) VALUES ('schema_version', ?)")
        .run(migration.version.toString())
    }
  }
}

export function closeDatabase() {
  if (db) {
    db.close()
    db = null
  }
}
