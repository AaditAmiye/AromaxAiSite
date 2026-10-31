import { DeviceTransport } from './DeviceTransport';
import { DeviceCommandPayload, DeviceStatusResponse, TransportMode } from '../../types/device';
import { channelsToMasks } from '../hardware/maskEngine';

export class MockTransport implements DeviceTransport {
  readonly name = 'Mock Hardware Simulator';
  readonly mode: TransportMode = 'mock';

  private activeChannels: string[] = [];
  private currentMasterMask = 0;
  private currentSlaveMask = 4096; // Fan always active

  async getStatus(): Promise<DeviceStatusResponse> {
    return {
      masterMask: this.currentMasterMask,
      slaveMask: this.currentSlaveMask,
      ip: '127.0.0.1 (SIMULATED)',
      uptimeSeconds: 1420,
      rssi: -45,
      cloudSynced: false
    };
  }

  async sendState(payload: DeviceCommandPayload): Promise<{ success: boolean; latencyMs?: number; error?: string }> {
    this.activeChannels = [...payload.channels];
    const { masterMask, slaveMask } = channelsToMasks(payload.channels);
    this.currentMasterMask = masterMask;
    this.currentSlaveMask = slaveMask;

    return {
      success: true,
      latencyMs: 14 // simulated latency
    };
  }

  async stopAll(): Promise<{ success: boolean; error?: string }> {
    this.activeChannels = [];
    const { masterMask, slaveMask } = channelsToMasks([]);
    this.currentMasterMask = masterMask;
    this.currentSlaveMask = slaveMask;
    return { success: true };
  }

  async testChannel(channelId: string, durationSeconds: number): Promise<{ success: boolean; error?: string }> {
    return this.sendState({
      channels: [channelId],
      light: { r: 52, g: 199, b: 89 }
    });
  }
}
