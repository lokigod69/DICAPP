import { createServerClient } from '@supabase/ssr';
import type { Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';

export const handle: Handle = async ({ event, resolve }) => {
  // Create Supabase server client with cookie handling and Authorization header forwarding
  const supabase = createServerClient(
    env.PUBLIC_SUPABASE_URL!,
    env.PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (key) => event.cookies.get(key),
        set: (key, value, options) => event.cookies.set(key, value, { ...options, path: '/' }),
        remove: (key, options) => event.cookies.delete(key, { ...options, path: '/' }),
      },
      // Forward Authorization header from client to Supabase (critical for RLS)
      global: {
        headers: {
          Authorization: event.request.headers.get('Authorization') ?? '',
        },
      },
    }
  );

  event.locals.supabase = supabase;
  event.locals.getSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  };

  return resolve(event);
};
