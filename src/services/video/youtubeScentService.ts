import { VideoDemo, VideoScentEvent } from '../../types/video';
import { cartridgeService } from '../cartridges/cartridgeService';
import { calculateBlendDominantLight } from '../hardware/lightEngine';
import { getGeminiApiKey } from '../ai/aiService';

/**
 * Extracts a valid 11-character YouTube video ID from any standard URL or string
 */
export function extractYouTubeId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // If already an 11-character ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Regex for full, short, embed, and shorts URLs
  const regExp =
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/;
  const match = trimmed.match(regExp);
  return match && match[1] ? match[1] : null;
}

/**
 * Public CORS-friendly metadata fetcher for YouTube videos
 */
export async function fetchYouTubeVideoInfo(
  youtubeId: string
): Promise<{ title: string; author: string; thumbnail: string } | null> {
  // 1. Try official YouTube oEmbed
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${youtubeId}&format=json`;
    const res = await fetch(oembedUrl);
    if (res.ok) {
      const data = await res.json();
      if (data && data.title) {
        return {
          title: data.title,
          author: data.author_name || 'YouTube Creator',
          thumbnail: data.thumbnail_url || `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`
        };
      }
    }
  } catch {
    // Non-fatal, try fallback
  }

  // 2. Try noembed fallback
  try {
    const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${youtubeId}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.title) {
        return {
          title: data.title,
          author: data.author_name || 'YouTube Creator',
          thumbnail: data.thumbnail_url || `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`
        };
      }
    }
  } catch {
    // Non-fatal, fallback to default labels
  }

  return {
    title: `YouTube Cinema (${youtubeId})`,
    author: 'YouTube',
    thumbnail: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`
  };
}

/**
 * High-definition curated YouTube experiences with verified, 100% embeddable video IDs
 * and cinema-mastered olfactory soundtracks.
 */
