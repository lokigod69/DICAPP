// Server hooks for Supabase auth
// Note: This is a minimal setup since we're using client-side auth primarily
// For production, consider using @supabase/ssr for proper SSR auth handling

export async function handle({ event, resolve }) {
  return resolve(event);
}
