import crypto from 'crypto';
import { readData, writeData, mutate } from './store';
import { hashPassword } from './passwords';
import { haversineMiles } from './geo';
import {
  User,
  Role,
  ProviderProfile,
  Job,
  JobStatus,
  Review,
  BackgroundCheck,
} from './types';

function id(): string {
  return crypto.randomUUID();
}
function now(): string {
  return new Date().toISOString();
}

// ---------- Users ----------

export function getUserById(userId: string): User | null {
  return readData().users.find((u) => u.id === userId) ?? null;
}

export function getUserByEmail(email: string): User | null {
  const e = email.trim().toLowerCase();
  return readData().users.find((u) => u.email.toLowerCase() === e) ?? null;
}

export interface CreateUserInput {
  email: string;
  password: string;
  role: Role;
  name: string;
  phone?: string;
}

export function createUser(input: CreateUserInput): User {
  const user: User = {
    id: id(),
    email: input.email.trim().toLowerCase(),
    passwordHash: hashPassword(input.password),
    role: input.role,
    name: input.name.trim(),
    phone: input.phone?.trim() ?? '',
    avatarUrl: '',
    createdAt: now(),
    lat: null,
    lng: null,
    address: '',
  };
  mutate((d) => d.users.push(user));
  // Providers get a starter profile immediately so they can fill it in.
  if (input.role === 'provider') {
    createEmptyProfile(user.id);
  }
  return user;
}

export function updateUser(userId: string, patch: Partial<User>): User | null {
  return mutate((d) => {
    const u = d.users.find((x) => x.id === userId);
    if (!u) return null;
    Object.assign(u, patch);
    return u;
  });
}

// ---------- Provider profiles ----------

function freshBackgroundCheck(): BackgroundCheck {
  return {
    status: 'not_submitted',
    submittedAt: null,
    decidedAt: null,
    reference: null,
    note: '',
  };
}

function createEmptyProfile(userId: string): ProviderProfile {
  const profile: ProviderProfile = {
    userId,
    headline: '',
    bio: '',
    hourlyRate: 35,
    yearsExperience: 0,
    teamSize: 1,
    isTeam: false,
    services: ['standard'],
    serviceRadiusMiles: 15,
    lat: null,
    lng: null,
    city: '',
    state: '',
    zip: '',
    photos: [],
    backgroundCheck: freshBackgroundCheck(),
    isVerified: false,
    acceptingJobs: true,
    insured: false,
    suppliesIncluded: true,
    createdAt: now(),
    updatedAt: now(),
  };
  mutate((d) => d.profiles.push(profile));
  return profile;
}

export function getProfile(userId: string): ProviderProfile | null {
  return readData().profiles.find((p) => p.userId === userId) ?? null;
}

export function updateProfile(
  userId: string,
  patch: Partial<ProviderProfile>
): ProviderProfile | null {
  return mutate((d) => {
    const p = d.profiles.find((x) => x.userId === userId);
    if (!p) return null;
    // Protect server-controlled fields from client overwrites.
    const { backgroundCheck, isVerified, userId: _uid, ...safe } = patch;
    Object.assign(p, safe);
    p.updatedAt = now();
    return p;
  });
}

// ---------- Background checks ----------

export function submitBackgroundCheck(userId: string): ProviderProfile | null {
  return mutate((d) => {
    const p = d.profiles.find((x) => x.userId === userId);
    if (!p) return null;
    p.backgroundCheck = {
      status: 'pending',
      submittedAt: now(),
      decidedAt: null,
      reference: 'BGC-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
      note: 'Submitted to screening partner. Typical turnaround 1-2 business days.',
    };
    p.updatedAt = now();
    return p;
  });
}

export function decideBackgroundCheck(
  userId: string,
  approve: boolean,
  note = ''
): ProviderProfile | null {
  return mutate((d) => {
    const p = d.profiles.find((x) => x.userId === userId);
    if (!p) return null;
    p.backgroundCheck.status = approve ? 'approved' : 'rejected';
    p.backgroundCheck.decidedAt = now();
    p.backgroundCheck.note = note || (approve ? 'Cleared by screening partner.' : 'Did not pass screening.');
    p.isVerified = approve;
    p.updatedAt = now();
    return p;
  });
}