export const CURATED_YOUTUBE_VIDEOS: VideoDemo[] = [
  {
    id: 'yt-cheeni-kum',
    youtubeId: 'CgYa2Z3jbKI',
    title: 'Cheeni Kum (2007) Official Trailer | Amitabh Bachchan, Tabu',
    subtitle: 'Bitter Grapefruit • Masala Pulao • Burnt Jealousy • Birthday Cake • Mitti',
    durationSeconds: 126,
    thumbnailUrl: 'https://i.ytimg.com/vi/CgYa2Z3jbKI/hqdefault.jpg',
    tags: ['Cheeni Kum', 'Culinary Cinema', 'Scent Sync', 'Gemini Vision'],
    description: 'Buddhadev culinary philosophy and kitchen mastery in London fine dining restaurant, intense dialogue, sweet confections, and grounded heritage earth.',
    visualAnalysis: [
      'Buddhadev engaging eyes, nose, and tongue in culinary preparation',
      'Authentic Hyderabadi zaffrani pulao with aromatic spices',
      'Tension-filled kitchen confrontational dialog and burnt rivalry',
      'Birthday celebration cake cutting and dialogue on ages 64 and 34',
      'Traditional family discussions, father-in-law meeting, and grounded Indian heritage'
    ],
    summary: 'A culinary romantic comedy sensory narrative featuring sharp citrus gastronomy, whole aromatic spices, intense smoky caramelization, birthday confection, and traditional mitti earth.',
    events: [
      {
        id: 'ck-1',
        timeSeconds: 2,
        durationSeconds: 18,
        title: 'Bitter Grapefruit, Citrus & Fine Dining',
        channels: ['H01', 'H04', 'H17'],
        light: { r: 245, g: 158, b: 11 },
        note: 'Talking about cooking as an art, engaging eyes, nose, and tongue.',
        visualClue: 'Talking about cooking as an art, engaging eyes, nose, and tongue',
        channelDetails: [
          { channelId: 'H01', intensity: 0.85, smellName: 'Bitter Grapefruit', reason: 'Engaging the nose with sharp citrus' },
          { channelId: 'H04', intensity: 0.65, smellName: 'Lemon Zest', reason: 'Culinary citrus introduction' },
          { channelId: 'H17', intensity: 0.50, smellName: 'Fine Dining Gastronomy', reason: 'Cooking as an art engaging eyes and tongue' }
        ]
      },
      {
        id: 'ck-2',
        timeSeconds: 20,
        durationSeconds: 16,
        title: 'Spicy Masala & Hyderabadi Zaffrani Pulao',
        channels: ['H10', 'H18'],
        light: { r: 217, g: 119, b: 6 },
        note: 'Mentioning dishes, Hyderabadi zaffrani pulao, and spices.',
        visualClue: 'Mentioning dishes, Hyderabadi zaffrani pulao, and spices',
        channelDetails: [
          { channelId: 'H10', intensity: 0.90, smellName: 'Masala Chai & Saffron', reason: 'Hyderabadi zaffrani pulao and whole spices' },
          { channelId: 'H18', intensity: 0.70, smellName: 'Clove & Cinnamon Bark', reason: 'Aromatic cinnamaldehyde and eugenol' }
        ]
      },
      {
        id: 'ck-3',
        timeSeconds: 43,
        durationSeconds: 17,
        title: 'Burning Wood & Smoky Jealousy',
        channels: ['H21', 'H31'],
        light: { r: 220, g: 38, b: 38 },
        note: 'Intense dialog, "999 grams of jealousy/burning"',
        visualClue: 'Intense dialog, "999 grams of jealousy/burning"',
        channelDetails: [
          { channelId: 'H21', intensity: 0.85, smellName: 'Burnt Milk & Scorched Pan', reason: 'Intense dialog, 999 grams of burning jealousy' },
          { channelId: 'H31', intensity: 0.75, smellName: 'Burning Wood Smoke', reason: 'Harsh tone and scorched embers' }
        ]
      },
      {
        id: 'ck-4',
        timeSeconds: 61,
        durationSeconds: 19,
        title: 'Sweet Birthday Cake & Vanilla Dessert',
        channels: ['H26', 'H15'],
        light: { r: 236, g: 72, b: 153 },
        note: 'Cake cutting discussion about ages 64 and 34.',
        visualClue: 'Cake cutting discussion about ages 64 and 34',
        channelDetails: [
          { channelId: 'H26', intensity: 0.85, smellName: 'Sweet Vanilla & Cocoa', reason: 'Cake cutting discussion about ages 64 and 34' },
          { channelId: 'H15', intensity: 0.65, smellName: 'Rasmalai Sweet Mist', reason: 'Rich sweet confection' }
        ]
      },
      {
        id: 'ck-5',
        timeSeconds: 102,
        durationSeconds: 24,
        title: 'Mitti Heritage & Traditional Ambiance',
        channels: ['H22', 'H06'],
        light: { r: 180, g: 83, b: 9 },
        note: 'Meeting the father-in-law, family discussions, and the conclusion.',
        visualClue: 'Meeting the father-in-law, family discussions, and the conclusion',
        channelDetails: [
          { channelId: 'H22', intensity: 0.85, smellName: 'Mitti (Earthy Loam)', reason: 'Traditional heritage and grounded Indian roots' },
          { channelId: 'H06', intensity: 0.60, smellName: 'Ayurvedic Botanical Blend', reason: 'Meeting the father-in-law, family discussions, and conclusion' }
        ]
      }
    ]
  },
  {
    id: 'hd-sensory-odyssey',
    youtubeId: 'LXb3EKWsInQ',
    videoUrl: '/sensory-odyssey.mp4',
    title: 'Sensory Odyssey: Earth, Canopy & Rain',
    subtitle: 'Direct HD Video • Rain Petrichor • Sandalwood • Waterfall Mist',
    durationSeconds: 120,
    thumbnailUrl: 'https://i.ytimg.com/vi/LXb3EKWsInQ/hqdefault.jpg',
    tags: ['Direct HD Video', 'Rainforest', 'Petrichor ASMR', 'Gemini Vision'],
    description: 'First raindrops striking warm jungle soil, damp canopy ferns, wild blooming orchids, and cool waterfall ozone.',
    visualAnalysis: [
      'Dense tropical rainforest canopy with lush green foliage',
      'Dewy snake resting on vibrant red flower petals',
      'Mist-covered mountains and humid jungle atmosphere',
      'Flowing waterfalls and sparkling river water'
    ],
    summary: 'A sensory journey through the humid, lush biodiversity of the rainforest canopy.',
    events: [
      {
        id: 'so-1',
        timeSeconds: 0,
        durationSeconds: 40,
        title: 'Mitti & Rain Petrichor (Geosmin)',
        visualClue: 'Raindrops falling onto rich tropical soil',
        channels: ['H19'],
        light: { r: 52, g: 199, b: 89 },
        note: 'First heavy tropical rain striking fertile jungle soil (Geosmin C12H22O)',
        channelDetails: [{ channelId: 'H19', intensity: 0.85, reason: 'Tropical soil petrichor' }]
      },
      {
        id: 'so-2',
        timeSeconds: 40,
        durationSeconds: 40,
        title: 'Ancient Cedar Canopy & Sandalwood',
        visualClue: 'Towering rainforest trees and damp heartwood',
        channels: ['H18', 'H19'],
        light: { r: 217, g: 119, b: 6 },
        note: 'Stepping beneath giant moss-covered rain trees with aged wet bark',
        channelDetails: [
          { channelId: 'H18', intensity: 0.70, reason: 'Aged rainforest cedar heartwood' },
          { channelId: 'H19', intensity: 0.30, reason: 'Damp loam understory' }
        ]
      },
      {
        id: 'so-3',
        timeSeconds: 80,
        durationSeconds: 40,
        title: 'Wild Blooming Orchid & French Lavender',
        visualClue: 'Exotic wild flowers opening in misty air',
        channels: ['H22', 'H07'],
        light: { r: 155, g: 81, b: 224 },
        note: 'Exotic wild orchid blossoms opening in the humid mist',
        channelDetails: [
          { channelId: 'H22', intensity: 0.65, reason: 'Lush tropical floral nectar' },
          { channelId: 'H07', intensity: 0.35, reason: 'Dewy blooming petals' }
        ]
      }
    ]
  },
  {
    id: 'yt-costa-rica-rainforest',
    youtubeId: 'LXb3EKWsInQ', // 4K Costa Rica Nature HDR (Jacob + Katie Schwarz, 100% open embed)
    videoUrl: '/sensory-odyssey.mp4',
    title: 'Costa Rica 4K: Tropical Rainforest Canopy',
    subtitle: 'Rain Petrichor • Jungle Loam • Wild Orchid • Waterfall Mist',
    durationSeconds: 180,
    thumbnailUrl: 'https://i.ytimg.com/vi/LXb3EKWsInQ/hqdefault.jpg',
    tags: ['4K Nature', 'Rainforest', 'Petrichor ASMR'],
    description: 'First raindrops striking warm tropical jungle soil, damp canopy ferns, wild blooming orchids, and cool waterfall ozone.',
    visualAnalysis: [
      'Lush tropical jungle leaves and vibrant flora',
      'Rainfall awakening rich soil geosmin',
      'Ancient trees covered in moss and mist'
    ],
    summary: 'Visual exploration of Costa Rican tropical biodiversity and misty waterfall canopies.',
    events: [
      {
        id: 'yt-cr-1',
        timeSeconds: 0,
        durationSeconds: 45,
        title: 'Mitti & Rain Petrichor (Geosmin)',
        channels: ['H19'],
        light: { r: 52, g: 199, b: 89 },
        note: 'First heavy tropical rain striking fertile jungle soil (Geosmin C12H22O)',
        channelDetails: [{ channelId: 'H19', intensity: 0.85, reason: 'Tropical soil petrichor' }]
      },
      {
        id: 'yt-cr-2',
        timeSeconds: 45,
        durationSeconds: 45,
        title: 'Ancient Cedar Canopy & Sandalwood',
        channels: ['H18', 'H19'],
        light: { r: 217, g: 119, b: 6 },
        note: 'Stepping beneath giant moss-covered rain trees with aged wet bark',
        channelDetails: [
          { channelId: 'H18', intensity: 0.70, reason: 'Aged rainforest cedar heartwood' },
          { channelId: 'H19', intensity: 0.30, reason: 'Damp loam understory' }
        ]
      },
      {
        id: 'yt-cr-3',
        timeSeconds: 90,
        durationSeconds: 45,
        title: 'Wild Blooming Orchid & French Lavender',
        channels: ['H22', 'H07'],
        light: { r: 155, g: 81, b: 224 },
        note: 'Exotic wild orchid blossoms opening in the humid mist',
        channelDetails: [
          { channelId: 'H22', intensity: 0.65, reason: 'Lush tropical floral nectar' },
          { channelId: 'H07', intensity: 0.35, reason: 'Dewy blooming petals' }
        ]
      },
      {
        id: 'yt-cr-4',
        timeSeconds: 135,
        durationSeconds: 45,
        title: 'Waterfall Spray Ozone & Mountain Mint',
        channels: ['H25', 'H31'],
        light: { r: 0, g: 199, b: 190 },
        note: 'Icy mist blowing from towering jungle waterfall carrying crisp ozone',
        channelDetails: [
          { channelId: 'H25', intensity: 0.70, reason: 'Crystalline crisp menthol breeze' },
          { channelId: 'H31', intensity: 0.30, reason: 'Pure water atomization' }
        ]
      }
    ]
  },
  {
    id: 'yt-alpine-campfire',
    youtubeId: 'L_LUpnjgPso', // Fireplace Ambience – Cozy Fire
    title: 'Alpine Hearth & Midnight Embers',
    subtitle: 'Birch Fire • Sandalwood • Toasted Vanilla Embers',
    durationSeconds: 150,
    thumbnailUrl: 'https://i.ytimg.com/vi/L_LUpnjgPso/hqdefault.jpg',
    tags: ['Campfire', 'Hearth', 'Smoky Accord'],
    description: 'Dry birch firewood crackling in an open autumn hearth under the clear mountain stars.',
    events: [
      {
        id: 'yt-fp-1',
        timeSeconds: 0,
        durationSeconds: 50,
        title: 'Charred Birch Wood Embers',
        channels: ['H28'],
        light: { r: 255, g: 107, b: 0 },
        note: 'Dry firewood crackling with fragrant wood resin smoke',
        channelDetails: [{ channelId: 'H28', intensity: 0.85, reason: 'Dry birch log smoke' }]
      },
      {
        id: 'yt-fp-2',
        timeSeconds: 50,
        durationSeconds: 50,
        title: 'Cold Mountain Breeze & Sandalwood',
        channels: ['H18', 'H25'],
        light: { r: 217, g: 119, b: 6 },
        note: 'Aged sandalwood logs burning slowly in the cold autumn draft',
        channelDetails: [
          { channelId: 'H18', intensity: 0.70, reason: 'Mysore sandalwood heartwood' },
          { channelId: 'H25', intensity: 0.30, reason: 'Crisp freezing night air' }
        ]
      },
      {
        id: 'yt-fp-3',
        timeSeconds: 100,
        durationSeconds: 50,
        title: 'Golden Vanilla & Sweet Embers',
        channels: ['H08', 'H28'],
        light: { r: 245, g: 158, b: 11 },
        note: 'Warm comforting vanilla sweetness floating on dying embers',
        channelDetails: [
          { channelId: 'H08', intensity: 0.65, reason: 'Bourbon vanilla bean' },
          { channelId: 'H28', intensity: 0.35, reason: 'Soft birch embers' }
        ]
      }
    ]
  },
  {
    id: 'yt-the-alps',
    youtubeId: '3PZ65s2qLTE', // The Alps 4K Relaxation
    title: 'The Alps 4K: Glacial Summits & Pine Valleys',
    subtitle: 'Glacial Ozone • Mountain Mint • Alpine Pine • Pure Stream',
    durationSeconds: 180,
    thumbnailUrl: 'https://i.ytimg.com/vi/3PZ65s2qLTE/hqdefault.jpg',
    tags: ['The Alps', 'Mountain Air', 'Glacial ASMR'],
    description: 'Crisp glacial mountain winds sweeping across pine-covered Swiss valleys and crystal turquoise lakes.',
    events: [
      {
        id: 'yt-alps-1',
        timeSeconds: 0,
        durationSeconds: 60,
        title: 'Crisp Glacial Peppermint Ozone',
        channels: ['H25'],
        light: { r: 0, g: 199, b: 190 },
        note: 'Sub-zero freezing alpine breeze carrying pristine natural ozone',
        channelDetails: [{ channelId: 'H25', intensity: 0.90, reason: 'Freezing mountain menthol' }]
      },
      {
        id: 'yt-alps-2',
        timeSeconds: 60,
        durationSeconds: 60,
        title: 'Alpine Evergreen & Sandalwood Pines',
        channels: ['H18', 'H19'],
        light: { r: 34, g: 139, b: 34 },
        note: 'Dense evergreen needle floor warming in high altitude sunshine',
        channelDetails: [
          { channelId: 'H18', intensity: 0.75, reason: 'Resinous heartwood timber' },
          { channelId: 'H19', intensity: 0.25, reason: 'Rocky soil loam' }
        ]
      },
      {
        id: 'yt-alps-3',
        timeSeconds: 120,
        durationSeconds: 60,
        title: 'Pure Alpine Glacier Water & Bitter Bergamot',
        channels: ['H31', 'H15'],
        light: { r: 70, g: 130, b: 180 },
        note: 'Meltwater rushing down granite riverbeds with sparkling bitter citrus air',
        channelDetails: [
          { channelId: 'H31', intensity: 0.60, reason: 'Pure water stream' },
          { channelId: 'H15', intensity: 0.40, reason: 'Sparkling bitter zest' }
        ]
      }
    ]
  },
  {
    id: 'yt-morning-coffee',
    youtubeId: '1fueZCTYkpA', // Morning Coffee Lofi
    title: 'Morning Artisan Café: Espresso & Bakery',
    subtitle: 'Dark Roast Crema • Bourbon Vanilla • Steamed Milk • Cacao',
    durationSeconds: 150,
    thumbnailUrl: 'https://i.ytimg.com/vi/1fueZCTYkpA/hqdefault.jpg',
    tags: ['Artisan Coffee', 'Café Ambience', 'Gourmand'],
    description: 'Freshly extracted dark espresso, velvety Madagascar bourbon vanilla, sweet microfoam milk, and roasted cacao nibs.',
    events: [
      {
        id: 'yt-mc-1',
        timeSeconds: 0,
        durationSeconds: 50,
        title: 'Dark Roasted Espresso Extraction',
        channels: ['H24'],
        light: { r: 139, g: 69, b: 19 },
        note: '9-bar pressure extraction pulling fragrant dark crema',
        channelDetails: [{ channelId: 'H24', intensity: 0.90, reason: 'Fresh pulled espresso crema' }]
      },
      {
        id: 'yt-mc-2',
        timeSeconds: 50,
        durationSeconds: 50,
        title: 'Bourbon Vanilla Steamed Microfoam',
        channels: ['H08', 'H16'],
        light: { r: 255, g: 190, b: 70 },
        note: 'Warm steamed sweet milk folded with rich bourbon vanilla',
        channelDetails: [
          { channelId: 'H08', intensity: 0.60, reason: 'Bourbon vanilla bean' },
          { channelId: 'H16', intensity: 0.40, reason: 'Creamy sweet milk' }
        ]
      },
      {
        id: 'yt-mc-3',
        timeSeconds: 100,
        durationSeconds: 50,
        title: 'Roasted Cacao & Crushed Cardamom',
        channels: ['H05', 'H29'],
        light: { r: 110, g: 60, b: 35 },
        note: 'Finishing dusting of roasted cacao nibs and green cardamom pods',
        channelDetails: [
          { channelId: 'H05', intensity: 0.70, reason: 'Dark cocoa butter' },
          { channelId: 'H29', intensity: 0.30, reason: 'Green cardamom spice' }
        ]
      }
    ]
  },
  {
    id: 'yt-lakeside-birds',
    youtubeId: 'qRTVg8HHzUo', // Lakeshore Birds & Water Sounds
    title: 'Lakeside Dawn: Singing Birds & Gentle Waters',
    subtitle: 'Lotus Water • Morning Dew • French Lavender • Wet Moss',
    durationSeconds: 150,
    thumbnailUrl: 'https://i.ytimg.com/vi/qRTVg8HHzUo/hqdefault.jpg',
    tags: ['Lakeside', 'Morning Birds', 'Floral Water'],
    description: 'Tranquil dawn mist drifting across mountain lake waters, water lilies, and dewy French lavender.',
    events: [
      {
        id: 'yt-lb-1',
        timeSeconds: 0,
        durationSeconds: 50,
        title: 'Morning Lake Dew & Lotus Petals',
        channels: ['H22', 'H31'],
        light: { r: 100, g: 180, b: 240 },
        note: 'Cool morning mist over still mountain lake with gentle water lily scent',
        channelDetails: [
          { channelId: 'H22', intensity: 0.60, reason: 'Serene lotus floral' },
          { channelId: 'H31', intensity: 0.40, reason: 'Clean morning water' }
        ]
      },
      {
        id: 'yt-lb-2',
        timeSeconds: 50,
        durationSeconds: 50,
        title: 'French Lavender & Wild Rose Petals',
        channels: ['H22', 'H07'],
        light: { r: 155, g: 81, b: 224 },
        note: 'Blooming shoreline lavender bushes catching the first sunlight',
        channelDetails: [
          { channelId: 'H22', intensity: 0.70, reason: 'French lavender flowers' },
          { channelId: 'H07', intensity: 0.30, reason: 'Dewy wild rose' }
        ]
      },
      {
        id: 'yt-lb-3',
        timeSeconds: 100,
        durationSeconds: 50,
        title: 'Damp Shoreline Loam & Cedarwood',
        channels: ['H19', 'H18'],
        light: { r: 52, g: 199, b: 89 },
        note: 'Wet river stones, damp moss, and fallen cedar branches',
        channelDetails: [
          { channelId: 'H19', intensity: 0.65, reason: 'Damp stone petrichor' },
          { channelId: 'H18', intensity: 0.35, reason: 'Aged cedar bark' }
        ]
      }
    ]
  }
];

