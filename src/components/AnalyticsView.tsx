import React, { useEffect, useMemo, useRef } from 'react';
import { Trophy, Target, Flame, CalendarDays, BarChart3 } from 'lucide-react';
import { useHabits } from '../context/HabitContext';
import { getCurrentStreak, getCompletionRate } from '../utils/habitMath';
import { getTodayString, getCalendarDaysElapsed, toLocalDateString } from '../utils/dateUtils';
import { ICON_OPTIONS } from './HabitModal';
import { BookOpen, Dumbbell } from 'lucide-react';

const IconRenderer = ({ iconName, color, size = 20 }: { iconName: string; color: string; size?: number }) => {
  const found = ICON_OPTIONS.find((o) => o.name === iconName);
  if (found) {
    const C = found.Icon;
    return <C size={size} color={color} />;
  }
  switch (iconName) {
    case 'book': return <BookOpen size={size} color={color} />;
    case 'dumbbell': return <Dumbbell size={size} color={color} />;
    default: return <BookOpen size={size} color={color} />;
  }
};

/** Single source consistency - delegates to habitMath's unified formula with toLocalDateString + T00:00:00 */
export function getIndividualConsistency(habit: { completions: string[]; createdAt: string }, todayStr: string = getTodayString()): number {
  return getCompletionRate(habit.completions, habit.createdAt, todayStr);
}

export function getGlobalConsistency(habits: { completions: string[]; createdAt: string }[], todayStr: string = getTodayString()): number {
  if (habits.length === 0) return 0;
  const sum = habits.reduce((acc, h) => acc + getIndividualConsistency(h, todayStr), 0);
  return sum / habits.length;
}

