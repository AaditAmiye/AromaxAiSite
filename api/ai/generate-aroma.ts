import type { Request, Response } from 'express';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import fs from 'fs';
import path from 'path';

const DEFAULT_WORKING_CHANNELS = [
  { id: 'H04', name: 'Pizza / Burger', category: 'savory', description: 'Fresh baked crust with savory notes' },
  { id: 'H05', name: 'Chocolate', category: 'sweet', description: 'Rich dark roasted cacao notes' },
  { id: 'H06', name: 'Royal Perfume', category: 'oriental', description: 'Sophisticated royal velvet aroma' },
  { id: 'H07', name: 'Faint Rose', category: 'floral', description: 'Delicate morning blooming petals' },
  { id: 'H08', name: 'Vanilla', category: 'sweet', description: 'Warm comforting bourbon vanilla' },
  { id: 'H09', name: 'Faint Chai', category: 'spicy', description: 'Steamed spiced black tea, cardamom & ginger' },
  { id: 'H10', name: 'Biryani / Tadka', category: 'savory', description: 'Savory basmati spices, cumin & allicin' },
  { id: 'H11', name: 'Clove', category: 'spicy', description: 'Warm pungent eugenol clove bud' },
  { id: 'H15', name: 'Bitter Citrus / Alcohol Perfume', category: 'citrus', description: 'Limonene, sparkling bitter zest' },
  { id: 'H16', name: 'Sweet Milk / Mithai', category: 'sweet', description: 'Condensed milk, sweet creamy lactonic' },
  { id: 'H18', name: 'Sandalwood', category: 'woody', description: 'Mysore aged heartwood, deep sacred woody' },
  { id: 'H19', name: 'Soil / Mitti + Rain', category: 'earthy', description: 'Geosmin, intense petrichor, damp earth' },
  { id: 'H20', name: 'Faint Bitter Smell', category: 'herbal', description: 'Artemisia herbal bitter ground' },
  { id: 'H21', name: 'Garlic Oil / Mustard Oil', category: 'savory', description: 'Pungent cold-pressed mustard & garlic' },
  { id: 'H22', name: 'Lavender + Lotus perfume', category: 'floral', description: 'French floral, serene calming lavender' },
  { id: 'H23', name: 'Ayurvedic Pain Relief Spray', category: 'herbal', description: 'Herbal eucalyptus, camphor' },
  { id: 'H24', name: 'Coffee', category: 'roasted', description: 'Dark roasted espresso crema, roasted beans' },
  { id: 'H25', name: 'Peppermint', category: 'fresh', description: 'Crisp crystalline menthol, icy fresh' },
  { id: 'H28', name: 'Burning Wood', category: 'smoky', description: 'Dry birch logs crackling in fireplace' },
  { id: 'H29', name: 'Sweet Cardamom', category: 'spicy', description: 'Fresh green cardamom pod spice' },
  { id: 'H31', name: 'Water / Neutral', category: 'carrier', description: 'Pure water vapor carrier, waterfall, river' },
  { id: 'H32', name: 'Hospital / Phenyl', category: 'chemical', description: 'Clinical sterile sanitizing antiseptic' },
  { id: 'H33', name: 'Puja / Temple', category: 'resinous', description: 'Sacred sanctum smoke, sambrani & dhoop' },
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
      (c) => c && c.id && c.status !== 'unassigned' && c.status !== 'not_working' && !c.isLighting && !c.isAirflow && c.id !== 'H14' && c.id !== 'H27'
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
          (c) => c && c.id && c.status !== 'unassigned' && c.status !== 'not_working' && !c.isLighting && !c.isAirflow && c.id !== 'H14' && c.id !== 'H27'
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

  return DEFAULT_WORKING_CHANNELS;
}

