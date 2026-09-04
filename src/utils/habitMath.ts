import { getLocalDateString, parseLocalDate, sortCompletions } from './dateUtils';

/**
 * HabitMeter Streak Analytics Engine
 * All inputs are 'YYYY-MM-DD' local strings. Functions are pure.
 */

// Helper removed - using Set directly for O(1) lookup

/**
 * Current Streak Calculation (HabitMeter behavior):
 * - Start checking from Today (YYYY-MM-DD).
 * - If Today completed -> count backwards consecutively from Today.
 * - Else if Today not completed but Yesterday completed -> streak is still alive, count from Yesterday backwards.
 * - Else (neither Today nor Yesterday completed) -> 0.
 */
export function getCurrentStreak(completions: string[], todayStr?: string): number {
  const today = todayStr ?? getLocalDateString(new Date());
  const completionsSet = new Set(completions);

  // Determine start point
  const yesterdayDate = parseLocalDate(today);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterdayDate);

  let startDateStr: string | null = null;
  if (completionsSet.has(today)) {
    startDateStr = today;
  } else if (completionsSet.has(yesterdayStr)) {
    startDateStr = yesterdayStr;
  } else {
    return 0;
  }

  // Count backwards consecutively from startDateStr
  let streak = 0;
  let cursor = parseLocalDate(startDateStr);
  while (true) {
    const cursorStr = getLocalDateString(cursor);
    if (completionsSet.has(cursorStr)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Best Streak (Longest) Calculation:
 * Take chronologically sorted completions array and find largest continuous sequence.
 */
export function getLongestStreak(completions: string[]): number {
  if (completions.length === 0) return 0;
  const sorted = sortCompletions(completions);

  let longest = 1;
  let current = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = parseLocalDate(sorted[i - 1]);
    const curr = parseLocalDate(sorted[i]);

    // Check if consecutive (diff exactly 1 day)
    const prevPlusOne = new Date(prev);
    prevPlusOne.setDate(prev.getDate() + 1);
    const expected = getLocalDateString(prevPlusOne);
    const actual = sorted[i];

    // Skip duplicates (should be unique but guard)
    if (sorted[i] === sorted[i - 1]) continue;

    if (actual === expected) {
      current += 1;
    } else {
      longest = Math.max(longest, current);
      current = 1;
    }
    // Unused curr var suppress
    void curr;
  }
  longest = Math.max(longest, current);
  return longest;
}

/**
 * Completion Rate Calculation:
 * Total completions / total days since habit creation (inclusive) * 100
 * e.g., createdAt=2024-01-01, Today=2024-01-10 inclusive = 10 days.
 * Returns 0-100 percentage (rounded to 1 decimal if needed by consumer).
 */
export function getCompletionRate(completions: string[], createdAt: string, todayStr?: string): number {
  const today = todayStr ?? getLocalDateString(new Date());
  const created = parseLocalDate(createdAt);
  const todayDate = parseLocalDate(today);

  // Inclusive days elapsed
  const utcCreated = Date.UTC(created.getFullYear(), created.getMonth(), created.getDate());
  const utcToday = Date.UTC(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate());
  const totalDays = Math.round((utcToday - utcCreated) / (1000 * 60 * 60 * 24)) + 1;

  if (totalDays <= 0) return 0;
  // Only count completions within range? HabitMeter counts all completions, but clamp to totalDays naturally.
  // If completions before createdAt exist (edge), still count? We count all but rate capped at 100.
  const rate = (completions.length / totalDays) * 100;
  return Math.min(100, rate);
}

/**
 * Weekly Target Counter - HabitMeter exact logic
 * Calculate start/end of current calendar week (Monday-Sunday) using LOCAL dates
 * and count how many unique completion dates fall within this week.
 * Naturally capped at 7 because only one completion per calendar day is allowed.
 *
 * @param completions - array of 'YYYY-MM-DD' strings (unique, sorted)
 * @param todayStr - optional 'YYYY-MM-DD' for testability; defaults to today's local date
 * @param weekStartsOn - 0=Sunday, 1=Monday (default 1 for HabitMeter ISO week)
 */
export function getCompletionsForCurrentWeek(
  completions: string[],
  todayStr?: string,
  weekStartsOn: 0 | 1 = 1
): number {
  const today = todayStr ?? getLocalDateString(new Date());
  const todayDate = parseLocalDate(today);

  // Determine Monday (or Sunday) of current week
  const dayOfWeek = todayDate.getDay(); // 0 Sun .. 6 Sat
  let diffToStart: number;
  if (weekStartsOn === 1) {
    // Monday start: Mon=0 ... Sun=6
    diffToStart = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  } else {
    diffToStart = dayOfWeek; // Sunday start
  }

  const startDate = new Date(todayDate);
  startDate.setDate(todayDate.getDate() - diffToStart);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);

  const startStr = getLocalDateString(startDate);
  const endStr = getLocalDateString(endDate);

  // Filter completions within [startStr, endStr] inclusive - string compare works for YYYY-MM-DD
  let count = 0;
  const seen = new Set<string>();
  for (const d of completions) {
    if (seen.has(d)) continue; // ensure unique
    if (d >= startStr && d <= endStr) {
      seen.add(d);
      count++;
    }
  }
  // Natural cap at 7
  return Math.min(7, count);
}

/**
 * Also export as object for convenience
 */
export const habitMath = {
  getCurrentStreak,
  getLongestStreak,
  getCompletionRate,
  getCompletionsForCurrentWeek,
};
