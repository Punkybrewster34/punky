// In-browser data layer for the HavenClean static preview.
// Self-contained domain model persisted to localStorage so the whole
// marketplace runs with no backend. Reuses only the pure shared modules
// (constants/pricing/geo). Money is in whole-dollar numbers.

import { estimateJob, PLATFORM_FEE_RATE } from '../lib/marketplace/pricing';
import { haversineMiles } from '../lib/marketplace/geo';

export { PLATFORM_FEE_RATE };

const KEY = 'havenclean_preview_v2';

function uid(): string {
  return (crypto.randomUUID && crypto.randomUUID()) || Math.random().toString(36).slice(2);
}
const now = () => new Date().toISOString();
const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000).toISOString();
const inDays = (d: number) => {
  const x = new Date();
  x.setDate(x.getDate() + d);
  return x.toISOString().split('T')[0];
};

// ---------- Catalog extras ----------
export const DAYS = [
  { key: 'sun', label: 'Sun' }, { key: 'mon', label: 'Mon' }, { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' }, { key: 'thu', label: 'Thu' }, { key: 'fri', label: 'Fri' }, { key: 'sat', label: 'Sat' },
];
export const WINDOWS = [
  { key: 'morning', label: 'Morning', time: '8a–12p' },
  { key: 'afternoon', label: 'Afternoon', time: '12p–4p' },
  { key: 'evening', label: 'Evening', time: '4p–8p' },
];
export const LANGUAGES = ['English', 'Spanish', 'Portuguese', 'Mandarin', 'Vietnamese', 'French'];

export const REVIEW_TAGS = [
  'On time', 'Great communication', 'Spotless results', 'Friendly', 'Trustworthy',
  'Great with pets', 'Detail-oriented', 'Went above & beyond', 'Eco-friendly', 'Fast',
];

export const PROMO_CODES: Record<string, { type: 'percent' | 'flat'; value: number; label: string }> = {
  SPARKLE20: { type: 'percent', value: 20, label: '20% off your clean' },
  WELCOME15: { type: 'flat', value: 15, label: '$15 off' },
  FRESHSTART: { type: 'flat', value: 25, label: '$25 off first clean' },
};

// Recurring plan discounts (applied to labor + add-ons).
export const RECURRING_DISCOUNT: Record<string, number> = { none: 0, weekly: 0.15, biweekly: 0.1, monthly: 0.05 };
export const MEMBERSHIP_DISCOUNT = 0.1; // HavenClean+ extra 10% off
export const MEMBERSHIP_PRICE = 19; // $/mo

// ---------- Types ----------
export type Role = 'customer' | 'provider';
export type PJobStatus =
  | 'requested' | 'accepted' | 'on_the_way' | 'arrived' | 'in_progress' | 'completed' | 'declined' | 'cancelled';

export interface Notification { id: string; userId: string; text: string; at: string; read: boolean; href?: string }
export interface Txn { id: string; at: string; label: string; amount: number } // wallet ledger (+credit / -spend)

export interface PUser {
  id: string; email: string; role: Role; name: string; phone: string; avatarUrl: string;
  createdAt: string; lat: number | null; lng: number | null; address: string;
  favorites: string[]; wallet: number; ledger: Txn[]; referralCode: string;
  membership: 'none' | 'plus'; membershipSince: string | null; promoRedeemed: string[];
}

export interface Availability { [dayKey: string]: string[] } // day -> window keys

export interface PProfile {
  userId: string; headline: string; bio: string; hourlyRate: number; yearsExperience: number;
  teamSize: number; isTeam: boolean; services: string[]; serviceRadiusMiles: number;
  lat: number | null; lng: number | null; city: string; state: string; zip: string;
  photos: string[]; languages: string[]; availability: Availability;
  instantBook: boolean; insured: boolean; idVerified: boolean; suppliesIncluded: boolean;
  acceptingJobs: boolean; responseMins: number; cancellationPolicy: 'flexible' | 'moderate' | 'strict';
  backgroundCheck: { status: 'not_submitted' | 'pending' | 'approved' | 'rejected'; submittedAt: string | null; decidedAt: string | null; reference: string | null; note: string };
  isVerified: boolean; createdAt: string; updatedAt: string;
}

export interface SubRatings { quality: number; punctuality: number; communication: number; value: number }
export interface PReview {
  id: string; jobId: string; customerId: string; customerName: string; providerId: string;
  rating: number; sub: SubRatings; tags: string[]; comment: string; createdAt: string;
  reply: { text: string; at: string } | null; photos: string[];
}

export interface ChatMsg { id: string; fromId: string; fromRole: Role; text: string; at: string; read: boolean }
export interface TimelineEvent { status: PJobStatus; at: string }
export interface Quote {
  hours: number; labor: number; addOnTotal: number; discountLabel: string; discount: number;
  creditApplied: number; platformFee: number; total: number; providerPayout: number;
}
export interface PJob {
  id: string; customerId: string; providerId: string; status: PJobStatus;
  address: string; lat: number | null; lng: number | null; propertyType: string;
  bedrooms: number; bathrooms: number; squareFeet: number; serviceType: string;
  tasks: string[]; addOns: string[]; notes: string;
  scheduledDate: string; scheduledWindow: string; recurring: string;
  quote: Quote; tip: number; createdAt: string; timeline: TimelineEvent[];
  messages: ChatMsg[]; declineReason: string; beforePhotos: string[]; afterPhotos: string[];
}

interface DB {
  users: PUser[]; profiles: PProfile[]; jobs: PJob[]; reviews: PReview[];
  notifications: Notification[]; sessionUserId: string | null; seeded: boolean;
}

let cache: DB | null = null;
function read(): DB {
  if (cache) return cache;
  const raw = localStorage.getItem(KEY);
  if (raw) { try { cache = JSON.parse(raw); return cache!; } catch {} }
  cache = seed(); write(cache); return cache;
}
function write(db: DB) { cache = db; localStorage.setItem(KEY, JSON.stringify(db)); }
export function resetAll() { localStorage.removeItem(KEY); cache = null; }

function refCode(name: string) {
  return name.split(' ')[0].toUpperCase().slice(0, 6) + Math.floor(100 + Math.random() * 899);
}

// ---------- Seed ----------
interface Spec {
  name: string; email: string; avatar: string; headline: string; bio: string; rate: number;
  years: number; team: number; services: string[]; lat: number; lng: number; city: string; zip: string;
  photos: string[]; insured: boolean; idVerified: boolean; instantBook: boolean; languages: string[];
  responseMins: number; availDays: string[]; reviews: { rating: number; sub: SubRatings; tags: string[]; comment: string; daysAgo: number; reply?: string }[];
}

const FULL_WINDOWS = ['morning', 'afternoon', 'evening'];
const DAY_WINDOWS = ['morning', 'afternoon'];

const SPECS: Spec[] = [
  {
    name: 'Maria Sanchez', email: 'maria@haven.demo',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop',
    headline: 'Detail-obsessed solo cleaner • 8 yrs experience',
    bio: "Hi! I'm Maria. I treat every home like my own and never cut corners. I specialize in deep cleans and move-outs, bring my own eco-friendly supplies, and always send a before/after photo set when I'm done.",
    rate: 38, years: 8, team: 1, services: ['standard', 'deep', 'move', 'recurring'],
    lat: 30.2452, lng: -97.7656, city: 'Austin', zip: '78704',
    photos: ['https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800', 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=800'],
    insured: true, idVerified: true, instantBook: true, languages: ['English', 'Spanish'], responseMins: 12,
    availDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
    reviews: [
      { rating: 5, sub: { quality: 5, punctuality: 5, communication: 5, value: 5 }, tags: ['Spotless results', 'On time', 'Trustworthy'], comment: 'Maria is incredible. My apartment has never been this clean!', daysAgo: 6, reply: 'Thank you so much Jordan — you were a joy to work with! 💚' },
      { rating: 5, sub: { quality: 5, punctuality: 4, communication: 5, value: 5 }, tags: ['Detail-oriented', 'Friendly'], comment: 'Super thorough and so kind. Booking again next week.', daysAgo: 20 },
      { rating: 4, sub: { quality: 4, punctuality: 5, communication: 4, value: 4 }, tags: ['On time'], comment: 'Great deep clean, arrived right on time.', daysAgo: 41 },
    ],
  },
  {
    name: 'Bright & Tidy Team', email: 'team@brighttidy.demo',
    avatar: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=400&h=400&fit=crop',
    headline: '3-person crew • Same-day availability',
    bio: 'We are a fully insured 3-person team that can turn around even the biggest homes fast. Perfect for large houses, offices, and tight move-out deadlines. Uniformed, vetted, background-checked staff only.',
    rate: 30, years: 5, team: 3, services: ['standard', 'deep', 'office', 'move'],
    lat: 30.2711, lng: -97.7437, city: 'Austin', zip: '78701',
    photos: ['https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=800', 'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=800'],
    insured: true, idVerified: true, instantBook: true, languages: ['English', 'Spanish', 'Portuguese'], responseMins: 8,
    availDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
    reviews: [
      { rating: 5, sub: { quality: 5, punctuality: 5, communication: 5, value: 5 }, tags: ['Fast', 'Went above & beyond'], comment: 'Whole team showed up and knocked out our 4-bed in 2 hours. Amazing.', daysAgo: 3, reply: 'Thanks Priya! See you next month 🙌' },
      { rating: 5, sub: { quality: 5, punctuality: 5, communication: 4, value: 5 }, tags: ['Trustworthy', 'On time'], comment: 'We use them for our office every week. Reliable and professional.', daysAgo: 12 },
      { rating: 4, sub: { quality: 4, punctuality: 4, communication: 4, value: 5 }, tags: ['Fast'], comment: 'Good value for a team this size.', daysAgo: 30 },
      { rating: 5, sub: { quality: 5, punctuality: 5, communication: 5, value: 5 }, tags: ['Spotless results'], comment: 'Move-out clean got our full deposit back!', daysAgo: 55 },
    ],
  },
  {
    name: 'James Okafor', email: 'james@haven.demo',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
    headline: 'Eco-friendly cleaning • Pet-friendly homes',
    bio: 'I use only non-toxic, pet-safe products and love working in homes with furry family members. Reliable, quiet, and respectful of your space. Recurring clients get priority scheduling.',
    rate: 42, years: 6, team: 1, services: ['standard', 'deep', 'recurring'],
    lat: 30.2061, lng: -97.7969, city: 'Austin', zip: '78745',
    photos: ['https://images.unsplash.com/photo-1563453392212-326f5e854473?w=800'],
    insured: false, idVerified: true, instantBook: false, languages: ['English'], responseMins: 25,
    availDays: ['tue', 'wed', 'thu', 'sat', 'sun'],
    reviews: [
      { rating: 5, sub: { quality: 5, punctuality: 5, communication: 5, value: 4 }, tags: ['Great with pets', 'Eco-friendly'], comment: 'Finally a cleaner who is great with my two dogs. Highly recommend.', daysAgo: 9 },
      { rating: 5, sub: { quality: 5, punctuality: 4, communication: 5, value: 5 }, tags: ['Eco-friendly', 'Friendly'], comment: 'Loved the green products, no harsh smell at all.', daysAgo: 25, reply: 'Appreciate it! Glad your pups approve too 🐾' },
    ],
  },
  {
    name: 'Sparkle Sisters', email: 'hello@sparklesisters.demo',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop',
    headline: '2-person team • Recurring specialists',
    bio: 'Sisters who have cleaned Austin homes together for a decade. Fast, consistent, and we bring all supplies. Ask about our weekly and bi-weekly maintenance plans at a reduced rate.',
    rate: 34, years: 10, team: 2, services: ['standard', 'recurring', 'deep'],
    lat: 30.25, lng: -97.75, city: 'Austin', zip: '78704',
    photos: ['https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?w=800'],
    insured: true, idVerified: false, instantBook: false, languages: ['English'], responseMins: 40,
    availDays: ['mon', 'wed', 'fri'],
    reviews: [
      { rating: 5, sub: { quality: 5, punctuality: 5, communication: 5, value: 5 }, tags: ['Trustworthy', 'On time'], comment: 'Been using them weekly for a year. Never a complaint.', daysAgo: 5 },
      { rating: 4, sub: { quality: 4, punctuality: 4, communication: 4, value: 4 }, tags: ['Friendly'], comment: 'Consistent and friendly.', daysAgo: 18 },
      { rating: 5, sub: { quality: 5, punctuality: 5, communication: 4, value: 5 }, tags: ['Spotless results'], comment: 'The bi-weekly plan is such good value.', daysAgo: 44 },
    ],
  },
];

function availFromDays(days: string[], evenings = false): Availability {
  const a: Availability = {};
  for (const d of days) a[d] = evenings ? FULL_WINDOWS : DAY_WINDOWS;
  return a;
}

function seed(): DB {
  const users: PUser[] = [];
  const profiles: PProfile[] = [];
  const reviews: PReview[] = [];
  const jobs: PJob[] = [];
  const notifications: Notification[] = [];

  const customer: PUser = {
    id: uid(), email: 'customer@haven.demo', role: 'customer', name: 'Demo Customer',
    phone: '512-555-0100', avatarUrl: '', createdAt: iso(60), lat: 30.2672, lng: -97.7431,
    address: '1100 Congress Ave, Austin, TX 78701', favorites: [], wallet: 25, ledger: [
      { id: uid(), at: iso(60), label: 'Welcome credit', amount: 25 },
    ], referralCode: refCode('Demo'), membership: 'none', membershipSince: null, promoRedeemed: [],
  };
  users.push(customer);

  SPECS.forEach((s, idx) => {
    const u: PUser = {
      id: uid(), email: s.email, role: 'provider', name: s.name, phone: `512-555-01${20 + idx}`,
      avatarUrl: s.avatar, createdAt: iso(120), lat: s.lat, lng: s.lng, address: `${s.city}, TX ${s.zip}`,
      favorites: [], wallet: 0, ledger: [], referralCode: refCode(s.name), membership: 'none', membershipSince: null, promoRedeemed: [],
    };
    users.push(u);
    profiles.push({
      userId: u.id, headline: s.headline, bio: s.bio, hourlyRate: s.rate, yearsExperience: s.years,
      teamSize: s.team, isTeam: s.team > 1, services: s.services, serviceRadiusMiles: 25,
      lat: s.lat, lng: s.lng, city: s.city, state: 'TX', zip: s.zip, photos: s.photos,
      languages: s.languages, availability: availFromDays(s.availDays, idx === 1), instantBook: s.instantBook,
      insured: s.insured, idVerified: s.idVerified, suppliesIncluded: true, acceptingJobs: true,
      responseMins: s.responseMins, cancellationPolicy: idx === 1 ? 'moderate' : 'flexible',
      backgroundCheck: { status: 'approved', submittedAt: iso(118), decidedAt: iso(116), reference: 'BGC-DEMO' + idx, note: 'Cleared by screening partner.' },
      isVerified: true, createdAt: iso(120), updatedAt: iso(4),
    });

    // Build completed jobs to back each review (earnings + history).
    s.reviews.forEach((r, ri) => {
      const q = buildQuote({ hourlyRate: s.rate, serviceType: 'standard', bedrooms: 2, bathrooms: 1, squareFeet: 1100, addOns: ri === 0 ? ['inside_fridge'] : [] }, { recurring: 'none', membership: false, promo: null, credit: 0 });
      const tip = ri === 0 ? 12 : ri === 1 ? 8 : 0;
      const completedAt = iso(r.daysAgo);
      const jid = uid();
      jobs.push({
        id: jid, customerId: customer.id, providerId: u.id, status: 'completed',
        address: customer.address, lat: customer.lat, lng: customer.lng, propertyType: 'house',
        bedrooms: 2, bathrooms: 1, squareFeet: 1100, serviceType: 'standard',
        tasks: ['dusting', 'vacuum', 'mop', 'bathroom_scrub', 'trash'], addOns: ri === 0 ? ['inside_fridge'] : [],
        notes: '', scheduledDate: completedAt.split('T')[0], scheduledWindow: 'morning', recurring: 'none',
        quote: q, tip, createdAt: iso(r.daysAgo + 1),
        timeline: [
          { status: 'requested', at: iso(r.daysAgo + 1) }, { status: 'accepted', at: iso(r.daysAgo + 1) },
          { status: 'in_progress', at: completedAt }, { status: 'completed', at: completedAt },
        ],
        messages: [], declineReason: '', beforePhotos: [], afterPhotos: [],
      });
      reviews.push({
        id: uid(), jobId: jid, customerId: customer.id, customerName: ['Jordan P.', 'Alex R.', 'Sam T.', 'Priya M.', 'Casey H.'][(idx + ri) % 5],
        providerId: u.id, rating: r.rating, sub: r.sub, tags: r.tags, comment: r.comment,
        createdAt: completedAt, reply: r.reply ? { text: r.reply, at: iso(r.daysAgo - 0.2) } : null, photos: [],
      });
    });
  });

  return { users, profiles, jobs, reviews, notifications, sessionUserId: null, seeded: true };
}

// ---------- Session ----------
export function currentUser(): PUser | null {
  const db = read();
  return db.users.find((u) => u.id === db.sessionUserId) ?? null;
}
export function login(email: string): PUser | null {
  const db = read();
  const u = db.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
  if (!u) return null;
  db.sessionUserId = u.id; write(db); return u;
}
export function logout() { const db = read(); db.sessionUserId = null; write(db); }
export function signup(input: { email: string; name: string; phone: string; role: Role }): PUser | { error: string } {
  const db = read();
  if (db.users.some((u) => u.email.toLowerCase() === input.email.trim().toLowerCase())) return { error: 'An account with this email already exists' };
  const u: PUser = {
    id: uid(), email: input.email.trim().toLowerCase(), role: input.role, name: input.name.trim(),
    phone: input.phone.trim(), avatarUrl: '', createdAt: now(), lat: null, lng: null, address: '',
    favorites: [], wallet: input.role === 'customer' ? 10 : 0, ledger: input.role === 'customer' ? [{ id: uid(), at: now(), label: 'Welcome credit', amount: 10 }] : [],
    referralCode: refCode(input.name || 'haven'), membership: 'none', membershipSince: null, promoRedeemed: [],
  };
  db.users.push(u);
  if (input.role === 'provider') {
    profilesPush(db, u.id);
  }
  db.sessionUserId = u.id; write(db); return u;
}
function profilesPush(db: DB, userId: string) {
  db.profiles.push({
    userId, headline: '', bio: '', hourlyRate: 35, yearsExperience: 0, teamSize: 1, isTeam: false,
    services: ['standard'], serviceRadiusMiles: 15, lat: null, lng: null, city: '', state: '', zip: '',
    photos: [], languages: ['English'], availability: availFromDays(['mon', 'tue', 'wed', 'thu', 'fri']),
    instantBook: false, insured: false, idVerified: false, suppliesIncluded: true, acceptingJobs: true,
    responseMins: 60, cancellationPolicy: 'flexible',
    backgroundCheck: { status: 'not_submitted', submittedAt: null, decidedAt: null, reference: null, note: '' },
    isVerified: false, createdAt: now(), updatedAt: now(),
  });
}
export function updateUser(id: string, patch: Partial<PUser>) {
  const db = read(); const u = db.users.find((x) => x.id === id);
  if (u) { Object.assign(u, patch); write(db); } return u ?? null;
}

// ---------- Notifications ----------
export function notify(db: DB, userId: string, text: string, href?: string) {
  db.notifications.push({ id: uid(), userId, text, at: now(), read: false, href });
}
export function notificationsFor(userId: string): Notification[] {
  return read().notifications.filter((n) => n.userId === userId).sort((a, b) => b.at.localeCompare(a.at));
}
export function markNotificationsRead(userId: string) {
  const db = read(); db.notifications.forEach((n) => { if (n.userId === userId) n.read = true; }); write(db);
}

// ---------- Favorites / wallet / membership / promo ----------
export function toggleFavorite(userId: string, providerId: string) {
  const db = read(); const u = db.users.find((x) => x.id === userId); if (!u) return;
  u.favorites = u.favorites.includes(providerId) ? u.favorites.filter((f) => f !== providerId) : [...u.favorites, providerId];
  write(db);
}
export function addCredit(userId: string, amount: number, label: string) {
  const db = read(); const u = db.users.find((x) => x.id === userId); if (!u) return;
  u.wallet = Math.round((u.wallet + amount) * 100) / 100; u.ledger.unshift({ id: uid(), at: now(), label, amount }); write(db);
}
export function setMembership(userId: string, on: boolean) {
  const db = read(); const u = db.users.find((x) => x.id === userId); if (!u) return;
  u.membership = on ? 'plus' : 'none'; u.membershipSince = on ? now() : null; write(db);
}
export function redeemReferral(userId: string, code: string): { ok: boolean; msg: string } {
  const db = read(); const u = db.users.find((x) => x.id === userId); if (!u) return { ok: false, msg: 'Not signed in' };
  const owner = db.users.find((x) => x.referralCode.toUpperCase() === code.trim().toUpperCase());
  if (!owner) return { ok: false, msg: "That referral code doesn't exist" };
  if (owner.id === userId) return { ok: false, msg: "You can't use your own code" };
  if (u.promoRedeemed.includes('REF:' + code)) return { ok: false, msg: 'Already redeemed' };
  u.promoRedeemed.push('REF:' + code);
  addCredit(userId, 20, `Referral bonus (${code})`);
  const o = db.users.find((x) => x.id === owner.id)!; o.wallet += 20; o.ledger.unshift({ id: uid(), at: now(), label: 'Friend joined with your code', amount: 20 }); write(db);
  return { ok: true, msg: 'You both earned $20 in credit!' };
}

// ---------- Pricing / quotes ----------
export function buildQuote(
  base: { hourlyRate: number; serviceType: string; bedrooms: number; bathrooms: number; squareFeet: number; addOns: string[] },
  opts: { recurring: string; membership: boolean; promo: string | null; credit: number }
): Quote {
  const e = estimateJob(base);
  const labor = e.labor, addOnTotal = e.addOnTotal;
  let discount = 0; const labels: string[] = [];
  const recPct = RECURRING_DISCOUNT[opts.recurring] ?? 0;
  if (recPct > 0) { discount += (labor + addOnTotal) * recPct; labels.push(`${Math.round(recPct * 100)}% recurring`); }
  if (opts.membership) { discount += (labor + addOnTotal) * MEMBERSHIP_DISCOUNT; labels.push('10% HavenClean+'); }
  if (opts.promo && PROMO_CODES[opts.promo]) {
    const p = PROMO_CODES[opts.promo];
    const amt = p.type === 'percent' ? (labor + addOnTotal) * (p.value / 100) : p.value;
    discount += amt; labels.push(opts.promo);
  }
  discount = Math.round(discount * 100) / 100;
  const subtotal = Math.max(0, labor + addOnTotal - discount);
  const platformFee = Math.round(subtotal * PLATFORM_FEE_RATE * 100) / 100;
  const beforeCredit = subtotal + platformFee;
  const creditApplied = Math.min(opts.credit, beforeCredit);
  const total = Math.round((beforeCredit - creditApplied) * 100) / 100;
  const providerPayout = Math.round((labor + addOnTotal - discount) * 100) / 100;
  return { hours: e.hours, labor, addOnTotal, discount, discountLabel: labels.join(' + '), creditApplied: Math.round(creditApplied * 100) / 100, platformFee, total, providerPayout };
}

// ---------- Providers (public) ----------
export interface PublicProvider extends PProfile {
  id: string; name: string; avatarUrl: string; rating: number; reviewCount: number;
  tier: string; distanceMiles?: number; subAverages: SubRatings; completedJobs: number; repeatRate: number;
}
const ZERO_SUB: SubRatings = { quality: 0, punctuality: 0, communication: 0, value: 0 };

function ratingOf(db: DB, providerId: string) {
  const rs = db.reviews.filter((r) => r.providerId === providerId);
  if (!rs.length) return { avg: 0, count: 0, sub: ZERO_SUB };
  const avg = Math.round((rs.reduce((s, r) => s + r.rating, 0) / rs.length) * 10) / 10;
  const sub: SubRatings = {
    quality: avgBy(rs, 'quality'), punctuality: avgBy(rs, 'punctuality'),
    communication: avgBy(rs, 'communication'), value: avgBy(rs, 'value'),
  };
  return { avg, count: rs.length, sub };
}
function avgBy(rs: PReview[], k: keyof SubRatings) {
  return Math.round((rs.reduce((s, r) => s + (r.sub?.[k] ?? r.rating), 0) / rs.length) * 10) / 10;
}
export function tierOf(rating: number, completed: number): string {
  if (completed >= 25 && rating >= 4.85) return 'Elite Pro';
  if (completed >= 10 && rating >= 4.6) return 'Top Pro';
  if (completed >= 3 && rating >= 4.0) return 'Pro';
  if (completed >= 1) return 'Rising';
  return 'New';
}
function completedCount(db: DB, providerId: string) {
  return db.jobs.filter((j) => j.providerId === providerId && j.status === 'completed').length;
}
function repeatRate(db: DB, providerId: string) {
  const done = db.jobs.filter((j) => j.providerId === providerId && j.status === 'completed');
  if (!done.length) return 0;
  const byCust: Record<string, number> = {};
  done.forEach((j) => { byCust[j.customerId] = (byCust[j.customerId] ?? 0) + 1; });
  const repeats = Object.values(byCust).filter((n) => n > 1).length;
  const uniques = Object.keys(byCust).length;
  return uniques ? Math.round((repeats / uniques) * 100) : 0;
}
function toPublic(db: DB, p: PProfile): PublicProvider | null {
  const u = db.users.find((x) => x.id === p.userId); if (!u) return null;
  const { avg, count, sub } = ratingOf(db, p.userId);
  const completed = completedCount(db, p.userId);
  return { ...p, id: u.id, name: u.name, avatarUrl: u.avatarUrl, rating: avg, reviewCount: count, subAverages: sub, tier: tierOf(avg, completed), completedJobs: completed, repeatRate: repeatRate(db, p.userId) };
}
export function getProvider(id: string): PublicProvider | null {
  const db = read(); const p = db.profiles.find((x) => x.userId === id); return p ? toPublic(db, p) : null;
}
export function reviewsFor(providerId: string): PReview[] {
  return read().reviews.filter((r) => r.providerId === providerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export function tagCounts(providerId: string): { tag: string; count: number }[] {
  const rs = read().reviews.filter((r) => r.providerId === providerId);
  const m: Record<string, number> = {};
  rs.forEach((r) => r.tags.forEach((t) => { m[t] = (m[t] ?? 0) + 1; }));
  return Object.entries(m).map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count);
}

export interface SearchParams {
  lat: number; lng: number; service?: string; maxPrice?: number; sort?: string; query?: string;
  instantOnly?: boolean; topRated?: boolean; ecoOnly?: boolean; favoritesOf?: string;
}
export function search(params: SearchParams): PublicProvider[] {
  const db = read();
  const favs = params.favoritesOf ? (db.users.find((u) => u.id === params.favoritesOf)?.favorites ?? []) : null;
  let list = db.profiles.map((p) => toPublic(db, p)).filter((p): p is PublicProvider => !!p && p.isVerified)
    .map((p) => { if (p.lat != null && p.lng != null) p.distanceMiles = Math.round(haversineMiles(params.lat, params.lng, p.lat, p.lng) * 10) / 10; return p; })
    .filter((p) => p.distanceMiles == null || p.distanceMiles <= p.serviceRadiusMiles);
  if (params.service) list = list.filter((p) => p.services.includes(params.service!));
  if (params.maxPrice) list = list.filter((p) => p.hourlyRate <= params.maxPrice!);
  if (params.instantOnly) list = list.filter((p) => p.instantBook);
  if (params.topRated) list = list.filter((p) => p.rating >= 4.7);
  if (params.ecoOnly) list = list.filter((p) => tagCounts(p.id).some((t) => t.tag === 'Eco-friendly') || p.bio.toLowerCase().includes('eco'));
  if (favs) list = list.filter((p) => favs.includes(p.id));
  if (params.query) { const q = params.query.toLowerCase(); list = list.filter((p) => p.name.toLowerCase().includes(q) || p.headline.toLowerCase().includes(q) || p.bio.toLowerCase().includes(q)); }
  const sort = params.sort ?? 'recommended';
  list.sort((a, b) => {
    if (sort === 'distance') return (a.distanceMiles ?? Infinity) - (b.distanceMiles ?? Infinity);
    if (sort === 'price') return a.hourlyRate - b.hourlyRate;
    if (sort === 'rating') return b.rating - a.rating || b.reviewCount - a.reviewCount;
    // recommended: blend rating, reviews, proximity, instant
    const score = (p: PublicProvider) => p.rating * 2 + Math.min(p.reviewCount, 10) * 0.2 + (p.instantBook ? 1 : 0) - (p.distanceMiles ?? 0) * 0.05;
    return score(b) - score(a);
  });
  return list;
}

export function getProfile(userId: string): PProfile | null { return read().profiles.find((p) => p.userId === userId) ?? null; }
export function updateProfile(userId: string, patch: Partial<PProfile>) {
  const db = read(); const p = db.profiles.find((x) => x.userId === userId);
  if (p) { const { backgroundCheck, isVerified, userId: _u, ...safe } = patch as any; Object.assign(p, safe); p.updatedAt = now(); write(db); }
  return p ?? null;
}
export function submitBackgroundCheck(userId: string) {
  const db = read(); const p = db.profiles.find((x) => x.userId === userId);
  if (p) { p.backgroundCheck = { status: 'pending', submittedAt: now(), decidedAt: null, reference: 'BGC-' + uid().slice(0, 8).toUpperCase(), note: 'Submitted to screening partner. Typical turnaround 1-2 business days.' }; write(db); }
  return p ?? null;
}
export function decideBackgroundCheck(userId: string, approve: boolean, note = '') {
  const db = read(); const p = db.profiles.find((x) => x.userId === userId);
  if (p) {
    p.backgroundCheck.status = approve ? 'approved' : 'rejected'; p.backgroundCheck.decidedAt = now();
    p.backgroundCheck.note = note || (approve ? 'Cleared by screening partner.' : 'Did not pass screening.');
    p.isVerified = approve;
    notify(db, userId, approve ? '🎉 Your background check was approved — you’re live in search!' : 'Your background check was not approved.', '#/provider');
    write(db);
  }
  return p ?? null;
}
export function allProviders(): PublicProvider[] {
  const db = read(); return db.profiles.map((p) => toPublic(db, p)).filter((p): p is PublicProvider => !!p);
}

export function profileCompleteness(p: PProfile, u: PUser): { pct: number; missing: string[] } {
  const checks: [boolean, string][] = [
    [!!u.avatarUrl, 'Add a profile photo'], [p.headline.length > 10, 'Write a headline'],
    [p.bio.length >= 80, 'Expand your bio (80+ chars)'], [p.photos.length >= 2, 'Add 2+ work photos'],
    [p.services.length >= 2, 'Offer 2+ services'], [p.lat != null, 'Set your base location'],
    [Object.keys(p.availability).length >= 3, 'Set availability for 3+ days'], [p.insured, 'Add insurance'],
    [p.idVerified, 'Verify your ID'], [!!p.city, 'Add your city'],
  ];
  const done = checks.filter((c) => c[0]).length;
  return { pct: Math.round((done / checks.length) * 100), missing: checks.filter((c) => !c[0]).map((c) => c[1]) };
}

// ---------- Scheduling slots ----------
export interface Slot { date: string; window: string; label: string; dayLabel: string }
export function availableSlots(providerId: string, days = 14): Slot[] {
  const db = read(); const p = db.profiles.find((x) => x.userId === providerId); if (!p) return [];
  const taken = new Set(db.jobs.filter((j) => j.providerId === providerId && ['requested', 'accepted', 'on_the_way', 'arrived', 'in_progress'].includes(j.status)).map((j) => j.scheduledDate + '|' + j.scheduledWindow));
  const out: Slot[] = [];
  for (let i = 1; i <= days; i++) {
    const d = new Date(); d.setDate(d.getDate() + i);
    const dayKey = DAYS[d.getDay()].key; const wins = p.availability[dayKey] || [];
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    for (const w of WINDOWS) {
      if (wins.includes(w.key) && !taken.has(dateStr + '|' + w.key)) {
        out.push({ date: dateStr, window: w.key, dayLabel, label: `${dayLabel} · ${w.label} (${w.time})` });
      }
    }
  }
  return out;
}

// ---------- Jobs ----------
export function createJob(input: Omit<PJob, 'id' | 'status' | 'createdAt' | 'timeline' | 'messages' | 'declineReason' | 'beforePhotos' | 'afterPhotos' | 'tip'> & { instant: boolean }): PJob {
  const db = read();
  const status: PJobStatus = input.instant ? 'accepted' : 'requested';
  const { instant, ...rest } = input;
  const job: PJob = {
    ...rest, id: uid(), status, tip: 0, createdAt: now(),
    timeline: [{ status: 'requested', at: now() }, ...(input.instant ? [{ status: 'accepted' as PJobStatus, at: now() }] : [])],
    messages: [], declineReason: '', beforePhotos: [], afterPhotos: [],
  };
  // apply wallet credit spend
  if (job.quote.creditApplied > 0) {
    const u = db.users.find((x) => x.id === job.customerId);
    if (u) { u.wallet = Math.round((u.wallet - job.quote.creditApplied) * 100) / 100; u.ledger.unshift({ id: uid(), at: now(), label: 'Applied to booking', amount: -job.quote.creditApplied }); }
  }
  db.jobs.push(job);
  notify(db, job.providerId, input.instant ? `✅ New instant booking from a customer for ${job.scheduledDate}` : `📩 New job request for ${job.scheduledDate}`, '#/provider');
  write(db);
  return job;
}
const TRANSITIONS: Record<PJobStatus, PJobStatus[]> = {
  requested: ['accepted', 'declined', 'cancelled'],
  accepted: ['on_the_way', 'in_progress', 'cancelled'],
  on_the_way: ['arrived', 'cancelled'],
  arrived: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  declined: [], completed: [], cancelled: [],
};
export function transitionJob(id: string, to: PJobStatus, declineReason = ''): PJob | null {
  const db = read(); const job = db.jobs.find((j) => j.id === id);
  if (!job || !TRANSITIONS[job.status].includes(to)) return null;
  job.status = to; job.timeline.push({ status: to, at: now() });
  if (to === 'declined') job.declineReason = declineReason;
  // notify the relevant party
  const labels: Partial<Record<PJobStatus, string>> = {
    accepted: '✅ Your booking was accepted!', declined: '❌ Your request was declined.',
    on_the_way: '🚗 Your cleaner is on the way!', arrived: '📍 Your cleaner has arrived.',
    in_progress: '🧹 Your clean is in progress.', completed: '✨ Your clean is complete — leave a review!',
    cancelled: 'Your booking was cancelled.',
  };
  if (labels[to]) notify(db, job.customerId, labels[to]!, '#/customer');
  if (to === 'completed') {
    // pay out provider into their wallet
    const prov = db.users.find((u) => u.id === job.providerId);
    if (prov) { prov.wallet += job.quote.providerPayout; prov.ledger.unshift({ id: uid(), at: now(), label: 'Job payout', amount: job.quote.providerPayout }); }
  }
  write(db); return job;
}
export function nextStatus(s: PJobStatus): PJobStatus | null {
  const map: Partial<Record<PJobStatus, PJobStatus>> = { accepted: 'on_the_way', on_the_way: 'arrived', arrived: 'in_progress', in_progress: 'completed' };
  return map[s] ?? null;
}
export function rescheduleJob(id: string, date: string, window: string) {
  const db = read(); const job = db.jobs.find((j) => j.id === id); if (!job) return;
  job.scheduledDate = date; job.scheduledWindow = window;
  notify(db, job.providerId, `🔁 A job was rescheduled to ${date}`, '#/provider'); write(db);
}
export function sendMessage(jobId: string, fromId: string, fromRole: Role, text: string) {
  const db = read(); const job = db.jobs.find((j) => j.id === jobId); if (!job || !text.trim()) return;
  job.messages.push({ id: uid(), fromId, fromRole, text: text.trim(), at: now(), read: false });
  const to = fromRole === 'customer' ? job.providerId : job.customerId;
  notify(db, to, `💬 New message about your ${job.scheduledDate} clean`, fromRole === 'customer' ? '#/provider' : '#/customer');
  write(db);
}
export function addTip(jobId: string, amount: number) {
  const db = read(); const job = db.jobs.find((j) => j.id === jobId); if (!job) return;
  job.tip = amount;
  const prov = db.users.find((u) => u.id === job.providerId);
  if (prov) { prov.wallet += amount; prov.ledger.unshift({ id: uid(), at: now(), label: 'Tip received 🙏', amount }); notify(db, job.providerId, `🙏 You received a $${amount} tip!`, '#/provider'); }
  write(db);
}
export function jobsForCustomer(id: string): PJob[] { return read().jobs.filter((j) => j.customerId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
export function jobsForProvider(id: string): PJob[] { return read().jobs.filter((j) => j.providerId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
export function userById(id: string): PUser | null { return read().users.find((u) => u.id === id) ?? null; }
export function reviewForJob(jobId: string): PReview | null { return read().reviews.find((r) => r.jobId === jobId) ?? null; }
export function jobById(id: string): PJob | null { return read().jobs.find((j) => j.id === id) ?? null; }

export function createReview(input: { jobId: string; customerId: string; customerName: string; providerId: string; rating: number; sub: SubRatings; tags: string[]; comment: string }): PReview | { error: string } {
  const db = read(); const job = db.jobs.find((j) => j.id === input.jobId);
  if (!job) return { error: 'Job not found' };
  if (job.status !== 'completed') return { error: 'You can only review completed jobs' };
  if (db.reviews.some((r) => r.jobId === input.jobId)) return { error: 'You already reviewed this job' };
  const review: PReview = { id: uid(), ...input, comment: input.comment.trim(), createdAt: now(), reply: null, photos: [] };
  db.reviews.push(review);
  notify(db, input.providerId, `⭐ You got a ${input.rating}-star review!`, '#/provider');
  write(db); return review;
}
export function replyToReview(reviewId: string, providerId: string, text: string) {
  const db = read(); const r = db.reviews.find((x) => x.id === reviewId); if (!r || r.providerId !== providerId || !text.trim()) return;
  r.reply = { text: text.trim(), at: now() }; write(db);
}

// ---------- Provider analytics ----------
export interface ProviderStats {
  earningsWeek: number; earningsMonth: number; earningsAll: number; tips: number;
  completed: number; upcoming: number; acceptanceRate: number; onTimeRate: number;
  repeatRate: number; rating: number; reviewCount: number; tier: string; responseMins: number;
}
export function providerStats(providerId: string): ProviderStats {
  const db = read();
  const jobs = db.jobs.filter((j) => j.providerId === providerId);
  const done = jobs.filter((j) => j.status === 'completed');
  const weekAgo = Date.now() - 7 * 86400000, monthAgo = Date.now() - 30 * 86400000;
  const payout = (j: PJob) => j.quote.providerPayout + (j.tip || 0);
  const at = (j: PJob) => new Date(j.timeline.find((t) => t.status === 'completed')?.at ?? j.createdAt).getTime();
  const earningsAll = done.reduce((s, j) => s + payout(j), 0);
  const tips = done.reduce((s, j) => s + (j.tip || 0), 0);
  const decided = jobs.filter((j) => ['accepted', 'on_the_way', 'arrived', 'in_progress', 'completed', 'declined'].includes(j.status));
  const accepted = decided.filter((j) => j.status !== 'declined').length;
  const { avg, count, sub } = ratingOf(db, providerId);
  return {
    earningsWeek: round2(done.filter((j) => at(j) >= weekAgo).reduce((s, j) => s + payout(j), 0)),
    earningsMonth: round2(done.filter((j) => at(j) >= monthAgo).reduce((s, j) => s + payout(j), 0)),
    earningsAll: round2(earningsAll), tips: round2(tips), completed: done.length,
    upcoming: jobs.filter((j) => ['accepted', 'on_the_way', 'arrived', 'in_progress'].includes(j.status)).length,
    acceptanceRate: decided.length ? Math.round((accepted / decided.length) * 100) : 100,
    onTimeRate: count ? Math.round((sub.punctuality / 5) * 100) : 100,
    repeatRate: repeatRate(db, providerId), rating: avg, reviewCount: count,
    tier: tierOf(avg, done.length), responseMins: db.profiles.find((p) => p.userId === providerId)?.responseMins ?? 60,
  };
}
function round2(n: number) { return Math.round(n * 100) / 100; }

// expose a few helpers
export { inDays };
