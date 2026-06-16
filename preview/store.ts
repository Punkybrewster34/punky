// In-browser data layer for the static preview. Mirrors the server's
// domain model but persists to localStorage so the whole marketplace runs
// with no backend. Reuses the pure shared modules for types/pricing/geo.

import type {
  MarketplaceData,
  User,
  ProviderProfile,
  Job,
  Review,
  Role,
  JobStatus,
} from '../lib/marketplace/types';
import { haversineMiles } from '../lib/marketplace/geo';

const KEY = 'havenclean_preview_v1';

function uid(): string {
  return (crypto.randomUUID && crypto.randomUUID()) || Math.random().toString(36).slice(2);
}
function now(): string {
  return new Date().toISOString();
}
function iso(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 86400000).toISOString();
}

interface DB extends MarketplaceData {
  sessionUserId: string | null;
}

let cache: DB | null = null;

function read(): DB {
  if (cache) return cache;
  const raw = localStorage.getItem(KEY);
  if (raw) {
    try {
      cache = JSON.parse(raw);
      return cache!;
    } catch {}
  }
  cache = seed();
  write(cache);
  return cache;
}

function write(db: DB) {
  cache = db;
  localStorage.setItem(KEY, JSON.stringify(db));
}

export function resetAll() {
  localStorage.removeItem(KEY);
  cache = null;
}

// ---------- Seed ----------

interface Spec {
  name: string; email: string; avatar: string; headline: string; bio: string;
  rate: number; years: number; team: number; services: string[];
  lat: number; lng: number; city: string; zip: string; photos: string[];
  insured: boolean; reviews: { rating: number; comment: string; daysAgo: number }[];
}