const AnalyticsView: React.FC = () => {
  const { habits } = useHabits();
  const heatmapRef = useRef<HTMLDivElement>(null);

  // Card A: Global Total
  const totalCompletions = useMemo(() => habits.reduce((acc, h) => acc + h.completions.length, 0), [habits]);

  // Card B: Consistency Ring — DST-proof via getCalendarDaysElapsed (V-1/V-2) + defensive clamp (V-5/V-6)
  const globalConsistency = useMemo(() => {
    if (habits.length === 0) return 0;
    const todayStr = toLocalDateString(new Date());

    const totalPercentages = habits.map(habit => {
      const daysElapsed = getCalendarDaysElapsed(habit.createdAt, todayStr);
      const safeDays = daysElapsed <= 0 ? 1 : daysElapsed; // tampering fallback (V-5)
      const trackableDaysCount = Math.min(14, safeDays);

      // 2. Filter completions down to only those within this 14-day window
      const validCompletionsInWindow = habit.completions.filter(dateStr => {
        const [year, month, day] = dateStr.split('-').map(Number);
        const compDate = new Date(year, month - 1, day);
        const todayDate = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
        const diffDays = Math.floor((todayDate.getTime() - compDate.getTime()) / (1000 * 60 * 60 * 24));
        
        return diffDays >= 0 && diffDays < 14 && dateStr >= habit.createdAt;
      }).length;

      // 3. Return the exact percentage matching the individual card layout
      return Math.round((validCompletionsInWindow / trackableDaysCount) * 100);
    });

    // 4. Find the true global average across all active habits combined
    const sum = totalPercentages.reduce((acc, pct) => acc + pct, 0);
    return Math.round(sum / habits.length);
  }, [habits]);

  // Card D: Most Consistent Habit - handles ties
  const leadingHabits = useMemo(() => {
    if (habits.length === 0) return [];
    const withStreak = habits.map((h) => ({ habit: h, streak: getCurrentStreak(h.completions) }));
    const maxStreak = Math.max(...withStreak.map((x) => x.streak));
    return withStreak.filter((x) => x.streak === maxStreak);
  }, [habits]);

  // Card C: Heatmap data - 140 days continuous, today far right
  const { dates, countMap } = useMemo(() => {
    const todayStr = getTodayString();
    const today = new Date();
    const datesArr: string[] = Array.from({ length: 140 }).map((_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (139 - i));
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    });
    const map = new Map<string, number>();
    for (const ds of datesArr) map.set(ds, 0);
    for (const h of habits) {
      for (const ds of h.completions) {
        if (map.has(ds)) map.set(ds, (map.get(ds) ?? 0) + 1);
      }
    }
    // Ensure today is included even if 140 window shifts
    if (!map.has(todayStr)) map.set(todayStr, habits.filter(h=>h.completions.includes(todayStr)).length);
    return { dates: datesArr, countMap: map };
  }, [habits]);

  // Auto scroll heatmap to far right (Today)
  useEffect(() => {
    const el = heatmapRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [habits]);

  useEffect(() => {
    const el = heatmapRef.current;
    if (!el) return;
    el.scrollLeft = el.scrollWidth;
    const onFocus = () => { if (heatmapRef.current) heatmapRef.current.scrollLeft = heatmapRef.current.scrollWidth; };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState==='visible') onFocus(); });
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  return (
    <div className="max-w-2xl mx-auto pt-4 md:pt-6 pb-28 px-0 md:px-0 flex flex-col gap-6">
      {/* Header */}
      <div className="px-6 md:px-0">
        <h1 className="text-3xl font-bold text-white tracking-tight">Analytics</h1>
        <p className="text-zinc-500 mt-2 text-sm">Your consistency across all habits.</p>
      </div>

      {/* Card A: Global Total Completions - minimalist */}
      <div className="mx-6 md:mx-0 bg-[#09090b] border border-neutral-900 rounded-2xl p-6">
        <div className="flex items-center gap-2 text-zinc-500 text-xs tracking-widest uppercase font-medium">
          <CalendarDays size={14} /> Global Total
        </div>
        <p className="text-5xl font-extrabold text-white tracking-tight mt-3">{totalCompletions}</p>
        <p className="text-zinc-400 text-sm mt-1">Total Completions</p>
      </div>

      {/* Card B: Consistency Ring */}
      <div className="mx-6 md:mx-0 bg-[#09090b] border border-neutral-900 rounded-2xl p-6">
        <div className="flex items-center gap-2 text-zinc-500 text-xs tracking-widest uppercase font-medium">
          <Target size={14} /> Consistency
        </div>
        <p className="text-4xl font-bold text-white mt-3">{globalConsistency}<span className="text-zinc-500 text-2xl font-normal">%</span></p>
        <p className="text-zinc-500 text-xs mt-1">Overall completion rate</p>
        <div className="mt-4 h-2 w-full bg-[#1c1c1e] rounded-full overflow-hidden border border-white/5">
          <div
            className="h-full bg-gradient-to-r from-zinc-300 to-white rounded-full transition-all duration-700 ease-out"
            style={{ width: `${Math.min(100, globalConsistency)}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-zinc-600 mt-2">
          <span>0%</span><span>50%</span><span>100%</span>
        </div>
      </div>

      {/* Card C: Global Contribution Heatmap */}
      <div className="mx-6 md:mx-0 bg-[#09090b] border border-neutral-900 rounded-2xl p-6">
        <div className="flex items-center gap-2 text-zinc-500 text-xs tracking-widest uppercase font-medium mb-4">
          <BarChart3 size={14} /> Global Heatmap
        </div>
        <p className="text-white font-semibold text-sm">Unified contributions</p>
        <p className="text-zinc-500 text-xs mb-3">Percentage of active habits completed • 0%→ empty, 25%→ charcoal, 50%→ gray, 75%→ light, 100%→ white</p>
        <div ref={heatmapRef} className="overflow-x-auto scrollbar-hide scroll-smooth pb-2">
          <div className="grid grid-rows-7 grid-flow-col gap-1.5 min-w-max">
            {dates.map((ds) => {
              const count = countMap.get(ds) ?? 0;
              const totalActive = habits.length;
              const ratio = totalActive > 0 ? count / totalActive : 0;
              let bg = '#1C1C1E';
              let shadow = 'none';
              if (ratio === 1) { bg = '#FFFFFF'; shadow = '0 0 8px rgba(255,255,255,0.65)'; }
              else if (ratio >= 0.75) { bg = '#D1D5DB'; } // light gray
              else if (ratio >= 0.5) { bg = '#9CA3AF'; } // medium gray
              else if (ratio >= 0.25) { bg = '#4B5563'; } // charcoal
              else { bg = '#1C1C1E'; }
              const pct = Math.round(ratio * 100);
              return (
                <div
                  key={ds}
                  title={`${ds} • ${count}/${totalActive} (${pct}%)`}
                  style={{ backgroundColor: bg, boxShadow: shadow }}
                  className="w-[14px] h-[14px] rounded-[3px] transition-colors"
                  aria-label={`${ds} ${count} of ${totalActive} habits ${pct}%`}
                />
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 text-[11px] text-zinc-600">
          <span>0%</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-[3px]" style={{ backgroundColor: '#1C1C1E' }} title="0%" />
            <div className="w-3 h-3 rounded-[3px]" style={{ backgroundColor: '#4B5563' }} title="25-49%" />
            <div className="w-3 h-3 rounded-[3px]" style={{ backgroundColor: '#9CA3AF' }} title="50-74%" />
            <div className="w-3 h-3 rounded-[3px]" style={{ backgroundColor: '#D1D5DB' }} title="75-99%" />
            <div className="w-3 h-3 rounded-[3px] bg-white" title="100%" />
          </div>
          <span>100%</span>
          <span className="ml-auto hidden sm:inline text-zinc-500">Today far right →</span>
        </div>
      </div>

      {/* Card D: Most Consistent Habit - stacked list for ties */}
      <div className="mx-6 md:mx-0 bg-[#09090b] border border-neutral-900 rounded-2xl p-6">
        <div className="flex items-center gap-2 text-zinc-500 text-xs tracking-widest uppercase font-medium mb-4">
          <Trophy size={14} className="text-amber-500" /> Most Consistent
          {leadingHabits.length > 1 && <span className="ml-auto text-[11px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-zinc-400">{leadingHabits.length} tied</span>}
        </div>
        {leadingHabits.length > 0 ? (
          <div className="flex flex-col gap-3">
            {leadingHabits.map(({ habit, streak }) => (
              <div key={habit.id} className="flex items-center gap-4 p-3 rounded-xl bg-[#121214] border border-white/5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center border shrink-0" style={{ backgroundColor: `${habit.color}14`, borderColor: `${habit.color}30` }}>
                  <IconRenderer iconName={habit.icon} color={habit.color} size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white font-medium truncate">{habit.name}</p>
                  <p className="text-zinc-400 text-sm flex items-center gap-1.5">
                    <Flame size={14} className="text-orange-400" /> Leading with a {streak}-day streak!
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-white font-bold text-sm">{streak}d</p>
                  <p className="text-zinc-500 text-xs">{habit.completions.length} total</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-zinc-500 text-sm">No habits yet — create one to see your leaders.</p>
        )}
      </div>
    </div>
  );
};

export default AnalyticsView;


