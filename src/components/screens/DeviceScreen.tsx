import React, { useState } from 'react';
import { AROMA_CHANNELS } from '../../data/aromas';
import { useDevice } from '../../hooks/useDevice';
import { useActiveSession } from '../../hooks/useActiveSession';
import { useCartridges } from '../../hooks/useCartridges';
import { AromaChannel } from '../../types/aroma';
import { ClaimDeviceModal } from '../common/ClaimDeviceModal';
import { CartridgeEditorModal } from '../cartridges/CartridgeEditorModal';
import { CartridgeManagerHub } from '../cartridges/CartridgeManagerHub';

interface DeviceScreenProps {
  onOpenDiagnostics?: () => void;
}

export const DeviceScreen: React.FC<DeviceScreenProps> = ({ onOpenDiagnostics }) => {
  const {
    connected,
    transportMode,
    setTransportMode,
    deviceId,
    setDeviceId,
    fanEnabled,
    toggleFan,
    setFan,
    host,
    masks,
    activeChannels,
    light,
    setRgbLight,
    toggleLightChannel,
    testChannel,
    stopAll,
    checkConnectivity,
    ota,
    triggerOtaUpdate,
    turnAllOn,
    turnAllOff,
    isAllOn,
    allNonLightingCount,
    toggleChannel
  } = useDevice();

  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [otaNotice, setOtaNotice] = useState<string | null>(null);
  const [isAllPinsBusy, setIsAllPinsBusy] = useState(false);

  // Custom user labels for unassigned / auxiliary pins (persisted in localStorage)
  const [customPinLabels, setCustomPinLabels] = useState<Record<string, string>>(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem('aromaxai_pin_labels');
        if (saved) return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return {};
  });

  const handleSetPinLabel = (pinId: string, label: string) => {
    const updated = { ...customPinLabels, [pinId]: label.trim() };
    if (!label.trim()) {
      delete updated[pinId];
    }
    setCustomPinLabels(updated);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('aromaxai_pin_labels', JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
  };

  const [activeTestChannel, setActiveTestChannel] = useState<string | null>(null);
  const [testRemaining, setTestRemaining] = useState<number | null>(null);
  const [testNotice, setTestNotice] = useState<string | null>(null);
  const [lightNotice, setLightNotice] = useState<string | null>(null);

  const {
    cartridges,
    channelMap,
    workingChannels,
    updateChannel: updateCartridgeChannel,
    resetToDefaults: resetCartridgeDefaults
  } = useCartridges();

  const [editingChannel, setEditingChannel] = useState<AromaChannel | null>(null);
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);

  const masterChannels = cartridges.filter((c) => c.board === 'master');
  const slaveChannels = cartridges.filter((c) => c.board === 'slave');

  const handleOpenEditChannel = (channel: AromaChannel) => {
    setEditingChannel(channel);
    setIsEditorModalOpen(true);
  };

  const handleQuickAssign = async (
    channelId: string,
    name: string,
    category: string,
    keywords: string[],
    description: string,
    light: { r: number; g: number; b: number }
  ) => {
    await updateCartridgeChannel(channelId, {
      name,
      category: category as any,
      keywords,
      description,
      status: 'working',
      defaultLight: light
    });
  };

  const isRedOn = (light.r > 127) || ((masks.masterMask & (1 << 12)) !== 0);
  const isGreenOn = (light.g > 127) || ((masks.masterMask & (1 << 2)) !== 0);
  const isBlueOn = (light.b > 127) || ((masks.masterMask & (1 << 1)) !== 0);

  const handleApplyPresetColor = async (r: number, g: number, b: number, name: string) => {
    setLightNotice(`Applying ${name} light (R:${r} G:${g} B:${b})...`);
    const res = await setRgbLight(r, g, b);
    if (res.success) {
      setLightNotice(`Light applied: ${name} (R:${r} G:${g} B:${b})`);
    } else {
      setLightNotice(`Light command failed: ${res.error}`);
    }
    setTimeout(() => setLightNotice(null), 3000);
  };

  const handleToggleLight = async (ch: 'H02' | 'H03' | 'H13', name: string) => {
    setLightNotice(`Toggling ${name} (${ch})...`);
    const res = await toggleLightChannel(ch);
    if (res.success) {
      setLightNotice(`${name} (${ch}) toggled.`);
    } else {
      setLightNotice(`Failed to toggle ${ch}: ${res.error}`);
    }
    setTimeout(() => setLightNotice(null), 3000);
  };

  const handleTest = async (channel: AromaChannel, seconds: number) => {
    const displayName = customPinLabels[channel.id] || channel.name;
    setActiveTestChannel(channel.id);
    setTestRemaining(seconds);
    setTestNotice(`Actuating ${channel.id} (${displayName}) for ${seconds} seconds...`);

    const res = await testChannel(channel.id, seconds);
    if (!res.success) {
      setTestNotice(`Test failed: ${res.error}`);
      setActiveTestChannel(null);
      setTestRemaining(null);
      return;
    }

    // Countdown UI
    let rem = seconds;
    const interval = setInterval(() => {
      rem -= 1;
      setTestRemaining(rem);
      if (rem <= 0) {
        clearInterval(interval);
        setActiveTestChannel(null);
        setTestRemaining(null);
        setTestNotice(`Test for ${channel.id} completed. Channel stopped automatically.`);
      }
    }, 1000);
  };

  const handleToggleChannel = async (channelId: string) => {
    const isCurrentlyActive = activeChannels.includes(channelId);
    const displayName = customPinLabels[channelId] || channelId;
    setTestNotice(`${isCurrentlyActive ? 'De-energizing' : 'Energizing'} pin ${channelId} (${displayName})...`);
    const res = await toggleChannel(channelId);
    if (res.success) {
      setTestNotice(`Pin ${channelId} (${displayName}) turned ${isCurrentlyActive ? 'OFF' : 'ON'}.`);
    } else {
      setTestNotice(`Failed to toggle pin ${channelId}: ${res.error}`);
    }
  };

  const { startPurge } = useActiveSession();

  const handleStopAll = async () => {
    setActiveTestChannel(null);
    setTestRemaining(null);
    await stopAll();
    await startPurge(6);
    setTestNotice('Emergency Stop & Purge executed. Dynamic Island chamber purge active.');
  };

  const handleAllOn = async () => {
    setIsAllPinsBusy(true);
    setActiveTestChannel(null);
    setTestRemaining(null);
    setTestNotice('Energizing all 31-32 actuator pins (Lights OFF)...');
    const res = await turnAllOn();
    setIsAllPinsBusy(false);
    if (res.success) {
      setTestNotice('⚡ ALL ON: All 31 actuator pins energized across Master & Slave boards. RGB lighting remains strictly OFF.');
    } else {
      setTestNotice(`Failed to turn all pins on: ${res.error}`);
    }
  };

  const handleAllOff = async () => {
    setIsAllPinsBusy(true);
    setActiveTestChannel(null);
    setTestRemaining(null);
    setTestNotice('De-energizing all hardware pins and actuators...');
    const res = await turnAllOff();
    setIsAllPinsBusy(false);
    if (res.success) {
      setTestNotice('⏹ ALL OFF: All hardware pins and channels de-energized. System on standby.');
    } else {
      setTestNotice(`Failed to turn all pins off: ${res.error}`);
    }
  };

  const getStatusBadge = (status?: AromaChannel['status']) => {
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#34C759]/10 text-[#34C759]">
        Working
      </span>
    );
  };

  const renderChannelCard = (channel: AromaChannel) => {
    const isChannelActive = activeChannels.includes(channel.id);
    const isTestingThis = activeTestChannel === channel.id;

    if (channel.isLighting) {
      const isRed = channel.id === 'H13';
      const isGreen = channel.id === 'H03';
      const isBlue = channel.id === 'H02';
      const isOn = isRed ? isRedOn : isGreen ? isGreenOn : isBlueOn;
      const ledColorName = isRed ? 'RED' : isGreen ? 'GREEN' : 'BLUE';
      const dotColor = isRed ? '#FF3B30' : isGreen ? '#34C759' : '#0071E3';

      return (
        <div
          key={channel.id}
          className={`p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border transition-all flex items-center justify-between shadow-xs ${
            isOn ? 'border-emerald-500/40 dark:border-white/30 ring-1 ring-emerald-500/20 dark:ring-white/10' : 'border-black/[0.05] dark:border-white/10'
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`text-[12px] font-mono font-bold px-2 py-1 rounded-lg ${
                isOn ? 'bg-emerald-600 dark:bg-zinc-800 text-white' : 'bg-[#F5F5F7] dark:bg-zinc-800 text-[#1D1D1F] dark:text-[#F4F4F5]'
              }`}
            >
              {channel.id}
            </span>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F4F4F5]">{channel.name}</span>
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    backgroundColor: isOn ? dotColor : '#D1D1D6',
                    boxShadow: isOn ? `0 0 8px ${dotColor}` : 'none'
                  }}
                />
              </div>
              <span className="text-[11px] text-[#86868B] dark:text-[#A1A1AA]">
                {channel.id === 'H13'
                  ? 'GPIO27 • Red Output'
                  : channel.id === 'H03'
                  ? 'GPIO14 • Green Output'
                  : 'GPIO13 • Blue Output'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleToggleLight(channel.id as 'H02' | 'H03' | 'H13', ledColorName)}
            className={`px-4 py-1.5 rounded-xl text-[12px] font-bold tracking-wide uppercase transition-all shadow-xs active:scale-95 cursor-pointer ${
              isOn
                ? 'bg-rose-500 hover:bg-rose-600 dark:bg-zinc-800 text-white'
                : 'bg-[#F5F5F7] dark:bg-zinc-800 text-[#1D1D1F] dark:text-[#F4F4F5] hover:bg-[#EBEBEF] dark:hover:bg-zinc-700'
            }`}
          >
            {isOn ? 'TURN OFF' : 'TURN ON'}
          </button>
        </div>
      );
    }

    if (channel.isAirflow) {
      // H30 Fan - dedicated hardware switch
      return (
        <div
          key={channel.id}
          className={`p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border transition-all flex items-center justify-between ${
            fanEnabled ? 'border-emerald-200/80 dark:border-emerald-800/40 shadow-xs' : 'border-stone-200 dark:border-white/10 shadow-xs'
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`text-[12px] font-mono font-bold px-2 py-1 rounded-lg ${
                fanEnabled ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300' : 'bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400'
              }`}
            >
              {channel.id}
            </span>
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F4F4F5]">{channel.name}</span>
              <span className={`text-[11px] font-medium ${fanEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-500 dark:text-zinc-400'}`}>
                {fanEnabled ? 'Mixer Fan Running • Fresh Airflow Active' : 'Mixer Fan Turned Off'}
              </span>
            </div>
          </div>
          <button
            onClick={() => toggleFan()}
            className={`px-3 py-1.5 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer ${
              fanEnabled
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs'
                : 'bg-stone-200 dark:bg-zinc-800 hover:bg-stone-300 dark:hover:bg-zinc-700 text-[#1D1D1F] dark:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">
              {fanEnabled ? 'power_settings_new' : 'play_arrow'}
            </span>
            <span>{fanEnabled ? 'TURN OFF' : 'TURN ON'}</span>
          </button>
        </div>
      );
    }

    const customLabel = customPinLabels[channel.id];

    return (
      <div
        key={channel.id}
        className={`p-3.5 rounded-2xl ios-glass transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isTestingThis
            ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
            : isChannelActive
            ? 'border-emerald-500/50 dark:border-white/30 ring-1 ring-emerald-500/20 dark:ring-white/10'
            : 'border-white/70 dark:border-white/10 shadow-xs'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={`text-[12px] font-mono font-bold px-2 py-1 rounded-lg shrink-0 ${
              isTestingThis
                ? 'bg-emerald-500 text-white'
                : isChannelActive
                ? 'bg-emerald-600 text-white'
                : 'bg-[#F5F5F7] dark:bg-zinc-800 text-[#1D1D1F] dark:text-[#F4F4F5]'
            }`}
          >
            {channel.id}
          </span>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold text-[#1D1D1F] dark:text-[#F4F4F5] truncate">
                {customLabel ? `${customLabel} (${channel.name})` : channel.name}
              </span>
              {getStatusBadge(channel.status)}
              {!channel.isLighting && !channel.isAirflow && (
                <button
                  type="button"
                  onClick={() => handleOpenEditChannel(channel)}
                  className="w-6 h-6 rounded-lg bg-stone-100 dark:bg-zinc-800 hover:bg-amber-100 dark:hover:bg-amber-950/60 text-[#86868B] hover:text-amber-600 dark:hover:text-amber-400 flex items-center justify-center transition-all cursor-pointer"
                  title={`Reassign smell for ${channel.id}`}
                >
                  <span className="material-symbols-outlined text-[13px]">edit</span>
                </button>
              )}
            </div>
            <span className="text-[11px] text-[#86868B] dark:text-[#A1A1AA] truncate">
              {channel.chemicalCompound
                ? `${channel.chemicalCompound} • ${channel.category}`
                : channel.description || 'Active aroma port'}
            </span>
          </div>
        </div>

        {/* Action Controls for all channels: Test & Toggle */}
        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
          {isTestingThis ? (
            <span className="text-[12px] font-mono font-bold text-emerald-600 dark:text-emerald-400 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl animate-pulse">
              ACTIVE ({testRemaining}s)
            </span>
          ) : (
            <>
              {/* Pulse Test Buttons */}
              <button
                type="button"
                onClick={() => handleTest(channel, 5)}
                className="px-2.5 py-1 rounded-xl bg-[#F5F5F7] dark:bg-zinc-800 hover:bg-[#EBEBEF] dark:hover:bg-zinc-700 text-[#1D1D1F] dark:text-[#F4F4F5] text-[11px] font-semibold transition-all active:scale-95 cursor-pointer"
                title={`Pulse ${channel.id} for 5 seconds`}
              >
                5s
              </button>
              <button
                type="button"
                onClick={() => handleTest(channel, 10)}
                className="px-2.5 py-1 rounded-xl bg-[#F5F5F7] dark:bg-zinc-800 hover:bg-[#EBEBEF] dark:hover:bg-zinc-700 text-[#1D1D1F] dark:text-[#F4F4F5] text-[11px] font-semibold transition-all active:scale-95 cursor-pointer"
                title={`Pulse ${channel.id} for 10 seconds`}
              >
                10s
              </button>
              <button
                type="button"
                onClick={() => handleTest(channel, 20)}
                className="px-2.5 py-1 rounded-xl bg-[#F5F5F7] dark:bg-zinc-800 hover:bg-[#EBEBEF] dark:hover:bg-zinc-700 text-[#1D1D1F] dark:text-[#F4F4F5] text-[11px] font-semibold transition-all active:scale-95 cursor-pointer"
                title={`Pulse ${channel.id} for 20 seconds`}
              >
                20s
              </button>

              {/* Direct Toggle (ON / OFF) for Any Pin */}
              <button
                type="button"
                onClick={() => handleToggleChannel(channel.id)}
                className={`px-3 py-1 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all flex items-center gap-1 active:scale-95 cursor-pointer ${
                  isChannelActive
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                }`}
                title={isChannelActive ? `De-energize pin ${channel.id}` : `Energize pin ${channel.id}`}
              >
                <span className="material-symbols-outlined text-[13px]">
                  {isChannelActive ? 'power_off' : 'bolt'}
                </span>
                <span>{isChannelActive ? 'OFF' : 'ON'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 py-2 max-w-lg mx-auto w-full">
      {/* Title */}
      <div className="pt-2 flex flex-col gap-1.5 px-1">
        <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
          <h1 className="text-[32px] leading-tight font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F4F4F5]">
            Hardware Lab
          </h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAllOn}
              disabled={isAllPinsBusy}
              title="Energize all 31-32 actuator pins while lights remain OFF"
              className={`px-3 py-2 rounded-2xl text-[12px] font-bold tracking-wide uppercase shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer ${
                isAllOn
                  ? 'bg-emerald-600 text-white shadow-emerald-500/25 ring-2 ring-emerald-400'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">bolt</span>
              <span>ALL ON</span>
            </button>
            <button
              type="button"
              onClick={handleAllOff}
              disabled={isAllPinsBusy}
              title="De-energize all hardware pins immediately"
              className="px-3 py-2 rounded-2xl bg-stone-800 hover:bg-stone-900 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white text-[12px] font-bold tracking-wide uppercase shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">power_off</span>
              <span>ALL OFF</span>
            </button>
            <button
              type="button"
              onClick={handleStopAll}
              title="Emergency Stop & 6s Purge"
              className="px-3 py-2 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-[12px] font-bold tracking-wide uppercase shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">cancel</span>
              <span className="hidden xs:inline">PURGE</span>
            </button>
          </div>
        </div>
        <p className="text-[14px] leading-snug text-[#86868B] dark:text-[#A1A1AA] font-normal">
          Direct 34-channel bitmask testing interface for Master (H01–H17) and Slave (H18–H34) ESP32 boards.
        </p>
      </div>

      {/* MASTER PIN BUS CONTROL PANEL: ALL ON & ALL OFF */}
      <div className="ios-glass-card p-5 rounded-[34px] ring-1 ring-black/[0.03] dark:ring-white/10 flex flex-col gap-4 shadow-sm relative overflow-hidden">
        {/* Ambient atmospheric energy glow when all on */}
        {isAllOn && (
          <div className="absolute -top-12 -right-12 w-44 h-44 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
        )}

        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`w-2.5 h-2.5 rounded-full ${isAllOn ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)] animate-pulse' : 'bg-stone-400 dark:bg-zinc-600'}`}></span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Master Pin Bus Control
              </span>
              <span className="px-2 py-0.5 rounded-full bg-stone-100 dark:bg-zinc-800 text-[10px] font-semibold text-[#86868B] dark:text-[#A1A1AA]">
                All 32 Pins Array
              </span>
            </div>
            <h2 className="text-[19px] font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F4F4F5] leading-snug">
              Global Actuators Power
            </h2>
            <p className="text-[12px] text-[#86868B] dark:text-[#A1A1AA] leading-relaxed">
              Energize or de-energize all 31-32 actuator, carrier &amp; airflow pins simultaneously. <strong className="text-[#1D1D1F] dark:text-[#F4F4F5] font-semibold">Chassis lighting strictly remains OFF.</strong>
            </p>
          </div>

          {/* Quick status pill */}
          <div className="shrink-0 flex flex-col items-end gap-1">
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
              isAllOn 
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/40' 
                : 'bg-stone-50 dark:bg-zinc-800/80 text-[#86868B] dark:text-[#A1A1AA] border-stone-200/80 dark:border-white/10'
            }`}>
              {isAllOn ? 'ALL 32 PINS ACTIVE' : `${activeChannels.length} / 31 Active`}
            </span>
            <span className="text-[10px] text-[#86868B] dark:text-[#A1A1AA] flex items-center gap-1 font-mono">
              <span className={`w-1.5 h-1.5 rounded-full ${isRedOn || isGreenOn || isBlueOn ? 'bg-amber-500' : 'bg-stone-400 dark:bg-zinc-600'}`}></span>
              Lights: {isRedOn || isGreenOn || isBlueOn ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>

        {/* Master Action Cards: ALL ON vs ALL OFF */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* ALL ON Button */}
          <button
            type="button"
            disabled={isAllPinsBusy}
            onClick={handleAllOn}
            className={`p-3.5 rounded-2xl border transition-all flex flex-col items-start gap-2.5 active:scale-[0.98] cursor-pointer ${
              isAllOn
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-[0_4px_20px_rgba(16,185,129,0.35)] ring-2 ring-emerald-400/40'
                : 'bg-white/80 dark:bg-zinc-800/90 hover:bg-emerald-50/50 dark:hover:bg-zinc-700/80 border-stone-200/80 dark:border-white/10 text-[#1D1D1F] dark:text-[#F4F4F5] shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isAllOn ? 'bg-white/20 text-white' : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400'
              }`}>
                <span className="material-symbols-outlined text-[19px]">bolt</span>
              </div>
              <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full font-bold ${
                isAllOn ? 'bg-white/25 text-white' : 'bg-stone-100 dark:bg-zinc-800 text-[#86868B] dark:text-[#A1A1AA]'
              }`}>
                {isAllOn ? 'ENERGIZED' : 'ACTUATE'}
              </span>
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[15px] font-bold tracking-tight">ALL ON</span>
              <span className={`text-[11px] leading-tight ${isAllOn ? 'text-white/85' : 'text-[#86868B] dark:text-[#A1A1AA]'}`}>
                All 32 Pins • Lights OFF
              </span>
            </div>
          </button>

          {/* ALL OFF Button */}
          <button
            type="button"
            disabled={isAllPinsBusy}
            onClick={handleAllOff}
            className={`p-3.5 rounded-2xl border transition-all flex flex-col items-start gap-2.5 active:scale-[0.98] cursor-pointer ${
              !isAllOn && activeChannels.length === 0
                ? 'bg-stone-100 dark:bg-zinc-800/90 border-stone-300/80 dark:border-white/15 text-[#1D1D1F] dark:text-[#F4F4F5] shadow-xs'
                : 'bg-white/80 dark:bg-zinc-800/90 hover:bg-rose-50/50 dark:hover:bg-zinc-700/80 border-stone-200/80 dark:border-white/10 text-[#1D1D1F] dark:text-[#F4F4F5] shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-[19px]">power_off</span>
              </div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full font-bold bg-stone-100 dark:bg-zinc-800 text-[#86868B] dark:text-[#A1A1AA]">
                {activeChannels.length === 0 ? 'STANDBY' : 'SHUTDOWN'}
              </span>
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[15px] font-bold tracking-tight">ALL OFF</span>
              <span className="text-[11px] leading-tight text-[#86868B] dark:text-[#A1A1AA]">
                De-energize All Pins
              </span>
            </div>
          </button>
        </div>

        {/* Real-time Pin & Bitmask Verification Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-stone-50 dark:bg-zinc-900 border border-stone-200/60 dark:border-white/10 text-[11px] font-mono">
          <div className="flex items-center gap-3">
            <span>
              Master: <strong className="text-[#1D1D1F] dark:text-white">0x{masks.masterMask.toString(16).toUpperCase().padStart(5, '0')}</strong>
            </span>
            <span>
              Slave: <strong className="text-[#1D1D1F] dark:text-white">0x{masks.slaveMask.toString(16).toUpperCase().padStart(5, '0')}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 text-[#86868B] dark:text-[#A1A1AA]">
            <span>Chassis LEDs (H02/H03/H13):</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
              isRedOn || isGreenOn || isBlueOn 
                ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300' 
                : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
            }`}>
              {isRedOn || isGreenOn || isBlueOn ? 'ACTIVE' : 'OFF (Inhibited)'}
            </span>
          </div>
        </div>
      </div>

      {/* Hardware Status Strip */}
      <div className="ios-glass-card p-5 rounded-[34px] ring-1 ring-black/[0.03] flex flex-col gap-3.5">
        {/* Mode Selector Tabs */}
        <div className="flex p-1 bg-white/60 dark:bg-zinc-900 backdrop-blur-md rounded-2xl text-[12px] font-medium gap-1 border border-white/70 dark:border-white/10 shadow-inner">
          <button
            onClick={() => setTransportMode('cloud')}
            className={`flex-1 py-2 px-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              transportMode === 'cloud'
                ? 'bg-white dark:bg-zinc-800 text-emerald-700 dark:text-emerald-300 font-semibold shadow-xs ring-1 ring-emerald-500/20'
                : 'text-[#86868B] dark:text-[#A1A1AA] hover:text-[#1D1D1F] dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">cloud_sync</span>
            <span>Firebase Cloud</span>
            {transportMode === 'cloud' && (
              <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
            )}
          </button>
          <button
            onClick={() => setTransportMode('local')}
            className={`flex-1 py-2 px-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              transportMode === 'local'
                ? 'bg-white dark:bg-zinc-800 text-[#1D1D1F] dark:text-white font-semibold shadow-xs ring-1 ring-black/10 dark:ring-white/10'
                : 'text-[#86868B] dark:text-[#A1A1AA] hover:text-[#1D1D1F] dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">router</span>
            <span>Local LAN IP</span>
          </button>
          <button
            onClick={() => setTransportMode('mock')}
            className={`flex-1 py-2 px-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              transportMode === 'mock'
                ? 'bg-white dark:bg-zinc-800 text-[#1D1D1F] dark:text-white font-semibold shadow-xs ring-1 ring-black/10 dark:ring-white/10'
                : 'text-[#86868B] dark:text-[#A1A1AA] hover:text-[#1D1D1F] dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">terminal</span>
            <span>Simulated</span>
          </button>
        </div>

        <div className="flex items-center justify-between text-[12px]">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                connected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]' : 'bg-amber-500 animate-ping'
              }`}
            />
            <span className="font-semibold text-[#1D1D1F] dark:text-[#F4F4F5]">
              {connected
                ? transportMode === 'cloud'
                  ? 'Connected via Firebase Realtime Database'
                  : 'ESP32 Master Online'
                : transportMode === 'cloud'
                ? 'Waiting for ESP32 Firebase Heartbeat...'
                : 'ESP32 Master Unreachable on LAN'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {onOpenDiagnostics && (
              <button
                onClick={onOpenDiagnostics}
                className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">troubleshoot</span>
                <span>Diagnostics</span>
              </button>
            )}
            <button
              onClick={() => checkConnectivity()}
              className="text-[11px] font-semibold text-[#0071E3] dark:text-sky-400 hover:underline cursor-pointer"
            >
              Refresh
            </button>
          </div>
        </div>

        {transportMode === 'local' && (
          <div className="text-[11px] bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 p-2.5 rounded-xl border border-amber-200/80 dark:border-amber-800/40 flex items-center justify-between">
            <span>Direct LAN IP (10.162.171.155) cannot be reached from cloud HTTPS URLs.</span>
            <button
              onClick={() => setTransportMode('cloud')}
              className="underline font-bold text-amber-900 dark:text-amber-300 ml-2 shrink-0 cursor-pointer"
            >
              Switch to Cloud
            </button>
          </div>
        )}

        {/* Device Unit Identity Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] bg-[#F5F5F7] dark:bg-zinc-900 px-3.5 py-2.5 rounded-2xl border border-black/[0.04] dark:border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-[#86868B] dark:text-[#A1A1AA] font-medium">Hardware Unit:</span>
            <span className="font-mono font-bold text-[#1D1D1F] dark:text-white bg-white dark:bg-zinc-800 px-2 py-0.5 rounded-md border border-black/[0.05] dark:border-white/10 shadow-2xs">
              {deviceId}
            </span>
            <span className="text-[#86868B] dark:text-[#A1A1AA] text-[10px]">
              • FW v{ota?.currentVersion || '1.4.0'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsClaimModalOpen(true)}
              className="text-emerald-700 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">qr_code_scanner</span>
              <span>Claim Unit</span>
            </button>
            <button
              onClick={() => {
                const newId = prompt('Enter Physical Device ID (e.g. ARX-000001, ARX-000002, or aromaxai-master-01):', deviceId);
                if (newId && newId.trim()) setDeviceId(newId.trim());
              }}
              className="text-[#0071E3] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">tune</span>
              <span>Switch ID</span>
            </button>
          </div>
        </div>

        {/* OTA Firmware Update Banner (When Cloud update is detected) */}
        {ota?.status === 'available' && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-300">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-[22px] text-blue-600 mt-0.5">system_update</span>
              <div className="flex flex-col">
                <span className="text-[13px] font-semibold text-[#1D1D1F]">
                  Firmware Update Available: v{ota.targetVersion || '1.4.1'}
                </span>
                <span className="text-[11px] text-[#555] font-normal leading-snug">
                  {ota.releaseNotes || 'ESP-NOW dynamic channel auto-lock & slave ACK reliability improvements.'}
                </span>
                <span className="text-[10px] text-blue-700 font-medium mt-0.5">
                  Current installed: v{ota.currentVersion || '1.4.0'} • Dual-partition fail-safe
                </span>
              </div>
            </div>
            <button
              onClick={async () => {
                setOtaNotice('Initiating safe OTA download on ESP32...');
                const res = await triggerOtaUpdate();
                if (res.success) {
                  setOtaNotice('OTA command sent. ESP32 is downloading binary to secondary partition.');
                } else {
                  setOtaNotice(`Update trigger failed: ${res.error}`);
                }
              }}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold uppercase tracking-wider shadow-sm transition-all active:scale-95 shrink-0 self-end sm:self-center cursor-pointer"
            >
              Install Update
            </button>
          </div>
        )}

        {(ota?.status === 'downloading' || ota?.status === 'verifying' || ota?.status === 'installing' || ota?.status === 'rebooting') && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 text-[12px] text-amber-900 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
            <div>
              <span className="font-semibold block capitalize">OTA in progress: {ota.status}...</span>
              <span className="text-[11px] text-amber-800">
                ESP32 is safely flashing secondary partition with rollback protection. Standby for reboot.
              </span>
            </div>
          </div>
        )}

        {otaNotice && (
          <p className="text-[11px] text-blue-900 bg-blue-50/80 p-2 rounded-xl border border-blue-100">
            {otaNotice}
          </p>
        )}

        {/* Real-time Bitmasks */}
        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-[#F5F5F7] dark:bg-zinc-900 p-3 rounded-2xl border border-transparent dark:border-white/10">
          <div>
            <span className="text-[#86868B] dark:text-[#A1A1AA] block font-sans text-[10px] uppercase font-semibold">
              Master Mask (H01–H17)
            </span>
            <span className="font-bold text-[#1D1D1F] dark:text-[#F4F4F5]">
              0x{masks.masterMask.toString(16).toUpperCase()}
            </span>
          </div>
          <div>
            <span className="text-[#86868B] dark:text-[#A1A1AA] block font-sans text-[10px] uppercase font-semibold">
              Slave Mask (H18–H34)
            </span>
            <span className="font-bold text-[#1D1D1F] dark:text-[#F4F4F5]">
              0x{masks.slaveMask.toString(16).toUpperCase()}
            </span>
          </div>
        </div>

        {testNotice && (
          <p className="text-[12px] text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
            {testNotice}
          </p>
        )}
      </div>

      {/* DEDICATED MIXER FAN & AIRFLOW CONTROLLER (H30 SLAVE BIT 12) */}
      <div className="ios-glass-card p-5 rounded-[34px] ring-1 ring-black/[0.03] flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                fanEnabled
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25 ring-2 ring-emerald-500/30'
                  : 'bg-white/80 dark:bg-zinc-800 text-[#86868B] dark:text-[#A1A1AA] border border-white/80 dark:border-white/10 shadow-2xs'
              }`}
            >
              <span
                className={`material-symbols-outlined text-[22px] ${fanEnabled ? 'animate-spin' : ''}`}
                style={{ animationDuration: '2.5s' }}
              >
                mode_fan
              </span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h2 className="text-[17px] font-semibold text-[#1D1D1F] dark:text-[#F4F4F5] tracking-tight">
                  Mixer Fan &amp; Fresh Airflow
                </h2>
                <span className="text-[10px] font-mono font-bold bg-white/60 dark:bg-zinc-800 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/80 dark:border-white/10 shadow-2xs">
                  H30 • Slave Pin
                </span>
              </div>
              <p className="text-[11px] text-[#86868B] dark:text-[#A1A1AA]">
                {fanEnabled
                  ? 'Active dispersion airflow • 1,840 RPM • Positive chamber pressure'
                  : 'Mixer fan stopped • Actuator ports sealed (Standby mode)'}
              </p>
            </div>
          </div>

          {/* Master Fan Toggle Button */}
          <button
            onClick={() => toggleFan()}
            className={`px-4 py-2.5 rounded-2xl font-bold text-[12px] uppercase tracking-wider transition-all active:scale-95 shadow-xs flex items-center gap-2 cursor-pointer ${
              fanEnabled
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                : 'bg-white/80 dark:bg-zinc-800 hover:bg-white dark:hover:bg-zinc-700 text-[#1D1D1F] dark:text-white border border-white/80 dark:border-white/10'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">
              {fanEnabled ? 'power_settings_new' : 'play_arrow'}
            </span>
            <span>{fanEnabled ? 'FAN ON' : 'FAN OFF'}</span>
          </button>
        </div>
      </div>

      {/* HARDWARE OPTICS & RGB CONTROLLER (WORKING DIRECT PHYSICAL LIGHT SWITCHES) */}
      <div className="ios-glass-card p-5 rounded-[34px] ring-1 ring-black/[0.03] flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-4 h-4 rounded-full shadow-sm transition-all duration-300"
              style={{
                backgroundColor: `rgb(${isRedOn ? 255 : 0}, ${isGreenOn ? 255 : 0}, ${isBlueOn ? 255 : 0})`,
                boxShadow:
                  isRedOn || isGreenOn || isBlueOn
                    ? `0 0 12px rgba(${isRedOn ? 255 : 0}, ${isGreenOn ? 255 : 0}, ${
                        isBlueOn ? 255 : 0
                      }, 0.8)`
                    : 'none'
              }}
            />
            <div>
              <h2 className="text-[17px] font-semibold text-[#1D1D1F] tracking-tight">
                Hardware Optics &amp; RGB Lighting
              </h2>
              <p className="text-[11px] text-[#86868B]">
                Direct GPIO control: H13 (Red • GPIO27), H03 (Green • GPIO14), H02 (Blue • GPIO13)
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-[#F5F5F7] dark:bg-zinc-800 text-[#1D1D1F] dark:text-[#F4F4F5]">
            R:{isRedOn ? '1' : '0'} G:{isGreenOn ? '1' : '0'} B:{isBlueOn ? '1' : '0'}
          </span>
        </div>

        {/* Individual Quick Direct Switches for H13, H03, H02 */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleToggleLight('H13', 'RED')}
            className={`py-3 px-2 rounded-2xl flex flex-col items-center justify-center gap-1 text-[12px] font-bold transition-all border shadow-xs active:scale-95 cursor-pointer ${
              isRedOn
                ? 'bg-red-600 text-white border-red-700 shadow-[0_0_14px_rgba(239,68,68,0.5)]'
                : 'bg-[#F5F5F7] dark:bg-zinc-800 text-[#1D1D1F] dark:text-[#F4F4F5] border-black/[0.04] dark:border-white/10 hover:bg-[#EBEBEF] dark:hover:bg-zinc-700'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${isRedOn ? 'bg-white' : 'bg-red-500'}`}></span>
              <span>RED (H13)</span>
            </div>
            <span className="text-[10px] font-normal opacity-85">
              {isRedOn ? 'LIGHT ON' : 'LIGHT OFF'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleToggleLight('H03', 'GREEN')}
            className={`py-3 px-2 rounded-2xl flex flex-col items-center justify-center gap-1 text-[12px] font-bold transition-all border shadow-xs active:scale-95 cursor-pointer ${
              isGreenOn
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-[0_0_14px_rgba(16,185,129,0.5)]'
                : 'bg-[#F5F5F7] dark:bg-zinc-800 text-[#1D1D1F] dark:text-[#F4F4F5] border-black/[0.04] dark:border-white/10 hover:bg-[#EBEBEF] dark:hover:bg-zinc-700'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${isGreenOn ? 'bg-white' : 'bg-emerald-500'}`}></span>
              <span>GREEN (H03)</span>
            </div>
            <span className="text-[10px] font-normal opacity-85">
              {isGreenOn ? 'LIGHT ON' : 'LIGHT OFF'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleToggleLight('H02', 'BLUE')}
            className={`py-3 px-2 rounded-2xl flex flex-col items-center justify-center gap-1 text-[12px] font-bold transition-all border shadow-xs active:scale-95 cursor-pointer ${
              isBlueOn
                ? 'bg-blue-600 text-white border-blue-700 shadow-[0_0_14px_rgba(37,99,235,0.5)]'
                : 'bg-[#F5F5F7] dark:bg-zinc-800 text-[#1D1D1F] dark:text-[#F4F4F5] border-black/[0.04] dark:border-white/10 hover:bg-[#EBEBEF] dark:hover:bg-zinc-700'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${isBlueOn ? 'bg-white' : 'bg-blue-500'}`}></span>
              <span>BLUE (H02)</span>
            </div>
            <span className="text-[10px] font-normal opacity-85">
              {isBlueOn ? 'LIGHT ON' : 'LIGHT OFF'}
            </span>
          </button>
        </div>

        {/* Color Presets */}
        <div className="flex flex-col gap-1.5 pt-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B] dark:text-[#A1A1AA]">
            Atmospheric Mood Presets
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handleApplyPresetColor(255, 0, 0, 'Pure Red')}
              className="px-3 py-1.5 rounded-xl bg-[#F5F5F7] dark:bg-zinc-800 hover:bg-[#EBEBEF] dark:hover:bg-zinc-700 text-[11px] font-semibold text-[#1D1D1F] dark:text-[#F4F4F5] flex items-center gap-1.5 border border-black/[0.03] dark:border-white/10 active:scale-95 cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-red-600"></span> Red
            </button>
            <button
              type="button"
              onClick={() => handleApplyPresetColor(0, 255, 0, 'Pure Green')}
              className="px-3 py-1.5 rounded-xl bg-[#F5F5F7] dark:bg-zinc-800 hover:bg-[#EBEBEF] dark:hover:bg-zinc-700 text-[11px] font-semibold text-[#1D1D1F] dark:text-[#F4F4F5] flex items-center gap-1.5 border border-black/[0.03] dark:border-white/10 active:scale-95 cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Green
            </button>
            <button
              type="button"
              onClick={() => handleApplyPresetColor(0, 0, 255, 'Pure Blue')}
              className="px-3 py-1.5 rounded-xl bg-[#F5F5F7] dark:bg-zinc-800 hover:bg-[#EBEBEF] dark:hover:bg-zinc-700 text-[11px] font-semibold text-[#1D1D1F] dark:text-[#F4F4F5] flex items-center gap-1.5 border border-black/[0.03] dark:border-white/10 active:scale-95 cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-blue-600"></span> Blue
            </button>
            <button
              type="button"
              onClick={() => handleApplyPresetColor(255, 140, 0, 'Warm Amber')}
              className="px-3 py-1.5 rounded-xl bg-[#F5F5F7] dark:bg-zinc-800 hover:bg-[#EBEBEF] dark:hover:bg-zinc-700 text-[11px] font-semibold text-[#1D1D1F] dark:text-[#F4F4F5] flex items-center gap-1.5 border border-black/[0.03] dark:border-white/10 active:scale-95 cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-amber-500"></span> Amber
            </button>
            <button
              type="button"
              onClick={() => handleApplyPresetColor(180, 0, 255, 'Lavender Purple')}
              className="px-3 py-1.5 rounded-xl bg-[#F5F5F7] dark:bg-zinc-800 hover:bg-[#EBEBEF] dark:hover:bg-zinc-700 text-[11px] font-semibold text-[#1D1D1F] dark:text-[#F4F4F5] flex items-center gap-1.5 border border-black/[0.03] dark:border-white/10 active:scale-95 cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-purple-600"></span> Purple
            </button>
            <button
              type="button"
              onClick={() => handleApplyPresetColor(0, 200, 255, 'Glacial Cyan')}
              className="px-3 py-1.5 rounded-xl bg-[#F5F5F7] dark:bg-zinc-800 hover:bg-[#EBEBEF] dark:hover:bg-zinc-700 text-[11px] font-semibold text-[#1D1D1F] dark:text-[#F4F4F5] flex items-center gap-1.5 border border-black/[0.03] dark:border-white/10 active:scale-95 cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span> Cyan
            </button>
            <button
              type="button"
              onClick={() => handleApplyPresetColor(255, 255, 255, 'Full White')}
              className="px-3 py-1.5 rounded-xl bg-[#F5F5F7] dark:bg-zinc-800 hover:bg-[#EBEBEF] dark:hover:bg-zinc-700 text-[11px] font-semibold text-[#1D1D1F] dark:text-[#F4F4F5] flex items-center gap-1.5 border border-black/[0.03] dark:border-white/10 active:scale-95 cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-white border border-black/20 dark:border-white/30"></span> White
            </button>
            <button
              type="button"
              onClick={() => handleApplyPresetColor(0, 0, 0, 'Lights Off')}
              className="px-3 py-1.5 rounded-xl bg-[#F5F5F7] dark:bg-zinc-800 text-[#1D1D1F] dark:text-[#F4F4F5] hover:bg-[#EBEBEF] dark:hover:bg-zinc-700 border border-black/[0.04] dark:border-white/15 text-[11px] font-semibold flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[13px]">light_off</span> All Off
            </button>
          </div>
        </div>

        {lightNotice && (
          <p className="text-[11px] font-semibold text-blue-700 bg-blue-50 p-2.5 rounded-xl border border-blue-100">
            {lightNotice}
          </p>
        )}
      </div>

      {/* DYNAMIC CARTRIDGE ASSIGNMENT & SMELL HUB */}
      <CartridgeManagerHub
        cartridges={cartridges}
        activeChannels={activeChannels}
        onEditChannel={handleOpenEditChannel}
        onResetDefaults={resetCartridgeDefaults}
        onQuickAssign={handleQuickAssign}
        onTestChannel={(ch, sec) => handleTest(ch, sec)}
        activeTestChannel={activeTestChannel}
        testRemaining={testRemaining}
      />

      {/* MASTER BOARD H01 - H17 */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <h2 className="text-[18px] font-semibold tracking-tight text-[#1D1D1F]">
              Master Board (H01–H17)
            </h2>
          </div>
          <span className="text-[11px] font-mono font-medium text-[#86868B]">
            Indices 0–16
          </span>
        </div>
        <div className="space-y-2">
          {masterChannels.map((ch) => renderChannelCard(ch))}
        </div>
      </div>

      {/* SLAVE BOARD H18 - H34 */}
      <div className="flex flex-col gap-3 mt-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
            <h2 className="text-[18px] font-semibold tracking-tight text-[#1D1D1F]">
              Slave Board (H18–H34)
            </h2>
          </div>
          <span className="text-[11px] font-mono font-medium text-[#86868B]">
            ESP-NOW • Indices 0–16
          </span>
        </div>
        <div className="space-y-2">
          {slaveChannels.map((ch) => renderChannelCard(ch))}
        </div>
      </div>

      {/* Cartridge Editor Modal */}
      <CartridgeEditorModal
        channel={editingChannel}
        isOpen={isEditorModalOpen}
        onClose={() => {
          setIsEditorModalOpen(false);
          setEditingChannel(null);
        }}
        onSave={async (channelId, updates) => {
          return await updateCartridgeChannel(channelId, updates);
        }}
      />

      {/* Claim Device Modal */}
      <ClaimDeviceModal isOpen={isClaimModalOpen} onClose={() => setIsClaimModalOpen(false)} />
    </div>
  );
};

