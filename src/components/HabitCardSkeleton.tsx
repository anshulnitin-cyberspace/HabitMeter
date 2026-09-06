import React from 'react';

const HabitCardSkeleton: React.FC = () => {
  return (
    <div className="bg-[#121214] border border-neutral-900 rounded-2xl p-5 shadow-lg w-full max-w-2xl mx-auto flex flex-col gap-4 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#1c1c1e] shrink-0" />
          <div className="flex flex-col gap-2 min-w-0">
            <div className="h-4 w-32 bg-[#1c1c1e] rounded" />
            <div className="h-3 w-40 bg-[#1c1c1e] rounded" />
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-4">
          <div className="flex flex-col gap-2 items-end">
            <div className="h-4 w-20 bg-[#1c1c1e] rounded" />
            <div className="h-3 w-16 bg-[#1c1c1e] rounded" />
          </div>
          <div className="h-10 w-px bg-neutral-900" />
          <div className="h-6 w-12 bg-[#1c1c1e] rounded" />
        </div>
      </div>

      {/* Mobile stats skeleton */}
      <div className="flex sm:hidden gap-2">
        <div className="h-6 w-20 bg-[#1c1c1e] rounded-full" />
        <div className="h-6 w-16 bg-[#1c1c1e] rounded-full" />
        <div className="h-6 w-12 bg-[#1c1c1e] rounded-full" />
      </div>

      {/* Grid skeleton - 7 rows x 20 cols */}
      <div className="mt-1 overflow-hidden">
        <div className="grid grid-rows-7 grid-flow-col gap-[2px] min-w-max">
          {Array.from({ length: 140 }).map((_, i) => (
            <div
              key={i}
              className="w-[14px] h-[14px] rounded-[3px] bg-[#1c1c1e]"
              style={{ opacity: 0.3 + (Math.random() * 0.4) }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default HabitCardSkeleton;
