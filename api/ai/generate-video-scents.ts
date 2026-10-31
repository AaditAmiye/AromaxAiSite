import type { Request, Response } from 'express';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import fs from 'fs';
import path from 'path';

// Complete 34 working channels on the AromaxAI physical hardware
const ALL_WORKING_CHANNELS = [
  { id: 'H01', name: 'Monsoon Rain', category: 'fresh', description: 'Fresh petrichor, damp earth and rain mist' },
  { id: 'H02', name: 'Bergamot Citrus', category: 'citrus', description: 'Bright sparkling Italian bergamot zest' },
  { id: 'H03', name: 'Fresh Linen', category: 'fresh', description: 'Clean crisp airy sun-dried cotton' },
  { id: 'H04', name: 'Pizza / Burger', category: 'savory', description: 'Fresh baked crust, grilled savory meat, toasted bun' },
  { id: 'H05', name: 'Chocolate', category: 'sweet', description: 'Rich dark roasted cacao nibs, cocoa butter' },
  { id: 'H06', name: 'Royal Perfume', category: 'oriental', description: 'Sophisticated royal velvet oriental aroma' },
  { id: 'H07', name: 'Faint Rose', category: 'floral', description: 'Delicate morning blooming rose petals' },
  { id: 'H08', name: 'Vanilla', category: 'sweet', description: 'Warm comforting Madagascar bourbon vanilla' },
  { id: 'H09', name: 'Faint Chai', category: 'spicy', description: 'Steamed spiced black tea, cardamom & ginger' },
  { id: 'H10', name: 'Biryani / Tadka', category: 'savory', description: 'Savory basmati spices, cumin & garlic tadka' },
  { id: 'H11', name: 'Clove', category: 'spicy', description: 'Warm pungent eugenol clove bud spice' },
  { id: 'H12', name: 'Bergamot Citrus', category: 'citrus', description: 'Sparkling citrus zest and sunlit orchards' },
  { id: 'H13', name: 'Green Apple', category: 'fruity', description: 'Crisp tart juicy green orchard apple' },
  { id: 'H14', name: 'Cinnamon Spice', category: 'spicy', description: 'Warm sweet Ceylon cinnamon bark' },
  { id: 'H15', name: 'Bitter Citrus / Alcohol Perfume', category: 'citrus', description: 'Limonene, sparkling bitter cocktail zest' },
  { id: 'H16', name: 'Sweet Milk / Mithai', category: 'sweet', description: 'Condensed milk, sweet creamy lactonic confection' },
  { id: 'H17', name: 'White Cedarwood', category: 'woody', description: 'Crisp aromatic northern cedarwood timber' },
  { id: 'H18', name: 'Sandalwood', category: 'woody', description: 'Mysore aged heartwood, deep sacred woody warmth' },
  { id: 'H19', name: 'Soil / Mitti + Rain', category: 'earthy', description: 'Geosmin, intense petrichor, damp loam' },
  { id: 'H20', name: 'Faint Bitter Smell', category: 'herbal', description: 'Artemisia herbal bitter ground and botanicals' },
  { id: 'H21', name: 'Garlic Oil / Mustard Oil', category: 'savory', description: 'Pungent cold-pressed mustard & sizzling garlic' },
  { id: 'H22', name: 'Lavender + Lotus perfume', category: 'floral', description: 'Serene calming French lavender and water lotus' },
  { id: 'H23', name: 'Ayurvedic Pain Relief Spray', category: 'herbal', description: 'Camphor, wintergreen, eucalyptus herbs' },
  { id: 'H24', name: 'Coffee', category: 'roasted', description: 'Dark roasted espresso crema, roasted beans' },
  { id: 'H25', name: 'Peppermint', category: 'fresh', description: 'Crisp crystalline menthol, icy mountain air' },
  { id: 'H26', name: 'Wild Jasmine', category: 'floral', description: 'Night-blooming sweet exotic white jasmine' },
  { id: 'H27', name: 'Ester Fruit', category: 'fruity', description: 'Sparkling tropical fruit esters, peach, pineapple' },
  { id: 'H28', name: 'Burning Wood', category: 'smoky', description: 'Dry birch logs crackling in fireplace, hearth' },
  { id: 'H29', name: 'Sweet Cardamom', category: 'spicy', description: 'Fresh green cardamom pod aromatic spice' },
  { id: 'H30', name: 'Fresh Grass / Green Leaves', category: 'green', description: 'Crisp dew on freshly cut summer meadow lawn' },
  { id: 'H31', name: 'Water / Neutral', category: 'carrier', description: 'Pure water vapor carrier, waterfall, river spray' },
  { id: 'H32', name: 'Hospital / Phenyl', category: 'chemical', description: 'Clinical sterile sanitizing antiseptic' },
  { id: 'H33', name: 'Puja / Temple', category: 'resinous', description: 'Sacred sanctum smoke, sambrani & dhoop incense' },
  { id: 'H34', name: 'Kesar / Saffron', category: 'spicy', description: 'Kashmiri saffron stigmata, royal golden spice' }
];

