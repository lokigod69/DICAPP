import type { Word, SchedulingData, Review, WordWithScheduling, Deck, StudyScope } from '@runedeck/core/models';

/**
 * Storage interface - implemented by both SQLite (desktop) and sql.js (web)
 */
export interface IDataStore {
  /**
   * Initialize database and run migrations
   */
  init(): Promise<void>;

  // === Decks ===

  createDeck(deck: Deck): Promise<void>;
  getDeck(id: string): Promise<Deck | null>;
  getDeckBySlug(slug: string): Promise<Deck | null>;
  updateDeck(deck: Deck): Promise<void>;
  deleteDeck(id: string): Promise<void>;
  getAllDecks(): Promise<Deck[]>;
  getDeckStats(deckId: string): Promise<{
    total: number;
    new: number;
    due: number;
    learning: number;
    retention: number;
    leeches: number;
  }>;

  // === Words ===

  createWord(word: Word): Promise<void>;
  getWord(id: string): Promise<Word | null>;
  updateWord(word: Word): Promise<void>;
  deleteWord(id: string): Promise<void>;
  getAllWords(deckId?: string): Promise<Word[]>;
  searchWords(query: string, deckId?: string): Promise<Word[]>;
  getWordsByTags(tags: string[], deckId?: string): Promise<Word[]>;

  // === Scheduling ===

  getScheduling(wordId: string): Promise<SchedulingData | null>;
  upsertScheduling(data: SchedulingData): Promise<void>;

  /**
   * Get due cards (due_ts <= now) with scheduling data
   */
  getDue(deckId: string, limit: number, now?: number): Promise<WordWithScheduling[]>;

  /**
   * Get new cards (is_new = 1)
   */
  getNew(deckId: string, limit: number): Promise<WordWithScheduling[]>;

  /**
   * Get leeches (lapses >= threshold)
   */
  getLeeches(deckId: string, threshold: number): Promise<WordWithScheduling[]>;

  // === Scope Queries (Multi-Deck) ===

  /**
   * Get due cards by scope
   */
  getDueByScope(scope: StudyScope, currentDeckId: string, limit: number, now?: number): Promise<WordWithScheduling[]>;

  /**
   * Get new cards by scope
   */
  getNewByScope(scope: StudyScope, currentDeckId: string, limit: number): Promise<WordWithScheduling[]>;

  /**
   * Get leeches by scope
   */
  getLeechesByScope(scope: StudyScope, currentDeckId: string, threshold: number): Promise<WordWithScheduling[]>;

  /**
   * Get stats by scope
   */
  getStatsByScope(scope: StudyScope, currentDeckId: string): Promise<{
    total: number;
    new: number;
    due: number;
    learning: number;
    retention: number;
    leeches: number;
  }>;

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
