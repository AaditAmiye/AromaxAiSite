import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json());

import { AROMA_CHANNELS as DEFAULT_AROMA_CHANNELS } from './src/data/aromas';
import { AromaChannel } from './src/types/aroma';
import { handleGenerateVideoScents } from './api/ai/generate-video-scents';

const CARTRIDGES_FILE = path.resolve(__dirname, 'data', 'cartridges.json');

// In-memory active cartridges cache
let activeCartridges: AromaChannel[] = [];

/**
 * Loads active cartridges: merges data/cartridges.json over baseline defaults
 */
function loadActiveCartridges(): AromaChannel[] {
  try {
    if (fs.existsSync(CARTRIDGES_FILE)) {
      const raw = fs.readFileSync(CARTRIDGES_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const map = new Map<string, AromaChannel>();
        for (const ch of DEFAULT_AROMA_CHANNELS) {
          map.set(ch.id.toUpperCase(), { ...ch });
        }
        for (const ch of parsed) {
          if (ch && ch.id) {
            const upperId = ch.id.toUpperCase();
            const existing = map.get(upperId);
            if (existing) {
              map.set(upperId, {
                ...existing,
                ...ch,
                id: upperId,
                channelNumber: existing.channelNumber,
                board: existing.board,
                boardIndex: existing.boardIndex
              });
            }
          }
        }
        activeCartridges = Array.from(map.values()).sort((a, b) => a.channelNumber - b.channelNumber);
        return activeCartridges;
      }
    }
  } catch (err) {
    console.warn('[Server] Error loading cartridges.json:', err);
  }

  activeCartridges = JSON.parse(JSON.stringify(DEFAULT_AROMA_CHANNELS));
  return activeCartridges;
}

/**
 * Permanently saves active cartridges to data/cartridges.json
 */
