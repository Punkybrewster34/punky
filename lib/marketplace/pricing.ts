import { SERVICES, ADD_ONS } from './constants';

// Transparent price estimate so both sides see the same number before a
// job is accepted. Hours scale with home size + service intensity; price
// is hours x provider rate, plus flat add-on surcharges, plus platform fee.

export const PLATFORM_FEE_RATE = 0.12; // 12% marketplace fee shown to customer

export interface EstimateInput {
  hourlyRate: number;
  serviceType: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  addOns: string[];
}

export interface Estimate {
  hours: number;
  labor: number;
  addOnTotal: number;
  platformFee: number;
  total: number;
}

export function estimateJob(input: EstimateInput): Estimate {
  const service = SERVICES.find((s) => s.key === input.serviceType) ?? SERVICES[0];

  // Base hours from size signals.
  let hours = 1.5;
  hours += Math.max(0, input.bedrooms) * 0.5;
  hours += Math.max(0, input.bathrooms) * 0.6;
  if (input.squareFeet > 0) hours += input.squareFeet / 1000;
  hours *= service.baseMultiplier;
  hours = Math.max(1, Math.round(hours * 2) / 2); // round to nearest half hour

  const rate = Math.max(0, input.hourlyRate || 0);
  const labor = hours * rate;

  const addOnTotal = input.addOns.reduce((sum, key) => {
    const def = ADD_ONS.find((a) => a.key === key);
    return sum + (def?.price ?? 0);
  }, 0);

  const subtotal = labor + addOnTotal;
  const platformFee = Math.round(subtotal * PLATFORM_FEE_RATE * 100) / 100;
  const total = Math.round((subtotal + platformFee) * 100) / 100;

  return {
    hours,
    labor: Math.round(labor * 100) / 100,
    addOnTotal: Math.round(addOnTotal * 100) / 100,
    platformFee,
    total,
  };
}
