import { writable, derived } from 'svelte/store';
import type { WordWithScheduling } from '@runedeck/core/models';
import { StudySession } from '@runedeck/core/queue';

interface StudyState {
  session: StudySession | null;
  currentCard: WordWithScheduling | null;
  revealed: boolean;
  progress: { current: number; total: number; percent: number };
}

function createStudyStore() {
  const { subscribe, set, update } = writable<StudyState>({
    session: null,
    currentCard: null,
    revealed: false,
    progress: { current: 0, total: 0, percent: 0 },
  });

  return {
    subscribe,
    startSession: (cards: WordWithScheduling[]) => {
      const session = new StudySession(cards);
      const currentCard = session.current();
      const progress = session.progress();
      set({ session, currentCard, revealed: false, progress });
    },
    reveal: () => {
      update((state) => ({ ...state, revealed: true }));
    },
    nextCard: () => {
      update((state) => {
        if (!state.session) return state;
        state.session.next();
        const currentCard = state.session.current();
        const progress = state.session.progress();
        return { ...state, currentCard, revealed: false, progress };
      });
    },
    reset: () => {
      set({ session: null, currentCard: null, revealed: false, progress: { current: 0, total: 0, percent: 0 } });
    },
  };
}

export const studyStore = createStudyStore();

export const isComplete = derived(
  studyStore,
  ($study) => $study.session?.isComplete() ?? true
);
