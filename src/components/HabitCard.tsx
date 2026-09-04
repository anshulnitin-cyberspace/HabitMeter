import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { BookOpen, Dumbbell, Flame, Trophy, Target, MoreHorizontal, Pencil, Trash2, Check } from 'lucide-react';
import HabitGrid from './HabitGrid';
import type { Habit } from '../types';
import { getCurrentStreak, getLongestStreak, getCompletionsForCurrentWeek } from '../utils/habitMath';
import { toLocalDateString, getCalendarDaysElapsed } from '../utils/dateUtils';
import { ICON_OPTIONS } from './HabitModal';

interface HabitCardProps {
  habit: Habit;
  onToggleDate: (habitId: string, date: string) => void;
  onEdit: (habit: Habit) => void;
  onDelete: (id: string) => void;
}

const IconRenderer = ({ iconName, color }: { iconName: string; color: string }) => {
  const found = ICON_OPTIONS.find((o) => o.name === iconName);
  if (found) {
    const C = found.Icon;
    return <C size={20} color={color} />;
  }
  switch (iconName) {
    case 'book': return <BookOpen size={20} color={color} />;
    case 'dumbbell': return <Dumbbell size={20} color={color} />;
    default: return <BookOpen size={20} color={color} />;
  }
};

const HabitCard: React.FC<HabitCardProps> = ({ habit, onToggleDate, onEdit, onDelete }) => {
  console.log('CURRENT_HABIT_DATA:', habit);
  const { currentStreak, longestStreak, consistencyPercentage, weeklyCount, isTodayCompleted } = useMemo(() => {
    const todayStr = toLocalDateString(new Date());
    // 1. Calculate Tracked History Window - DST-proof via getCalendarDaysElapsed (V-1/V-2)
    const daysElapsed = getCalendarDaysElapsed(habit.createdAt, todayStr);
    const safeDays = daysElapsed <= 0 ? 1 : daysElapsed; // tampering fallback (V-5/V-6)
    const trackableDaysCount = Math.min(14, safeDays);

    // 3. Synced Consistency Formula - only within 14-day interactable window and not before creation
    const validCompletionsInWindow = habit.completions.filter((dateStr) => {
      const date = new Date(dateStr + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffTime = today.getTime() - date.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays < 14 && dateStr >= habit.createdAt;
    }).length;
    const consistencyPercentage = trackableDaysCount > 0 ? Math.round((validCompletionsInWindow / trackableDaysCount) * 100) : 0;

    return {
      currentStreak: getCurrentStreak(habit.completions),
      longestStreak: getLongestStreak(habit.completions),
      consistencyPercentage,
      weeklyCount: getCompletionsForCurrentWeek(habit.completions),
      isTodayCompleted: habit.completions.includes(todayStr),
    };
  }, [habit.completions, habit.createdAt]);

  const handleIconClick = () => {
    const actionTimestamp = new Date(); // Execution Snapshot Pattern (V-4)
    const todayStr = toLocalDateString(actionTimestamp);
    onToggleDate(habit.id, todayStr);
  };

  // Long-press to EditMode for grid history
  const [isEditMode, setIsEditMode] = useState(false);
  const longPressRef = useRef<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const clearLongPress = useCallback(() => {
    if (longPressRef.current) {
      window.clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  }, []);

  const startLongPress = useCallback(() => {
    clearLongPress();
    longPressRef.current = window.setTimeout(() => {
      setIsEditMode((v) => !v);
      // haptic feedback if available
      try { navigator.vibrate?.(40); } catch {}
    }, 550);
  }, [clearLongPress]);

  const toggleEditMode = useCallback(() => {
    setIsEditMode((v) => !v);
    try { navigator.vibrate?.(30); } catch {}
  }, []);

  // Double-click also toggles (desktop fallback)
  const handleDoubleClick = useCallback(() => {
    toggleEditMode();
  }, [toggleEditMode]);

  // Menu & delete
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleGridToggle = useCallback((dateStr: string) => {
    if (!isEditMode) return;
    // 2. Prevent Editing Before Creation Date
    if (dateStr < habit.createdAt) return;
    onToggleDate(habit.id, dateStr);
  }, [isEditMode, onToggleDate, habit.id, habit.createdAt]);

  return (
    <>
      <div
        ref={cardRef}
        onMouseDown={startLongPress}
        onMouseUp={clearLongPress}
        onMouseLeave={clearLongPress}
        onTouchStart={startLongPress}
        onTouchEnd={clearLongPress}
        onDoubleClick={handleDoubleClick}
        className="bg-[#121214] rounded-2xl p-5 shadow-lg w-full max-w-2xl mx-auto flex flex-col gap-4 relative select-none"
        style={{
          borderWidth: 1,
          borderStyle: 'solid',
          borderColor: isEditMode ? habit.color : 'rgba(255,255,255,0.05)',
          boxShadow: isEditMode ? `0 0 0 1px ${habit.color}40, 0 0 16px ${habit.color}18` : undefined,
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        }}
      >
        {/* Done checkmark - exits EditMode and instantly saves via localStorage effect */}
        {isEditMode && (
          <button
            onClick={toggleEditMode}
            onMouseDown={(e) => e.stopPropagation()}
            aria-label="Done editing"
            title="Done"
            className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white text-black flex items-center justify-center shadow-lg border border-black/10 hover:bg-zinc-100 active:scale-95 transition-all z-10"
            style={{ boxShadow: `0 0 10px ${habit.color}60` }}
          >
            <Check size={14} strokeWidth={3} />
          </button>
        )}

        {/* Card Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={handleIconClick}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              title={isTodayCompleted ? 'Today completed - click to undo' : 'Mark today as completed'}
              aria-label={isTodayCompleted ? `Uncheck today for ${habit.name}` : `Complete today for ${habit.name}`}
              aria-pressed={isTodayCompleted}
              style={{
                backgroundColor: isTodayCompleted ? `${habit.color}18` : 'rgba(255,255,255,0.05)',
                borderColor: isTodayCompleted ? habit.color : 'transparent',
                boxShadow: isTodayCompleted ? `0 0 12px ${habit.color}40` : 'none',
              }}
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-150 ease-out hover:opacity-90 active:scale-95 cursor-pointer"
            >
              <IconRenderer iconName={habit.icon} color={habit.color} />
            </button>
            <div className="min-w-0">
              <h3 className="text-white font-semibold text-lg truncate flex items-center gap-2">
                {habit.name}
                {isEditMode && <span className="text-[10px] font-medium tracking-widest px-1.5 py-0.5 rounded-full border" style={{ color: habit.color, borderColor: `${habit.color}40`, backgroundColor: `${habit.color}14` }}>EDIT</span>}
              </h3>
              <p className="text-zinc-500 text-sm truncate">{habit.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-4">
              <div className="text-right">
                <div className="flex items-center gap-1.5 justify-end text-white font-medium">
                  <Flame size={16} className="text-orange-400" />
                  <span>{currentStreak} day streak</span>
                </div>
                <div className="flex items-center gap-1.5 justify-end text-zinc-500 text-sm">
                  <Trophy size={12} />
                  <span>Best: {longestStreak} days</span>
                </div>
              </div>
              <div className="h-10 w-px bg-white/10" />
              <div className="text-right">
                <p className="text-white font-medium text-lg flex items-center gap-1 justify-end">
                  <Target size={14} className="text-zinc-500" />
                  {consistencyPercentage}%
                </p>
                <p className="text-zinc-500 text-xs">
                  {weeklyCount} / {habit.frequency}/wk
                </p>
              </div>
            </div>

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                onMouseDown={(e) => e.stopPropagation()}
                aria-label={`Options for ${habit.name}`}
                className="w-8 h-8 rounded-full bg-white/[0.03] hover:bg-white/10 border border-transparent hover:border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all active:scale-95"
              >
                <MoreHorizontal size={16} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-10 w-40 bg-[#1c1c1e] border border-white/10 rounded-xl shadow-xl overflow-hidden z-20">
                  <button onClick={() => { setMenuOpen(false); onEdit(habit); }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-white/5 text-left">
                    <Pencil size={14} /> Edit habit
                  </button>
                  <div className="h-px bg-white/5" />
                  <button onClick={() => { setMenuOpen(false); setConfirmDelete(true); }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 text-left">
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex sm:hidden items-center gap-2 text-sm flex-wrap">
          <span className="inline-flex items-center gap-1.5 bg-white/5 border border-white/5 px-2.5 py-1 rounded-full text-white">
            <Flame size={14} className="text-orange-400" /> {currentStreak} day streak
          </span>
          <span className="inline-flex items-center gap-1.5 bg-white/5 border border-white/5 px-2.5 py-1 rounded-full text-zinc-400">
            <Trophy size={14} /> Best: {longestStreak}
          </span>
          <span className="inline-flex items-center gap-1.5 bg-white/5 border border-white/5 px-2.5 py-1 rounded-full text-white">
            <Target size={14} className="text-zinc-400" /> {weeklyCount}/{habit.frequency}
          </span>
          <span className="inline-flex items-center gap-1.5 bg-white/5 border border-white/5 px-2.5 py-1 rounded-full text-zinc-400">
            {consistencyPercentage}%
          </span>
        </div>

        {isEditMode && (
          <p className="text-xs text-zinc-400 -mt-1">Editing past 14 days — tap squares to toggle • Long-press or tap ✓ to save</p>
        )}

        {/* Grid - continuous unbroken, read-only until EditMode */}
        <div className="mt-1">
          <HabitGrid
            completions={habit.completions}
            color={habit.color}
            createdAt={habit.createdAt}
            isEditMode={isEditMode}
            onToggleDate={handleGridToggle}
          />
        </div>
        {!isEditMode && (
          <p className="text-[11px] text-zinc-600 text-center">Long-press card to edit history • Tap icon to toggle Today</p>
        )}
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setConfirmDelete(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-[#121214] border border-white/10 rounded-2xl p-5 shadow-2xl">
            <h3 className="text-white font-semibold">Delete habit?</h3>
            <p className="text-zinc-400 text-sm mt-1">Are you sure you want to delete <span className="text-white">{habit.name}</span>? This cannot be undone.</p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium">Cancel</button>
              <button onClick={() => { setConfirmDelete(false); onDelete(habit.id); }} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold">Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HabitCard;