// ---------- Ratings ----------

export function providerRating(userId: string): { avg: number; count: number } {
  const reviews = readData().reviews.filter((r) => r.providerId === userId);
  if (reviews.length === 0) return { avg: 0, count: 0 };
  const sum = reviews.reduce((s, r) => s + r.rating, 0);
  return { avg: Math.round((sum / reviews.length) * 10) / 10, count: reviews.length };
}

export function reviewsForProvider(userId: string): Review[] {
  return readData()
    .reviews.filter((r) => r.providerId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ---------- Public provider view (joins user + profile + rating) ----------

export interface PublicProvider {
  id: string;
  name: string;
  avatarUrl: string;
  headline: string;
  bio: string;
  hourlyRate: number;
  yearsExperience: number;
  teamSize: number;
  isTeam: boolean;
  services: string[];
  serviceRadiusMiles: number;
  city: string;
  state: string;
  photos: string[];
  isVerified: boolean;
  acceptingJobs: boolean;
  insured: boolean;
  suppliesIncluded: boolean;
  rating: number;
  reviewCount: number;
  lat: number | null;
  lng: number | null;
  distanceMiles?: number;
}

function toPublicProvider(profile: ProviderProfile, user: User): PublicProvider {
  const { avg, count } = providerRating(user.id);
  return {
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl,
    headline: profile.headline,
    bio: profile.bio,
    hourlyRate: profile.hourlyRate,
    yearsExperience: profile.yearsExperience,
    teamSize: profile.teamSize,
    isTeam: profile.isTeam,
    services: profile.services,
    serviceRadiusMiles: profile.serviceRadiusMiles,
    city: profile.city,
    state: profile.state,
    photos: profile.photos,
    isVerified: profile.isVerified,
    acceptingJobs: profile.acceptingJobs,
    insured: profile.insured,
    suppliesIncluded: profile.suppliesIncluded,
    rating: avg,
    reviewCount: count,
    lat: profile.lat,
    lng: profile.lng,
  };
}

export function getPublicProvider(userId: string): PublicProvider | null {
  const data = readData();
  const profile = data.profiles.find((p) => p.userId === userId);
  const user = data.users.find((u) => u.id === userId);
  if (!profile || !user) return null;
  return toPublicProvider(profile, user);
}

export interface SearchParams {
  lat?: number | null;
  lng?: number | null;
  service?: string;
  maxPrice?: number;
  minRating?: number;
  verifiedOnly?: boolean;
  sort?: 'distance' | 'rating' | 'price';
  query?: string;
}

// Only verified, accepting providers are discoverable by customers.
export function searchProviders(params: SearchParams): PublicProvider[] {
  const data = readData();
  let list = data.profiles
    .map((p) => {
      const user = data.users.find((u) => u.id === p.userId);
      return user ? toPublicProvider(p, user) : null;
    })
    .filter((p): p is PublicProvider => p !== null)
    .filter((p) => p.isVerified); // gate on background check

  if (params.lat != null && params.lng != null) {
    const lat = params.lat;
    const lng = params.lng;
    list = list.map((p) => {
      if (p.lat != null && p.lng != null) {
        p.distanceMiles = Math.round(haversineMiles(lat, lng, p.lat, p.lng) * 10) / 10;
      }
      return p;
    });
    // If a provider has a location, only show them when the customer is
    // within their service radius.
    list = list.filter((p) => p.distanceMiles == null || p.distanceMiles <= p.serviceRadiusMiles);
  }

  if (params.service) list = list.filter((p) => p.services.includes(params.service!));
  if (params.maxPrice) list = list.filter((p) => p.hourlyRate <= params.maxPrice!);
  if (params.minRating) list = list.filter((p) => p.rating >= params.minRating!);
  if (params.verifiedOnly) list = list.filter((p) => p.isVerified);
  if (params.query) {
    const q = params.query.toLowerCase();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.headline.toLowerCase().includes(q) ||
        p.bio.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q)
    );
  }

  const sort = params.sort ?? (params.lat != null ? 'distance' : 'rating');
  list.sort((a, b) => {
    if (sort === 'distance') {
      return (a.distanceMiles ?? Infinity) - (b.distanceMiles ?? Infinity);
    }
    if (sort === 'price') return a.hourlyRate - b.hourlyRate;
    return b.rating - a.rating || b.reviewCount - a.reviewCount;
  });

  return list;
}

