/**
 * AROMAXAI Core Olfactory & Hardware Data Types
 */

export type ChannelStatus = 'working' | 'not_working' | 'improper' | 'unassigned';

export type AromaCategory = 
  | 'woody'
  | 'earthy'
  | 'floral'
  | 'sweet'
  | 'spicy'
  | 'savory'
  | 'citrus'
  | 'fruity'
  | 'fresh'
  | 'oriental'
  | 'roasted'
  | 'herbal'
  | 'smoky'
  | 'resinous'
  | 'aromatic'
  | 'chemical'
  | 'carrier'
  | 'lighting'
  | 'airflow'
  | 'unassigned';

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface AromaChannel {
  id: string; // e.g. "H28"
  channelNumber: number; // 1 - 34
  name: string;
  category: AromaCategory;
  status: ChannelStatus;
  board: 'master' | 'slave';
  boardIndex: number; // 0 - 16
  defaultLight: RGB;
  chemicalCompound?: string;
  purityPercent?: number;
  description?: string;
  keywords?: string[];
  notes?: string;
  isLighting?: boolean;
  isAirflow?: boolean;
  lastModified?: number;
}

export interface BlendChannelAllocation {
  channelId: string;
  intensity: number; // 0.0 - 1.0
  reason?: string;
  smellName?: string; // Real installed cartridge smell name
}

export interface Blend {
  id: string;
  name: string;
  category?: string;
  description?: string;
  notes?: string;
  imageUrl?: string;
  channels: BlendChannelAllocation[];
  light: RGB;
  durationSeconds?: number;
  batchId?: string;
  formulaCode?: string;
  profileName?: string;
}

export interface ExperienceStage {
  stageNumber: number;
  title: string;
  durationSeconds: number;
  channels: BlendChannelAllocation[];
  light: RGB;
  description?: string;
}

export interface Experience {
  id: string;
  title: string;
  type: 'text' | 'video' | 'therapy' | 'blend';
  durationSeconds: number;
  stages: ExperienceStage[];
  description?: string;
  batchId?: string;
}

export interface HardwareMasks {
  masterMask: number;
  slaveMask: number;
}

export interface DeviceTelemetry {
  purgeDeltaSeconds: number;
  dispersionVelocity: number; // m/s
  chamberPressureBar: number;
  ambientTemperatureC: number;
  fanRpm: number;
  airflow: 'active' | 'calibrating';
  frequencyKhz: number;
}

export interface ActiveSessionState {
  active: boolean;
  paused: boolean;
  isPurging?: boolean;
  purgeRemainingSeconds?: number;
  experienceId: string | null;
  experienceTitle: string;
  batchId: string;
  profileName: string;
  type: 'text' | 'video' | 'therapy' | 'blend' | 'test';
  channels: BlendChannelAllocation[];
  light: RGB;
  totalDurationSeconds: number;
  remainingSeconds: number;
  endAt: number | null; // Date.now() timestamp
  pausedAt: number | null;
  currentStageIndex: number;
  stages: ExperienceStage[];
  diffusionOutputPercent: number; // 10 - 100
}
