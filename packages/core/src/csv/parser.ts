import Papa from 'papaparse';
import { SimpleCsvRowSchema, FullCsvRowSchema, type SimpleCsvRow, type FullCsvRow, type Word, type DeckProfile } from '../models/types';
import { createWord, parseTags } from '../models/utils';

/**
 * CSV parse error
 */
export interface CsvError {
  row: number;
  field?: string;
  message: string;
  data?: any;
}

/**
 * CSV parse result with profile detection
 */
export interface CsvParseResult {
  profile: DeckProfile;
  words: Word[];
  errors: CsvError[];
  valid: number;
  invalid: number;
  missing: string[];
  warnings: string[];
}

/**
 * Detect CSV profile from headers
 */
export function detectProfile(headers: string[]): { profile: DeckProfile; missing: string[] } {
  const normalized = headers.map(h => h.trim().toLowerCase());

  // Simple profile: exactly headword + translation
  const hasHeadword = normalized.includes('headword');
  const hasTranslation = normalized.includes('translation');

  // Full profile: headword + definition required
  const hasDefinition = normalized.includes('definition');

  if (hasHeadword && hasTranslation && !hasDefinition) {
    return { profile: 'simple', missing: [] };
  }

  if (hasHeadword && hasDefinition) {
    return { profile: 'full', missing: [] };
  }

  // Missing required fields
  const missing: string[] = [];
  if (!hasHeadword) missing.push('headword');
  if (!hasDefinition && !hasTranslation) missing.push('definition or translation');

  // Default to full if headers look like full schema
  return { profile: 'full', missing };
}

/**
 * Parse CSV file to Words with profile detection
 */
export function parseCsv(csvContent: string, deckId: string): CsvParseResult {
  const words: Word[] = [];
  const errors: CsvError[] = [];
  const warnings: string[] = [];

  const parseResult = Papa.parse<any>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase(),
  });

  // Detect profile from headers
  const headers = parseResult.meta.fields || [];
  const { profile, missing } = detectProfile(headers);

  if (missing.length > 0) {
    warnings.push(`Missing required columns: ${missing.join(', ')}`);
  }

  // Parse rows based on profile
  parseResult.data.forEach((row, idx) => {
    const rowNumber = idx + 2; // +1 for 0-index, +1 for header row

    try {
      let word: Word;

      if (profile === 'simple') {
        // Validate as simple row
        const validatedRow = SimpleCsvRowSchema.parse(row);

        // Map translation to definition for simple profile
        word = createWord({
          headword: validatedRow.headword,
          definition: validatedRow.translation, // translation becomes definition
          deck_id: deckId,
        });
      } else {
        // Validate as full row
        const validatedRow = FullCsvRowSchema.parse(row);

        // Parse tags
        const tags = parseTags(validatedRow.tags || '');

        word = createWord({
          headword: validatedRow.headword,
          pos: validatedRow.pos || undefined,
          ipa: validatedRow.ipa || undefined,
          definition: validatedRow.definition,
          example: validatedRow.example || undefined,
          gloss_de: validatedRow.gloss_de || undefined,
          etymology: validatedRow.etymology || undefined,
          mnemonic: validatedRow.mnemonic || undefined,
          tags,
          freq: validatedRow.freq,
          deck_id: deckId,
        });
      }

      words.push(word);
    } catch (error: any) {
      const message = error?.errors?.[0]?.message || error?.message || 'Invalid row';
      const field = error?.errors?.[0]?.path?.[0];
      errors.push({
        row: rowNumber,
        field,
        message,
        data: row,
      });
    }
  });

  // Add profile-specific warnings
  if (profile === 'simple') {
    warnings.push('Simple profile detected: "translation" column will be mapped to "definition"');
  }

  return {
    profile,
    words,
    errors,
    valid: words.length,
    invalid: errors.length,
    missing,
    warnings,
  };
}

/**
 * Export words to CSV format
 */
export function exportToCsv(words: Word[]): string {
  const rows = words.map((w) => ({
    headword: w.headword,
    pos: w.pos || '',
    ipa: w.ipa || '',
    definition: w.definition,
    example: w.example || '',
    gloss_de: w.gloss_de || '',
    etymology: w.etymology || '',
    mnemonic: w.mnemonic || '',
    tags: w.tags.join(';'),
    freq: w.freq,
  }));

  return Papa.unparse(rows, {
    header: true,
    columns: [
      'headword',
      'pos',
      'ipa',
      'definition',
      'example',
      'gloss_de',
      'etymology',
      'mnemonic',
      'tags',
      'freq',
    ],
  });
}

/**
 * Preview first N rows of CSV
 */
export function previewCsv(csvContent: string, limit = 20): { preview: any[]; total: number } {
  const parseResult = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    preview: limit,
  });

  const fullCount = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  return {
    preview: parseResult.data,
    total: fullCount.data.length,
  };
}
