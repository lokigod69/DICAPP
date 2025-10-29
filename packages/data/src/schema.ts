/**
 * Database schema - same SQL for both SQLite and sql.js
 */

export const SCHEMA_VERSION = 2;

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
  // Migration 2: Multi-deck support
  `
-- Decks table with per-deck configuration
CREATE TABLE IF NOT EXISTS decks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  profile TEXT NOT NULL CHECK(profile IN ('simple', 'full')),
  created_at INTEGER NOT NULL,
  config_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_decks_slug ON decks(slug);

-- Add deck_id to words table
ALTER TABLE words ADD COLUMN deck_id TEXT REFERENCES decks(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_words_deck ON words(deck_id);

-- Create default deck and assign all existing words to it
INSERT OR IGNORE INTO decks (id, name, slug, profile, created_at, config_json)
VALUES (
  'default',
  'Default Deck',
  'default',
  'full',
  ${Date.now()},
  '{"newPerDay":10,"dueLimit":20,"leechThreshold":8,"studyOrientation":"word-to-def","learningReveal":"minimal"}'
);

-- Assign all existing words to default deck
UPDATE words SET deck_id = 'default' WHERE deck_id IS NULL;

-- Update schema version
UPDATE schema_version SET version = 2 WHERE version = 1;
INSERT OR IGNORE INTO schema_version (version) VALUES (2);
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