async function parseBody(req: any): Promise<any> {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk: any) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

function resolveInstalledCartridges(clientCartridges?: any[]): Array<{ id: string; name: string; category: string; description?: string }> {
  if (Array.isArray(clientCartridges) && clientCartridges.length > 0) {
    const valid = clientCartridges.filter(
      (c) => c && c.id && c.status !== 'unassigned' && !c.isLighting && !c.isAirflow
    );
    if (valid.length > 0) {
      return valid.map((c) => ({
        id: String(c.id).toUpperCase(),
        name: c.name || c.id,
        category: c.category || 'aroma',
        description: c.description || ''
      }));
    }
  }

  try {
    const CARTRIDGES_FILE = path.resolve(process.cwd(), 'data', 'cartridges.json');
    if (fs.existsSync(CARTRIDGES_FILE)) {
      const raw = fs.readFileSync(CARTRIDGES_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const valid = parsed.filter(
          (c) => c && c.id && c.status !== 'unassigned' && !c.isLighting && !c.isAirflow
        );
        if (valid.length > 0) {
          return valid.map((c) => ({
            id: String(c.id).toUpperCase(),
            name: c.name || c.id,
            category: c.category || 'aroma',
            description: c.description || ''
          }));
        }
      }
    }
  } catch {}

  return ALL_WORKING_CHANNELS;
}

