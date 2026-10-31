import { ExperienceStage } from './aroma';

export type TherapyCategory =
  | 'Relaxation'
  | 'Sleep'
  | 'Focus'
  | 'Meditation'
  | 'Stress Relief'
  | 'Memory'
  | 'Custom';

export interface TherapyProgram {
  id: string;
  title: string;
  category: TherapyCategory;
  durationMinutes: number;
  totalDurationSeconds: number;
  shortDescription: string;
  intent: string;
  stages: ExperienceStage[];
  recommendedTimeOfDay?: string;
  iconName?: string;
  badge?: string;
}
