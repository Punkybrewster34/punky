// Reference data for the builder: room types, architectural styles, materials,
// finishes and amenities. Cost figures are 2026 US-average ballparks expressed
// either as a $/sqft adjustment or a flat add-on, and are meant for planning.

import type { QualityTier } from './types';

export interface RoomType {
  id: string;
  label: string;
  icon: string; // emoji used as a lightweight glyph
  color: string; // tailwind-ish hex fill for the floor plan
  defaultW: number;
  defaultH: number;
  minW: number;
  minH: number;
  category: 'living' | 'sleep' | 'bath' | 'work' | 'utility' | 'leisure' | 'outdoor';
}

export const ROOM_TYPES: RoomType[] = [
  { id: 'foyer', label: 'Foyer / Entry', icon: '🚪', color: '#e2e8f0', defaultW: 8, defaultH: 8, minW: 5, minH: 5, category: 'living' },
  { id: 'living', label: 'Living Room', icon: '🛋️', color: '#bfdbfe', defaultW: 18, defaultH: 16, minW: 10, minH: 10, category: 'living' },
  { id: 'family', label: 'Family Room', icon: '📺', color: '#a5b4fc', defaultW: 18, defaultH: 16, minW: 10, minH: 10, category: 'living' },
  { id: 'great', label: 'Great Room', icon: '✨', color: '#c4b5fd', defaultW: 24, defaultH: 20, minW: 14, minH: 12, category: 'living' },
  { id: 'kitchen', label: 'Kitchen', icon: '🍳', color: '#fde68a', defaultW: 16, defaultH: 14, minW: 9, minH: 8, category: 'living' },
  { id: 'pantry', label: 'Walk-in Pantry', icon: '🥫', color: '#fcd34d', defaultW: 7, defaultH: 6, minW: 4, minH: 4, category: 'utility' },
  { id: 'dining', label: 'Dining Room', icon: '🍽️', color: '#fbcfe8', defaultW: 14, defaultH: 12, minW: 9, minH: 8, category: 'living' },
  { id: 'master', label: 'Primary Suite', icon: '🛏️', color: '#bbf7d0', defaultW: 18, defaultH: 16, minW: 12, minH: 11, category: 'sleep' },
  { id: 'bedroom', label: 'Bedroom', icon: '🛌', color: '#86efac', defaultW: 13, defaultH: 12, minW: 9, minH: 9, category: 'sleep' },
  { id: 'nursery', label: 'Nursery', icon: '🧸', color: '#6ee7b7', defaultW: 11, defaultH: 10, minW: 8, minH: 8, category: 'sleep' },
  { id: 'fullbath', label: 'Full Bath', icon: '🛁', color: '#a5f3fc', defaultW: 9, defaultH: 8, minW: 5, minH: 7, category: 'bath' },
  { id: 'ensuite', label: 'Primary Bath', icon: '🚿', color: '#67e8f9', defaultW: 12, defaultH: 10, minW: 7, minH: 7, category: 'bath' },
  { id: 'halfbath', label: 'Powder Room', icon: '🚽', color: '#cffafe', defaultW: 6, defaultH: 5, minW: 4, minH: 4, category: 'bath' },
  { id: 'office', label: 'Home Office', icon: '💻', color: '#fdba74', defaultW: 12, defaultH: 11, minW: 8, minH: 8, category: 'work' },
  { id: 'study', label: 'Study / Library', icon: '📚', color: '#fb923c', defaultW: 13, defaultH: 12, minW: 9, minH: 8, category: 'work' },
  { id: 'laundry', label: 'Laundry Room', icon: '🧺', color: '#ddd6fe', defaultW: 8, defaultH: 7, minW: 5, minH: 5, category: 'utility' },
  { id: 'mudroom', label: 'Mudroom', icon: '🥾', color: '#e9d5ff', defaultW: 9, defaultH: 7, minW: 5, minH: 5, category: 'utility' },
  { id: 'closet', label: 'Walk-in Closet', icon: '👕', color: '#f5d0fe', defaultW: 8, defaultH: 8, minW: 5, minH: 5, category: 'utility' },
  { id: 'garage2', label: '2-Car Garage', icon: '🚗', color: '#cbd5e1', defaultW: 22, defaultH: 22, minW: 20, minH: 20, category: 'utility' },
  { id: 'garage3', label: '3-Car Garage', icon: '🚙', color: '#94a3b8', defaultW: 32, defaultH: 22, minW: 30, minH: 20, category: 'utility' },
  { id: 'gym', label: 'Home Gym', icon: '🏋️', color: '#fecaca', defaultW: 16, defaultH: 14, minW: 10, minH: 10, category: 'leisure' },
  { id: 'theater', label: 'Home Theater', icon: '🎬', color: '#fca5a5', defaultW: 20, defaultH: 16, minW: 12, minH: 11, category: 'leisure' },
  { id: 'game', label: 'Game / Bonus Room', icon: '🎮', color: '#f9a8d4', defaultW: 20, defaultH: 16, minW: 12, minH: 10, category: 'leisure' },
  { id: 'wine', label: 'Wine Cellar', icon: '🍷', color: '#f43f5e', defaultW: 10, defaultH: 9, minW: 6, minH: 6, category: 'leisure' },
  { id: 'sunroom', label: 'Sunroom', icon: '🌞', color: '#fef9c3', defaultW: 14, defaultH: 12, minW: 8, minH: 8, category: 'leisure' },
  { id: 'deck', label: 'Deck / Patio', icon: '🪵', color: '#d9f99d', defaultW: 18, defaultH: 12, minW: 8, minH: 6, category: 'outdoor' },
  { id: 'porch', label: 'Covered Porch', icon: '🏡', color: '#bef264', defaultW: 16, defaultH: 8, minW: 6, minH: 5, category: 'outdoor' },
  { id: 'hall', label: 'Hallway', icon: '↔️', color: '#f1f5f9', defaultW: 12, defaultH: 4, minW: 3, minH: 3, category: 'utility' },
  { id: 'stairs', label: 'Staircase', icon: '🪜', color: '#e5e7eb', defaultW: 6, defaultH: 12, minW: 4, minH: 8, category: 'utility' },
];