// ---------- Jobs ----------

export type CreateJobInput = Omit<
  Job,
  'id' | 'status' | 'createdAt' | 'acceptedAt' | 'completedAt' | 'declineReason'
>;

export function createJob(input: CreateJobInput): Job {
  const job: Job = {
    ...input,
    id: id(),
    status: 'requested',
    createdAt: now(),
    acceptedAt: null,
    completedAt: null,
    declineReason: '',
  };
  mutate((d) => d.jobs.push(job));
  return job;
}

export function getJob(jobId: string): Job | null {
  return readData().jobs.find((j) => j.id === jobId) ?? null;
}

export function jobsForCustomer(customerId: string): Job[] {
  return readData()
    .jobs.filter((j) => j.customerId === customerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function jobsForProvider(providerId: string): Job[] {
  return readData()
    .jobs.filter((j) => j.providerId === providerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

const ALLOWED_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  requested: ['accepted', 'declined', 'cancelled'],
  accepted: ['in_progress', 'cancelled', 'completed'],
  in_progress: ['completed', 'cancelled'],
  declined: [],
  completed: [],
  cancelled: [],
};

export function transitionJob(
  jobId: string,
  to: JobStatus,
  extra: { declineReason?: string } = {}
): Job | null {
  return mutate((d) => {
    const job = d.jobs.find((j) => j.id === jobId);
    if (!job) return null;
    if (!ALLOWED_TRANSITIONS[job.status].includes(to)) return null;
    job.status = to;
    if (to === 'accepted') job.acceptedAt = now();
    if (to === 'completed') job.completedAt = now();
    if (to === 'declined') job.declineReason = extra.declineReason ?? '';
    return job;
  });
}

// ---------- Reviews ----------

export function createReview(input: {
  jobId: string;
  customerId: string;
  providerId: string;
  rating: number;
  comment: string;
}): Review | { error: string } {
  const data = readData();
  const job = data.jobs.find((j) => j.id === input.jobId);
  if (!job) return { error: 'Job not found' };
  if (job.customerId !== input.customerId) return { error: 'Not your job' };
  if (job.status !== 'completed') return { error: 'You can only review completed jobs' };
  if (data.reviews.some((r) => r.jobId === input.jobId)) {
    return { error: 'You already reviewed this job' };
  }
  const review: Review = {
    id: id(),
    jobId: input.jobId,
    customerId: input.customerId,
    providerId: input.providerId,
    rating: Math.max(1, Math.min(5, Math.round(input.rating))),
    comment: input.comment.trim(),
    createdAt: now(),
  };
  mutate((d) => d.reviews.push(review));
  return review;
}

export function reviewForJob(jobId: string): Review | null {
  return readData().reviews.find((r) => r.jobId === jobId) ?? null;
}

// ---------- Admin listing ----------

export function allProvidersForAdmin() {
  const data = readData();
  return data.profiles
    .map((p) => {
      const user = data.users.find((u) => u.id === p.userId);
      if (!user) return null;
      const { avg, count } = providerRating(user.id);
      return {
        userId: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        city: p.city,
        state: p.state,
        hourlyRate: p.hourlyRate,
        services: p.services,
        backgroundCheck: p.backgroundCheck,
        isVerified: p.isVerified,
        rating: avg,
        reviewCount: count,
        createdAt: p.createdAt,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ---------- Seed demo data ----------

export { seedIfEmpty } from './seed';