function fallbackSemanticSynthesis(
  userPrompt: string,
  installedList: Array<{ id: string; name: string; category: string; description?: string }>
) {
  const p = userPrompt.toLowerCase();

  const findInstalled = (keyword: string): { id: string; name: string } => {
    const k = keyword.toLowerCase();
    const found = installedList.find(
      (c) => c.name.toLowerCase().includes(k) || (c.description && c.description.toLowerCase().includes(k)) || c.category.toLowerCase().includes(k)
    );
    if (found) return { id: found.id, name: found.name };
    return { id: installedList[0]?.id || 'H19', name: installedList[0]?.name || 'Soil / Mitti + Rain' };
  };

  const rain = findInstalled('soil') || findInstalled('rain');
  const wood = findInstalled('sandalwood') || findInstalled('wood');
  const fresh = findInstalled('mint') || findInstalled('water');
  const coffee = findInstalled('coffee');
  const vanilla = findInstalled('vanilla');
  const fire = findInstalled('wood') || findInstalled('burning');

  if (p.includes('rain') || p.includes('petrichor') || p.includes('soil') || p.includes('earth') || p.includes('storm')) {
    return {
      title: 'Atmospheric Petrichor',
      description: `First rain falling on summer-baked soil, producing ${rain.name} and ${wood.name}.`,
      channels: [
        { channelId: rain.id, intensity: 0.65, reason: `Installed ${rain.name}` },
        { channelId: wood.id, intensity: 0.25, reason: `Installed ${wood.name}` },
        { channelId: fresh.id, intensity: 0.10, reason: `Installed ${fresh.name}` }
      ],
      light: { r: 52, g: 199, b: 89 },
      durationSeconds: 180,
      batchId: 'RF-9042',
      formulaCode: '#48-A',
      spokenResponse: `There is nothing quite like first rain on earth. I am blending petrichor and fresh cedarwood for you now.`
    };
  }

  if (p.includes('coffee') || p.includes('cafe') || p.includes('café') || p.includes('espresso') || p.includes('morning')) {
    return {
      title: 'Artisan Espresso Bar',
      description: `Freshly extracted espresso with velvety crema: ${coffee.name} & ${vanilla.name}.`,
      channels: [
        { channelId: coffee.id, intensity: 0.70, reason: `Installed ${coffee.name}` },
        { channelId: vanilla.id, intensity: 0.30, reason: `Installed ${vanilla.name}` }
      ],
      light: { r: 180, g: 110, b: 40 },
      durationSeconds: 120,
      batchId: 'CF-4491',
      formulaCode: '#09-C',
      spokenResponse: `That sounds delicious! Crafting a rich blend of roasted espresso and warm vanilla for you.`
    };
  }

  if (p.includes('fire') || p.includes('campfire') || p.includes('hearth') || p.includes('smoke') || p.includes('wood')) {
    return {
      title: 'Alpine Hearth & Embers',
      description: `Charred firewood crackling in open fireplace: ${fire.name}.`,
      channels: [
        { channelId: fire.id, intensity: 0.85, reason: `Installed ${fire.name}` },
        { channelId: wood.id, intensity: 0.15, reason: `Installed ${wood.name}` }
      ],
      light: { r: 255, g: 107, b: 0 },
      durationSeconds: 120,
      batchId: 'FP-1205',
      formulaCode: '#28-W',
      spokenResponse: `Warm, rustic, and soothing. Releasing woodsmoke embers and sandalwood warmth into your room.`
    };
  }

  return {
    title: `${wood.name} & ${rain.name} Formulation`,
    description: `An authentic blend using your physical cartridges: ${rain.name} and ${wood.name}.`,
    channels: [
      { channelId: rain.id, intensity: 0.60, reason: `Installed ${rain.name}` },
      { channelId: wood.id, intensity: 0.40, reason: `Installed ${wood.name}` }
    ],
    light: { r: 52, g: 199, b: 89 },
    durationSeconds: 180,
    batchId: 'FR-3302',
    formulaCode: '#12-F',
    spokenResponse: `Creating a bespoke olfactory formulation tailored directly to your scent description.`
  };
}

export default async function handler(req: Request, res: Response) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    return;
  }

  const body = await parseBody(req);
  const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
  const clientCartridges = body?.cartridges || body?.activeCartridges;

  if (!prompt) {
    res.status(400).json({ error: 'Prompt is required.' });
    return;
  }

  const installedList = resolveInstalledCartridges(clientCartridges);
  const workingSet = new Set(installedList.map((c) => c.id.toUpperCase()));

  const workingChannelsPrompt = installedList
    .map((c) => `- ${c.id}: "${c.name}" (${c.category}${c.description ? ` • ${c.description}` : ''})`)
    .join('\n');

  const DEFAULT_FALLBACK_API_KEY = 'AQ.Ab8RN6IBRPt7EnwUf1DZdfkk1tDRBqKSzgRjduAamKkCg0Xtrg';
  const apiKey =
    (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' ? process.env.GEMINI_API_KEY : null) ||
    (process.env.VITE_GEMINI_API_KEY && process.env.VITE_GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' ? process.env.VITE_GEMINI_API_KEY : null) ||
    body?.apiKey ||
    DEFAULT_FALLBACK_API_KEY;

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    const fallback = fallbackSemanticSynthesis(prompt, installedList);
    res.status(200).json(fallback);
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

    const candidateModels = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.8-flash'];
    let text = '';

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: `Prompt: "${prompt}". Synthesize aroma with 1-3 installed channels. Be concise.`,
          config: {
            systemInstruction: `You are AROMAXAI. Be extremely concise to minimize tokens.
Installed:
${workingChannelsPrompt}
Rules:
1. ONLY pick from installed channels.
2. 1 to 3 channels.
3. Descriptions under 8 words.
4. Return strictly valid JSON.`,
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
        console.warn(`[Gemini Aroma] Model ${modelName} error:`, mErr?.message || mErr);
      }
    }

    if (!text) {
      const fallback = fallbackSemanticSynthesis(prompt, installedList);
      res.status(200).json(fallback);
      return;
    }
    const parsed = JSON.parse(text);

    if (!parsed.spokenResponse || typeof parsed.spokenResponse !== 'string') {
      parsed.spokenResponse = `Creating ${parsed.title}. ${parsed.description}`;
    }

    // Sanitize channels to ensure they only exist in workingSet
    if (Array.isArray(parsed.channels)) {
      parsed.channels = parsed.channels
        .filter((c: any) => c && c.channelId && workingSet.has(String(c.channelId).toUpperCase()))
        .map((c: any) => ({
          channelId: String(c.channelId).toUpperCase(),
          intensity: Math.max(0.05, Math.min(1.0, typeof c.intensity === 'number' ? c.intensity : 0.5)),
          reason: c.reason || 'Harmonious note'
        }))
        .slice(0, 3);
    }

    if (!Array.isArray(parsed.channels) || parsed.channels.length === 0) {
      const fallback = fallbackSemanticSynthesis(prompt, installedList);
      parsed.channels = fallback.channels;
    }

    if (!parsed.batchId) {
      parsed.batchId = `#AR-${Math.floor(1000 + Math.random() * 9000)}`;
    }
    if (!parsed.formulaCode) {
      parsed.formulaCode = `#${Math.floor(10 + Math.random() * 89)}-X`;
    }

    res.status(200).json(parsed);
  } catch (err: unknown) {
    console.error('[Vercel API] Gemini API error, falling back to semantic engine:', err);
    const fallback = fallbackSemanticSynthesis(prompt, installedList);
    res.status(200).json(fallback);
  }
}
