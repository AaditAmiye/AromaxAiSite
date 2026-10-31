import { VideoDemo } from '../types/video';

export const VIDEO_DEMOS: VideoDemo[] = [
  {
    id: 'demo-sensory-odyssey',
    title: 'Smell the Story: Sensory Odyssey',
    subtitle: 'Mitti • Biryani • Sandalwood • Kesar • Coffee',
    durationSeconds: 137, // 2m 17s
    thumbnailUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1600&q=80',
    videoUrl: '/IMG_9031.MP4',
    tags: ['Mastered Score', 'Spatial Audio', 'Olfactory Sync'],
    description: 'An evocative olfactory narrative: baked clay mitti, fragrant dum biryani, temple sanctums, royal perfumes, and fresh roasted espresso.',
    events: [
      {
        id: 'event-so-1',
        timeSeconds: 0,
        durationSeconds: 15,
        title: 'Mitti (Petrichor)',
        channels: ['H19'],
        light: { r: 180, g: 83, b: 9 },
        note: 'First raindrops striking baked summer earth (Geosmin)',
        channelDetails: [
          { channelId: 'H19', intensity: 0.85, reason: 'Mitti earthy rain petrichor' }
        ]
      },
      {
        id: 'event-so-2',
        timeSeconds: 15,
        durationSeconds: 25,
        title: 'Biryani (Dum & Tadka)',
        channels: ['H10'],
        light: { r: 245, g: 155, b: 25 },
        note: 'Hot fragrant dum biryani cooked with aged basmati rice & aromatic spice tadka',
        channelDetails: [
          { channelId: 'H10', intensity: 0.85, reason: 'Dum cooked basmati rice & spice tadka' }
        ]
      },
      {
        id: 'event-so-3',
        timeSeconds: 40,
        durationSeconds: 20,
        title: 'Burning Wood + Sandalwood',
        channels: ['H28', 'H18'],
        light: { r: 235, g: 120, b: 20 },
        note: 'Glowing hearth embers layered with pure Mysore sandalwood',
        channelDetails: [
          { channelId: 'H28', intensity: 0.50, reason: 'Woodfire hearth embers' },
          { channelId: 'H18', intensity: 0.80, reason: 'Pure Mysore aged sandalwood' }
        ]
      },
      {
        id: 'event-so-4',
        timeSeconds: 60,
        durationSeconds: 15,
        title: 'Bitter Botanical + Citrus Bitter',
        channels: ['H20', 'H15'],
        light: { r: 220, g: 205, b: 35 },
        note: 'Grounding herbal bitters accented with crisp bergamot citrus peel',
        channelDetails: [
          { channelId: 'H20', intensity: 0.45, reason: 'Botanical herbal bitterness' },
          { channelId: 'H15', intensity: 0.75, reason: 'Sparkling bitter citrus peel' }
        ]
      },
      {
        id: 'event-so-5',
        timeSeconds: 75,
        durationSeconds: 10,
        title: 'Soil (Damp Loam)',
        channels: ['H19'],
        light: { r: 160, g: 80, b: 20 },
        note: 'Rich damp humus and deep nutrient-rich garden soil',
        channelDetails: [
          { channelId: 'H19', intensity: 0.85, reason: 'Deep loamy soil' }
        ]
      },
      {
        id: 'event-so-6',
        timeSeconds: 85,
        durationSeconds: 15,
        title: 'Puja + Kesar',
        channels: ['H33', 'H34'],
        light: { r: 255, g: 153, b: 20 },
        note: 'Temple dhoop, sambrani smoke, and Kashmiri Mogra saffron offering',
        channelDetails: [
          { channelId: 'H33', intensity: 0.75, reason: 'Temple resin incense dhoop' },
          { channelId: 'H34', intensity: 0.65, reason: 'Kashmiri saffron stigmata' }
        ]
      },
      {
        id: 'event-so-7',
        timeSeconds: 100,
        durationSeconds: 10,
        title: 'Royal Perfume',
        channels: ['H06'],
        light: { r: 218, g: 165, b: 32 },
        note: 'Opulent royal velvet ambergris, golden musk, and fine perfumery',
        channelDetails: [
          { channelId: 'H06', intensity: 0.85, reason: 'Sophisticated royal perfume' }
        ]
      },
      {
        id: 'event-so-8',
        timeSeconds: 110,
        durationSeconds: 10,
        title: 'Pizza (Stone-Oven Crust)',
        channels: ['H04'],
        light: { r: 235, g: 120, b: 40 },
        note: 'Freshly baked stone-oven sourdough crust and savory Italian herbs',
        channelDetails: [
          { channelId: 'H04', intensity: 0.90, reason: 'Savory baked crust & oregano note' }
        ]
      },
      {
        id: 'event-so-9',
        timeSeconds: 120,
        durationSeconds: 17,
        title: 'Coffee (Dark Roast Espresso)',
        channels: ['H24'],
        light: { r: 139, g: 69, b: 19 },
        note: 'Freshly extracted dark roast espresso crema with roasted cacao nuance',
        channelDetails: [
          { channelId: 'H24', intensity: 0.90, reason: 'Dark roasted espresso beans' }
        ]
      }
    ]
  },
  {
    id: 'demo-redwoods',
    title: 'The Ancient Redwoods',
    subtitle: 'Cedar • Wet Fern • Damp Bark',
    durationSeconds: 240, // 4m 00s
    thumbnailUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCKerJrsZnmXPtp4wzYw1ABJ2QFXwtpjX8siT7NK6zKt3OK4CeP27FfcC4P7KFVYGwwJbY6ccIxDLHFP-lzNSof3hCGXz0AiQHGCJoIvA3RGmOeR88lh51mRAguY1lde-g70BndZQoLwvj8TmaVByMYg7uy81014iwjYQu6-FgsIvyCuLBtzqtzr_b_FCqrVzDNwYG0d6pcpcHFm-51f1Ku8dKIuHhZ-SXUibGX0n5JIw3mdiJzO171',
    tags: ['4K HDR', 'Spatial Audio', 'Olfactory Sync'],
    description: 'An immersive journey through northern California mist, damp moss understory, and towering ancient sequoias.',
    events: [
      {
        id: 'event-rw-1',
        timeSeconds: 0,
        title: 'Morning Canopy Rain',
        channels: ['H19'],
        durationSeconds: 12,
        light: { r: 52, g: 199, b: 89 },
        note: 'Damp loamy earth and petrichor dripping through branches',
        channelDetails: [
          { channelId: 'H19', intensity: 0.8, reason: 'Rain on redwood forest floor' }
        ]
      },
      {
        id: 'event-rw-2',
        timeSeconds: 47,
        title: 'Deep Forest Moss',
        channels: ['H18', 'H25'],
        durationSeconds: 18,
        light: { r: 60, g: 180, b: 90 },
        note: 'Damp moss, cold mountain air and ancient cedar bark',
        channelDetails: [
          { channelId: 'H18', intensity: 0.65, reason: 'Sandalwood heartwood understory' },
          { channelId: 'H25', intensity: 0.35, reason: 'Cool breeze through needle canopy' }
        ]
      },
      {
        id: 'event-rw-3',
        timeSeconds: 92,
        title: 'Campfire & Embers',
        channels: ['H28'],
        durationSeconds: 15,
        light: { r: 255, g: 107, b: 0 },
        note: 'Campers light a small birch hearth at twilight',
        channelDetails: [
          { channelId: 'H28', intensity: 0.9, reason: 'Dry crackling birch wood smoke' }
        ]
      },
      {
        id: 'event-rw-4',
        timeSeconds: 135,
        title: 'Morning Mist & Cedar',
        channels: ['H18', 'H08'],
        durationSeconds: 16,
        light: { r: 245, g: 190, b: 80 },
        note: 'Sunlight breaks through redwood foliage, warming resinous bark',
        channelDetails: [
          { channelId: 'H18', intensity: 0.7, reason: 'Sun-warmed timber aroma' },
          { channelId: 'H08', intensity: 0.3, reason: 'Natural sweet sap resin' }
        ]
      },
      {
        id: 'event-rw-5',
        timeSeconds: 195,
        title: 'Glacial Stream Basin',
        channels: ['H31', 'H25'],
        durationSeconds: 14,
        light: { r: 0, g: 113, b: 227 },
        note: 'Pure alpine stream passing over tumbled river stones',
        channelDetails: [
          { channelId: 'H31', intensity: 0.7, reason: 'Pure water vapor carrier' },
          { channelId: 'H25', intensity: 0.3, reason: 'Glacial chill crisp air' }
        ]
      }
    ]
  },
  {
    id: 'demo-delhi',
    title: 'Spices of Old Delhi',
    subtitle: 'Cardamom • Cumin • Smoked Tea',
    durationSeconds: 180, // 3m 00s
    thumbnailUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDAprWxDB49Rj0NT8MQMkiFOhFdK4vCGQhyDWzwvkiJQZS_pqm3upiGBJOr2sUc6qC8-eRcAETtqXATAfxKaQmIHYiw4ee9Lcz0Z4xyZCyQhvvvtHymvsCGNJSB0QuaDmc5-gnTbuVCrGQqW66Q8WDfkihtXzOPiOpJa9RajYEidoisitsO-NDFFEUdQUJJsX40l_TaH1zEj4Ji1oRXUfPy8afXNoK7N8yVETLoFIHGQsUr4NtJPDVS',
    tags: ['4K HDR', 'Cultural Narrative', 'Mastered Score'],
    description: 'Walking through Khari Baoli, Asia’s largest spice market, winding alleys, chai stalls, and ancient stone havelis.',
    events: [
      {
        id: 'event-dh-1',
        timeSeconds: 10,
        title: 'Dawn Chai Walla',
        channels: ['H09'],
        durationSeconds: 14,
        light: { r: 210, g: 140, b: 65 },
        note: 'Fresh ginger and cracked cardamom steeped in whole milk',
        channelDetails: [
          { channelId: 'H09', intensity: 0.85, reason: 'Steaming masala chai' }
        ]
      },
      {
        id: 'event-dh-2',
        timeSeconds: 45,
        title: 'The Spice Portico',
        channels: ['H29', 'H11'],
        durationSeconds: 18,
        light: { r: 180, g: 110, b: 40 },
        note: 'Sacks of green cardamom and dark Zanzibar cloves unloaded in sun',
        channelDetails: [
          { channelId: 'H29', intensity: 0.55, reason: 'Crushed green cardamom' },
          { channelId: 'H11', intensity: 0.45, reason: 'Aromatic clove bud' }
        ]
      },
      {
        id: 'event-dh-3',
        timeSeconds: 105,
        title: 'Nizami Biryani Handi',
        channels: ['H10', 'H21'],
        durationSeconds: 16,
        light: { r: 240, g: 130, b: 20 },
        note: 'Dough seal cracked on dum biryani with hot garlic tadka',
        channelDetails: [
          { channelId: 'H10', intensity: 0.65, reason: 'Dum cooked basmati rice' },
          { channelId: 'H21', intensity: 0.35, reason: 'Garlic and mustard oil sizzle' }
        ]
      },
      {
        id: 'event-dh-4',
        timeSeconds: 150,
        title: 'Evening Sanctum Aarti',
        channels: ['H33', 'H34'],
        durationSeconds: 18,
        light: { r: 245, g: 158, b: 11 },
        note: 'Dhoop and saffron water offered as night lanterns kindle',
        channelDetails: [
          { channelId: 'H33', intensity: 0.70, reason: 'Temple resin incense' },
          { channelId: 'H34', intensity: 0.30, reason: 'Kashmiri saffron offering' }
        ]
      }
    ]
  },
  {
    id: 'demo-tokyo',
    title: 'Rain in Tokyo',
    subtitle: 'Petrichor • Wet Neon • Asphalt',
    durationSeconds: 300, // 5m 00s
    thumbnailUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBEf6bssZchav0oFYReXc7E95RqQFwyEoAQuQgSCE1uyZ58Ur7rLIpCzXoVxhGVimjJoJKRnyyjleDrpUi5vBfVm3tzD0qhOXQtrB7JHdwYI2Nr_Sr4p4lHh4ms0mxo759DLefCxTwOpZjmnsbRprAwWbT8eG6ux1_bcyKd8oRJN8x95sYPpk2HrILplNKh6d0hB3rmROYb3KGSAIwt-dqqdowkYnjnNvgII_IKvucPF-_mjRQmsH5E',
    tags: ['4K HDR', 'Cinematic', 'Ambient Sync'],
    description: 'A neon-lit walk through Shibuya as a sudden spring downpour cools the asphalt.',
    events: [
      {
        id: 'event-tk-1',
        timeSeconds: 15,
        title: 'Sudden Downpour on Concrete',
        channels: ['H19'],
        durationSeconds: 14,
        light: { r: 0, g: 113, b: 227 },
        note: 'First heavy raindrops striking warm urban pavement',
        channelDetails: [
          { channelId: 'H19', intensity: 0.75, reason: 'Petrichor geosmin on stone' }
        ]
      },
      {
        id: 'event-tk-2',
        timeSeconds: 85,
        title: 'Subway Kissaten Espresso',
        channels: ['H24', 'H08'],
        durationSeconds: 18,
        light: { r: 180, g: 100, b: 40 },
        note: 'Stepping into a subterranean wood-paneled coffee sanctuary',
        channelDetails: [
          { channelId: 'H24', intensity: 0.75, reason: 'Dark drip coffee beans' },
          { channelId: 'H08', intensity: 0.25, reason: 'Sweet vanilla syrup note' }
        ]
      },
      {
        id: 'event-tk-3',
        timeSeconds: 170,
        title: 'Shinto Shrine Cedar Grove',
        channels: ['H18'],
        durationSeconds: 16,
        light: { r: 52, g: 199, b: 89 },
        note: 'Quiet shrine courtyard surrounded by drenched cedar trunks',
        channelDetails: [
          { channelId: 'H18', intensity: 0.90, reason: 'Pure damp sandalwood and cedar' }
        ]
      },
      {
        id: 'event-tk-4',
        timeSeconds: 240,
        title: 'Night Air Clearing',
        channels: ['H25', 'H31'],
        durationSeconds: 15,
        light: { r: 0, g: 199, b: 190 },
        note: 'The clouds part leaving crisp, chilled night breezes',
        channelDetails: [
          { channelId: 'H25', intensity: 0.40, reason: 'Crisp cold air' },
          { channelId: 'H31', intensity: 0.60, reason: 'Pure rain carrier' }
        ]
      }
    ]
  }
];
