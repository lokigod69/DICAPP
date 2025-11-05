import { json } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { createClient } from '@supabase/supabase-js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request }) => {
  try {
    const auth = request.headers.get('authorization');
    const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
      global: { headers: auth ? { Authorization: auth } : {} }
    });

    const { data: { user } } = await supabase.auth.getUser();

    return json({
      ok: true,
      hasSession: !!user,
      user: user ?? null,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return json({
      ok: false,
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
};
