import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
  try {
    const session = await locals.getSession();

    return json({
      ok: true,
      user: session?.user ?? null,
      hasSession: !!session,
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
