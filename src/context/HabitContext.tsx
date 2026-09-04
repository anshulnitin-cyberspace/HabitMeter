import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Habit } from '../types';
import { toLocalDateString, parseLocalDate, sortCompletions } from '../utils/dateUtils';

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

// Migration helper: handle old schema persisted data (Anti-Pollution & DoS Patch)
function normalizeHabit(raw: any): Habit {
  // Old fields: completedDates -> completions, targetFrequency -> frequency
  const rawCompletions: string[] = Array.isArray(raw.completions ?? raw.completedDates) ? (raw.completions ?? raw.completedDates).slice(0, 5000) : [];
  const frequency: number = raw.frequency ?? raw.targetFrequency ?? 7;
  const createdAt: string = raw.createdAt ?? toLocalDateString(new Date());

  return {
    id: String(raw.id),
    name: String(raw.name),
    description: raw.description ? String(raw.description) : undefined,
    color: String(raw.color),
    icon: String(raw.icon),
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
  toggleCompletion: (habitId: string, dateStr: string) => void;
  addHabit: (habit: Omit<Habit, 'id' | 'createdAt' | 'completions'>) => void;
  updateHabit: (id: string, patch: Partial<Omit<Habit, 'id' | 'completions' | 'createdAt'>>) => void;
  deleteHabit: (id: string) => void;
  setHabits: React.Dispatch<React.SetStateAction<Habit[]>>;
}

const HabitContext = createContext<HabitContextValue | null>(null);

export const HabitProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [habits, setHabits] = useState<Habit[]>(() => loadHabits());
  const [storageToast, setStorageToast] = useState<string | null>(null);

  // Persist to localStorage whenever habits change - Atomic & Quota Fallback (Concurrency Patch)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
    } catch (e: any) {
      console.error('Failed to persist habits', e);
      if (e?.name === 'QuotaExceededError' || e?.code === 22 || e?.message?.includes('QuotaExceeded') || e?.message?.includes('exceeded')) {
        setStorageToast('Storage quota exceeded. Please clear space or delete old habits.');
        setTimeout(() => setStorageToast(null), 3000);
      }
    }
  }, [habits]);

  const toggleCompletion = useCallback((habitId: string, dateStr: string) => {
    // Sanitize - strictly run through toLocalDateString
    const sanitizedDateStr = toLocalDateString(parseLocalDate(dateStr));
    setHabits((prev) => {
      const updated = prev.map((habit) => {
        if (habit.id !== habitId) return habit;
        const isCompleted = habit.completions.includes(sanitizedDateStr);
        const nextCompletions = isCompleted
          ? habit.completions.filter((d) => d !== sanitizedDateStr)
          : [...habit.completions, sanitizedDateStr];
        const next = sortCompletions([...new Set(nextCompletions)]);
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
    setHabits((prev) => prev.filter((h) => h.id !== id));
  }, []);

  return (
    <HabitContext.Provider value={{ habits, toggleCompletion, addHabit, updateHabit, deleteHabit, setHabits }}>
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