export const ROOM_TYPE_MAP: Record<string, RoomType> = Object.fromEntries(
  ROOM_TYPES.map((r) => [r.id, r]),
);

// ---- Quality tier: drives the base build cost per finished square foot. ----
export interface QualityDef {
  id: QualityTier;
  label: string;
  basePerSqFt: number;
  blurb: string;
}

export const QUALITY_TIERS: QualityDef[] = [
  { id: 'standard', label: 'Standard Build', basePerSqFt: 165, blurb: 'Quality production-builder construction with everyday materials.' },
  { id: 'premium', label: 'Premium Build', basePerSqFt: 265, blurb: 'Upgraded structure, better insulation, custom touches throughout.' },
  { id: 'luxury', label: 'Luxury Custom', basePerSqFt: 425, blurb: 'Architect-designed, top-tier materials and bespoke craftsmanship.' },
];

export const QUALITY_MAP: Record<string, QualityDef> = Object.fromEntries(
  QUALITY_TIERS.map((q) => [q.id, q]),
);

// ---- Architectural style: a small cost multiplier on the structure. ----
export interface StyleDef {
  id: string;
  label: string;
  multiplier: number;
  blurb: string;
}

export const STYLES: StyleDef[] = [
  { id: 'farmhouse', label: 'Modern Farmhouse', multiplier: 1.05, blurb: 'Gabled rooflines, board-and-batten, warm and current.' },
  { id: 'contemporary', label: 'Contemporary', multiplier: 1.1, blurb: 'Clean lines, big glass, flat or low-slope roofs.' },
  { id: 'craftsman', label: 'Craftsman', multiplier: 1.06, blurb: 'Tapered columns, exposed rafters, handcrafted detail.' },
  { id: 'midcentury', label: 'Mid-Century Modern', multiplier: 1.08, blurb: 'Flat planes, floor-to-ceiling glass, indoor-outdoor flow.' },
  { id: 'colonial', label: 'Colonial', multiplier: 1.0, blurb: 'Symmetrical, timeless, efficient to frame.' },
  { id: 'mediterranean', label: 'Mediterranean', multiplier: 1.12, blurb: 'Stucco, clay tile, arches and courtyards.' },
  { id: 'ranch', label: 'Ranch', multiplier: 0.95, blurb: 'Single-story, easy living, budget friendly.' },
  { id: 'tudor', label: 'Tudor', multiplier: 1.15, blurb: 'Steep roofs, decorative timber, old-world charm.' },
  { id: 'coastal', label: 'Coastal', multiplier: 1.07, blurb: 'Raised, breezy, built for waterfront living.' },
];

export const STYLE_MAP: Record<string, StyleDef> = Object.fromEntries(
  STYLES.map((s) => [s.id, s]),
);

// ---- Exterior cladding: added $/sqft of finished area. ----
export interface MaterialDef {
  id: string;
  label: string;
  perSqFt: number;
  blurb: string;
}

