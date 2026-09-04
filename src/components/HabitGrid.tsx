import React, { useEffect, useRef } from 'react';
import { getTodayString, addLocalDays } from '../utils/dateUtils';

interface HabitGridProps {
  completions: string[];
  color: string;
  isEditMode?: boolean;
  onToggleDate?: (dateStr: string) => void;
}

/**
 * Clean continuous GitHub-style grid - 7 rows fixed, expands horizontally.
 * Chronological left→right, Today at far right strict boundary - no future weeks beyond current week.
 * Read-only by default; in EditMode only last 14 days are clickable.
 */
const HabitGrid: React.FC<HabitGridProps> = ({ completions, color, isEditMode = false, onToggleDate }) => {
  const todayStr = getTodayString();
  const cutoff = addLocalDays(todayStr, -13); // 14-day window inclusive
  const containerRef = useRef<HTMLDivElement>(null);

  // 140 days = 20 weeks - unbroken continuous timeline ending exactly on Today (far-right column = current week)
  // No future weeks or trailing empty columns beyond Today
  const days: string[] = Array.from({ length: 140 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (139 - i));
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const completionsSet = new Set(completions);

  // Automatic scroll anchoring (snap to Today) - fires on mount, completions change, and re-entries
  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      // Instantly force to far-right edge so Today is immediately visible
      el.scrollLeft = el.scrollWidth;
    }
  }, [completions, isEditMode]);

  // Also snap on mount and when window refocuses (app re-entry)
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
    <div ref={containerRef} className="overflow-x-auto scrollbar-hide pb-2 scroll-smooth">
      <div className="grid grid-rows-7 grid-flow-col gap-1.5 min-w-max">
        {days.map((dateStr) => {
          const isCompleted = completionsSet.has(dateStr);
          const isLocked = dateStr < cutoff; // Strict 14-day past boundary
          const canEdit = isEditMode && !isLocked && !!onToggleDate;

          return (
            <button
              key={dateStr}
              title={`${dateStr}${isLocked ? ' (locked - older than 14 days)' : ''}${isCompleted ? ' ✓' : ''}`}
              disabled={!canEdit}
              onClick={() => canEdit && onToggleDate?.(dateStr)}
              style={{
                backgroundColor: isCompleted ? color : '#1c1c1e',
                boxShadow: isCompleted ? `0 0 8px ${color}55` : 'none',
                opacity: isLocked ? 0.35 : 1,
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
