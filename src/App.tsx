import React, { useState, useEffect } from 'react';
import { Plus, LayoutGrid, BarChart3, User, HardDrive } from 'lucide-react';
import HabitCard from './components/HabitCard';
import HabitModal from './components/HabitModal';
import AnalyticsView from './components/AnalyticsView';
import ProfileView from './components/ProfileView';
import { HabitProvider, useHabits } from './context/HabitContext';
import type { Habit } from './types';
import { Filesystem } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { requestNativeStoragePermission } from './utils/permissionUtils';

type Tab = 'dashboard' | 'analytics' | 'profile';

// Dashboard module - preserves right-anchored grids + long-press edit handlers
const DashboardView: React.FC<{
  onOpenCreate: () => void;
  onEdit: (h: Habit) => void;
}> = ({ onOpenCreate, onEdit }) => {
  const { habits, toggleCompletion, deleteHabit } = useHabits();
  return (
    <>
      <header className="max-w-2xl mx-auto mb-10 mt-4 md:mt-10 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-zinc-500 mt-2 text-sm">Track your daily progress.</p>
        </div>
        <button
          onClick={onOpenCreate}
          aria-label="Create new habit"
          className="w-10 h-10 rounded-full bg-white text-black hover:bg-zinc-200 flex items-center justify-center transition-all duration-150 active:scale-95 shadow-lg shrink-0 mt-1"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <Plus size={20} />
        </button>
      </header>

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
  const { addHabit, updateHabit } = useHabits();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [showBootPermissionModal, setShowBootPermissionModal] = useState(false);

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

  return (
    <div className="min-h-screen bg-[#000000] selection:bg-zinc-800 font-sans safe-pt" style={{ overscrollBehavior: 'none' }}>
      <div className="p-6 md:p-12 pb-0">
        {activeTab === 'dashboard' && (
          <DashboardView onOpenCreate={openCreate} onEdit={openEdit} />
        )}
        {activeTab === 'analytics' && <AnalyticsView />}
        {activeTab === 'profile' && <ProfileView />}
      </div>

      <BottomTabBar active={activeTab} onChange={setActiveTab} />

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
