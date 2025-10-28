import Papa from 'papaparse';
import { CsvRowSchema, type CsvRow, type Word } from '../models/types';
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
 * CSV parse result
 */
export interface CsvParseResult {
  words: Word[];
  errors: CsvError[];
  valid: number;
  invalid: number;
}

/**
 * Parse CSV file to Words
 */
export function parseCsv(csvContent: string): CsvParseResult {
  const words: Word[] = [];
  const errors: CsvError[] = [];

  const parseResult = Papa.parse<CsvRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase(),
  });

  parseResult.data.forEach((row, idx) => {
    const rowNumber = idx + 2; // +1 for 0-index, +1 for header row

    try {
      // Validate row with Zod
      const validatedRow = CsvRowSchema.parse(row);

      // Parse tags
      const tags = parseTags(validatedRow.tags);

      // Create Word
      const word = createWord({
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
      });

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

  return {
    words,
    errors,
    valid: words.length,
    invalid: errors.length,
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
