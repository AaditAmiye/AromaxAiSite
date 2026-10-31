import { TherapyProgram } from '../types/therapy';

export const THERAPY_PROGRAMS: TherapyProgram[] = [
  {
    id: 'therapy-relaxation-10',
    title: 'Deep Relaxation & Rest',
    category: 'Relaxation',
    durationMinutes: 10,
    totalDurationSeconds: 600,
    shortDescription: 'Gentle atmospheric descent from grounding petrichor into tranquil lavender and warm bourbon vanilla.',
    intent: 'Promotes deep parasympathetic breathing and somatic calm after stressful transitions.',
    recommendedTimeOfDay: 'Evening or Post-Work',
    iconName: 'spa',
    badge: 'Flagship 10m',
    stages: [
      {
        stageNumber: 1,
        title: 'Stage 1: Grounding & Centering',
        durationSeconds: 120, // 2 minutes
        channels: [
          { channelId: 'H19', intensity: 0.70, reason: 'Grounding geosmin and petrichor' }
        ],
        light: { r: 180, g: 83, b: 9 }, // Earthy amber
        description: 'Take slow, diaphragmatic breaths as the aroma of rain on warm soil anchors your awareness.'
      },
      {
        stageNumber: 2,
        title: 'Stage 2: Heart Sanctuary',
        durationSeconds: 240, // 4 minutes
        channels: [
          { channelId: 'H18', intensity: 0.45, reason: 'Sacred sandalwood heartwood' },
          { channelId: 'H22', intensity: 0.55, reason: 'French lavender and water lotus' }
        ],
        light: { r: 155, g: 81, b: 224 }, // Gentle purple
        description: 'Allow muscle tension in your shoulders to dissolve as soft lavender and sandalwood bloom.'
      },
      {
        stageNumber: 3,
        title: 'Stage 3: Warm Twilight Slumber',
        durationSeconds: 240, // 4 minutes
        channels: [
          { channelId: 'H08', intensity: 0.40, reason: 'Comforting bourbon vanilla' },
          { channelId: 'H22', intensity: 0.60, reason: 'Tranquil evening lavender' }
        ],
        light: { r: 255, g: 179, b: 64 }, // Warm dusk glow
        description: 'Gentle warmth envelops your sensory field, bringing heart rate and thoughts to stillness.'
      }
    ]
  },
  {
    id: 'therapy-focus-15',
    title: 'Cognitive Flow & Clarity',
    category: 'Focus',
    durationMinutes: 15,
    totalDurationSeconds: 900,
    shortDescription: 'Alternating micro-pulses of crisp peppermint and bitter citrus designed for sustained mental flow.',
    intent: 'Sharpens attention and clears mental fog without overstimulation.',
    recommendedTimeOfDay: 'Morning or Mid-Afternoon',
    iconName: 'psychology',
    badge: 'Productivity',
    stages: [
      {
        stageNumber: 1,
        title: 'Stage 1: Cognitive Awakening',
        durationSeconds: 180,
        channels: [
          { channelId: 'H25', intensity: 0.75, reason: 'Crisp menthol activation' },
          { channelId: 'H15', intensity: 0.25, reason: 'Sparkling citrus zest' }
        ],
        light: { r: 0, g: 199, b: 190 },
        description: 'Vigorous inhalation clears nasal passages and signals alertness to the central nervous system.'
      },
      {
        stageNumber: 2,
        title: 'Stage 2: Sustained Deep Work',
        durationSeconds: 480,
        channels: [
          { channelId: 'H29', intensity: 0.40, reason: 'Clarifying green cardamom' },
          { channelId: 'H18', intensity: 0.35, reason: 'Steadying sandalwood base' },
          { channelId: 'H25', intensity: 0.25, reason: 'Subtle mint cadence' }
        ],
        light: { r: 52, g: 199, b: 89 },
        description: 'Maintain deep flow state with an aromatic balance of spice and wood.'
      },
      {
        stageNumber: 3,
        title: 'Stage 3: Completion & Integration',
        durationSeconds: 240,
        channels: [
          { channelId: 'H31', intensity: 0.60, reason: 'Neutral water carrier purge' },
          { channelId: 'H08', intensity: 0.40, reason: 'Subtle sweet reward vanilla' }
        ],
        light: { r: 0, g: 113, b: 227 },
        description: 'The air clears gently, leaving the workspace refreshed and clear.'
      }
    ]
  },
  {
    id: 'therapy-sleep-20',
    title: 'Circadian Transition to Sleep',
    category: 'Sleep',
    durationMinutes: 20,
    totalDurationSeconds: 1200,
    shortDescription: 'Ultra-low emission diffusion designed to prepare the brain for natural slow-wave sleep cycles.',
    intent: 'Prepares bedroom atmosphere and sensory cues for undisturbed restorative sleep.',
    recommendedTimeOfDay: '30 min Before Bed',
    iconName: 'bedtime',
    badge: 'Night Routine',
    stages: [
      {
        stageNumber: 1,
        title: 'Stage 1: Disconnection from Screens',
        durationSeconds: 300,
        channels: [
          { channelId: 'H19', intensity: 0.50, reason: 'Damp loamy petrichor' },
          { channelId: 'H18', intensity: 0.50, reason: 'Warm sandalwood' }
        ],
        light: { r: 255, g: 90, b: 20 },
        description: 'Lower ambient lights. Disconnect from digital inputs as the aroma grounds your thoughts.'
      },
      {
        stageNumber: 2,
        title: 'Stage 2: Somatic Unwinding',
        durationSeconds: 500,
        channels: [
          { channelId: 'H22', intensity: 0.70, reason: 'Pure sedative lavender' },
          { channelId: 'H08', intensity: 0.30, reason: 'Comforting vanilla' }
        ],
        light: { r: 120, g: 40, b: 160 },
        description: 'Notice the sensation of your body against the mattress. Release lingering tension from the day.'
      },
      {
        stageNumber: 3,
        title: 'Stage 3: Whispering Night Breeze',
        durationSeconds: 400,
        channels: [
          { channelId: 'H22', intensity: 0.40, reason: 'Faint lavender trace' },
          { channelId: 'H31', intensity: 0.60, reason: 'Clean air humidification' }
        ],
        light: { r: 30, g: 10, b: 40 },
        description: 'Aromas gently taper to clean neutral airflow, allowing uninterrupted natural sleep.'
      }
    ]
  },
  {
    id: 'therapy-meditation-15',
    title: 'Temple Stillness & Vipassana',
    category: 'Meditation',
    durationMinutes: 15,
    totalDurationSeconds: 900,
    shortDescription: 'Sacred Himalayan sanctum resins and Mysore sandalwood aiding single-pointed concentration.',
    intent: 'Enters deep contemplative states reminiscent of ancient meditation caves.',
    recommendedTimeOfDay: 'Early Morning',
    iconName: 'self_improvement',
    badge: 'Spiritual',
    stages: [
      {
        stageNumber: 1,
        title: 'Stage 1: Altar Invocation',
        durationSeconds: 240,
        channels: [
          { channelId: 'H33', intensity: 0.65, reason: 'Sacred dhoop and sambrani resin' },
          { channelId: 'H34', intensity: 0.35, reason: 'Golden saffron' }
        ],
        light: { r: 245, g: 158, b: 11 },
        description: 'Observe the breath at the tip of the nostrils as sacred resins define the space.'
      },
      {
        stageNumber: 2,
        title: 'Stage 2: Pure Stillness',
        durationSeconds: 480,
        channels: [
          { channelId: 'H18', intensity: 0.85, reason: 'Heartwood Mysore sandalwood' },
          { channelId: 'H33', intensity: 0.15, reason: 'Lingering incense whisper' }
        ],
        light: { r: 217, g: 119, b: 6 },
        description: 'Dwelling in stillness. Sandalwood supports upright posture and silent awareness.'
      },
      {
        stageNumber: 3,
        title: 'Stage 3: Gentle Emergence',
        durationSeconds: 180,
        channels: [
          { channelId: 'H07', intensity: 0.35, reason: 'Faint delicate rose' },
          { channelId: 'H31', intensity: 0.65, reason: 'Pure water vapor' }
        ],
        light: { r: 255, g: 150, b: 180 },
        description: 'Bringing clarity and tranquility from the cushion back into active daily life.'
      }
    ]
  }
];
