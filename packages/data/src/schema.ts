/**
 * Database schema - same SQL for both SQLite and sql.js
 */

export const SCHEMA_VERSION = 1;

export const MIGRATIONS = [
  // Migration 1: Initial schema
  `
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS words (
  id TEXT PRIMARY KEY,
  headword TEXT NOT NULL,
  pos TEXT,
  ipa TEXT,
  definition TEXT NOT NULL,
  example TEXT,
  gloss_de TEXT,
  etymology TEXT,
  mnemonic TEXT,
  tags TEXT,
  freq REAL DEFAULT 3.0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_words_headword ON words(headword);
CREATE INDEX IF NOT EXISTS idx_words_freq ON words(freq);

CREATE TABLE IF NOT EXISTS scheduling (
  word_id TEXT PRIMARY KEY,
  due_ts INTEGER NOT NULL,
  interval REAL NOT NULL DEFAULT 0,
  ease REAL NOT NULL DEFAULT 2.5,
  lapses INTEGER NOT NULL DEFAULT 0,
  is_new INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY(word_id) REFERENCES words(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sched_due ON scheduling(due_ts);
CREATE INDEX IF NOT EXISTS idx_sched_lapses ON scheduling(lapses);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  word_id TEXT NOT NULL,
  ts INTEGER NOT NULL,
  grade INTEGER NOT NULL CHECK(grade IN (1,2,3,4)),
  elapsed_ms INTEGER NOT NULL,
  FOREIGN KEY(word_id) REFERENCES words(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reviews_word ON reviews(word_id);
CREATE INDEX IF NOT EXISTS idx_reviews_ts ON reviews(ts);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO schema_version (version) VALUES (1);
  `,
];

/**
 * Helper to serialize tags array to JSON string
 */
export function serializeTags(tags: string[]): string {
  return JSON.stringify(tags);
}

/**
 * Helper to deserialize tags from JSON string
 */
export function deserializeTags(tagsJson: string | null): string[] {
  if (!tagsJson) return [];
  try {
    const parsed = JSON.parse(tagsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
