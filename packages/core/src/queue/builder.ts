import type { IDataStore } from '../../data/src/IDataStore';
import type { Word, SchedulingData, WordWithScheduling } from '../models/types';

/**
 * Queue configuration
 */
export interface QueueConfig {
  dueLimit: number;
  newPerDay: number;
  leechThreshold: number;
}

export const DEFAULT_QUEUE_CONFIG: QueueConfig = {
  dueLimit: 20,
  newPerDay: 10,
  leechThreshold: 8,
};

/**
 * Queue result
 */
export interface QueueResult {
  cards: WordWithScheduling[];
  leeches: WordWithScheduling[];
}

/**
 * Build study queue with due cards and new cards
 */
export async function buildQueue(
  store: IDataStore,
  config = DEFAULT_QUEUE_CONFIG
): Promise<QueueResult> {
  const { dueLimit, newPerDay, leechThreshold } = config;

  const [due, fresh, leeches] = await Promise.all([
    store.getDue(dueLimit),
    store.getNew(newPerDay),
    store.getLeeches(leechThreshold),
  ]);

  // Combine due and new cards
  const cards = [...due, ...fresh];

  return { cards, leeches };
}

/**
 * Session state for tracking study progress
 */
export class StudySession {
  private cards: WordWithScheduling[];
  private currentIndex: number = 0;
  private startTime: number = Date.now();
  private cardStartTime: number = Date.now();

  constructor(cards: WordWithScheduling[]) {
    this.cards = cards;
  }

  current(): WordWithScheduling | null {
    if (this.currentIndex >= this.cards.length) return null;
    return this.cards[this.currentIndex];
  }

  next(): void {
    this.currentIndex++;
    this.cardStartTime = Date.now();
  }

  elapsed(): number {
    return Date.now() - this.cardStartTime;
  }

  progress(): { current: number; total: number; percent: number } {
    const current = Math.min(this.currentIndex + 1, this.cards.length);
    const total = this.cards.length;
    const percent = total > 0 ? Math.round((current / total) * 100) : 0;
    return { current, total, percent };
  }

  isComplete(): boolean {
    return this.currentIndex >= this.cards.length;
  }

  totalElapsed(): number {
    return Date.now() - this.startTime;
  }
}
