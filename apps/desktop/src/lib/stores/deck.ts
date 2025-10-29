import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import type { Deck } from '@runedeck/core/models';
import { getDataStore } from './database';

interface DeckState {
  currentDeckId: string | null;
  decks: Deck[];
  loading: boolean;
  error: string | null;
}

const STORAGE_KEY = 'currentDeckId';

function createDeckStore() {
  const initialState: DeckState = {
    currentDeckId: browser ? localStorage.getItem(STORAGE_KEY) || null : null,
    decks: [],
    loading: false,
    error: null,
  };

  const store = writable<DeckState>(initialState);
  const { subscribe, set, update } = store;

  return {
    subscribe,

    /**
     * Load all decks from database and select current or default
     */
    async load() {
      update(s => ({ ...s, loading: true, error: null }));

      try {
        const dataStore = await getDataStore();
        const decks = await dataStore.getAllDecks();

        // If no current selection or selected deck doesn't exist, pick default or first
        let currentDeckId = get(store).currentDeckId;
        if (!currentDeckId || !decks.find(d => d.id === currentDeckId)) {
          const defaultDeck = decks.find(d => d.slug === 'default') || decks[0];
          currentDeckId = defaultDeck?.id || null;
          if (currentDeckId && browser) {
            localStorage.setItem(STORAGE_KEY, currentDeckId);
          }
        }

        update(s => ({
          ...s,
          decks,
          currentDeckId,
          loading: false,
        }));
      } catch (err: any) {
        update(s => ({
          ...s,
          error: err.message,
          loading: false,
        }));
      }
    },

    /**
     * Select a deck as current
     */
    selectDeck(deckId: string) {
      update(s => {
        if (browser) {
          localStorage.setItem(STORAGE_KEY, deckId);
        }
        return { ...s, currentDeckId: deckId };
      });
    },

    /**
     * Reload decks list (after create/delete)
     */
    async refresh() {
      const currentId = get(store).currentDeckId;
      await this.load();

      // Restore selection if deck still exists
      const decks = get(store).decks;
      if (currentId && decks.find(d => d.id === currentId)) {
        this.selectDeck(currentId);
      }
    },

    /**
     * Get current deck object
     */
    getCurrentDeck(): Deck | null {
      const state = get(store);
      return state.decks.find(d => d.id === state.currentDeckId) || null;
    },
  };
}

export const deckStore = createDeckStore();

// Derived store for current deck
export const currentDeck = derived(deckStore, $store =>
  $store.decks.find(d => d.id === $store.currentDeckId) || null
);