function saveActiveCartridges(cartridges: AromaChannel[]): void {
  try {
    activeCartridges = cartridges;
    const dir = path.dirname(CARTRIDGES_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CARTRIDGES_FILE, JSON.stringify(cartridges, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Server] Failed to write cartridges.json:', err);
  }
}

// Initial load
loadActiveCartridges();

/**
 * Dynamically builds the AI system prompt and constraint set based on currently configured working cartridges
 */
function buildDynamicAromaContext(cartridges: AromaChannel[]) {
  const working = cartridges.filter(
    (c) => c.status === 'working' && !c.isLighting && !c.isAirflow
  );

  const lines = working.map((c) => {
    const parts: string[] = [c.category];
    if (c.description) parts.push(c.description);
    if (c.keywords && c.keywords.length > 0) parts.push(`keywords: ${c.keywords.join(', ')}`);
    return `- ${c.id}: ${c.name} (${parts.join(' • ')})`;
  });

  const promptText = `
WORKING AROMA CHANNELS CURRENTLY CONFIGURED ON THE PHYSICAL AROMAXAI DEVICE:
${lines.join('\n')}

STRICT RULES & HARMONIC BLENDING CONSTRAINTS:
1. ONLY USE WORKING CHANNELS FROM THE ABOVE ACTIVE LIST.
2. DO NOT use unassigned or defective channels.
3. DO NOT use lighting channels (H02, H03, H13) or fan (H30).
4. CREATE A BLEND OF AT MOST 3 SMELLS (1, 2, or 3 channels maximum). Never return 4 or more.
5. SENSORY INTENT & DYNAMIC CARTRIDGE MAPPING:
   - Carefully inspect the smell names and notes assigned to each channel.
   - If the user asks for a specific smell (e.g. pizza, rain, coffee, lavender, mango, etc.), YOU MUST SELECT THE EXACT CHANNEL THAT CURRENTLY HOLDS THAT SMELL.
   - Combine channels that form an authentic, harmonious olfactory chord (Top, Heart, Base).
   - Never combine clashing scents (e.g. savory garlic/pizza with sweet chocolate or floral rose) unless explicitly requested.
6. ADJUST ATMOSPHERIC LIGHT COLOR (RGB) TO MATCH THE BLEND:
   - Provide vibrant RGB [r, g, b] corresponding to the sensory mood of the blend.
7. INTENSITIES:
   - Positive numbers between 0.05 and 1.0 summing to 1.0.
8. REASON:
   - For every selected channel, provide a succinct 4-8 word reason explaining why it contributes to the requested experience.
`;

  const workingSet = new Set(working.map((c) => c.id.toUpperCase()));
  const lightMap: Record<string, { r: number; g: number; b: number }> = {};
  for (const c of cartridges) {
    if (c.defaultLight) {
      lightMap[c.id.toUpperCase()] = c.defaultLight;
    }
  }

  return { promptText, workingSet, lightMap, working };
}

/**
 * Dynamic semantic synthesis engine:
 * Evaluates the user's prompt against ALL currently configured smell names, keywords, categories, and descriptions!
 * If H01 is set to Pizza, a prompt for pizza selects H01.
 * If H01 is set to Rain, a prompt for rain selects H01.
 */
function dynamicSemanticSynthesis(userPrompt: string, cartridges: AromaChannel[]) {
  const p = userPrompt.toLowerCase();
  const words = p.split(/[\s,.;:!?\-+]+/).filter((w) => w.length > 2);

  const working = cartridges.filter(
    (c) => c.status === 'working' && !c.isLighting && !c.isAirflow
  );

  const scored = working.map((c) => {
    let score = 0;
    const nameLower = c.name.toLowerCase();
    const descLower = (c.description || '').toLowerCase();
    const catLower = c.category.toLowerCase();
    const keywords = (c.keywords || []).map((k) => k.toLowerCase());

    // Exact or phrase match in smell name
    if (p.includes(nameLower)) {
      score += 30;
    }

    // Word matching
    for (const w of words) {
      if (nameLower.includes(w)) {
        score += 15;
      }
      if (keywords.some((k) => k.includes(w) || w.includes(k))) {
        score += 12;
      }
      if (descLower.includes(w)) {
        score += 6;
      }
      if (catLower.includes(w)) {
        score += 4;
      }
    }

    return { channel: c, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const topMatches = scored.filter((s) => s.score > 0).slice(0, 3);
  let selected: { channelId: string; intensity: number; reason: string }[] = [];

  if (topMatches.length === 3) {
    selected = [
      { channelId: topMatches[0].channel.id, intensity: 0.60, reason: `Dominant ${topMatches[0].channel.name} note` },
      { channelId: topMatches[1].channel.id, intensity: 0.25, reason: `Harmonizing ${topMatches[1].channel.name}` },
      { channelId: topMatches[2].channel.id, intensity: 0.15, reason: `Accent of ${topMatches[2].channel.name}` }
    ];
  } else if (topMatches.length === 2) {
    selected = [
      { channelId: topMatches[0].channel.id, intensity: 0.70, reason: `Dominant ${topMatches[0].channel.name} note` },
      { channelId: topMatches[1].channel.id, intensity: 0.30, reason: `Complementary ${topMatches[1].channel.name}` }
    ];
  } else if (topMatches.length === 1) {
    selected = [
      { channelId: topMatches[0].channel.id, intensity: 1.0, reason: `Pure single-origin ${topMatches[0].channel.name}` }
    ];
  } else {
    // Fallback: pick the first 2 available working cartridges
    const defaults = working.slice(0, 2);
    selected = defaults.map((c, idx) => ({
      channelId: c.id,
      intensity: idx === 0 ? 0.7 : 0.3,
      reason: `Atmospheric note of ${c.name}`
    }));
  }

  // Calculate dominant light
  let totalR = 0, totalG = 0, totalB = 0, totalW = 0;
  for (const s of selected) {
    const ch = cartridges.find((c) => c.id === s.channelId);
    const col = ch?.defaultLight || { r: 52, g: 199, b: 89 };
    totalR += col.r * s.intensity;
    totalG += col.g * s.intensity;
    totalB += col.b * s.intensity;
    totalW += s.intensity;
  }

  const primaryName = cartridges.find((c) => c.id === selected[0]?.channelId)?.name || 'Atmospheric';

  return {
    title: `${primaryName} Formulation`,
    description: `A dynamic olfactory synthesis centered around ${primaryName}, calibrated for: "${userPrompt.slice(0, 70)}"`,
    channels: selected,
    light: {
      r: Math.round(totalR / (totalW || 1)),
      g: Math.round(totalG / (totalW || 1)),
      b: Math.round(totalB / (totalW || 1))
    },
    durationSeconds: 180,
    batchId: `#AR-${Math.floor(1000 + Math.random() * 9000)}`,
    formulaCode: `#${Math.floor(10 + Math.random() * 89)}-V`,
    spokenResponse: `Formulating a bespoke ${primaryName} aroma accord for your space.`
  };
}

// ----------------------------------------------------
// CARTRIDGE REST ENDPOINTS
// ----------------------------------------------------

/**
 * Get all current cartridges (with any persistent customizations)
 */
app.get('/api/cartridges', (_req: Request, res: Response) => {
  const cartridges = loadActiveCartridges();
  res.json({
    success: true,
    count: cartridges.length,
    cartridges
  });
});

/**
 * Save / Update full array of cartridges permanently
 */
app.post('/api/cartridges', (req: Request, res: Response) => {
  const { cartridges } = req.body;
  if (!Array.isArray(cartridges)) {
    res.status(400).json({ error: 'cartridges array is required' });
    return;
  }
  saveActiveCartridges(cartridges);
  res.json({ success: true, count: cartridges.length });
});

/**
 * Update an individual cartridge slot (e.g. PUT /api/cartridges/H01)
 */
app.put('/api/cartridges/:channelId', (req: Request, res: Response) => {
  const channelId = req.params.channelId.toUpperCase();
  const updates = req.body;

  const current = loadActiveCartridges();
  const idx = current.findIndex((c) => c.id.toUpperCase() === channelId);
  if (idx === -1) {
    res.status(404).json({ error: `Channel ${channelId} not found` });
    return;
  }

  current[idx] = {
    ...current[idx],
    ...updates,
    id: channelId,
    lastModified: Date.now()
  };

  saveActiveCartridges(current);
  res.json({ success: true, channel: current[idx] });
});

/**
 * Reset cartridges back to factory defaults
 */
app.post('/api/cartridges/reset', (_req: Request, res: Response) => {
  try {
    if (fs.existsSync(CARTRIDGES_FILE)) {
      fs.unlinkSync(CARTRIDGES_FILE);
    }
  } catch (err) {
    console.warn('Failed to delete cartridges file:', err);
  }
  activeCartridges = JSON.parse(JSON.stringify(DEFAULT_AROMA_CHANNELS));
  res.json({ success: true, cartridges: activeCartridges });
});

// ----------------------------------------------------
// AI GENERATION ROUTE
// ----------------------------------------------------

/**
 * AI Aroma Generation Endpoint
 * Dynamically synthesizes using the user's active cartridge configuration!
 */
app.post('/api/ai/generate-aroma', async (req: Request, res: Response) => {
  const { prompt, cartridges: clientCartridges } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'Prompt is required.' });
    return;
  }

  // If client supplied cartridges, merge them to keep server in perfect sync
  if (Array.isArray(clientCartridges) && clientCartridges.length > 0) {
    saveActiveCartridges(clientCartridges);
  }

  const currentCartridges = loadActiveCartridges();
  const { promptText, workingSet, lightMap } = buildDynamicAromaContext(currentCartridges);

  const DEFAULT_FALLBACK_API_KEY = 'AQ.Ab8RN6IBRPt7EnwUf1DZdfkk1tDRBqKSzgRjduAamKkCg0Xtrg';
  const apiKey =
    (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' ? process.env.GEMINI_API_KEY : null) ||
    (process.env.VITE_GEMINI_API_KEY && process.env.VITE_GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' ? process.env.VITE_GEMINI_API_KEY : null) ||
    req.body?.apiKey ||
    DEFAULT_FALLBACK_API_KEY;

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    // Dynamic semantic synthesis fallback when API key is not populated
    const fallback = dynamicSemanticSynthesis(prompt, currentCartridges);
    res.json(fallback);
    return;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const systemInstruction = `You are AROMAXAI. Be extremely concise to minimize token usage.
${promptText}
Rules:
1. ONLY use working channels from the list.
2. Pick 1 to 3 channels.
3. Keep descriptions and reasons very brief (under 8 words).
4. Return strictly valid JSON.`;

    const candidateModels = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.8-flash'];
    let text = '';

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: `Prompt: "${prompt}". Synthesize aroma with 1-3 installed channels. Be concise.`,
          config: {
            systemInstruction,
            thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                channels: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      channelId: { type: Type.STRING },
                      intensity: { type: Type.NUMBER },
                      reason: { type: Type.STRING }
                    },
                    required: ['channelId', 'intensity']
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
                },
                durationSeconds: { type: Type.INTEGER },
                batchId: { type: Type.STRING },
                formulaCode: { type: Type.STRING },
                spokenResponse: {
                  type: Type.STRING,
                  description: 'A warm, charismatic 1-2 sentence spoken response to the user celebrating their scent choice and describing what is being blended.'
                }
              },
              required: ['title', 'description', 'channels', 'light', 'durationSeconds', 'spokenResponse']
            }
          }
        });
        if (response.text) {
          text = response.text;
          break;
        }
      } catch (mErr: any) {
        console.warn(`[Server Gemini Aroma] Model ${modelName} error:`, mErr?.message || mErr);
      }
    }

    if (!text) {
      const fallback = dynamicSemanticSynthesis(prompt, currentCartridges);
      res.json(fallback);
      return;
    }

    const parsed = JSON.parse(text);

    if (!parsed.spokenResponse || typeof parsed.spokenResponse !== 'string') {
      parsed.spokenResponse = `Creating ${parsed.title}. ${parsed.description}`;
    }

    // Strict post-processing: enforce at most 3 working channels matching active configured channels
    let sanitizedChannels = Array.isArray(parsed.channels)
      ? parsed.channels
          .filter((c: any) => c && c.channelId && workingSet.has(String(c.channelId).toUpperCase()))
          .map((c: any) => ({
            channelId: String(c.channelId).toUpperCase(),
            intensity: Math.max(0.05, Math.min(1.0, typeof c.intensity === 'number' ? c.intensity : 0.5)),
            reason: c.reason || 'Harmonious note matching user intent'
          }))
          .slice(0, 3)
      : [];

    if (sanitizedChannels.length === 0) {
      const fallback = dynamicSemanticSynthesis(prompt, currentCartridges);
      sanitizedChannels = fallback.channels;
    }

    // Normalize intensities so they sum to 1.0
    const sumInt = sanitizedChannels.reduce((acc: number, c: any) => acc + c.intensity, 0);
    if (sumInt > 0) {
      sanitizedChannels = sanitizedChannels.map((c: any) => ({
        ...c,
        intensity: Math.round((c.intensity / sumInt) * 100) / 100
      }));
    }
    parsed.channels = sanitizedChannels;

    // Validate light RGB
    if (
      !parsed.light ||
      typeof parsed.light.r !== 'number' ||
      typeof parsed.light.g !== 'number' ||
      typeof parsed.light.b !== 'number'
    ) {
      let totalR = 0, totalG = 0, totalB = 0, totalW = 0;
      for (const ch of sanitizedChannels) {
        const col = lightMap[ch.channelId] || { r: 52, g: 199, b: 89 };
        totalR += col.r * ch.intensity;
        totalG += col.g * ch.intensity;
        totalB += col.b * ch.intensity;
        totalW += ch.intensity;
      }
      parsed.light = {
        r: Math.round(totalR / (totalW || 1)),
        g: Math.round(totalG / (totalW || 1)),
        b: Math.round(totalB / (totalW || 1))
      };
    } else {
      parsed.light = {
        r: Math.max(0, Math.min(255, Math.round(parsed.light.r))),
        g: Math.max(0, Math.min(255, Math.round(parsed.light.g))),
        b: Math.max(0, Math.min(255, Math.round(parsed.light.b)))
      };
    }

    if (!parsed.batchId) {
      parsed.batchId = `#AR-${Math.floor(1000 + Math.random() * 9000)}`;
    }
    if (!parsed.formulaCode) {
      parsed.formulaCode = `#${Math.floor(10 + Math.random() * 89)}-X`;
    }

    res.json(parsed);
  } catch (err: unknown) {
    console.error('Gemini API Error:', err);
    const fallback = dynamicSemanticSynthesis(prompt, currentCartridges);
    res.json(fallback);
  }
});

