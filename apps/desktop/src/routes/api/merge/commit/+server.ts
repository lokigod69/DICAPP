import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

type MergeStrategy = 'skip-duplicates' | 'merge-fields' | 'force-move';

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    // Get session from locals (validates auth)
    const session = await locals.getSession();
    if (!session) {
      return json(
        { ok: false, code: 401, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = session.user;
    const supabase = locals.supabase;

    const { fromDeckId, toDeckId, strategy } = await request.json();

    if (!fromDeckId || !toDeckId || !strategy) {
      return json(
        { ok: false, code: 400, message: 'Missing required parameters' },
        { status: 400 }
      );
    }

    if (!['skip-duplicates', 'merge-fields', 'force-move'].includes(strategy)) {
      return json(
        { ok: false, code: 400, message: 'Invalid merge strategy' },
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
      .select('*')
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
      .select('*')
      .eq('deck_id', toDeckId)
      .is('deleted_at', null);

    if (toError) {
      return json(
        { ok: false, code: 500, message: `Failed to fetch target words: ${toError.message}` },
        { status: 500 }
      );
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
    const message = err instanceof Error ? err.message : String(err);
    return json(
      { ok: false, code: 500, message: `Merge failed: ${message}` },
      { status: 500 }
    );
  }
};
