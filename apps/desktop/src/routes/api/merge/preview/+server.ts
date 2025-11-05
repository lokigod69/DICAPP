import { json } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { createClient } from '@supabase/supabase-js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    // Authenticate via Authorization header
    const auth = request.headers.get('authorization');
    if (!auth) {
      return json(
        { ok: false, code: 401, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: auth } }
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return json(
        { ok: false, code: 401, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { fromDeckId, toDeckId } = await request.json();

    if (!fromDeckId || !toDeckId) {
      return json(
        { ok: false, code: 400, message: 'Missing deck IDs' },
        { status: 400 }
      );
    }

    if (fromDeckId === toDeckId) {
      return json(
        { ok: false, code: 400, message: 'Cannot merge deck into itself' },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: decks, error: deckError } = await supabase
      .from('decks')
      .select('id, name')
      .in('id', [fromDeckId, toDeckId])
      .eq('user_id', user.id);

    if (deckError || !decks || decks.length !== 2) {
      return json(
        { ok: false, code: 403, message: 'Decks not found or not owned by user' },
        { status: 403 }
      );
    }

    // Get all words from source deck
    const { data: fromWords, error: fromError } = await supabase
      .from('words')
      .select('id, headword, pos, definition')
      .eq('deck_id', fromDeckId)
      .is('deleted_at', null);

    if (fromError) {
      return json(
        { ok: false, code: 500, message: `Failed to fetch source words: ${fromError.message}` },
        { status: 500 }
      );
    }

    // Get all words from target deck
    const { data: toWords, error: toError } = await supabase
      .from('words')
      .select('id, headword, pos, definition')
      .eq('deck_id', toDeckId)
      .is('deleted_at', null);

    if (toError) {
      return json(
        { ok: false, code: 500, message: `Failed to fetch target words: ${toError.message}` },
        { status: 500 }
      );
    }

    // Build duplicate key map for target deck
    const targetKeys = new Set(
      (toWords || []).map((w) => {
        const key = `${w.headword.toLowerCase().trim()}|${(w.pos || '').toLowerCase().trim()}`;
        return key;
      })
    );

    // Identify duplicates
    const duplicates: any[] = [];
    const unique: any[] = [];

    for (const word of fromWords || []) {
      const key = `${word.headword.toLowerCase().trim()}|${(word.pos || '').toLowerCase().trim()}`;
      if (targetKeys.has(key)) {
        duplicates.push(word);
      } else {
        unique.push(word);
      }
    }

    // Return preview
    return json({
      fromDeck: decks.find((d) => d.id === fromDeckId),
      toDeck: decks.find((d) => d.id === toDeckId),
      totalWords: (fromWords || []).length,
      uniqueWords: unique.length,
      duplicates: duplicates.length,
      duplicateList: duplicates.slice(0, 10), // First 10 for preview
    });
  } catch (err: any) {
    console.error('Merge preview error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return json(
      { ok: false, code: 500, message: `Preview failed: ${message}` },
      { status: 500 }
    );
  }
};
