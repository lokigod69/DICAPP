import { describe, it, expect } from 'vitest';
import { gradeCard, modeOf, isDue, previewIntervals } from './sm2';
import type { SchedulingData } from '../models/types';

describe('SM-2 Scheduler', () => {
  const baseScheduling: SchedulingData = {
    word_id: 'test-word',
    due_ts: Date.now(),
    interval: 0,
    ease: 2.5,
    lapses: 0,
    is_new: 1,
  };

  describe('gradeCard', () => {
    it('should handle Again (grade 1) for new card', () => {
      const result = gradeCard(baseScheduling, 1);
      expect(result.interval).toBe(1);
      expect(result.lapses).toBe(1);
      expect(result.ease).toBeLessThan(baseScheduling.ease);
      expect(result.is_new).toBe(0);
    });

    it('should handle Good (grade 3) for new card', () => {
      const result = gradeCard(baseScheduling, 3);
      expect(result.interval).toBe(1); // New cards get 1 day for Good
      expect(result.ease).toBe(2.5);
      expect(result.is_new).toBe(0);
      expect(result.lapses).toBe(0);
    });

    it('should handle Easy (grade 4) for new card', () => {
      const result = gradeCard(baseScheduling, 4);
      expect(result.interval).toBe(2); // New cards get 2 days for Easy
      expect(result.ease).toBe(2.5);
      expect(result.is_new).toBe(0);
    });

    it('should increase interval for mature cards', () => {
      const mature: SchedulingData = {
        ...baseScheduling,
        is_new: 0,
        interval: 7,
        ease: 2.5,
      };

      const result = gradeCard(mature, 3);
      expect(result.interval).toBeGreaterThan(mature.interval);
      expect(result.is_new).toBe(0);
    });

    it('should reset interval on Again', () => {
      const mature: SchedulingData = {
        ...baseScheduling,
        is_new: 0,
        interval: 30,
        ease: 2.5,
        lapses: 3,
      };

      const result = gradeCard(mature, 1);
      expect(result.interval).toBe(1);
      expect(result.lapses).toBe(4);
      expect(result.ease).toBeLessThan(mature.ease);
    });

    it('should not reduce ease below minimum', () => {
      const lowEase: SchedulingData = {
        ...baseScheduling,
        is_new: 0,
        interval: 5,
        ease: 1.3, // Already at minimum
        lapses: 10,
      };

      const result = gradeCard(lowEase, 1);
      expect(result.ease).toBe(1.3); // Should not go below min ease
    });

    it('should apply Easy bonus to interval', () => {
      const mature: SchedulingData = {
        ...baseScheduling,
        is_new: 0,
        interval: 10,
        ease: 2.5,
      };

      const goodResult = gradeCard(mature, 3);
      const easyResult = gradeCard(mature, 4);

      expect(easyResult.interval).toBeGreaterThan(goodResult.interval);
    });
  });

  describe('modeOf', () => {
    it('should return "clinic" for leeches', () => {
      const leech: SchedulingData = {
        ...baseScheduling,
        lapses: 8,
      };

      expect(modeOf(leech, 8)).toBe('clinic');
    });

    it('should return "learning" for new cards', () => {
      expect(modeOf(baseScheduling, 8)).toBe('learning');
    });

    it('should return "learning" for cards with interval < 7', () => {
      const learning: SchedulingData = {
        ...baseScheduling,
        is_new: 0,
        interval: 3,
      };

      expect(modeOf(learning, 8)).toBe('learning');
    });

    it('should return "retention" for mature cards', () => {
      const retention: SchedulingData = {
        ...baseScheduling,
        is_new: 0,
        interval: 30,
        lapses: 2,
      };

      expect(modeOf(retention, 8)).toBe('retention');
    });
  });

  describe('isDue', () => {
    it('should return true if due_ts is in the past', () => {
      const past: SchedulingData = {
        ...baseScheduling,
        due_ts: Date.now() - 1000,
      };

      expect(isDue(past)).toBe(true);
    });

    it('should return false if due_ts is in the future', () => {
      const future: SchedulingData = {
        ...baseScheduling,
        due_ts: Date.now() + 10000,
      };

      expect(isDue(future)).toBe(false);
    });

    it('should return true if due_ts equals now', () => {
      const now = Date.now();
      const dueNow: SchedulingData = {
        ...baseScheduling,
        due_ts: now,
      };

      expect(isDue(dueNow, now)).toBe(true);
    });
  });

  describe('previewIntervals', () => {
    it('should return correct intervals for new card', () => {
      const intervals = previewIntervals(baseScheduling);

      expect(intervals[1]).toBe(1); // Again
      expect(intervals[2]).toBe(1); // Hard
      expect(intervals[3]).toBe(1); // Good
      expect(intervals[4]).toBe(2); // Easy
    });

    it('should return scaled intervals for mature card', () => {
      const mature: SchedulingData = {
        ...baseScheduling,
        is_new: 0,
        interval: 10,
        ease: 2.5,
      };

      const intervals = previewIntervals(mature);

      expect(intervals[1]).toBe(1); // Again always resets
      expect(intervals[2]).toBeGreaterThan(1); // Hard
      expect(intervals[3]).toBeGreaterThan(intervals[2]); // Good > Hard
      expect(intervals[4]).toBeGreaterThan(intervals[3]); // Easy > Good
    });
  });
});
