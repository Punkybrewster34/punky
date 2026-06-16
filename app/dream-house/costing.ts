// Turns a Project into a fully itemized cost estimate. Pure functions only so
// the result is easy to memoize and test.

import type { CostBreakdown, CostLineItem, Project } from './types';
import {
  EXTERIOR_MAP,
  FEATURE_MAP,
  FINISH_MAPS,
  QUALITY_MAP,
  ROOF_MAP,
  ROOM_TYPE_MAP,
  STYLE_MAP,
} from './catalog';

export function roomArea(w: number, h: number): number {
  return Math.max(0, Math.round(w * h));
}

// Outdoor rooms (deck, porch, patio) are counted separately from conditioned
// living area because they cost far less per square foot to build.
const OUTDOOR_CATEGORIES = new Set(['outdoor']);
const OUTDOOR_PER_SQFT = 35;

export function computeCost(project: Project): CostBreakdown {
  const lineItems: CostLineItem[] = [];

  let livingSqFt = 0;
  let outdoorSqFt = 0;
  const footprintByFloor: Record<number, number> = {};

  for (const room of project.rooms) {
    const area = roomArea(room.w, room.h);
    const type = ROOM_TYPE_MAP[room.type];
    if (type && OUTDOOR_CATEGORIES.has(type.category)) {
      outdoorSqFt += area;
    } else {
      livingSqFt += area;
    }
    footprintByFloor[room.floor] = (footprintByFloor[room.floor] || 0) + area;
  }

  const footprintSqFt = footprintByFloor[0] || livingSqFt; // ground floor drives roof size
  const totalSqFt = livingSqFt;

  const quality = QUALITY_MAP[project.qualityTier];
  const style = STYLE_MAP[project.style];
  const styleMult = style ? style.multiplier : 1;

  // --- Structure: base build cost scaled by quality and style. ---
  const baseBuild = totalSqFt * (quality ? quality.basePerSqFt : 165) * styleMult;
  if (baseBuild > 0) {
    lineItems.push({
      group: 'structure',
      label: `${quality?.label ?? 'Build'} — shell & systems`,
      detail: `${totalSqFt.toLocaleString()} sqft × $${quality?.basePerSqFt}/sqft × ${styleMult.toFixed(2)} (${style?.label ?? 'style'})`,
      amount: baseBuild,
    });
  }

  if (outdoorSqFt > 0) {
    lineItems.push({
      group: 'structure',
      label: 'Outdoor living (decks, porches, patios)',
      detail: `${outdoorSqFt.toLocaleString()} sqft × $${OUTDOOR_PER_SQFT}/sqft`,
      amount: outdoorSqFt * OUTDOOR_PER_SQFT,
    });
  }

  // --- Exterior cladding over the full finished area. ---
  const exterior = EXTERIOR_MAP[project.exterior];
  if (exterior && totalSqFt > 0) {
    lineItems.push({
      group: 'structure',
      label: `Exterior — ${exterior.label}`,
      detail: `${totalSqFt.toLocaleString()} sqft × $${exterior.perSqFt}/sqft`,
      amount: totalSqFt * exterior.perSqFt,
    });
  }

  // --- Roof sized to the ground-floor footprint. ---
  const roof = ROOF_MAP[project.roof];
  if (roof && footprintSqFt > 0) {
    lineItems.push({
      group: 'structure',
      label: `Roofing — ${roof.label}`,
      detail: `${footprintSqFt.toLocaleString()} sqft footprint × $${roof.perSqFt}/sqft`,
      amount: footprintSqFt * roof.perSqFt,
    });
  }

  // --- Interior finishes per finished sqft. ---
  const finishDefs = [
    { def: FINISH_MAPS.flooring[project.finishes.flooring], label: 'Flooring' },
    { def: FINISH_MAPS.countertop[project.finishes.countertop], label: 'Countertops' },
    { def: FINISH_MAPS.cabinets[project.finishes.cabinets], label: 'Cabinetry' },
  ];
  for (const { def, label } of finishDefs) {
    if (def && totalSqFt > 0) {
      lineItems.push({
        group: 'finishes',
        label: `${label} — ${def.label}`,
        detail: `${totalSqFt.toLocaleString()} sqft × $${def.perSqFt}/sqft`,
        amount: totalSqFt * def.perSqFt,
      });
    }
  }

  // --- Amenities. ---
  for (const id of project.features) {
    const f = FEATURE_MAP[id];
    if (f) {
      lineItems.push({
        group: 'amenities',
        label: f.label,
        detail: f.blurb,
        amount: f.cost,
      });
    }
  }

  const hardCosts = lineItems.reduce((sum, li) => sum + li.amount, 0);

  // --- Soft costs: design, permits, engineering, site work. ~14% of hard. ---
  const softRate = 0.14;
  const softCosts = hardCosts * softRate;
  if (softCosts > 0) {
    lineItems.push({
      group: 'soft',
      label: 'Design, permits, engineering & site work',
      detail: `≈ ${Math.round(softRate * 100)}% of construction`,
      amount: softCosts,
    });
  }

  const contingencyPct = project.contingencyPct ?? 10;
  const contingency = (hardCosts + softCosts) * (contingencyPct / 100);

  const grandTotal = hardCosts + softCosts + contingency;
  const costPerSqFt = totalSqFt > 0 ? grandTotal / totalSqFt : 0;

  return {
    totalSqFt,
    footprintSqFt,
    lineItems,
    hardCosts,
    softCosts,
    contingency,
    grandTotal,
    costPerSqFt,
  };
}

export function formatCurrency(n: number, compact = false): string {
  if (compact && Math.abs(n) >= 1000) {
    return `$${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k`;
  }
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}
