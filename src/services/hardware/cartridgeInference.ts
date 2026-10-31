import { AromaCategory, RGB } from '../../types/aroma';

export interface InferredAromaProfile {
  name: string;
  category: AromaCategory;
  keywords: string[];
  description: string;
  defaultLight: RGB;
  chemicalCompound: string;
  status: 'working';
}

interface ArchetypeRule {
  matchWords: string[];
  category: AromaCategory;
  defaultLight: RGB;
  defaultKeywords: string[];
  defaultCompound: string;
  descriptionGenerator: (name: string) => string;
}

const ARCHETYPES: ArchetypeRule[] = [
  // 1. Savory (Pizza, Bread, Burger, Garlic, Cheese, Herbs, Meat, Soup, Umami)
  {
    matchWords: ['pizza', 'burger', 'crust', 'cheese', 'bread', 'pasta', 'garlic', 'onion', 'taco', 'truffle', 'bacon', 'umami', 'dough', 'pastry', 'parmesan', 'tomato', 'sauce', 'steak', 'savory', 'biryani', 'curry', 'rice', 'dumpling', 'ramen', 'roast chicken'],
    category: 'savory',
    defaultLight: { r: 235, g: 110, b: 35 }, // warm stone-baked terracotta
    defaultKeywords: ['savory', 'umami', 'baked', 'crust', 'culinary', 'warm', 'delicious', 'aromatic', 'golden'],
    defaultCompound: 'Alkylpyrazines & 2-Acetyl-1-pyrroline',
    descriptionGenerator: (name) =>
      `Sensory culinary chord of ${name} with warm oven-baked notes, mouthwatering umami, and rich comforting savory facets.`
  },
  // 2. Earthy & Petrichor (Rain, Soil, Mud, Forest floor, Mitti, Cave, Moss, Clay)
  {
    matchWords: ['rain', 'petrichor', 'mitti', 'soil', 'earth', 'monsoon', 'damp', 'mud', 'moss', 'clay', 'terroir', 'geosmin', 'dew', 'ground', 'puddle', 'humid', 'wet'],
    category: 'earthy',
    defaultLight: { r: 42, g: 168, b: 135 }, // deep rain petrichor teal
    defaultKeywords: ['rain', 'petrichor', 'soil', 'earth', 'monsoon', 'damp', 'grounding', 'wet', 'mineral', 'clay'],
    defaultCompound: 'Geosmin & 2-Methylisoborneol',
    descriptionGenerator: (name) =>
      `Atmospheric petrichor profile of ${name}, capturing the grounding essence of raindrops striking mineral earth and cool summer loam.`
  },
  // 3. Roasted (Coffee, Espresso, Toast, Nut, Hazelnut, Cacao, Roasted Almond)
  {
    matchWords: ['coffee', 'espresso', 'roast', 'roasted', 'cacao', 'hazelnut', 'almond', 'walnut', 'toasted', 'mocha', 'cappuccino', 'barista', 'crema', 'latte'],
    category: 'roasted',
    defaultLight: { r: 138, g: 72, b: 24 }, // dark roasted crema
    defaultKeywords: ['roasted', 'coffee', 'espresso', 'cacao', 'toasted', 'crema', 'warm', 'nutty', 'bittersweet'],
    defaultCompound: '2-Furfurylthiol & Trimethylpyrazine',
    descriptionGenerator: (name) =>
      `Artisan dark-roasted notes of ${name} with deep caramelized warmth, roasted complexity, and rich lingering aromatic depth.`
  },
  // 4. Fresh & Marine (Mint, Ocean, Sea, Ice, Eucalyptus, Breeze, Menthol, Clean, Water)
  {
    matchWords: ['mint', 'ocean', 'sea', 'water', 'ice', 'breeze', 'eucalyptus', 'menthol', 'clean', 'fresh', 'air', 'alpine', 'cool', 'ozone', 'surf', 'aqua', 'breathe', 'crisp', 'linen'],
    category: 'fresh',
    defaultLight: { r: 0, g: 195, b: 185 }, // icy crisp turquoise
    defaultKeywords: ['fresh', 'clean', 'invigorating', 'cool', 'breeze', 'crisp', 'energizing', 'pure'],
    defaultCompound: 'Menthol & Calone 1951',
    descriptionGenerator: (name) =>
      `Crisp and invigorating notes of ${name}, releasing an uplifting crystalline freshness with cooling aquatic vitality.`
  },
  // 5. Floral (Lavender, Rose, Jasmine, Lotus, Gardenia, Lily, Blossom, Orchid, Neroli)
  {
    matchWords: ['lavender', 'rose', 'jasmine', 'lotus', 'gardenia', 'lily', 'blossom', 'orchid', 'neroli', 'chamomile', 'violet', 'flower', 'floral', 'petal', 'magnolia', 'hibiscus', 'ylang'],
    category: 'floral',
    defaultLight: { r: 175, g: 95, b: 235 }, // tranquil floral violet / rose
    defaultKeywords: ['floral', 'petals', 'blooming', 'tranquil', 'calm', 'sweet', 'soothing', 'serene', 'botanical'],
    defaultCompound: 'Linalool & Geraniol',
    descriptionGenerator: (name) =>
      `Delicate, ethereal bouquet of ${name} featuring velvety floral accords, soothing botanical serenity, and soft airy sillage.`
  },
  // 6. Sweet & Gourmand (Vanilla, Chocolate, Caramel, Honey, Sugar, Cotton candy, Maple, Bakery)
  {
    matchWords: ['vanilla', 'sweet', 'chocolate', 'caramel', 'honey', 'sugar', 'custard', 'cookie', 'cake', 'dessert', 'creamy', 'maple', 'marshmallow', 'fudge', 'butterscotch'],
    category: 'sweet',
    defaultLight: { r: 255, g: 190, b: 65 }, // warm golden amber custard
    defaultKeywords: ['sweet', 'gourmand', 'creamy', 'comforting', 'warm', 'delicious', 'velvety', 'dessert'],
    defaultCompound: 'Vanillin & Ethyl Maltol',
    descriptionGenerator: (name) =>
      `Decadent gourmand accord of ${name} infused with comforting creamy sweetness, golden warmth, and smooth velvet notes.`
  },
  // 7. Citrus (Lemon, Lime, Orange, Bergamot, Grapefruit, Tangerine, Yuzu, Citrus)
  {
    matchWords: ['lemon', 'lime', 'orange', 'citrus', 'bergamot', 'grapefruit', 'tangerine', 'yuzu', 'mandarin', 'zest', 'sparkling'],
    category: 'citrus',
    defaultLight: { r: 250, g: 205, b: 15 }, // vibrant sunlit citrus yellow
    defaultKeywords: ['citrus', 'zesty', 'sparkling', 'bright', 'energizing', 'uplifting', 'sunlit', 'tangy'],
    defaultCompound: 'D-Limonene & Citral',
    descriptionGenerator: (name) =>
      `Bright and effervescent citrus essence of ${name}, bursting with cold-pressed sunlit peel and refreshing zesty radiance.`
  },
  // 8. Fruity (Mango, Strawberry, Peach, Watermelon, Berry, Apple, Pineapple, Coconut, Cherry, Fig)
  {
    matchWords: ['mango', 'strawberry', 'peach', 'watermelon', 'berry', 'apple', 'pineapple', 'coconut', 'cherry', 'fig', 'guava', 'passionfruit', 'grape', 'banana', 'fruity', 'fruit', 'tropical'],
    category: 'fruity',
    defaultLight: { r: 255, g: 85, b: 110 }, // vibrant coral-pink / mango gold
    defaultKeywords: ['fruity', 'tropical', 'juicy', 'sweet', 'ripe', 'fresh', 'nectar', 'vibrant'],
    defaultCompound: 'Gamma-Decalactone & Ethyl Butyrate',
    descriptionGenerator: (name) =>
      `Sun-drenched, juicy fruit accord of ${name} capturing ripe nectar, luscious sweetness, and vibrant natural vitality.`
  },
  // 9. Woody (Pine, Cedarwood, Sandalwood, Oud, Forest, Birch, Oak, Cypress, Driftwood)
  {
    matchWords: ['wood', 'woody', 'pine', 'cedar', 'cedarwood', 'sandalwood', 'oud', 'forest', 'birch', 'oak', 'cypress', 'driftwood', 'timber', 'bamboo', 'vetiver', 'teak', 'patchouli'],
    category: 'woody',
    defaultLight: { r: 52, g: 140, b: 80 }, // evergreen pine & warm cedar
    defaultKeywords: ['woody', 'forest', 'cedar', 'nature', 'grounding', 'timber', 'resilient', 'aromatic'],
    defaultCompound: 'Alpha-Pinene & Cedrol',
    descriptionGenerator: (name) =>
      `Resonant natural woody essence of ${name} with deep forest heartwood, evergreen needles, and noble resinous balance.`
  },
  // 10. Smoky (Campfire, Smoke, Bonfire, Charcoal, Peat, Tobacco, Hearth, Ember)
  {
    matchWords: ['smoke', 'smoky', 'campfire', 'bonfire', 'charcoal', 'peat', 'tobacco', 'hearth', 'ember', 'ash', 'bbq', 'barbecue'],
    category: 'smoky',
    defaultLight: { r: 225, g: 85, b: 25 }, // glowing amber fire embers
    defaultKeywords: ['smoky', 'campfire', 'ember', 'warm', 'atmospheric', 'night', 'woodsmoke', 'cozy'],
    defaultCompound: 'Guaiacol & Syringol',
    descriptionGenerator: (name) =>
      `Atmospheric firelight essence of ${name} alive with curling woodsmoke, glowing embers, and rustic campfire warmth.`
  },
  // 11. Spicy (Cinnamon, Cardamom, Clove, Ginger, Pepper, Nutmeg, Anise, Chili, Saffron)
  {
    matchWords: ['spice', 'spicy', 'cinnamon', 'cardamom', 'clove', 'ginger', 'pepper', 'nutmeg', 'anise', 'chili', 'saffron', 'chai'],
    category: 'spicy',
    defaultLight: { r: 215, g: 65, b: 35 }, // fiery warm spice
    defaultKeywords: ['spicy', 'warm', 'exotic', 'stimulating', 'zesty', 'aromatic', 'pungent'],
    defaultCompound: 'Cinnamaldehyde & Eugenol',
    descriptionGenerator: (name) =>
      `Invigorating exotic spice profile of ${name} brimming with warm piquant heat and complex aromatic nuance.`
  },
  // 12. Resinous (Incense, Dhoop, Frankincense, Myrrh, Sambrani, Amber, Benzoin)
  {
    matchWords: ['incense', 'dhoop', 'frankincense', 'myrrh', 'sambrani', 'amber', 'benzoin', 'temple', 'sacred', 'puja', 'ritual'],
    category: 'resinous',
    defaultLight: { r: 235, g: 150, b: 30 }, // warm sacred temple gold
    defaultKeywords: ['resinous', 'sacred', 'incense', 'meditation', 'ancient', 'spiritual', 'balmy'],
    defaultCompound: 'Alpha-Thujene & Boswellic resin',
    descriptionGenerator: (name) =>
      `Sacred ceremonial aroma of ${name} unfolding with golden balsamic resin, holy temple warmth, and meditative stillness.`
  },
  // 13. Herbal (Basil, Rosemary, Thyme, Sage, Oregano, Mint, Tea, Green)
  {
    matchWords: ['herb', 'herbal', 'basil', 'rosemary', 'thyme', 'sage', 'tea', 'green tea', 'matcha', 'grass', 'cut grass', 'botanical'],
    category: 'herbal',
    defaultLight: { r: 76, g: 175, b: 80 }, // botanical herbal green
    defaultKeywords: ['herbal', 'botanical', 'green', 'fresh', 'natural', 'aromatic', 'restorative'],
    defaultCompound: 'Eucalyptol & Camphor',
    descriptionGenerator: (name) =>
      `Restorative botanical blend of ${name} rich with freshly crushed garden herbs and clean natural verdancy.`
  }
];

