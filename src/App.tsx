import React, { useState } from 'react';
import { Plus, Settings2 } from 'lucide-react';
import HabitCard from './components/HabitCard';
import HabitModal from './components/HabitModal';
import SettingsModal from './components/SettingsModal';
import { HabitProvider, useHabits } from './context/HabitContext';
import type { Habit } from './types';

const Dashboard: React.FC = () => {
  const { habits, toggleCompletion, addHabit, updateHabit, deleteHabit } = useHabits();
  const [modalOpen, setModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  const openCreate = () => {
    setEditingHabit(null);
    setModalOpen(true);
  };
  const openEdit = (habit: Habit) => {
    setEditingHabit(habit);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setEditingHabit(null);
  };

  const handleSave = (data: { name: string; description?: string; icon: string; color: string; frequency: number }) => {
    if (editingHabit) {
      updateHabit(editingHabit.id, data);
    } else {
      addHabit(data);
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] selection:bg-zinc-800 font-sans p-6 md:p-12 safe-pt safe-pb" style={{ overscrollBehavior: 'none' }}>
      <header className="max-w-2xl mx-auto mb-10 mt-4 md:mt-10 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-zinc-500 mt-2 text-sm">Track your daily progress.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-1">
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings and backup"
            className="w-10 h-10 rounded-full bg-[#1c1c1e] border border-white/10 text-white hover:bg-white/10 flex items-center justify-center transition-all duration-150 active:scale-95"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <Settings2 size={18} />
          </button>
          <button
            onClick={openCreate}
            aria-label="Create new habit"
            className="w-10 h-10 rounded-full bg-white text-black hover:bg-zinc-200 flex items-center justify-center transition-all duration-150 active:scale-95 shadow-lg"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <Plus size={20} />
          </button>
        </div>
      </header>

      <main className="flex flex-col gap-6 max-w-2xl mx-auto">
        {habits.map((habit) => (
          <HabitCard
            key={habit.id}
            habit={habit}
            onToggleDate={toggleCompletion}
            onEdit={openEdit}
            onDelete={deleteHabit}
          />
        ))}
        {habits.length === 0 && (
          <div className="text-center mt-10 flex flex-col items-center gap-3">
            <p className="text-zinc-500">No habits yet. Add one to get started.</p>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors active:scale-95"
            >
              <Plus size={16} /> New Habit
            </button>
          </div>
        )}
      </main>

      <HabitModal
        isOpen={modalOpen}
        onClose={closeModal}
        onSave={handleSave}
        habit={editingHabit}
      />

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <HabitProvider>
      <Dashboard />
    </HabitProvider>
  );
};

export default App;
