import { Blend } from '../types/aroma';

export const PREDEFINED_BLENDS: Blend[] = [
  {
    id: 'blend-rainy-forest',
    name: 'Rainy Forest',
    category: 'Nature',
    notes: 'Earthy · Fresh · Calm',
    description: 'Wild understory profile. Rich humus, damp cedar, ozone, and fresh mountain rain droplets.',
    imageUrl: 'https://images.unsplash.com/photo-1511497584788-87676104235f?auto=format&fit=crop&w=700&q=80',
    batchId: 'RF-9042',
    formulaCode: '#48-A',
    profileName: 'Wild Mountain Petrichor & Forest',
    durationSeconds: 180,
    channels: [
      { channelId: 'H19', intensity: 0.50, reason: 'Deep geosmin & petrichor loamy soil' },
      { channelId: 'H18', intensity: 0.30, reason: 'Aged sandalwood forest floor' },
      { channelId: 'H25', intensity: 0.20, reason: 'Crisp mountain breeze mint' }
    ],
    light: { r: 52, g: 199, b: 89 }
  },
  {
    id: 'blend-citrus-grove',
    name: 'Citrus Grove',
    category: 'Fruity',
    notes: 'Zesty · Bright · Uplifting',
    description: 'Sun-drenched Mediterranean citrus orchard with freshly crushed bergamot, orange blossoms, and tart zest.',
    imageUrl: 'https://images.unsplash.com/photo-1582979512210-99b6a53386f9?auto=format&fit=crop&w=700&q=80',
    batchId: 'CG-1024',
    formulaCode: '#12-C',
    profileName: 'Amalfi Coast Citrus Orchard',
    durationSeconds: 120,
    channels: [
      { channelId: 'H15', intensity: 0.55, reason: 'Bitter zest citrus spark' },
      { channelId: 'H09', intensity: 0.30, reason: 'Sweet green mango & tropical fruit' },
      { channelId: 'H25', intensity: 0.15, reason: 'Clean morning airflow' }
    ],
    light: { r: 245, g: 158, b: 11 }
  },
  {
    id: 'blend-vanilla-dream',
    name: 'Vanilla Dream',
    category: 'Fruity',
    notes: 'Sweet · Warm · Cozy',
    description: 'Madagascar bourbon vanilla beans cured over warm sandalwood with creamy condensed almond milk.',
    imageUrl: 'https://images.unsplash.com/photo-1509358271058-acd22cc93898?auto=format&fit=crop&w=700&q=80',
    batchId: 'VD-3048',
    formulaCode: '#08-V',
    profileName: 'Bourbon Vanilla Bean Confection',
    durationSeconds: 150,
    channels: [
      { channelId: 'H08', intensity: 0.60, reason: 'Warm bourbon vanilla extract' },
      { channelId: 'H16', intensity: 0.25, reason: 'Velvety condensed sweet milk' },
      { channelId: 'H05', intensity: 0.15, reason: 'Subtle dark cocoa nuance' }
    ],
    light: { r: 217, g: 140, b: 60 }
  },
  {
    id: 'blend-ocean-breeze',
    name: 'Ocean Breeze',
    category: 'Nature',
    notes: 'Marine · Fresh · Clean',
    description: 'Crisp Pacific sea spray crashing against coastal cliffs, charged with cooling ozone and aquatic mist.',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=700&q=80',
    batchId: 'OB-7709',
    formulaCode: '#22-O',
    profileName: 'Pacific Marine Coastal Drift',
    durationSeconds: 180,
    channels: [
      { channelId: 'H25', intensity: 0.50, reason: 'Invigorating sea breeze ozone' },
      { channelId: 'H31', intensity: 0.35, reason: 'Fine saline mist dispersion' },
      { channelId: 'H09', intensity: 0.15, reason: 'Sunlit driftwood accord' }
    ],
    light: { r: 2, g: 132, b: 199 }
  },
  {
    id: 'blend-artisan-espresso',
    name: 'Artisan Espresso',
    category: 'Woody',
    notes: 'Roasted · Warm · Rich',
    description: 'Freshly pulled double-shot dark roast espresso with hazelnut crema and delicate bourbon vanilla.',
    imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=700&q=80',
    batchId: 'CF-4491',
    formulaCode: '#09-C',
    profileName: 'Milanese Coffee Roastery',
    durationSeconds: 120,
    channels: [
      { channelId: 'H24', intensity: 0.70, reason: 'Dark roast espresso extraction' },
      { channelId: 'H08', intensity: 0.30, reason: 'Warm bourbon vanilla' }
    ],
    light: { r: 146, g: 64, b: 14 }
  },
  {
    id: 'blend-sacred-temple',
    name: 'Sacred Temple',
    category: 'Floral',
    notes: 'Woody · Smoky · Meditative',
    description: 'Ancient sanctum with brass lamps at twilight, sacred sambrani dhoop smoke, sandalwood paste, and saffron.',
    imageUrl: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=700&q=80',
    batchId: 'TP-8820',
    formulaCode: '#33-T',
    profileName: 'Varanasi Sanctum Devotion',
    durationSeconds: 240,
    channels: [
      { channelId: 'H33', intensity: 0.50, reason: 'Holy sambrani resin smoke' },
      { channelId: 'H18', intensity: 0.30, reason: 'Mysore sandalwood altar' },
      { channelId: 'H34', intensity: 0.20, reason: 'Royal Kashmiri kesar' }
    ],
    light: { r: 245, g: 158, b: 11 }
  },
  {
    id: 'blend-alpine-hearth',
    name: 'Alpine Hearth',
    category: 'Woody',
    notes: 'Woodsmoke · Birch · Embers',
    description: 'Crackling aged birch logs in a stone hearth on a quiet winter night, paired with sandalwood embers.',
    imageUrl: 'https://images.unsplash.com/photo-1542224566-6e85f2e6772f?auto=format&fit=crop&w=700&q=80',
    batchId: 'FP-1205',
    formulaCode: '#28-W',
    profileName: 'Alpine Chalet Hearth',
    durationSeconds: 180,
    channels: [
      { channelId: 'H28', intensity: 0.70, reason: 'Crackling dry birch wood smoke' },
      { channelId: 'H18', intensity: 0.30, reason: 'Deep sandalwood embers' }
    ],
    light: { r: 217, g: 119, b: 6 }
  },
  {
    id: 'blend-royal-feast',
    name: 'Royal Feast',
    category: 'Savory',
    notes: 'Savory · Spiced · Aromatic',
    description: 'Hot sizzling mustard oil tempered with golden garlic cloves and fragrant basmati dum biryani spices.',
    imageUrl: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=700&q=80',
    batchId: 'IK-5510',
    formulaCode: '#10-K',
    profileName: 'Awadhi Nizami Kitchen',
    durationSeconds: 90,
    channels: [
      { channelId: 'H10', intensity: 0.60, reason: 'Dum biryani spiced rice steam' },
      { channelId: 'H21', intensity: 0.40, reason: 'Tempered garlic and mustard oil' }
    ],
    light: { r: 235, g: 110, b: 20 }
  }
];

export const BLEND_MAP: Record<string, Blend> = PREDEFINED_BLENDS.reduce(
  (acc, b) => {
    acc[b.id] = b;
    return acc;
  },
  {} as Record<string, Blend>
);
