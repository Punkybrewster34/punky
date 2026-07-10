import crypto from 'crypto';
import { readData, writeData } from './store';
import { hashPassword } from './passwords';
import { ProviderProfile, User, Review } from './types';

// Idempotent demo seed: verified cleaners around Austin, TX with photos,
// bios, and reviews so the marketplace looks alive on first launch.
// Demo password for every seeded account is "password123".

function iso(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 86400000).toISOString();
}

interface SeedSpec {
  name: string;
  email: string;
  avatar: string;
  headline: string;
  bio: string;
  rate: number;
  years: number;
  team: number;
  services: string[];
  lat: number;
  lng: number;
  city: string;
  state: string;
  zip: string;
  photos: string[];
  insured: boolean;
  reviews: { rating: number; comment: string; daysAgo: number; by: string }[];
}

const SPECS: SeedSpec[] = [
  {
    name: 'Maria Sanchez',
    email: 'maria@haven.demo',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop',
    headline: 'Detail-obsessed solo cleaner • 8 yrs experience',
    bio: "Hi! I'm Maria. I treat every home like my own and never cut corners. I specialize in deep cleans and move-outs, bring my own eco-friendly supplies, and always send a before/after photo set when I'm done.",
    rate: 38,
    years: 8,
    team: 1,
    services: ['standard', 'deep', 'move', 'recurring'],
    lat: 30.2452,
    lng: -97.7656,
    city: 'Austin',
    state: 'TX',
    zip: '78704',
    photos: [
      'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800',
      'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=800',
    ],
    insured: true,
    reviews: [
      { rating: 5, comment: 'Maria is incredible. My apartment has never been this clean!', daysAgo: 6, by: 'Jordan P.' },
      { rating: 5, comment: 'Super thorough and so kind. Booking again next week.', daysAgo: 20, by: 'Alex R.' },
      { rating: 4, comment: 'Great deep clean, arrived right on time.', daysAgo: 41, by: 'Sam T.' },
    ],
  },
  {
    name: 'Bright & Tidy Team',
    email: 'team@brighttidy.demo',
    avatar: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=400&h=400&fit=crop',
    headline: '3-person crew • Same-day availability',
    bio: 'We are a fully insured 3-person team that can turn around even the biggest homes fast. Perfect for large houses, offices, and tight move-out deadlines. Uniformed, vetted, and background-checked staff only.',
    rate: 30,
    years: 5,
    team: 3,
    services: ['standard', 'deep', 'office', 'move'],
    lat: 30.2711,
    lng: -97.7437,
    city: 'Austin',
    state: 'TX',
    zip: '78701',
    photos: [
      'https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=800',
      'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=800',
    ],
    insured: true,
    reviews: [
      { rating: 5, comment: 'Whole team showed up and knocked out our 4-bed in 2 hours. Amazing.', daysAgo: 3, by: 'Priya M.' },
      { rating: 5, comment: 'We use them for our office every week. Reliable and professional.', daysAgo: 12, by: 'Devon K.' },
      { rating: 4, comment: 'Good value for a team this size.', daysAgo: 30, by: 'Chris L.' },
      { rating: 5, comment: 'Move-out clean got our full deposit back!', daysAgo: 55, by: 'Taylor W.' },
    ],
  },
  {
    name: 'James Okafor',
    email: 'james@haven.demo',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
    headline: 'Eco-friendly cleaning • Pet-friendly homes',
    bio: 'I use only non-toxic, pet-safe products and love working in homes with furry family members. Reliable, quiet, and respectful of your space. Recurring clients get priority scheduling.',
    rate: 42,
    years: 6,
    team: 1,
    services: ['standard', 'deep', 'recurring'],
    lat: 30.2061,
    lng: -97.7969,
    city: 'Austin',
    state: 'TX',
    zip: '78745',
    photos: ['https://images.unsplash.com/photo-1563453392212-326f5e854473?w=800'],
    insured: false,
    reviews: [
      { rating: 5, comment: 'Finally a cleaner who is great with my two dogs. Highly recommend.', daysAgo: 9, by: 'Morgan D.' },
      { rating: 5, comment: 'Loved the green products, no harsh smell at all.', daysAgo: 25, by: 'Riley S.' },
    ],
  },
  {
    name: 'Sparkle Sisters',
    email: 'hello@sparklesisters.demo',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop',
    headline: '2-person team • Recurring specialists',
    bio: 'Sisters who have been cleaning Austin homes together for a decade. We are fast, consistent, and bring all supplies. Ask about our weekly and bi-weekly maintenance plans at a reduced rate.',
    rate: 34,
    years: 10,
    team: 2,
    services: ['standard', 'recurring', 'deep'],
    lat: 30.25,
    lng: -97.75,
    city: 'Austin',
    state: 'TX',
    zip: '78704',
    photos: [
      'https://images.unsplash.com/photo-1596263576925-d4d0a1d0c0a0?w=800',
      'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?w=800',
    ],
    insured: true,
    reviews: [
      { rating: 5, comment: 'Been using them weekly for a year. Never a complaint.', daysAgo: 5, by: 'Casey H.' },
      { rating: 4, comment: 'Consistent and friendly.', daysAgo: 18, by: 'Quinn F.' },
      { rating: 5, comment: 'The bi-weekly plan is such good value.', daysAgo: 44, by: 'Avery N.' },
    ],
  },
];