/**
 * Intelligent Smell Inference Engine:
 * The user ONLY gives the smell name (e.g. "Pizza", "Rain", "Chai", "Lavender", "Fresh Cut Grass").
 * The engine immediately infers:
 * - Olfactory category
 * - Full AI trigger keywords (synonyms, culinary terms, mood tags)
 * - Poetic, high-end olfactory description & notes
 * - Harmonious RGB LED illumination
 * - Standard fragrance compound
 * - Sets status to 'working'
 */
export function inferAromaProfile(smellName: string): InferredAromaProfile {
  const cleanName = smellName.trim();
  if (!cleanName) {
    return {
      name: 'Unassigned',
      category: 'unassigned',
      keywords: [],
      description: 'Reserved channel waiting for a fragrance assignment.',
      defaultLight: { r: 120, g: 120, b: 120 },
      chemicalCompound: 'Synthetic fragrance blend',
      status: 'working'
    };
  }

  const lower = cleanName.toLowerCase();
  const inputWords = lower
    .split(/[\s,/&+\-_()]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1);

  // Specific color tweaks for common iconic names
  let specificLight: RGB | null = null;
  if (lower.includes('mango')) specificLight = { r: 255, g: 160, b: 20 };
  else if (lower.includes('strawberry')) specificLight = { r: 255, g: 60, b: 100 };
  else if (lower.includes('rose')) specificLight = { r: 245, g: 65, b: 120 };
  else if (lower.includes('lavender')) specificLight = { r: 165, g: 110, b: 245 };
  else if (lower.includes('coffee') || lower.includes('espresso')) specificLight = { r: 139, g: 69, b: 19 };
  else if (lower.includes('pizza')) specificLight = { r: 235, g: 110, b: 35 };
  else if (lower.includes('rain') || lower.includes('mitti') || lower.includes('petrichor')) specificLight = { r: 40, g: 175, b: 140 };
  else if (lower.includes('ocean') || lower.includes('sea')) specificLight = { r: 20, g: 145, b: 230 };
  else if (lower.includes('matcha') || lower.includes('green tea')) specificLight = { r: 120, g: 185, b: 70 };
  else if (lower.includes('chocolate')) specificLight = { r: 110, g: 50, b: 25 };
  else if (lower.includes('lemon')) specificLight = { r: 250, g: 220, b: 20 };
  else if (lower.includes('orange')) specificLight = { r: 255, g: 130, b: 15 };
  else if (lower.includes('apple')) specificLight = { r: 140, g: 215, b: 40 };

  // Score each archetype
  let bestArchetype: ArchetypeRule | null = null;
  let highestScore = 0;

  for (const arc of ARCHETYPES) {
    let score = 0;
    for (const mw of arc.matchWords) {
      if (lower === mw) score += 10;
      else if (lower.includes(mw)) score += 5;
      else if (inputWords.includes(mw)) score += 4;
    }
    if (score > highestScore) {
      highestScore = score;
      bestArchetype = arc;
    }
  }

  // Fallback if no archetype strongly matched
  if (!bestArchetype || highestScore === 0) {
    bestArchetype = {
      matchWords: [],
      category: 'aromatic',
      defaultLight: { r: 210, g: 140, b: 70 },
      defaultKeywords: ['signature', 'aroma', 'blend', 'atmospheric', 'fragrance', 'diffusion'],
      defaultCompound: 'Botanical aromatic accord',
      descriptionGenerator: (n) =>
        `Bespoke aroma blend of ${n} with distinctive multi-layered olfactory chords and balanced ambient sillage.`
    };
  }

  // Combine keywords: words in the name + archetype keywords (unique list)
  const combinedKeywordsSet = new Set<string>();
  for (const w of inputWords) {
    if (w.length > 2 && !['and', 'the', 'with', 'for'].includes(w)) {
      combinedKeywordsSet.add(w);
    }
  }
  for (const k of bestArchetype.defaultKeywords) {
    combinedKeywordsSet.add(k);
  }

  const finalKeywords = Array.from(combinedKeywordsSet).slice(0, 10);
  const finalLight = specificLight || bestArchetype.defaultLight;
  const finalDescription = bestArchetype.descriptionGenerator(cleanName);

  return {
    name: cleanName,
    category: bestArchetype.category,
    keywords: finalKeywords,
    description: finalDescription,
    defaultLight: finalLight,
    chemicalCompound: bestArchetype.defaultCompound,
    status: 'working'
  };
}
