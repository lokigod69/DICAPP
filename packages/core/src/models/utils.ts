import type { Word, SchedulingData, Deck, DeckConfig } from './types';
import { DEFAULT_DECK_CONFIG } from './types';

/**
 * Generate a simple UUID v4
 */
export function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Create slug from name
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Create a new Deck with defaults
 */
export function createDeck(
  partial: Partial<Deck> & Pick<Deck, 'name' | 'profile'>
): Deck {
  const now = Date.now();
  return {
    id: uuid(),
    slug: slugify(partial.name),
    created_at: now,
    config: DEFAULT_DECK_CONFIG,
    ...partial,
  };
}

/**
 * Create a new Word with defaults
 */
export function createWord(partial: Partial<Word> & Pick<Word, 'headword' | 'definition' | 'deck_id'>): Word {
  const now = Date.now();
  return {
    id: uuid(),
    pos: '',
    ipa: '',
    example: '',
    gloss_de: '',
    etymology: '',
    mnemonic: '',
    tags: [],
    freq: 3.0,
    created_at: now,
    updated_at: now,
    ...partial,
  };
}

/**
 * Create initial scheduling data for a new word
 */
export function createInitialScheduling(wordId: string, now = Date.now()): SchedulingData {
  return {
    word_id: wordId,
    due_ts: now,
    interval: 0,
    ease: 2.5,
    lapses: 0,
    is_new: 1,
  };
}

/**
 * Parse semicolon-delimited tags
 */
export function parseTags(tagString: string): string[] {
  return tagString
    .split(';')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * Serialize tags to semicolon-delimited string
 */
export function serializeTags(tags: string[]): string {
  return tags.join(';');
}

/**
 * Map frequency to rarity tier (lower freq = rarer)
 */
export function frequencyToRarity(freq: number): 'mythic' | 'rare' | 'uncommon' | 'common' {
  if (freq < 2.0) return 'mythic';
  if (freq < 2.5) return 'rare';
  if (freq < 3.0) return 'uncommon';
  return 'common';
}
