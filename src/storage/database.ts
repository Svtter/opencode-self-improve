import { Database } from 'bun:sqlite';
import { homedir } from 'os';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

let db: Database | null = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  triggers TEXT NOT NULL,
  content TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  usage_count INTEGER DEFAULT 0,
  quality_score REAL DEFAULT 0.0,
  file_path TEXT
);

CREATE TABLE IF NOT EXISTS skill_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_id INTEGER REFERENCES skills(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL,
  link_path TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS skill_usage_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_id INTEGER REFERENCES skills(id) ON DELETE CASCADE,
  usage_context TEXT,
  quality_score_after REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

export function initializeDatabase(dbPath: string): Database {
  const resolved = dbPath.replace('~', homedir());

  // Ensure parent directory exists
  const dir = dirname(resolved);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  db = new Database(resolved);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(SCHEMA);

  return db;
}

export function getDb(): Database {
  if (!db) throw new Error('Database not initialized. Call initializeDatabase() first.');
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
