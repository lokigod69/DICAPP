import type { Word, SchedulingData, Review, WordWithScheduling } from '@runedeck/core/models';

/**
 * Storage interface - implemented by both SQLite (desktop) and sql.js (web)
 */
export interface IDataStore {
  /**
   * Initialize database and run migrations
   */
  init(): Promise<void>;

  // === Words ===

  createWord(word: Word): Promise<void>;
  getWord(id: string): Promise<Word | null>;
  updateWord(word: Word): Promise<void>;
  deleteWord(id: string): Promise<void>;
  getAllWords(): Promise<Word[]>;
  searchWords(query: string): Promise<Word[]>;
  getWordsByTags(tags: string[]): Promise<Word[]>;

  // === Scheduling ===

  getScheduling(wordId: string): Promise<SchedulingData | null>;
  upsertScheduling(data: SchedulingData): Promise<void>;

  /**
   * Get due cards (due_ts <= now) with scheduling data
   */
  getDue(limit: number, now?: number): Promise<WordWithScheduling[]>;

  /**
   * Get new cards (is_new = 1)
   */
  getNew(limit: number): Promise<WordWithScheduling[]>;

  /**
   * Get leeches (lapses >= threshold)
   */
  getLeeches(threshold: number): Promise<WordWithScheduling[]>;

  // === Reviews ===

  addReview(review: Review): Promise<void>;
  getReviewsForWord(wordId: string): Promise<Review[]>;

  // === Settings ===

  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;

  // === Stats ===

  getStats(): Promise<{
    total: number;
    new: number;
    learning: number;
    retention: number;
    leeches: number;
  }>;

  // === Export ===

  exportAll(): Promise<{ words: Word[]; reviews: Review[] }>;

  // === Batch operations ===

  /**
   * Import multiple words with initial scheduling in a transaction
   */
  batchImportWords(words: Word[]): Promise<void>;
}