export const EXTERIORS: MaterialDef[] = [
  { id: 'vinyl', label: 'Vinyl Siding', perSqFt: 6, blurb: 'Affordable and low maintenance.' },
  { id: 'fibercement', label: 'Fiber Cement (Hardie)', perSqFt: 11, blurb: 'Durable, paintable, fire resistant.' },
  { id: 'stucco', label: 'Stucco', perSqFt: 10, blurb: 'Seamless, great for warm climates.' },
  { id: 'brick', label: 'Brick Veneer', perSqFt: 16, blurb: 'Classic, durable, premium curb appeal.' },
  { id: 'stone', label: 'Natural Stone', perSqFt: 28, blurb: 'High-end texture and permanence.' },
  { id: 'cedar', label: 'Cedar / Wood', perSqFt: 18, blurb: 'Warm, natural, needs upkeep.' },
  { id: 'metal', label: 'Metal Panel', perSqFt: 14, blurb: 'Modern, sleek, long lasting.' },
];

export const EXTERIOR_MAP: Record<string, MaterialDef> = Object.fromEntries(
  EXTERIORS.map((m) => [m.id, m]),
);

// ---- Roofing: added $/sqft of building footprint. ----
export const ROOFS: MaterialDef[] = [
  { id: 'asphalt', label: 'Asphalt Shingle', perSqFt: 5, blurb: 'Standard and economical.' },
  { id: 'architectural', label: 'Architectural Shingle', perSqFt: 8, blurb: 'Dimensional, longer warranty.' },
  { id: 'metalroof', label: 'Standing-Seam Metal', perSqFt: 16, blurb: 'Modern, 50+ year lifespan.' },
  { id: 'clay', label: 'Clay / Concrete Tile', perSqFt: 20, blurb: 'Mediterranean look, very durable.' },
  { id: 'slate', label: 'Natural Slate', perSqFt: 32, blurb: 'The premium, century-long roof.' },
];

export const ROOF_MAP: Record<string, MaterialDef> = Object.fromEntries(
  ROOFS.map((m) => [m.id, m]),
);

// ---- Interior finishes: added $/sqft of finished area. ----
export const FLOORING: MaterialDef[] = [
  { id: 'carpet', label: 'Carpet', perSqFt: 4, blurb: 'Soft and economical.' },
  { id: 'laminate', label: 'Laminate', perSqFt: 6, blurb: 'Wood look on a budget.' },
  { id: 'lvp', label: 'Luxury Vinyl Plank', perSqFt: 8, blurb: 'Waterproof and durable.' },
  { id: 'tile', label: 'Porcelain Tile', perSqFt: 12, blurb: 'Great for wet areas.' },
  { id: 'hardwood', label: 'Engineered Hardwood', perSqFt: 14, blurb: 'Warm, timeless, adds value.' },
  { id: 'solidwood', label: 'Solid Hardwood', perSqFt: 20, blurb: 'Premium, refinishable for decades.' },
];

export const COUNTERTOPS: MaterialDef[] = [
  { id: 'laminate', label: 'Laminate', perSqFt: 2, blurb: 'Budget friendly.' },
  { id: 'butcher', label: 'Butcher Block', perSqFt: 4, blurb: 'Warm, natural wood.' },
  { id: 'granite', label: 'Granite', perSqFt: 7, blurb: 'Natural stone, durable.' },
  { id: 'quartz', label: 'Quartz', perSqFt: 9, blurb: 'Engineered, low maintenance.' },
  { id: 'quartzite', label: 'Quartzite', perSqFt: 12, blurb: 'Natural stone, marble look, tough.' },
  { id: 'marble', label: 'Marble', perSqFt: 16, blurb: 'Luxury statement surface.' },
];

export const CABINETS: MaterialDef[] = [
  { id: 'stock', label: 'Stock Cabinets', perSqFt: 3, blurb: 'Pre-made, ready to install.' },
  { id: 'semi', label: 'Semi-Custom', perSqFt: 6, blurb: 'More sizes and finishes.' },
  { id: 'custom', label: 'Fully Custom', perSqFt: 11, blurb: 'Built to your exact spec.' },
];

export const FINISH_MAPS = {
  flooring: Object.fromEntries(FLOORING.map((m) => [m.id, m])) as Record<string, MaterialDef>,
  countertop: Object.fromEntries(COUNTERTOPS.map((m) => [m.id, m])) as Record<string, MaterialDef>,
  cabinets: Object.fromEntries(CABINETS.map((m) => [m.id, m])) as Record<string, MaterialDef>,
};

