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

  // Sign out with full cleanup
  async function signOut() {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }

    // Clear local state
    set({ user: null, loading: false });

    // Belt + suspenders: nuke cookies manually
    if (typeof document !== 'undefined') {
      document.cookie = 'sb-access-token=; Max-Age=0; path=/';
      document.cookie = 'sb-refresh-token=; Max-Age=0; path=/';
    }
  }

  return {
    subscribe,
    init,
    signOut,
  };
}

export const authStore = createAuthStore();
