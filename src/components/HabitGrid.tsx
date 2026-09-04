import React, { useEffect, useRef } from 'react';
import { toLocalDateString, addLocalDays } from '../utils/dateUtils';

interface HabitGridProps {
  completions: string[];
  color: string;
  createdAt?: string;
  isEditMode?: boolean;
  onToggleDate?: (dateStr: string) => void;
}

/**
 * Structurally locked GitHub-style matrix - each column = perfect Sunday(0) to Saturday(6) week.
 * Continuous left-to-right, Today on far right column, 7 rows fixed, uniform columns.
 */
const HabitGrid: React.FC<HabitGridProps> = ({ completions, color, createdAt, isEditMode = false, onToggleDate }) => {
  const todayStr = toLocalDateString(new Date());
  const cutoff = addLocalDays(todayStr, -13); // 14-day window inclusive
  const containerRef = useRef<HTMLDivElement>(null);

  // Establish Baseline: calculate exactly how many days for uniform columns
  // Find current day of week for Today
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 Sun .. 6 Sat, e.g., Friday = 5 → current column has 6 days Sun-Fri
  // Start of current week (Sunday)
  const startOfCurrentWeek = new Date(today);
  startOfCurrentWeek.setDate(today.getDate() - dayOfWeek);
  // End of current week (Saturday) - ensures final column has 7 rows
  const endOfCurrentWeek = new Date(startOfCurrentWeek);
  endOfCurrentWeek.setDate(startOfCurrentWeek.getDate() + 6);
  // Start 19 weeks before current week Sunday → 20 weeks total = 140 days uniform
  const startDate = new Date(startOfCurrentWeek);
  startDate.setDate(startOfCurrentWeek.getDate() - 19 * 7);

  // Column Loop: work backward from Today to populate, every column aligns index 0=Sunday
  const days: string[] = [];
  const cursor = new Date(startDate);
  while (cursor <= endOfCurrentWeek) {
    days.push(toLocalDateString(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  // days.length === 140, 20 columns × 7 rows, Today at far-right column row = dayOfWeek

  const completionsSet = new Set(completions);

  // Snap to far-right (Today) on mount / updates
  useEffect(() => {
    const el = containerRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [completions, isEditMode]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollLeft = el.scrollWidth;
    const onFocus = () => { if (containerRef.current) containerRef.current.scrollLeft = containerRef.current.scrollWidth; };
    const onVisibility = () => { if (document.visibilityState === 'visible' && containerRef.current) containerRef.current.scrollLeft = containerRef.current.scrollWidth; };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <div ref={containerRef} className="overflow-x-auto scroll-smooth scrollbar-hide pb-2">
      <div className="grid grid-rows-7 grid-flow-col gap-[2px] min-w-max">
        {days.map((dateStr) => {
          const isCompleted = completionsSet.has(dateStr);
          const isFuture = dateStr > todayStr;
          const isBeforeCreation = createdAt ? dateStr < createdAt : false;
          const isLocked = dateStr < cutoff || isFuture || isBeforeCreation; // 14-day + creation lock + future
          const canEdit = isEditMode && !isLocked && !!onToggleDate;

          return (
            <button
              key={dateStr}
              title={`${dateStr}${isFuture ? ' (future)' : isLocked ? ' (locked - older than 14 days)' : ''}${isCompleted ? ' ✓' : ''}`}
              disabled={!canEdit}
              onClick={() => canEdit && onToggleDate?.(dateStr)}
              style={{
                backgroundColor: isCompleted ? color : '#1c1c1e',
                boxShadow: isCompleted ? `0 0 8px ${color}55` : 'none',
                opacity: isLocked ? 0.3 : 1,
              }}
              className={`w-[14px] h-[14px] rounded-[3px] transition-all duration-150 ease-out will-change-transform will-change-[background-color,box-shadow]
                ${canEdit ? 'cursor-pointer hover:scale-110 hover:brightness-110 active:scale-95' : isLocked ? 'cursor-not-allowed' : 'cursor-default'}
              `}
              aria-label={`${dateStr} ${isCompleted ? 'completed' : 'not completed'}${isLocked ? ' locked' : ''}`}
            />
          );
        })}
      </div>
    </div>
  );
};

export default HabitGrid;
