import React, { useRef, useState, useCallback } from 'react';
import { Download, Upload, Trash2, ShieldAlert, HardDrive, Info } from 'lucide-react';
import { useHabits, STORAGE_KEY } from '../context/HabitContext';
import { sortCompletions } from '../utils/dateUtils';
import type { Habit } from '../types';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

function isValidHabit(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false;
  if (typeof obj.id !== 'string' || obj.id.trim() === '') return false;
  if (typeof obj.name !== 'string' || obj.name.trim() === '') return false;
  if (typeof obj.color !== 'string' || !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(obj.color)) return false;
  if (typeof obj.icon !== 'string' || obj.icon.trim() === '') return false;
  if (typeof obj.frequency !== 'number' || obj.frequency < 1 || obj.frequency > 7) return false;
  if (typeof obj.createdAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(obj.createdAt)) return false;
  if (!Array.isArray(obj.completions)) return false;
  if (!obj.completions.every((d: any) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))) return false;
  return true;
}

function normalizeHabit(raw: any): Habit {
  return {
    id: String(raw.id),
    name: String(raw.name),
    description: raw.description ? String(raw.description) : undefined,
    color: String(raw.color),
    icon: String(raw.icon),
    frequency: Math.min(7, Math.max(1, Number(raw.frequency))),
    createdAt: String(raw.createdAt),
    completions: sortCompletions([...new Set((raw.completions as string[]).filter((d: any) => typeof d === 'string'))]),
  };
}



