import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Habit } from '../types';
import { getLocalDateString, getTodayString, sortCompletions } from '../utils/dateUtils';

const STORAGE_KEY = 'habitmeter_data';

// Initial data - strictly new schema - single source of truth
function getInitialHabits(): Habit[] {
  const today = getTodayString();
  // Created 30 days ago for meaningful completion rate demo
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const createdAtStr = getLocalDateString(thirtyDaysAgo);

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

// Migration helper: handle old schema persisted data
function normalizeHabit(raw: any): Habit {
  // Old fields: completedDates -> completions, targetFrequency -> frequency
  const completions: string[] = raw.completions ?? raw.completedDates ?? [];
  const frequency: number = raw.frequency ?? raw.targetFrequency ?? 7;
  const createdAt: string = raw.createdAt ?? getTodayString();

  return {
    id: String(raw.id),
    name: String(raw.name),
    description: raw.description ? String(raw.description) : undefined,
    color: String(raw.color),
    icon: String(raw.icon),
    frequency: Number(frequency),
    createdAt: String(createdAt),
    completions: sortCompletions([...new Set(completions.filter((d: any) => typeof d === 'string'))]),
  };
}

function loadHabits(): Habit[] {
  if (typeof window === 'undefined') return getInitialHabits();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getInitialHabits();
    const parsed = JSON.parse(raw);
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

  // Persist to localStorage whenever habits change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
    } catch (e) {
      console.error('Failed to persist habits', e);
    }
  }, [habits]);

  const toggleCompletion = useCallback((habitId: string, dateStr: string) => {
    // Strict toggle using exact YYYY-MM-DD string - forces shallow copy for React re-render
    setHabits((prev) => {
      const updated = prev.map((habit) => {
        if (habit.id !== habitId) return habit;
        const isCompleted = habit.completions.includes(dateStr);
        const nextCompletions = isCompleted
          ? habit.completions.filter((d) => d !== dateStr) // filter out Today
          : [...habit.completions, dateStr]; // push Today
        const next = sortCompletions([...new Set(nextCompletions)]);
        return { ...habit, completions: next };
      });
      return [...updated]; // shallow copy triggers instant grid re-render
    });
  }, []);

  const addHabit = useCallback((habitData: Omit<Habit, 'id' | 'createdAt' | 'completions'>) => {
    const newHabit: Habit = {
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: getTodayString(),
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
    </HabitContext.Provider>
  );
};

export function useHabits(): HabitContextValue {
  const ctx = useContext(HabitContext);
  if (!ctx) throw new Error('useHabits must be used within HabitProvider');
  return ctx;
}

export { STORAGE_KEY };
