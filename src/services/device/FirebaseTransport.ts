import { DeviceTransport } from './DeviceTransport';
import { DeviceCommandPayload, DeviceStatusResponse, TransportMode } from '../../types/device';
import { db, isFirebaseConfigured } from '../firebase/firebaseClient';
import { ref, set, get } from 'firebase/database';
import { channelsToMasks } from '../hardware/maskEngine';

export class FirebaseTransport implements DeviceTransport {
  readonly name = 'Firebase Realtime Cloud Gateway';
  readonly mode: TransportMode = 'cloud';
  private deviceId: string;
  private commandCounter = 1;

  constructor(deviceId = 'aromaxai-master-01') {
    this.deviceId = deviceId;
  }

  setDeviceId(id: string) {
    this.deviceId = id.trim();
  }

  getDeviceId(): string {
    return this.deviceId;
  }

  async getStatus(): Promise<DeviceStatusResponse> {
    if (!isFirebaseConfigured || !db) {
      throw new Error(
        'Firebase is not configured. Realtime Database credentials missing.'
      );
    }

    // Check heartbeat record across target deviceId and all known hardware aliases
    const hbPaths = [
      `devices/${this.deviceId}/heartbeat`,
      'devices/aromaxai-master-01/heartbeat',
      'devices/ARX-000001/heartbeat',
      'devices/ARX-000000/heartbeat',
      'devices/ARX-30/heartbeat',
      'AromaAI/heartbeat'
    ];

    let liveHbData: any = null;
    let staleCandidateSec: number | null = null;
    let activePathId = '';

    for (const p of hbPaths) {
      try {
        const snap = await get(ref(db, p));
        if (snap.exists()) {
          const val = snap.val();
          let ts = 0;
          if (typeof val === 'number') {
            ts = val;
          } else if (val && typeof val === 'object') {
            ts = val.timestamp || val._time || (typeof val.heartbeat === 'number' ? val.heartbeat : 0);
          }

          // Convert seconds to ms if necessary
          if (ts > 0 && ts < 1e11) ts *= 1000;

          if (ts > 0) {
            const ageMs = Math.abs(Date.now() - ts);
            // Tolerant heartbeat window: 3 minutes (180,000 ms) for Wi-Fi reconnects & clock drift
            if (ageMs <= 180000) {
              liveHbData = typeof val === 'object' ? val : { timestamp: val, online: true };
              activePathId = p;
              break;
            } else {
              const sec = Math.round(ageMs / 1000);
              if (staleCandidateSec === null || sec < staleCandidateSec) {
                staleCandidateSec = sec;
                // If within 10 minutes, still consider valid candidate
                if (sec < 600) {
                  liveHbData = typeof val === 'object' ? val : { timestamp: val, online: true };
                  activePathId = p;
                }
              }
            }
          } else if (val && typeof val === 'object' && (val.online === true || typeof val.uptime === 'number')) {
            liveHbData = val;
            activePathId = p;
            break;
          }
        }
      } catch {
        // continue checking other paths
      }
    }

    // Auto-align device ID if an active heartbeat was found on another alias
    if (activePathId) {
      const match = activePathId.match(/devices\/([^/]+)\/heartbeat/);
      if (match && match[1] && match[1] !== this.deviceId) {
        this.deviceId = match[1];
      }
    }

    // Check state record
    const stateRef = ref(db, `devices/${this.deviceId}/state`);
    let stateSnapshot = await get(stateRef);
    if (!stateSnapshot.exists() && this.deviceId !== 'aromaxai-master-01') {
      stateSnapshot = await get(ref(db, 'devices/aromaxai-master-01/state'));
    }
    const stateData = stateSnapshot.exists() ? stateSnapshot.val() : null;

    if (!liveHbData && !stateData) {
      const staleMsg = staleCandidateSec !== null
        ? `Hardware is Offline: Last heartbeat was received ${staleCandidateSec}s ago. Please power ON the device and ensure it connects to Wi-Fi.`
        : `Hardware is Offline: No active heartbeats detected in Firebase. Please power ON the device.`;
      throw new Error(staleMsg);
    }

    const hbObj = liveHbData;
    return {
      masterMask: typeof stateData?.masterMask === 'number' ? stateData.masterMask : (typeof hbObj?.masterMask === 'number' ? hbObj.masterMask : 0),
      slaveMask: typeof stateData?.slaveMask === 'number' ? stateData.slaveMask : (typeof hbObj?.slaveMask === 'number' ? hbObj.slaveMask : 0),
      ip: hbObj?.ip || stateData?.ip || 'Cloud Gateway',
      uptimeSeconds: hbObj?.uptime || stateData?.uptime,
      rssi: hbObj?.wifiRSSI || stateData?.wifiRSSI,
      cloudSynced: true
    };
  }

  async sendState(payload: DeviceCommandPayload): Promise<{ success: boolean; latencyMs?: number; error?: string }> {
    if (!isFirebaseConfigured || !db) {
      return {
        success: false,
        error: 'Firebase not configured. Add credentials in environment variables.'
      };
    }

    const start = performance.now();
    try {
      const isFanExplicitlyOff = payload.fan === false;
      let { masterMask, slaveMask } = channelsToMasks(payload.channels, {
        enforceFanOff: isFanExplicitlyOff
      });

      // Embed digital RGB threshold bits into masterMask so that
      // firmware immediately activates LEDs on H02 (bit 1), H03 (bit 2), H13 (bit 12)
      if (payload.light.r > 127) masterMask |= (1 << 12);
      if (payload.light.g > 127) masterMask |= (1 << 2);
      if (payload.light.b > 127) masterMask |= (1 << 1);

      const commandId = `cmd-${Date.now()}-${this.commandCounter++}`;

      const cmdData = {
        commandId,
        masterMask,
        slaveMask,
        fan: !isFanExplicitlyOff,
        r: payload.light.r,
        g: payload.light.g,
        b: payload.light.b,
        timestamp: Date.now()
      };

      // Broadcast to target device and all known hardware aliases so firmware always receives it
      const targets = [
        this.deviceId,
        'aromaxai-master-01',
        'ARX-000001',
        'ARX-000000'
      ];

      const writePromises = targets.map((id) =>
        set(ref(db!, `devices/${id}/command`), cmdData)
      );
      writePromises.push(set(ref(db!, 'AromaAI/controls'), cmdData));

      await Promise.all(writePromises);

      return {
        success: true,
        latencyMs: Math.round(performance.now() - start)
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }

  async stopAll(): Promise<{ success: boolean; error?: string }> {
    if (!isFirebaseConfigured || !db) {
      return { success: false, error: 'Firebase not configured' };
    }

    try {
      const { masterMask, slaveMask } = channelsToMasks([], { enforceFanOff: true });
      const commandId = `stop-${Date.now()}-${this.commandCounter++}`;

      const cmdData = {
        commandId,
        masterMask,
        slaveMask,
        fan: false,
        r: 0,
        g: 0,
        b: 0,
        timestamp: Date.now()
      };

      const targets = [this.deviceId, 'aromaxai-master-01', 'ARX-000001', 'ARX-000000'];
      const writePromises = targets.map((id) =>
        set(ref(db!, `devices/${id}/command`), cmdData)
      );
      writePromises.push(set(ref(db!, 'AromaAI/controls'), cmdData));

      await Promise.all(writePromises);
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }

  async testChannel(channelId: string, durationSeconds: number): Promise<{ success: boolean; error?: string }> {
    return this.sendState({
      channels: [channelId],
      light: { r: 52, g: 199, b: 89 }
    });
  }
}
