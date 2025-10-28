import type { Word, SchedulingData, Review, WordWithScheduling } from '@runedeck/core/models';
import { createInitialScheduling } from '@runedeck/core/models';
import type { IDataStore } from './IDataStore';
import { MIGRATIONS, SCHEMA_VERSION, serializeTags, deserializeTags } from './schema';

// Tauri plugin types (will be injected at runtime)
declare const __TAURI_INVOKE__: any;

interface TauriDatabase {
  execute(sql: string, bindings?: any[]): Promise<any>;
  select<T = any>(sql: string, bindings?: any[]): Promise<T[]>;
}

/**
 * SQLite store for Tauri desktop app
 * Uses tauri-plugin-sql
 */
export class SqliteStore implements IDataStore {
  private db: TauriDatabase | null = null;
  private dbPath: string;

  constructor(dbPath = 'runedeck.db') {
    this.dbPath = dbPath;
  }

  async init(): Promise<void> {
    // Dynamic import for Tauri SQL plugin
    try {
      const Database = (await import('@tauri-apps/plugin-sql')).default;
      this.db = await Database.load(`sqlite:${this.dbPath}`);
    } catch (err) {
      throw new Error(`Failed to initialize SQLite database: ${err}`);
    }

    await this.runMigrations();
  }

  private async runMigrations(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Get current schema version
    let currentVersion = 0;
    try {
      const result = await this.db.select<{ version: number }>(
        'SELECT version FROM schema_version ORDER BY version DESC LIMIT 1'
      );
      if (result.length > 0) {
        currentVersion = result[0].version;
      }
    } catch {
      // Table doesn't exist yet
    }

    // Apply pending migrations
    for (let i = currentVersion; i < MIGRATIONS.length; i++) {
      await this.db.execute(MIGRATIONS[i]);
    }
  }

  // === Words ===