const ProfileView: React.FC = () => {
  const { habits, setHabits } = useHabits();
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showCustomToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleExportBackup = async () => {
    const fileName = `habitmeter_backup_${new Date().toISOString().split('T')[0]}.json`;
    const jsonString = JSON.stringify(habits, null, 2);

    try {
      if (Capacitor.isNativePlatform()) {
        // 1. Write file to Cache directory
        await Filesystem.writeFile({
          path: fileName,
          data: jsonString,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });

        // 2. Resolve normalized FileProvider URI for Android
        const uriResult = await Filesystem.getUri({
          path: fileName,
          directory: Directory.Cache,
        });

        // 3. Trigger Native Share Sheet using the resolved URI
        await Share.share({
          title: 'HabitMeter Backup',
          dialogTitle: 'Export Backup File',
          files: [uriResult.uri],
        });

        showCustomToast('Export process initiated', 'success');
      } else {
        // Web Fallback
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showCustomToast('Backup file downloaded', 'success');
      }
    } catch (error: any) {
      console.error('Export Primary Failure:', error);
      
      // Ignore explicit user cancelations
      const errStr = JSON.stringify(error)?.toLowerCase() || '';
      if (errStr.includes('canceled') || errStr.includes('cancelled') || errStr.includes('dismissed')) {
        return;
      }

      // Secondary Fallback: Text-based Native Share
      try {
        if (Capacitor.isNativePlatform()) {
          await Share.share({
            title: 'HabitMeter Backup Data',
            text: jsonString,
            dialogTitle: 'Export Backup Data',
          });
          showCustomToast('Backup data shared as text', 'success');
          return;
        }
      } catch (fallbackErr) {
        console.error('Export Text Fallback Failure:', fallbackErr);
      }

      showCustomToast('Failed to export backup file.', 'error');
    }
  };

  // 2. Restored File Import Logic - hidden file input, schema validation, custom Toast
  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const parsedData = JSON.parse(content);

        // Validate basic habit schema array
        if (!Array.isArray(parsedData)) {
          throw new Error('Invalid schema: Root payload must be an array');
        }

        // Strict per-habit validation
        const invalid = parsedData.filter((h: any) => !isValidHabit(h));
        if (parsedData.length > 0 && invalid.length > 0) {
          throw new Error(`Invalid backup file structure. ${invalid.length} habit(s) malformed. Import aborted.`);
        }

        const normalized = parsedData.map(normalizeHabit);

        // Sync imported habits into context state
        setHabits(normalized);
        // Also ensure localStorage sync (context effect will also persist)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        showCustomToast('Backup data restored successfully', 'success');
      } catch (err) {
        console.error('Import validation error:', err);
        showCustomToast('Invalid backup file structure. Import aborted.', 'error');
      } finally {
        // Reset input value to allow re-uploading the same file if needed
        event.target.value = '';
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-160px)]">
      <div className="flex-1 overflow-auto -mx-6 md:-mx-12 px-6 md:px-12" style={{ WebkitOverflowScrolling: 'touch' as any }}>
        <div className="pt-4 md:pt-6 pb-6">
          <h1 className="text-3xl font-bold text-white tracking-tight">Profile</h1>
          <p className="text-zinc-500 mt-2 text-sm">Manage data and app settings.</p>
        </div>

        <div className="bg-black border border-neutral-900 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-900">
            <h2 className="text-xs font-semibold tracking-widest uppercase text-zinc-500">Data Management</h2>
          </div>

          {/* Row 1: Export Backup - Direct Cache (no permission needed on fresh install) */}
          <button
            onClick={handleExportBackup}
            className="w-full flex items-center gap-3 px-4 py-4 border-b border-neutral-900 hover:bg-white/[0.02] transition-colors text-left active:bg-white/[0.04]"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              <Download size={16} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm">Export Backup (JSON)</p>
              <p className="text-zinc-500 text-xs truncate">Save habits to file</p>
            </div>
            <span className="text-zinc-600 text-xs shrink-0">Export</span>
          </button>

          {/* Row 2: Import Backup - Direct file input (no permission needed) */}
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full flex items-center gap-3 px-4 py-4 border-b border-neutral-900 hover:bg-white/[0.02] transition-colors text-left active:bg-white/[0.04]"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              <Upload size={16} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm">Import Backup (JSON)</p>
              <p className="text-zinc-500 text-xs truncate">Restore from .json file</p>
            </div>
            <span className="text-zinc-600 text-xs shrink-0">Import</span>
          </button>
          <input ref={fileRef} type="file" accept=".json" id="import-file-input" onChange={handleFileImport} className="hidden" />

          {/* Row 3: Reset All Application Data */}
          <button
            onClick={() => setConfirmReset(true)}
            className="w-full flex items-center gap-3 px-4 py-4 hover:bg-red-500/[0.06] transition-colors text-left active:bg-red-500/10"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
              <Trash2 size={16} className="text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-red-400 font-medium text-sm">Reset All Application Data</p>
              <p className="text-zinc-500 text-xs truncate">Permanently delete all logs</p>
            </div>
            <span className="text-red-400/60 text-xs shrink-0">Reset</span>
          </button>
        </div>

        <div className="mt-6 bg-black border border-neutral-900 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-900">
            <h2 className="text-xs font-semibold tracking-widest uppercase text-zinc-500">About</h2>
          </div>
          <div className="px-4 py-4 flex items-center gap-3 border-b border-neutral-900">
            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              <Info size={16} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm">HabitMeter Mobile</p>
              <p className="text-zinc-500 text-xs">Pure AMOLED black experience</p>
            </div>
          </div>
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              <HardDrive size={16} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm">Storage</p>
              <p className="text-zinc-500 text-xs">Local persistence via habitmeter_data</p>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-black border border-neutral-900 rounded-2xl p-4">
          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-zinc-500"><span className="text-zinc-600">App Name:</span> <span className="text-white">HabitMeter Mobile</span></p>
            <p className="text-xs text-zinc-500"><span className="text-zinc-600">Build Version:</span> <span className="text-white">1.0.0 (Production Shell)</span></p>
            <p className="text-xs text-zinc-500 flex items-center gap-1.5">
              <span className="text-zinc-600">Storage Status:</span>
              <span className="text-white font-medium">[{habits.length}] Active Habits Tracked</span>
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-neutral-900 flex items-center gap-2 text-xs text-zinc-600">
            <ShieldAlert size={12} />
            <span>Data stays on device • No cloud sync</span>
          </div>
        </div>

        <div className="h-6" />
      </div>

      {/* Custom Toast - AMOLED black, neutral-800 border, fade+scale 3s */}
      {toast && (
        <div className="fixed bottom-28 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-auto z-50 flex justify-center pointer-events-none">
          <div className={`pointer-events-auto min-w-[280px] max-w-[90vw] md:max-w-md px-4 py-3 rounded-xl border shadow-2xl flex items-center gap-3 ${toast.type === 'success' ? 'bg-[#09090b] border-neutral-800' : 'bg-[#000000] border-neutral-800'}`}>
            <div className={`w-2 h-2 rounded-full shrink-0 ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
            <p className={`text-sm font-medium flex-1 ${toast.type === 'success' ? 'text-[#f4f4f5]' : 'text-[#f87171]'}`}>{toast.message}</p>
            <button onClick={() => setToast(null)} className="text-zinc-500 hover:text-white text-xs shrink-0">✕</button>
          </div>
        </div>
      )}

      {/* Factory Reset Confirmation - custom modal, zero alert() */}
      {confirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setConfirmReset(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-[#000000] border border-red-500/30 rounded-2xl p-5 shadow-2xl">
            <div className="w-10 h-10 rounded-full bg-red-500/15 border border-red-500/20 flex items-center justify-center mb-3">
              <Trash2 size={18} className="text-red-400" />
            </div>
            <h3 className="text-white font-semibold">Reset all data?</h3>
            <p className="text-sm text-zinc-400 mt-1 leading-relaxed">This will permanently delete all habits and completions. This cannot be undone. Type <span className="text-white font-mono">RESET</span> to confirm.</p>
            <input autoFocus value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="Type RESET" className="mt-3 w-full bg-[#1c1c1e] border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-500/30 text-sm" />
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setConfirmReset(false); setConfirmText(''); }} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium">Cancel</button>
              <button
                onClick={() => {
                  if (confirmText !== 'RESET') return;
                  localStorage.removeItem(STORAGE_KEY);
                  localStorage.removeItem('habitkit_clone_data');
                  setHabits([]);
                  setConfirmReset(false);
                  setConfirmText('');
                  showCustomToast('All data wiped', 'success');
                }}
                disabled={confirmText !== 'RESET'}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-semibold"
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

export default ProfileView;
