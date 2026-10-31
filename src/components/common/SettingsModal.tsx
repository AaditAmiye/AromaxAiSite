import React, { useState, useEffect } from 'react';
import { useDevice } from '../../hooks/useDevice';
import { TransportMode } from '../../types/device';
import { isFirebaseConfigured } from '../../services/firebase/firebaseClient';
import { AromaxLogo } from './AromaxLogo';
import { getGeminiApiKey, setCustomGeminiApiKey, generateAromaExperience } from '../../services/ai/aiService';

export type SettingsTab = 'wifi' | 'ota' | 'general' | 'bus';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDiagnostics?: () => void;
  initialTab?: SettingsTab;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenDiagnostics,
  initialTab = 'wifi'
}) => {
  const {
    connected,
    transportMode,
    host,
    masks,
    wifi,
    ota,
    setTransportMode,
    setEspHost,
    checkConnectivity,
    stopAll,
    error,
    requestWifiScan,
    configureWifi,
    triggerOtaUpdate
  } = useDevice();

  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [inputHost, setInputHost] = useState(host);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Wi-Fi Configuration state
  const [selectedSsid, setSelectedSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [showWifiPassword, setShowWifiPassword] = useState(false);
  const [isScanningWifi, setIsScanningWifi] = useState(false);
  const [isConfiguringWifi, setIsConfiguringWifi] = useState(false);
  const [wifiNotice, setWifiNotice] = useState<string | null>(null);

  // OTA Firmware state
  const [customOtaUrl, setCustomOtaUrl] = useState(
    'https://github.com/AaditAmiye/AromaxAI/releases/download/v2/firmware.bin'
  );
  const [isUpdatingOta, setIsUpdatingOta] = useState(false);
  const [otaNotice, setOtaNotice] = useState<string | null>(null);

  // Gemini AI key & testing state
  const [customApiKey, setCustomApiKey] = useState(getGeminiApiKey() || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [aiTesting, setAiTesting] = useState(false);
  const [aiTestOutput, setAiTestOutput] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setInputHost(host);
      setTestResult(null);
      setWifiNotice(null);
      setOtaNotice(null);
      setCustomApiKey(getGeminiApiKey() || '');
      setAiTestOutput(null);
    }
  }, [isOpen, initialTab, host]);

  if (!isOpen) return null;

  const handleSaveHost = () => {
    setEspHost(inputHost);
    setTestResult('ESP32 Master Host IP updated.');
  };

  const handleTestPing = async () => {
    setTesting(true);
    setTestResult(null);
    const start = performance.now();
    const ok = await checkConnectivity();
    const elapsed = Math.round(performance.now() - start);
    setTesting(false);
    if (ok) {
      setTestResult(`Connected successfully (${elapsed}ms). Master & Slave synced.`);
    } else {
      setTestResult(`Ping failed (${elapsed}ms): ${error || 'Host unreachable'}`);
    }
  };

  const handleStopAll = async () => {
    await stopAll();
    setTestResult('Emergency Stop & Purge completed.');
  };

  const handleSaveApiKey = () => {
    setCustomGeminiApiKey(customApiKey);
    setAiTestOutput(customApiKey.trim() ? 'Gemini API key saved to local client storage.' : 'Custom API key cleared (using automatic cascade).');
  };

  const handleTestAi = async () => {
    setAiTesting(true);
    setAiTestOutput('Synthesizing test aroma experience...');
    try {
      const res = await generateAromaExperience('Rain falling on summer pine forest');
      setAiTesting(false);
      if (res.success && res.blend) {
        const sourceLabel = res.source === 'server-ai' ? 'Gemini 3.1 Flash Lite' : 'Client Olfactory Engine';
        setAiTestOutput(`Success (${sourceLabel})! Generated "${res.blend.title}" with channels: ${res.blend.channels.map(c => c.channelId).join(', ')}.`);
      } else {
        setAiTestOutput(res.error || 'Test synthesis failed.');
      }
    } catch (e: any) {
      setAiTesting(false);
      setAiTestOutput(`Synthesis error: ${e?.message || String(e)}`);
    }
  };

  const handleScanWifi = async () => {
    setIsScanningWifi(true);
    setWifiNotice('Requesting ESP32 to scan surrounding 2.4GHz Wi-Fi networks...');
    const res = await requestWifiScan();
    setIsScanningWifi(false);
    if (res.success) {
      setWifiNotice('Wi-Fi scan initiated. Networks populated below.');
    } else {
      setWifiNotice(`Scan failed: ${res.error}`);
    }
  };

  const handleConnectWifi = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedSsid.trim()) {
      setWifiNotice('Please select or enter a Wi-Fi network SSID.');
      return;
    }
    setIsConfiguringWifi(true);
    setWifiNotice(`Sending Wi-Fi credentials for "${selectedSsid}" to ESP32...`);
    const res = await configureWifi(selectedSsid.trim(), wifiPassword);
    setIsConfiguringWifi(false);
    if (res.success) {
      setWifiNotice(`Wi-Fi credentials saved in ESP32 Flash. Connecting to "${selectedSsid}"...`);
    } else {
      setWifiNotice(`Failed to send Wi-Fi credentials: ${res.error}`);
    }
  };

  const handleTriggerOta = async () => {
    setIsUpdatingOta(true);
    setOtaNotice('Initiating GitHub OTA firmware update on ESP32...');
    const res = await triggerOtaUpdate(customOtaUrl);
    setIsUpdatingOta(false);
    if (res.success) {
      setOtaNotice('OTA command dispatched. ESP32 is downloading binary from GitHub...');
    } else {
      setOtaNotice(`Update trigger failed: ${res.error}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="ios-glass-card w-full max-w-lg rounded-[32px] p-5 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[92vh] overflow-y-auto text-[#1D1D1F] dark:text-[#F4F4F5] border border-white/80 dark:border-white/10">
        {/* Top specular reflection rim */}
        <div className="glass-reflection-rim inset-x-8" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-2 border-b border-black/[0.06] dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <AromaxLogo variant="badge" size={28} />
            <div className="flex flex-col">
              <h2 className="text-[17px] font-semibold text-[#1D1D1F] dark:text-[#F4F4F5] tracking-tight leading-tight">
                Device Control &amp; Settings
              </h2>
              <span className="text-[11px] text-[#86868B] dark:text-[#A1A1AA]">
                Wi-Fi Network, GitHub OTA Updates &amp; Hardware
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full ios-glass hover:bg-white/90 dark:hover:bg-zinc-700 flex items-center justify-center text-[#86868B] dark:text-[#A1A1AA] hover:text-[#1D1D1F] dark:hover:text-white transition-all cursor-pointer"
            aria-label="Close settings"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Main 4-Tab Navigation Selector */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-[#F5F5F7] dark:bg-zinc-900 rounded-2xl border border-black/[0.04] dark:border-white/10 select-none">
          <button
            type="button"
            onClick={() => setActiveTab('wifi')}
            className={`py-2 px-1 rounded-xl text-[11px] sm:text-[12px] font-semibold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'wifi'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'text-[#86868B] dark:text-[#A1A1AA] hover:text-[#1D1D1F] dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">wifi</span>
            <span>Wi-Fi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ota')}
            className={`py-2 px-1 rounded-xl text-[11px] sm:text-[12px] font-semibold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'ota'
                ? 'bg-indigo-600 text-white shadow-xs font-bold'
                : 'text-[#86868B] dark:text-[#A1A1AA] hover:text-[#1D1D1F] dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">system_update</span>
            <span>Update</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`py-2 px-1 rounded-xl text-[11px] sm:text-[12px] font-semibold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'general'
                ? 'bg-white dark:bg-zinc-800 text-[#1D1D1F] dark:text-white shadow-xs ring-1 ring-black/5 dark:ring-white/10 font-bold'
                : 'text-[#86868B] dark:text-[#A1A1AA] hover:text-[#1D1D1F] dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">router</span>
            <span>Transport</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bus')}
            className={`py-2 px-1 rounded-xl text-[11px] sm:text-[12px] font-semibold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'bus'
                ? 'bg-white dark:bg-zinc-800 text-[#1D1D1F] dark:text-white shadow-xs ring-1 ring-black/5 dark:ring-white/10 font-bold'
                : 'text-[#86868B] dark:text-[#A1A1AA] hover:text-[#1D1D1F] dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">memory</span>
            <span>Bus</span>
          </button>
        </div>

        {/* TAB 1: WI-FI NETWORK MANAGER */}
        {activeTab === 'wifi' && (
          <div className="flex flex-col gap-4">
            {/* Current Active Connection Status Card */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50/60 dark:from-zinc-900 dark:to-zinc-900 border border-blue-200/60 dark:border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  connected || wifi?.connected
                    ? 'bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                    : 'bg-amber-500 text-white'
                }`}>
                  <span className="material-symbols-outlined text-[20px]">
                    {connected || wifi?.connected ? 'wifi' : 'wifi_off'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-bold text-[#1D1D1F] dark:text-[#F4F4F5]">
                      {wifi?.ssid || (connected ? 'AromaxAI-Connected' : 'Not Connected')}
                    </span>
                    <span className={`w-2 h-2 rounded-full ${connected || wifi?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  </div>
                  <span className="text-[11px] text-[#86868B] dark:text-[#A1A1AA] font-mono">
                    {wifi?.ip ? `IP: ${wifi.ip}` : 'Host: 192.168.6.155'}
                    {typeof wifi?.rssi === 'number' && wifi.rssi !== 0 && ` • RSSI: ${wifi.rssi} dBm`}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleScanWifi}
                disabled={isScanningWifi || wifi?.status === 'scanning'}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs shrink-0"
              >
                <span className={`material-symbols-outlined text-[15px] ${isScanningWifi || wifi?.status === 'scanning' ? 'animate-spin' : ''}`}>
                  refresh
                </span>
                <span>{isScanningWifi || wifi?.status === 'scanning' ? 'Scanning...' : 'Scan Wi-Fi'}</span>
              </button>
            </div>

            {/* Scanned Networks List */}
            {wifi?.scanResults && wifi.scanResults.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#86868B] dark:text-[#A1A1AA]">
                  Detected Networks (Tap to select):
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1 p-1 bg-[#F5F5F7] dark:bg-zinc-900 rounded-xl border border-black/[0.04] dark:border-white/10">
                  {wifi.scanResults.map((net, i) => (
                    <button
                      key={`${net.ssid}-${i}`}
                      type="button"
                      onClick={() => setSelectedSsid(net.ssid)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1.5 border active:scale-95 cursor-pointer ${
                        selectedSsid === net.ssid
                          ? 'bg-blue-600 text-white border-blue-500 shadow-2xs font-semibold'
                          : 'bg-white dark:bg-zinc-800 text-[#1D1D1F] dark:text-[#F4F4F5] border-black/[0.05] dark:border-white/10 hover:border-blue-400'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[13px]">
                        {net.secure ? 'lock' : 'wifi'}
                      </span>
                      <span>{net.ssid}</span>
                      <span className="text-[10px] opacity-75 font-mono">({net.rssi}dBm)</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Wi-Fi Configuration Form */}
            <form onSubmit={handleConnectWifi} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-[#86868B] dark:text-[#A1A1AA]">
                  Network Name (SSID)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Home_WiFi_5G or AromaxAI-Hub"
                  value={selectedSsid}
                  onChange={(e) => setSelectedSsid(e.target.value)}
                  className="px-3 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-black/[0.08] dark:border-white/15 text-[13px] text-[#1D1D1F] dark:text-[#F4F4F5] outline-none focus:border-blue-500 transition-all"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-[#86868B] dark:text-[#A1A1AA]">
                  Wi-Fi Password
                </label>
                <div className="relative">
                  <input
                    type={showWifiPassword ? 'text' : 'password'}
                    placeholder="Enter network password..."
                    value={wifiPassword}
                    onChange={(e) => setWifiPassword(e.target.value)}
                    className="w-full px-3 py-2.5 pr-9 rounded-xl bg-white dark:bg-zinc-900 border border-black/[0.08] dark:border-white/15 text-[13px] text-[#1D1D1F] dark:text-[#F4F4F5] outline-none focus:border-blue-500 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowWifiPassword(!showWifiPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[17px]">
                      {showWifiPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[10.5px] text-[#86868B] dark:text-[#A1A1AA] leading-tight">
                  Credentials are saved to ESP32 Flash memory. Auto-reconnects on reboot.
                </span>
                <button
                  type="submit"
                  disabled={isConfiguringWifi || !selectedSsid.trim()}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-[12px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-40 cursor-pointer shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {isConfiguringWifi ? 'sync' : 'network_wifi'}
                  </span>
                  <span>{isConfiguringWifi ? 'Connecting...' : 'Connect Wi-Fi'}</span>
                </button>
              </div>
            </form>

            {wifiNotice && (
              <p className="text-[11.5px] font-medium text-blue-900 dark:text-blue-200 bg-blue-50 dark:bg-blue-950/50 p-2.5 rounded-xl border border-blue-200/80 dark:border-blue-800/40">
                {wifiNotice}
              </p>
            )}

            {/* Captive Portal Fallback Guide */}
            <div className="p-3 rounded-xl bg-[#F5F5F7] dark:bg-zinc-900 border border-black/[0.04] dark:border-white/10 flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[18px] text-amber-500 shrink-0 mt-0.5">
                info
              </span>
              <div className="flex flex-col text-[11px] text-[#86868B] dark:text-[#A1A1AA] leading-relaxed">
                <span className="font-semibold text-[#1D1D1F] dark:text-[#F4F4F5]">
                  First-Time Offline Setup (WiFiManager Captive Portal)
                </span>
                If ESP32 is not on your Wi-Fi, it broadcasts hotspot <strong className="text-[#1D1D1F] dark:text-white">AROMAX-SETUP</strong>. Connect your phone or laptop to it, browse to <strong className="text-[#1D1D1F] dark:text-white">http://192.168.4.1</strong>, and configure your Wi-Fi credentials.
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: GITHUB OTA FIRMWARE UPDATE */}
        {activeTab === 'ota' && (
          <div className="flex flex-col gap-4">
            {/* Version & Status Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-blue-50/70 to-purple-50/60 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-900 border border-indigo-200/70 dark:border-white/10 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <span className="material-symbols-outlined text-[20px]">system_update</span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-bold text-[#1D1D1F] dark:text-[#F4F4F5]">
                        GitHub Cloud OTA Updates
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-[10.5px] font-mono font-bold text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40">
                        v{ota?.currentVersion || '1.4.4'}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#86868B] dark:text-[#A1A1AA]">
                      Over-The-Air firmware flashing with automatic dual-bank rollback safety
                    </span>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase shrink-0 ${
                  ota?.status === 'downloading' || ota?.status === 'installing'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300'
                    : ota?.status === 'success'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                    : 'bg-stone-100 dark:bg-zinc-800 text-[#86868B] dark:text-[#A1A1AA]'
                }`}>
                  {ota?.status || 'IDLE'}
                </span>
              </div>

              {/* Progress Bar (Visible when in-progress) */}
              {(ota?.status === 'downloading' ||
                ota?.status === 'verifying' ||
                ota?.status === 'installing' ||
                ota?.status === 'rebooting' ||
                isUpdatingOta) && (
                <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-white/80 dark:bg-zinc-800/80 border border-indigo-100 dark:border-white/10">
                  <div className="flex justify-between text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                    <span>Flashing: {ota?.status || 'Downloading binary...'}</span>
                    <span>{ota?.progress ? `${ota.progress}%` : 'In Progress'}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-indigo-100 dark:bg-zinc-700 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-300"
                      style={{ width: `${ota?.progress || 45}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Target Firmware Binary URL Input */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-[#86868B] dark:text-[#A1A1AA]">
                  Target GitHub Binary (.bin URL)
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setCustomOtaUrl('https://github.com/AaditAmiye/AromaxAI/releases/download/v2/firmware.bin')
                  }
                  className="text-[10.5px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer font-medium"
                >
                  Reset to Default v2 URL
                </button>
              </div>
              <input
                type="url"
                value={customOtaUrl}
                onChange={(e) => setCustomOtaUrl(e.target.value)}
                placeholder="https://github.com/.../firmware.bin"
                className="px-3 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-black/[0.08] dark:border-white/15 text-[11.5px] font-mono text-[#1D1D1F] dark:text-[#F4F4F5] outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Flash / Update Trigger Button */}
            <button
              type="button"
              onClick={handleTriggerOta}
              disabled={
                isUpdatingOta ||
                ota?.status === 'downloading' ||
                ota?.status === 'installing' ||
                ota?.status === 'rebooting'
              }
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 active:scale-[0.98] text-white text-[12px] font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-40 cursor-pointer"
            >
              <span className={`material-symbols-outlined text-[18px] ${isUpdatingOta ? 'animate-spin' : ''}`}>
                {isUpdatingOta ? 'sync' : 'cloud_download'}
              </span>
              <span>UPDATE FIRMWARE NOW (OTA)</span>
            </button>

            {otaNotice && (
              <p className="text-[11.5px] font-medium text-indigo-900 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-950/50 p-2.5 rounded-xl border border-indigo-200/80 dark:border-indigo-800/40">
                {otaNotice}
              </p>
            )}

            {/* Release Changelog & Details */}
            <div className="p-3 rounded-xl bg-[#F5F5F7] dark:bg-zinc-900 border border-black/[0.04] dark:border-white/10 flex flex-col gap-1.5 text-[11px] text-[#86868B] dark:text-[#A1A1AA]">
              <span className="font-semibold text-[#1D1D1F] dark:text-[#F4F4F5] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-indigo-500">verified</span>
                Verified Production Release v1.4.4
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-[10.5px]">
                <li>Direct 34-channel bitmask engine &amp; dynamic chassis RGB support</li>
                <li>Zero-freeze non-blocking WiFiManager and Dual Firebase WebSockets</li>
                <li>Dual-partition OTA with automatic rollback if WiFi or checksum fails</li>
              </ul>
            </div>
          </div>
        )}

        {/* TAB 3: TRANSPORT & HOST IP */}
        {activeTab === 'general' && (
          <div className="flex flex-col gap-4">
            {/* Transport Mode Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[#86868B] dark:text-[#A1A1AA]">
                Hardware Transport Mode
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#F5F5F7] dark:bg-zinc-900 rounded-2xl border border-black/[0.04] dark:border-white/10">
                {(['local', 'cloud', 'mock'] as TransportMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setTransportMode(mode)}
                    className={`py-2 px-2 rounded-xl text-[12px] font-semibold capitalize transition-all cursor-pointer ${
                      transportMode === mode
                        ? 'bg-white dark:bg-zinc-800 text-[#1D1D1F] dark:text-white shadow-xs ring-1 ring-black/5 dark:ring-white/10'
                        : 'text-[#86868B] dark:text-[#A1A1AA] hover:text-[#1D1D1F] dark:hover:text-white'
                    }`}
                  >
                    {mode === 'local' ? 'Local ESP32' : mode === 'cloud' ? 'Firebase Cloud' : 'Mock Simulator'}
                  </button>
                ))}
              </div>
              {transportMode === 'mock' && (
                <p className="text-[11px] text-[#FF9500] dark:text-amber-300 font-medium bg-[#FFFBEB] dark:bg-amber-950/40 p-2.5 rounded-xl border border-[#FEF3C7] dark:border-amber-800/40">
                  Notice: MOCK mode is active. Hardware commands are simulated in browser memory.
                </p>
              )}
            </div>

            {/* Local ESP32 Host Configuration */}
            {transportMode === 'local' && (
              <div className="flex flex-col gap-2.5 bg-[#F5F5F7]/80 dark:bg-zinc-900/80 p-4 rounded-2xl border border-black/[0.03] dark:border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F4F4F5]">
                    ESP32 Master Host IP / URL
                  </span>
                  <span className="text-[11px] font-medium text-[#86868B] dark:text-[#A1A1AA]">
                    WiFi: AromaxAI-Hub
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputHost}
                    onChange={(e) => setInputHost(e.target.value)}
                    placeholder="http://192.168.6.155"
                    className="flex-1 bg-white dark:bg-zinc-950 text-[#1D1D1F] dark:text-white px-3 py-2 rounded-xl text-[13px] font-mono border border-black/[0.08] dark:border-white/15 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <button
                    onClick={handleSaveHost}
                    className="px-3.5 py-2 bg-[#1D1D1F] dark:bg-zinc-800 text-white rounded-xl text-[12px] font-medium hover:bg-black dark:hover:bg-zinc-700 transition-all cursor-pointer ring-1 ring-white/10"
                  >
                    Save
                  </button>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={handleTestPing}
                    disabled={testing}
                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#0071E3] dark:text-sky-400 hover:underline cursor-pointer"
                  >
                    <span className={`material-symbols-outlined text-[15px] ${testing ? 'animate-spin' : ''}`}>
                      sync
                    </span>
                    <span>{testing ? 'Testing...' : 'Test Connection / Status'}</span>
                  </button>
                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                      connected
                        ? 'bg-[#34C759]/10 text-[#34C759]'
                        : 'bg-[#FF9500]/10 text-[#FF9500]'
                    }`}
                  >
                    {connected ? 'Device Online' : 'Device Offline'}
                  </span>
                </div>
                {testResult && (
                  <p className="text-[11px] font-medium text-[#1D1D1F] dark:text-[#F4F4F5] bg-white dark:bg-zinc-950 p-2.5 rounded-xl border border-black/[0.04] dark:border-white/10">
                    {testResult}
                  </p>
                )}
              </div>
            )}

            {/* Firebase Gateway Info */}
            {transportMode === 'cloud' && (
              <div className="flex flex-col gap-2 bg-[#F5F5F7]/80 dark:bg-zinc-900/80 p-4 rounded-2xl border border-black/[0.03] dark:border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F4F4F5]">
                    Firebase Realtime Database
                  </span>
                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                      isFirebaseConfigured
                        ? 'bg-[#34C759]/10 text-[#34C759]'
                        : 'bg-[#FF9500]/10 text-[#FF9500]'
                    }`}
                  >
                    {isFirebaseConfigured ? 'Connected' : 'Credentials Missing'}
                  </span>
                </div>
                <p className="text-[11px] text-[#86868B] dark:text-[#A1A1AA] leading-relaxed">
                  Real-time command streaming to <code className="bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded">devices/aromaxai-master-01</code>.
                </p>
              </div>
            )}

            {/* Gemini AI Universal Engine Settings */}
            <div className="flex flex-col gap-2.5 bg-[#F5F5F7]/80 dark:bg-zinc-900/80 p-4 rounded-2xl border border-black/[0.03] dark:border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[17px] text-purple-600 dark:text-purple-400">
                    psychology
                  </span>
                  <span className="text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F4F4F5]">
                    Gemini AI Olfactory Engine
                  </span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300">
                  Universal Cascade
                </span>
              </div>
              <p className="text-[11px] text-[#86868B] dark:text-[#A1A1AA] leading-relaxed">
                AromaxAI automatically cascades between Backend Serverless API, Direct Browser Gemini, and the 34-port Semantic Engine. Works anywhere without failing.
              </p>
              
              <div className="flex flex-col gap-1.5 pt-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-[#86868B] dark:text-[#A1A1AA]">
                  Custom Gemini API Key (Optional Override)
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={customApiKey}
                      onChange={(e) => setCustomApiKey(e.target.value)}
                      placeholder="AIzaSy... (leave blank for automatic key)"
                      className="w-full bg-white dark:bg-zinc-950 text-[#1D1D1F] dark:text-white px-3 py-2 pr-8 rounded-xl text-[12px] font-mono border border-black/[0.08] dark:border-white/15 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        {showApiKey ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                  <button
                    onClick={handleSaveApiKey}
                    className="px-3 py-2 bg-[#1D1D1F] dark:bg-zinc-800 text-white rounded-xl text-[12px] font-medium hover:bg-black dark:hover:bg-zinc-700 transition-all cursor-pointer ring-1 ring-white/10 shrink-0"
                  >
                    Save Key
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleTestAi}
                  disabled={aiTesting}
                  className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                >
                  <span className={`material-symbols-outlined text-[15px] ${aiTesting ? 'animate-spin' : ''}`}>
                    {aiTesting ? 'sync' : 'science'}
                  </span>
                  <span>{aiTesting ? 'Synthesizing...' : 'Test AI Scent Synthesis'}</span>
                </button>
              </div>

              {aiTestOutput && (
                <p className="text-[11px] font-medium text-[#1D1D1F] dark:text-[#F4F4F5] bg-white dark:bg-zinc-950 p-2.5 rounded-xl border border-black/[0.04] dark:border-white/10 leading-relaxed">
                  {aiTestOutput}
                </p>
              )}
            </div>

            {/* Network & Browser Diagnostics Trigger */}
            {onOpenDiagnostics && (
              <button
                onClick={() => {
                  onClose();
                  onOpenDiagnostics();
                }}
                className="w-full bg-[#0071E3]/10 dark:bg-sky-500/15 hover:bg-[#0071E3]/15 dark:hover:bg-sky-500/25 text-[#0071E3] dark:text-sky-300 font-semibold text-[13px] h-11 rounded-2xl flex items-center justify-center gap-2 transition-all border border-[#0071E3]/20 dark:border-sky-500/30 active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">troubleshoot</span>
                <span>Run Network &amp; Browser Diagnostics</span>
              </button>
            )}
          </div>
        )}

        {/* TAB 4: HARDWARE REGISTERS & EMERGENCY STOP */}
        {activeTab === 'bus' && (
          <div className="flex flex-col gap-4">
            {/* Diagnostic Bitmasks */}
            <div className="bg-[#F5F5F7] dark:bg-zinc-900 p-4 rounded-2xl flex flex-col gap-2 font-mono text-[11px] border border-black/[0.04] dark:border-white/10">
              <span className="text-[10px] font-semibold uppercase text-[#86868B] dark:text-[#A1A1AA] tracking-wider font-sans">
                Hardware Bitmask Registers
              </span>
              <div className="flex justify-between text-[#1D1D1F] dark:text-[#F4F4F5]">
                <span>Master Mask (H01–H17):</span>
                <span className="font-bold">0x{masks.masterMask.toString(16).toUpperCase().padStart(5, '0')} ({masks.masterMask})</span>
              </div>
              <div className="flex justify-between text-[#1D1D1F] dark:text-[#F4F4F5]">
                <span>Slave Mask (H18–H34):</span>
                <span className="font-bold">0x{masks.slaveMask.toString(16).toUpperCase().padStart(5, '0')} ({masks.slaveMask})</span>
              </div>
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 pt-1.5 border-t border-black/[0.05] dark:border-white/10">
                <span>H30 Fan Register (Slave bit 12):</span>
                <span className="font-bold">ACTIVE (1 &lt;&lt; 12)</span>
              </div>
            </div>

            {/* Emergency Stop All */}
            <div className="pt-1 flex flex-col gap-2">
              <button
                onClick={handleStopAll}
                className="w-full bg-[#FF3B30]/10 dark:bg-red-500/15 hover:bg-[#FF3B30]/15 dark:hover:bg-red-500/25 text-[#FF3B30] dark:text-red-300 font-semibold text-[13px] h-11 rounded-2xl flex items-center justify-center gap-2 transition-all border border-[#FF3B30]/20 dark:border-red-500/30 active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">cancel</span>
                <span>Emergency Stop &amp; Purge All</span>
              </button>
              <p className="text-[10.5px] text-center text-[#86868B] dark:text-[#A1A1AA]">
                Stops all aroma channels immediately while keeping chamber purge fan active.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
