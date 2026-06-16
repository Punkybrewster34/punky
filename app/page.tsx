import Link from 'next/link';
import Nav from '@/components/Nav';
import { seedIfEmpty } from '@/lib/marketplace/db';

export default function Home() {
  // Populate demo cleaners on first visit so the marketplace is never empty.
  seedIfEmpty();

  return (
    <div className="min-h-screen bg-white">
      <Nav />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-teal-50 to-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">
              ✦ Every cleaner background-checked
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-gray-900 md:text-5xl">
              A spotless home from a cleaner you can <span className="text-teal-600">actually trust</span>.
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              Browse verified, reviewed local cleaners and cleaning teams near you. See their photos, bios,
              rates and real reviews — then book exactly the clean you need in minutes.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/cleaners" className="rounded-lg bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-700">
                Find a cleaner near me
              </Link>
              <Link href="/signup?role=provider" className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50">
                Become a cleaner →
              </Link>
            </div>
            <div className="mt-6 flex items-center gap-4 text-sm text-gray-500">
              <span>★★★★★ 4.9 average</span>
              <span>•</span>
              <span>Vetted &amp; insured options</span>
              <span>•</span>
              <span>Pay only when accepted</span>
            </div>
          </div>
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=900&q=80"
              alt="A sparkling clean home"
              className="aspect-[4/3] w-full rounded-3xl object-cover shadow-xl"
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-3xl font-bold text-gray-900">How HavenClean works</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            {
              n: '1',
              t: 'Find trusted cleaners nearby',
              d: 'Share your location and browse background-checked cleaners close to you, sorted by distance, rating and price.',
            },
            {
              n: '2',
              t: 'Tell them what you need',
              d: 'Pick your service, check off the exact tasks, add extras like inside-the-fridge, and get an upfront price estimate.',
            },
            {
              n: '3',
              t: 'They accept, you relax',
              d: 'Your chosen cleaner accepts the job, arrives on schedule, and you leave a review to help the next person.',
            },
          ].map((s) => (
            <div key={s.n} className="rounded-2xl border border-gray-200 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-600 font-bold text-white">
                {s.n}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">{s.t}</h3>
              <p className="mt-2 text-sm text-gray-600">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust section */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Trust, built in.</h2>
            <ul className="mt-6 space-y-4">
              {[
                ['Background checks', 'Every cleaner passes screening before they can appear in search.'],
                ['Real reviews', 'Ratings come only from customers with completed jobs — no fakes.'],
                ['Transparent pricing', 'See the hourly rate and a full estimate before you book.'],
                ['You choose', 'Pick the exact cleaner or team whose photos, bio and reviews you trust.'],
              ].map(([t, d]) => (
                <li key={t} className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">✓</span>
                  <span>
                    <strong className="text-gray-900">{t}.</strong> <span className="text-gray-600">{d}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-8">
            <h3 className="text-xl font-semibold text-gray-900">Cleaners: grow your business</h3>
            <p className="mt-2 text-gray-600">
              Set your own rates and schedule, show off your work with photos, and get matched with customers
              nearby. Keep more of what you earn.
            </p>
            <div className="mt-6">
              <Link href="/signup?role=provider" className="rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-black">
                Apply to clean with us
              </Link>
            </div>
            <p className="mt-4 text-xs text-gray-500">Free to join • Get verified in 1–2 days</p>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-200 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-gray-500 sm:flex-row">
          <span>© {new Date().getFullYear()} HavenClean. All rights reserved.</span>
          <div className="flex gap-5">
            <Link href="/cleaners" className="hover:text-gray-700">Find a cleaner</Link>
            <Link href="/signup?role=provider" className="hover:text-gray-700">Become a cleaner</Link>
            <Link href="/login" className="hover:text-gray-700">Log in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