export interface GeminiVideoAnalysisResult {
  events: VideoScentEvent[];
  visualAnalysis: string[];
  summary: string;
  hasMultimodalVision: boolean;
  source: string;
}

/**
 * Intelligent AI Smell Script Generator for ANY Video using Gemini AI Vision
 * Extracts visual objects, scene lighting, and environmental materials to synthesize
 * physical 34-port olfactory telemetry synchronized to the video timestamps.
 */
export async function generateAiSmellTrackForVideo(
  videoTitle: string,
  userNotes?: string,
  totalDurationSeconds = 60,
  youtubeId?: string,
  frameBase64?: string
): Promise<GeminiVideoAnalysisResult> {
  const duration = Math.max(5, Math.round(totalDurationSeconds || 60));

  const workingChannels = cartridgeService.getWorkingChannels();
  const workingChannelMap = cartridgeService.getChannelMap();
  const apiKey = getGeminiApiKey();

  // 1. Attempt server-side Gemini Vision generation
  try {
    const res = await fetch('/api/ai/generate-video-scents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoTitle,
        videoDescription: userNotes,
        youtubeId,
        durationSeconds: duration,
        userNotes,
        frameBase64,
        apiKey: apiKey || undefined,
        activeCartridges: workingChannels.map((c) => ({
          id: c.id,
          name: c.name,
          category: c.category,
          description: c.description
        }))
      })
    });

    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data.events) && data.events.length > 0) {
          const enrichedEvents = data.events.map((ev: VideoScentEvent) => {
            const chId = ev.channels?.[0];
            const ch = chId ? workingChannelMap[chId.toUpperCase()] : undefined;
            const smellName = ev.smellName || (ch ? ch.name : ev.title);
            return {
              ...ev,
              smellName,
              note: ev.note || `Producing ${smellName} from Chamber ${chId || 'H19'}.`
            };
          });

          const normalizedEvents = normalizeVideoScentTimeline(enrichedEvents, duration);

          return {
            events: normalizedEvents,
            visualAnalysis: Array.isArray(data.visualAnalysis) ? data.visualAnalysis : [],
            summary: data.summary || '',
            hasMultimodalVision: Boolean(data.hasMultimodalVision),
            source: data.source || 'gemini-3.1-flash-lite'
          };
        }
      }
    }
    console.warn(`[Gemini AI Video] Server returned ${res.status}. Falling back to dynamic sensory engine.`);
  } catch (err) {
    console.warn('[Gemini AI Video] Server AI call unreachable, falling back to dynamic sensory engine:', err);
  }

  // 3. Fallback: Dynamic Rule-Based Sensory Engine with Seamless Full Coverage
  const prompt = `${videoTitle} ${userNotes || ''}`.toLowerCase();
  const cueCount = duration <= 15 ? 1 : duration <= 35 ? 2 : duration <= 90 ? 3 : 4;
  const cueDuration = Math.round(duration / cueCount);
  const cueGap = cueDuration;

  const availableIds = cartridgeService.getWorkingChannelIds();
  const channelMap = cartridgeService.getChannelMap();

  const safeChannels = (candidates: string[]) => {
    const valid = candidates.filter((id) => availableIds.includes(id.toUpperCase()));
    return valid.length > 0 ? valid : [availableIds[0] || 'H19'];
  };

  const createEvent = (
    id: string,
    timeSeconds: number,
    durationSeconds: number,
    title: string,
    candidates: string[],
    light: { r: number; g: number; b: number },
    visualClue: string,
    details: Array<{ channelId: string; intensity: number; reason: string }>
  ): VideoScentEvent => {
    const channels = safeChannels(candidates);
    const primaryId = channels[0];
    const ch = channelMap[primaryId];
    const smellName = ch ? ch.name : title;

    const channelDetails = details.map((d) => {
      const dCh = channelMap[d.channelId] || ch;
      return {
        ...d,
        channelId: dCh ? dCh.id : primaryId,
        smellName: dCh ? dCh.name : smellName
      };
    });

    return {
      id,
      timeSeconds,
      durationSeconds,
      title,
      smellName,
      channels,
      light,
      note: `Producing ${smellName} from Chamber ${primaryId}.`,
      visualClue,
      channelDetails
    };
  };

  // Determine thematic track
  if (prompt.includes('rain') || prompt.includes('water') || prompt.includes('forest') || prompt.includes('jungle') || prompt.includes('nature') || prompt.includes('costa')) {
    return {
      visualAnalysis: [
        'Rainforest canopy with glistening wet leaves',
        'Tropical rain falling on damp moss and fertile soil',
        'Exotic blooming jungle flowers and mist'
      ],
      summary: 'Sensory atmosphere of tropical rainforest canopy after rainfall.',
      hasMultimodalVision: false,
      source: 'device-calibrated-engine',
      events: [
        createEvent(
          `ai-cue-1-${Date.now()}`,
          0,
          cueDuration,
          'Rain on Soil (Geosmin Petrichor)',
          ['H19'],
          { r: 52, g: 199, b: 89 },
          'Raindrops falling onto damp soil and leaves',
          [{ channelId: 'H19', intensity: 0.85, reason: 'Earthy rain petrichor' }]
        ),
        createEvent(
          `ai-cue-2-${Date.now()}`,
          cueGap,
          cueDuration,
          'Damp Cedar & Sandalwood Woods',
          ['H18', 'H19'],
          { r: 217, g: 119, b: 6 },
          'Towering forest trees and wet moss loam',
          [
            { channelId: 'H18', intensity: 0.65, reason: 'Aged wood aroma' },
            { channelId: 'H19', intensity: 0.35, reason: 'Damp moss loam' }
          ]
        ),
        createEvent(
          `ai-cue-3-${Date.now()}`,
          cueGap * 2,
          cueDuration,
          'Cold Storm Ozone & Mint',
          ['H25', 'H15'],
          { r: 0, g: 199, b: 190 },
          'Crisp alpine mist and water spray',
          [
            { channelId: 'H25', intensity: 0.70, reason: 'Crisp crystal menthol' },
            { channelId: 'H15', intensity: 0.30, reason: 'Bitter citrus zest' }
          ]
        )
      ]
    };
  }

  if (prompt.includes('coffee') || prompt.includes('cafe') || prompt.includes('café') || prompt.includes('espresso') || prompt.includes('food') || prompt.includes('bake')) {
    return {
      visualAnalysis: [
        'Freshly extracted espresso with dark golden crema',
        'Steamed microfoam milk and vanilla pods',
        'Roasted cacao beans and crushed cardamom pods'
      ],
      summary: 'Warm artisanal cafe atmosphere with espresso extraction and sweet bakery notes.',
      hasMultimodalVision: false,
      source: 'device-calibrated-engine',
      events: [
        createEvent(
          `ai-cue-1-${Date.now()}`,
          0,
          cueDuration,
          'Dark Roasted Espresso Extraction',
          ['H24'],
          { r: 139, g: 69, b: 19 },
          'Espresso extracting from portafilter with golden crema',
          [{ channelId: 'H24', intensity: 0.85, reason: 'Dark espresso crema' }]
        ),
        createEvent(
          `ai-cue-2-${Date.now()}`,
          cueGap,
          cueDuration,
          'Bourbon Vanilla & Sweet Milk',
          ['H08', 'H16'],
          { r: 255, g: 190, b: 70 },
          'Steamed microfoam poured into mug with vanilla pod',
          [
            { channelId: 'H08', intensity: 0.60, reason: 'Warm vanilla bean' },
            { channelId: 'H16', intensity: 0.40, reason: 'Sweet milk confection' }
          ]
        ),
        createEvent(
          `ai-cue-3-${Date.now()}`,
          cueGap * 2,
          cueDuration,
          'Dark Cacao & Cardamom Glaze',
          ['H05', 'H29'],
          { r: 110, g: 60, b: 35 },
          'Dark roasted cocoa beans and green cardamom dusting',
          [
            { channelId: 'H05', intensity: 0.70, reason: 'Dark cocoa butter' },
            { channelId: 'H29', intensity: 0.30, reason: 'Crushed sweet cardamom' }
          ]
        )
      ]
    };
  }

  if (prompt.includes('fire') || prompt.includes('smoke') || prompt.includes('hearth') || prompt.includes('campfire') || prompt.includes('dark') || prompt.includes('night')) {
    return {
      visualAnalysis: [
        'Crackling fireplace embers glowing in orange and yellow',
        'Dry birch logs stacked on stone hearth',
        'Soft woodsmoke rising into the evening breeze'
      ],
      summary: 'Cozy hearthside atmosphere with crackling birch logs and comforting embers.',
      hasMultimodalVision: false,
      source: 'device-calibrated-engine',
      events: [
        createEvent(
          `ai-cue-1-${Date.now()}`,
          0,
          cueDuration,
          'Charred Birch Wood Embers',
          ['H28'],
          { r: 255, g: 107, b: 0 },
          'Bright orange fire flames consuming dry birch logs',
          [{ channelId: 'H28', intensity: 0.85, reason: 'Woodfire hearth smoke' }]
        ),
        createEvent(
          `ai-cue-2-${Date.now()}`,
          cueGap,
          cueDuration,
          'Mysore Sandalwood Resin',
          ['H18', 'H28'],
          { r: 217, g: 119, b: 6 },
          'Aged fragrant sandalwood heartwood smoking gently',
          [
            { channelId: 'H18', intensity: 0.75, reason: 'Pure heartwood sandalwood' },
            { channelId: 'H28', intensity: 0.25, reason: 'Charred wood smoke' }
          ]
        ),
        createEvent(
          `ai-cue-3-${Date.now()}`,
          cueGap * 2,
          cueDuration,
          'Bourbon Vanilla Embers',
          ['H08', 'H28'],
          { r: 245, g: 158, b: 11 },
          'Comforting sweet vanilla floating above glowing embers',
          [
            { channelId: 'H08', intensity: 0.65, reason: 'Bourbon vanilla bean' },
            { channelId: 'H28', intensity: 0.35, reason: 'Soft birch embers' }
          ]
        )
      ]
    };
  }

  // Universal Cinematic Atmosphere: Nature, Bloom & Woods
  return {
    visualAnalysis: [
      'Open landscape with morning sunlight and natural vegetation',
      'Gentle breeze rustling through flora and dewy petals',
      'Ancient forest trees with grounding woody heartwood'
    ],
    summary: 'Cinematic sensory landscape of nature, blooming florals, and comforting woods.',
    hasMultimodalVision: false,
    source: 'device-calibrated-engine',
    events: [
      createEvent(
        `ai-cue-1-${Date.now()}`,
        0,
        cueDuration,
        'Atmospheric Geosmin & Morning Mist',
        ['H19'],
        { r: 52, g: 199, b: 89 },
        'Morning sunlight shining over damp earth and wild foliage',
        [{ channelId: 'H19', intensity: 0.80, reason: 'Fresh earth & rain foundation' }]
      ),
      createEvent(
        `ai-cue-2-${Date.now()}`,
        cueGap,
        cueDuration,
        'French Lavender & Blooming Rose',
        ['H22', 'H07'],
        { r: 155, g: 81, b: 224 },
        'Purple flowers and blooming petals swaying in gentle wind',
        [
          { channelId: 'H22', intensity: 0.60, reason: 'Serene lavender bloom' },
          { channelId: 'H07', intensity: 0.40, reason: 'Dewy rose petals' }
        ]
      ),
      createEvent(
        `ai-cue-3-${Date.now()}`,
        cueGap * 2,
        cueDuration,
        'Aged Sandalwood & Sweet Bourbon Vanilla',
        ['H18', 'H08'],
        { r: 217, g: 119, b: 6 },
        'Old growth timber and comforting vanilla sunset glow',
        [
          { channelId: 'H18', intensity: 0.65, reason: 'Mysore sandalwood' },
          { channelId: 'H08', intensity: 0.35, reason: 'Comforting bourbon vanilla' }
        ]
      )
    ]
  };
}

