import React, { useState } from 'react';
import { PREDEFINED_BLENDS } from '../../data/blends';
import { Blend } from '../../types/aroma';
import { useActiveSession } from '../../hooks/useActiveSession';
import { useCartridges } from '../../hooks/useCartridges';

interface ScentLibraryScreenProps {
  onOpenLiveSession: () => void;
  favoritesOnly?: boolean;
}

export const ScentLibraryScreen: React.FC<ScentLibraryScreenProps> = ({
  onOpenLiveSession,
  favoritesOnly = false
}) => {
  const { startSession, active: isSessionActive } = useActiveSession();
  const { channelMap } = useCartridges();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [favorites, setFavorites] = useState<Record<string, boolean>>(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem('aromaxai_favorites');
        if (saved) return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return {
      'blend-rainy-forest': true,
      'blend-citrus-grove': true,
      'blend-vanilla-dream': true,
      'blend-ocean-breeze': true
    };
  });

  const [diffusingId, setDiffusingId] = useState<string | null>(null);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = { ...favorites, [id]: !favorites[id] };
    setFavorites(updated);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('aromaxai_favorites', JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
  };

  const categories = ['All', 'Nature', 'Fruity', 'Woody', 'Floral', 'Savory'];

  const filteredBlends = PREDEFINED_BLENDS.filter((b) => {
    if (favoritesOnly && !favorites[b.id]) return false;
    if (selectedCategory !== 'All' && b.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = b.name.toLowerCase().includes(q);
      const matchNotes = b.notes?.toLowerCase().includes(q);
      const matchDesc = b.description?.toLowerCase().includes(q);
      const matchCat = b.category?.toLowerCase().includes(q);
      if (!matchName && !matchNotes && !matchDesc && !matchCat) return false;
    }
    return true;
  });

  const handleLaunchBlend = async (blend: Blend) => {
    setDiffusingId(blend.id);
    await startSession({
      experienceId: blend.id,
      title: blend.name,
      type: 'blend',
      channels: blend.channels,
      durationSeconds: blend.durationSeconds || 180,
      light: blend.light,
      batchId: blend.batchId || `#BL-${Math.floor(1000 + Math.random() * 9000)}`,
      profileName: blend.profileName || blend.notes || 'Curated Formulation'
    });
    setTimeout(() => {
      setDiffusingId(null);
    }, 1500);
    onOpenLiveSession();
  };

  return (
    <div className="flex flex-col gap-4 py-1 max-w-lg mx-auto w-full">
      {/* Search Bar matching Right Phone Mockup */}
      <div className="relative w-full">
        <div className="flex items-center gap-2.5 bg-[#F5F5F7] dark:bg-zinc-900 rounded-full px-4 py-3 border border-black/[0.04] dark:border-white/10 transition-all focus-within:ring-2 focus-within:ring-black/[0.08] dark:focus-within:ring-white/20">
          <span className="material-symbols-outlined text-[19px] text-[#86868B] dark:text-[#A1A1AA] shrink-0">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search scents, moods, or stories..."
            className="w-full bg-transparent text-[14px] text-[#1D1D1F] dark:text-[#F4F4F5] placeholder:text-[#86868B] dark:placeholder:text-zinc-500 outline-none font-normal"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white text-[16px] p-0.5"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Tabs matching Right Phone Mockup */}
      {!favoritesOnly && (
        <div className="flex items-center gap-5 overflow-x-auto no-scrollbar py-1 px-1 -mx-1 text-[14px]">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`font-medium transition-colors whitespace-nowrap cursor-pointer relative pb-1 ${
                  isActive
                    ? 'text-[#1D1D1F] dark:text-white font-semibold'
                    : 'text-[#86868B] dark:text-[#A1A1AA] hover:text-[#1D1D1F] dark:hover:text-white'
                }`}
              >
                {cat}
                {isActive && (
                  <span className="absolute bottom-0 inset-x-0 h-[2px] bg-[#1D1D1F] dark:bg-white rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {favoritesOnly && (
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[20px] font-bold text-[#1D1D1F] dark:text-white tracking-tight">
            Saved Favorites
          </h2>
          <span className="text-[12px] font-medium text-[#86868B]">
            {filteredBlends.length} {filteredBlends.length === 1 ? 'scent' : 'scents'}
          </span>
        </div>
      )}

      {/* 2-Column Scent Cards Grid matching Right Phone Mockup */}
      {filteredBlends.length === 0 ? (
        <div className="py-16 text-center flex flex-col items-center justify-center gap-2">
          <span className="material-symbols-outlined text-[36px] text-[#86868B]">
            sentiment_dissatisfied
          </span>
          <p className="text-[14px] text-[#86868B]">
            {favoritesOnly
              ? 'No favorite scents saved yet. Tap the heart icon on any scent card to add it here.'
              : 'No scents found matching your search.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3.5 sm:gap-4 pt-1">
          {filteredBlends.map((blend) => {
            const isFav = !!favorites[blend.id];
            const isDiffusing = diffusingId === blend.id;

            return (
              <div
                key={blend.id}
                onClick={() => handleLaunchBlend(blend)}
                className="group flex flex-col cursor-pointer transition-transform active:scale-[0.98] select-none"
              >
                {/* 4:3 Rounded Image Container */}
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-stone-100 dark:bg-zinc-800 border border-black/[0.04] dark:border-white/10 shadow-xs mb-2.5">
                  <img
                    src={blend.imageUrl}
                    alt={blend.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    loading="lazy"
                  />

                  {/* Top-Right Heart Favorite Button */}
                  <button
                    type="button"
                    onClick={(e) => toggleFavorite(blend.id, e)}
                    className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md flex items-center justify-center text-[#1D1D1F] dark:text-white shadow-xs hover:bg-white dark:hover:bg-zinc-800 transition-all active:scale-90"
                    title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <span
                      className={`material-symbols-outlined text-[16px] transition-colors ${
                        isFav ? 'text-red-500 fill-1' : 'text-[#86868B]'
                      }`}
                      style={isFav ? { fontVariationSettings: "'FILL' 1" } : {}}
                    >
                      favorite
                    </span>
                  </button>

                  {/* Live Diffuse Overlay Indicator */}
                  {isDiffusing && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center">
                      <span className="text-white text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/90 animate-pulse">
                        Actuating
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Typography matching Mockup */}
                <div className="flex flex-col gap-0.5 px-0.5">
                  <h3 className="text-[14px] font-semibold text-[#1D1D1F] dark:text-[#F4F4F5] tracking-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                    {blend.name}
                  </h3>
                  <p className="text-[11.5px] text-[#86868B] dark:text-[#A1A1AA] font-normal truncate">
                    {blend.notes || blend.description}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#34C759]"></span>
                    <span className="text-[11px] font-medium text-[#86868B] dark:text-[#A1A1AA]">
                      Synced
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
