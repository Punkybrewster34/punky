// Domain model for the Dream House Builder.
// 1 grid unit === 1 foot. All geometry is stored in feet.

export type QualityTier = 'standard' | 'premium' | 'luxury';

export interface Room {
  id: string;
  type: string; // references RoomType.id in the catalog
  name: string;
  floor: number; // 0-based story index
  x: number; // feet from left of the lot canvas
  y: number; // feet from top of the lot canvas
  w: number; // width in feet
  h: number; // height (depth) in feet
}

export interface Finishes {
  flooring: string; // catalog id
  countertop: string;
  cabinets: string;
}

export interface Project {
  id: string;
  name: string;
  location: string;
  lotWidth: number; // feet
  lotDepth: number; // feet
  stories: number;
  budget: number;
  qualityTier: QualityTier;
  style: string; // architectural style id
  exterior: string; // exterior material id
  roof: string; // roofing id
  finishes: Finishes;
  features: string[]; // selected feature ids
  contingencyPct: number;
  rooms: Room[];
  notes: string;
  createdAt: number;
  updatedAt: number;
}

export interface AppState {
  projects: Project[];
  activeProjectId: string | null;
  isPro: boolean;
}

export interface CostLineItem {
  label: string;
  detail?: string;
  amount: number;
  group: 'structure' | 'finishes' | 'amenities' | 'soft';
}

export interface CostBreakdown {
  totalSqFt: number;
  footprintSqFt: number;
  lineItems: CostLineItem[];
  hardCosts: number;
  softCosts: number;
  contingency: number;
  grandTotal: number;
  costPerSqFt: number;
}
