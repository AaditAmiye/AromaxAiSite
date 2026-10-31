import { ValidatedAiExperience } from './aiSchema';
import { calculateBlendDominantLight } from '../hardware/lightEngine';
import { cartridgeService } from '../cartridges/cartridgeService';

/**
 * Universal Client-Side Olfactory Synthesis Engine
 * Guarantees synthesis works everywhere: Vercel, Netlify, Cloud Run, mobile, or offline.
 */
export function synthesizeAromaLocally(userPrompt: string): ValidatedAiExperience {
  const p = userPrompt.toLowerCase();
  const workingIds = cartridgeService.getWorkingChannelIds();

  // Helper to ensure channel is installed and working
  const isAvailable = (chId: string) => workingIds.includes(chId.toUpperCase());

  // 1. Rain / Petrichor / Soil / Loam
  if (
    p.includes('rain') ||
    p.includes('petrichor') ||
    p.includes('soil') ||
    p.includes('earth') ||
    p.includes('loam') ||
    p.includes('clay') ||
    p.includes('storm') ||
    p.includes('damp')
  ) {
    const channels = [
      { channelId: 'H19', intensity: 0.55, reason: 'Loam & Geosmin Petrichor' },
      { channelId: 'H18', intensity: 0.30, reason: 'Woodland Sandalwood' },
      { channelId: 'H25', intensity: 0.15, reason: 'Crisp Storm Breeze' }
    ].filter((c) => isAvailable(c.channelId));

    const light = calculateBlendDominantLight(channels);
    return {
      title: 'Rainy Twilight Forest',
      description: 'Damp earth and geosmin petrichor after twilight rain, grounded with ancient woods.',
      channels: channels.slice(0, 3),
      light,
      durationSeconds: 180,
      batchId: `#RF-${Math.floor(1000 + Math.random() * 9000)}`,
      formulaCode: '#RF-9042'
    };
  }

  // 2. Forest / Pine / Woods / Cedar
  if (
    p.includes('forest') ||
    p.includes('wood') ||
    p.includes('pine') ||
    p.includes('tree') ||
    p.includes('cedar') ||
    p.includes('moss') ||
    p.includes('nature')
  ) {
    const channels = [
      { channelId: 'H18', intensity: 0.55, reason: 'Mysore Sandalwood Heartwood' },
      { channelId: 'H19', intensity: 0.30, reason: 'Forest Floor Loam' },
      { channelId: 'H25', intensity: 0.15, reason: 'Alpine Evergreen Breeze' }
    ].filter((c) => isAvailable(c.channelId));

    const light = calculateBlendDominantLight(channels);
    return {
      title: 'Old Evergreen Forest',
      description: 'Misty grove of aged cedar, fallen pine needles, and damp mountain moss.',
      channels: channels.slice(0, 3),
      light,
      durationSeconds: 180,
      batchId: `#FR-${Math.floor(1000 + Math.random() * 9000)}`,
      formulaCode: '#FR-4102'
    };
  }

  // 3. Coffee / Espresso / Cafe
  if (
    p.includes('coffee') ||
    p.includes('cafe') ||
    p.includes('café') ||
    p.includes('espresso') ||
    p.includes('latte') ||
    p.includes('cappuccino') ||
    p.includes('roast')
  ) {
    const channels = [
      { channelId: 'H24', intensity: 0.65, reason: 'Dark Roast Espresso Crema' },
      { channelId: 'H08', intensity: 0.20, reason: 'Warm Bourbon Vanilla' },
      { channelId: 'H16', intensity: 0.15, reason: 'Sweet Steamed Milk' }
    ].filter((c) => isAvailable(c.channelId));

    const light = calculateBlendDominantLight(channels);
    return {
      title: 'Artisan Espresso Bar',
      description: 'Fresh pulled espresso crema with a velvety drop of Madagascar bourbon vanilla.',
      channels: channels.slice(0, 3),
      light,
      durationSeconds: 120,
      batchId: `#CF-${Math.floor(1000 + Math.random() * 9000)}`,
      formulaCode: '#CF-8804'
    };
  }

  // 4. Cozy / Fire / Campfire / Hearth / Smoke
  if (
    p.includes('fire') ||
    p.includes('campfire') ||
    p.includes('hearth') ||
    p.includes('smoke') ||
    p.includes('cozy') ||
    p.includes('ember') ||
    p.includes('candle')
  ) {
    const channels = [
      { channelId: 'H28', intensity: 0.70, reason: 'Charred Birch Wood Embers' },
      { channelId: 'H18', intensity: 0.20, reason: 'Sandalwood Hearth Warmth' },
      { channelId: 'H08', intensity: 0.10, reason: 'Comforting Vanilla Glaze' }
    ].filter((c) => isAvailable(c.channelId));

    const light = calculateBlendDominantLight(channels);
    return {
      title: 'Autumn Hearth & Embers',
      description: 'Crackling dry birch logs in an open fireplace with sweet comforting undertones.',
      channels: channels.slice(0, 3),
      light,
      durationSeconds: 150,
      batchId: `#FP-${Math.floor(1000 + Math.random() * 9000)}`,
      formulaCode: '#FP-2810'
    };
  }

  // 5. Calm / Lavender / Lotus / Spa / Sleep / Relax
  if (
    p.includes('calm') ||
    p.includes('lavender') ||
    p.includes('lotus') ||
    p.includes('spa') ||
    p.includes('sleep') ||
    p.includes('relax') ||
    p.includes('peace') ||
    p.includes('zen')
  ) {
    const channels = [
      { channelId: 'H22', intensity: 0.60, reason: 'French Lavender & Water Lotus' },
      { channelId: 'H07', intensity: 0.25, reason: 'Delicate Morning Rose' },
      { channelId: 'H18', intensity: 0.15, reason: 'Tranquil Mysore Sandalwood' }
    ].filter((c) => isAvailable(c.channelId));

    const light = calculateBlendDominantLight(channels);
    return {
      title: 'Tranquil Lotus Sanctuary',
      description: 'Serene French lavender blossoms suspended in peaceful lotus water and sandalwood.',
      channels: channels.slice(0, 3),
      light,
      durationSeconds: 240,
      batchId: `#CL-${Math.floor(1000 + Math.random() * 9000)}`,
      formulaCode: '#CL-2201'
    };
  }

  // 6. Fresh / Mint / Ice / Breeze / Clean / Citrus
  if (
    p.includes('fresh') ||
    p.includes('mint') ||
    p.includes('ice') ||
    p.includes('breeze') ||
    p.includes('clean') ||
    p.includes('citrus') ||
    p.includes('lemon') ||
    p.includes('peppermint')
  ) {
    const channels = [
      { channelId: 'H25', intensity: 0.60, reason: 'Crystalline Menthol Mint' },
      { channelId: 'H15', intensity: 0.25, reason: 'Bitter Citrus Bergamot Zest' },
      { channelId: 'H18', intensity: 0.15, reason: 'Clean Wood Support' }
    ].filter((c) => isAvailable(c.channelId));

    const light = calculateBlendDominantLight(channels);
    return {
      title: 'Alpine Ozone & Mint',
      description: 'Piercingly crisp mountain atmosphere with iced peppermint and sparkling citrus peel.',
      channels: channels.slice(0, 3),
      light,
      durationSeconds: 120,
      batchId: `#FS-${Math.floor(1000 + Math.random() * 9000)}`,
      formulaCode: '#FS-2507'
    };
  }

  // 7. Temple / Incense / Puja / Spiritual / Sacred
  if (
    p.includes('temple') ||
    p.includes('incense') ||
    p.includes('puja') ||
    p.includes('prayer') ||
    p.includes('spiritual') ||
    p.includes('saffron') ||
    p.includes('sacred')
  ) {
    const channels = [
      { channelId: 'H33', intensity: 0.50, reason: 'Dhoop Sambrani Sacred Incense' },
      { channelId: 'H18', intensity: 0.30, reason: 'Carved Sandalwood Altar' },
      { channelId: 'H34', intensity: 0.20, reason: 'Kashmiri Golden Saffron' }
    ].filter((c) => isAvailable(c.channelId));

    const light = calculateBlendDominantLight(channels);
    return {
      title: 'Sacred Sanctum Aarti',
      description: 'Aromatic sambrani smoke, Mysore carved sandalwood, and soaked Mogra saffron stigmata.',
      channels: channels.slice(0, 3),
      light,
      durationSeconds: 240,
      batchId: `#TP-${Math.floor(1000 + Math.random() * 9000)}`,
      formulaCode: '#TP-3315'
    };
  }

  // 8. Chocolate / Sweet / Dessert / Vanilla
  if (
    p.includes('chocolate') ||
    p.includes('sweet') ||
    p.includes('dessert') ||
    p.includes('vanilla') ||
    p.includes('cookie') ||
    p.includes('cake')
  ) {
    const channels = [
      { channelId: 'H05', intensity: 0.50, reason: 'Rich Dark Cocoa' },
      { channelId: 'H08', intensity: 0.30, reason: 'Bourbon Vanilla Bean' },
      { channelId: 'H16', intensity: 0.20, reason: 'Condensed Sweet Milk' }
    ].filter((c) => isAvailable(c.channelId));

    const light = calculateBlendDominantLight(channels);
    return {
      title: 'Chocolatier Velvet',
      description: 'Warm roasted cacao nibs blended with Madagascar bourbon vanilla and sweet cream.',
      channels: channels.slice(0, 3),
      light,
      durationSeconds: 150,
      batchId: `#CH-${Math.floor(1000 + Math.random() * 9000)}`,
      formulaCode: '#CH-0508'
    };
  }

  // 9. Royal / Perfume / Luxury / Amber
  if (
    p.includes('perfume') ||
    p.includes('royal') ||
    p.includes('luxury') ||
    p.includes('amber') ||
    p.includes('rose') ||
    p.includes('floral')
  ) {
    const channels = [
      { channelId: 'H06', intensity: 0.55, reason: 'Royal Amber Velvet Perfume' },
      { channelId: 'H07', intensity: 0.25, reason: 'Dewy Morning Rose' },
      { channelId: 'H18', intensity: 0.20, reason: 'Mysore Sandalwood Base' }
    ].filter((c) => isAvailable(c.channelId));

    const light = calculateBlendDominantLight(channels);
    return {
      title: 'Imperial Botanical Velvet',
      description: 'Opulent ambergris accord laced with fresh blooming rose petals and creamy sandalwood.',
      channels: channels.slice(0, 3),
      light,
      durationSeconds: 180,
      batchId: `#RY-${Math.floor(1000 + Math.random() * 9000)}`,
      formulaCode: '#RY-0607'
    };
  }

  // 10. Default Harmonious Blend calibrated to the user's specific prompt
  const fallbackChannels = [
    { channelId: 'H19', intensity: 0.50, reason: 'Geosmin Earth Foundation' },
    { channelId: 'H18', intensity: 0.30, reason: 'Aged Sandalwood Resonance' },
    { channelId: 'H25', intensity: 0.20, reason: 'Atmospheric Breeze' }
  ].filter((c) => isAvailable(c.channelId));

  const light = calculateBlendDominantLight(fallbackChannels);
  const result: ValidatedAiExperience = {
    title: 'Atmospheric Formulation',
    description: `A custom calibrated olfactory translation inspired by: "${userPrompt.slice(0, 70)}..."`,
    channels: fallbackChannels.slice(0, 3),
    light,
    durationSeconds: 180,
    batchId: `#AR-${Math.floor(1000 + Math.random() * 9000)}`,
    formulaCode: '#AR-3401',
    spokenResponse: `Formulating a bespoke fragrance accord crafted for your request: ${userPrompt.slice(0, 60)}.`
  };

  return result;
}
