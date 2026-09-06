import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Habit } from '../types';
import { toLocalDateString, parseLocalDate, sortCompletions } from '../utils/dateUtils';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Preferences } from '@capacitor/preferences';
import { getCurrentStreak } from '../utils/habitMath';

const STORAGE_KEY = 'habitmeter_data';

// Initial data - strictly new schema - single source of truth via toLocalDateString
function getInitialHabits(): Habit[] {
  const today = toLocalDateString(new Date());
  // Created 30 days ago for meaningful completion rate demo
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const createdAtStr = toLocalDateString(thirtyDaysAgo);

  return [
    {
      id: '1',
      name: 'Read Books',
      description: 'Read 20 pages every day',
      color: '#3b82f6',
      icon: 'book',
      frequency: 7,
      createdAt: createdAtStr,
      completions: [today],
    },
    {
      id: '2',
      name: 'Gym',
      description: 'Weightlifting and cardio',
      color: '#10b981',
      icon: 'dumbbell',
      frequency: 5,
      createdAt: createdAtStr,
      completions: [],
    },
  ];
}

// Migration helper: handle old schema persisted data (Anti-Pollution & DoS Patch + hasOwnProperty)
function normalizeHabit(raw: any): Habit {
  // Use hasOwnProperty to prevent prototype pollution via Object.create(null)
  const hasCompletions = Object.prototype.hasOwnProperty.call(raw, 'completions');
  const hasCompletedDates = Object.prototype.hasOwnProperty.call(raw, 'completedDates');
  const rawCompletions: string[] = Array.isArray(hasCompletions ? raw.completions : hasCompletedDates ? raw.completedDates : null)
    ? ((hasCompletions ? raw.completions : raw.completedDates) as string[]).slice(0, 5000)
    : [];
  const hasFrequency = Object.prototype.hasOwnProperty.call(raw, 'frequency');
  const hasTargetFrequency = Object.prototype.hasOwnProperty.call(raw, 'targetFrequency');
  const frequency: number = hasFrequency ? raw.frequency : hasTargetFrequency ? raw.targetFrequency : 7;
  const hasCreatedAt = Object.prototype.hasOwnProperty.call(raw, 'createdAt');
  const createdAt: string = hasCreatedAt ? raw.createdAt : toLocalDateString(new Date());

  const hasId = Object.prototype.hasOwnProperty.call(raw, 'id');
  const hasName = Object.prototype.hasOwnProperty.call(raw, 'name');
  if (!hasId || !hasName) {
    // Fallback to prevent crash on polluted object without own id/name
  }

  return {
    id: String(hasId ? raw.id : ''),
    name: String(hasName ? raw.name : 'Untitled'),
    description: Object.prototype.hasOwnProperty.call(raw, 'description') && typeof raw.description === 'string' ? String(raw.description) : undefined,
    color: Object.prototype.hasOwnProperty.call(raw, 'color') ? String(raw.color) : '#3b82f6',
    icon: Object.prototype.hasOwnProperty.call(raw, 'icon') ? String(raw.icon) : 'book',
    frequency: Number(frequency),
    createdAt: String(createdAt),
    completions: sortCompletions([...new Set(rawCompletions.filter((d: any) => typeof d === 'string'))]),
  };
}

function loadHabits(): Habit[] {
  if (typeof window === 'undefined') return getInitialHabits();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getInitialHabits();
    const parsed = JSON.parse(raw, (k, v) => (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v);
    if (!Array.isArray(parsed)) return getInitialHabits();
    return parsed.map(normalizeHabit);
  } catch {
    return getInitialHabits();
  }
}

interface HabitContextValue {
  habits: Habit[];
  isLoading: boolean;
  toggleCompletion: (habitId: string, dateStr: string) => void;
  addHabit: (habit: Omit<Habit, 'id' | 'createdAt' | 'completions'>) => void;
  updateHabit: (id: string, patch: Partial<Omit<Habit, 'id' | 'completions' | 'createdAt'>>) => void;
  deleteHabit: (id: string) => void;
  setHabits: React.Dispatch<React.SetStateAction<Habit[]>>;
}

const HabitContext = createContext<HabitContextValue | null>(null);

