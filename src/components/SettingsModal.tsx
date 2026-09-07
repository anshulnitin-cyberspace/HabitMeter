import React, { useEffect, useRef, useState } from 'react';
import { Download, Upload, Trash2, ShieldAlert, X, FileJson, HardDrive } from 'lucide-react';
import { STORAGE_KEY, useHabits } from '../context/HabitContext';
import type { Habit } from '../types';
import { getLocalDateString, sortCompletions } from '../utils/dateUtils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function isValidHabit(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false;
  if (typeof obj.id !== 'string') return false;
  if (typeof obj.name !== 'string' || obj.name.trim() === '') return false;
  if (typeof obj.color !== 'string') return false;
  if (typeof obj.icon !== 'string') return false;
  if (typeof obj.frequency !== 'number' || obj.frequency < 1 || obj.frequency > 7) return false;
  if (typeof obj.createdAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(obj.createdAt)) return false;
  if (!Array.isArray(obj.completions)) return false;
  // each completion must be YYYY-MM-DD
  return obj.completions.every((d: any) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d));
}

function normalizeImportHabit(raw: any): Habit {
  const completions = sortCompletions([...new Set((raw.completions ?? []).filter((d: any) => typeof d === 'string'))] as string[]);
  return {
    id: String(raw.id),
    name: String(raw.name),
    description: raw.description ? String(raw.description) : undefined,
    color: String(raw.color),
    icon: String(raw.icon),
    frequency: Math.min(7, Math.max(1, Number(raw.frequency))),
    createdAt: String(raw.createdAt),
    completions,
  };
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { habits, setHabits } = useHabits();
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), 200);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !confirmReset) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, confirmReset]);

  if (!mounted) return null;

  const handleExport = () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      localDate: getLocalDateString(new Date()),
      count: habits.length,
      habits,
    };
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'habitmeter_backup.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    setImportSuccess(false);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      // Support both raw array and wrapped {habits:[]}
      const rawHabits: any[] = Array.isArray(parsed) ? parsed : Array.isArray(parsed.habits) ? parsed.habits : [];
      if (rawHabits.length === 0) throw new Error('No habits found in file.');
      // Validate all
      const invalid = rawHabits.filter((h) => !isValidHabit(h));
      if (invalid.length > 0) throw new Error(`Schema validation failed for ${invalid.length} habit(s). Each habit requires id, name, color, icon, frequency(1-7), createdAt(YYYY-MM-DD), completions(YYYY-MM-DD[]).`);
      const normalized = rawHabits.map(normalizeImportHabit);
      // Overwrite state + localStorage immediately via setHabits (effect will persist)
      setHabits(normalized);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      setImportSuccess(true);
      // reload trigger via state is immediate; no window.reload needed
      setTimeout(() => setImportSuccess(false), 2500);
    } catch (err: any) {
      setImportError(err?.message ?? 'Failed to parse backup file.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleClearAll = () => {
    if (confirmText !== 'RESET') return;
    localStorage.removeItem(STORAGE_KEY);
    // Empty state will be persisted by context effect; also force clear
    setHabits([]);
    setConfirmReset(false);
    setConfirmText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        onClick={() => !confirmReset && onClose()}
        className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Settings and Data Management"
        className={`relative w-full max-w-[520px] max-h-[90vh] overflow-auto bg-[#0a0a0a] border border-white/10 rounded-[20px] shadow-2xl flex flex-col transition-all duration-200 ease-out ${visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'}`}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#0a0a0a] p-6 pb-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <HardDrive size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white tracking-tight">Settings</h2>
              <p className="text-xs text-zinc-500">Backup & Data</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors active:scale-95"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6">
          {/* Info */}
          <div className="bg-[#1c1c1e] border border-white/5 rounded-xl p-3.5 flex items-start gap-3">
            <ShieldAlert size={16} className="text-zinc-400 mt-0.5 shrink-0" />
            <p className="text-xs leading-relaxed text-zinc-400">
              Data is stored locally under <span className="text-white font-mono">{STORAGE_KEY}</span>.
            </p>
          </div>

          {/* Export */}
          <div className="bg-[#121214] border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
                <Download size={16} className="text-emerald-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-white">Export Data (JSON)</h3>
                <p className="text-xs text-zinc-500">{habits.length} habits • Includes completions history</p>
              </div>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">Downloads <span className="text-white font-mono">habitmeter_backup.json</span> with all habit configs + historical completion dates (nicely formatted JSON).</p>
            <button
              onClick={handleExport}
              className="w-full py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-zinc-200 transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <FileJson size={16} /> Export habitmeter_backup.json
            </button>
          </div>

          {/* Import */}
          <div className="bg-[#121214] border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center">
                <Upload size={16} className="text-cyan-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-white">Import Data (JSON)</h3>
                <p className="text-xs text-zinc-500">Validates exact schema before merging</p>
              </div>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">Accepts a <span className="text-white font-mono">.json</span> backup. Validates <span className="font-mono">id/name/color/icon/frequency/createdAt/completions</span> and immediately reloads state on success.</p>
            <label className="w-full py-2.5 rounded-xl bg-[#1c1c1e] hover:bg-white/5 border border-white/10 text-white text-sm font-medium transition-colors active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer">
              <Upload size={16} /> Choose .json file
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>
            {importError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{importError}</p>}
            {importSuccess && <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">Import successful — habits reloaded.</p>}
          </div>

          {/* Clear */}
          <div className="bg-[#121214] border border-red-500/20 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/20 flex items-center justify-center">
                <Trash2 size={16} className="text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-400">Reset App — Clear All Data</h3>
                <p className="text-xs text-zinc-500">Wipes localStorage clean</p>
              </div>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">Highly visible destructive action. Opens strict confirmation before wiping <span className="font-mono text-white">{STORAGE_KEY}</span>.</p>
            <button
              onClick={() => setConfirmReset(true)}
              className="w-full py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors active:scale-[0.98]"
            >
              Reset App
            </button>
          </div>


        </div>
      </div>

      {/* Strict confirmation dialog */}
      {confirmReset && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div onClick={() => setConfirmReset(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-[#0a0a0a] border border-red-500/30 rounded-2xl p-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="w-10 h-10 rounded-full bg-red-500/15 border border-red-500/20 flex items-center justify-center mb-3">
              <Trash2 size={18} className="text-red-400" />
            </div>
            <h3 className="text-white font-semibold">Wipe all data?</h3>
            <p className="text-sm text-zinc-400 mt-1 leading-relaxed">This will permanently delete all habits and completions from this device. Type <span className="text-white font-mono">RESET</span> to confirm.</p>
            <input
              autoFocus
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type RESET"
              className="mt-3 w-full bg-[#1c1c1e] border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-500/30 text-sm"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setConfirmReset(false); setConfirmText(''); }} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium transition-colors active:scale-[0.98]">Cancel</button>
              <button
                onClick={handleClearAll}
                disabled={confirmText !== 'RESET'}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors active:scale-[0.98]"
              >
                Confirm Wipe
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsModal;


