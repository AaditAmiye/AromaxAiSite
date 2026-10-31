import React from 'react';
import { useDevice } from '../../hooks/useDevice';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';

interface HeaderProps {
  onOpenSettings: () => void;
  onOpenAuth: () => void;
  onOpenLiveSession?: () => void;
  onOpenDiagnostics?: () => void;
  isSessionActive?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSettings,
  onOpenAuth,
  onOpenDiagnostics,
}) => {
  const { connected } = useDevice();
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="w-full px-5 py-3.5 flex items-center justify-between select-none z-20">
      {/* Brand title: A R O M A X A I */}
      <div className="flex items-center gap-2">
        <h1 className="text-[14px] sm:text-[15px] font-bold tracking-[0.28em] text-[#1D1D1F] dark:text-white uppercase font-sans drop-shadow-xs dark:drop-shadow-[0_2px_8px_rgba(255,255,255,0.15)] transition-colors">
          A R O M A X A I
        </h1>
      </div>

      {/* Right controls: Theme Toggle + Hardware Sync Status + Settings */}
      <div className="flex items-center gap-1.5">
        {/* Dark / Light Mode Toggle Button */}
        <button
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          type="button"
          className="w-8 h-8 rounded-full bg-[#F5F5F7] dark:bg-white/10 hover:bg-[#EBEBEF] dark:hover:bg-white/15 active:scale-95 text-[#1D1D1F] dark:text-neutral-300 flex items-center justify-center transition-all cursor-pointer border border-black/[0.06] dark:border-white/10 shadow-xs"
        >
          <span className="material-symbols-outlined text-[17px]">
            {isDark ? 'light_mode' : 'dark_mode'}
          </span>
        </button>

        {/* Hardware 001 Sync status */}
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F5F5F7] dark:bg-white/10 hover:bg-[#EBEBEF] dark:hover:bg-white/15 active:scale-95 transition-all cursor-pointer text-left border border-black/[0.06] dark:border-white/10 shadow-xs"
          title="Hardware: AROMAXAI-001 (Click to configure IP, transport & connection)"
          type="button"
        >
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${
                connected ? 'bg-[#34C759]' : 'bg-[#FF9500]'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                connected ? 'bg-[#34C759]' : 'bg-[#FF9500]'
              }`}
            />
          </span>
          <span className="text-[12px] font-medium text-[#1D1D1F] dark:text-neutral-200 tracking-tight">
            {connected ? '001 Synced' : '001 Offline'}
          </span>
        </button>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          aria-label="Settings"
          title="Settings & Hardware Ports"
          className="w-8 h-8 rounded-full bg-[#F5F5F7] dark:bg-white/10 hover:bg-[#EBEBEF] dark:hover:bg-white/15 text-[#1D1D1F] dark:text-neutral-300 flex items-center justify-center transition-all cursor-pointer border border-black/[0.06] dark:border-white/10 shadow-xs active:scale-95"
          type="button"
        >
          <span className="material-symbols-outlined text-[17px]">tune</span>
        </button>
      </div>
    </header>
  );
};
