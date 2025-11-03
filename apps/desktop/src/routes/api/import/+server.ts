import { json, error } from '@sveltejs/kit';
import { getSupabase } from '@supabase/auth-helpers-sveltekit';
import { parseCsv } from '@runedeck/core/csv';
import { createWord, createInitialScheduling } from '@runedeck/core/models';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
  try {
    // Get Supabase client from cookies (includes user session)
    const { supabaseClient: supabase, session } = await getSupabase(event);

    if (!session) {
      throw error(401, 'Unauthorized');
    }

    const user = session.user;

    // Parse form data
    const formData = await event.request.formData();
    const file = formData.get('file') as File;
    const deckId = formData.get('deckId') as string;
    const createDeck = formData.get('createDeck') === 'true';
    const newDeckName = formData.get('newDeckName') as string;

    if (!file) {
      throw error(400, 'No file provided');
    }

    if (!createDeck && !deckId) {
      throw error(400, 'No deck specified');
    }

    // Read CSV content
    const csvContent = await file.text();
    const timestamp = Date.now();
    const filename = file.name;

    // Upload to storage
    const storagePath = `${user.id}/ingests/${timestamp}-${filename}`;
    const { error: uploadError } = await supabase.storage.from('uploads').upload(storagePath, file, {
      contentType: 'text/csv',
      upsert: false,
    });

    if (uploadError) {
      throw error(500, `Failed to upload file: ${uploadError.message}`);
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
        throw error(500, `Failed to create deck: ${deckError.message}`);
      }

      targetDeckId = newDeck.id;
    }

    // Parse CSV
    const parseResult = parseCsv(csvContent, targetDeckId);

    if (parseResult.words.length === 0) {
      throw error(400, 'No valid words found in CSV');
    }

    // Prepare words for bulk insert
    const wordsToInsert = parseResult.words.map((word) => ({
      id: word.id,
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
      throw error(500, `Failed to insert words: ${wordsError.message}`);
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
      throw error(500, `Failed to insert scheduling: ${schedulingError.message}`);
    }

    // Log the ingest
    const { error: ingestError } = await supabase.from('ingests').insert({
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

    // Return success
    return json({
      success: true,
      deckId: targetDeckId,
      inserted: parseResult.valid,
      skipped: parseResult.invalid,
      warnings: parseResult.warnings,
      errors: parseResult.errors,
      profile: parseResult.profile,
    });
  } catch (err: any) {
    console.error('Import error:', err);
    if (err.status) {
      throw err;
    }
    throw error(500, err.message || 'Import failed');
  }
};
