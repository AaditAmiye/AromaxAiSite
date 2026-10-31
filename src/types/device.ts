import { RGB, HardwareMasks, DeviceTelemetry } from './aroma';

export type TransportMode = 'local' | 'cloud' | 'mock';

export interface DeviceStatusResponse {
  masterMask: number;
  slaveMask: number;
  ip: string;
  uptimeSeconds?: number;
  rssi?: number;
  firmwareVersion?: string;
  cloudSynced?: boolean;
}

export interface DeviceCommandPayload {
  channels: string[]; // e.g. ["H19", "H18"]
  light: RGB;
  outputPercent?: number; // 0 - 100
  source?: string;
  fan?: boolean; // Explicit Fan H30 control
}

export interface DeviceTransport {
  name: string;
  mode: TransportMode;
  getStatus(): Promise<DeviceStatusResponse>;
  sendState(payload: DeviceCommandPayload): Promise<{ success: boolean; latencyMs?: number; error?: string }>;
  stopAll(): Promise<{ success: boolean; error?: string }>;
  testChannel(channelId: string, durationSeconds: number): Promise<{ success: boolean; error?: string }>;
}

export interface WifiNetwork {
  ssid: string;
  rssi: number;
  secure?: boolean;
}

export interface WifiStatus {
  connected: boolean;
  ssid?: string;
  ip?: string;
  rssi?: number;
  status?: 'idle' | 'scanning' | 'connecting' | 'connected' | 'failed';
  scanResults?: WifiNetwork[];
  error?: string;
}

export interface OtaInfo {
  status: 'idle' | 'available' | 'downloading' | 'verifying' | 'installing' | 'rebooting' | 'success' | 'failed' | 'rollback';
  currentVersion: string;
  targetVersion?: string;
  releaseNotes?: string;
  progress?: number;
  error?: string;
  firmwareUrl?: string;
  lastUpdated?: number;
}

export interface DeviceState {
  connected: boolean;
  cloudConnected: boolean;
  transportMode: TransportMode;
  deviceId: string;
  fanEnabled: boolean;
  host: string;
  lastSeen: number | null;
  activeChannels: string[];
  light: RGB;
  airflow: 'active' | 'inactive';
  masks: HardwareMasks;
  telemetry: DeviceTelemetry;
  error: string | null;
  lastCommandTimestamp: number | null;
  ota: OtaInfo;
  wifi: WifiStatus;
}