  async createWord(word: Word): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.execute(
      `INSERT INTO words (id, headword, pos, ipa, definition, example, gloss_de, etymology, mnemonic, tags, freq, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        word.id,
        word.headword,
        word.pos || null,
        word.ipa || null,
        word.definition,
        word.example || null,
        word.gloss_de || null,
        word.etymology || null,
        word.mnemonic || null,
        serializeTags(word.tags),
        word.freq,
        word.created_at,
        word.updated_at,
      ]
    );
  }

  async getWord(id: string): Promise<Word | null> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.select<any>('SELECT * FROM words WHERE id = ?', [id]);
    if (rows.length === 0) return null;

    return this.mapRowToWord(rows[0]);
  }

  async updateWord(word: Word): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.execute(
      `UPDATE words SET headword = ?, pos = ?, ipa = ?, definition = ?, example = ?,
       gloss_de = ?, etymology = ?, mnemonic = ?, tags = ?, freq = ?, updated_at = ?
       WHERE id = ?`,
      [
        word.headword,
        word.pos || null,
        word.ipa || null,
        word.definition,
        word.example || null,
        word.gloss_de || null,
        word.etymology || null,
        word.mnemonic || null,
        serializeTags(word.tags),
        word.freq,
        word.updated_at,
        word.id,
      ]
    );
  }

  async deleteWord(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.execute('DELETE FROM words WHERE id = ?', [id]);
  }

  async getAllWords(): Promise<Word[]> {
    if (!this.db) throw new Error('Database not initialized');
    const rows = await this.db.select<any>('SELECT * FROM words ORDER BY headword');
    return rows.map((row) => this.mapRowToWord(row));
  }

  async searchWords(query: string): Promise<Word[]> {
    if (!this.db) throw new Error('Database not initialized');
    const pattern = `%${query}%`;
    const rows = await this.db.select<any>(
      'SELECT * FROM words WHERE headword LIKE ? OR definition LIKE ? ORDER BY headword',
      [pattern, pattern]
    );
    return rows.map((row) => this.mapRowToWord(row));
  }

  async getWordsByTags(tags: string[]): Promise<Word[]> {
    if (!this.db) throw new Error('Database not initialized');

    // Build LIKE conditions for each tag
    const conditions = tags.map(() => 'tags LIKE ?').join(' OR ');
    const patterns = tags.map((tag) => `%"${tag}"%`);

    const rows = await this.db.select<any>(
      `SELECT * FROM words WHERE ${conditions} ORDER BY headword`,
      patterns
    );
    return rows.map((row) => this.mapRowToWord(row));
  }

  // === Scheduling ===

  async getScheduling(wordId: string): Promise<SchedulingData | null> {
    if (!this.db) throw new Error('Database not initialized');
    const rows = await this.db.select<any>('SELECT * FROM scheduling WHERE word_id = ?', [wordId]);
    if (rows.length === 0) return null;
    return this.mapRowToScheduling(rows[0]);
  }

  async upsertScheduling(data: SchedulingData): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.execute(
      `INSERT INTO scheduling (word_id, due_ts, interval, ease, lapses, is_new)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(word_id) DO UPDATE SET
       due_ts = excluded.due_ts,
       interval = excluded.interval,
       ease = excluded.ease,
       lapses = excluded.lapses,
       is_new = excluded.is_new`,
      [data.word_id, data.due_ts, data.interval, data.ease, data.lapses, data.is_new]
    );
  }

  async getDue(limit: number, now = Date.now()): Promise<WordWithScheduling[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.select<any>(
      `SELECT w.*, s.* FROM words w
       INNER JOIN scheduling s ON w.id = s.word_id
       WHERE s.due_ts <= ? AND s.is_new = 0
       ORDER BY s.due_ts ASC
       LIMIT ?`,
      [now, limit]
    );

    return rows.map((row) => this.mapRowToWordWithScheduling(row));
  }

  async getNew(limit: number): Promise<WordWithScheduling[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.select<any>(
      `SELECT w.*, s.* FROM words w
       INNER JOIN scheduling s ON w.id = s.word_id
       WHERE s.is_new = 1
       ORDER BY w.created_at ASC
       LIMIT ?`,
      [limit]
    );

    return rows.map((row) => this.mapRowToWordWithScheduling(row));
  }

  async getLeeches(threshold: number): Promise<WordWithScheduling[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.select<any>(
      `SELECT w.*, s.* FROM words w
       INNER JOIN scheduling s ON w.id = s.word_id
       WHERE s.lapses >= ?
       ORDER BY s.lapses DESC`,
      [threshold]
    );

    return rows.map((row) => this.mapRowToWordWithScheduling(row));
  }

  // === Reviews ===

  async addReview(review: Review): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.execute(
      'INSERT INTO reviews (id, word_id, ts, grade, elapsed_ms) VALUES (?, ?, ?, ?, ?)',
      [review.id, review.word_id, review.ts, review.grade, review.elapsed_ms]
    );
  }

  async getReviewsForWord(wordId: string): Promise<Review[]> {
    if (!this.db) throw new Error('Database not initialized');
    const rows = await this.db.select<any>('SELECT * FROM reviews WHERE word_id = ? ORDER BY ts', [
      wordId,
    ]);
    return rows.map((row) => this.mapRowToReview(row));
  }

  // === Settings ===

  async getSetting(key: string): Promise<string | null> {
    if (!this.db) throw new Error('Database not initialized');
    const rows = await this.db.select<{ value: string }>('SELECT value FROM settings WHERE key = ?', [
      key,
    ]);
    return rows.length > 0 ? rows[0].value : null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.execute(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      [key, value]
    );
  }

  // === Stats ===

  async getStats(): Promise<{
    total: number;
    new: number;
    learning: number;
    retention: number;
    leeches: number;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    const [totalRow, newRow, learningRow, retentionRow, leechesRow] = await Promise.all([
      this.db.select<{ count: number }>('SELECT COUNT(*) as count FROM words'),
      this.db.select<{ count: number }>('SELECT COUNT(*) as count FROM scheduling WHERE is_new = 1'),
      this.db.select<{ count: number }>(
        'SELECT COUNT(*) as count FROM scheduling WHERE is_new = 0 AND interval < 7'
      ),
      this.db.select<{ count: number }>(
        'SELECT COUNT(*) as count FROM scheduling WHERE is_new = 0 AND interval >= 7 AND lapses < 8'
      ),
      this.db.select<{ count: number }>('SELECT COUNT(*) as count FROM scheduling WHERE lapses >= 8'),
    ]);

    return {
      total: totalRow[0]?.count || 0,
      new: newRow[0]?.count || 0,
      learning: learningRow[0]?.count || 0,
      retention: retentionRow[0]?.count || 0,
      leeches: leechesRow[0]?.count || 0,
    };
  }

  // === Export ===

  async exportAll(): Promise<{ words: Word[]; reviews: Review[] }> {
    if (!this.db) throw new Error('Database not initialized');

    const [words, reviewRows] = await Promise.all([
      this.getAllWords(),
      this.db.select<any>('SELECT * FROM reviews ORDER BY ts'),
    ]);

    const reviews = reviewRows.map((row) => this.mapRowToReview(row));

    return { words, reviews };
  }

  // === Batch operations ===

  async batchImportWords(words: Word[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // SQLite doesn't support true transactions in tauri-plugin-sql yet,
    // so we'll just execute sequentially
    for (const word of words) {
      await this.createWord(word);
      const scheduling = createInitialScheduling(word.id);
      await this.upsertScheduling(scheduling);
    }
  }

  // === Mappers ===

  private mapRowToWord(row: any): Word {
    return {
      id: row.id,
      headword: row.headword,
      pos: row.pos || undefined,
      ipa: row.ipa || undefined,
      definition: row.definition,
      example: row.example || undefined,
      gloss_de: row.gloss_de || undefined,
      etymology: row.etymology || undefined,
      mnemonic: row.mnemonic || undefined,
      tags: deserializeTags(row.tags),
      freq: row.freq,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private mapRowToScheduling(row: any): SchedulingData {
    return {
      word_id: row.word_id,
      due_ts: row.due_ts,
      interval: row.interval,
      ease: row.ease,
      lapses: row.lapses,
      is_new: row.is_new,
    };
  }

  private mapRowToReview(row: any): Review {
    return {
      id: row.id,
      word_id: row.word_id,
      ts: row.ts,
      grade: row.grade,
      elapsed_ms: row.elapsed_ms,
    };
  }

  private mapRowToWordWithScheduling(row: any): WordWithScheduling {
    return {
      word: this.mapRowToWord(row),
      scheduling: {
        word_id: row.word_id || row.id,
        due_ts: row.due_ts,
        interval: row.interval,
        ease: row.ease,
        lapses: row.lapses,
        is_new: row.is_new,
      },
    };
  }
}
