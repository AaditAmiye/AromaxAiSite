import { RGB, BlendChannelAllocation } from '../../types/aroma';
import { CHANNEL_MAP } from '../../data/aromas';
import { cartridgeService } from '../cartridges/cartridgeService';

export const SEMANTIC_LIGHT_PRESETS: Record<string, RGB> = {
  // Keyed by channel ID or semantic concept
  H04: { r: 235, g: 120, b: 40 },  // Pizza / Savory warm crust
  H05: { r: 110, g: 60, b: 35 },   // Chocolate warm cacao brown
  H06: { r: 218, g: 165, b: 32 },  // Royal Perfume gold
  H07: { r: 255, g: 90, b: 120 },  // Rose pink
  H08: { r: 255, g: 190, b: 70 },  // Vanilla warm amber
  H09: { r: 210, g: 140, b: 65 },  // Chai warm spice
  H10: { r: 240, g: 130, b: 20 },  // Biryani warm orange
  H11: { r: 180, g: 75, b: 40 },   // Clove warm red/brown
  H15: { r: 245, g: 215, b: 30 },  // Citrus sparkling yellow
  H16: { r: 250, g: 235, b: 195 }, // Sweet milk soft cream
  H18: { r: 217, g: 119, b: 6 },   // Sandalwood warm gold
  H19: { r: 180, g: 83, b: 9 },    // Soil earthy amber
  H21: { r: 200, g: 160, b: 20 },  // Mustard garlic golden oil
  H22: { r: 155, g: 81, b: 224 },  // Lavender purple
  H23: { r: 80, g: 180, b: 140 },  // Herbal mint green
  H24: { r: 139, g: 69, b: 19 },   // Coffee warm brown
  H25: { r: 0, g: 199, b: 190 },   // Peppermint cool green/blue
  H28: { r: 255, g: 107, b: 0 },   // Burning Wood deep amber
  H29: { r: 160, g: 190, b: 60 },  // Cardamom warm green/gold
  H31: { r: 0, g: 113, b: 227 },   // Water cool blue
  H32: { r: 190, g: 215, b: 230 }, // Hospital cool clinical white
  H33: { r: 245, g: 158, b: 11 },  // Temple / Puja warm gold
  H34: { r: 255, g: 153, b: 51 },  // Kesar saffron golden

  neutral: { r: 40, g: 40, b: 40 },
  off: { r: 0, g: 0, b: 0 },
  warmCalm: { r: 255, g: 147, b: 41 },
  forestCanopy: { r: 52, g: 199, b: 89 }
};

/**
 * Calculates a weighted average / dominant atmospheric light for a blend
 */
export function calculateBlendDominantLight(channels: BlendChannelAllocation[]): RGB {
  if (!channels || channels.length === 0) {
    return SEMANTIC_LIGHT_PRESETS.neutral;
  }

  let totalR = 0;
  let totalG = 0;
  let totalB = 0;
  let totalWeight = 0;

  for (const item of channels) {
    const intensity = Math.max(0.01, item.intensity || 0.5);
    const dynamicMap = cartridgeService.getChannelMap();
    const channelDef = dynamicMap[item.channelId] || CHANNEL_MAP[item.channelId];
    const light = channelDef?.defaultLight || SEMANTIC_LIGHT_PRESETS[item.channelId] || { r: 200, g: 200, b: 200 };

    totalR += light.r * intensity;
    totalG += light.g * intensity;
    totalB += light.b * intensity;
    totalWeight += intensity;
  }

  if (totalWeight === 0) return SEMANTIC_LIGHT_PRESETS.neutral;

  return {
    r: Math.round(Math.min(255, Math.max(0, totalR / totalWeight))),
    g: Math.round(Math.min(255, Math.max(0, totalG / totalWeight))),
    b: Math.round(Math.min(255, Math.max(0, totalB / totalWeight)))
  };
}

export function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) => Math.min(255, Math.max(0, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

export function hexToRgb(hex: string): RGB | null {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return null;
  const num = parseInt(clean, 16);
  if (isNaN(num)) return null;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

export function rgbToHsl(rgb: RGB): { h: number; s: number; l: number } {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

export function hslToRgb(h: number, s: number, l: number): RGB {
  h = (h % 360 + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;
  if (h < 60) {
    r = c; g = x; b = 0;
  } else if (h < 120) {
    r = x; g = c; b = 0;
  } else if (h < 180) {
    r = 0; g = c; b = x;
  } else if (h < 240) {
    r = 0; g = x; b = c;
  } else if (h < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  };
}
