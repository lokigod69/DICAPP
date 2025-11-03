import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Word,
  SchedulingData,
  Review,
  WordWithScheduling,
  Deck,
  StudyScope,
} from '@runedeck/core/models';
import { createInitialScheduling } from '@runedeck/core/models';
import type { IDataStore } from './IDataStore';

/**
 * Cloud-based data store using Supabase
 * All data lives in the cloud, authenticated per-user with RLS
 */
export class CloudStore implements IDataStore {
  constructor(private supabase: SupabaseClient) {}

  async init(): Promise<void> {
    // No-op for cloud store - schema managed by Supabase migrations
    // Just verify we can connect
    const { error } = await this.supabase.from('decks').select('id').limit(1);
    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows, which is fine
      throw new Error(`Failed to initialize CloudStore: ${error.message}`);
    }
  }

  // ========================================================================
  // Decks
  // ========================================================================

  async createDeck(deck: Deck): Promise<void> {
    const { error } = await this.supabase.from('decks').insert({
      id: deck.id,
      name: deck.name,
      slug: deck.slug,
      profile: deck.profile,
      visibility: 'private', // default
      config: deck.config,
      created_at: new Date(deck.created_at).toISOString(),
    });

    if (error) throw new Error(`Failed to create deck: ${error.message}`);
  }

  async getDeck(id: string): Promise<Deck | null> {
    const { data, error } = await this.supabase
      .from('decks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get deck: ${error.message}`);
    }

    return this.mapRowToDeck(data);
  }

  async getDeckBySlug(slug: string): Promise<Deck | null> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await this.supabase
      .from('decks')
      .select('*')
      .eq('user_id', user.id)
      .eq('slug', slug)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get deck by slug: ${error.message}`);
    }

    return this.mapRowToDeck(data);
  }

  async updateDeck(deck: Deck): Promise<void> {
    const { error } = await this.supabase
      .from('decks')
      .update({
        name: deck.name,
        slug: deck.slug,
        profile: deck.profile,
        config: deck.config,
      })
      .eq('id', deck.id);

    if (error) throw new Error(`Failed to update deck: ${error.message}`);
  }

  async deleteDeck(id: string): Promise<void> {
    const { error } = await this.supabase.from('decks').delete().eq('id', id);

    if (error) throw new Error(`Failed to delete deck: ${error.message}`);
  }

  async getAllDecks(): Promise<Deck[]> {
    const { data, error } = await this.supabase
      .from('decks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to get all decks: ${error.message}`);

    return data.map((row) => this.mapRowToDeck(row));
  }

  async getDeckStats(deckId: string): Promise<{
    total: number;
    new: number;
    due: number;
    learning: number;
    retention: number;
    leeches: number;
  }> {
    const now = Date.now();

    // Total words
    const { count: total } = await this.supabase
      .from('words')
      .select('*', { count: 'exact', head: true })
      .eq('deck_id', deckId)
      .is('deleted_at', null);

    // New words
    const { count: newCount } = await this.supabase
      .from('scheduling')
      .select('word_id, words!inner(deck_id)', { count: 'exact', head: true })
      .eq('words.deck_id', deckId)
      .eq('is_new', 1);

    // Due words
    const { count: due } = await this.supabase
      .from('scheduling')
      .select('word_id, words!inner(deck_id)', { count: 'exact', head: true })
      .eq('words.deck_id', deckId)
      .lte('due_ts', now)
      .eq('is_new', 0);

    // Learning words (interval < 21 days)
    const { count: learning } = await this.supabase
      .from('scheduling')
      .select('word_id, words!inner(deck_id)', { count: 'exact', head: true })
      .eq('words.deck_id', deckId)
      .gt('interval', 0)
      .lt('interval', 21);

    // Leeches (lapses >= 8)
    const { count: leeches } = await this.supabase
      .from('scheduling')
      .select('word_id, words!inner(deck_id)', { count: 'exact', head: true })
      .eq('words.deck_id', deckId)
      .gte('lapses', 8);

    const retention =
      total && total > 0 ? Math.round(((total - (newCount || 0) - (leeches || 0)) / total) * 100) : 0;

    return {
      total: total || 0,
      new: newCount || 0,
      due: due || 0,
      learning: learning || 0,
      retention,
      leeches: leeches || 0,
    };
  }

  // ========================================================================
  // Words
  // ========================================================================

  async createWord(word: Word): Promise<void> {
    const { error } = await this.supabase.from('words').insert({
      id: word.id,
      deck_id: word.deck_id,
      headword: word.headword,
      pos: word.pos,
      ipa: word.ipa,
      definition: word.definition,
      example: word.example,
      gloss_de: word.gloss_de,
      etymology: word.etymology,
      mnemonic: word.mnemonic,
      tags: word.tags.join(';'),
      freq: word.freq,
      created_at: new Date(word.created_at).toISOString(),
      updated_at: new Date(word.updated_at).toISOString(),
    });

    if (error) throw new Error(`Failed to create word: ${error.message}`);
  }

  async getWord(id: string): Promise<Word | null> {
    const { data, error } = await this.supabase
      .from('words')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get word: ${error.message}`);
    }

    return this.mapRowToWord(data);
  }

  async updateWord(word: Word): Promise<void> {
    const { error } = await this.supabase
      .from('words')
      .update({
        headword: word.headword,
        pos: word.pos,
        ipa: word.ipa,
        definition: word.definition,
        example: word.example,
        gloss_de: word.gloss_de,
        etymology: word.etymology,
        mnemonic: word.mnemonic,
        tags: word.tags.join(';'),
        freq: word.freq,
        updated_at: new Date(word.updated_at).toISOString(),
      })
      .eq('id', word.id);

    if (error) throw new Error(`Failed to update word: ${error.message}`);
  }

  async deleteWord(id: string): Promise<void> {
    // Soft delete
    const { error } = await this.supabase
      .from('words')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(`Failed to delete word: ${error.message}`);
  }

  async getAllWords(deckId?: string): Promise<Word[]> {
    let query = this.supabase.from('words').select('*').is('deleted_at', null);

    if (deckId) {
      query = query.eq('deck_id', deckId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to get all words: ${error.message}`);

    return data.map((row) => this.mapRowToWord(row));
  }

  async searchWords(query: string, deckId?: string): Promise<Word[]> {
    let supaQuery = this.supabase
      .from('words')
      .select('*')
      .is('deleted_at', null)
      .or(`headword.ilike.%${query}%,definition.ilike.%${query}%`);

    if (deckId) {
      supaQuery = supaQuery.eq('deck_id', deckId);
    }

    const { data, error } = await supaQuery.limit(50);

    if (error) throw new Error(`Failed to search words: ${error.message}`);

    return data.map((row) => this.mapRowToWord(row));
  }

  async getWordsByTags(tags: string[], deckId?: string): Promise<Word[]> {
    let query = this.supabase.from('words').select('*').is('deleted_at', null);

    if (deckId) {
      query = query.eq('deck_id', deckId);
    }

    // Filter by tags (tags are semicolon-separated in DB)
    for (const tag of tags) {
      query = query.ilike('tags', `%${tag}%`);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to get words by tags: ${error.message}`);

    return data.map((row) => this.mapRowToWord(row));
  }

  // ========================================================================
  // Scheduling
  // ========================================================================

  async getScheduling(wordId: string): Promise<SchedulingData | null> {
    const { data, error } = await this.supabase
      .from('scheduling')
      .select('*')
      .eq('word_id', wordId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get scheduling: ${error.message}`);
    }

    return this.mapRowToScheduling(data);
  }

  async upsertScheduling(scheduling: SchedulingData): Promise<void> {
    const { error } = await this.supabase.from('scheduling').upsert({
      word_id: scheduling.word_id,
      due_ts: scheduling.due_ts,
      interval: scheduling.interval,
      ease: scheduling.ease,
      lapses: scheduling.lapses,
      is_new: scheduling.is_new,
    });

    if (error) throw new Error(`Failed to upsert scheduling: ${error.message}`);
  }

  async getDue(deckId: string, limit: number, now = Date.now()): Promise<WordWithScheduling[]> {
    const { data, error } = await this.supabase
      .from('scheduling')
      .select('*, words!inner(*)')
      .eq('words.deck_id', deckId)
      .lte('due_ts', now)
      .eq('is_new', 0)
      .order('due_ts', { ascending: true })
      .limit(limit);

    if (error) throw new Error(`Failed to get due words: ${error.message}`);

    return data.map((row) => this.mapRowToWordWithScheduling(row));
  }

  async getNew(deckId: string, limit: number): Promise<WordWithScheduling[]> {
    const { data, error } = await this.supabase
      .from('scheduling')
      .select('*, words!inner(*)')
      .eq('words.deck_id', deckId)
      .eq('is_new', 1)
      .order('words.created_at', { ascending: true })
      .limit(limit);

    if (error) throw new Error(`Failed to get new words: ${error.message}`);

    return data.map((row) => this.mapRowToWordWithScheduling(row));
  }

  async getLeeches(deckId: string, threshold: number): Promise<WordWithScheduling[]> {
    const { data, error } = await this.supabase
      .from('scheduling')
      .select('*, words!inner(*)')
      .eq('words.deck_id', deckId)
      .gte('lapses', threshold)
      .order('lapses', { ascending: false });

    if (error) throw new Error(`Failed to get leeches: ${error.message}`);

    return data.map((row) => this.mapRowToWordWithScheduling(row));
  }

  // ========================================================================
  // Scope Queries
  // ========================================================================

  private async resolveScopeDeckIds(scope: StudyScope, currentDeckId: string): Promise<string[]> {
    if (scope.type === 'all') {
      const { data, error } = await this.supabase.from('decks').select('id');
      if (error) throw new Error(`Failed to resolve scope: ${error.message}`);
      return data.map((row) => row.id);
    }
    if (scope.type === 'current') {
      return [currentDeckId];
    }
    return scope.deckIds;
  }

  async getDueByScope(
    scope: StudyScope,
    currentDeckId: string,
    limit: number,
    now = Date.now()
  ): Promise<WordWithScheduling[]> {
    const deckIds = await this.resolveScopeDeckIds(scope, currentDeckId);
    if (deckIds.length === 0) return [];

    const { data, error } = await this.supabase
      .from('scheduling')
      .select('*, words!inner(*)')
      .in('words.deck_id', deckIds)
      .lte('due_ts', now)
      .eq('is_new', 0)
      .order('due_ts', { ascending: true })
      .limit(limit);

    if (error) throw new Error(`Failed to get due words by scope: ${error.message}`);

    return data.map((row) => this.mapRowToWordWithScheduling(row));
  }

  async getNewByScope(
    scope: StudyScope,
    currentDeckId: string,
    limit: number
  ): Promise<WordWithScheduling[]> {
    const deckIds = await this.resolveScopeDeckIds(scope, currentDeckId);
    if (deckIds.length === 0) return [];

    const { data, error } = await this.supabase
      .from('scheduling')
      .select('*, words!inner(*)')
      .in('words.deck_id', deckIds)
      .eq('is_new', 1)
      .order('words.created_at', { ascending: true })
      .limit(limit);

    if (error) throw new Error(`Failed to get new words by scope: ${error.message}`);

    return data.map((row) => this.mapRowToWordWithScheduling(row));
  }

  async getLeechesByScope(
    scope: StudyScope,
    currentDeckId: string,
    threshold: number
  ): Promise<WordWithScheduling[]> {
    const deckIds = await this.resolveScopeDeckIds(scope, currentDeckId);
    if (deckIds.length === 0) return [];

    const { data, error } = await this.supabase
      .from('scheduling')
      .select('*, words!inner(*)')
      .in('words.deck_id', deckIds)
      .gte('lapses', threshold)
      .order('lapses', { ascending: false });

    if (error) throw new Error(`Failed to get leeches by scope: ${error.message}`);

    return data.map((row) => this.mapRowToWordWithScheduling(row));
  }

  async getStatsByScope(
    scope: StudyScope,
    currentDeckId: string
  ): Promise<{
    total: number;
    new: number;
    due: number;
    learning: number;
    retention: number;
    leeches: number;
  }> {
    const deckIds = await this.resolveScopeDeckIds(scope, currentDeckId);
    if (deckIds.length === 0) {
      return { total: 0, new: 0, due: 0, learning: 0, retention: 0, leeches: 0 };
    }

    const now = Date.now();

    // Total words
    const { count: total } = await this.supabase
      .from('words')
      .select('*', { count: 'exact', head: true })
      .in('deck_id', deckIds)
      .is('deleted_at', null);

    // New words
    const { count: newCount } = await this.supabase
      .from('scheduling')
      .select('word_id, words!inner(deck_id)', { count: 'exact', head: true })
      .in('words.deck_id', deckIds)
      .eq('is_new', 1);

    // Due words
    const { count: due } = await this.supabase
      .from('scheduling')
      .select('word_id, words!inner(deck_id)', { count: 'exact', head: true })
      .in('words.deck_id', deckIds)
      .lte('due_ts', now)
      .eq('is_new', 0);

    // Learning words
    const { count: learning } = await this.supabase
      .from('scheduling')
      .select('word_id, words!inner(deck_id)', { count: 'exact', head: true })
      .in('words.deck_id', deckIds)
      .gt('interval', 0)
      .lt('interval', 21);

    // Leeches
    const { count: leeches } = await this.supabase
      .from('scheduling')
      .select('word_id, words!inner(deck_id)', { count: 'exact', head: true })
      .in('words.deck_id', deckIds)
      .gte('lapses', 8);

    const retention =
      total && total > 0 ? Math.round(((total - (newCount || 0) - (leeches || 0)) / total) * 100) : 0;

    return {
      total: total || 0,
      new: newCount || 0,
      due: due || 0,
      learning: learning || 0,
      retention,
      leeches: leeches || 0,
    };
  }

  // ========================================================================
  // Reviews
  // ========================================================================

  async addReview(review: Review): Promise<void> {
    const { error } = await this.supabase.from('reviews').insert({
      id: review.id,
      word_id: review.word_id,
      ts: review.ts,
      grade: review.grade,
      elapsed_ms: review.elapsed_ms,
    });

    if (error) throw new Error(`Failed to add review: ${error.message}`);
  }

  async getReviewsForWord(wordId: string): Promise<Review[]> {
    const { data, error } = await this.supabase
      .from('reviews')
      .select('*')
      .eq('word_id', wordId)
      .order('ts', { ascending: true });

    if (error) throw new Error(`Failed to get reviews: ${error.message}`);

    return data.map((row) => this.mapRowToReview(row));
  }

  // ========================================================================
  // Settings
  // ========================================================================

  async getSetting(key: string): Promise<string | null> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await this.supabase
      .from('settings')
      .select('value')
      .eq('user_id', user.id)
      .eq('key', key)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get setting: ${error.message}`);
    }

    return data.value;
  }

  async setSetting(key: string, value: string): Promise<void> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await this.supabase.from('settings').upsert({
      user_id: user.id,
      key,
      value,
    });

    if (error) throw new Error(`Failed to set setting: ${error.message}`);
  }

  // ========================================================================
  // Stats
  // ========================================================================

  async getStats(): Promise<{
    total: number;
    new: number;
    learning: number;
    retention: number;
    leeches: number;
  }> {
    // Get stats across all user's decks
    const { count: total } = await this.supabase
      .from('words')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);

    const { count: newCount } = await this.supabase
      .from('scheduling')
      .select('*', { count: 'exact', head: true })
      .eq('is_new', 1);

    const { count: learning } = await this.supabase
      .from('scheduling')
      .select('*', { count: 'exact', head: true })
      .gt('interval', 0)
      .lt('interval', 21);

    const { count: leeches } = await this.supabase
      .from('scheduling')
      .select('*', { count: 'exact', head: true })
      .gte('lapses', 8);

    const retention =
      total && total > 0 ? Math.round(((total - (newCount || 0) - (leeches || 0)) / total) * 100) : 0;

    return {
      total: total || 0,
      new: newCount || 0,
      learning: learning || 0,
      retention,
      leeches: leeches || 0,
    };
  }

  // ========================================================================
  // Export
  // ========================================================================

  async exportAll(): Promise<{ words: Word[]; reviews: Review[] }> {
    const [words, reviews] = await Promise.all([this.getAllWords(), this.getAllReviews()]);

    return { words, reviews };
  }

  private async getAllReviews(): Promise<Review[]> {
    const { data, error } = await this.supabase.from('reviews').select('*').order('ts', { ascending: true });

    if (error) throw new Error(`Failed to get all reviews: ${error.message}`);

    return data.map((row) => this.mapRowToReview(row));
  }

  // ========================================================================
  // Batch Operations
  // ========================================================================

  async batchImportWords(words: Word[]): Promise<void> {
    if (words.length === 0) return;

    // Insert words
    const wordsToInsert = words.map((word) => ({
      id: word.id,
      deck_id: word.deck_id,
      headword: word.headword,
      pos: word.pos,
      ipa: word.ipa,
      definition: word.definition,
      example: word.example,
      gloss_de: word.gloss_de,
      etymology: word.etymology,
      mnemonic: word.mnemonic,
      tags: word.tags.join(';'),
      freq: word.freq,
      created_at: new Date(word.created_at).toISOString(),
      updated_at: new Date(word.updated_at).toISOString(),
    }));

    const { error: wordsError } = await this.supabase.from('words').insert(wordsToInsert);

    if (wordsError) throw new Error(`Failed to batch import words: ${wordsError.message}`);

    // Insert initial scheduling for all words
    const schedulingToInsert = words.map((word) => {
      const scheduling = createInitialScheduling(word.id);
      return {
        word_id: scheduling.word_id,
        due_ts: scheduling.due_ts,
        interval: scheduling.interval,
        ease: scheduling.ease,
        lapses: scheduling.lapses,
        is_new: scheduling.is_new,
      };
    });

    const { error: schedulingError } = await this.supabase.from('scheduling').insert(schedulingToInsert);

    if (schedulingError) throw new Error(`Failed to batch import scheduling: ${schedulingError.message}`);
  }

  // ========================================================================
  // Mappers
  // ========================================================================

  private mapRowToDeck(row: any): Deck {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      profile: row.profile,
      config: row.config,
      created_at: new Date(row.created_at).getTime(),
    };
  }

  private mapRowToWord(row: any): Word {
    return {
      id: row.id,
      headword: row.headword,
      pos: row.pos || '',
      ipa: row.ipa || '',
      definition: row.definition,
      example: row.example || '',
      gloss_de: row.gloss_de || '',
      etymology: row.etymology || '',
      mnemonic: row.mnemonic || '',
      tags: row.tags ? row.tags.split(';').filter((t: string) => t.length > 0) : [],
      freq: row.freq || 3.0,
      created_at: new Date(row.created_at).getTime(),
      updated_at: new Date(row.updated_at).getTime(),
      deck_id: row.deck_id,
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
    // Row has both scheduling fields and nested words object
    const word = this.mapRowToWord(row.words);
    const scheduling: SchedulingData = {
      word_id: row.word_id,
      due_ts: row.due_ts,
      interval: row.interval,
      ease: row.ease,
      lapses: row.lapses,
      is_new: row.is_new,
    };

    return { word, scheduling };
  }
}
