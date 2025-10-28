import initSqlJs, { type Database } from 'sql.js';
import type { Word, SchedulingData, Review, WordWithScheduling } from '@runedeck/core/models';
import { createInitialScheduling } from '@runedeck/core/models';
import type { IDataStore } from './IDataStore';
import { MIGRATIONS, serializeTags, deserializeTags } from './schema';

const DB_KEY = 'runedeck_db';

/**
 * WASM SQLite store for web using sql.js
 * Persists database to IndexedDB
 */
export class WasmSqliteStore implements IDataStore {
  private db: Database | null = null;
  private SQL: any = null;

  async init(): Promise<void> {
    // Initialize sql.js
    this.SQL = await initSqlJs({
      locateFile: (file) => `/sql-wasm.wasm`,
    });

    // Try to load existing database from IndexedDB
    const savedDb = await this.loadFromIndexedDB();

    if (savedDb) {
      this.db = new this.SQL.Database(savedDb);
    } else {
      this.db = new this.SQL.Database();
    }

    await this.runMigrations();
  }

  private async runMigrations(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Get current schema version
    let currentVersion = 0;
    try {
      const result = this.db.exec('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1');
      if (result.length > 0 && result[0].values.length > 0) {
        currentVersion = result[0].values[0][0] as number;
      }
    } catch {
      // Table doesn't exist yet
    }

    // Apply pending migrations
    for (let i = currentVersion; i < MIGRATIONS.length; i++) {
      this.db.exec(MIGRATIONS[i]);
    }

    // Persist after migrations
    await this.persist();
  }

  private async loadFromIndexedDB(): Promise<Uint8Array | null> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('runedeck', 1);

