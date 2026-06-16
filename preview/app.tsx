import React, { useEffect, useMemo, useState } from 'react';
import {
  SERVICES, CHECKLIST_TASKS, ADD_ONS, PROPERTY_TYPES, TIME_WINDOWS, RECURRING_OPTIONS,
  serviceLabel, taskLabel, addOnDef,
} from '../lib/marketplace/constants';
import { estimateJob, PLATFORM_FEE_RATE } from '../lib/marketplace/pricing';
import { lookupZip, DEFAULT_LOCATION } from '../lib/marketplace/geo';
import * as db from './store';
import type { PublicProvider } from './store';
import type { User, Job, JobStatus, Review } from '../lib/marketplace/types';

// ---------- tiny router (hash based) ----------
function useRoute() {
  const [hash, setHash] = useState(() => location.hash || '#/');
  useEffect(() => {
    const on = () => setHash(location.hash || '#/');
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const parts = hash.replace(/^#\//, '').split('/');
  return { name: parts[0] || 'home', param: parts[1] || '', raw: hash };
}
function go(path: string) {
  location.hash = path;
  window.scrollTo(0, 0);
}

// ---------- UI primitives ----------
function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  const full = Math.round(rating);
  return (
    <span className="inline-flex items-center">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 20 20" className={i <= full ? 'text-amber-400' : 'text-gray-300'} fill="currentColor">
          <path d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.78L10 14.77l-5.2 2.73.99-5.78L1.58 7.62l5.82-.85L10 1.5z" />
        </svg>
      ))}
    </span>
  );
}
function Badge({ children, color = 'gray' }: { children: React.ReactNode; color?: string }) {
  const c: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-700', green: 'bg-emerald-100 text-emerald-700',
    teal: 'bg-teal-100 text-teal-700', amber: 'bg-amber-100 text-amber-800',
    red: 'bg-red-100 text-red-700', blue: 'bg-blue-100 text-blue-700',
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${c[color]}`}>{children}</span>;
}
function Verified() {
  return <Badge color="green">✓ Background-checked</Badge>;
}
function Btn({ children, onClick, variant = 'primary', disabled, full, type = 'button' }: any) {
  const v: Record<string, string> = {
    primary: 'bg-teal-600 text-white hover:bg-teal-700 shadow-sm',
    secondary: 'bg-white text-gray-800 border border-gray-300 hover:bg-gray-50',
    danger: 'bg-white text-red-600 border border-red-200 hover:bg-red-50',
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${v[variant]} ${full ? 'w-full' : ''}`}>
      {children}
    </button>
  );
}
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-gray-200 bg-white shadow-sm ${className}`}>{children}</div>;
}
function Avatar({ src, name, size = 48 }: { src?: string; name: string; size?: number }) {
  const initials = name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  if (src) return <img src={src} alt={name} className="rounded-full object-cover bg-gray-100" style={{ width: size, height: size }} />;
  return <div className="flex items-center justify-center rounded-full bg-teal-100 font-semibold text-teal-700" style={{ width: size, height: size, fontSize: size / 2.6 }}>{initials || '?'}</div>;
}
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
    </label>
  );
}
const input = 'w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent';

// ---------- App ----------
export function App() {
  const route = useRoute();
  const [me, setMe] = useState<User | null>(db.currentUser());
  const refreshMe = () => setMe(db.currentUser());

  return (
    <div className="min-h-screen">
      <DemoBanner />
      <Nav me={me} refreshMe={refreshMe} />
      <Router route={route} me={me} refreshMe={refreshMe} />
      <Footer />
    </div>
  );
}

function DemoBanner() {
  return (
    <div className="bg-gray-900 px-4 py-1.5 text-center text-xs text-gray-300">
      Interactive demo · all data is saved only in your browser ·{' '}
      <button className="underline" onClick={() => { db.resetAll(); location.hash = '#/'; location.reload(); }}>reset demo</button>
    </div>
  );
}

function Nav({ me, refreshMe }: { me: User | null; refreshMe: () => void }) {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <button onClick={() => go('#/')} className="flex items-center gap-2 font-bold text-gray-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white">✦</span>
          <span className="text-lg">Haven<span className="text-teal-600">Clean</span></span>
        </button>
        <nav className="flex items-center gap-1 sm:gap-2 text-sm">
          <button onClick={() => go('#/')} className="hidden rounded-lg px-3 py-2 font-medium text-gray-600 hover:bg-gray-100 sm:block">Find a cleaner</button>
          <button onClick={() => go('#/admin')} className="hidden rounded-lg px-3 py-2 font-medium text-gray-600 hover:bg-gray-100 sm:block">Admin</button>
          {!me && (
            <>
              <button onClick={() => go('#/login')} className="rounded-lg px-3 py-2 font-medium text-gray-700 hover:bg-gray-100">Log in</button>
              <button onClick={() => go('#/signup')} className="rounded-lg bg-teal-600 px-3.5 py-2 font-semibold text-white hover:bg-teal-700">Sign up</button>
            </>
          )}
          {me && (
            <>
              <button onClick={() => go(me.role === 'provider' ? '#/provider' : '#/customer')} className="rounded-lg px-3 py-2 font-medium text-gray-700 hover:bg-gray-100">
                {me.role === 'provider' ? 'My jobs' : 'My bookings'}
              </button>
              <span className="hidden text-gray-400 sm:inline">·</span>
              <span className="hidden text-gray-600 sm:inline">{me.name.split(' ')[0]}</span>
              <button onClick={() => { db.logout(); refreshMe(); go('#/'); }} className="rounded-lg px-3 py-2 font-medium text-red-600 hover:bg-red-50">Log out</button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-gray-200 py-8">
      <p className="text-center text-sm text-gray-400">© {new Date().getFullYear()} HavenClean — demo build</p>
    </footer>
  );
}

function Router({ route, me, refreshMe }: { route: ReturnType<typeof useRoute>; me: User | null; refreshMe: () => void }) {
  switch (route.name) {
    case 'cleaner': return <Detail id={route.param} me={me} />;
    case 'book': return <Booking id={route.param} me={me} refreshMe={refreshMe} />;
    case 'customer': return <CustomerDash me={me} refreshMe={refreshMe} />;
    case 'provider': return <ProviderDash me={me} refreshMe={refreshMe} />;
    case 'admin': return <Admin />;
    case 'login': return <Login refreshMe={refreshMe} />;
    case 'signup': return <Signup refreshMe={refreshMe} />;
    default: return <Browse me={me} />;
  }
}

// ---------- Browse ----------
interface Loc { lat: number; lng: number; label: string }
function Browse({ me }: { me: User | null }) {
  const [loc, setLoc] = useState<Loc>(() => {
    const s = localStorage.getItem('haven_loc');
    if (s) try { return JSON.parse(s); } catch {}
    return { ...DEFAULT_LOCATION, label: `${DEFAULT_LOCATION.city}, ${DEFAULT_LOCATION.state} (sample area)` };
  });
  const [zip, setZip] = useState('');
  const [service, setService] = useState('');
  const [sort, setSort] = useState<'distance' | 'rating' | 'price'>('distance');
  const [maxPrice, setMaxPrice] = useState(0);
  const [query, setQuery] = useState('');
  const [msg, setMsg] = useState('');

  const save = (l: Loc) => { setLoc(l); localStorage.setItem('haven_loc', JSON.stringify(l)); };
  const results = useMemo(() => db.search({ lat: loc.lat, lng: loc.lng, service: service || undefined, maxPrice: maxPrice || undefined, sort, query: query || undefined }), [loc, service, sort, maxPrice, query]);

  function useMyLoc() {
    setMsg('Locating…');
    if (!navigator.geolocation) return setMsg('Geolocation not supported — enter a ZIP.');
    navigator.geolocation.getCurrentPosition(
      (p) => { save({ lat: p.coords.latitude, lng: p.coords.longitude, label: 'Your current location' }); setMsg(''); },
      () => setMsg('Could not get location — enter a ZIP.')
    );
  }
  function applyZip() {
    const hit = lookupZip(zip);
    if (!hit) return setMsg(`No data for ${zip} — try 78701, 10001, 90012, 94102, 60601…`);
    save({ lat: hit.lat, lng: hit.lng, label: `${hit.city}, ${hit.state} ${zip}` });
    setMsg('');
  }

  return (
    <div>
      <section className="bg-gradient-to-b from-teal-50 to-white">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">✦ Every cleaner background-checked</span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">A spotless home from a cleaner you can <span className="text-teal-600">actually trust</span>.</h1>
          <p className="mt-2 max-w-2xl text-gray-600">Browse verified, reviewed local cleaners near you. See photos, bios, rates and reviews — then book exactly the clean you need.</p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <p className="text-sm text-gray-500">Showing cleaners near <span className="font-medium text-gray-700">{loc.label}</span></p>
        <Card className="mt-3 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <span className="mb-1 block text-xs font-medium text-gray-500">Your location</span>
              <div className="flex gap-2">
                <Btn variant="secondary" onClick={useMyLoc}>📍 Use my location</Btn>
                <input className={input + ' !w-24'} placeholder="ZIP" value={zip} onChange={(e) => setZip(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && applyZip()} />
                <Btn variant="secondary" onClick={applyZip}>Go</Btn>
              </div>
            </div>
            <div><span className="mb-1 block text-xs font-medium text-gray-500">Service</span>
              <select className={input + ' !w-40'} value={service} onChange={(e) => setService(e.target.value)}>
                <option value="">All services</option>
                {SERVICES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div><span className="mb-1 block text-xs font-medium text-gray-500">Sort</span>
              <select className={input + ' !w-36'} value={sort} onChange={(e) => setSort(e.target.value as any)}>
                <option value="distance">Nearest</option><option value="rating">Top rated</option><option value="price">Lowest price</option>
              </select>
            </div>
            <div><span className="mb-1 block text-xs font-medium text-gray-500">Max $/hr</span>
              <select className={input + ' !w-24'} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))}>
                <option value={0}>Any</option><option value={30}>$30</option><option value={40}>$40</option><option value={50}>$50</option>
              </select>
            </div>
            <div className="min-w-[150px] flex-1"><span className="mb-1 block text-xs font-medium text-gray-500">Search</span>
              <input className={input} placeholder="Name, keyword…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          </div>
          {msg && <p className="mt-2 text-xs text-amber-600">{msg}</p>}
        </Card>

        {results.length === 0 ? (
          <Card className="mt-6 p-10 text-center"><p className="text-lg font-medium text-gray-700">No cleaners match.</p><p className="mt-1 text-sm text-gray-500">Try widening filters or changing location.</p></Card>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((p) => (
              <button key={p.id} onClick={() => go(`#/cleaner/${p.id}`)} className="text-left">
                <Card className="h-full overflow-hidden transition hover:shadow-md">
                  {p.photos[0] ? <img src={p.photos[0]} alt="" className="h-40 w-full object-cover" /> : <div className="h-40 w-full bg-gradient-to-br from-teal-100 to-teal-50" />}
                  <div className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar src={p.avatarUrl} name={p.name} size={44} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2"><h3 className="truncate font-semibold text-gray-900">{p.name}</h3>{p.isTeam && <Badge color="blue">Team of {p.teamSize}</Badge>}</div>
                        <p className="truncate text-xs text-gray-500">{p.headline}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-sm"><Stars rating={p.rating} /><span className="text-gray-600">{p.rating > 0 ? `${p.rating} (${p.reviewCount})` : 'New'}</span></div>
                    <div className="mt-3 flex flex-wrap items-center gap-2"><Verified />{p.insured && <Badge color="teal">Insured</Badge>}{p.distanceMiles != null && <Badge color="gray">{p.distanceMiles} mi</Badge>}</div>
                    <div className="mt-4 flex items-center justify-between"><span className="text-lg font-bold text-gray-900">${p.hourlyRate}<span className="text-sm font-normal text-gray-500">/hr</span></span><span className="text-sm font-semibold text-teal-600">View →</span></div>
                  </div>
                </Card>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Provider detail ----------