// ---- Amenities / features: flat add-on costs. ----
export interface FeatureDef {
  id: string;
  label: string;
  icon: string;
  cost: number;
  category: 'outdoor' | 'comfort' | 'tech' | 'sustainability' | 'structure';
  blurb: string;
}

export const FEATURES: FeatureDef[] = [
  { id: 'pool', label: 'In-Ground Pool', icon: '🏊', cost: 65000, category: 'outdoor', blurb: 'Gunite pool with decking.' },
  { id: 'spa', label: 'Hot Tub / Spa', icon: '🛀', cost: 12000, category: 'outdoor', blurb: 'Built-in spillover spa.' },
  { id: 'outdoorkitchen', label: 'Outdoor Kitchen', icon: '🍔', cost: 22000, category: 'outdoor', blurb: 'Grill, counter, sink.' },
  { id: 'firepit', label: 'Fire Pit / Feature', icon: '🔥', cost: 6000, category: 'outdoor', blurb: 'Gas fire pit + seating.' },
  { id: 'landscape', label: 'Premium Landscaping', icon: '🌳', cost: 28000, category: 'outdoor', blurb: 'Full design, irrigation, planting.' },
  { id: 'fence', label: 'Fencing', icon: '🚧', cost: 9000, category: 'outdoor', blurb: 'Privacy fence around the lot.' },
  { id: 'fireplace', label: 'Indoor Fireplace', icon: '🔥', cost: 8000, category: 'comfort', blurb: 'Gas fireplace with surround.' },
  { id: 'heatedfloors', label: 'Radiant Heated Floors', icon: '♨️', cost: 16000, category: 'comfort', blurb: 'In-floor heat in key rooms.' },
  { id: 'vaulted', label: 'Vaulted Ceilings', icon: '⛰️', cost: 14000, category: 'comfort', blurb: 'Dramatic open volume.' },
  { id: 'elevator', label: 'Residential Elevator', icon: '🛗', cost: 45000, category: 'comfort', blurb: 'Multi-floor accessibility.' },
  { id: 'basement', label: 'Finished Basement', icon: '🏚️', cost: 55000, category: 'structure', blurb: 'Full-height finished lower level.' },
  { id: 'centralvac', label: 'Central Vacuum', icon: '🌀', cost: 4000, category: 'comfort', blurb: 'Whole-home vacuum system.' },
  { id: 'smarthome', label: 'Smart Home System', icon: '📱', cost: 18000, category: 'tech', blurb: 'Lighting, locks, climate, audio.' },
  { id: 'security', label: 'Security & Cameras', icon: '🎥', cost: 7500, category: 'tech', blurb: 'Monitored alarm and cameras.' },
  { id: 'theaterav', label: 'Theater A/V Package', icon: '🔊', cost: 25000, category: 'tech', blurb: 'Projector, screen, surround.' },
  { id: 'evcharger', label: 'EV Charger', icon: '🔌', cost: 2500, category: 'tech', blurb: 'Level-2 garage charging.' },
  { id: 'solar', label: 'Solar Panel Array', icon: '☀️', cost: 26000, category: 'sustainability', blurb: 'Rooftop solar generation.' },
  { id: 'battery', label: 'Home Battery Backup', icon: '🔋', cost: 14000, category: 'sustainability', blurb: 'Whole-home storage backup.' },
  { id: 'generator', label: 'Standby Generator', icon: '⚡', cost: 11000, category: 'sustainability', blurb: 'Automatic natural-gas backup.' },
  { id: 'geothermal', label: 'Geothermal HVAC', icon: '🌡️', cost: 30000, category: 'sustainability', blurb: 'High-efficiency ground-source heating/cooling.' },
  { id: 'rainwater', label: 'Rainwater Harvesting', icon: '🌧️', cost: 9000, category: 'sustainability', blurb: 'Capture and reuse system.' },
  { id: 'tankless', label: 'Tankless Water Heaters', icon: '🚰', cost: 5000, category: 'sustainability', blurb: 'Endless, efficient hot water.' },
];

export const FEATURE_MAP: Record<string, FeatureDef> = Object.fromEntries(
  FEATURES.map((f) => [f.id, f]),
);

// Limits applied to the free tier; Pro removes them.
export const FREE_LIMITS = {
  maxRooms: 8,
  maxStories: 1,
  maxProjects: 1,
  lockedTiers: ['luxury'] as QualityTier[],
  canExport: false,
};