/**
 * AI Audio Voice Transcription Endpoint (Gemini 3.5 Transcribe / 3.8 Flash)
 * Transcribes user speech recorded via MediaRecorder when browser WebSpeech is restricted
 */
app.post('/api/ai/transcribe-voice', async (req: Request, res: Response) => {
  const { audioData, mimeType = 'audio/webm' } = req.body;
  if (!audioData || typeof audioData !== 'string') {
    res.status(400).json({ success: false, error: 'audioData base64 string is required.' });
    return;
  }

  const DEFAULT_FALLBACK_API_KEY = 'AQ.Ab8RN6IBRPt7EnwUf1DZdfkk1tDRBqKSzgRjduAamKkCg0Xtrg';
  const apiKey =
    (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' ? process.env.GEMINI_API_KEY : null) ||
    (process.env.VITE_GEMINI_API_KEY && process.env.VITE_GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' ? process.env.VITE_GEMINI_API_KEY : null) ||
    req.body?.apiKey ||
    DEFAULT_FALLBACK_API_KEY;

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' }
      }
    });

    // Strip data URL header if present
    const cleanBase64 = audioData.replace(/^data:[^;]+;base64,/, '');

    const candidateModels = ['gemini-3.5-transcribe', 'gemini-3.8-flash'];
    let transcript = '';

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              inlineData: {
                mimeType,
                data: cleanBase64
              }
            },
            'You are a high-accuracy voice transcriber for a smart aroma diffuser app. Transcribe the user prompt describing what they want to smell. Output ONLY the clear transcribed text with proper capitalization, nothing else. No explanation, no quotes, no markdown.'
          ]
        });
        if (response.text) {
          transcript = response.text.trim().replace(/^["']|["']$/g, '');
          break;
        }
      } catch (err: any) {
        console.warn(`[Voice Transcribe ${modelName} error]`, err?.message || err);
      }
    }

    if (!transcript) {
      res.status(200).json({ success: false, transcript: '', error: 'Could not transcribe voice audio.' });
      return;
    }

    res.status(200).json({ success: true, transcript });
  } catch (err: any) {
    console.error('[Voice Transcribe Exception]', err);
    res.status(500).json({ success: false, error: err?.message || 'Audio transcription failed' });
  }
});