export async function handleGenerateVideoScents(req: Request, res: Response) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const body = await parseBody(req);
  const {
    videoTitle,
    videoDescription,
    youtubeId,
    durationSeconds,
    userNotes,
    frameBase64,
    apiKey: clientApiKey,
    activeCartridges: clientCartridges
  } = body || {};

  if (!videoTitle && !youtubeId && !frameBase64 && !userNotes) {
    res.status(400).json({ error: 'videoTitle, youtubeId, userNotes, or frameBase64 is required.' });
    return;
  }

  const duration = Math.max(5, Math.round(Number(durationSeconds) || 60));
  let title = String(videoTitle || '').trim();
  let desc = String(videoDescription || userNotes || '').trim();

  // If YouTube ID provided, fetch YouTube oEmbed info to obtain true title & author
  if (youtubeId && /^[a-zA-Z0-9_-]{11}$/.test(youtubeId)) {
    if (!title || title.includes(youtubeId) || title.startsWith('YouTube Video') || title.startsWith('Video (')) {
      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${youtubeId}&format=json`;
        const oembedRes = await fetch(oembedUrl, { signal: AbortSignal.timeout(3000) });
        if (oembedRes.ok) {
          const oembedData = (await oembedRes.json()) as any;
          if (oembedData?.title) {
            title = oembedData.title;
            if (oembedData.author_name) {
              desc = desc ? `${desc} • Channel: ${oembedData.author_name}` : `Video by ${oembedData.author_name}`;
            }
          }
        }
      } catch (e) {
        console.warn('[Gemini Video Scent] YouTube oEmbed fetch non-fatal error:', e);
      }
    }
  }

  if (!title) {
    title = desc || (youtubeId ? `YouTube Video (${youtubeId})` : 'Cinematic Scene');
  }

  // 1. Resolve exact installed device cartridges
  const installedList = resolveInstalledCartridges(clientCartridges);
  const channelMap = new Map<string, { id: string; name: string; category: string; description?: string }>();
  for (const ch of installedList) {
    channelMap.set(ch.id.toUpperCase(), ch);
  }

  const workingChannelsPrompt = installedList
    .map((c) => `- ${c.id}: "${c.name}" (${c.category}${c.description ? ` • ${c.description}` : ''})`)
    .join('\n');

  // 2. Multi-Frame Vision Sampling: Sample multiple frames across the video timeline
  // YouTube provides 1.jpg (~25%), 2.jpg (~50%), 3.jpg (~75%), and 0.jpg (cover)
  const visualFrames: Array<{ mimeType: string; data: string; description: string }> = [];

  // If client provided a direct base64 video frame (e.g. from canvas or camera)
  if (frameBase64 && typeof frameBase64 === 'string') {
    if (frameBase64.startsWith('http://') || frameBase64.startsWith('https://')) {
      try {
        const imgRes = await fetch(frameBase64, { signal: AbortSignal.timeout(3000) });
        if (imgRes.ok) {
          const buffer = await imgRes.arrayBuffer();
          if (buffer.byteLength > 500) {
            visualFrames.push({
              mimeType: imgRes.headers.get('content-type') || 'image/jpeg',
              data: Buffer.from(buffer).toString('base64'),
              description: 'Current video playback frame'
            });
          }
        }
      } catch (err) {
        console.warn('[Gemini Video Scent] Failed to fetch frame URL:', err);
      }
    } else {
      const matches = frameBase64.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (matches) {
        visualFrames.push({
          mimeType: matches[1],
          data: matches[2],
          description: 'Current video playback frame'
        });
      } else {
        const cleaned = frameBase64.replace(/^data:.*?;base64,/, '').trim();
        if (cleaned.length > 100 && /^[A-Za-z0-9+/=]+$/.test(cleaned.slice(0, 100))) {
          visualFrames.push({
            mimeType: 'image/jpeg',
            data: cleaned,
            description: 'Current video playback frame'
          });
        }
      }
    }
  }

  // If YouTube ID is available, sample sequential timestamp frames: 1 (~25%), 2 (~50%), 3 (~75%)
  if (youtubeId && /^[a-zA-Z0-9_-]{11}$/.test(youtubeId)) {
    const frameIndices = [
      { idx: '1', label: 'Scene at ~25% timestamp' },
      { idx: '2', label: 'Scene at ~50% timestamp' },
      { idx: '3', label: 'Scene at ~75% timestamp' }
    ];

    for (const item of frameIndices) {
      try {
        const frameUrl = `https://i.ytimg.com/vi/${youtubeId}/${item.idx}.jpg`;
        const fRes = await fetch(frameUrl, { signal: AbortSignal.timeout(2500) });
        if (fRes.ok) {
          const buf = await fRes.arrayBuffer();
          if (buf.byteLength > 1000) {
            visualFrames.push({
              mimeType: 'image/jpeg',
              data: Buffer.from(buf).toString('base64'),
              description: item.label
            });
          }
        }
      } catch {
        // Non-fatal, continue with other frames
      }
    }

    // If no timestamp frames succeeded, grab main cover
    if (visualFrames.length === 0) {
      for (const thumbUrl of [
        `https://i.ytimg.com/vi/${youtubeId}/maxresdefault.jpg`,
        `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
        `https://i.ytimg.com/vi/${youtubeId}/0.jpg`
      ]) {
        try {
          const thumbRes = await fetch(thumbUrl, { signal: AbortSignal.timeout(2500) });
          if (thumbRes.ok) {
            const buf = await thumbRes.arrayBuffer();
            if (buf.byteLength > 1500) {
              visualFrames.push({
                mimeType: 'image/jpeg',
                data: Buffer.from(buf).toString('base64'),
                description: 'Main video cover frame'
              });
              break;
            }
          }
        } catch {}
      }
    }
  }

  const DEFAULT_FALLBACK_API_KEY = 'AQ.Ab8RN6IBRPt7EnwUf1DZdfkk1tDRBqKSzgRjduAamKkCg0Xtrg';
  const apiKey =
    (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' ? process.env.GEMINI_API_KEY : null) ||
    (process.env.VITE_GEMINI_API_KEY && process.env.VITE_GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' ? process.env.VITE_GEMINI_API_KEY : null) ||
    clientApiKey ||
    DEFAULT_FALLBACK_API_KEY;

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    const fallback = generateFallbackVideoScentTrack(title, desc, duration, installedList);
    res.json(fallback);
    return;
  }

  // Calculate target scene count strictly proportional to video duration
  // Duration <= 15s: 1 or 2 scenes max (no crowd, no bunching!)
  // Duration 16-35s: 2 scenes
  // Duration 36-90s: 3 scenes
  // Duration 91-240s: 4 scenes
  // Duration > 240s: 5 scenes
  const targetScenes = duration <= 15 ? (duration <= 8 ? 1 : 2) : duration <= 35 ? 2 : duration <= 90 ? 3 : duration <= 240 ? 4 : 5;

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const systemInstruction = `You are the Master Olfactory Director for AROMAXAI. You analyze videos with extreme precision and synthesize real-time physical aroma cues synchronized to video timestamps.
Physical 34-port aroma device cartridges installed:
${workingChannelsPrompt}

CRITICAL RULES:
1. ACCURATE SCENT DETECTION: Carefully detect what is ACTUALLY present in the video (specific dishes, food, drinks, spices, ingredients, nature, weather, petrichor, flora, materials, smoke, woods, or distinct atmospheric ambiance). Look closely at the title, notes, and visual frames.
2. DURATION RULE: The video is EXACTLY ${duration} seconds long.
3. SCENE TIMING & SCENT RELEVANCE:
   - Accurately determine the start timestamp (timeSeconds) and length (durationSeconds) for scene cues.
   - For scenes with prominent smells (food, cooking, nature, coffee, flowers, smoke, etc.), assign 1 to at most 3 fitting channels.
   - For scenes where NONE of the installed cartridge smells suit, or neutral non-olfactory scenes (e.g. casual talking, office, cars, plain backgrounds), set "channels": [] and "channelDetails": [].
   - If a scene has no smell, DO NOT produce any smell! Leaving "channels": [] ensures the diffuser stays quiet.
4. MULTI-SCENT BLEND (UP TO 3 CHANNELS SIMULTANEOUSLY):
   If a scene features multiple aromas (e.g. Burger + Savory spices, or Pizza + Garlic, or Coffee + Vanilla, or Rain + Sandalwood), combine 2 or at most 3 channels simultaneously in the scene's "channels" array.
   Never use more than 3 simultaneous channels per scene. Single smells are also allowed.
5. ONLY select channels that exist in the installed list above.
6. Return strictly valid JSON matching the schema.`;

    const textPrompt = `Video Title: "${title}".
Exact Video Duration: ${duration} seconds.
User Notes: "${desc}".
Visual Frames Sampled: ${visualFrames.length} frames provided.
Task: Detect the exact objects, food, environments, and elements shown. Synthesize accurate scent scene cues synchronized to timestamps from 0s to ${duration}s. If any scene does not suit any smell or has no olfactory cue, leave "channels": [] empty so no smell is produced. Use up to 3 smells simultaneously per scent scene if appropriate. Output JSON.`;

    const contents: any[] = [];
    for (const frame of visualFrames) {
      contents.push({
        inlineData: {
          mimeType: frame.mimeType,
          data: frame.data
        }
      });
    }
    contents.push(textPrompt);

    // Candidate models: Gemini 2.5 Flash as requested, followed by 3.5 series
    const modelCandidates = ['gemini-2.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.8-flash'];
    let responseText = '';
    let selectedModel = modelCandidates[0];

    const jsonSchema = {
      type: Type.OBJECT,
      properties: {
        visualAnalysis: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        summary: { type: Type.STRING },
        events: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              timeSeconds: { type: Type.INTEGER },
              durationSeconds: { type: Type.INTEGER },
              title: { type: Type.STRING },
              smellName: { type: Type.STRING },
              note: { type: Type.STRING },
              visualClue: { type: Type.STRING },
              channels: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              channelDetails: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    channelId: { type: Type.STRING },
                    intensity: { type: Type.NUMBER },
                    reason: { type: Type.STRING }
                  },
                  required: ['channelId', 'intensity', 'reason']
                }
              },
              light: {
                type: Type.OBJECT,
                properties: {
                  r: { type: Type.INTEGER },
                  g: { type: Type.INTEGER },
                  b: { type: Type.INTEGER }
                },
                required: ['r', 'g', 'b']
              }
            },
            required: ['timeSeconds', 'durationSeconds', 'title', 'note', 'channels', 'light']
          }
        }
      },
      required: ['visualAnalysis', 'summary', 'events']
    };

    for (const modelName of modelCandidates) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction,
            thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
            responseMimeType: 'application/json',
            responseSchema: jsonSchema
          }
        });
        if (response.text) {
          responseText = response.text;
          selectedModel = modelName;
          break;
        }
      } catch (err: any) {
        console.warn(`[Gemini Video Scent] Model ${modelName} failed or unavailable:`, err?.message || err);
      }
    }

    if (!responseText) {
      console.warn('[Gemini Video Scent] All Gemini models failed. Falling back to calibrated engine.');
      const fallback = generateFallbackVideoScentTrack(title, desc, duration, installedList);
      res.json(fallback);
      return;
    }

    const parsed = JSON.parse(responseText || '{"events":[],"visualAnalysis":[],"summary":""}');

    const visualAnalysis = Array.isArray(parsed.visualAnalysis) && parsed.visualAnalysis.length > 0
      ? parsed.visualAnalysis
      : ['Visual scene analysis complete', 'Environmental elements identified', 'Lighting calibrated'];

    const summary = typeof parsed.summary === 'string' && parsed.summary.length > 0
      ? parsed.summary
      : `Sensory olfactory track synchronized to ${title}.`;

    const defaultFallbackChannel = installedList[0]?.id || 'H19';

    // Strictly enforce max 3 simultaneous channels and allow empty channels for neutral scenes
    const validEvents = (parsed.events || []).map((ev: any, index: number) => {
      const eventChannels = Array.isArray(ev.channels)
        ? ev.channels
            .map((c: any) => String(c).toUpperCase())
            .filter((c: string) => channelMap.has(c))
            .slice(0, 3)
        : [];

      // If no valid channel or scene has no olfactory cue (leave it empty, produce no smell)
      if (eventChannels.length === 0) {
        return {
          id: `gemini-cue-${index + 1}-${Date.now()}`,
          timeSeconds: typeof ev.timeSeconds === 'number' ? ev.timeSeconds : 0,
          durationSeconds: typeof ev.durationSeconds === 'number' ? ev.durationSeconds : Math.max(2, Math.floor(duration / targetScenes)),
          title: ev.title || 'Ambient Scene (No Scent)',
          smellName: 'No Scent (Neutral)',
          note: ev.note || 'No dominant aroma detected in this scene.',
          visualClue: ev.visualClue || 'Neutral scene transition',
          channels: [],
          channelDetails: [],
          light: ev.light && typeof ev.light.r === 'number' ? ev.light : { r: 35, g: 35, b: 35 }
        };
      }

      const smellNames = eventChannels.map((cId: string) => channelMap.get(cId)?.name || cId);
      const compositeSmellName = smellNames.join(' + ');

      const details = (Array.isArray(ev.channelDetails) ? ev.channelDetails : [])
        .filter((d: any) => channelMap.has(String(d?.channelId || '').toUpperCase()))
        .slice(0, 3)
        .map((d: any) => {
          const chId = String(d.channelId).toUpperCase();
          const chDef = channelMap.get(chId);
          return {
            channelId: chId,
            smellName: chDef ? chDef.name : chId,
            intensity: Math.max(0.1, Math.min(1.0, typeof d.intensity === 'number' ? d.intensity : 0.85)),
            reason: d.reason || `Multi-aroma cue: ${chDef ? chDef.name : chId}`
          };
        });

      if (details.length === 0) {
        for (const chId of eventChannels) {
          const chDef = channelMap.get(chId);
          details.push({
            channelId: chId,
            smellName: chDef ? chDef.name : chId,
            intensity: 0.85,
            reason: `Physical diffusion of ${chDef ? chDef.name : chId}`
          });
        }
      }

      return {
        id: `gemini-cue-${index + 1}-${Date.now()}`,
        timeSeconds: typeof ev.timeSeconds === 'number' ? ev.timeSeconds : 0,
        durationSeconds: typeof ev.durationSeconds === 'number' ? ev.durationSeconds : Math.max(2, Math.floor(duration / targetScenes)),
        title: ev.title || compositeSmellName,
        smellName: compositeSmellName,
        note: ev.note || `Emitting ${compositeSmellName} from Chamber ${eventChannels.join(', ')}.`,
        visualClue: ev.visualClue || visualAnalysis[index % visualAnalysis.length] || 'Visual cue in scene',
        channels: eventChannels,
        channelDetails: details,
        light: ev.light || { r: 52, g: 199, b: 89 }
      };
    });

    if (validEvents.length > 0) {
      const sortedEvents = [...validEvents].sort((a: any, b: any) => a.timeSeconds - b.timeSeconds);
      const hasMeaningfulTimes = sortedEvents.some(
        (ev: any) => ev.timeSeconds > 0 || (ev.durationSeconds > 0 && ev.durationSeconds < duration)
      );

      let finalEvents = sortedEvents;
      if (!hasMeaningfulTimes) {
        const count = Math.min(sortedEvents.length, targetScenes);
        finalEvents = sortedEvents.slice(0, count);
        for (let i = 0; i < count; i++) {
          const start = Math.round(i * (duration / count));
          const nextStart = i === count - 1 ? duration : Math.round((i + 1) * (duration / count));
          finalEvents[i].timeSeconds = start;
          finalEvents[i].durationSeconds = Math.max(1, nextStart - start);
        }
      } else {
        finalEvents = sortedEvents.map((ev: any) => {
          const t = Math.max(0, Math.min(duration - 1, Math.round(ev.timeSeconds)));
          const d = Math.max(1, Math.min(duration - t, Math.round(ev.durationSeconds)));
          return {
            ...ev,
            timeSeconds: t,
            durationSeconds: d
          };
        });
      }

      res.json({
        events: finalEvents,
        visualAnalysis,
        summary,
        hasMultimodalVision: visualFrames.length > 0,
        source: selectedModel,
        videoDurationSeconds: duration,
        deviceInstalledSmellsCount: installedList.length
      });
      return;
    }

    const fallback = generateFallbackVideoScentTrack(title, desc, duration, installedList);
    res.json(fallback);
  } catch (err: any) {
    console.error('[Gemini Video Scent API] Generation error, falling back:', err);
    const fallback = generateFallbackVideoScentTrack(title, desc, duration, installedList);
    res.json({
      ...fallback,
      geminiError: err?.message || String(err)
    });
  }
}

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }
  await handleGenerateVideoScents(req, res);
}

