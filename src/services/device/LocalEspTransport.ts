import { DeviceTransport } from './DeviceTransport';
import { DeviceCommandPayload, DeviceStatusResponse, TransportMode } from '../../types/device';
import { channelToHardwareIndex, channelsToMasks, FAN_SLAVE_INDEX } from '../hardware/maskEngine';

export class LocalEspTransport implements DeviceTransport {
  readonly name = 'Local ESP32 Direct / Bridge';
  readonly mode: TransportMode = 'local';
  private espHost: string;

  constructor(host?: string) {
    const savedHost = typeof localStorage !== 'undefined' ? localStorage.getItem('aromaxai_esp_host') : null;
    this.espHost = host || savedHost || (import.meta.env.VITE_ESP32_HOST as string) || 'http://192.168.6.155';
  }

  setHost(host: string) {
    this.espHost = host.trim().replace(/\/+$/, '');
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('aromaxai_esp_host', this.espHost);
      } catch {
        // ignore
      }
    }
  }

  getHost(): string {
    return this.espHost;
  }

  /**
   * Safe fetcher that tries server-side proxy first (if on HTTPS to prevent Mixed Content),
   * and falls back to direct browser LAN request if proxy is unavailable.
   */
  private async executeRequest<T>(
    endpoint: string,
    options?: RequestInit,
    timeoutMs = 4000
  ): Promise<T> {
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    const fetchWithTimeout = async (url: string, init?: RequestInit): Promise<Response> => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, { ...init, signal: controller.signal });
        clearTimeout(id);
        return res;
      } catch (err) {
        clearTimeout(id);
        throw err;
      }
    };

    // Attempt 1: Via backend proxy bridge if on HTTPS
    if (isHttps) {
      try {
        const proxyUrl = `/api/device/proxy?target=${encodeURIComponent(this.espHost)}&endpoint=${encodeURIComponent(cleanEndpoint)}`;
        const res = await fetchWithTimeout(proxyUrl, options);
        if (res.ok) {
          return (await res.json()) as T;
        }
      } catch (proxyErr) {
        // Backend proxy couldn't reach local IP (e.g. cloud host cannot route to private LAN)
        // Fall through to attempt direct browser request below
      }
    }

    // Attempt 2: Direct browser request to target host
    try {
      const directUrl = `${this.espHost}${cleanEndpoint}`;
      const res = await fetchWithTimeout(directUrl, {
        ...options,
        mode: 'cors'
      });
      if (res.ok) {
        return (await res.json()) as T;
      }
      throw new Error(`Direct ESP32 returned status ${res.status}`);
    } catch (directErr) {
      // If primary host was 192.168.6.155 or 10.162.171.155, try alternative IP as backup
      const altHost = this.espHost.includes('192.168.6.155')
        ? 'http://10.162.171.155'
        : 'http://192.168.6.155';
      
      try {
        const altUrl = `${altHost}${cleanEndpoint}`;
        const altRes = await fetchWithTimeout(altUrl, { ...options, mode: 'cors' });
        if (altRes.ok) {
          this.setHost(altHost);
          return (await altRes.json()) as T;
        }
      } catch {
        // Alt host also failed
      }

      const msg = directErr instanceof Error ? directErr.message : String(directErr);
      throw new Error(`Failed to reach ESP32 at ${this.espHost}: ${msg}`);
    }
  }

  async getStatus(): Promise<DeviceStatusResponse> {
    const data = await this.executeRequest<{ masterMask?: number; slaveMask?: number; ip?: string }>(
      '/status',
      { method: 'GET' },
      3000
    );

    return {
      masterMask: typeof data.masterMask === 'number' ? data.masterMask : 0,
      slaveMask: typeof data.slaveMask === 'number' ? data.slaveMask : 0,
      ip: data.ip || this.espHost.replace(/^https?:\/\//, '')
    };
  }

  async sendState(payload: DeviceCommandPayload): Promise<{ success: boolean; latencyMs?: number; error?: string }> {
    const start = performance.now();
    try {
      const { masterMask, slaveMask } = channelsToMasks(payload.channels);

      try {
        await this.executeRequest(
          '/state',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              masterMask,
              slaveMask,
              r: payload.light.r,
              g: payload.light.g,
              b: payload.light.b
            })
          },
          3000
        );
        return { success: true, latencyMs: Math.round(performance.now() - start) };
      } catch {
        // Fallback to legacy GET endpoints
        await this.executeRequest('/all?state=0', { method: 'GET' }, 2000).catch(() => {});
        await this.executeRequest(
          `/rgb?r=${payload.light.r}&g=${payload.light.g}&b=${payload.light.b}`,
          { method: 'GET' },
          2000
        ).catch(() => {});
        await this.executeRequest(
          `/toggle?board=slave&index=${FAN_SLAVE_INDEX}`,
          { method: 'GET' },
          2000
        ).catch(() => {});

        for (const chId of payload.channels) {
          const hw = channelToHardwareIndex(chId);
          if (hw && hw.index !== undefined) {
            await this.executeRequest(
              `/toggle?board=${hw.board}&index=${hw.index}`,
              { method: 'GET' },
              2000
            ).catch(() => {});
          }
        }

        return { success: true, latencyMs: Math.round(performance.now() - start) };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }

  async stopAll(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.executeRequest('/all?state=0', { method: 'GET' }, 2500).catch(() => {});
      await this.executeRequest('/rgb?r=0&g=0&b=0', { method: 'GET' }, 2500).catch(() => {});
      await this.executeRequest(
        `/toggle?board=slave&index=${FAN_SLAVE_INDEX}`,
        { method: 'GET' },
        2500
      ).catch(() => {});
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }

  async testChannel(channelId: string, durationSeconds: number): Promise<{ success: boolean; error?: string }> {
    const hw = channelToHardwareIndex(channelId);
    if (!hw) {
      return { success: false, error: `Invalid channel identifier ${channelId}` };
    }

    try {
      await this.sendState({
        channels: [channelId],
        light: { r: 52, g: 199, b: 89 }
      });
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }
}
