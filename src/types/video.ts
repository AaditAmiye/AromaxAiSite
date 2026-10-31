import { RGB, BlendChannelAllocation } from './aroma';

export interface VideoScentEvent {
  id: string;
  timeSeconds: number;
  title: string;
  channels: string[]; // e.g. ["H19", "H18"]
  smellName?: string; // Real installed device cartridge smell name producing at this timestamp
  durationSeconds: number;
  light?: RGB;
  note?: string;
  visualClue?: string;
  channelDetails?: BlendChannelAllocation[];
}

export interface VideoDemo {
  id: string;
  title: string;
  subtitle: string;
  durationSeconds: number;
  thumbnailUrl: string;
  videoUrl?: string; // Optional direct HTML5 video source
  youtubeId?: string;
  tags: string[];
  events: VideoScentEvent[];
  description?: string;
  visualAnalysis?: string[]; // Visual cues detected by Gemini Vision
  summary?: string;
}
