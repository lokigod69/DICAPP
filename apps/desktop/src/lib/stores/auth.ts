import { writable } from 'svelte/store';
import { supabase } from '$lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  loading: boolean;
}

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>({
    user: null,
    loading: true,
  });

  // Initialize auth state
  async function init() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    set({ user, loading: false });

    // Listen for auth changes
    supabase.auth.onAuthStateChange((_event, session) => {
      update((state) => ({
        ...state,
        user: session?.user ?? null,
      }));
    });
  }

  // Sign out
  async function signOut() {
    await supabase.auth.signOut();
    set({ user: null, loading: false });
  }

  return {
    subscribe,
    init,
    signOut,
  };
}

export const authStore = createAuthStore();
