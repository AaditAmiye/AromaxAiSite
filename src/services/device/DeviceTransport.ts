import { DeviceCommandPayload, DeviceStatusResponse, TransportMode } from '../../types/device';

export interface DeviceTransport {
  readonly name: string;
  readonly mode: TransportMode;
  getStatus(): Promise<DeviceStatusResponse>;
  sendState(payload: DeviceCommandPayload): Promise<{ success: boolean; latencyMs?: number; error?: string }>;
  stopAll(): Promise<{ success: boolean; error?: string }>;
  testChannel(channelId: string, durationSeconds: number): Promise<{ success: boolean; error?: string }>;
}