const SPECS: Spec[] = [
  {
    name: 'Maria Sanchez', email: 'maria@haven.demo',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop',
    headline: 'Detail-obsessed solo cleaner • 8 yrs experience',
    bio: "Hi! I'm Maria. I treat every home like my own and never cut corners. I specialize in deep cleans and move-outs, bring my own eco-friendly supplies, and always send a before/after photo set when I'm done.",
    rate: 38, years: 8, team: 1, services: ['standard', 'deep', 'move', 'recurring'],
    lat: 30.2452, lng: -97.7656, city: 'Austin', zip: '78704',
    photos: ['https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800', 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=800'],
    insured: true,
    reviews: [
      { rating: 5, comment: 'Maria is incredible. My apartment has never been this clean! — Jordan P.', daysAgo: 6 },
      { rating: 5, comment: 'Super thorough and so kind. Booking again next week. — Alex R.', daysAgo: 20 },
      { rating: 4, comment: 'Great deep clean, arrived right on time. — Sam T.', daysAgo: 41 },
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
    insured: true,
    reviews: [
      { rating: 5, comment: 'Whole team showed up and knocked out our 4-bed in 2 hours. Amazing. — Priya M.', daysAgo: 3 },
      { rating: 5, comment: 'We use them for our office every week. Reliable and professional. — Devon K.', daysAgo: 12 },
      { rating: 4, comment: 'Good value for a team this size. — Chris L.', daysAgo: 30 },
      { rating: 5, comment: 'Move-out clean got our full deposit back! — Taylor W.', daysAgo: 55 },
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
    insured: false,
    reviews: [
      { rating: 5, comment: 'Finally a cleaner who is great with my two dogs. Highly recommend. — Morgan D.', daysAgo: 9 },
      { rating: 5, comment: 'Loved the green products, no harsh smell at all. — Riley S.', daysAgo: 25 },
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
    insured: true,
    reviews: [
      { rating: 5, comment: 'Been using them weekly for a year. Never a complaint. — Casey H.', daysAgo: 5 },
      { rating: 4, comment: 'Consistent and friendly. — Quinn F.', daysAgo: 18 },
      { rating: 5, comment: 'The bi-weekly plan is such good value. — Avery N.', daysAgo: 44 },
    ],
  },
];

function seed(): DB {
  const users: User[] = [];
  const profiles: ProviderProfile[] = [];
  const reviews: Review[] = [];

  const customer: User = {
    id: uid(), email: 'customer@haven.demo', passwordHash: 'demo', role: 'customer',
    name: 'Demo Customer', phone: '512-555-0100', avatarUrl: '', createdAt: iso(60),
    lat: 30.2672, lng: -97.7431, address: 'Austin, TX 78701',
  };
  users.push(customer);

  for (const s of SPECS) {
    const u: User = {
      id: uid(), email: s.email, passwordHash: 'demo', role: 'provider', name: s.name,
      phone: '512-555-0148', avatarUrl: s.avatar, createdAt: iso(90),
      lat: s.lat, lng: s.lng, address: `${s.city}, TX ${s.zip}`,
    };
    users.push(u);
    profiles.push({
      userId: u.id, headline: s.headline, bio: s.bio, hourlyRate: s.rate,
      yearsExperience: s.years, teamSize: s.team, isTeam: s.team > 1, services: s.services,
      serviceRadiusMiles: 25, lat: s.lat, lng: s.lng, city: s.city, state: 'TX', zip: s.zip,
      photos: s.photos,
      backgroundCheck: { status: 'approved', submittedAt: iso(88), decidedAt: iso(86), reference: 'BGC-DEMO', note: 'Cleared by screening partner.' },
      isVerified: true, acceptingJobs: true, insured: s.insured, suppliesIncluded: true,
      createdAt: iso(90), updatedAt: iso(5),
    });
    for (const r of s.reviews) {
      reviews.push({ id: uid(), jobId: 'seed-' + uid(), customerId: customer.id, providerId: u.id, rating: r.rating, comment: r.comment, createdAt: iso(r.daysAgo) });
    }
  }

  return { users, profiles, jobs: [], reviews, seeded: true, sessionUserId: null };
}

// ---------- Session ----------

export function currentUser(): User | null {
  const db = read();
  return db.users.find((u) => u.id === db.sessionUserId) ?? null;
}

export function login(email: string): User | null {
  const db = read();
  const u = db.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
  if (!u) return null;
  db.sessionUserId = u.id;
  write(db);
  return u;
}

export function logout() {
  const db = read();
  db.sessionUserId = null;
  write(db);
}

export function signup(input: { email: string; name: string; phone: string; role: Role }): User | { error: string } {
  const db = read();
  if (db.users.some((u) => u.email.toLowerCase() === input.email.trim().toLowerCase())) {
    return { error: 'An account with this email already exists' };
  }
  const u: User = {
    id: uid(), email: input.email.trim().toLowerCase(), passwordHash: 'demo', role: input.role,
    name: input.name.trim(), phone: input.phone.trim(), avatarUrl: '', createdAt: now(),
    lat: null, lng: null, address: '',
  };
  db.users.push(u);
  if (input.role === 'provider') {
    db.profiles.push({
      userId: u.id, headline: '', bio: '', hourlyRate: 35, yearsExperience: 0, teamSize: 1,
      isTeam: false, services: ['standard'], serviceRadiusMiles: 15, lat: null, lng: null,
      city: '', state: '', zip: '', photos: [],
      backgroundCheck: { status: 'not_submitted', submittedAt: null, decidedAt: null, reference: null, note: '' },
      isVerified: false, acceptingJobs: true, insured: false, suppliesIncluded: true,
      createdAt: now(), updatedAt: now(),
    });
  }
  db.sessionUserId = u.id;
  write(db);
  return u;
}

export function updateUser(id: string, patch: Partial<User>) {
  const db = read();
  const u = db.users.find((x) => x.id === id);
  if (u) { Object.assign(u, patch); write(db); }
  return u ?? null;
}

// ---------- Providers ----------

export interface PublicProvider extends ProviderProfile {
  id: string; name: string; avatarUrl: string; rating: number; reviewCount: number; distanceMiles?: number;
}

function rating(db: DB, providerId: string) {
  const rs = db.reviews.filter((r) => r.providerId === providerId);
  if (!rs.length) return { avg: 0, count: 0 };
  return { avg: Math.round((rs.reduce((s, r) => s + r.rating, 0) / rs.length) * 10) / 10, count: rs.length };
}

function toPublic(db: DB, p: ProviderProfile): PublicProvider | null {
  const u = db.users.find((x) => x.id === p.userId);
  if (!u) return null;
  const { avg, count } = rating(db, p.userId);
  return { ...p, id: u.id, name: u.name, avatarUrl: u.avatarUrl, rating: avg, reviewCount: count };
}

export function getProvider(id: string): PublicProvider | null {
  const db = read();
  const p = db.profiles.find((x) => x.userId === id);
  return p ? toPublic(db, p) : null;
}

export function reviewsFor(providerId: string): Review[] {
  return read().reviews.filter((r) => r.providerId === providerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export interface SearchParams {
  lat: number; lng: number; service?: string; maxPrice?: number;
  sort?: 'distance' | 'rating' | 'price'; query?: string;
}

export function search(params: SearchParams): PublicProvider[] {
  const db = read();
  let list = db.profiles
    .map((p) => toPublic(db, p))
    .filter((p): p is PublicProvider => !!p && p.isVerified)
    .map((p) => {
      if (p.lat != null && p.lng != null) {
        p.distanceMiles = Math.round(haversineMiles(params.lat, params.lng, p.lat, p.lng) * 10) / 10;
      }
      return p;
    })
    .filter((p) => p.distanceMiles == null || p.distanceMiles <= p.serviceRadiusMiles);

  if (params.service) list = list.filter((p) => p.services.includes(params.service!));
  if (params.maxPrice) list = list.filter((p) => p.hourlyRate <= params.maxPrice!);
  if (params.query) {
    const q = params.query.toLowerCase();
    list = list.filter((p) => p.name.toLowerCase().includes(q) || p.headline.toLowerCase().includes(q) || p.bio.toLowerCase().includes(q));
  }
  const sort = params.sort ?? 'distance';
  list.sort((a, b) => {
    if (sort === 'distance') return (a.distanceMiles ?? Infinity) - (b.distanceMiles ?? Infinity);
    if (sort === 'price') return a.hourlyRate - b.hourlyRate;
    return b.rating - a.rating || b.reviewCount - a.reviewCount;
  });
  return list;
}

export function getProfile(userId: string): ProviderProfile | null {
  return read().profiles.find((p) => p.userId === userId) ?? null;
}

export function updateProfile(userId: string, patch: Partial<ProviderProfile>) {
  const db = read();
  const p = db.profiles.find((x) => x.userId === userId);
  if (p) {
    const { backgroundCheck, isVerified, userId: _u, ...safe } = patch;
    Object.assign(p, safe);
    p.updatedAt = now();
    write(db);
  }
  return p ?? null;
}

export function submitBackgroundCheck(userId: string) {
  const db = read();
  const p = db.profiles.find((x) => x.userId === userId);
  if (p) {
    p.backgroundCheck = { status: 'pending', submittedAt: now(), decidedAt: null, reference: 'BGC-' + uid().slice(0, 8).toUpperCase(), note: 'Submitted to screening partner. Typical turnaround 1-2 business days.' };
    write(db);
  }
  return p ?? null;
}

// In the preview the admin can decide; we also expose a one-tap
// "auto-approve" so the flow is visible without a separate admin login.
export function decideBackgroundCheck(userId: string, approve: boolean, note = '') {
  const db = read();
  const p = db.profiles.find((x) => x.userId === userId);
  if (p) {
    p.backgroundCheck.status = approve ? 'approved' : 'rejected';
    p.backgroundCheck.decidedAt = now();
    p.backgroundCheck.note = note || (approve ? 'Cleared by screening partner.' : 'Did not pass screening.');
    p.isVerified = approve;
    write(db);
  }
  return p ?? null;
}

export function allProviders() {
  const db = read();
  return db.profiles.map((p) => toPublic(db, p)).filter((p): p is PublicProvider => !!p);
}

// ---------- Jobs ----------

export function createJob(input: Omit<Job, 'id' | 'status' | 'createdAt' | 'acceptedAt' | 'completedAt' | 'declineReason'>): Job {
  const db = read();
  const job: Job = { ...input, id: uid(), status: 'requested', createdAt: now(), acceptedAt: null, completedAt: null, declineReason: '' };
  db.jobs.push(job);
  write(db);
  return job;
}

const TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  requested: ['accepted', 'declined', 'cancelled'],
  accepted: ['in_progress', 'completed', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  declined: [], completed: [], cancelled: [],
};

export function transitionJob(id: string, to: JobStatus, declineReason = ''): Job | null {
  const db = read();
  const job = db.jobs.find((j) => j.id === id);
  if (!job || !TRANSITIONS[job.status].includes(to)) return null;
  job.status = to;
  if (to === 'accepted') job.acceptedAt = now();
  if (to === 'completed') job.completedAt = now();
  if (to === 'declined') job.declineReason = declineReason;
  write(db);
  return job;
}

export function jobsForCustomer(id: string): Job[] {
  return read().jobs.filter((j) => j.customerId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export function jobsForProvider(id: string): Job[] {
  return read().jobs.filter((j) => j.providerId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export function userById(id: string): User | null {
  return read().users.find((u) => u.id === id) ?? null;
}
export function reviewForJob(jobId: string): Review | null {
  return read().reviews.find((r) => r.jobId === jobId) ?? null;
}

export function createReview(input: { jobId: string; customerId: string; providerId: string; rating: number; comment: string }): Review | { error: string } {
  const db = read();
  const job = db.jobs.find((j) => j.id === input.jobId);
  if (!job) return { error: 'Job not found' };
  if (job.status !== 'completed') return { error: 'You can only review completed jobs' };
  if (db.reviews.some((r) => r.jobId === input.jobId)) return { error: 'You already reviewed this job' };
  const review: Review = { id: uid(), ...input, rating: Math.max(1, Math.min(5, Math.round(input.rating))), comment: input.comment.trim(), createdAt: now() };
  db.reviews.push(review);
  write(db);
  return review;
}