      request.onerror = () => reject(request.error);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('database')) {
          db.createObjectStore('database');
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('database', 'readonly');
        const store = tx.objectStore('database');
        const getRequest = store.get(DB_KEY);

        getRequest.onsuccess = () => {
          resolve(getRequest.result || null);
        };

        getRequest.onerror = () => reject(getRequest.error);
      };
    });
  }

  private async persist(): Promise<void> {
    if (!this.db) return;

    const data = this.db.export();

    return new Promise((resolve, reject) => {
      const request = indexedDB.open('runedeck', 1);

      request.onerror = () => reject(request.error);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('database')) {
          db.createObjectStore('database');
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('database', 'readwrite');
        const store = tx.objectStore('database');
        const putRequest = store.put(data, DB_KEY);

        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
    });
  }

  private exec(sql: string, params: any[] = []): any[] {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare(sql);
    stmt.bind(params);

    const results: any[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();

    return results;
  }

  private run(sql: string, params: any[] = []): void {
    if (!this.db) throw new Error('Database not initialized');
    this.db.run(sql, params);
  }

  // === Words ===

  async createWord(word: Word): Promise<void> {
    this.run(
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
    await this.persist();
  }

  async getWord(id: string): Promise<Word | null> {
    const rows = this.exec('SELECT * FROM words WHERE id = ?', [id]);
    if (rows.length === 0) return null;
    return this.mapRowToWord(rows[0]);
  }

  async updateWord(word: Word): Promise<void> {
    this.run(
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
    await this.persist();
  }

  async deleteWord(id: string): Promise<void> {
    this.run('DELETE FROM words WHERE id = ?', [id]);
    await this.persist();
  }

  async getAllWords(): Promise<Word[]> {
    const rows = this.exec('SELECT * FROM words ORDER BY headword');
    return rows.map((row) => this.mapRowToWord(row));
  }

  async searchWords(query: string): Promise<Word[]> {
    const pattern = `%${query}%`;
    const rows = this.exec(
      'SELECT * FROM words WHERE headword LIKE ? OR definition LIKE ? ORDER BY headword',
      [pattern, pattern]
    );
    return rows.map((row) => this.mapRowToWord(row));
  }

  async getWordsByTags(tags: string[]): Promise<Word[]> {
    const conditions = tags.map(() => 'tags LIKE ?').join(' OR ');
    const patterns = tags.map((tag) => `%"${tag}"%`);
    const rows = this.exec(`SELECT * FROM words WHERE ${conditions} ORDER BY headword`, patterns);
    return rows.map((row) => this.mapRowToWord(row));
  }

  // === Scheduling ===

  async getScheduling(wordId: string): Promise<SchedulingData | null> {
    const rows = this.exec('SELECT * FROM scheduling WHERE word_id = ?', [wordId]);
    if (rows.length === 0) return null;
    return this.mapRowToScheduling(rows[0]);
  }

  async upsertScheduling(data: SchedulingData): Promise<void> {
    this.run(
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
    await this.persist();
  }

  async getDue(limit: number, now = Date.now()): Promise<WordWithScheduling[]> {
    const rows = this.exec(
      `SELECT w.*, s.word_id as sched_word_id, s.due_ts, s.interval, s.ease, s.lapses, s.is_new
       FROM words w
       INNER JOIN scheduling s ON w.id = s.word_id
       WHERE s.due_ts <= ? AND s.is_new = 0
       ORDER BY s.due_ts ASC
       LIMIT ?`,
      [now, limit]
    );

    return rows.map((row) => this.mapRowToWordWithScheduling(row));
  }

  async getNew(limit: number): Promise<WordWithScheduling[]> {
    const rows = this.exec(
      `SELECT w.*, s.word_id as sched_word_id, s.due_ts, s.interval, s.ease, s.lapses, s.is_new
       FROM words w
       INNER JOIN scheduling s ON w.id = s.word_id
       WHERE s.is_new = 1
       ORDER BY w.created_at ASC
       LIMIT ?`,
      [limit]
    );

    return rows.map((row) => this.mapRowToWordWithScheduling(row));
  }

  async getLeeches(threshold: number): Promise<WordWithScheduling[]> {
    const rows = this.exec(
      `SELECT w.*, s.word_id as sched_word_id, s.due_ts, s.interval, s.ease, s.lapses, s.is_new
       FROM words w
       INNER JOIN scheduling s ON w.id = s.word_id
       WHERE s.lapses >= ?
       ORDER BY s.lapses DESC`,
      [threshold]
    );

    return rows.map((row) => this.mapRowToWordWithScheduling(row));
  }

  // === Reviews ===

  async addReview(review: Review): Promise<void> {
    this.run('INSERT INTO reviews (id, word_id, ts, grade, elapsed_ms) VALUES (?, ?, ?, ?, ?)', [
      review.id,
      review.word_id,
      review.ts,
      review.grade,
      review.elapsed_ms,
    ]);
    await this.persist();
  }

  async getReviewsForWord(wordId: string): Promise<Review[]> {
    const rows = this.exec('SELECT * FROM reviews WHERE word_id = ? ORDER BY ts', [wordId]);
    return rows.map((row) => this.mapRowToReview(row));
  }

  // === Settings ===

  async getSetting(key: string): Promise<string | null> {
    const rows = this.exec('SELECT value FROM settings WHERE key = ?', [key]);
    return rows.length > 0 ? rows[0].value : null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    this.run(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      [key, value]
    );
    await this.persist();
  }

  // === Stats ===

  async getStats(): Promise<{
    total: number;
    new: number;
    learning: number;
    retention: number;
    leeches: number;
  }> {
    const [totalRow] = this.exec('SELECT COUNT(*) as count FROM words');
    const [newRow] = this.exec('SELECT COUNT(*) as count FROM scheduling WHERE is_new = 1');
    const [learningRow] = this.exec(
      'SELECT COUNT(*) as count FROM scheduling WHERE is_new = 0 AND interval < 7'
    );
    const [retentionRow] = this.exec(
      'SELECT COUNT(*) as count FROM scheduling WHERE is_new = 0 AND interval >= 7 AND lapses < 8'
    );
    const [leechesRow] = this.exec('SELECT COUNT(*) as count FROM scheduling WHERE lapses >= 8');

    return {
      total: totalRow?.count || 0,
      new: newRow?.count || 0,
      learning: learningRow?.count || 0,
      retention: retentionRow?.count || 0,
      leeches: leechesRow?.count || 0,
    };
  }

  // === Export ===

  async exportAll(): Promise<{ words: Word[]; reviews: Review[] }> {
    const words = await this.getAllWords();
    const reviewRows = this.exec('SELECT * FROM reviews ORDER BY ts');
    const reviews = reviewRows.map((row) => this.mapRowToReview(row));

    return { words, reviews };
  }

  // === Batch operations ===

  async batchImportWords(words: Word[]): Promise<void> {
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
        word_id: row.sched_word_id || row.id,
        due_ts: row.due_ts,
        interval: row.interval,
        ease: row.ease,
        lapses: row.lapses,
        is_new: row.is_new,
      },
    };
  }
}
