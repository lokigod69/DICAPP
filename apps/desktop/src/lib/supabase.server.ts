import { createServerClient } from '@supabase/auth-helpers-sveltekit';
import type { RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';

/** Create an RLS-respecting Supabase client bound to the user session cookies */
export function supaFromEvent(event: RequestEvent) {
  const supabaseUrl = env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = env.PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get: (key) => event.cookies.get(key),
      set: (key, value, options) => event.cookies.set(key, value, options),
      remove: (key, options) => event.cookies.delete(key, options),
    },
  });
}
