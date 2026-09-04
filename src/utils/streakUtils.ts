/**
 * Alias file for streakUtils.ts spec compatibility - re-exports habitMath
 */
export * from './habitMath';
export { getCurrentStreak as calculateCurrentStreak, getLongestStreak as calculateLongestStreak, getCompletionRate as calculateCompletionRate, getCompletionsForCurrentWeek as calculateCompletionsForCurrentWeek } from './habitMath';
