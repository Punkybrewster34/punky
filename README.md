# HavenClean — Cleaning Marketplace

A full-stack, two-sided marketplace that connects homeowners with trusted,
background-checked house cleaners and cleaning teams. Built with Next.js 14
(App Router) and TypeScript, with zero external service dependencies so it
deploys anywhere immediately.

## What it does

**For customers**
- Sign up / log in (email + password).
- Find cleaners near them — share location via the browser ("Use my location")
  or a ZIP code. Results are filtered to each cleaner's service radius and
  sorted by distance, rating, or price.
- Every cleaner card shows a photo, headline, star rating, verified badge,
  insured/supplies badges, distance, and hourly rate.
- A full profile page with photo gallery, bio, services, and real reviews.
- A booking flow: pick a service type, describe the property (type, beds,
  baths, sq ft), **check off exactly which tasks are needed**, add paid
  extras (inside fridge/oven, laundry, etc.), schedule a date/time, and set
  it to repeat. A transparent price estimate updates live.
- A dashboard to track bookings, cancel, and leave a star review after a
  completed job.

**For cleaners (providers)**
- Sign up as a provider and build a profile: photo, headline, bio, hourly
  rate, years of experience, team size (solo or team), services offered,
  service radius, base location, insured/supplies flags, and a work-photo
  gallery.
- **Submit a background check.** Until it is approved they do not appear in
  search — trust is enforced, not optional.
- A jobs dashboard to **accept or decline** incoming requests, mark jobs
  started/complete, and see customer contact details once a job is accepted.

**For admins**
- A verification console at `/admin/providers` to approve or reject
  background checks, which flips a cleaner's discoverability.

## Trust & safety model
- Cleaners are only discoverable after an admin approves their background
  check (`isVerified`).
- Reviews can only be created by the customer who owns a **completed** job,
  one review per job — no fake reviews.
- Pricing is recomputed server-side from the provider's real rate, so the
  client cannot tamper with it.
- A customer's exact street number is masked from a provider until the job is
  accepted; phone numbers are only exchanged after acceptance.
- Passwords are hashed with scrypt; sessions are HMAC-signed httpOnly cookies.

## Tech stack
- **Next.js 14** App Router (frontend + API routes in one deployable app)
- **TypeScript** + **Tailwind CSS**
- **Storage:** a single JSON file (`data/marketplace.json`) via an atomic
  read/modify/write layer. No database to provision. The entire data layer is
  funneled through `lib/marketplace/store.ts`, so swapping in Postgres/Prisma
  later means changing one file.
- No paid third-party APIs. Geocoding uses browser geolocation plus an offline
  ZIP-centroid table (`lib/marketplace/geo.ts`).

## Project layout
```
app/
  page.tsx                      Landing page
  login, signup                 Auth pages
  cleaners/                     Browse + provider detail
  book/[id]/                    Booking flow with task checklist
  dashboard/customer, provider  Role dashboards
  admin/providers/              Background-check console
  api/                          REST endpoints (auth, providers, jobs, reviews, admin)
lib/marketplace/
  types, constants, store, db   Domain model + persistence
  session, passwords            Auth
  geo, pricing, seed            Distance, estimates, demo data
components/                     Nav + UI primitives
```

## Run locally
```bash
npm install
npm run dev        # http://localhost:3000
# or production:
npm run build && npm run start
```

On first request the app seeds demo cleaners around Austin, TX so the
marketplace is never empty.

### Demo accounts (password: `password123`)
- Customer: `customer@haven.demo`
- Providers: `maria@haven.demo`, `team@brighttidy.demo`, `james@haven.demo`,
  `hello@sparklesisters.demo`
- Admin console (`/admin/providers`): password `admin123`

Try ZIP codes like `78701`, `10001`, `90012`, `94102`, `60601` on the
Find-a-cleaner page.

## Deploy
This is a standard Next.js app and runs on any Node host.

**Set these environment variables in production:**
- `SESSION_SECRET` — a long random string used to sign sessions.
- `ADMIN_PASSWORD` — the admin/verification console password.

**Hosts with a persistent disk (Render, Railway, Fly.io, a VPS):** deploy as
is — `data/marketplace.json` persists between requests.

**Serverless hosts (e.g. Vercel):** the filesystem is ephemeral, so point the
storage layer (`lib/marketplace/store.ts`) at a managed store (Postgres,
Supabase, Turso, etc.) before relying on it in production. The rest of the
codebase needs no changes.

```bash
npm run build
npm run start    # honors PORT
```
