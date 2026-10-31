import React, { useState } from 'react';
import { db, isFirebaseConfigured } from '../../services/firebase/firebaseClient';
import { ref, get, set } from 'firebase/database';
import { useDevice } from '../../hooks/useDevice';

interface DiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DiagnosticItem {
  id: string;
  name: string;
  category: 'browser' | 'local' | 'cloud';
  status: 'pending' | 'running' | 'pass' | 'fail' | 'warn';
  message: string;
  latencyMs?: number;
  details?: Record<string, unknown>;
}

export const DiagnosticModal: React.FC<DiagnosticModalProps> = ({ isOpen, onClose }) => {
  const { host, transportMode, setTransportMode, turnAllOn, turnAllOff, isAllOn, setUnassignedPins, areAllUnassignedOn } = useDevice();
  const [isRunning, setIsRunning] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticItem[]>([]);

  if (!isOpen) return null;

  const runAllDiagnostics = async () => {
    setIsRunning(true);
    const results: DiagnosticItem[] = [];

    // --------------------------------------------------------
    // 1. BROWSER SECURITY & MIXED CONTENT AUDIT
    // --------------------------------------------------------
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const isLocalhost =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    results.push({
      id: 'browser-protocol',
      name: 'Origin Protocol & Context',
      category: 'browser',
      status: isHttps ? 'warn' : 'pass',
      message: isHttps
        ? `Running on HTTPS (${window.location.origin}). Modern browsers enforce Strict Mixed Content & Private Network Access restrictions on local IP HTTP calls.`
        : `Running on HTTP (${window.location.origin}). Local private network HTTP calls are permitted without Mixed Content restrictions.`
    });

    results.push({
      id: 'browser-mixed-content',
      name: 'Browser Mixed Content Policy',
      category: 'browser',
      status: isHttps ? 'warn' : 'pass',
      message: isHttps
        ? 'Direct browser requests from https:// to http://192.168.6.155 are blocked by browser security. Use "Firebase Cloud" mode or run the app on http://localhost:3000.'
        : 'Browser allows direct local network requests to http://192.168.6.155.'
    });

    // --------------------------------------------------------
    // 2. DIRECT LOCAL ESP32 HTTP PING (http://192.168.6.155/status)
    // --------------------------------------------------------
    const localStart = performance.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(`${host}/status`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timer);
      const elapsed = Math.round(performance.now() - localStart);

      if (res.ok) {
        const data = await res.json();
        results.push({
          id: 'local-direct-ping',
          name: 'Direct ESP32 HTTP LAN Ping',
          category: 'local',
          status: 'pass',
          latencyMs: elapsed,
          message: `Directly reachable at ${host} (${elapsed}ms). CORS headers accepted. Firmware: ${data.firmware || '1.2.1'}. Fan H30: ${data.fanH30 ? 'ACTIVE' : 'OFF'}.`,
          details: data
        });
      } else {
        results.push({
          id: 'local-direct-ping',
          name: 'Direct ESP32 HTTP LAN Ping',
          category: 'local',
          status: 'fail',
          latencyMs: elapsed,
          message: `ESP32 returned HTTP ${res.status}: ${res.statusText}.`
        });
      }
    } catch (err: unknown) {
      const elapsed = Math.round(performance.now() - localStart);
      const msg = err instanceof Error ? err.message : String(err);
      results.push({
        id: 'local-direct-ping',
        name: 'Direct ESP32 HTTP LAN Ping',
        category: 'local',
        status: isHttps ? 'warn' : 'fail',
        latencyMs: elapsed,
        message: isHttps
          ? `Direct fetch failed (${msg}). Cause: You are on a cloud HTTPS domain (ais-dev-...run.app). Browsers strictly forbid HTTPS websites from accessing private IPs like 10.162.171.155 (Mixed Content). Switch to "Firebase Cloud" mode or run locally on http://localhost:3000.`
          : `Failed to reach ESP32 at ${host} (${msg}). Ensure your laptop/phone is connected to the same WiFi network and ${host} is powered on.`
      });
    }

    // --------------------------------------------------------
    // 3. SERVER PROXY BRIDGE TEST (/api/device/proxy)
    // --------------------------------------------------------
    const proxyStart = performance.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(`/api/device/proxy?target=${encodeURIComponent(host)}&endpoint=/status`, {
        signal: controller.signal
      });
      clearTimeout(timer);
      const elapsed = Math.round(performance.now() - proxyStart);

      if (res.ok) {
        const data = await res.json();
        results.push({
          id: 'local-proxy-ping',
          name: 'Backend Proxy Bridge',
          category: 'local',
          status: 'pass',
          latencyMs: elapsed,
          message: `Server successfully bridged to ESP32 (${elapsed}ms).`,
          details: data
        });
      } else {
        results.push({
          id: 'local-proxy-ping',
          name: 'Backend Proxy Bridge',
          category: 'local',
          status: 'warn',
          latencyMs: elapsed,
          message: `Bridge reached server, but ESP32 was unreachable from server host (${res.status}). (Normal when server is hosted on cloud remote container).`
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({
        id: 'local-proxy-ping',
        name: 'Backend Proxy Bridge',
        category: 'local',
        status: 'warn',
        message: `Proxy error: ${msg}.`
      });
    }

    // --------------------------------------------------------
    // 4. FIREBASE CLOUD REALTIME GATEWAY TEST
    // --------------------------------------------------------
    if (!isFirebaseConfigured || !db) {
      results.push({
        id: 'firebase-configured',
        name: 'Firebase Cloud Configuration',
        category: 'cloud',
        status: 'warn',
        message: 'Firebase credentials are not configured in client environment variables. Set VITE_FIREBASE_API_KEY and VITE_FIREBASE_DATABASE_URL to enable cloud sync.'
      });
    } else {
      const fbStart = performance.now();
      try {
        // Read heartbeat
        const hbRef = ref(db, 'devices/aromaxai-master-01/heartbeat');
        const hbSnap = await get(hbRef);
        const elapsed = Math.round(performance.now() - fbStart);

        if (hbSnap.exists()) {
          const hbData = hbSnap.val();
          results.push({
            id: 'firebase-heartbeat',
            name: 'Firebase Device Heartbeat',
            category: 'cloud',
            status: 'pass',
            latencyMs: elapsed,
            message: `Heartbeat active! Firmware: ${hbData.firmware || '1.3'}, IP: ${hbData.ip || '10.162.171.155'}, WiFi RSSI: ${hbData.wifiRSSI || 'N/A'} dBm.`,
            details: hbData
          });
        } else {
          results.push({
            id: 'firebase-heartbeat',
            name: 'Firebase Device Heartbeat',
            category: 'cloud',
            status: 'warn',
            message: 'Connected to Firebase, but no heartbeat found at /devices/aromaxai-master-01/heartbeat yet. Verify ESP32 WiFi and Firebase credentials.'
          });
        }

        // Read state
        const stateRef = ref(db, 'devices/aromaxai-master-01/state');
        const stateSnap = await get(stateRef);
        if (stateSnap.exists()) {
          const stateData = stateSnap.val();
          results.push({
            id: 'firebase-state',
            name: 'Firebase Device State',
            category: 'cloud',
            status: 'pass',
            message: `Current state synchronized. MasterMask: 0x${(stateData.masterMask || 0).toString(16).toUpperCase()}, SlaveMask: 0x${(stateData.slaveMask || 0).toString(16).toUpperCase()}, Fan H30: ${stateData.fanH30 ? 'ON' : 'OFF'}.`,
            details: stateData
          });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({
          id: 'firebase-heartbeat',
          name: 'Firebase Cloud Connection',
          category: 'cloud',
          status: 'fail',
          message: `Firebase connection failed: ${msg}. Check security rules and network connection.`
        });
      }
    }

    setDiagnostics(results);
    setIsRunning(false);
  };

  const getStatusIcon = (status: DiagnosticItem['status']) => {
    switch (status) {
      case 'pass':
        return <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>;
      case 'warn':
        return <span className="material-symbols-outlined text-[18px] text-amber-500">warning</span>;
      case 'fail':
        return <span className="material-symbols-outlined text-[18px] text-red-600">error</span>;
      default:
        return <span className="material-symbols-outlined text-[18px] text-gray-400">schedule</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#121216] w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-black/[0.06] dark:border-white/10 flex flex-col gap-5 max-h-[90vh] overflow-y-auto text-[#1D1D1F] dark:text-[#F4F4F5]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-black/[0.05] dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800/50">
              <span className="material-symbols-outlined text-[20px]">troubleshoot</span>
            </div>
            <div>
              <h2 className="text-[17px] font-semibold text-[#1D1D1F] dark:text-[#F4F4F5] tracking-tight">
                System & Network Diagnostics
              </h2>
              <p className="text-[11px] text-[#86868B] dark:text-[#A1A1AA]">
                Verify browser security, direct ESP32 LAN, and Firebase Cloud paths
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F5F5F7] dark:bg-zinc-800 hover:bg-[#EBEBEF] dark:hover:bg-zinc-700 flex items-center justify-center text-[#86868B] dark:text-[#A1A1AA] hover:text-[#1D1D1F] dark:hover:text-white transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between bg-[#F5F5F7] dark:bg-zinc-900 p-3.5 rounded-2xl border border-transparent dark:border-white/10">
          <div className="flex flex-col">
            <span className="text-[12px] font-semibold text-[#1D1D1F] dark:text-[#F4F4F5]">
              Current Mode: <span className="uppercase text-emerald-600 dark:text-emerald-400 font-bold">{transportMode}</span>
            </span>
            <span className="text-[11px] text-[#86868B] dark:text-[#A1A1AA]">
              Target Host: {host} (SSID: AromaxAI-Hub)
            </span>
          </div>
          <button
            onClick={runAllDiagnostics}
            disabled={isRunning}
            className="px-4 py-2 bg-[#1D1D1F] dark:bg-zinc-800 hover:bg-black dark:hover:bg-zinc-700 active:scale-95 text-white rounded-xl text-[12px] font-semibold transition-all flex items-center gap-1.5 shadow-sm ring-1 ring-white/10 cursor-pointer"
          >
            <span className={`material-symbols-outlined text-[16px] ${isRunning ? 'animate-spin' : ''}`}>
              {isRunning ? 'sync' : 'play_arrow'}
            </span>
            <span>{isRunning ? 'Auditing...' : 'Run Full Audit'}</span>
          </button>
        </div>

        {/* Hardware Pin Bus Quick Control (32 Pins) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 rounded-2xl bg-[#F5F5F7] dark:bg-zinc-900 border border-transparent dark:border-white/10">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isAllOn ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse' : 'bg-stone-400 dark:bg-zinc-600'}`}></span>
              <span className="text-[12px] font-semibold text-[#1D1D1F] dark:text-[#F4F4F5]">
                32-Pin Actuator Bus: {isAllOn ? 'ALL ON (Lights OFF)' : 'Idle / Standby'}
              </span>
            </div>
            <span className="text-[11px] text-[#86868B] dark:text-[#A1A1AA] mt-0.5">
              Turn all 31-32 actuator pins on or off (chassis lighting inhibited)
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => turnAllOn()}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold tracking-wide uppercase transition-all active:scale-95 flex items-center gap-1 cursor-pointer ${
                isAllOn ? 'bg-emerald-600 text-white' : 'bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">bolt</span>
              <span>All On</span>
            </button>
            <button
              onClick={() => turnAllOff()}
              className="px-3 py-1.5 rounded-xl bg-stone-200 dark:bg-zinc-800 hover:bg-stone-300 dark:hover:bg-zinc-700 text-[#1D1D1F] dark:text-white text-[11px] font-bold tracking-wide uppercase transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">power_off</span>
              <span>All Off</span>
            </button>
          </div>
        </div>

        {/* Unassigned Pins Quick Control (H01, H12, H17, H26) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/30">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${areAllUnassignedOn ? 'bg-blue-500 animate-pulse' : 'bg-stone-400 dark:bg-zinc-600'}`}></span>
              <span className="text-[12px] font-semibold text-[#1D1D1F] dark:text-[#F4F4F5]">
                Unassigned GPIO Ports: {areAllUnassignedOn ? 'ALL 4 ACTIVE' : 'Standby'}
              </span>
            </div>
            <span className="text-[11px] text-[#86868B] dark:text-[#A1A1AA] mt-0.5">
              Dedicated outputs on H01, H12, H17 (Master) &amp; H26 (Slave)
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setUnassignedPins(true)}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold tracking-wide uppercase transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">bolt</span>
              <span>Aux All On</span>
            </button>
            <button
              onClick={() => setUnassignedPins(false)}
              className="px-3 py-1.5 rounded-xl bg-stone-200 dark:bg-zinc-800 hover:bg-stone-300 dark:hover:bg-zinc-700 text-[#1D1D1F] dark:text-white text-[11px] font-bold tracking-wide uppercase transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">power_off</span>
              <span>Aux All Off</span>
            </button>
          </div>
        </div>

        {/* Results List */}
        {diagnostics.length > 0 ? (
          <div className="space-y-2.5">
            {diagnostics.map((diag) => (
              <div
                key={diag.id}
                className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/10 shadow-xs flex flex-col gap-1 text-[#1D1D1F] dark:text-[#F4F4F5]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(diag.status)}
                    <span className="text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F4F4F5]">{diag.name}</span>
                  </div>
                  {diag.latencyMs !== undefined && (
                    <span className="text-[11px] font-mono font-medium text-[#86868B] dark:text-[#A1A1AA]">
                      {diag.latencyMs} ms
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-[#86868B] dark:text-[#A1A1AA] pl-6 leading-relaxed">{diag.message}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 flex flex-col items-center justify-center text-center gap-2 bg-[#F5F5F7]/50 dark:bg-zinc-900/50 rounded-2xl border border-dashed border-black/[0.08] dark:border-white/10">
            <span className="material-symbols-outlined text-[32px] text-gray-400 dark:text-zinc-500">speed</span>
            <p className="text-[13px] font-medium text-[#1D1D1F] dark:text-[#F4F4F5]">No diagnostic run yet</p>
            <p className="text-[11px] text-[#86868B] dark:text-[#A1A1AA] max-w-xs">
              Click &quot;Run Full Audit&quot; to test your local network, browser policies, and Firebase gateway status.
            </p>
          </div>
        )}

        {/* Cloud vs Local Recommendation Card */}
        <div className="bg-blue-50/70 dark:bg-sky-950/40 border border-blue-200/60 dark:border-sky-800/40 p-4 rounded-2xl flex flex-col gap-2 text-[12px] text-blue-900 dark:text-sky-200">
          <div className="flex items-center gap-1.5 font-bold">
            <span className="material-symbols-outlined text-[17px] text-blue-600 dark:text-sky-400">info</span>
            <span>Deployment Guide: Browser & Cloud Blocking</span>
          </div>
          <ul className="space-y-1.5 list-disc pl-4 text-blue-800 dark:text-sky-300 text-[11.5px] leading-relaxed">
            <li>
              <strong>On Cloud / HTTPS:</strong> Browsers strictly prohibit websites served over HTTPS from calling local HTTP IPs like <code>192.168.6.155</code> (Mixed Content). Select <strong>Firebase Cloud</strong> mode; it routes through secure Firebase WebSockets and works seamlessly everywhere.
            </li>
            <li>
              <strong>On Local Network:</strong> When running locally via <code>http://localhost:3000</code> with your laptop connected to WiFi <strong>AromaxAI-Hub</strong>, your ESP32's v1.2.1 CORS headers allow direct, sub-10ms communication to <code>http://192.168.6.155</code>.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
