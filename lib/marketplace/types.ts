// Domain types for the cleaning marketplace.

export type Role = 'customer' | 'provider';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  name: string;
  phone: string;
  avatarUrl: string;
  createdAt: string;
  // Customer location (captured for "find cleaners near me").
  lat: number | null;
  lng: number | null;
  address: string;
}

export type BackgroundCheckStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected';

export interface BackgroundCheck {
  status: BackgroundCheckStatus;
  submittedAt: string | null;
  decidedAt: string | null;
  reference: string | null; // mock vendor reference id
  note: string;
}

export interface ProviderProfile {
  userId: string;
  headline: string;
  bio: string;
  hourlyRate: number; // USD per hour
  yearsExperience: number;
  teamSize: number; // 1 = solo, >1 = cleaning team
  isTeam: boolean;
  services: string[]; // keys from SERVICES
  serviceRadiusMiles: number;
  // Base location the provider works out of.
  lat: number | null;
  lng: number | null;
  city: string;
  state: string;
  zip: string;
  photos: string[]; // gallery image URLs / data URLs
  backgroundCheck: BackgroundCheck;
  isVerified: boolean; // gets set true when bg check approved
  acceptingJobs: boolean;
  insured: boolean;
  suppliesIncluded: boolean;
  createdAt: string;
  updatedAt: string;
}

export type JobStatus =
  | 'requested'
  | 'accepted'
  | 'declined'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface ChecklistItem {
  key: string;
  label: string;
}

export interface Job {
  id: string;
  customerId: string;
  providerId: string;
  status: JobStatus;
  // Property details
  address: string;
  lat: number | null;
  lng: number | null;
  propertyType: string; // apartment | house | condo | office
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  // Service selection
  serviceType: string; // standard | deep | move | recurring | office
  tasks: string[]; // checklist keys selected
  addOns: string[]; // add-on keys selected
  notes: string;
  // Scheduling & money
  scheduledDate: string; // ISO date
  scheduledWindow: string; // morning | afternoon | evening
  recurring: string; // none | weekly | biweekly | monthly
  estimatedHours: number;
  estimatedPrice: number;
  // Lifecycle timestamps
  createdAt: string;
  acceptedAt: string | null;
  completedAt: string | null;
  declineReason: string;
}

export interface Review {
  id: string;
  jobId: string;
  customerId: string;
  providerId: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
}

export interface MarketplaceData {
  users: User[];
  profiles: ProviderProfile[];
  jobs: Job[];
  reviews: Review[];
  seeded: boolean;
}
