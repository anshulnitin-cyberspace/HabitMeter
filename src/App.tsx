import React, { useState, useEffect } from 'react';
import { Plus, Search, LayoutGrid, BarChart3, User, HardDrive } from 'lucide-react';
import HabitCard from './components/HabitCard';
import HabitCardSkeleton from './components/HabitCardSkeleton';
import HabitModal from './components/HabitModal';
import AnalyticsView from './components/AnalyticsView';
import ProfileView from './components/ProfileView';
import CommandPalette from './components/CommandPalette';
import { HabitProvider, useHabits } from './context/HabitContext';
import type { Habit } from './types';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { requestNativeStoragePermission } from './utils/permissionUtils';

type Tab = 'dashboard' | 'analytics' | 'profile';

// Dashboard module - preserves right-anchored grids + long-press edit handlers
const DashboardView: React.FC<{
  onOpenCreate: () => void;
  onOpenCommandPalette: () => void;
  onEdit: (h: Habit) => void;
}> = ({ onOpenCreate, onOpenCommandPalette, onEdit }) => {
  const { habits, isLoading, toggleCompletion, deleteHabit, markAllComplete, markAllIncomplete } = useHabits();
  // Pull down to search gesture
  const pullStartY = React.useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) pullStartY.current = e.touches[0].clientY;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (pullStartY.current !== null && e.touches[0].clientY - pullStartY.current > 60) {
      pullStartY.current = null;
      onOpenCommandPalette();
    }
  };
  const handleTouchEnd = () => { pullStartY.current = null; };
  if (isLoading) {
    return (
      <>
        <header className="max-w-2xl mx-auto mb-10 mt-4 md:mt-10 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
            <p className="text-zinc-500 mt-2 text-sm">Track your daily progress.</p>
            <p className="text-zinc-600 mt-1 text-xs">(Long-press card to edit history • Tap icon to toggle Today)</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#1c1c1e] animate-pulse shrink-0 mt-1" />
        </header>
        <main className="flex flex-col gap-6 max-w-2xl mx-auto pb-24">
          {Array.from({ length: 3 }).map((_, i) => (
            <HabitCardSkeleton key={i} />
          ))}
        </main>
      </>
    );
  }
  return (
    <>
      <header
        className="max-w-2xl mx-auto mb-10 mt-4 md:mt-10 flex items-start justify-between gap-4"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-zinc-500 mt-2 text-sm">Track your daily progress.</p>
          <p className="text-zinc-600 mt-1 text-xs">(Long-press card to edit history • Tap icon to toggle Today)</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-1">
          <button
            onClick={onOpenCommandPalette}
            aria-label="Open command palette"
            className="w-10 h-10 rounded-full bg-[#1c1c1e] border border-white/10 text-white hover:bg-white/10 flex items-center justify-center transition-all active:scale-95"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <Search size={18} />
          </button>
          <button
            onClick={onOpenCreate}
            aria-label="Create new habit"
            className="w-10 h-10 rounded-full bg-white text-black hover:bg-zinc-200 flex items-center justify-center transition-all duration-150 active:scale-95 shadow-lg"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <Plus size={20} />
          </button>
        </div>
      </header>

      {habits.length > 0 && (
        <div className="max-w-2xl mx-auto mb-4 flex gap-2">
          <button
            onClick={markAllComplete}
            className="flex-1 py-2.5 rounded-xl bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors active:scale-95 flex items-center justify-center gap-1.5"
          >
            ✓ Mark all complete
          </button>
          <button
            onClick={markAllIncomplete}
            className="flex-1 py-2.5 rounded-xl bg-[#1c1c1e] border border-white/10 text-white text-sm font-medium hover:bg-white/10 transition-colors active:scale-95 flex items-center justify-center gap-1.5"
          >
            ✕ Mark all incomplete
          </button>
        </div>
      )}

      <main className="flex flex-col gap-6 max-w-2xl mx-auto pb-24">
        {habits.map((habit) => (
          <HabitCard
            key={habit.id}
            habit={habit}
            onToggleDate={toggleCompletion}
            onEdit={onEdit}
            onDelete={deleteHabit}
          />
        ))}
        {habits.length === 0 && (
          <div className="text-center mt-10 flex flex-col items-center gap-3">
            <p className="text-zinc-500">No habits yet. Add one to get started.</p>
            <button
              onClick={onOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors active:scale-95"
            >
              <Plus size={16} /> New Habit
            </button>
          </div>
        )}
      </main>
    </>
  );
};





