import { json } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { createClient } from '@supabase/supabase-js';
import { parseCsv } from '@runedeck/core/csv';
import { createInitialScheduling } from '@runedeck/core/models';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    // Authenticate via Authorization header
    const auth = request.headers.get('authorization');
    if (!auth) {
      return json(
        { ok: false, code: 401, message: 'Unauthorized - please sign in' },
        { status: 401 }
      );
    }

    const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: auth } }
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return json(
        { ok: false, code: 401, message: 'Unauthorized - please sign in' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const deckId = formData.get('deckId') as string;
    const createDeck = formData.get('createDeck') === 'true';
    const newDeckName = formData.get('newDeckName') as string;

    // Validation - return JSON errors
    if (!file) {
      return json(
        { ok: false, code: 400, message: 'No file provided' },
        { status: 400 }
      );
    }

    if (!createDeck && !deckId) {
      return json(
        { ok: false, code: 400, message: 'No deck specified' },
        { status: 400 }
      );
    }

    if (createDeck && !newDeckName?.trim()) {
      return json(
        { ok: false, code: 400, message: 'Deck name required' },
        { status: 400 }
      );
    }

    // Read CSV content
    const csvContent = await file.text();
    const timestamp = Date.now();
    const filename = file.name;

    // Upload to storage (bucket name: 'ingests')
    const storagePath = `${user.id}/ingests/${timestamp}-${filename}`;
    const { error: uploadError } = await supabase.storage.from('ingests').upload(storagePath, file, {
      contentType: 'text/csv',
      upsert: true,
    });

    if (uploadError) {
      return json(
        { ok: false, code: 500, message: `Failed to upload file: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Determine target deck ID
    let targetDeckId = deckId;

    if (createDeck && newDeckName) {
      // Create new deck first
      const { detectProfile } = await import('@runedeck/core/csv');
      const lines = csvContent.split('\n');
      const headers = lines[0].split(',').map((h) => h.trim());
      const { profile } = detectProfile(headers);

      const slug = newDeckName
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');

      const { data: newDeck, error: deckError } = await supabase
        .from('decks')
        .insert({
          user_id: user.id,
          name: newDeckName.trim(),
          slug,
          profile,
          config: {
            newPerDay: 10,
            dueLimit: 20,
            leechThreshold: 8,
            studyOrientation: 'word-to-def',
            learningReveal: 'minimal',
          },
        })
        .select()
        .single();

      if (deckError) {
        return json(
          { ok: false, code: 500, message: `Failed to create deck: ${deckError.message}` },
          { status: 500 }
        );
      }

      targetDeckId = newDeck.id;
    }

    // Parse CSV
    const parseResult = parseCsv(csvContent, targetDeckId);

    if (parseResult.words.length === 0) {
      return json(
        { ok: false, code: 400, message: 'No valid words found in CSV' },
        { status: 400 }
      );
    }

    // Prepare words for bulk insert
    const wordsToInsert = parseResult.words.map((word) => ({
      id: word.id,
      user_id: user.id,
      deck_id: word.deck_id,
      headword: word.headword,
      pos: word.pos,
      ipa: word.ipa,
      definition: word.definition,
      example: word.example,
      gloss_de: word.gloss_de,
      etymology: word.etymology,
      mnemonic: word.mnemonic,
      tags: word.tags.join(';'),
      freq: word.freq,
      created_at: new Date(word.created_at).toISOString(),
      updated_at: new Date(word.updated_at).toISOString(),
    }));

    // Bulk insert words
    const { error: wordsError } = await supabase.from('words').insert(wordsToInsert);

    if (wordsError) {
      return json(
        { ok: false, code: 500, message: `Failed to insert words: ${wordsError.message}` },
        { status: 500 }
      );
    }

    // Bulk insert scheduling
    const schedulingToInsert = parseResult.words.map((word) => {
      const scheduling = createInitialScheduling(word.id);
      return {
        word_id: scheduling.word_id,
        due_ts: scheduling.due_ts,
        interval: scheduling.interval,
        ease: scheduling.ease,
        lapses: scheduling.lapses,
        is_new: scheduling.is_new,
      };
    });

    const { error: schedulingError } = await supabase.from('scheduling').insert(schedulingToInsert);

    if (schedulingError) {
      return json(
        { ok: false, code: 500, message: `Failed to insert scheduling: ${schedulingError.message}` },
        { status: 500 }
      );
    }

    // Log the ingest
    const { error: ingestError } = await supabase.from('ingests').insert({
      user_id: user.id,
      deck_id: targetDeckId,
      filename,
      storage_path: storagePath,
      profile: parseResult.profile,
      rows_inserted: parseResult.valid,
      rows_skipped: parseResult.invalid,
      errors: parseResult.errors,
    });

    if (ingestError) {
      console.error('Failed to log ingest:', ingestError);
      // Don't fail the request if logging fails
    }

    // Return success - always JSON
    return json({
      ok: true,
      deckId: targetDeckId,
      inserted: parseResult.valid,
      skipped: parseResult.invalid,
      warnings: parseResult.warnings,
      errors: parseResult.errors,
      profile: parseResult.profile,
    });
  } catch (err: any) {
    console.error('Import error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return json(
      { ok: false, code: 500, message: `Import failed: ${message}` },
      { status: 500 }
    );
  }
};