function Detail({ id, me }: { id: string; me: User | null }) {
  const provider = db.getProvider(id);
  const reviews = db.reviewsFor(id);
  const [photo, setPhoto] = useState(0);
  if (!provider || !provider.isVerified) return <Empty msg="This cleaner isn't available." />;
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <button onClick={() => go('#/')} className="text-sm text-gray-500 hover:text-gray-700">← Back to cleaners</button>
      <div className="mt-4 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {provider.photos.length > 0 && (
            <Card className="overflow-hidden">
              <img src={provider.photos[photo]} alt="" className="h-72 w-full object-cover" />
              {provider.photos.length > 1 && (
                <div className="flex gap-2 p-3">{provider.photos.map((ph, i) => (
                  <img key={i} src={ph} alt="" onClick={() => setPhoto(i)} className={`h-16 w-20 cursor-pointer rounded-lg object-cover ${i === photo ? 'ring-2 ring-teal-500' : 'opacity-70'}`} />
                ))}</div>
              )}
            </Card>
          )}
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <Avatar src={provider.avatarUrl} name={provider.name} size={72} />
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold text-gray-900">{provider.name}</h1>{provider.isTeam && <Badge color="blue">Team of {provider.teamSize}</Badge>}</div>
                <p className="text-gray-600">{provider.headline}</p>
                <div className="mt-2 flex items-center gap-2"><Stars rating={provider.rating} /><span className="text-sm text-gray-600">{provider.rating > 0 ? `${provider.rating} · ${provider.reviewCount} reviews` : 'No reviews yet'}</span></div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2"><Verified />{provider.insured && <Badge color="teal">Insured</Badge>}{provider.suppliesIncluded && <Badge color="gray">Brings supplies</Badge>}<Badge color="gray">{provider.yearsExperience} yrs exp</Badge>{provider.distanceMiles != null && <Badge color="gray">{provider.distanceMiles} mi</Badge>}</div>
            <p className="mt-5 whitespace-pre-line text-gray-700">{provider.bio}</p>
          </Card>
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900">Services offered</h2>
            <div className="mt-3 flex flex-wrap gap-2">{provider.services.map((s) => <Badge key={s} color="teal">{serviceLabel(s)}</Badge>)}</div>
          </Card>
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900">Reviews {provider.reviewCount > 0 && <span className="text-gray-400">({provider.reviewCount})</span>}</h2>
            {reviews.length === 0 ? <p className="mt-3 text-sm text-gray-500">No reviews yet.</p> : (
              <ul className="mt-4 space-y-4">{reviews.map((r) => (
                <li key={r.id} className="border-b border-gray-100 pb-4 last:border-0"><Stars rating={r.rating} /><p className="mt-1 text-gray-700">{r.comment}</p><p className="mt-1 text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</p></li>
              ))}</ul>
            )}
          </Card>
        </div>
        <div>
          <Card className="sticky top-24 p-6">
            <div className="text-3xl font-bold text-gray-900">${provider.hourlyRate}<span className="text-base font-normal text-gray-500">/hr</span></div>
            <p className="mt-1 text-sm text-gray-500">{provider.acceptingJobs ? 'Available for new jobs' : 'Not accepting jobs'}</p>
            <div className="mt-4"><Btn full disabled={!provider.acceptingJobs} onClick={() => go(`#/book/${provider.id}`)}>{provider.acceptingJobs ? 'Book this cleaner' : 'Unavailable'}</Btn></div>
            <ul className="mt-5 space-y-2 text-sm text-gray-600"><li>✓ Background-checked &amp; verified</li><li>✓ You only pay once they accept</li><li>✓ Free to request</li></ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ---------- Booking ----------