// Fixed Bottom Tab Bar - locked to AMOLED black
const BottomTabBar: React.FC<{ active: Tab; onChange: (t: Tab) => void }> = ({ active, onChange }) => {
  const tabs: { id: Tab; label: string; Icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Dashboard', Icon: LayoutGrid },
    { id: 'analytics', label: 'Analytics', Icon: BarChart3 },
    { id: 'profile', label: 'Profile', Icon: User },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#000000] border-t border-neutral-900 flex z-40 pb-[env(safe-area-inset-bottom,20px)]">
      {tabs.map(({ id, label, Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-3.5 transition-colors active:scale-95"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <Icon size={22} className={isActive ? 'text-white' : 'text-[#4b5563]'} />
            <span className={`text-[10px] font-medium tracking-wide ${isActive ? 'text-white' : 'text-[#4b5563]'}`}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
};

const AppShell: React.FC = () => {
  const { habits, setHabits, addHabit, updateHabit } = useHabits();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [showBootPermissionModal, setShowBootPermissionModal] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const importFileRef = React.useRef<HTMLInputElement>(null);
  const [toast, setToast] = React.useState<{message:string;type:'success'|'error'}|null>(null);
  const showToast = (m:string,t:'success'|'error')=>{ setToast({message:m,type:t}); setTimeout(()=>setToast(null),3000); };

  const openCreate = () => { setEditingHabit(null); setModalOpen(true); };
  const openEdit = (h: Habit) => { setEditingHabit(h); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditingHabit(null); };
  const handleSave = (data: { name: string; description?: string; icon: string; color: string; frequency: number }) => {
    if (editingHabit) updateHabit(editingHabit.id, data);
    else addHabit(data);
  };

  useEffect(() => {
    const checkBootPermissions = async () => {
      if (!Capacitor.isNativePlatform()) return;
      const status = await Filesystem.checkPermissions();
      if (status.publicStorage !== 'granted') {
        setShowBootPermissionModal(true);
      }
    };
    checkBootPermissions();
  }, []);

  const handleFirstLaunchGrant = async () => {
    setShowBootPermissionModal(false);
    await requestNativeStoragePermission();
  };

  const handleFirstLaunchDismiss = () => {
    setShowBootPermissionModal(false);
  };

  const handlePaletteExport = async () => {
    const fileName = `habitmeter_backup_${new Date().toISOString().split('T')[0]}.json`;
    const jsonString = JSON.stringify(habits, null, 2);
    try {
      if (Capacitor.isNativePlatform()) {
        await Filesystem.writeFile({ path: fileName, data: jsonString, directory: Directory.Cache, encoding: Encoding.UTF8 });
        const uriResult = await Filesystem.getUri({ path: fileName, directory: Directory.Cache });
        await Share.share({ title: 'HabitMeter Backup', dialogTitle: 'Export Backup File', files: [uriResult.uri] });
        showToast('Export process initiated', 'success');
      } else {
        const blob = new Blob([jsonString], {type:'application/json'});
        const url = URL.createObjectURL(blob);
        const a=document.createElement('a'); a.href=url; a.download=fileName;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        showToast('Backup file downloaded', 'success');
      }
    } catch (e:any) {
      const errStr = JSON.stringify(e)?.toLowerCase()||'';
      if (errStr.includes('canceled')||errStr.includes('cancelled')||errStr.includes('dismissed')) return;
      try {
        if (Capacitor.isNativePlatform()) {
          await Share.share({ title: 'HabitMeter Backup Data', text: jsonString, dialogTitle: 'Export Backup Data' });
          showToast('Backup data shared as text', 'success'); return;
        }
      } catch {}
      showToast('Failed to export backup file.', 'error');
    }
  };

  const handlePaletteImport = () => { importFileRef.current?.click(); };
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const content = ev.target?.result as string;
        const parsed = JSON.parse(content, (k,v)=> k==='__proto__'||k==='constructor'||k==='prototype'?undefined:v);
        if (!Array.isArray(parsed)) throw new Error('Invalid schema');
        const tight = parsed.filter((h:any)=> h && typeof h.id==='string' && typeof h.name==='string' && typeof h.createdAt==='string');
        if (parsed.length>0 && tight.length===0) throw new Error('Invalid backup');
        setHabits(tight);
        localStorage.setItem('habitmeter_data', JSON.stringify(tight));
        showToast('Backup restored successfully!', 'success');
      } catch (err) { showToast('Invalid backup file. Import failed.', 'error'); }
      finally { e.target.value = ''; }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-[#000000] selection:bg-zinc-800 font-sans safe-pt" style={{ overscrollBehavior: 'none' }}>
      <div className="p-6 md:p-12 pb-0">
        {activeTab === 'dashboard' && (
          <DashboardView onOpenCreate={openCreate} onOpenCommandPalette={() => setIsCommandPaletteOpen(true)} onEdit={openEdit} />
        )}
        {activeTab === 'analytics' && <AnalyticsView />}
        {activeTab === 'profile' && <ProfileView />}
      </div>

      <BottomTabBar active={activeTab} onChange={setActiveTab} />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onCreateHabit={openCreate}
        onExportBackup={handlePaletteExport}
        onImportBackup={handlePaletteImport}
        onNavigate={(tab) => setActiveTab(tab)}
      />
      <input ref={importFileRef} type="file" accept=".json" id="import-file-input" onChange={handleFileImport} className="hidden" />
      {toast && (
        <div className="fixed bottom-28 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 z-50 flex justify-center pointer-events-none">
          <div className={`pointer-events-auto min-w-[280px] px-4 py-3 rounded-xl border shadow-2xl flex items-center gap-3 ${toast.type==='success'?'bg-[#09090b] border-neutral-800':'bg-[#000000] border-neutral-800'}`}>
            <div className={`w-2 h-2 rounded-full ${toast.type==='success'?'bg-emerald-500':'bg-red-500'}`} />
            <p className={`text-sm font-medium flex-1 ${toast.type==='success'?'text-[#f4f4f5]':'text-[#f87171]'}`}>{toast.message}</p>
            <button onClick={()=>setToast(null)} className="text-zinc-500 text-xs">✕</button>
          </div>
        </div>
      )}

      <HabitModal isOpen={modalOpen} onClose={closeModal} onSave={handleSave} habit={editingHabit} />

      {showBootPermissionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleFirstLaunchDismiss} />
          <div className="relative w-full max-w-sm bg-[#000000] border border-neutral-900 rounded-2xl p-5 shadow-2xl">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-3">
              <HardDrive size={18} className="text-white" />
            </div>
            <h3 className="text-white font-semibold">Storage Access</h3>
            <p className="text-sm text-zinc-400 mt-2 leading-relaxed">HabitMeter needs storage access to save and restore your local habit tracking backups directly to your device.</p>
            <div className="h-px bg-neutral-900 my-4" />
            <div className="flex gap-3">
              <button onClick={handleFirstLaunchDismiss} className="flex-1 py-2.5 rounded-xl bg-[#18181b] hover:bg-white/10 border border-neutral-800 text-white text-sm font-medium transition-colors">Not Now</button>
              <button onClick={handleFirstLaunchGrant} className="flex-1 py-2.5 rounded-xl bg-white text-black hover:bg-zinc-200 text-sm font-semibold transition-colors">Grant Access</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => (
  <HabitProvider>
    <AppShell />
  </HabitProvider>
);

export default App;


