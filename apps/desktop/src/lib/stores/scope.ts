import { writable, derived, get } from 'svelte/store';
import type { StudyScope } from '@runedeck/core/models';

const SCOPE_STORAGE_KEY = 'dicapp_study_scope';

function createScopeStore() {
  // Load initial scope from localStorage
  const initialScope: StudyScope = (() => {
    try {
      const stored = localStorage.getItem(SCOPE_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as StudyScope;
      }
    } catch (err) {
      console.error('Failed to load scope from localStorage', err);
    }
    return { type: 'current' }; // Default to current deck
  })();

  const store = writable<StudyScope>(initialScope);

  // Subscribe to changes and persist to localStorage
  store.subscribe((scope) => {
    try {
      localStorage.setItem(SCOPE_STORAGE_KEY, JSON.stringify(scope));
    } catch (err) {
      console.error('Failed to persist scope to localStorage', err);
    }
  });

  return {
    subscribe: store.subscribe,
    set: store.set,
    update: store.update,

    // Helper: Set scope to all decks
    setAll: () => {
      store.set({ type: 'all' });
    },

    // Helper: Set scope to current deck
    setCurrent: () => {
      store.set({ type: 'current' });
    },

    // Helper: Set scope to specific decks
    setDecks: (deckIds: string[]) => {
      store.set({ type: 'decks', deckIds });
    },

    // Helper: Get current scope
    get: () => get(store),
  };
}

export const scopeStore = createScopeStore();
