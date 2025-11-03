import { json, error } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      throw error(401, 'Unauthorized');
    }

    const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
      global: { headers: { authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw error(401, 'Unauthorized');
    }

    const { fromDeckId, toDeckId } = await request.json();

    if (!fromDeckId || !toDeckId) {
      throw error(400, 'Missing deck IDs');
    }

    if (fromDeckId === toDeckId) {
      throw error(400, 'Cannot merge deck into itself');
    }

    // Verify ownership
    const { data: decks, error: deckError } = await supabase
      .from('decks')
      .select('id, name')
      .in('id', [fromDeckId, toDeckId])
      .eq('user_id', user.id);

    if (deckError || !decks || decks.length !== 2) {
      throw error(403, 'Decks not found or not owned by user');
    }

    // Get all words from source deck
    const { data: fromWords, error: fromError } = await supabase
      .from('words')
      .select('id, headword, pos, definition')
      .eq('deck_id', fromDeckId)
      .is('deleted_at', null);

    if (fromError) {
      throw error(500, `Failed to fetch source words: ${fromError.message}`);
    }

    // Get all words from target deck
    const { data: toWords, error: toError } = await supabase
      .from('words')
      .select('id, headword, pos, definition')
      .eq('deck_id', toDeckId)
      .is('deleted_at', null);

    if (toError) {
      throw error(500, `Failed to fetch target words: ${toError.message}`);
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
    if (err.status) throw err;
    throw error(500, err.message || 'Preview failed');
  }
};
