import React, { useState } from 'react';
import { AromaChannel } from '../../types/aroma';
import { rgbToHex } from '../../services/hardware/lightEngine';

interface CartridgeManagerHubProps {
  cartridges: AromaChannel[];
  activeChannels: string[];
  onEditChannel: (channel: AromaChannel) => void;
  onResetDefaults: () => Promise<any>;
  onQuickAssign: (channelId: string, name: string, category: string, keywords: string[], description: string, light: { r: number; g: number; b: number }) => Promise<void>;
  onTestChannel: (channel: AromaChannel, seconds: number) => void;
  activeTestChannel: string | null;
  testRemaining: number | null;
}

export const CartridgeManagerHub: React.FC<CartridgeManagerHubProps> = ({
  cartridges,
  activeChannels,
  onEditChannel,
  onResetDefaults,
  onQuickAssign,
  onTestChannel,
  activeTestChannel,
  testRemaining
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'master' | 'slave'>('all');
  const [isResetting, setIsResetting] = useState(false);
  const [quickNotice, setQuickNotice] = useState<string | null>(null);

  const filtered = cartridges.filter((c) => {
    // Tab filter
    if (filterTab === 'master' && c.board !== 'master') return false;
    if (filterTab === 'slave' && c.board !== 'slave') return false;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = c.id.toLowerCase().includes(q);
      const matchName = c.name.toLowerCase().includes(q);
      const matchCat = c.category.toLowerCase().includes(q);
      const matchKw = c.keywords?.some((k) => k.toLowerCase().includes(q));
      const matchDesc = c.description?.toLowerCase().includes(q);
      return matchId || matchName || matchCat || matchKw || matchDesc;
    }

    return true;
  });

  const workingCount = cartridges.filter((c) => !c.isLighting && !c.isAirflow).length;

  const handleRunExamplePizza = async () => {
    setQuickNotice('Setting H01 to "Pizza" and syncing database...');
    await onQuickAssign(
      'H01',
      'Pizza / Baked Crust',
      'savory',
      ['pizza', 'burger', 'crust', 'baked', 'cheese', 'tomato', 'oregano'],
      'Fresh stone-oven baked pizza crust with melted mozzarella and savory Italian herbs',
      { r: 235, g: 120, b: 40 }
    );
    setQuickNotice('✓ H01 is now permanently assigned to "Pizza"! Where ever pizza is requested, H01 will run.');
    setTimeout(() => setQuickNotice(null), 4000);
  };

  const handleRunExampleRain = async () => {
    setQuickNotice('Setting H01 to "Rain / Petrichor" and syncing database...');
    await onQuickAssign(
      'H01',
      'Rain / Petrichor (Mitti)',
      'earthy',
      ['rain', 'petrichor', 'soil', 'mitti', 'earth', 'monsoon', 'damp'],
      'First monsoon rain falling on dry summer earth with damp clay loam',
      { r: 46, g: 185, b: 96 }
    );
    setQuickNotice('✓ H01 is now permanently assigned to "Rain"! Where ever rain is requested, H01 will run.');
    setTimeout(() => setQuickNotice(null), 4000);
  };

  const handleReset = async () => {
    if (confirm('Are you sure you want to reset all cartridge smell mappings back to factory defaults?')) {
      setIsResetting(true);
      await onResetDefaults();
      setIsResetting(false);
      setQuickNotice('All 34 channels reset to factory defaults.');
      setTimeout(() => setQuickNotice(null), 3000);
    }
  };

  return (
    <div className="ios-glass-card p-5 rounded-[34px] ring-1 ring-black/[0.03] dark:ring-white/10 flex flex-col gap-4 shadow-sm relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Variable Smell Database &amp; Cartridge Studio
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/30 text-[10px] font-semibold">
                Permanent Database Sync
              </span>
            </div>
            <h2 className="text-[20px] font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F4F4F5] leading-snug">
              Device Loaded Smells (Hardware Ports H01–H34)
            </h2>
            <p className="text-[12px] text-[#86868B] dark:text-[#A1A1AA] leading-relaxed">
              📍 <strong className="text-[#1D1D1F] dark:text-white font-medium">Where device smells are written:</strong> This is the official list of smells installed in your device chambers. Gemini AI and YouTube Video Sync <strong className="text-[#1D1D1F] dark:text-white font-medium">strictly take smells ONLY from this list</strong>. If you customize or rename any chamber smell here, the AI immediately switches to your new smell everywhere!
            </p>
          </div>

          <div className="shrink-0 flex flex-col items-end gap-1">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/40">
              All 34 Pins Available &amp; Working
            </span>
          </div>
        </div>

        {/* 1-Click Interactive Test Scenarios */}
        <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-amber-600 dark:text-amber-400 shrink-0">
              science
            </span>
            <div className="flex flex-col">
              <span className="text-[12px] font-semibold text-[#1D1D1F] dark:text-[#F4F4F5]">
                1-Click Verification Test Scenarios
              </span>
              <span className="text-[11px] text-[#86868B] dark:text-[#A1A1AA]">
                Instantly map H01 to verify AI &amp; hardware dynamic routing
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleRunExamplePizza}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold tracking-wide transition-all active:scale-95 shadow-2xs flex items-center gap-1 cursor-pointer"
            >
              <span>🍕 Set H01 = Pizza</span>
            </button>
            <button
              type="button"
              onClick={handleRunExampleRain}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold tracking-wide transition-all active:scale-95 shadow-2xs flex items-center gap-1 cursor-pointer"
            >
              <span>🌧️ Set H01 = Rain</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={isResetting}
              className="px-2.5 py-1.5 rounded-xl bg-stone-200 dark:bg-zinc-800 hover:bg-stone-300 dark:hover:bg-zinc-700 text-[#1D1D1F] dark:text-white text-[11px] font-medium transition-all active:scale-95 cursor-pointer"
              title="Reset to factory baseline"
            >
              Reset All
            </button>
          </div>
        </div>

        {quickNotice && (
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 text-[12px] font-medium flex items-center gap-2 animate-in fade-in">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            <span>{quickNotice}</span>
          </div>
        )}
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
        <div className="flex p-1 bg-stone-100 dark:bg-zinc-900 rounded-xl text-[11px] font-medium gap-1 border border-stone-200/60 dark:border-white/10 shrink-0">
          {(['all', 'master', 'slave'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilterTab(tab)}
              className={`px-2.5 py-1 rounded-lg capitalize transition-all cursor-pointer ${
                filterTab === tab
                  ? 'bg-white dark:bg-zinc-800 font-bold text-[#1D1D1F] dark:text-white shadow-2xs'
                  : 'text-[#86868B] dark:text-[#A1A1AA] hover:text-[#1D1D1F]'
              }`}
            >
              {tab === 'all' ? 'All (34)' : tab === 'master' ? 'Master (17)' : 'Slave (17)'}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <span className="material-symbols-outlined text-[16px] absolute left-3 top-2.5 text-[#86868B]">
            search
          </span>
          <input
            type="text"
            placeholder="Search smell, channel, keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-stone-100 dark:bg-zinc-900 border border-stone-200/80 dark:border-white/10 text-[11px] text-[#1D1D1F] dark:text-white placeholder:text-[#86868B]/70 outline-none focus:border-amber-500 transition-all"
          />
        </div>
      </div>

      {/* Cartridge Slots List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[460px] overflow-y-auto pr-1">
        {filtered.map((c) => {
          const isActive = activeChannels.includes(c.id);
          const isTesting = activeTestChannel === c.id;
          const hex = rgbToHex(c.defaultLight || { r: 100, g: 100, b: 100 });
          const isUnassigned = c.status === 'unassigned' || c.category === 'unassigned';

          return (
            <div
              key={c.id}
              className={`p-3 rounded-2xl border transition-all flex flex-col gap-2 ${
                isActive || isTesting
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700 shadow-xs'
                  : 'bg-white/80 dark:bg-zinc-900/90 border-stone-200/80 dark:border-white/10'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-8 h-8 rounded-xl font-mono font-bold text-[12px] flex items-center justify-center shrink-0 shadow-2xs border border-black/10"
                    style={{ backgroundColor: `${hex}25`, color: hex }}
                  >
                    {c.id}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F4F4F5] truncate">
                        {c.name}
                      </span>
                      {c.isLighting ? (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                          LED
                        </span>
                      ) : c.isAirflow ? (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
                          Fan
                        </span>
                      ) : (
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wide ${
                          c.status === 'working'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-stone-100 text-stone-600 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}>
                          {c.category}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#86868B] dark:text-[#A1A1AA] truncate">
                      {c.description || (isUnassigned ? 'Unassigned hardware port' : c.chemicalCompound || 'Configured aroma')}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1">
                  <span
                    className="w-3 h-3 rounded-full border border-black/10 shrink-0"
                    style={{ backgroundColor: hex }}
                    title={`RGB: ${c.defaultLight?.r}, ${c.defaultLight?.g}, ${c.defaultLight?.b}`}
                  />
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    isTesting
                      ? 'bg-emerald-500 text-white animate-pulse'
                      : isActive
                      ? 'bg-emerald-600 text-white'
                      : 'bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400'
                  }`}>
                    {isTesting ? `${testRemaining}s` : isActive ? 'ON' : 'OFF'}
                  </span>
                </div>
              </div>

              {/* Keywords display if available */}
              {c.keywords && c.keywords.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap text-[10px]">
                  <span className="text-[#86868B] font-medium">Triggers:</span>
                  {c.keywords.slice(0, 4).map((k) => (
                    <span
                      key={k}
                      className="px-1.5 py-0.5 rounded-md bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-300 font-mono"
                    >
                      {k}
                    </span>
                  ))}
                  {c.keywords.length > 4 && (
                    <span className="text-[#86868B]">+{c.keywords.length - 4}</span>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => onEditChannel(c)}
                  className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-zinc-800 hover:bg-stone-200 dark:hover:bg-zinc-700 text-[#1D1D1F] dark:text-white text-[11px] font-semibold transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[13px] text-amber-600 dark:text-amber-400">
                    edit
                  </span>
                  <span>Reassign Smell</span>
                </button>

                {!c.isLighting && !c.isAirflow && (
                  <button
                    type="button"
                    onClick={() => onTestChannel(c, 5)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[13px]">bolt</span>
                    <span>Test 5s</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