export function seedIfEmpty(): void {
  const data = readData();
  if (data.seeded) return;

  // Demo customer
  const customer: User = {
    id: crypto.randomUUID(),
    email: 'customer@haven.demo',
    passwordHash: hashPassword('password123'),
    role: 'customer',
    name: 'Demo Customer',
    phone: '512-555-0100',
    avatarUrl: '',
    createdAt: iso(60),
    lat: 30.2672,
    lng: -97.7431,
    address: 'Austin, TX 78701',
  };
  data.users.push(customer);

  for (const spec of SPECS) {
    const user: User = {
      id: crypto.randomUUID(),
      email: spec.email,
      passwordHash: hashPassword('password123'),
      role: 'provider',
      name: spec.name,
      phone: '512-555-' + Math.floor(1000 + Math.random() * 8999),
      avatarUrl: spec.avatar,
      createdAt: iso(90),
      lat: spec.lat,
      lng: spec.lng,
      address: `${spec.city}, ${spec.state} ${spec.zip}`,
    };
    data.users.push(user);

    const profile: ProviderProfile = {
      userId: user.id,
      headline: spec.headline,
      bio: spec.bio,
      hourlyRate: spec.rate,
      yearsExperience: spec.years,
      teamSize: spec.team,
      isTeam: spec.team > 1,
      services: spec.services,
      serviceRadiusMiles: 25,
      lat: spec.lat,
      lng: spec.lng,
      city: spec.city,
      state: spec.state,
      zip: spec.zip,
      photos: spec.photos,
      backgroundCheck: {
        status: 'approved',
        submittedAt: iso(88),
        decidedAt: iso(86),
        reference: 'BGC-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
        note: 'Cleared by screening partner.',
      },
      isVerified: true,
      acceptingJobs: true,
      insured: spec.insured,
      suppliesIncluded: true,
      createdAt: iso(90),
      updatedAt: iso(5),
    };
    data.profiles.push(profile);

    for (const r of spec.reviews) {
      const review: Review = {
        id: crypto.randomUUID(),
        jobId: 'seed-' + crypto.randomBytes(4).toString('hex'),
        customerId: customer.id,
        providerId: user.id,
        rating: r.rating,
        comment: `${r.comment}  — ${r.by}`,
        createdAt: iso(r.daysAgo),
      };
      data.reviews.push(review);
    }
  }

  data.seeded = true;
  writeData(data);
}