export const HabitProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [habits, setHabits] = useState<Habit[]>(() => loadHabits());
  const [isLoading, setIsLoading] = useState(true);
  const [storageToast, setStorageToast] = useState<string | null>(null);

  // Skeleton loading - prevent jarring flash with 200ms delay
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 200);
    return () => clearTimeout(t);
  }, []);

  // Persist to localStorage whenever habits change - Pseudo-atomic + Quota Fallback + Widget Bridge
  useEffect(() => {
    const saveData = () => {
      try {
        const json = JSON.stringify(habits);
        // Pseudo-atomic write: write to temp, overwrite main, delete temp
        localStorage.setItem(`${STORAGE_KEY}_tmp`, json);
        localStorage.setItem(STORAGE_KEY, json);
        localStorage.removeItem(`${STORAGE_KEY}_tmp`);
      } catch (e: any) {
        if (e.name === 'QuotaExceededError') {
          setStorageToast('Storage quota exceeded. Please export your data to clear space.');
          setTimeout(() => setStorageToast(null), 3000);
        } else {
          // Log message only to prevent absolute path URI leaks
          console.error('Storage write failed:', e.message);
        }
      }
      // Mirror to native storage for widget (non-blocking)
      (async () => {
        try {
          await Preferences.set({ key: 'widget_habits_data', value: JSON.stringify(habits) });
        } catch (e: any) {
          console.error('Failed to sync widget data:', (e as any)?.message);
        }
      })();
    };

    // Debounce the write to prevent blocking the UI thread during rapid toggles
    const timeoutId = setTimeout(saveData, 300);
    return () => clearTimeout(timeoutId);
  }, [habits]);

  const toggleCompletion = useCallback((habitId: string, dateStr: string) => {
    // Sanitize - strictly run through toLocalDateString
    const sanitizedDateStr = toLocalDateString(parseLocalDate(dateStr));
    // Haptic Light on toggle
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    setHabits((prev) => {
      const updated = prev.map((habit) => {
        if (habit.id !== habitId) return habit;
        const isCompleted = habit.completions.includes(sanitizedDateStr);
        const nextCompletions = isCompleted
          ? habit.completions.filter((d) => d !== sanitizedDateStr)
          : [...habit.completions, sanitizedDateStr];
        const next = sortCompletions([...new Set(nextCompletions)]);
        const wasStreak = getCurrentStreak(habit.completions);
        const willStreak = getCurrentStreak(next);
        if (willStreak > wasStreak && (willStreak === 7 || willStreak === 30 || willStreak % 30 === 0)) {
          Haptics.notification({ type: 'SUCCESS' } as any).catch(() => Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {}));
        }
        return { ...habit, completions: next };
      });
      return [...updated];
    });
  }, []);

  const addHabit = useCallback((habitData: Omit<Habit, 'id' | 'createdAt' | 'completions'>) => {
    const newHabit: Habit = {
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: toLocalDateString(new Date()),
      completions: [],
      ...habitData,
      frequency: Math.min(7, Math.max(1, habitData.frequency)),
    };
    setHabits((prev) => [...prev, newHabit]);
  }, []);

  const updateHabit = useCallback((id: string, patch: Partial<Omit<Habit, 'id' | 'completions' | 'createdAt'>>) => {
    setHabits((prev) =>
      prev.map((h) => (h.id === id ? { ...h, ...patch, frequency: patch.frequency ? Math.min(7, Math.max(1, patch.frequency)) : h.frequency } : h))
    );
  }, []);

  const deleteHabit = useCallback((id: string) => {
    Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
    setHabits((prev) => prev.filter((h) => h.id !== id));
  }, []);

  return (
    <HabitContext.Provider value={{ habits, isLoading, toggleCompletion, addHabit, updateHabit, deleteHabit, setHabits }}>
      {children}
      {storageToast && (
        <div className="fixed bottom-28 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-auto z-50 flex justify-center pointer-events-none">
          <div className="pointer-events-auto min-w-[280px] max-w-[90vw] md:max-w-md px-4 py-3 rounded-xl border shadow-2xl flex items-center gap-3 bg-[#000000] border-neutral-800">
            <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
            <p className="text-sm font-medium flex-1 text-[#f87171]">{storageToast}</p>
            <button onClick={() => setStorageToast(null)} className="text-zinc-500 hover:text-white text-xs shrink-0">✕</button>
          </div>
        </div>
      )}
    </HabitContext.Provider>
  );
};

export function useHabits(): HabitContextValue {
  const ctx = useContext(HabitContext);
  if (!ctx) throw new Error('useHabits must be used within HabitProvider');
  return ctx;
}

export { STORAGE_KEY };
