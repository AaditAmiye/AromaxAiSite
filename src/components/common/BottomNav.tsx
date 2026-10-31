import React from 'react';
import { motion } from 'motion/react';

export type TabKey = 'create' | 'cinema' | 'therapy' | 'blends' | 'device';

interface BottomNavProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'create', label: 'Create', icon: 'auto_awesome' },
    { key: 'cinema', label: 'Cinema', icon: 'movie' },
    { key: 'therapy', label: 'Therapy', icon: 'spa' },
    { key: 'blends', label: 'Blends', icon: 'science' },
    { key: 'device', label: 'Device', icon: 'precision_manufacturing' }
  ];

  return (
    <div className="fixed bottom-4 sm:bottom-6 inset-x-0 z-40 flex justify-center px-4 pointer-events-none select-none">
      {/* Floating Apple-Style Frosted Glass Dock */}
      <nav
        aria-label="Main Navigation Dock"
        className="pointer-events-auto relative h-[60px] w-full max-w-[350px] bg-white/85 dark:bg-neutral-950/90 backdrop-blur-2xl rounded-full px-2 py-1.5 flex items-center justify-between border border-black/[0.08] dark:border-white/15 shadow-[0_16px_35px_rgba(0,0,0,0.08)] dark:shadow-[0_16px_45px_rgba(0,0,0,0.85)] transition-colors"
      >
        {/* Specular Light Rim on Top */}
        <div className="absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-black/10 dark:via-white/50 to-transparent pointer-events-none" />

        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className="relative flex-1 h-full flex flex-col items-center justify-center rounded-full cursor-pointer select-none transition-transform active:scale-90"
              aria-current={isActive ? 'page' : undefined}
              aria-label={tab.label}
            >
              {/* Animated Liquid Glass Capsule underneath active icon */}
              {isActive && (
                <motion.div
                  layoutId="dockPillHighlight"
                  transition={{
                    type: 'spring',
                    stiffness: 520,
                    damping: 34,
                    mass: 0.4
                  }}
                  className="absolute inset-0 bg-black/10 dark:bg-white/20 rounded-full border border-black/10 dark:border-white/25 shadow-xs z-0 flex items-center justify-center"
                />
              )}

              {/* Icon & Label */}
              <div className="relative z-10 flex flex-col items-center justify-center">
                <span
                  className={`material-symbols-outlined text-[21px] transition-colors duration-150 ${
                    isActive
                      ? 'text-[#1D1D1F] dark:text-white'
                      : 'text-[#86868B] dark:text-neutral-400 hover:text-[#1D1D1F] dark:hover:text-white'
                  }`}
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {tab.icon}
                </span>
                <span
                  className={`text-[9.5px] font-semibold leading-none mt-0.5 tracking-tight transition-colors duration-150 ${
                    isActive ? 'text-[#1D1D1F] dark:text-white' : 'text-[#86868B] dark:text-neutral-400'
                  }`}
                >
                  {tab.label}
                </span>
              </div>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
