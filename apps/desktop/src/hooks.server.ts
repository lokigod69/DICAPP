import { supaFromEvent } from '$lib/supabase.server';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  // Attach Supabase client to event.locals
  event.locals.supabase = supaFromEvent(event);

  return resolve(event);
};