function Booking({ id, me, refreshMe }: { id: string; me: User | null; refreshMe: () => void }) {
  const provider = db.getProvider(id);
  const [serviceType, setServiceType] = useState(provider?.services[0] ?? 'standard');
  const [propertyType, setPropertyType] = useState('house');
  const [bedrooms, setBedrooms] = useState(2);
  const [bathrooms, setBathrooms] = useState(1);
  const [squareFeet, setSquareFeet] = useState(0);
  const [tasks, setTasks] = useState<string[]>(['dusting', 'vacuum', 'mop', 'bathroom_scrub', 'trash']);
  const [addOns, setAddOns] = useState<string[]>([]);
  const [address, setAddress] = useState(me?.address ?? '');
  const [date, setDate] = useState('');
  const [windowSel, setWindowSel] = useState('morning');
  const [recurring, setRecurring] = useState('none');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const estimate = useMemo(() => provider ? estimateJob({ hourlyRate: provider.hourlyRate, serviceType, bedrooms, bathrooms, squareFeet, addOns }) : null, [provider, serviceType, bedrooms, bathrooms, squareFeet, addOns]);
  if (!provider) return <Empty msg="This cleaner isn't available." />;

  const toggle = (list: string[], set: (v: string[]) => void, k: string) => set(list.includes(k) ? list.filter((x) => x !== k) : [...list, k]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!me) return go(`#/login`);
    if (me.role !== 'customer') return setError('Only customer accounts can book. Log in as customer@haven.demo.');
    if (!address) return setError('A service address is required');
    if (!date) return setError('Please pick a date');
    db.createJob({
      customerId: me.id, providerId: id, address, lat: me.lat, lng: me.lng, propertyType,
      bedrooms, bathrooms, squareFeet, serviceType, tasks, addOns, notes,
      scheduledDate: date, scheduledWindow: windowSel, recurring,
      estimatedHours: estimate!.hours, estimatedPrice: estimate!.total,
    });
    go('#/customer');
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <button onClick={() => go(`#/cleaner/${id}`)} className="text-sm text-gray-500 hover:text-gray-700">← Back to profile</button>
      <h1 className="mt-2 text-3xl font-bold text-gray-900">Book {provider.name}</h1>
      <form onSubmit={submit} className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900">What kind of clean?</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {SERVICES.filter((s) => provider.services.includes(s.key)).map((s) => (
                <label key={s.key} className={`cursor-pointer rounded-xl border p-3 text-sm ${serviceType === s.key ? 'border-teal-500 bg-teal-50' : 'border-gray-200'}`}>
                  <input type="radio" className="sr-only" checked={serviceType === s.key} onChange={() => setServiceType(s.key)} />
                  <span className="font-semibold text-gray-900">{s.label}</span><p className="mt-0.5 text-xs text-gray-500">{s.description}</p>
                </label>
              ))}
            </div>
          </Card>
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900">About the property</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Field label="Property type"><select className={input} value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>{PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}</select></Field>
              <Field label="Approx. square feet" hint="Optional"><input className={input} type="number" min={0} value={squareFeet || ''} onChange={(e) => setSquareFeet(Number(e.target.value))} /></Field>
              <Field label="Bedrooms"><input className={input} type="number" min={0} value={bedrooms} onChange={(e) => setBedrooms(Number(e.target.value))} /></Field>
              <Field label="Bathrooms"><input className={input} type="number" min={0} value={bathrooms} onChange={(e) => setBathrooms(Number(e.target.value))} /></Field>
            </div>
          </Card>
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900">What needs doing?</h2>
            <p className="text-sm text-gray-500">Check everything you'd like included.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {CHECKLIST_TASKS.map((t) => (
                <label key={t.key} className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm">
                  <input type="checkbox" checked={tasks.includes(t.key)} onChange={() => toggle(tasks, setTasks, t.key)} className="h-4 w-4 accent-teal-600" /><span className="text-gray-700">{t.label}</span>
                </label>
              ))}
            </div>
          </Card>
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900">Add-ons</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {ADD_ONS.map((a) => (
                <label key={a.key} className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${addOns.includes(a.key) ? 'border-teal-500 bg-teal-50' : 'border-gray-200'}`}>
                  <span className="flex items-center gap-2"><input type="checkbox" checked={addOns.includes(a.key)} onChange={() => toggle(addOns, setAddOns, a.key)} className="h-4 w-4 accent-teal-600" /><span className="text-gray-700">{a.label}</span></span>
                  <span className="font-medium text-gray-500">+${a.price}</span>
                </label>
              ))}
            </div>
          </Card>
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900">When &amp; where</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Field label="Service address"><input className={input} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, Austin, TX" /></Field>
              <Field label="Date"><input className={input} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
              <Field label="Preferred time"><select className={input} value={windowSel} onChange={(e) => setWindowSel(e.target.value)}>{TIME_WINDOWS.map((w) => <option key={w} value={w}>{w[0].toUpperCase() + w.slice(1)}</option>)}</select></Field>
              <Field label="Repeat"><select className={input} value={recurring} onChange={(e) => setRecurring(e.target.value)}>{RECURRING_OPTIONS.map((r) => <option key={r} value={r}>{r === 'none' ? 'One-time' : r[0].toUpperCase() + r.slice(1)}</option>)}</select></Field>
            </div>
            <div className="mt-4"><Field label="Notes for the cleaner" hint="Gate codes, pets, parking…"><textarea className={input} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field></div>
          </Card>
        </div>
        <div>
          <Card className="sticky top-24 p-6">
            <div className="flex items-center gap-3"><Avatar src={provider.avatarUrl} name={provider.name} size={44} /><div><p className="font-semibold text-gray-900">{provider.name}</p><p className="text-sm text-gray-500">${provider.hourlyRate}/hr</p></div></div>
            {estimate && (
              <div className="mt-5 space-y-2 border-t border-gray-100 pt-4 text-sm">
                <Row label={`Labor (${estimate.hours} hrs)`} value={`$${estimate.labor.toFixed(2)}`} />
                {estimate.addOnTotal > 0 && <Row label="Add-ons" value={`$${estimate.addOnTotal.toFixed(2)}`} />}
                <Row label={`Service fee (${Math.round(PLATFORM_FEE_RATE * 100)}%)`} value={`$${estimate.platformFee.toFixed(2)}`} />
                <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-bold text-gray-900"><span>Estimated total</span><span>${estimate.total.toFixed(2)}</span></div>
                <p className="text-xs text-gray-400">Final price confirmed when the cleaner accepts.</p>
              </div>
            )}
            {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <div className="mt-5"><Btn type="submit" full>{me ? 'Request booking' : 'Log in to book'}</Btn></div>
            <p className="mt-3 text-center text-xs text-gray-400">No charge until {provider.name.split(' ')[0]} accepts.</p>
          </Card>
        </div>
      </form>
    </div>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between text-gray-600"><span>{label}</span><span className="font-medium text-gray-800">{value}</span></div>;
}

const STATUS_META: Record<JobStatus, { label: string; color: string }> = {
  requested: { label: 'Awaiting cleaner', color: 'amber' }, accepted: { label: 'Confirmed', color: 'green' },
  in_progress: { label: 'In progress', color: 'blue' }, completed: { label: 'Completed', color: 'teal' },
  declined: { label: 'Declined', color: 'red' }, cancelled: { label: 'Cancelled', color: 'gray' },
};

// ---------- Customer dashboard ----------
function CustomerDash({ me, refreshMe }: { me: User | null; refreshMe: () => void }) {
  const [, tick] = useState(0);
  const [reviewing, setReviewing] = useState<Job | null>(null);
  if (!me) return <NeedLogin />;
  if (me.role !== 'customer') return <Empty msg="Log in as a customer to see bookings." />;
  const jobs = db.jobsForCustomer(me.id);
  const refresh = () => tick((n) => n + 1);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between"><h1 className="text-3xl font-bold text-gray-900">My bookings</h1><Btn onClick={() => go('#/')}>Book a cleaning</Btn></div>
      {jobs.length === 0 ? (
        <Card className="mt-6 p-10 text-center"><p className="text-lg font-medium text-gray-700">No bookings yet.</p><div className="mt-4"><Btn onClick={() => go('#/')}>Browse cleaners</Btn></div></Card>
      ) : (
        <div className="mt-6 space-y-4">
          {jobs.map((job) => {
            const prov = db.getProvider(job.providerId);
            const meta = STATUS_META[job.status];
            const reviewed = !!db.reviewForJob(job.id);
            return (
              <Card key={job.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3"><Avatar src={prov?.avatarUrl} name={prov?.name ?? '?'} size={48} /><div><p className="font-semibold text-gray-900">{prov?.name}</p><p className="text-sm text-gray-500">{serviceLabel(job.serviceType)} · {new Date(job.scheduledDate).toLocaleDateString()} ({job.scheduledWindow})</p></div></div>
                  <Badge color={meta.color}>{meta.label}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {job.tasks.map((t) => <span key={t} className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{taskLabel(t)}</span>)}
                  {job.addOns.map((a) => <span key={a} className="rounded-md bg-teal-50 px-2 py-0.5 text-xs text-teal-700">+ {addOnDef(a)?.label ?? a}</span>)}
                </div>
                {job.status === 'declined' && job.declineReason && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">Reason: {job.declineReason}</p>}
                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                  <span className="text-lg font-bold text-gray-900">${job.estimatedPrice.toFixed(2)}</span>
                  <div className="flex gap-2">
                    {(job.status === 'requested' || job.status === 'accepted') && <Btn variant="danger" onClick={() => { db.transitionJob(job.id, 'cancelled'); refresh(); }}>Cancel</Btn>}
                    {job.status === 'completed' && !reviewed && <Btn onClick={() => setReviewing(job)}>Leave a review</Btn>}
                    {reviewed && <Badge color="green">★ Reviewed</Badge>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {reviewing && <ReviewModal job={reviewing} onClose={() => setReviewing(null)} onDone={() => { setReviewing(null); refresh(); }} />}
    </div>
  );
}

function ReviewModal({ job, onClose, onDone }: { job: Job; onClose: () => void; onDone: () => void }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  function submit() {
    const r = db.createReview({ jobId: job.id, customerId: job.customerId, providerId: job.providerId, rating, comment });
    if ('error' in r) return setError(r.error);
    onDone();
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <Card className="w-full max-w-md p-6"><div onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-gray-900">Leave a review</h2>
        <div className="mt-4 flex items-center gap-1">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" onClick={() => setRating(n)} className="text-3xl"><span className={n <= rating ? 'text-amber-400' : 'text-gray-300'}>★</span></button>)}</div>
        <textarea className={input + ' mt-4'} rows={4} placeholder="How was your clean?" value={comment} onChange={(e) => setComment(e.target.value)} />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-2"><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn onClick={submit}>Submit review</Btn></div>
      </div></Card>
    </div>
  );
}

// ---------- Provider dashboard ----------
function ProviderDash({ me, refreshMe }: { me: User | null; refreshMe: () => void }) {
  const [tab, setTab] = useState<'jobs' | 'profile'>('jobs');
  const [, tick] = useState(0);
  if (!me) return <NeedLogin />;
  if (me.role !== 'provider') return <Empty msg="Log in as a provider (e.g. maria@haven.demo)." />;
  const profile = db.getProfile(me.id)!;
  const jobs = db.jobsForProvider(me.id);
  const refresh = () => tick((n) => n + 1);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900">Cleaner dashboard</h1>
      <VerifyBanner profile={profile} userId={me.id} refresh={refresh} />
      <div className="mt-6 flex gap-2 border-b border-gray-200">
        {(['jobs', 'profile'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${tab === t ? 'border-teal-600 text-teal-700' : 'border-transparent text-gray-500'}`}>{t === 'jobs' ? `Jobs (${jobs.length})` : 'My profile'}</button>
        ))}
      </div>
      {tab === 'jobs' ? <ProviderJobs jobs={jobs} refresh={refresh} /> : <ProfileEditor me={me} profile={profile} refresh={() => { refresh(); refreshMe(); }} />}
    </div>
  );
}

