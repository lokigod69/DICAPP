import { z } from 'zod';

// Word model
export const WordSchema = z.object({
  id: z.string(),
  headword: z.string().min(1),
  pos: z.string().optional(),
  ipa: z.string().optional(),
  definition: z.string().min(1),
  example: z.string().optional(),
  gloss_de: z.string().optional(),
  etymology: z.string().optional(),
  mnemonic: z.string().optional(),
  tags: z.array(z.string()).default([]),
  freq: z.number().default(3.0),
  created_at: z.number(),
  updated_at: z.number(),
});

export type Word = z.infer<typeof WordSchema>;

// Scheduling data
export const SchedulingDataSchema = z.object({
  word_id: z.string(),
  due_ts: z.number(),
  interval: z.number().default(0),
  ease: z.number().default(2.5),
  lapses: z.number().default(0),
  is_new: z.number().int().min(0).max(1).default(1), // SQLite boolean as integer
});

export type SchedulingData = z.infer<typeof SchedulingDataSchema>;

// Review record
export const ReviewSchema = z.object({
  id: z.string(),
  word_id: z.string(),
  ts: z.number(),
  grade: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  elapsed_ms: z.number(),
});

export type Review = z.infer<typeof ReviewSchema>;

export type Grade = 1 | 2 | 3 | 4;

// Combined types for queries
export interface WordWithScheduling {
  word: Word;
  scheduling: SchedulingData;
}

// CSV import row
export const CsvRowSchema = z.object({
  headword: z.string().min(1),
  pos: z.string().optional().default(''),
  ipa: z.string().optional().default(''),
  definition: z.string().min(1),
  example: z.string().optional().default(''),
  gloss_de: z.string().optional().default(''),
  etymology: z.string().optional().default(''),
  mnemonic: z.string().optional().default(''),
  tags: z.string().optional().default(''), // semicolon-delimited
  freq: z.coerce.number().optional().default(3.0),
});

export type CsvRow = z.infer<typeof CsvRowSchema>;

// Settings
export interface Settings {
  theme: 'dark' | 'light';
  new_per_day: number;
  due_limit: number;
  leech_threshold: number;
  schema_version: number;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  new_per_day: 10,
  due_limit: 20,
  leech_threshold: 8,
  schema_version: 1,
};
