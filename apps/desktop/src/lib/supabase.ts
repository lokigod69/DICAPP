import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/public';

if (!env.PUBLIC_SUPABASE_URL || !env.PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing Supabase environment variables. Please create apps/desktop/.env with PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY'
  );
}

export const supabase = createClient(env.PUBLIC_SUPABASE_URL, env.PUBLIC_SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Helper: Get current user ID (throws if not authenticated)
export async function requireUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Not authenticated');
  }

  return user.id;
}

// Helper: Get current user (returns null if not authenticated)
export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
