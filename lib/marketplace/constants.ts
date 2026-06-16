// Catalog of services, checklist tasks, and add-ons offered on the platform.

export interface ServiceDef {
  key: string;
  label: string;
  description: string;
  baseMultiplier: number; // applied to base hours estimate
}

export const SERVICES: ServiceDef[] = [
  {
    key: 'standard',
    label: 'Standard Cleaning',
    description: 'Routine tidy-up: dusting, vacuuming, mopping, surfaces, trash.',
    baseMultiplier: 1,
  },
  {
    key: 'deep',
    label: 'Deep Cleaning',
    description: 'Top-to-bottom scrub including baseboards, grout, and build-up.',
    baseMultiplier: 1.6,
  },
  {
    key: 'move',
    label: 'Move In / Move Out',
    description: 'Empty-home detailing for moving day, inside cabinets & appliances.',
    baseMultiplier: 1.8,
  },
  {
    key: 'recurring',
    label: 'Recurring Maintenance',
    description: 'Ongoing weekly/bi-weekly upkeep at a preferred rate.',
    baseMultiplier: 0.9,
  },
  {
    key: 'office',
    label: 'Office / Commercial',
    description: 'Workspaces, common areas, and restrooms after hours.',
    baseMultiplier: 1.2,
  },
];

// Standard checklist a customer can tick off per room/area.
export const CHECKLIST_TASKS: { key: string; label: string }[] = [
  { key: 'dusting', label: 'Dust all surfaces' },
  { key: 'vacuum', label: 'Vacuum carpets & rugs' },
  { key: 'mop', label: 'Mop hard floors' },
  { key: 'kitchen_counters', label: 'Clean kitchen counters' },
  { key: 'dishes', label: 'Wash dishes / load dishwasher' },
  { key: 'stovetop', label: 'Scrub stovetop & range' },
  { key: 'bathroom_scrub', label: 'Scrub & sanitize bathrooms' },
  { key: 'toilets', label: 'Clean & disinfect toilets' },
  { key: 'mirrors', label: 'Clean mirrors & glass' },
  { key: 'beds', label: 'Make beds / change linens' },
  { key: 'trash', label: 'Empty trash & replace liners' },
  { key: 'baseboards', label: 'Wipe baseboards' },
  { key: 'windows_interior', label: 'Interior windows' },
  { key: 'cabinets', label: 'Wipe cabinet exteriors' },
  { key: 'appliances', label: 'Exterior of appliances' },
];

// Paid add-ons with a flat surcharge each.
export const ADD_ONS: { key: string; label: string; price: number }[] = [
  { key: 'inside_fridge', label: 'Inside the fridge', price: 30 },
  { key: 'inside_oven', label: 'Inside the oven', price: 30 },
  { key: 'inside_cabinets', label: 'Inside cabinets', price: 35 },
  { key: 'laundry', label: 'Laundry (wash & fold)', price: 25 },
  { key: 'interior_windows', label: 'All interior windows', price: 40 },
  { key: 'garage', label: 'Garage sweep-out', price: 35 },
  { key: 'pet_hair', label: 'Heavy pet hair removal', price: 25 },
  { key: 'green_products', label: 'Eco-friendly products only', price: 15 },
];

export const PROPERTY_TYPES = ['apartment', 'house', 'condo', 'townhouse', 'office'];
export const TIME_WINDOWS = ['morning', 'afternoon', 'evening'];
export const RECURRING_OPTIONS = ['none', 'weekly', 'biweekly', 'monthly'];

export function serviceLabel(key: string): string {
  return SERVICES.find((s) => s.key === key)?.label ?? key;
}
export function taskLabel(key: string): string {
  return CHECKLIST_TASKS.find((t) => t.key === key)?.label ?? key;
}
export function addOnDef(key: string) {
  return ADD_ONS.find((a) => a.key === key);
}
