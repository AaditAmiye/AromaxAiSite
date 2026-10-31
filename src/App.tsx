import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Header } from './components/common/Header';
import { BottomNav, TabKey } from './components/common/BottomNav';
import { CreateScreen } from './components/screens/CreateScreen';
import { CinemaScreen } from './components/screens/CinemaScreen';
import { TherapyScreen } from './components/screens/TherapyScreen';
import { BlendsScreen } from './components/screens/BlendsScreen';
import { DeviceScreen } from './components/screens/DeviceScreen';
import { LiveDiffusionOverlay } from './components/diffusion/LiveDiffusionOverlay';
import { SettingsModal } from './components/common/SettingsModal';
import { AuthModal } from './components/common/AuthModal';
import { DiagnosticModal } from './components/common/DiagnosticModal';
import { DynamicIsland } from './components/common/DynamicIsland';
import { useActiveSession } from './hooks/useActiveSession';

const TAB_ORDER: TabKey[] = ['create', 'cinema', 'therapy', 'blends', 'device'];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('create');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isLiveOverlayOpen, setIsLiveOverlayOpen] = useState(false);
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);
  const [isIslandExpanded, setIsIslandExpanded] = useState(false);

  const { active: isSessionActive } = useActiveSession();

  const handleTabChange = (nextTab: TabKey) => {
    setActiveTab(nextTab);
  };

  return (
    <div className="bg-[#F8F9FA] dark:bg-black text-[#1D1D1F] dark:text-[#F4F4F5] min-h-screen flex flex-col font-sans selection:bg-[#1D1D1F] selection:text-white dark:selection:bg-white dark:selection:text-black relative overflow-x-hidden transition-colors duration-200">
      {/* Subtle chromatic ambient glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* Dark mode deep nebula caustics */}
        <div className="hidden dark:block absolute -top-32 -right-20 w-[450px] h-[450px] rounded-full bg-gradient-to-br from-blue-950/25 via-indigo-950/20 to-transparent blur-[140px]" />
        <div className="hidden dark:block absolute top-1/3 -left-32 w-[480px] h-[480px] rounded-full bg-gradient-to-tr from-emerald-950/25 via-teal-950/15 to-transparent blur-[140px]" />
        <div className="hidden dark:block absolute -bottom-24 left-1/3 w-[450px] h-[450px] rounded-full bg-gradient-to-r from-purple-950/20 via-rose-950/15 to-transparent blur-[140px]" />
        {/* Light mode ethereal sky caustics */}
        <div className="dark:hidden absolute -top-32 -right-20 w-[450px] h-[450px] rounded-full bg-gradient-to-br from-blue-200/40 via-indigo-100/30 to-transparent blur-[120px]" />
        <div className="dark:hidden absolute top-1/3 -left-32 w-[480px] h-[480px] rounded-full bg-gradient-to-tr from-emerald-200/35 via-teal-100/25 to-transparent blur-[120px]" />
      </div>

      {/* Dynamic Island morphing live pill when emitting aroma */}
      <DynamicIsland
        onOpenLiveSession={() => setIsLiveOverlayOpen(true)}
        isOverlayOpen={isLiveOverlayOpen}
        onExpandedChange={setIsIslandExpanded}
      />

      {/* Main app container */}
      <div className="w-full max-w-lg mx-auto flex-1 flex flex-col relative z-10 min-h-screen">
        {/* Minimalist Top Header: 'A R O M A X A I' and '001 Synced' */}
        <Header
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenLiveSession={() => setIsLiveOverlayOpen(true)}
          onOpenDiagnostics={() => setIsDiagnosticOpen(true)}
          isSessionActive={isSessionActive}
        />

        {/* Main Screen Content */}
        <main className="flex-1 w-full flex flex-col relative">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, filter: 'blur(3px)', scale: 0.99 }}
              animate={{
                opacity: 1,
                filter: 'blur(0px)',
                scale: 1,
                transition: { duration: 0.15, ease: [0.16, 1, 0.3, 1] }
              }}
              exit={{
                opacity: 0,
                filter: 'blur(3px)',
                scale: 0.99,
                transition: { duration: 0.1, ease: [0.4, 0, 1, 1] }
              }}
              className="w-full flex flex-col flex-1"
            >
              {activeTab === 'create' && (
                <CreateScreen
                  onOpenBlends={() => handleTabChange('blends')}
                  onOpenLiveSession={() => setIsLiveOverlayOpen(true)}
                />
              )}
              {activeTab === 'cinema' && (
                <div className="p-4 pb-28 flex-1">
                  <CinemaScreen onOpenLiveSession={() => setIsLiveOverlayOpen(true)} />
                </div>
              )}
              {activeTab === 'therapy' && (
                <div className="p-4 pb-28 flex-1">
                  <TherapyScreen onOpenLiveSession={() => setIsLiveOverlayOpen(true)} />
                </div>
              )}
              {activeTab === 'blends' && (
                <div className="p-4 pb-28 flex-1">
                  <BlendsScreen onOpenLiveSession={() => setIsLiveOverlayOpen(true)} />
                </div>
              )}
              {activeTab === 'device' && (
                <div className="p-4 pb-28 flex-1">
                  <DeviceScreen onOpenDiagnostics={() => setIsDiagnosticOpen(true)} />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Floating Apple Frosted Glass Dock across ALL pages */}
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Fullscreen Live Diffusion Overlay */}
      <LiveDiffusionOverlay
        isOpen={isLiveOverlayOpen}
        onClose={() => setIsLiveOverlayOpen(false)}
      />

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onOpenDiagnostics={() => setIsDiagnosticOpen(true)}
      />
      <DiagnosticModal
        isOpen={isDiagnosticOpen}
        onClose={() => setIsDiagnosticOpen(false)}
      />
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  );
}
