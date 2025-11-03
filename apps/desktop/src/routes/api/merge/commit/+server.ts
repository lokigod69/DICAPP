import { json, error } from '@sveltejs/kit';
import { supaFromEvent } from '$lib/supabase.server';
import type { RequestHandler } from './$types';

type MergeStrategy = 'skip-duplicates' | 'merge-fields' | 'force-move';

export const POST: RequestHandler = async (event) => {
  try {
    // Get Supabase client from cookies (includes user session)
    const supabase = supaFromEvent(event);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw error(401, 'Unauthorized');
    }

    const user = session.user;

    const { fromDeckId, toDeckId, strategy } = await event.request.json();

    if (!fromDeckId || !toDeckId || !strategy) {
      throw error(400, 'Missing required parameters');
    }

    if (!['skip-duplicates', 'merge-fields', 'force-move'].includes(strategy)) {
      throw error(400, 'Invalid merge strategy');
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
      .select('*')
      .eq('deck_id', fromDeckId)
      .is('deleted_at', null);

    if (fromError) {
      throw error(500, `Failed to fetch source words: ${fromError.message}`);
    }

    // Get all words from target deck
    const { data: toWords, error: toError } = await supabase
      .from('words')
      .select('*')
      .eq('deck_id', toDeckId)
      .is('deleted_at', null);

    if (toError) {
      throw error(500, `Failed to fetch target words: ${toError.message}`);
    }

    // Build duplicate key map
    const targetMap = new Map();
    for (const word of toWords || []) {
      const key = `${word.headword.toLowerCase().trim()}|${(word.pos || '').toLowerCase().trim()}`;
      targetMap.set(key, word);
    }

    const report = {
      strategy,
      movedWords: 0,
      skippedDuplicates: 0,
      mergedFields: 0,
      errors: [] as string[],
    };

    // Process each word based on strategy
    for (const word of fromWords || []) {
      const key = `${word.headword.toLowerCase().trim()}|${(word.pos || '').toLowerCase().trim()}`;
      const existingWord = targetMap.get(key);

      try {
        if (!existingWord) {
          // No duplicate - always move
          const { error: updateError } = await supabase
            .from('words')
            .update({ deck_id: toDeckId })
            .eq('id', word.id);

          if (updateError) {
            report.errors.push(`Failed to move word "${word.headword}": ${updateError.message}`);
          } else {
            report.movedWords++;
          }
        } else {
          // Duplicate found - apply strategy
          if (strategy === 'skip-duplicates') {
            report.skippedDuplicates++;
          } else if (strategy === 'merge-fields') {
            // Merge non-empty fields from source into target
            const updates: any = {};
            if (!existingWord.example && word.example) updates.example = word.example;
            if (!existingWord.etymology && word.etymology) updates.etymology = word.etymology;
            if (!existingWord.mnemonic && word.mnemonic) updates.mnemonic = word.mnemonic;
            if (!existingWord.gloss_de && word.gloss_de) updates.gloss_de = word.gloss_de;

            if (Object.keys(updates).length > 0) {
              const { error: mergeError } = await supabase
                .from('words')
                .update(updates)
                .eq('id', existingWord.id);

              if (mergeError) {
                report.errors.push(`Failed to merge word "${word.headword}": ${mergeError.message}`);
              } else {
                report.mergedFields++;
              }
            }

            report.skippedDuplicates++;
          } else if (strategy === 'force-move') {
            // Move anyway - update deck_id
            const { error: forceError } = await supabase
              .from('words')
              .update({ deck_id: toDeckId })
              .eq('id', word.id);

            if (forceError) {
              report.errors.push(`Failed to force-move word "${word.headword}": ${forceError.message}`);
            } else {
              report.movedWords++;
            }
          }
        }
      } catch (err: any) {
        report.errors.push(`Error processing word "${word.headword}": ${err.message}`);
      }
    }

    // Log the merge
    const { error: logError } = await supabase.from('merge_logs').insert({
      from_deck_id: fromDeckId,
      to_deck_id: toDeckId,
      strategy,
      report: report,
    });

    if (logError) {
      console.error('Failed to log merge:', logError);
    }

    return json({
      success: true,
      report,
    });
  } catch (err: any) {
    console.error('Merge commit error:', err);
    if (err.status) throw err;
    throw error(500, err.message || 'Merge failed');
  }
};
