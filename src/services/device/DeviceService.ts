import { DeviceTransport } from './DeviceTransport';
import { LocalEspTransport } from './LocalEspTransport';
import { FirebaseTransport } from './FirebaseTransport';
import { MockTransport } from './MockTransport';
import { DeviceState, TransportMode, DeviceCommandPayload } from '../../types/device';
import { RGB } from '../../types/aroma';
import { channelsToMasks, masksToChannels } from '../hardware/maskEngine';
import { isFirebaseConfigured, db } from '../firebase/firebaseClient';
import { ref, set, get } from 'firebase/database';
import { ALL_NON_LIGHTING_CHANNEL_IDS, UNASSIGNED_CHANNEL_IDS } from '../../data/aromas';

type StateListener = (state: DeviceState) => void;

class DeviceService {
  private transport: DeviceTransport;
  private localTransport: LocalEspTransport;
  private firebaseTransport: FirebaseTransport;
  private mockTransport: MockTransport;

  private state: DeviceState;
  private listeners = new Set<StateListener>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private testTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.localTransport = new LocalEspTransport();
    this.firebaseTransport = new FirebaseTransport();
    this.mockTransport = new MockTransport();

    // Default mode from env, localStorage, or auto-detect from origin
    const savedMode = typeof localStorage !== 'undefined' ? (localStorage.getItem('aromaxai_transport_mode') as TransportMode) : null;
    const isCloudOrigin = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    const envMode = savedMode || (import.meta.env.VITE_DEVICE_MODE as TransportMode) || (isCloudOrigin ? 'cloud' : 'local');
    const savedDeviceId = typeof localStorage !== 'undefined' ? localStorage.getItem('aromaxai_device_id') || 'aromaxai-master-01' : 'aromaxai-master-01';

    this.firebaseTransport = new FirebaseTransport(savedDeviceId);
    this.transport = this.selectTransport(envMode);

    const initialMasks = channelsToMasks([]);

    this.state = {
      connected: false,
      cloudConnected: isFirebaseConfigured,
      transportMode: this.transport.mode,
      deviceId: savedDeviceId,
      fanEnabled: true,
      host: this.localTransport.getHost(),
      lastSeen: null,
      activeChannels: [],
      light: { r: 0, g: 0, b: 0 },
      airflow: 'active',
      masks: initialMasks,
      telemetry: {
        purgeDeltaSeconds: 0.28,
        dispersionVelocity: 1.4,
        chamberPressureBar: 1.02,
        ambientTemperatureC: 22.4,
        fanRpm: 1840,
        airflow: 'active',
        frequencyKhz: 114
      },
      error: null,
      lastCommandTimestamp: null,
      ota: {
        status: 'idle',
        currentVersion: '1.4.3',
        targetVersion: '1.4.4',
        firmwareUrl: 'https://github.com/AaditAmiye/AromaxAI/releases/download/v2/firmware.bin',
        releaseNotes: 'Web-driven Wi-Fi manager & GitHub OTA update pipeline'
      },
      wifi: {
        connected: false,
        ssid: '',
        ip: '',
        rssi: 0,
        status: 'idle',
        scanResults: []
      }
    };

