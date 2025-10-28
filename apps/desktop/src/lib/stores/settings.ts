import { writable } from 'svelte/store';
import { browser } from '$app/environment';

type Theme = 'dark' | 'light';

// Theme store with localStorage persistence
function createThemeStore() {
  const defaultTheme: Theme = 'dark';
  const stored = browser ? localStorage.getItem('theme') : null;
  const initial = (stored as Theme) || defaultTheme;

  const { subscribe, set } = writable<Theme>(initial);

  return {
    subscribe,
    set: (value: Theme) => {
      if (browser) {
        localStorage.setItem('theme', value);
      }
      set(value);
    },
    toggle: () => {
      if (browser) {
        const current = localStorage.getItem('theme') as Theme;
        const next: Theme = current === 'dark' ? 'light' : 'dark';
        localStorage.setItem('theme', next);
        set(next);
      }
    },
  };
}

export const themeStore = createThemeStore();

// Study settings types
export type StudyOrientation = 'def-to-word' | 'word-to-def';
export type LearningRevealPolicy = 'minimal' | 'rich';

// Settings defaults
export interface AppSettings {
  newPerDay: number;
  dueLimit: number;
  leechThreshold: number;
  studyOrientation: StudyOrientation;
  learningReveal: LearningRevealPolicy;
}

export const DEFAULT_SETTINGS: AppSettings = {
  newPerDay: 10,
  dueLimit: 20,
  leechThreshold: 8,
  studyOrientation: 'word-to-def',
  learningReveal: 'minimal',
};

// Settings store
function createSettingsStore() {
  const stored = browser ? localStorage.getItem('settings') : null;
  const initial = stored ? JSON.parse(stored) : DEFAULT_SETTINGS;

  const { subscribe, set, update } = writable<AppSettings>(initial);

  return {
    subscribe,
    set: (value: AppSettings) => {
      if (browser) {
        localStorage.setItem('settings', JSON.stringify(value));
      }
      set(value);
    },
    update: (fn: (current: AppSettings) => AppSettings) => {
      update((current) => {
        const next = fn(current);
        if (browser) {
          localStorage.setItem('settings', JSON.stringify(next));
        }
        return next;
      });
    },
  };
}

export const settingsStore = createSettingsStore();
