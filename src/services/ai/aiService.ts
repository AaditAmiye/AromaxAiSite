import { validateAiExperienceResponse, ValidatedAiExperience } from './aiSchema';
import { calculateBlendDominantLight } from '../hardware/lightEngine';
import { cartridgeService } from '../cartridges/cartridgeService';
import { synthesizeAromaLocally } from './clientOlfactoryEngine';

export interface GenerateAromaResult {
  success: boolean;
  blend?: ValidatedAiExperience;
  error?: string;
  source?: 'server-ai' | 'client-engine';
}

/**
 * Retrieves the best available Gemini API key:
 * 1. User custom key from localStorage
 * 2. Vite environment variable VITE_GEMINI_API_KEY
 */
export function getGeminiApiKey(): string | null {
  try {
    const local = localStorage.getItem('aromax_gemini_api_key');
    if (local && local.trim() && local.trim() !== 'MY_GEMINI_API_KEY') {
      return local.trim();
    }
  } catch {}

  const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (envKey && typeof envKey === 'string' && envKey.trim() && envKey !== 'MY_GEMINI_API_KEY') {
    return envKey.trim();
  }

  return null;
}

/**
 * Saves or clears custom user-provided Gemini API key in browser localStorage
 */
export function setCustomGeminiApiKey(key: string): void {
  try {
    const trimmed = key.trim();
    if (trimmed) {
      localStorage.setItem('aromax_gemini_api_key', trimmed);
    } else {
      localStorage.removeItem('aromax_gemini_api_key');
    }
  } catch {}
}

/**
 * Universal Olfactory Synthesis
 * Guaranteed to succeed anywhere: server Gemini 3.8 Flash or local olfactory engine.
 */
export async function generateAromaExperience(userPrompt: string): Promise<GenerateAromaResult> {
  const trimmed = userPrompt.trim();
  if (!trimmed) {
    return { success: false, error: 'Please enter a description of what you would like to smell.' };
  }

  const apiKey = getGeminiApiKey();

  // -------------------------------------------------------------------------
  // TIER 1: Server-Side AI (Express / Node / Gemini 3.8 Flash)
  // -------------------------------------------------------------------------
  try {
    const res = await fetch('/api/ai/generate-aroma', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: trimmed,
        cartridges: cartridgeService.getCartridges(),
        apiKey: apiKey || undefined
      })
    });

    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await res.json();
        const validation = validateAiExperienceResponse(json);
        if (validation.success && validation.data) {
          if (!validation.data.light || (validation.data.light.r === 0 && validation.data.light.g === 0 && validation.data.light.b === 0)) {
            validation.data.light = calculateBlendDominantLight(validation.data.channels);
          }
          return {
            success: true,
            blend: validation.data,
            source: 'server-ai'
          };
        }
      }
    }

    console.warn(`[AromaxAI] Backend route /api/ai/generate-aroma returned status ${res.status}. Cascading to Client Olfactory Engine.`);
  } catch (serverErr) {
    console.warn('[AromaxAI] Server endpoint unreachable. Cascading to Client Olfactory Engine:', serverErr);
  }

  // -------------------------------------------------------------------------
  // TIER 2: Universal Client Olfactory Engine (Guaranteed zero-failure fallback)
  // -------------------------------------------------------------------------
  try {
    const localBlend = synthesizeAromaLocally(trimmed);
    const validation = validateAiExperienceResponse(localBlend);
    if (validation.success && validation.data) {
      return {
        success: true,
        blend: validation.data,
        source: 'client-engine'
      };
    }

    localBlend.light = calculateBlendDominantLight(localBlend.channels);
    return {
      success: true,
      blend: localBlend,
      source: 'client-engine'
    };
  } catch (err: unknown) {
    // Ultimate safety: synthesize baseline harmonious blend
    const baseline = synthesizeAromaLocally('Atmospheric harmony');
    return {
      success: true,
      blend: baseline,
      source: 'client-engine'
    };
  }
}

