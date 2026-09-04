/**
 * Localized Date Engine - HabitMeter 1:1
 * All dates are handled as local calendar strings 'YYYY-MM-DD'
 * Never use toISOString() directly which shifts to UTC.
 */

/**
 * Returns 'YYYY-MM-DD' using LOCAL timezone components.
 * Fix for timezone trap: new Date().toISOString() at 11 PM local would log next day UTC.
 */
export function getLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Single source of truth for 'Today' - strict local string, avoids UTC shifts */
export const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`; // Example: '2026-09-04'
};

/** Alias required by prompt spec */
export const getLocalDailyString = getLocalDateString;

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
  return getLocalDateString(d);
}

/**
 * Difference in whole calendar days between two YYYY-MM-DD strings (a - b)
 */
export function diffLocalDays(a: string, b: string): number {
  const da = parseLocalDate(a);
  const db = parseLocalDate(b);
  // Use UTC at noon to avoid DST issues, but local parsing ensures correct day
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
