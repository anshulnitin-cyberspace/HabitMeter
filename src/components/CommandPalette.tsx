import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, Plus, Download, Upload, User, BarChart3, Check, ChevronRight, CheckCheck, XCircle } from 'lucide-react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Keyboard } from '@capacitor/keyboard';
import { useHabits } from '../context/HabitContext';
import { toLocalDateString } from '../utils/dateUtils';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateHabit: () => void;
  onExportBackup: () => void;
  onImportBackup: () => void;
  onNavigate: (tab: 'dashboard' | 'analytics' | 'profile') => void;
}

interface Command {
  id: string;
  label: string;
  sublabel?: string;
  icon: React.ElementType;
  action: () => void | Promise<void>;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onCreateHabit, onExportBackup, onImportBackup, onNavigate }) => {
  const { habits, toggleCompletion, markAllComplete, markAllIncomplete } = useHabits();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce query to prevent lag on fast typing
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 120);
    return () => clearTimeout(t);
  }, [query]);

  // AutoFocus and keyboard handling
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      requestAnimationFrame(() => inputRef.current?.focus());
      // Ensure keyboard doesn't obscure list - Capacitor Keyboard plugin handles resize
      if (Keyboard) {
        Keyboard.setResizeMode({ mode: 'native' } as any).catch(() => {});
      }
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);



  const commands: Command[] = useMemo(() => {
    const staticCommands: Command[] = [
      {
        id: 'create',
        label: 'Create New Habit',
        sublabel: 'Add a new habit to track',
        icon: Plus,
        action: () => onCreateHabit(),
      },
      {
        id: 'mark-all-complete',
        label: 'Mark All Habits as Complete',
        sublabel: 'Complete all habits for today',
        icon: CheckCheck,
        action: () => markAllComplete(),
      },
      {
        id: 'mark-all-incomplete',
        label: 'Mark All Habits as Incomplete',
        sublabel: 'Clear today for all habits',
        icon: XCircle,
        action: () => markAllIncomplete(),
      },
      {
        id: 'export',
        label: 'Export Backup',
        sublabel: 'Save habits to file',
        icon: Download,
        action: () => onExportBackup(),
      },
      {
        id: 'import',
        label: 'Import Backup',
        sublabel: 'Restore from file',
        icon: Upload,
        action: () => onImportBackup(),
      },
      {
        id: 'profile',
        label: 'Go to Profile',
        sublabel: 'Manage settings',
        icon: User,
        action: () => onNavigate('profile'),
      },
      {
        id: 'analytics',
        label: 'Go to Analytics',
        sublabel: 'View consistency insights',
        icon: BarChart3,
        action: () => onNavigate('analytics'),
      },
    ];

    const dynamicCommands: Command[] = habits.map((habit) => {
      const todayStr = toLocalDateString(new Date());
      const isDone = habit.completions.includes(todayStr);
      return {
        id: `toggle-${habit.id}`,
        label: isDone ? `Unmark ${habit.name}` : `Mark ${habit.name} as Complete`,
        sublabel: habit.description || `${habit.completions.length} completions`,
        icon: Check,
        action: () => toggleCompletion(habit.id, todayStr),
      };
    });

    return [...staticCommands, ...dynamicCommands];
  }, [habits, onCreateHabit, onExportBackup, onImportBackup, onNavigate, toggleCompletion, markAllComplete, markAllIncomplete]);

  const filtered = useMemo(() => {
    if (!debouncedQuery.trim()) return commands;
    const q = debouncedQuery.toLowerCase();
    return commands.filter((c) => c.label.toLowerCase().includes(q) || (c.sublabel && c.sublabel.toLowerCase().includes(q)));
  }, [commands, debouncedQuery]);

  const handleSelect = async (cmd: Command) => {
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    onClose();
    // slight delay to allow close animation before action
    setTimeout(() => {
      cmd.action();
    }, 100);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Scrim - reduced blur for Android performance */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Container anchored to top with margin - avoids status bar, extra top padding */}
      <div className="relative w-[95%] mx-auto mt-10 md:mt-12 bg-black border border-neutral-900 rounded-2xl shadow-2xl flex flex-col max-h-[75vh] overflow-hidden" style={{ marginTop: 'calc(1.5rem + env(safe-area-inset-top, 20px))' } as React.CSSProperties}>
        {/* Search input - min 48px touch target */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-900">
          <Search size={18} className="text-zinc-500 shrink-0" />
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands or habits…"
            className="flex-1 bg-transparent text-neutral-100 placeholder-neutral-600 outline-none focus:ring-0 text-base min-h-[48px] py-2"
            spellCheck={false}
          />
          {/* X logic: small x in circle to clear when has text, bigger X to close when empty - same area */}
          {query ? (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 active:scale-95 shrink-0"
            >
              <X size={14} />
            </button>
          ) : (
            <button
              onClick={onClose}
              aria-label="Close palette"
              className="w-8 h-8 rounded-full hover:bg-white/5 flex items-center justify-center text-zinc-500 hover:text-white active:scale-95 shrink-0"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* List - scrollable above keyboard */}
        <div className="flex-1 overflow-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' as any }}>
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-zinc-500 text-sm">No commands found</div>
          ) : (
            <div className="py-2">
              {filtered.map((cmd) => (
                <button
                  key={cmd.id}
                  onClick={() => handleSelect(cmd)}
                  className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-white/[0.04] active:bg-neutral-900 active:text-white transition-colors"
                  style={{ WebkitTapHighlightColor: 'transparent' } as any}
                >
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <cmd.icon size={14} className="text-zinc-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-neutral-300 text-sm font-medium truncate">{cmd.label}</p>
                    {cmd.sublabel && <p className="text-zinc-500 text-xs truncate">{cmd.sublabel}</p>}
                  </div>
                  <ChevronRight size={14} className="text-zinc-600 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-neutral-900 flex items-center justify-between text-[11px] text-zinc-600">
          <span>Tap to run • Tap outside to close</span>
          <span className="hidden sm:inline">ESC to close</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;