/**
 * Enriches any VideoScentEvent with the real cartridge smell name from the physical device!
 */
export function enrichVideoScentEvent(event: VideoScentEvent): VideoScentEvent {
  const primaryId = event.channels?.[0];
  const ch = primaryId ? cartridgeService.getChannel(primaryId) : undefined;
  const smellName = event.smellName || (ch ? ch.name : (event.title || 'Device Scent'));

  const channelMap = cartridgeService.getChannelMap();
  const channelDetails = (event.channelDetails || []).map((d) => {
    const dCh = channelMap[d.channelId];
    return {
      ...d,
      smellName: d.smellName || (dCh ? dCh.name : d.channelId)
    };
  });

  return {
    ...event,
    smellName,
    channelDetails: channelDetails.length > 0 ? channelDetails : [
      {
        channelId: primaryId || 'H19',
        smellName,
        intensity: 0.85,
        reason: event.note || `Producing ${smellName}`
      }
    ]
  };
}

/**
 * Proportionally rescales scent events to match a new video duration while preserving
 * relative cue timing and deliberate scent pauses / gaps.
 */
export function rescaleTimelineToDuration(
  events: VideoScentEvent[],
  newDurationSeconds: number,
  _originalDurationSeconds?: number
): VideoScentEvent[] {
  const newDuration = Math.max(5, Math.round(newDurationSeconds));
  if (!events || events.length === 0) {
    return [];
  }

  const origDuration =
    _originalDurationSeconds && _originalDurationSeconds > 0
      ? _originalDurationSeconds
      : Math.max(...events.map((e) => e.timeSeconds + e.durationSeconds), newDuration);

  // If the durations are virtually identical (within 2 seconds), keep the exact cue timings!
  if (Math.abs(origDuration - newDuration) <= 2) {
    return events.map((e) => enrichVideoScentEvent(e));
  }

  const scale = newDuration / origDuration;

  return events
    .map((ev) => {
      const scaledStart = Math.max(0, Math.min(newDuration - 1, Math.round(ev.timeSeconds * scale)));
      const scaledDuration = Math.max(1, Math.min(newDuration - scaledStart, Math.round(ev.durationSeconds * scale)));
      return enrichVideoScentEvent({
        ...ev,
        timeSeconds: scaledStart,
        durationSeconds: scaledDuration,
        channels: (ev.channels || []).slice(0, 3),
        channelDetails: (ev.channelDetails || []).slice(0, 3)
      });
    })
    .sort((a, b) => a.timeSeconds - b.timeSeconds);
}

