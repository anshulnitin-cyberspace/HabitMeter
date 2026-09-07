import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Dumbbell,
  Droplets,
  Heart,
  Code2,
  Music4,
  Coffee,
  Sun,
  Moon,
  Zap,
  CheckCircle2,
  CalendarDays,
  Target,
  X,
  Minus,
  Plus,
} from 'lucide-react';
import type { Habit } from '../types';

// Icon registry - 12 minimalist options
export const ICON_OPTIONS = [
  { name: 'book', Icon: BookOpen, label: 'Book' },
  { name: 'dumbbell', Icon: Dumbbell, label: 'Gym' },
  { name: 'water', Icon: Droplets, label: 'Water' },
  { name: 'heart', Icon: Heart, label: 'Meditation' },
  { name: 'code', Icon: Code2, label: 'Coding' },
  { name: 'music', Icon: Music4, label: 'Music' },
  { name: 'coffee', Icon: Coffee, label: 'Coffee' },
  { name: 'sun', Icon: Sun, label: 'Morning' },
  { name: 'moon', Icon: Moon, label: 'Sleep' },
  { name: 'zap', Icon: Zap, label: 'Energy' },
  { name: 'check', Icon: CheckCircle2, label: 'Check' },
  { name: 'calendar', Icon: CalendarDays, label: 'Calendar' },
] as const;

export const COLOR_OPTIONS = [
  { hex: '#10b981', name: 'Pastel Mint' }, // Emerald
  { hex: '#f43f5e', name: 'Deep Rose' },
  { hex: '#06b6d4', name: 'Neon Cyan' },
  { hex: '#f97316', name: 'Sunset Orange' },
  { hex: '#8b5cf6', name: 'Electric Violet' },
  { hex: '#3b82f6', name: 'Electric Blue' },
  { hex: '#eab308', name: 'Sunny Yellow' },
  { hex: '#ec4899', name: 'Soft Pink' },
];

const IconRenderer = ({ iconName, color, size = 20 }: { iconName: string; color: string; size?: number }) => {
  const found = ICON_OPTIONS.find((o) => o.name === iconName);
  if (found) {
    const IconComp = found.Icon;
    return <IconComp size={size} color={color} />;
  }
  // fallback for legacy names like 'book' vs ICON_OPTIONS
  switch (iconName) {
    case 'book': return <BookOpen size={size} color={color} />;
    case 'dumbbell': return <Dumbbell size={size} color={color} />;
    default: return <Target size={size} color={color} />;
  }
};

interface HabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; description?: string; icon: string; color: string; frequency: number }) => void;
  habit?: Habit | null; // if editing, prefill
}

const HabitModal: React.FC<HabitModalProps> = ({ isOpen, onClose, onSave, habit }) => {
  const isEditing = !!habit;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('book');
  const [color, setColor] = useState(COLOR_OPTIONS[5].hex);
  const [frequency, setFrequency] = useState(5);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  // Sync form when habit changes or modal opens
  useEffect(() => {
    if (isOpen) {
      if (habit) {
        setName(habit.name);
        setDescription(habit.description ?? '');
        setIcon(habit.icon);
        setColor(habit.color);
        setFrequency(habit.frequency);
      } else {
        setName('');
        setDescription('');
        setIcon('book');
        setColor(COLOR_OPTIONS[5].hex);
        setFrequency(5);
      }
      setMounted(true);
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), 200);
      return () => clearTimeout(t);
    }
  }, [isOpen, habit]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!mounted) return null;

  const canSave = name.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      icon,
      color,
      frequency,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop - fade */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
      />
      {/* Panel - scale + fade */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? 'Edit habit' : 'Create habit'}
        className={`relative w-full max-w-[480px] max-h-[90vh] overflow-auto bg-[#121214] border border-white/10 rounded-[20px] shadow-2xl p-6 flex flex-col gap-6 transition-all duration-200 ease-out ${visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white tracking-tight">
            {isEditing ? 'Edit Habit' : 'New Habit'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors active:scale-95"
          >
            <X size={16} />
          </button>
        </div>

        {/* Preview + Name */}
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 transition-colors duration-200"
            style={{ backgroundColor: `${color}14`, borderColor: `${color}30` }}
          >
            <IconRenderer iconName={icon} color={color} size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-medium text-zinc-400 mb-1">Habit Name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Morning Run"
              className="w-full bg-[#1c1c1e] border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10 transition-all text-sm"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description <span className="text-zinc-600 font-normal">(optional)</span></label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., 30 min jog before work"
            className="w-full bg-[#1c1c1e] border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10 transition-all text-sm"
          />
        </div>

        {/* Icon Picker */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-2.5">Icon</label>
          <div className="grid grid-cols-6 gap-2">
            {ICON_OPTIONS.map(({ name, Icon }) => {
              const selected = icon === name;
              return (
                <button
                  key={name}
                  onClick={() => setIcon(name)}
                  aria-label={`Select ${name} icon`}
                  aria-pressed={selected}
                  style={{
                    backgroundColor: selected ? `${color}14` : '#1c1c1e',
                    borderColor: selected ? color : 'rgba(255,255,255,0.06)',
                    color: selected ? color : '#a1a1aa',
                  }}
                  className="aspect-square rounded-xl border flex items-center justify-center transition-all duration-150 hover:border-white/15 active:scale-95"
                >
                  <Icon size={20} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Color Selector */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-2.5">Color</label>
          <div className="flex items-center gap-2.5 flex-wrap">
            {COLOR_OPTIONS.map((c) => {
              const selected = color === c.hex;
              return (
                <button
                  key={c.hex}
                  onClick={() => setColor(c.hex)}
                  aria-label={`Select ${c.name}`}
                  title={c.name}
                  style={{ backgroundColor: c.hex }}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150 active:scale-95 ${selected ? 'ring-2 ring-white ring-offset-2 ring-offset-[#121214] scale-110' : 'hover:scale-105 ring-1 ring-white/10'}`}
                >
                  {selected && <CheckCircle2 size={14} className="text-white drop-shadow" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Frequency Stepper */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-2.5">Target Frequency</label>
          <div className="flex items-center justify-between bg-[#1c1c1e] border border-white/10 rounded-xl px-3 py-3">
            <div>
              <p className="text-white font-medium text-sm">{frequency} days <span className="text-zinc-500 font-normal">/ week</span></p>
              <p className="text-xs text-zinc-500">How often you aim to complete this</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFrequency((f) => Math.max(1, f - 1))}
                aria-label="Decrease frequency"
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white transition-colors active:scale-95 disabled:opacity-30"
                disabled={frequency <= 1}
              >
                <Minus size={14} />
              </button>
              <span className="w-6 text-center text-white font-semibold text-sm">{frequency}</span>
              <button
                onClick={() => setFrequency((f) => Math.min(7, f + 1))}
                aria-label="Increase frequency"
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white transition-colors active:scale-95 disabled:opacity-30"
                disabled={frequency >= 7}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
          {/* Slider visual */}
          <div className="flex gap-1 mt-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="h-1.5 flex-1 rounded-full transition-colors duration-200"
                style={{ backgroundColor: i < frequency ? color : '#27272a' }}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-sm transition-colors active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            style={{ backgroundColor: canSave ? color : '#27272a', color: canSave ? '#09090b' : '#71717a' }}
            className="flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] disabled:cursor-not-allowed"
          >
            {isEditing ? 'Save Changes' : 'Create Habit'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HabitModal;