/**
 * AI Video Scent Track Generation Endpoint (Gemini 3.1 Flash Lite)
 */
app.post('/api/ai/generate-video-scents', (req: Request, res: Response) => {
  handleGenerateVideoScents(req, res);
});

/**
 * AI Free Quota & Token Info Endpoint
 */
app.get('/api/ai/quota-info', (_req: Request, res: Response) => {
  res.json({
    provider: 'Google AI Studio',
    model: 'gemini-3.1-flash-lite',
    freeTier: {
      requestsPerMinute: 15,
      requestsPerDay: 1500,
      tokensPerMinute: 1000000,
      inputContextTokens: 1000000,
      cost: '$0.00 (100% Free)',
      summary: 'You can generate up to 1,500 custom scent formulas per day (15 requests/minute) at zero cost on the Google AI Studio free tier.'
    },
    synthesisCostEstimate: {
      tokensPerFormula: '~350 - 500 tokens',
      dailyLimitExplanation: '1,500 messages/day is the daily request ceiling. You will not be charged.'
    }
  });
});

/**
 * Local Device Proxy / Bridge Endpoint
 * Resolves HTTPS mixed-content and CORS restrictions when connecting to local ESP32
 */
app.all('/api/device/proxy', async (req: Request, res: Response) => {
  const targetHost = (req.query.target as string) || 'http://192.168.6.155';
  const endpoint = (req.query.endpoint as string) || '/status';

  const cleanHost = targetHost.replace(/\/+$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const targetUrl = `${cleanHost}${cleanEndpoint}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    const forwardHeaders: Record<string, string> = {
      'User-Agent': 'AromaxAI-Bridge/1.0'
    };
    if (req.headers['content-type']) {
      forwardHeaders['Content-Type'] = req.headers['content-type'];
    }

    const fetchOptions: RequestInit = {
      method: req.method,
      headers: forwardHeaders,
      signal: controller.signal
    };

    if (req.method === 'POST' && req.body && Object.keys(req.body).length > 0) {
      forwardHeaders['Content-Type'] = 'application/json';
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    clearTimeout(timer);

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      res.status(response.status).json(data);
    } else {
      const text = await response.text();
      res.status(response.status).send(text);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(502).json({
      error: 'Device bridge unreachable',
      target: targetUrl,
      details: msg
    });
  }
});

/**
 * Health check
 */
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'AROMAXAI',
    timestamp: new Date().toISOString()
  });
});

/**
 * Custom video upload endpoint
 * Saves uploaded video files (e.g. IMG_9031.MP4) directly into public directory
 */
app.post(
  '/api/video/upload',
  express.raw({ type: ['video/*', 'application/octet-stream'], limit: '150mb' }),
  (req: Request, res: Response) => {
    try {
      const filename = (req.query.filename as string) || 'IMG_9031.MP4';
      const safeFilename = path.basename(filename);
      const publicDir = path.resolve(__dirname, 'public');
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
      const dest = path.join(publicDir, safeFilename);
      fs.writeFileSync(dest, req.body);
      // Also update sensory-odyssey.mp4 if replacing default
      if (req.query.asDefault === 'true' || safeFilename.toUpperCase().includes('IMG_9031')) {
        try {
          fs.writeFileSync(path.join(publicDir, 'sensory-odyssey.mp4'), req.body);
        } catch {
          // ignore copy error
        }
      }
      res.json({
        success: true,
        filename: safeFilename,
        url: `/${safeFilename}`
      });
    } catch (err: unknown) {
      console.error('Video upload error:', err);
      res.status(500).json({ error: String(err) });
    }
  }
);

// ----------------------------------------------------
// STATIC / VITE MIDDLEWARE
// ----------------------------------------------------
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AROMAXAI Server] Listening on http://0.0.0.0:${PORT} (${isProduction ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('[AROMAXAI Server] Startup failed:', err);
  process.exit(1);
});
