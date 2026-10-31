import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { soundFX } from '../utils/soundEffects';

export type SnapPhase = 'idle' | 'vanishing' | 'reconstituting';

interface ThemeContextType {
  isDark: boolean;
  snapPhase: SnapPhase;
  snapOrigin: { x: number; y: number };
  triggerThanosSnap: (origin?: { x: number; y: number }) => void;
  toggleTheme: () => void;
  setIsDark: (dark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isDark, setIsDarkState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aromaxai_theme');
      if (saved) return saved === 'dark';
      // Default to dark mode as requested
      return true;
    }
    return true;
  });

  const [snapPhase, setSnapPhase] = useState<SnapPhase>('idle');
  const [snapOrigin, setSnapOrigin] = useState<{ x: number; y: number }>({ x: 40, y: 32 });

  // Sync dark class on documentElement
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      }
      localStorage.setItem('aromaxai_theme', isDark ? 'dark' : 'light');
    }
  }, [isDark]);

  const triggerThanosSnap = useCallback(
    (origin?: { x: number; y: number }) => {
      if (snapPhase !== 'idle') return; // Prevent double trigger while animation is running

      const defaultX = typeof window !== 'undefined' ? 48 : 40;
      const defaultY = typeof window !== 'undefined' ? 32 : 32;
      setSnapOrigin(origin || { x: defaultX, y: defaultY });

      // Phase 1: Disintegration / Vanishing effect
      setSnapPhase('vanishing');
      soundFX.playDisintegration();

      // At peak dissolution (~1300ms), flip theme and start Phase 2: Reverse Thanos Snap / Reconstitution
      window.setTimeout(() => {
        setIsDarkState((prev) => !prev);
        setSnapPhase('reconstituting');
        soundFX.playReconstitution();

        // At end of reconstitution (~2600ms total), reset to idle
        window.setTimeout(() => {
          setSnapPhase('idle');
        }, 1300);
      }, 1300);
    },
    [snapPhase]
  );

  const toggleTheme = useCallback(() => {
    setIsDarkState((prev) => !prev);
  }, []);

  const setIsDark = useCallback((dark: boolean) => {
    setIsDarkState(dark);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        isDark,
        snapPhase,
        snapOrigin,
        triggerThanosSnap,
        toggleTheme,
        setIsDark
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      isDark: true,
      snapPhase: 'idle',
      snapOrigin: { x: 40, y: 32 },
      triggerThanosSnap: () => {},
      toggleTheme: () => {
        if (typeof document !== 'undefined') {
          const isCurrentlyDark = document.documentElement.classList.contains('dark');
          if (isCurrentlyDark) {
            document.documentElement.classList.remove('dark');
            document.documentElement.setAttribute('data-theme', 'light');
          } else {
            document.documentElement.classList.add('dark');
            document.documentElement.setAttribute('data-theme', 'dark');
          }
        }
      },
      setIsDark: (dark: boolean) => {
        if (typeof document !== 'undefined') {
          if (dark) {
            document.documentElement.classList.add('dark');
            document.documentElement.setAttribute('data-theme', 'dark');
          } else {
            document.documentElement.classList.remove('dark');
            document.documentElement.setAttribute('data-theme', 'light');
          }
        }
      }
    };
  }
  return context;
};
