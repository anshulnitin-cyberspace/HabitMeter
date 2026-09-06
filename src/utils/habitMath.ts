import { toLocalDateString, getCurrentWeekDateStrings, parseLocalDate, sortCompletions, getCalendarDaysElapsed } from './dateUtils';

/**
 * HabitMeter Streak Analytics Engine
 * All inputs are 'YYYY-MM-DD' local strings. Functions are pure.
 */

export function getCurrentStreak(completions: string[], todayStr?: string): number {
  const today = todayStr ?? toLocalDateString(new Date());
  const completionsSet = new Set(completions);
  const yesterdayDate = parseLocalDate(today);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = toLocalDateString(yesterdayDate);
  let startDateStr: string | null = null;
  if (completionsSet.has(today)) {
    startDateStr = today;
  } else if (completionsSet.has(yesterdayStr)) {
    startDateStr = yesterdayStr;
  } else {
    return 0;
  }
  let streak = 0;
  let cursor = parseLocalDate(startDateStr);
  while (true) {
    const cursorStr = toLocalDateString(cursor);
    if (completionsSet.has(cursorStr)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }
  return streak;
}

export function getLongestStreak(completions: string[]): number {
  if (completions.length === 0) return 0;
  const sorted = sortCompletions(completions);
  let longest = 1;
  let current = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1]) continue;
    const prev = parseLocalDate(sorted[i - 1]);
    const prevPlusOne = new Date(prev);
    prevPlusOne.setDate(prev.getDate() + 1);
    const expected = toLocalDateString(prevPlusOne);
    if (sorted[i] === expected) current += 1;
    else { longest = Math.max(longest, current); current = 1; }
  }
  longest = Math.max(longest, current);
  return longest;
}

export const isStrictValidDate = (dateString: string): boolean => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  const [y, m, d] = dateString.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  
  // Ensure the date didn't auto-roll into the next month
  return date.getFullYear() === y && 
         date.getMonth() === m - 1 && 
         date.getDate() === d;
};

/**
 * Absolute Lifetime Consistency Engine - Bulletproof (spec exact)
 * Fixes totalDaysElapsed evaluating to 1/0 due to parsing error
 */
export const calculateLifetimeConsistency = (createdAtStr: string, completionsArray: string[]) => {
  const todayStr = toLocalDateString(new Date());
  // Use noon-block DST-proof calendar math
  const totalDaysElapsed = getCalendarDaysElapsed(createdAtStr, todayStr);
  // Defensive clamp for clock tampering / travel (V-5/V-6): if today before createdAt, fallback to 1
  const safeDays = totalDaysElapsed <= 0 ? 1 : totalDaysElapsed;
  const percentage = Math.round((completionsArray.length / safeDays) * 100);
  return Math.max(0, Math.min(percentage, 100));
};

/** Backward-compatible wrapper - delegates to bulletproof with defensive clamps */
export function getCompletionRate(completions: string[], createdAt: string, todayStr?: string): number {
  const todayStrEff = todayStr ?? toLocalDateString(new Date());
  const totalDaysElapsed = getCalendarDaysElapsed(createdAt, todayStrEff);
  const safeDays = totalDaysElapsed <= 0 ? 1 : totalDaysElapsed;
  const percentage = Math.round((completions.length / safeDays) * 100);
  return Math.max(0, Math.min(percentage, 100));
}

/**
 * Enforce the Weekly Counter Filter - strict local week via dateUtils
 */
export function getCompletionsForCurrentWeek(
  completions: string[],
  todayStr?: string,
  // weekStartsOn保留但不再使用，统一由 getCurrentWeekDateStrings (Sunday start) 决定
  _weekStartsOn?: 0 | 1
): number {
  // Use single source week strings (Sun-Sat) - local only
  const currentWeekStrings = todayStr
    ? (() => {
        // Generate week for provided todayStr using same Sunday-start logic as dateUtils
        const base = parseLocalDate(todayStr);
        const dayOfWeek = base.getDay();
        const start = new Date(base);
        start.setDate(base.getDate() - dayOfWeek);
        const arr: string[] = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(start);
          d.setDate(start.getDate() + i);
          arr.push(toLocalDateString(d));
        }
        return arr;
      })()
    : getCurrentWeekDateStrings();

  // Filter completions to only count those that exist in the current week array
  const uniqueWeekly = new Set(completions.filter((dateStr) => currentWeekStrings.includes(dateStr))).size;
  return Math.min(7, uniqueWeekly);
}

export const habitMath = {
  getCurrentStreak,
  getLongestStreak,
  getCompletionRate,
  getCompletionsForCurrentWeek,
};
