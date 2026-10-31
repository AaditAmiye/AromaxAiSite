import React, { useState } from 'react';
import { THERAPY_PROGRAMS } from '../../data/therapy';
import { TherapyCategory, TherapyProgram } from '../../types/therapy';
import { useActiveSession } from '../../hooks/useActiveSession';
import { useCartridges } from '../../hooks/useCartridges';
import { CHANNEL_MAP } from '../../data/aromas';

interface TherapyScreenProps {
  onOpenLiveSession: () => void;
}

export const TherapyScreen: React.FC<TherapyScreenProps> = ({ onOpenLiveSession }) => {
  const { startSession, active: isSessionActive } = useActiveSession();
  const { channelMap } = useCartridges();
  const [selectedCategory, setSelectedCategory] = useState<TherapyCategory | 'All'>('All');
  const [selectedProgram, setSelectedProgram] = useState<TherapyProgram>(THERAPY_PROGRAMS[0]);

  const categories: (TherapyCategory | 'All')[] = [
    'All',
    'Relaxation',
    'Sleep',
    'Focus',
    'Meditation'
  ];

  const filtered = selectedCategory === 'All'
    ? THERAPY_PROGRAMS
    : THERAPY_PROGRAMS.filter((p) => p.category === selectedCategory);

  const handleStartProgram = async (program: TherapyProgram) => {
    const firstStage = program.stages[0];
    await startSession({
      experienceId: program.id,
      title: program.title,
      type: 'therapy',
      channels: firstStage.channels,
      durationSeconds: firstStage.durationSeconds,
      light: firstStage.light,
      batchId: `#TH-${Math.floor(1000 + Math.random() * 9000)}`,
      profileName: `${program.category} Guided Sequence`,
      stages: program.stages
    });
  };

  return (
    <div className="flex flex-col gap-6 py-2 max-w-lg mx-auto w-full">
      {/* Title */}
      <div className="pt-2 flex flex-col gap-1.5 px-1">
        <div className="inline-flex items-center gap-2 self-start px-2.5 py-1 rounded-full bg-[#F5F5F7] dark:bg-zinc-800 border border-black/[0.04] dark:border-white/10 text-[#86868B] dark:text-[#A1A1AA] text-[11px] font-medium tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          Guided Olfactory Wellbeing
        </div>
        <h1 className="text-[32px] leading-tight font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F4F4F5]">
          Sensory Therapy
        </h1>
        <p className="text-[15px] leading-snug text-[#86868B] dark:text-[#A1A1AA] font-normal">
          Multi-stage timed diffusion programs designed for relaxation, focus, and circadian alignment.
        </p>
      </div>

      {/* Category Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar -mx-4 px-4">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === cat
                ? 'bg-emerald-600 dark:bg-zinc-800 text-white shadow-[0_4px_14px_rgba(16,185,129,0.3)] ring-1 ring-white/10'
                : 'bg-white/60 dark:bg-zinc-800/80 backdrop-blur-md text-[#86868B] dark:text-[#A1A1AA] hover:text-[#1D1D1F] dark:hover:text-white border border-white/70 dark:border-white/10 shadow-2xs'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Active Selected Hero Program */}
      <div className="ios-glass-card rounded-[34px] p-6 ring-1 ring-black/[0.03] dark:ring-white/10 flex flex-col gap-5">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              {selectedProgram.category} • {selectedProgram.durationMinutes} Minutes
            </span>
            <h2 className="text-[22px] font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F4F4F5] mt-0.5">
              {selectedProgram.title}
            </h2>
          </div>
          <span className="bg-white/60 dark:bg-zinc-800/80 backdrop-blur-md text-[#1D1D1F] dark:text-[#F4F4F5] text-[11px] font-semibold px-2.5 py-1 rounded-full border border-white/80 dark:border-white/10 shadow-2xs">
            {selectedProgram.badge || 'Program'}
          </span>
        </div>

        <p className="text-[13.5px] text-[#86868B] dark:text-[#A1A1AA] leading-relaxed">
          {selectedProgram.shortDescription}
        </p>

        {/* Multi-stage Timeline Breakdown */}
        <div className="flex flex-col gap-3 pt-1">
          <span className="text-[12px] font-semibold text-[#86868B] dark:text-[#A1A1AA] uppercase tracking-wider">
            Automated Stage Progression ({selectedProgram.stages.length} Stages)
          </span>

          <div className="space-y-2.5">
            {selectedProgram.stages.map((stg) => (
              <div
                key={stg.stageNumber}
                className="p-3.5 rounded-2xl bg-white/50 dark:bg-zinc-800/80 backdrop-blur-md border border-white/70 dark:border-white/10 shadow-2xs flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between text-[13px]">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-white/90 dark:bg-zinc-700 text-[#1D1D1F] dark:text-white text-[11px] font-bold flex items-center justify-center shadow-xs border border-white dark:border-white/10">
                      {stg.stageNumber}
                    </span>
                    <span className="font-semibold text-[#1D1D1F] dark:text-[#F4F4F5]">{stg.title}</span>
                  </div>
                  <span className="text-[12px] font-mono text-[#86868B] dark:text-[#A1A1AA]">
                    {Math.round(stg.durationSeconds / 60)} min
                  </span>
                </div>

                <p className="text-[12px] text-[#86868B] dark:text-[#A1A1AA] pl-7">{stg.description}</p>

                <div className="flex flex-wrap gap-1.5 pl-7 pt-1">
                  {stg.channels.map((ch) => {
                    const def = channelMap[ch.channelId] || CHANNEL_MAP[ch.channelId];
                    return (
                      <span
                        key={ch.channelId}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/80 dark:bg-zinc-700/80 backdrop-blur-sm text-[11px] font-medium text-[#1D1D1F] dark:text-[#F4F4F5] border border-white/80 dark:border-white/10 shadow-2xs"
                      >
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{ch.channelId}</span>
                        <span>{def?.name || ch.channelId}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={() => handleStartProgram(selectedProgram)}
          className="w-full ios-liquid-btn-emerald active:scale-[0.97] text-white font-medium text-[15px] h-13 py-3.5 rounded-full flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(16,185,129,0.35)] ring-1 ring-white/20 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px] relative z-10">play_circle</span>
          <span className="relative z-10">
            {isSessionActive
              ? `Switch to ${selectedProgram.title}`
              : `Begin ${selectedProgram.title}`}
          </span>
        </button>
      </div>

      {/* Program Catalog Grid */}
      <div className="flex flex-col gap-3">
        <h3 className="text-[17px] font-semibold text-[#1D1D1F] dark:text-[#F4F4F5] px-1">Program Library</h3>
        <div className="grid grid-cols-1 gap-3">
          {filtered.map((prog) => {
            const isSelected = prog.id === selectedProgram.id;
            return (
              <div
                key={prog.id}
                onClick={() => setSelectedProgram(prog)}
                className={`p-4 rounded-[30px] ios-glass-card transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'border-emerald-500/50 dark:border-white/30 shadow-sm ring-1 ring-emerald-500/20 dark:ring-white/20'
                    : 'hover:bg-white/85 dark:hover:bg-zinc-800/80'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md border border-white/80 dark:border-white/10 shadow-xs flex items-center justify-center text-[#1D1D1F] dark:text-[#F4F4F5] shrink-0">
                    <span className="material-symbols-outlined text-[22px]">
                      {prog.iconName || 'spa'}
                    </span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[15px] font-semibold text-[#1D1D1F] dark:text-[#F4F4F5] truncate">
                      {prog.title}
                    </span>
                    <span className="text-[12px] text-[#86868B] dark:text-[#A1A1AA] truncate">
                      {prog.durationMinutes} mins • {prog.stages.length} stages • {prog.category}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartProgram(prog);
                  }}
                  className="px-3.5 py-1.5 rounded-full ios-liquid-btn-emerald active:scale-95 text-white text-[12px] font-semibold tracking-wide shrink-0 transition-all shadow-xs ring-1 ring-white/20 cursor-pointer"
                >
                  <span className="relative z-10">Start</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