function VerifyBanner({ profile, userId, refresh }: { profile: any; userId: string; refresh: () => void }) {
  const bc = profile.backgroundCheck;
  if (profile.isVerified) return <Card className="mt-5 border-emerald-200 bg-emerald-50 p-4"><p className="font-semibold text-emerald-800">✓ You're verified and live in search.</p><p className="mt-1 text-sm text-emerald-700">Customers near you can find and book you.</p></Card>;
  if (bc.status === 'pending') return (
    <Card className="mt-5 border-amber-200 bg-amber-50 p-4"><p className="font-semibold text-amber-800">Background check in progress…</p><p className="mt-1 text-sm text-amber-700">Reference {bc.reference}. {bc.note}</p>
      <p className="mt-2 text-xs text-amber-600">Demo: an admin approves these on the Admin page — or auto-approve below.</p>
      <div className="mt-3"><Btn onClick={() => { db.decideBackgroundCheck(userId, true); refresh(); }}>Auto-approve (demo)</Btn></div>
    </Card>
  );
  return (
    <Card className="mt-5 border-teal-200 bg-teal-50 p-4"><p className="font-semibold text-teal-800">{bc.status === 'rejected' ? 'Your screening was not approved.' : 'One step left: get verified.'}</p>
      <p className="mt-1 text-sm text-teal-700">{bc.status === 'rejected' ? bc.note : 'Complete your profile, then submit a background check. You must be verified before customers can find you.'}</p>
      <div className="mt-3"><Btn onClick={() => { db.submitBackgroundCheck(userId); refresh(); }}>Submit background check</Btn></div>
    </Card>
  );
}