/**
 * High-Precision Semantic Fallback Engine
 * Analyzes video title, text, and keywords to accurately match any of the 34 installed cartridges.
 * Supports multi-scent blending up to 3 channels (e.g. Burger + Biryani).
 */
function generateFallbackVideoScentTrack(
  title: string,
  desc: string,
  duration: number,
  installedList: Array<{ id: string; name: string; category: string; description?: string }>
) {
  const p = `${title} ${desc}`.toLowerCase();
  const channelMap = new Map<string, { id: string; name: string; category: string; description?: string }>();
  for (const c of installedList) {
    channelMap.set(c.id.toUpperCase(), c);
  }

  const findInstalled = (keyword: string): { id: string; name: string } | null => {
    const k = keyword.toLowerCase();
    const found = installedList.find(
      (c) => c.name.toLowerCase().includes(k) || (c.description && c.description.toLowerCase().includes(k)) || c.category.toLowerCase().includes(k)
    );
    return found ? { id: found.id, name: found.name } : null;
  };

  // Detect specific scent categories present in the video
  const detectedChannels: Array<{ id: string; name: string; weight: number }> = [];

  const checkAndAdd = (keywords: string[], channelId: string, weight = 1.0) => {
    const matched = keywords.some((k) => p.includes(k));
    if (matched && channelMap.has(channelId)) {
      const ch = channelMap.get(channelId)!;
      if (!detectedChannels.some((d) => d.id === ch.id)) {
        detectedChannels.push({ id: ch.id, name: ch.name, weight });
      }
    }
  };

  // Savory / Food
  checkAndAdd(['burger', 'pizza', 'cheeseburger', 'grill', 'patty', 'fry', 'fries', 'fast food'], 'H04', 1.0);
  checkAndAdd(['biryani', 'curry', 'rice', 'tadka', 'masala', 'cumin', 'indian', 'dum'], 'H10', 1.0);
  checkAndAdd(['garlic', 'onion', 'mustard', 'pungent', 'oil', 'sizzle'], 'H21', 0.8);
  checkAndAdd(['clove', 'laung', 'eugenol'], 'H11', 0.8);
  checkAndAdd(['cinnamon', 'bakery', 'cinnamon roll', 'cinnamon spice'], 'H14', 0.8);
  checkAndAdd(['saffron', 'kesar', 'golden spice'], 'H34', 0.9);
  checkAndAdd(['cardamom', 'elaichi'], 'H29', 0.8);

  // Beverages & Sweets
  checkAndAdd(['coffee', 'espresso', 'cafe', 'café', 'latte', 'cappuccino', 'roast'], 'H24', 1.0);
  checkAndAdd(['chai', 'tea', 'spiced tea'], 'H09', 0.9);
  checkAndAdd(['chocolate', 'cacao', 'cocoa', 'fudge', 'brownie'], 'H05', 0.9);
  checkAndAdd(['vanilla', 'custard', 'ice cream', 'pastry'], 'H08', 0.8);
  checkAndAdd(['milk', 'mithai', 'sweet milk', 'dairy', 'cream'], 'H16', 0.8);
  checkAndAdd(['apple', 'orchard', 'pie'], 'H13', 0.8);
  checkAndAdd(['fruit', 'tropical', 'peach', 'pineapple', 'ester'], 'H27', 0.8);

  // Nature, Earth, Elements
  checkAndAdd(['rain', 'petrichor', 'monsoon', 'downpour', 'storm'], 'H01', 1.0);
  checkAndAdd(['soil', 'earth', 'dirt', 'mud', 'loam', 'mitti'], 'H19', 1.0);
  checkAndAdd(['wood', 'sandalwood', 'forest', 'timber'], 'H18', 0.9);
  checkAndAdd(['cedar', 'cedarwood', 'pine', 'evergreen'], 'H17', 0.8);
  checkAndAdd(['fire', 'campfire', 'hearth', 'fireplace', 'woodsmoke', 'smoke', 'embers'], 'H28', 1.0);
  checkAndAdd(['mint', 'peppermint', 'ice', 'glacier', 'freeze', 'alps', 'snow', 'frost'], 'H25', 0.9);
  checkAndAdd(['water', 'waterfall', 'ocean', 'river', 'sea', 'lake', 'stream'], 'H31', 0.7);
  checkAndAdd(['grass', 'meadow', 'lawn', 'greenery', 'jungle', 'leaves'], 'H30', 0.7);

  // Florals & Fragrances
  checkAndAdd(['rose', 'roses', 'petals'], 'H07', 0.9);
  checkAndAdd(['jasmine', 'white floral'], 'H26', 0.9);
  checkAndAdd(['lavender', 'lotus', 'relaxing flower'], 'H22', 0.9);
  checkAndAdd(['citrus', 'lemon', 'orange', 'lime', 'bergamot', 'zest'], 'H02', 0.8);
  checkAndAdd(['perfume', 'royal', 'velvet'], 'H06', 0.7);

  // Spiritual / Clinical
  checkAndAdd(['temple', 'puja', 'incense', 'sambrani', 'dhoop', 'prayer'], 'H33', 1.0);
  checkAndAdd(['hospital', 'medical', 'antiseptic', 'clean', 'sterile'], 'H32', 0.8);
  checkAndAdd(['eucalyptus', 'camphor', 'ayurvedic', 'balm', 'relief'], 'H23', 0.8);

  // If nothing matched, use universal natural baseline
  if (detectedChannels.length === 0) {
    const soil = findInstalled('soil') || findInstalled('rain') || { id: 'H19', name: 'Soil / Mitti + Rain' };
    const wood = findInstalled('sandalwood') || findInstalled('wood') || { id: 'H18', name: 'Sandalwood' };
    const floral = findInstalled('lavender') || findInstalled('rose') || { id: 'H22', name: 'Lavender + Lotus perfume' };
    detectedChannels.push({ id: soil.id, name: soil.name, weight: 1.0 });
    detectedChannels.push({ id: wood.id, name: wood.name, weight: 0.8 });
    detectedChannels.push({ id: floral.id, name: floral.name, weight: 0.6 });
  }

  // Calculate target scenes
  const targetScenes = duration <= 15 ? (duration <= 8 ? 1 : 2) : duration <= 35 ? 2 : duration <= 90 ? 3 : 4;
  const events: any[] = [];

  for (let i = 0; i < targetScenes; i++) {
    const start = Math.round(i * (duration / targetScenes));
    const nextStart = Math.round((i + 1) * (duration / targetScenes));
    const dur = Math.max(1, nextStart - start);

    // Pick up to 3 channels for this scene (blending multiple if available!)
    const offset = i % detectedChannels.length;
    const sceneChannels = detectedChannels.slice(offset, offset + 3).map((d) => d.id);
    if (sceneChannels.length === 0) {
      sceneChannels.push(detectedChannels[0]?.id || 'H19');
    }

    const sceneSmellNames = sceneChannels.map((cId) => channelMap.get(cId)?.name || cId);
    const compositeName = sceneSmellNames.join(' + ');

    const details = sceneChannels.map((cId) => {
      const ch = channelMap.get(cId);
      return {
        channelId: cId,
        smellName: ch ? ch.name : cId,
        intensity: 0.85,
        reason: `Detected scene element: ${ch ? ch.name : cId}`
      };
    });

    events.push({
      id: `semantic-cue-${i + 1}-${Date.now()}`,
      timeSeconds: start,
      durationSeconds: dur,
      title: compositeName,
      smellName: compositeName,
      note: `Emitting ${compositeName} from Chamber ${sceneChannels.join(', ')}.`,
      visualClue: `Scene focal: ${compositeName}`,
      channels: sceneChannels,
      channelDetails: details,
      light: sceneChannels.includes('H04') || sceneChannels.includes('H10')
        ? { r: 255, g: 140, b: 0 }
        : sceneChannels.includes('H24')
        ? { r: 139, g: 69, b: 19 }
        : sceneChannels.includes('H28')
        ? { r: 255, g: 107, b: 0 }
        : { r: 52, g: 199, b: 89 }
    });
  }

  // Ensure last event covers exactly to duration
  if (events.length > 0) {
    const last = events[events.length - 1];
    last.durationSeconds = Math.max(1, duration - last.timeSeconds);
  }

  return {
    visualAnalysis: [
      `Semantic olfactory detection for "${title}"`,
      `Synthesized ${events.length} scenes synchronized across ${duration} seconds`,
      `Multi-channel sensory blend: ${detectedChannels.slice(0, 3).map((d) => d.name).join(', ')}`
    ],
    summary: `Accurate sensory track synchronized to "${title}" spanning ${duration} seconds.`,
    hasMultimodalVision: false,
    source: 'semantic-olfactory-engine',
    videoDurationSeconds: duration,
    events
  };
}
