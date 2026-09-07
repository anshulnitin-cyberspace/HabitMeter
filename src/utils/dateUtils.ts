/**
 * Localized Date Engine - HabitMeter Single Source of Truth
 * All dates are handled as local calendar strings 'YYYY-MM-DD'
 * Never use toISOString() directly which shifts to UTC.
 */

// 1. Always returns a perfectly padded local YYYY-MM-DD string
export const toLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 2. Gets all YYYY-MM-DD strings for the current calendar week (Mon-Sun or Sun-Sat)
export const getCurrentWeekDateStrings = (): string[] => {
  const current = new Date();
  const dayOfWeek = current.getDay();
  // Find the starting day of the week (e.g., Sunday)
  const startOfWeek = new Date(current);
  startOfWeek.setDate(current.getDate() - dayOfWeek);
  
  const weekStrings: string[] = [];
  for (let i = 0; i < 7; i++) {
    const nextDay = new Date(startOfWeek);
    nextDay.setDate(startOfWeek.getDate() + i);
    weekStrings.push(toLocalDateString(nextDay));
  }
  return weekStrings;
};

// Legacy aliases for existing imports - all route through single source
export const getLocalDateString = toLocalDateString;
export const getLocalDailyString = toLocalDateString;
export const getTodayString = (): string => toLocalDateString(new Date());

// Timezone-Agnostic Midnight Calendar Day Stripping - DST/Month-Length proof (V-1/V-2 fix)
// Enforce date component parsing to calculate pure elapsed calendar intervals
export const getCalendarDaysElapsed = (startDateStr: string, endDateStr: string): number => {
  const [sYear, sMonth, sDay] = startDateStr.split('-').map(Number);
  const [eYear, eMonth, eDay] = endDateStr.split('-').map(Number);

  // Establish dates at an identical, localized noon block to completely bypass DST shifts
  const start = new Date(sYear, sMonth - 1, sDay, 12, 0, 0);
  const end = new Date(eYear, eMonth - 1, eDay, 12, 0, 0);

  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
};

/**
 * Parse 'YYYY-MM-DD' as LOCAL date (not UTC midnight).
 * new Date('2024-01-01') parses as UTC; we avoid that.
 */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Add n days to a YYYY-MM-DD string, returning new YYYY-MM-DD local string.
 */
export function addLocalDays(dateStr: string, days: number): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + days);
  return toLocalDateString(d);
}

/**
 * Difference in whole calendar days between two YYYY-MM-DD strings (a - b)
 */
export function diffLocalDays(a: string, b: string): number {
  const da = parseLocalDate(a);
  const db = parseLocalDate(b);
  const utcA = Date.UTC(da.getFullYear(), da.getMonth(), da.getDate());
  const utcB = Date.UTC(db.getFullYear(), db.getMonth(), db.getDate());
  return Math.round((utcA - utcB) / (1000 * 60 * 60 * 24));
}

/**
 * Sort completions chronologically (ascending). Since format is YYYY-MM-DD, lexical sort works,
 * but we explicitly sort chronologically as required.
 */
export function sortCompletions(completions: string[]): string[] {
  return [...completions].sort((a, b) => {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  });
}


