import { z } from 'zod';
import { cartridgeService } from '../cartridges/cartridgeService';

export const AiChannelItemSchema = z.object({
  channelId: z.string().refine(
    (id) => {
      const working = cartridgeService.getWorkingChannelIds();
      return working.map((w) => w.toUpperCase()).includes(id.toUpperCase());
    },
    {
      message: 'Invalid aroma channel selected by AI. Must be an active working aroma channel.'
    }
  ),
  intensity: z.number().min(0.01, 'Intensity must be greater than 0').max(1.0, 'Intensity cannot exceed 1.0'),
  reason: z.string().optional()
});

export const AiExperienceSchema = z.object({
  title: z.string().min(1).default('Custom Olfactory Blend'),
  description: z.string().min(1),
  channels: z
    .array(AiChannelItemSchema)
    .min(1, 'At least 1 aroma channel must be provided')
    .max(3, 'A maximum of 3 aroma channels are permitted for balanced dispersion'),
  light: z.object({
    r: z.number().int().min(0).max(255),
    g: z.number().int().min(0).max(255),
    b: z.number().int().min(0).max(255)
  }),
  durationSeconds: z.number().int().min(10).max(1800).default(60),
  batchId: z.string().optional(),
  formulaCode: z.string().optional(),
  spokenResponse: z.string().optional()
});

export type ValidatedAiExperience = z.infer<typeof AiExperienceSchema>;

/**
 * Validates raw AI JSON output with Zod against active dynamic cartridges
 */
export function validateAiExperienceResponse(rawData: unknown): {
  success: boolean;
  data?: ValidatedAiExperience;
  error?: string;
} {
  const result = AiExperienceSchema.safeParse(rawData);
  if (!result.success) {
    const errorDetails = result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    return {
      success: false,
      error: `AI Response Validation Error: ${errorDetails}`
    };
  }

  const channelMap = cartridgeService.getChannelMap();

  // Double check that non-working/defective channels are not present
  for (const ch of result.data.channels) {
    const upperId = ch.channelId.toUpperCase();
    const config = channelMap[upperId];
    if (!config || config.status !== 'working' || config.isLighting || config.isAirflow) {
      return {
        success: false,
        error: `Validation rejected non-working/reserved channel ${upperId}`
      };
    }
  }

  return {
    success: true,
    data: result.data
  };
}