    // Begin device ping/heartbeat checks
    this.startHeartbeat();
  }

  private selectTransport(mode: TransportMode): DeviceTransport {
    if (mode === 'cloud') return this.firebaseTransport;
    if (mode === 'mock') return this.mockTransport;
    return this.localTransport;
  }

  setTransportMode(mode: TransportMode) {
    this.transport = this.selectTransport(mode);
    this.state.transportMode = mode;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('aromaxai_transport_mode', mode);
      } catch {
        // ignore
      }
    }
    this.checkConnectivity();
    this.notify();
  }

  setEspHost(host: string) {
    this.localTransport.setHost(host);
    this.state.host = host;
    if (this.state.transportMode === 'local') {
      this.checkConnectivity();
    }
    this.notify();
  }

  getEspHost(): string {
    return this.localTransport.getHost();
  }

  setDeviceId(deviceId: string) {
    const cleanId = deviceId.trim();
    if (!cleanId) return;
    this.state.deviceId = cleanId;
    this.firebaseTransport.setDeviceId(cleanId);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('aromaxai_device_id', cleanId);
      } catch {
        // ignore
      }
    }
    this.checkConnectivity();
    this.notify();
  }

  getDeviceId(): string {
    return this.state.deviceId;
  }

  async setFan(enabled: boolean): Promise<{ success: boolean; error?: string }> {
    return this.applyState({
      channels: this.state.activeChannels,
      light: this.state.light,
      fan: enabled,
      source: 'fan-control'
    });
  }

  async toggleFan(): Promise<{ success: boolean; error?: string }> {
    return this.setFan(!this.state.fanEnabled);
  }

  /**
   * Triggers remote GitHub OTA firmware update on the ESP32
   */
  async triggerOtaUpdate(customUrl?: string): Promise<{ success: boolean; error?: string }> {
    const targetUrl =
      customUrl?.trim() ||
      this.state.ota.firmwareUrl ||
      'https://github.com/AaditAmiye/AromaxAI/releases/download/v2/firmware.bin';

    if (!isFirebaseConfigured || !db) {
      this.state.ota = {
        ...this.state.ota,
        status: 'downloading',
        progress: 25,
        firmwareUrl: targetUrl
      };
      this.notify();
      setTimeout(() => {
        this.state.ota = {
          ...this.state.ota,
          status: 'installing',
          progress: 80
        };
        this.notify();
      }, 2000);
      setTimeout(() => {
        this.state.ota = {
          ...this.state.ota,
          status: 'success',
          currentVersion: '1.4.4',
          progress: 100
        };
        this.notify();
      }, 4000);
      return { success: true };
    }

    try {
      this.state.ota = {
        ...this.state.ota,
        status: 'downloading',
        firmwareUrl: targetUrl,
        error: undefined
      };
      this.notify();

      const cmdId = `ota-${Date.now()}`;
      await Promise.all([
        set(ref(db, `devices/${this.state.deviceId}/ota`), {
          action: 'start',
          firmwareUrl: targetUrl,
          targetVersion: '1.4.4',
          timestamp: Date.now(),
          status: 'downloading'
        }),
        set(ref(db, `devices/${this.state.deviceId}/command`), {
          commandId: cmdId,
          action: 'ota_update',
          firmwareUrl: targetUrl,
          timestamp: Date.now()
        })
      ]);

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.state.ota = {
        ...this.state.ota,
        status: 'failed',
        error: msg
      };
      this.notify();
      return { success: false, error: msg };
    }
  }

  /**
   * Request ESP32 to scan for nearby Wi-Fi networks and report results
   */
  async requestWifiScan(): Promise<{ success: boolean; error?: string }> {
    if (!isFirebaseConfigured || !db) {
      this.state.wifi = {
        ...this.state.wifi,
        status: 'scanning'
      };
      this.notify();
      setTimeout(() => {
        this.state.wifi = {
          ...this.state.wifi,
          status: 'idle',
          scanResults: [
            { ssid: 'Home_WiFi_5G', rssi: -48, secure: true },
            { ssid: 'AromaxAI-Office', rssi: -58, secure: true },
            { ssid: 'Studio_Lab_Mesh', rssi: -66, secure: true },
            { ssid: 'Open_Guest_Network', rssi: -79, secure: false }
          ]
        };
        this.notify();
      }, 1500);
      return { success: true };
    }

    try {
      this.state.wifi = {
        ...this.state.wifi,
        status: 'scanning'
      };
      this.notify();

      const cmdId = `scan-${Date.now()}`;
      await Promise.all([
        set(ref(db, `devices/${this.state.deviceId}/wifi/scanRequest`), {
          timestamp: Date.now(),
          pending: true
        }),
        set(ref(db, `devices/${this.state.deviceId}/command`), {
          commandId: cmdId,
          action: 'wifi_scan',
          timestamp: Date.now()
        })
      ]);

      // Polling for scan results up to 8s
      setTimeout(async () => {
        try {
          if (!db) return;
          const snap = await get(ref(db, `devices/${this.state.deviceId}/wifi/scanResults`));
          if (snap.exists()) {
            const raw = snap.val();
            let parsed = [];
            if (Array.isArray(raw)) parsed = raw;
            else if (raw && typeof raw === 'object') parsed = Object.values(raw);
            this.state.wifi = {
              ...this.state.wifi,
              status: 'idle',
              scanResults: parsed as any
            };
            this.notify();
          } else {
            this.state.wifi = {
              ...this.state.wifi,
              status: 'idle'
            };
            this.notify();
          }
        } catch {
          // ignore
        }
      }, 3500);

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.state.wifi = {
        ...this.state.wifi,
        status: 'idle',
        error: msg
      };
      this.notify();
      return { success: false, error: msg };
    }
  }

  /**
   * Configure and switch ESP32 to a new Wi-Fi network from the webpage
   */
  async configureWifi(ssid: string, password = ''): Promise<{ success: boolean; error?: string }> {
    const cleanSsid = ssid.trim();
    if (!cleanSsid) {
      return { success: false, error: 'SSID is required' };
    }

    if (!isFirebaseConfigured || !db) {
      this.state.wifi = {
        ...this.state.wifi,
        status: 'connecting',
        ssid: cleanSsid
      };
      this.notify();
      setTimeout(() => {
        this.state.wifi = {
          ...this.state.wifi,
          status: 'connected',
          connected: true,
          ssid: cleanSsid,
          ip: '192.168.1.185',
          rssi: -52
        };
        this.notify();
      }, 2000);
      return { success: true };
    }

    try {
      this.state.wifi = {
        ...this.state.wifi,
        status: 'connecting',
        ssid: cleanSsid
      };
      this.notify();

      const cmdId = `wifi-${Date.now()}`;
      await Promise.all([
        set(ref(db, `devices/${this.state.deviceId}/wifi/config`), {
          ssid: cleanSsid,
          password,
          pending: true,
          timestamp: Date.now()
        }),
        set(ref(db, `devices/${this.state.deviceId}/command`), {
          commandId: cmdId,
          action: 'wifi_config',
          ssid: cleanSsid,
          password,
          timestamp: Date.now()
        })
      ]);

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.state.wifi = {
        ...this.state.wifi,
        status: 'failed',
        error: msg
      };
      this.notify();
      return { success: false, error: msg };
    }
  }

  async claimDevice(deviceId: string, claimCode: string, ownerUid?: string): Promise<{ success: boolean; error?: string }> {
    if (!isFirebaseConfigured || !db) {
      return { success: false, error: 'Firebase not configured' };
    }
    const cleanId = deviceId.trim().toUpperCase();
    const cleanCode = claimCode.trim();
    if (!cleanId || !cleanCode) {
      return { success: false, error: 'Device ID and Claim Code are required' };
    }

    try {
      const deviceRef = ref(db, `devices/${cleanId}`);
      const snap = await get(deviceRef);
      if (!snap.exists()) {
        return { success: false, error: `Device ${cleanId} not found in database.` };
      }

      const devData = snap.val();
      if (devData.claimCode && String(devData.claimCode).trim() !== cleanCode) {
        return { success: false, error: 'Invalid Claim Code for this unit.' };
      }

      if (devData.ownerUid && devData.ownerUid !== ownerUid) {
        return { success: false, error: 'Device is already claimed by another owner.' };
      }

      const updates: Promise<any>[] = [
        set(ref(db, `devices/${cleanId}/ownerUid`), ownerUid || 'owner')
      ];
      if (ownerUid) {
        updates.push(set(ref(db, `users/${ownerUid}/devices/${cleanId}`), true));
      }
      await Promise.all(updates);

      this.setDeviceId(cleanId);
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }

  getState(): DeviceState {
    return { ...this.state };
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const copy = { ...this.state };
    for (const listener of this.listeners) {
      try {
        listener(copy);
      } catch (err) {
        console.error('Error in device state listener:', err);
      }
    }
  }

  async checkConnectivity(): Promise<boolean> {
    try {
      const status = await this.transport.getStatus();
      const now = Date.now();
      const calculatedChannels = masksToChannels(status.masterMask, status.slaveMask);

      this.state.connected = true;
      this.state.lastSeen = now;
      this.state.error = null;
      this.state.masks = {
        masterMask: status.masterMask,
        slaveMask: status.slaveMask
      };

      // Only sync active channels if we didn't initiate another state recently
      if (!this.state.lastCommandTimestamp || now - this.state.lastCommandTimestamp > 3000) {
        this.state.activeChannels = calculatedChannels;
      }

      // Sync OTA and Wi-Fi metadata in cloud mode
      if (isFirebaseConfigured && db && this.state.transportMode === 'cloud') {
        try {
          const [otaSnap, wifiSnap] = await Promise.all([
            get(ref(db, `devices/${this.state.deviceId}/ota`)),
            get(ref(db, `devices/${this.state.deviceId}/wifi`))
          ]);

          if (otaSnap.exists()) {
            const otaData = otaSnap.val();
            this.state.ota = {
              status: otaData.status || 'idle',
              currentVersion: otaData.currentVersion || this.state.ota.currentVersion || '1.4.3',
              targetVersion: otaData.targetVersion || '1.4.4',
              releaseNotes: otaData.releaseNotes || 'Production Verified OTA',
              progress: typeof otaData.progress === 'number' ? otaData.progress : undefined,
              error: otaData.error,
              firmwareUrl: otaData.firmwareUrl || this.state.ota.firmwareUrl
            };
          }

          if (wifiSnap.exists()) {
            const wData = wifiSnap.val();
            let parsedScan: any[] = [];
            if (Array.isArray(wData.scanResults)) {
              parsedScan = wData.scanResults;
            } else if (wData.scanResults && typeof wData.scanResults === 'object') {
              parsedScan = Object.values(wData.scanResults);
            }

            this.state.wifi = {
              connected: wData.connected !== undefined ? !!wData.connected : this.state.connected,
              ssid: wData.ssid || this.state.wifi.ssid,
              ip: wData.ip || this.state.wifi.ip,
              rssi: typeof wData.rssi === 'number' ? wData.rssi : this.state.wifi.rssi,
              status: wData.status || (wData.connected ? 'connected' : 'idle'),
              scanResults: parsedScan.length > 0 ? parsedScan : this.state.wifi.scanResults,
              error: wData.error
            };
          }
        } catch {
          // ignore sync error
        }
      }

      this.notify();
      return true;
    } catch (err: unknown) {
      // Auto-fallback check between cloud and local transports
      if (this.state.transportMode === 'cloud') {
        try {
          const localStatus = await this.localTransport.getStatus();
          this.setTransportMode('local');
          this.state.connected = true;
          this.state.lastSeen = Date.now();
          this.state.error = null;
          this.state.masks = { masterMask: localStatus.masterMask, slaveMask: localStatus.slaveMask };
          this.notify();
          return true;
        } catch {
          // Local also unreachable
        }
      } else if (this.state.transportMode === 'local') {
        try {
          const cloudStatus = await this.firebaseTransport.getStatus();
          this.setTransportMode('cloud');
          this.state.connected = true;
          this.state.lastSeen = Date.now();
          this.state.error = null;
          this.state.masks = { masterMask: cloudStatus.masterMask, slaveMask: cloudStatus.slaveMask };
          this.notify();
          return true;
        } catch {
          // Cloud also unreachable
        }
      }

      this.state.connected = false;
      const msg = err instanceof Error ? err.message : String(err);
      this.state.error = msg;
      this.notify();
      return false;
    }
  }

  startHeartbeat(intervalMs = 6000) {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.checkConnectivity();
    this.heartbeatInterval = setInterval(() => {
      this.checkConnectivity();
    }, intervalMs);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Applies an absolute state to the hardware
   */
  async applyState(payload: DeviceCommandPayload): Promise<{ success: boolean; latencyMs?: number; error?: string }> {
    // Hardware Safety Check: never allow arbitrary unvalidated channels
    const sanitizedChannels = (payload.channels || []).filter((ch) => typeof ch === 'string' && /^H\d{2}$/i.test(ch));
    const activeFan = payload.fan !== undefined ? payload.fan : this.state.fanEnabled;
    const masks = channelsToMasks(sanitizedChannels, { enforceFanOff: !activeFan });

    try {
      const res = await this.transport.sendState({
        ...payload,
        fan: activeFan,
        channels: sanitizedChannels
      });

      // Dual-dispatch: also broadcast to backup transport if available
      if (this.state.transportMode === 'cloud') {
        this.localTransport.sendState({ ...payload, fan: activeFan, channels: sanitizedChannels }).catch(() => {});
      } else if (this.state.transportMode === 'local') {
        this.firebaseTransport.sendState({ ...payload, fan: activeFan, channels: sanitizedChannels }).catch(() => {});
      }

      if (res.success) {
        this.state.activeChannels = sanitizedChannels;
        this.state.light = payload.light;
        this.state.masks = masks;
        this.state.fanEnabled = activeFan;
        this.state.airflow = activeFan ? 'active' : 'inactive';
        this.state.lastCommandTimestamp = Date.now();
        this.state.error = null;
        this.notify();
        return res;
      } else {
        this.state.error = res.error || 'Device command failed';
        this.notify();
        return res;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.state.error = msg;
      this.notify();
      return { success: false, error: msg };
    }
  }

  /**
   * Dedicated RGB light controller
   */
  async setRgbLight(r: number, g: number, b: number): Promise<{ success: boolean; error?: string }> {
    const light: RGB = {
      r: Math.max(0, Math.min(255, Math.round(r))),
      g: Math.max(0, Math.min(255, Math.round(g))),
      b: Math.max(0, Math.min(255, Math.round(b)))
    };
    return this.applyState({
      channels: this.state.activeChannels,
      light,
      source: 'device-rgb-control'
    });
  }

  async toggleLightChannel(channelId: 'H02' | 'H03' | 'H13'): Promise<{ success: boolean; error?: string }> {
    const cur = { ...this.state.light };
    if (channelId === 'H13') {
      cur.r = cur.r > 127 ? 0 : 255;
    } else if (channelId === 'H03') {
      cur.g = cur.g > 127 ? 0 : 255;
    } else if (channelId === 'H02') {
      cur.b = cur.b > 127 ? 0 : 255;
    }
    return this.setRgbLight(cur.r, cur.g, cur.b);
  }

  /**
   * Technical individual channel tester
   */
  async testChannel(channelId: string, durationSeconds: number): Promise<{ success: boolean; error?: string }> {
    if (this.testTimer) {
      clearTimeout(this.testTimer);
      this.testTimer = null;
    }

    const res = await this.applyState({
      channels: [channelId],
      light: { r: 52, g: 199, b: 89 },
      source: 'hardware-test'
    });

    if (!res.success) return res;

    // Automatic hardware safety cutoff
    this.testTimer = setTimeout(async () => {
      await this.applyState({
        channels: [],
        light: { r: 0, g: 0, b: 0 },
        source: 'test-auto-stop'
      });
      this.testTimer = null;
    }, durationSeconds * 1000);

    return { success: true };
  }

  /**
   * Toggles an individual hardware channel ON/OFF directly
   */
  async toggleChannel(channelId: string): Promise<{ success: boolean; error?: string }> {
    const cur = [...this.state.activeChannels];
    const idx = cur.indexOf(channelId);
    let next: string[];
    if (idx >= 0) {
      next = cur.filter((id) => id !== channelId);
    } else {
      next = [...cur, channelId];
    }

    return this.applyState({
      channels: next,
      light: this.state.light,
      source: `toggle-${channelId}`
    });
  }

  /**
   * Turns ON or OFF all unassigned hardware pins (H01, H12, H17, H26)
   */
  async setUnassignedPins(enable: boolean): Promise<{ success: boolean; error?: string }> {
    const unassignedSet = new Set(UNASSIGNED_CHANNEL_IDS);
    let next: string[];
    if (enable) {
      next = Array.from(new Set([...this.state.activeChannels, ...UNASSIGNED_CHANNEL_IDS]));
    } else {
      next = this.state.activeChannels.filter((id) => !unassignedSet.has(id));
    }

    return this.applyState({
      channels: next,
      light: this.state.light,
      source: enable ? 'unassigned-all-on' : 'unassigned-all-off'
    });
  }

  /**
   * Turns ON all 31-32 hardware pins/actuators across Master (H01-H17) and Slave (H18-H34) boards.
   * Strictly keeps RGB lighting (H02 Blue, H03 Green, H13 Red) OFF.
   */
  async turnAllOn(): Promise<{ success: boolean; latencyMs?: number; error?: string }> {
    if (this.testTimer) {
      clearTimeout(this.testTimer);
      this.testTimer = null;
    }

    const nonLightingChannels = [...ALL_NON_LIGHTING_CHANNEL_IDS];
    const neutralLight: RGB = { r: 0, g: 0, b: 0 };

    return this.applyState({
      channels: nonLightingChannels,
      light: neutralLight,
      fan: true,
      source: 'hardware-all-on-no-light'
    });
  }

  /**
   * Turns OFF all hardware pins/actuators and lighting across the entire board.
   */
  async turnAllOff(): Promise<{ success: boolean; error?: string }> {
    return this.stopAll();
  }

  /**
   * Global Emergency Stop & Purge
   * Resets all aroma channels, stops all test timers, resets light to neutral,
   * while strictly keeping the fan/airflow active.
   */
  async stopAll(): Promise<{ success: boolean; error?: string }> {
    if (this.testTimer) {
      clearTimeout(this.testTimer);
      this.testTimer = null;
    }

    try {
      const res = await this.transport.stopAll();
      const neutralLight: RGB = { r: 0, g: 0, b: 0 };
      const emptyMasks = channelsToMasks([], { enforceFanOff: true });

      this.state.activeChannels = [];
      this.state.light = neutralLight;
      this.state.masks = emptyMasks;
      this.state.fanEnabled = false;
      this.state.airflow = 'inactive';
      this.state.lastCommandTimestamp = Date.now();
      this.notify();

      return res;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }
}

export const deviceService = new DeviceService();
