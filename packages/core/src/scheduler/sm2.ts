import type { SchedulingData, Grade } from '../models/types';

/**
 * SM-2 scheduling configuration
 */
export interface SM2Config {
  minEase: number;
  hardInterval: number; // days
  goodInterval: number; // days
  easyInterval: number; // days
  easyBonus: number; // multiplier
}

export const DEFAULT_SM2_CONFIG: SM2Config = {
  minEase: 1.3,
  hardInterval: 1,
  goodInterval: 1,
  easyInterval: 2,
  easyBonus: 1.3,
};

/**
 * Grade a card using SM-2 algorithm
 * Returns updated scheduling data
 */
export function gradeCard(
  s: SchedulingData,
  grade: Grade,
  now = Date.now(),
  config = DEFAULT_SM2_CONFIG
): SchedulingData {
  let { interval, ease, lapses, is_new } = s;
  const { minEase, hardInterval, goodInterval, easyInterval, easyBonus } = config;

  // Handle Again (grade 1)
  if (grade === 1) {
    lapses += 1;
    ease = Math.max(minEase, ease - 0.2);
    interval = 1;
  }
  // Handle new cards (first review)
  else if (is_new) {
    if (grade === 4) {
      interval = easyInterval;
    } else {
      interval = goodInterval; // Hard and Good both get 1 day for new cards
    }
    ease = 2.5;
  }
  // Handle mature cards
  else {
    // Adjust ease factor
    ease = ease + (0.1 - (4 - grade) * (0.08 + (4 - grade) * 0.02));
    ease = Math.max(minEase, ease);

    // Calculate new interval
    if (grade === 4) {
      interval = Math.max(1, Math.round(interval * ease * easyBonus));
    } else {
      interval = Math.max(1, Math.round(interval * ease));
    }
  }

  const due_ts = now + interval * 86400000; // Convert days to milliseconds

  return {
    word_id: s.word_id,
    due_ts,
    interval,
    ease,
    lapses,
    is_new: 0, // No longer new after any grade
  };
}

/**
 * Determine the mode of a card based on scheduling data
 */
export function modeOf(
  s: SchedulingData,
  leechThreshold = 8
): 'learning' | 'retention' | 'clinic' {
  if (s.lapses >= leechThreshold) return 'clinic';
  if (s.is_new === 1 || s.interval < 7) return 'learning';
  return 'retention';
}

/**
 * Check if a card is due for review
 */
export function isDue(s: SchedulingData, now = Date.now()): boolean {
  return s.due_ts <= now;
}

/**
 * Calculate the next intervals for each grade (for UI preview)
 */
export function previewIntervals(
  s: SchedulingData,
  config = DEFAULT_SM2_CONFIG
): Record<Grade, number> {
  return {
    1: 1,
    2: s.is_new ? config.hardInterval : Math.max(1, Math.round(s.interval * s.ease)),
    3: s.is_new ? config.goodInterval : Math.max(1, Math.round(s.interval * s.ease)),
    4: s.is_new ? config.easyInterval : Math.max(1, Math.round(s.interval * s.ease * config.easyBonus)),
  };
}