function ProviderJobs({ jobs, refresh }: { jobs: Job[]; refresh: () => void }) {
  function act(job: Job, to: JobStatus) {
    let reason = '';
    if (to === 'declined') reason = prompt('Optional: reason for declining') ?? '';
    db.transitionJob(job.id, to, reason); refresh();
  }
  const requests = jobs.filter((j) => j.status === 'requested');
  const active = jobs.filter((j) => j.status === 'accepted' || j.status === 'in_progress');
  const past = jobs.filter((j) => ['completed', 'declined', 'cancelled'].includes(j.status));
  if (jobs.length === 0) return <Card className="mt-6 p-10 text-center"><p className="text-lg font-medium text-gray-700">No job requests yet.</p><p className="mt-1 text-sm text-gray-500">As customer@haven.demo, book this cleaner to see a request appear here.</p></Card>;
  return (
    <div className="mt-6 space-y-8">
      {requests.length > 0 && <JobSection title={`New requests (${requests.length})`}>{requests.map((j) => <JobCard key={j.id} job={j}><Btn onClick={() => act(j, 'accepted')}>Accept job</Btn><Btn variant="danger" onClick={() => act(j, 'declined')}>Decline</Btn></JobCard>)}</JobSection>}
      {active.length > 0 && <JobSection title="Upcoming & active">{active.map((j) => <JobCard key={j.id} job={j} contact>{j.status === 'accepted' && <Btn onClick={() => act(j, 'in_progress')}>Mark started</Btn>}<Btn variant="secondary" onClick={() => act(j, 'completed')}>Mark complete</Btn></JobCard>)}</JobSection>}
      {past.length > 0 && <JobSection title="History">{past.map((j) => <JobCard key={j.id} job={j} />)}</JobSection>}
    </div>
  );
}
function JobSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-400">{title}</h2><div className="space-y-4">{children}</div></div>;
}
function JobCard({ job, children, contact }: { job: Job; children?: React.ReactNode; contact?: boolean }) {
  const meta = STATUS_META[job.status];
  const cust = db.userById(job.customerId);
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><p className="font-semibold text-gray-900">{cust?.name ?? 'Customer'}</p><p className="text-sm text-gray-500">{serviceLabel(job.serviceType)} · {new Date(job.scheduledDate).toLocaleDateString()} ({job.scheduledWindow})</p></div>
        <div className="text-right"><Badge color={meta.color}>{meta.label}</Badge><p className="mt-1 text-lg font-bold text-gray-900">${job.estimatedPrice.toFixed(2)}</p></div>
      </div>
      <div className="mt-3 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
        <div><span className="text-gray-400">Property</span><p>{job.propertyType} · {job.bedrooms} bd · {job.bathrooms} ba {job.squareFeet ? `· ${job.squareFeet} sqft` : ''}</p></div>
        <div><span className="text-gray-400">Address</span><p>{contact ? job.address : job.address.replace(/^\s*\d+\s*/, '••• ')}</p></div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">{job.tasks.map((t) => <span key={t} className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{taskLabel(t)}</span>)}{job.addOns.map((a) => <span key={a} className="rounded-md bg-teal-50 px-2 py-0.5 text-xs text-teal-700">+ {addOnDef(a)?.label ?? a}</span>)}</div>
      {job.notes && <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">“{job.notes}”</p>}
      {contact && cust?.phone && <p className="mt-3 text-sm text-gray-600">📞 <span className="font-medium text-gray-800">{cust.phone}</span></p>}
      {children && <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4">{children}</div>}
    </Card>
  );
}

function ProfileEditor({ me, profile, refresh }: { me: User; profile: any; refresh: () => void }) {
  const [form, setForm] = useState({ ...profile });
  const [avatar, setAvatar] = useState(me.avatarUrl);
  const [photoInput, setPhotoInput] = useState('');
  const [saved, setSaved] = useState(false);
  const set = (k: string, v: any) => { setForm((f: any) => ({ ...f, [k]: v })); setSaved(false); };
  const toggleService = (k: string) => set('services', form.services.includes(k) ? form.services.filter((s: string) => s !== k) : [...form.services, k]);
  function useMyLoc() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((p) => { set('lat', p.coords.latitude); set('lng', p.coords.longitude); });
  }
  function save() {
    db.updateProfile(me.id, { ...form, hourlyRate: Number(form.hourlyRate), yearsExperience: Number(form.yearsExperience), teamSize: Number(form.teamSize), isTeam: Number(form.teamSize) > 1, serviceRadiusMiles: Number(form.serviceRadiusMiles) });
    if (avatar !== me.avatarUrl) db.updateUser(me.id, { avatarUrl: avatar });
    setSaved(true); refresh();
  }
  return (
    <div className="mt-6 space-y-6">
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900">Profile photo &amp; intro</h2>
        <div className="mt-4 flex items-center gap-4"><Avatar src={avatar} name={me.name} size={64} /><div className="flex-1"><Field label="Profile photo URL"><input className={input} value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://…" /></Field></div></div>
        <div className="mt-4 space-y-4">
          <Field label="Headline"><input className={input} value={form.headline} onChange={(e) => set('headline', e.target.value)} placeholder="Detail-obsessed solo cleaner • 8 yrs" /></Field>
          <Field label="Bio"><textarea className={input} rows={5} value={form.bio} onChange={(e) => set('bio', e.target.value)} placeholder="Tell customers about your experience…" /></Field>
        </div>
      </Card>
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900">Rates &amp; experience</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Hourly rate (USD)"><input className={input} type="number" value={form.hourlyRate} onChange={(e) => set('hourlyRate', e.target.value)} /></Field>
          <Field label="Years experience"><input className={input} type="number" value={form.yearsExperience} onChange={(e) => set('yearsExperience', e.target.value)} /></Field>
          <Field label="Team size" hint="1 = solo"><input className={input} type="number" value={form.teamSize} onChange={(e) => set('teamSize', e.target.value)} /></Field>
          <Field label="Service radius (miles)"><input className={input} type="number" value={form.serviceRadiusMiles} onChange={(e) => set('serviceRadiusMiles', e.target.value)} /></Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-4">
          <Tog label="Insured" v={form.insured} on={(b) => set('insured', b)} /><Tog label="I bring supplies" v={form.suppliesIncluded} on={(b) => set('suppliesIncluded', b)} /><Tog label="Accepting new jobs" v={form.acceptingJobs} on={(b) => set('acceptingJobs', b)} />
        </div>
      </Card>
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900">Services</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">{SERVICES.map((s) => (
          <label key={s.key} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${form.services.includes(s.key) ? 'border-teal-500 bg-teal-50' : 'border-gray-200'}`}><input type="checkbox" checked={form.services.includes(s.key)} onChange={() => toggleService(s.key)} className="h-4 w-4 accent-teal-600" /><span className="text-gray-700">{s.label}</span></label>
        ))}</div>
      </Card>
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900">Where you work</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="City"><input className={input} value={form.city} onChange={(e) => set('city', e.target.value)} /></Field>
          <Field label="State"><input className={input} value={form.state} onChange={(e) => set('state', e.target.value)} /></Field>
          <Field label="ZIP"><input className={input} value={form.zip} onChange={(e) => set('zip', e.target.value)} /></Field>
        </div>
        <div className="mt-4 flex items-center gap-3"><Btn variant="secondary" onClick={useMyLoc}>📍 Set my base location</Btn><span className="text-sm text-gray-500">{form.lat != null && form.lng != null ? `${form.lat.toFixed(4)}, ${form.lng.toFixed(4)}` : 'Not set'}</span></div>
      </Card>
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900">Work photos</h2>
        <div className="mt-3 flex gap-2"><input className={input} value={photoInput} onChange={(e) => setPhotoInput(e.target.value)} placeholder="https://image-url.jpg" /><Btn variant="secondary" onClick={() => { if (photoInput.trim()) { set('photos', [...form.photos, photoInput.trim()]); setPhotoInput(''); } }}>Add</Btn></div>
        {form.photos.length > 0 && <div className="mt-4 flex flex-wrap gap-3">{form.photos.map((p: string, i: number) => (<div key={i} className="relative"><img src={p} alt="" className="h-24 w-32 rounded-lg object-cover" /><button onClick={() => set('photos', form.photos.filter((_: string, idx: number) => idx !== i))} className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white">✕</button></div>))}</div>}
      </Card>
      <div className="sticky bottom-4 flex items-center justify-end gap-3">{saved && <span className="text-sm font-medium text-emerald-600">Saved ✓</span>}<Btn onClick={save}>Save profile</Btn></div>
    </div>
  );
}
function Tog({ label, v, on }: { label: string; v: boolean; on: (b: boolean) => void }) {
  return <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={v} onChange={(e) => on(e.target.checked)} className="h-4 w-4 accent-teal-600" />{label}</label>;
}

// ---------- Admin ----------
function Admin() {
  const [, tick] = useState(0);
  const providers = db.allProviders();
  const refresh = () => tick((n) => n + 1);
  function decide(id: string, approve: boolean) {
    let note = '';
    if (!approve) note = prompt('Reason (optional)') ?? '';
    db.decideBackgroundCheck(id, approve, note); refresh();
  }
  const pending = providers.filter((p) => p.backgroundCheck.status === 'pending');
  const others = providers.filter((p) => p.backgroundCheck.status !== 'pending');
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900">Provider verification</h1>
      <p className="mt-1 text-gray-500">Approve background checks to make cleaners discoverable.</p>
      <h2 className="mt-8 text-sm font-bold uppercase tracking-wide text-gray-400">Pending review ({pending.length})</h2>
      {pending.length === 0 ? <p className="mt-2 text-sm text-gray-500">Nothing waiting. 🎉</p> : <div className="mt-3 space-y-4">{pending.map((p) => <AdminRow key={p.id} p={p} decide={decide} />)}</div>}
      <h2 className="mt-10 text-sm font-bold uppercase tracking-wide text-gray-400">All cleaners ({others.length})</h2>
      <div className="mt-3 space-y-4">{others.map((p) => <AdminRow key={p.id} p={p} decide={decide} />)}</div>
    </div>
  );
}
function AdminRow({ p, decide }: { p: PublicProvider; decide: (id: string, approve: boolean) => void }) {
  const s = p.backgroundCheck.status;
  const color = s === 'approved' ? 'green' : s === 'pending' ? 'amber' : s === 'rejected' ? 'red' : 'gray';
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-gray-900">{p.name}</p>
          <p className="text-sm text-gray-500">{p.city || '—'}, {p.state || '—'} · ${p.hourlyRate}/hr</p>
          <div className="mt-2 flex items-center gap-2 text-sm"><Stars rating={p.rating} /><span className="text-gray-500">{p.reviewCount} reviews</span></div>
        </div>
        <div className="text-right"><Badge color={color}>{s.replace('_', ' ')}</Badge>{p.backgroundCheck.reference && <p className="mt-1 text-xs text-gray-400">{p.backgroundCheck.reference}</p>}</div>
      </div>
      <div className="mt-4 flex gap-2 border-t border-gray-100 pt-4"><Btn onClick={() => decide(p.id, true)} disabled={s === 'approved'}>Approve</Btn><Btn variant="danger" onClick={() => decide(p.id, false)} disabled={s === 'rejected'}>Reject</Btn></div>
    </Card>
  );
}

// ---------- Auth ----------
function Login({ refreshMe }: { refreshMe: () => void }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const u = db.login(email);
    if (!u) return setError('No account with that email. Try a demo account below or sign up.');
    refreshMe();
    go(u.role === 'provider' ? '#/provider' : '#/');
  }
  const demos = ['customer@haven.demo', 'maria@haven.demo', 'team@brighttidy.demo'];
  return (
    <Card className="mx-auto mt-12 max-w-md p-8">
      <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
      <p className="mt-1 text-sm text-gray-500">Demo login — just enter an email (no password needed).</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label="Email"><input className={input} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="customer@haven.demo" /></Field>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <Btn type="submit" full>Log in</Btn>
      </form>
      <div className="mt-5"><p className="text-xs font-medium text-gray-500">Tap a demo account:</p><div className="mt-2 flex flex-wrap gap-2">{demos.map((d) => <button key={d} onClick={() => { db.login(d); refreshMe(); go(d.includes('customer') ? '#/' : '#/provider'); }} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">{d}</button>)}</div></div>
      <p className="mt-5 text-center text-sm text-gray-500">New here? <button onClick={() => go('#/signup')} className="font-semibold text-teal-600">Create an account</button></p>
    </Card>
  );
}
function Signup({ refreshMe }: { refreshMe: () => void }) {
  const [role, setRole] = useState<'customer' | 'provider'>('customer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = db.signup({ name, email, phone, role });
    if ('error' in r) return setError(r.error);
    refreshMe();
    go(role === 'provider' ? '#/provider' : '#/');
  }
  return (
    <Card className="mx-auto mt-12 max-w-md p-8">
      <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
      <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
        <button type="button" onClick={() => setRole('customer')} className={`rounded-lg py-2 text-sm font-semibold ${role === 'customer' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500'}`}>I need cleaning</button>
        <button type="button" onClick={() => setRole('provider')} className={`rounded-lg py-2 text-sm font-semibold ${role === 'provider' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500'}`}>I'm a cleaner</button>
      </div>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label={role === 'provider' ? 'Your name or business name' : 'Full name'}><input className={input} value={name} onChange={(e) => setName(e.target.value)} required /></Field>
        <Field label="Email"><input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
        <Field label="Phone"><input className={input} value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <Btn type="submit" full>{role === 'provider' ? 'Start cleaning' : 'Create account'}</Btn>
      </form>
      {role === 'provider' && <p className="mt-4 rounded-lg bg-teal-50 px-3 py-2 text-xs text-teal-700">Next you'll build your profile and submit a background check. You'll appear in search once approved.</p>}
    </Card>
  );
}

// ---------- helpers ----------
function Empty({ msg }: { msg: string }) {
  return <Card className="mx-auto mt-16 max-w-md p-10 text-center"><p className="text-lg font-medium text-gray-700">{msg}</p><div className="mt-4"><Btn onClick={() => go('#/')}>Back to search</Btn></div></Card>;
}
function NeedLogin() {
  return <Card className="mx-auto mt-16 max-w-md p-10 text-center"><p className="text-lg font-medium text-gray-700">Please log in first.</p><div className="mt-4 flex justify-center gap-2"><Btn onClick={() => go('#/login')}>Log in</Btn><Btn variant="secondary" onClick={() => go('#/signup')}>Sign up</Btn></div></Card>;
}