/**
 * Normalizes any scent event array.
 * If events already have explicit timestamps, preserves exact timestamps and gaps.
 * Only distributes evenly if events had zero timing cues specified.
 */
export function normalizeVideoScentTimeline(
  events: VideoScentEvent[],
  totalDurationSeconds: number
): VideoScentEvent[] {
  const duration = Math.max(5, Math.round(totalDurationSeconds));
  if (!events || events.length === 0) {
    return [];
  }

  // Check if events have explicit non-zero or distinct time intervals
  const hasExplicitTimings = events.some(
    (ev) => ev.timeSeconds > 0 || (ev.durationSeconds > 0 && ev.durationSeconds < duration)
  );

  if (hasExplicitTimings) {
    return events
      .filter((ev) => ev && typeof ev.timeSeconds === 'number' && typeof ev.durationSeconds === 'number')
      .map((ev) =>
        enrichVideoScentEvent({
          ...ev,
          timeSeconds: Math.max(0, Math.min(duration - 1, Math.round(ev.timeSeconds))),
          durationSeconds: Math.max(1, Math.min(duration - ev.timeSeconds, Math.round(ev.durationSeconds))),
          channels: (ev.channels || []).slice(0, 3),
          channelDetails: (ev.channelDetails || []).slice(0, 3)
        })
      )
      .sort((a, b) => a.timeSeconds - b.timeSeconds);
  }

  // Fallback: If no explicit timings, distribute across duration
  const sorted = [...events];
  const count = sorted.length;
  const normalized: VideoScentEvent[] = [];

  for (let i = 0; i < count; i++) {
    const start = Math.round(i * (duration / count));
    const nextStart = i === count - 1 ? duration : Math.round((i + 1) * (duration / count));
    const dur = Math.max(1, nextStart - start);

    const ev = sorted[i];
    normalized.push(
      enrichVideoScentEvent({
        ...ev,
        channels: (ev.channels || []).slice(0, 3),
        channelDetails: (ev.channelDetails || []).slice(0, 3),
        timeSeconds: start,
        durationSeconds: dur
      })
    );
  }

  return normalized;
}
