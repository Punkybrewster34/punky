import React, { useEffect, useMemo, useState } from 'react';
import { SERVICES, serviceLabel } from '../lib/marketplace/constants';
import { lookupZip, DEFAULT_LOCATION } from '../lib/marketplace/geo';
import * as db from './store';
import type { PUser, PublicProvider } from './store';
import {
  Avatar, Badge, Btn, Card, Stars, RatingBars, TierBadge, Verified, Empty,
  useRoute, go, input, windowLabel,
} from './ui';
import { Booking } from './booking';
import { CustomerDash, Wallet, Login, Signup } from './account';
import { ProviderDash } from './pro';
import { Admin } from './admin';

export function App() {
  const route = useRoute();
  const [me, setMe] = useState<PUser | null>(db.currentUser());
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
      Interactive demo · data saved only in your browser ·{' '}
      <button className="underline" onClick={() => { db.resetAll(); location.hash = '#/'; location.reload(); }}>reset demo</button>
    </div>
  );
}

function Nav({ me, refreshMe }: { me: PUser | null; refreshMe: () => void }) {
  const [bell, setBell] = useState(false);
  const notes = me ? db.notificationsFor(me.id) : [];
  const unread = notes.filter((n) => !n.read).length;
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <button onClick={() => go('#/')} className="flex items-center gap-2 font-bold text-gray-900"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white">✦</span><span className="text-lg">Haven<span className="text-teal-600">Clean</span></span></button>
        <nav className="flex items-center gap-1 text-sm sm:gap-2">
          <button onClick={() => go('#/')} className="hidden rounded-lg px-3 py-2 font-medium text-gray-600 hover:bg-gray-100 sm:block">Find a cleaner</button>
          <button onClick={() => go('#/admin')} className="hidden rounded-lg px-3 py-2 font-medium text-gray-600 hover:bg-gray-100 sm:block">Admin</button>
          {me && (
            <div className="relative">
              <button onClick={() => { setBell((b) => !b); if (!bell) db.markNotificationsRead(me.id); }} className="relative rounded-lg px-2 py-2 hover:bg-gray-100">🔔{unread > 0 && <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">{unread}</span>}</button>
              {bell && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl border border-gray-200 bg-white py-1 shadow-lg" onMouseLeave={() => setBell(false)}>
                  <p className="border-b border-gray-100 px-4 py-2 text-xs font-semibold text-gray-500">Notifications</p>
                  {notes.length === 0 ? <p className="px-4 py-3 text-sm text-gray-400">Nothing yet.</p> : notes.slice(0, 8).map((n) => (
                    <button key={n.id} onClick={() => { if (n.href) go(n.href); setBell(false); }} className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">{n.text}<span className="block text-[11px] text-gray-400">{new Date(n.at).toLocaleString()}</span></button>
                  ))}
                </div>
              )}
            </div>
          )}
          {!me && (<><button onClick={() => go('#/login')} className="rounded-lg px-3 py-2 font-medium text-gray-700 hover:bg-gray-100">Log in</button><button onClick={() => go('#/signup')} className="rounded-lg bg-teal-600 px-3.5 py-2 font-semibold text-white hover:bg-teal-700">Sign up</button></>)}
          {me && (<><button onClick={() => go(me.role === 'provider' ? '#/provider' : '#/customer')} className="rounded-lg px-3 py-2 font-medium text-gray-700 hover:bg-gray-100">{me.role === 'provider' ? 'My jobs' : 'My bookings'}</button><button onClick={() => { db.logout(); refreshMe(); go('#/'); }} className="rounded-lg px-3 py-2 font-medium text-red-600 hover:bg-red-50">Log out</button></>)}
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return <footer className="mt-10 border-t border-gray-200 py-8"><div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 text-center text-sm text-gray-400"><p>HavenClean — vetted cleaners, transparent prices, total peace of mind.</p><p className="text-xs">© {new Date().getFullYear()} HavenClean · demo build</p></div></footer>;
}

function Router({ route, me, refreshMe }: any) {
  switch (route.name) {
    case 'cleaner': return <Detail id={route.param} me={me} refreshMe={refreshMe} />;
    case 'book': return <Booking id={route.param} me={me} />;
    case 'customer': return <CustomerDash me={me} refreshMe={refreshMe} />;
    case 'provider': return <ProviderDash me={me} refreshMe={refreshMe} />;
    case 'wallet': return <Wallet me={me} refreshMe={refreshMe} />;
    case 'admin': return <Admin />;
    case 'login': return <Login refreshMe={refreshMe} />;
    case 'signup': return <Signup refreshMe={refreshMe} />;
    default: return <Browse me={me} refreshMe={refreshMe} />;
  }
}

// ---------- Browse ----------
interface Loc { lat: number; lng: number; label: string }
function Browse({ me, refreshMe }: { me: PUser | null; refreshMe: () => void }) {
  const [, tick] = useState(0);
  const [loc, setLoc] = useState<Loc>(() => { const s = localStorage.getItem('haven_loc'); if (s) try { return JSON.parse(s); } catch {} return { ...DEFAULT_LOCATION, label: `${DEFAULT_LOCATION.city}, ${DEFAULT_LOCATION.state} (sample area)` }; });
  const [zip, setZip] = useState('');
  const [service, setService] = useState('');
  const [sort, setSort] = useState('recommended');
  const [maxPrice, setMaxPrice] = useState(0);
  const [query, setQuery] = useState('');
  const [instantOnly, setInstantOnly] = useState(false);
  const [topRated, setTopRated] = useState(false);
  const [favOnly, setFavOnly] = useState(false);
  const [msg, setMsg] = useState('');
  const save = (l: Loc) => { setLoc(l); localStorage.setItem('haven_loc', JSON.stringify(l)); };

  const results = useMemo(() => db.search({ lat: loc.lat, lng: loc.lng, service: service || undefined, maxPrice: maxPrice || undefined, sort, query: query || undefined, instantOnly, topRated, favoritesOf: favOnly && me ? me.id : undefined }), [loc, service, sort, maxPrice, query, instantOnly, topRated, favOnly, me]);

  function useMyLoc() { setMsg('Locating…'); if (!navigator.geolocation) return setMsg('Geolocation not supported — enter a ZIP.'); navigator.geolocation.getCurrentPosition((p) => { save({ lat: p.coords.latitude, lng: p.coords.longitude, label: 'Your current location' }); setMsg(''); }, () => setMsg('Could not get location — enter a ZIP.')); }
  function applyZip() { const hit = lookupZip(zip); if (!hit) return setMsg(`No data for ${zip} — try 78701, 10001, 90012, 94102, 60601…`); save({ lat: hit.lat, lng: hit.lng, label: `${hit.city}, ${hit.state} ${zip}` }); setMsg(''); }
  function fav(id: string) { if (!me) return go('#/login'); db.toggleFavorite(me.id, id); refreshMe(); tick((n) => n + 1); }

  return (
    <div>
      <section className="bg-gradient-to-b from-teal-50 to-white">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">✦ Every cleaner background-checked &amp; insured</span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">A spotless home from a cleaner you can <span className="text-teal-600">actually trust</span>.</h1>
          <p className="mt-2 max-w-2xl text-gray-600">Real reviews, transparent pricing, instant booking, and the HavenClean Guarantee. Find the perfect pro near you.</p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500"><span>🛡️ Vetted &amp; insured</span><span>⚡ Instant booking</span><span>⭐ {/* avg */}4.8 avg rating</span><span>↩️ Free re-clean guarantee</span></div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <p className="text-sm text-gray-500">Showing cleaners near <span className="font-medium text-gray-700">{loc.label}</span></p>
        <Card className="mt-3 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div><span className="mb-1 block text-xs font-medium text-gray-500">Your location</span><div className="flex gap-2"><Btn variant="secondary" onClick={useMyLoc}>📍 Use my location</Btn><input className={input + ' !w-24'} placeholder="ZIP" value={zip} onChange={(e) => setZip(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && applyZip()} /><Btn variant="secondary" onClick={applyZip}>Go</Btn></div></div>
            <div><span className="mb-1 block text-xs font-medium text-gray-500">Service</span><select className={input + ' !w-40'} value={service} onChange={(e) => setService(e.target.value)}><option value="">All services</option>{SERVICES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</select></div>
            <div><span className="mb-1 block text-xs font-medium text-gray-500">Sort</span><select className={input + ' !w-40'} value={sort} onChange={(e) => setSort(e.target.value)}><option value="recommended">Recommended</option><option value="distance">Nearest</option><option value="rating">Top rated</option><option value="price">Lowest price</option></select></div>
            <div><span className="mb-1 block text-xs font-medium text-gray-500">Max $/hr</span><select className={input + ' !w-24'} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))}><option value={0}>Any</option><option value={30}>$30</option><option value={40}>$40</option><option value={50}>$50</option></select></div>
            <div className="min-w-[150px] flex-1"><span className="mb-1 block text-xs font-medium text-gray-500">Search</span><input className={input} placeholder="Name, keyword…" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip on={instantOnly} set={() => setInstantOnly((v) => !v)}>⚡ Instant Book</Chip>
            <Chip on={topRated} set={() => setTopRated((v) => !v)}>⭐ Top rated</Chip>
            {me && <Chip on={favOnly} set={() => setFavOnly((v) => !v)}>♥ Favorites</Chip>}
          </div>
          {msg && <p className="mt-2 text-xs text-amber-600">{msg}</p>}
        </Card>

        {results.length === 0 ? (
          <Empty msg="No cleaners match your filters." cta={<Btn onClick={() => { setInstantOnly(false); setTopRated(false); setFavOnly(false); setMaxPrice(0); setService(''); }}>Clear filters</Btn>} />
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((p) => {
              const faved = me?.favorites.includes(p.id);
              return (
                <Card key={p.id} className="group relative h-full overflow-hidden transition hover:shadow-md">
                  <button onClick={() => fav(p.id)} className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-lg shadow-sm">{faved ? '❤️' : '🤍'}</button>
                  <button onClick={() => go(`#/cleaner/${p.id}`)} className="block w-full text-left">
                    {p.photos[0] ? <img src={p.photos[0]} alt="" className="h-40 w-full object-cover" /> : <div className="h-40 w-full bg-gradient-to-br from-teal-100 to-teal-50" />}
                    <div className="p-4">
                      <div className="flex items-center gap-3"><Avatar src={p.avatarUrl} name={p.name} size={44} /><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="truncate font-semibold text-gray-900">{p.name}</h3>{p.isTeam && <Badge color="blue">Team of {p.teamSize}</Badge>}</div><p className="truncate text-xs text-gray-500">{p.headline}</p></div></div>
                      <div className="mt-3 flex items-center gap-2 text-sm"><Stars rating={p.rating} /><span className="text-gray-600">{p.rating > 0 ? `${p.rating} (${p.reviewCount})` : 'New'}</span><TierBadge tier={p.tier} /></div>
                      <div className="mt-3 flex flex-wrap items-center gap-2"><Verified />{p.instantBook && <Badge color="amber">⚡ Instant</Badge>}{p.insured && <Badge color="teal">Insured</Badge>}{p.distanceMiles != null && <Badge color="gray">{p.distanceMiles} mi</Badge>}</div>
                      <div className="mt-4 flex items-center justify-between"><span className="text-lg font-bold text-gray-900">${p.hourlyRate}<span className="text-sm font-normal text-gray-500">/hr</span></span><span className="text-sm font-semibold text-teal-600">View →</span></div>
                    </div>
                  </button>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
function Chip({ on, set, children }: { on: boolean; set: () => void; children: React.ReactNode }) {
  return <button onClick={set} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${on ? 'border-teal-600 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{children}</button>;
}

// ---------- Detail ----------
function Detail({ id, me, refreshMe }: { id: string; me: PUser | null; refreshMe: () => void }) {
  const [, tick] = useState(0);
  const provider = db.getProvider(id);
  const reviews = db.reviewsFor(id);
  const tags = db.tagCounts(id);
  const slots = provider ? db.availableSlots(id, 7).slice(0, 6) : [];
  const [photo, setPhoto] = useState(0);
  if (!provider || !provider.isVerified) return <Empty msg="This cleaner isn't available." />;
  const faved = me?.favorites.includes(id);
  function fav() { if (!me) return go('#/login'); db.toggleFavorite(me.id, id); refreshMe(); tick((n) => n + 1); }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <button onClick={() => go('#/')} className="text-sm text-gray-500 hover:text-gray-700">← Back to cleaners</button>
      <div className="mt-4 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {provider.photos.length > 0 && (
            <Card className="overflow-hidden">
              <img src={provider.photos[photo]} alt="" className="h-72 w-full object-cover" />
              {provider.photos.length > 1 && <div className="flex gap-2 p-3">{provider.photos.map((ph, i) => <img key={i} src={ph} alt="" onClick={() => setPhoto(i)} className={`h-16 w-20 cursor-pointer rounded-lg object-cover ${i === photo ? 'ring-2 ring-teal-500' : 'opacity-70'}`} />)}</div>}
            </Card>
          )}

          <Card className="p-6">
            <div className="flex items-start gap-4">
              <Avatar src={provider.avatarUrl} name={provider.name} size={72} />
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold text-gray-900">{provider.name}</h1><TierBadge tier={provider.tier} />{provider.isTeam && <Badge color="blue">Team of {provider.teamSize}</Badge>}</div>
                <p className="text-gray-600">{provider.headline}</p>
                <div className="mt-2 flex items-center gap-2"><Stars rating={provider.rating} /><span className="text-sm text-gray-600">{provider.rating > 0 ? `${provider.rating} · ${provider.reviewCount} reviews` : 'No reviews yet'}</span></div>
              </div>
              <button onClick={fav} className="text-2xl">{faved ? '❤️' : '🤍'}</button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2"><Verified />{provider.idVerified && <Badge color="blue">ID verified</Badge>}{provider.insured && <Badge color="teal">Insured</Badge>}{provider.instantBook && <Badge color="amber">⚡ Instant Book</Badge>}{provider.suppliesIncluded && <Badge color="gray">Brings supplies</Badge>}<Badge color="gray">{provider.yearsExperience} yrs exp</Badge>{provider.distanceMiles != null && <Badge color="gray">{provider.distanceMiles} mi</Badge>}</div>
            <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl bg-gray-50 p-3 text-center text-sm">
              <div><p className="font-bold text-gray-900">{provider.completedJobs}</p><p className="text-xs text-gray-500">jobs done</p></div>
              <div><p className="font-bold text-gray-900">~{provider.responseMins}m</p><p className="text-xs text-gray-500">response</p></div>
              <div><p className="font-bold text-gray-900">{provider.repeatRate}%</p><p className="text-xs text-gray-500">rebook rate</p></div>
            </div>
            <p className="mt-5 whitespace-pre-line text-gray-700">{provider.bio}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-sm text-gray-500">🗣️ {provider.languages.join(', ')}</div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900">Services offered</h2>
            <div className="mt-3 flex flex-wrap gap-2">{provider.services.map((s) => <Badge key={s} color="teal">{serviceLabel(s)}</Badge>)}</div>
          </Card>

          {provider.reviewCount > 0 && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900">Rating breakdown</h2>
              <div className="mt-4"><RatingBars sub={provider.subAverages} /></div>
              {tags.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{tags.slice(0, 6).map((t) => <Badge key={t.tag} color="gray">{t.tag} · {t.count}</Badge>)}</div>}
            </Card>
          )}

          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900">Reviews {provider.reviewCount > 0 && <span className="text-gray-400">({provider.reviewCount})</span>}</h2>
            {reviews.length === 0 ? <p className="mt-3 text-sm text-gray-500">No reviews yet.</p> : (
              <ul className="mt-4 space-y-4">{reviews.map((r) => (
                <li key={r.id} className="border-b border-gray-100 pb-4 last:border-0">
                  <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Stars rating={r.rating} /><span className="text-sm font-medium text-gray-700">{r.customerName}</span></div><span className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</span></div>
                  {r.tags.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1.5">{r.tags.map((t) => <span key={t} className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] text-teal-700">{t}</span>)}</div>}
                  <p className="mt-1.5 text-gray-700">{r.comment}</p>
                  {r.reply && <div className="mt-2 rounded-lg bg-gray-50 p-3 text-sm"><p className="font-semibold text-gray-700">{provider.name} replied</p><p className="text-gray-600">{r.reply.text}</p></div>}
                </li>
              ))}</ul>
            )}
          </Card>
        </div>

        <div>
          <Card className="sticky top-24 p-6">
            <div className="text-3xl font-bold text-gray-900">${provider.hourlyRate}<span className="text-base font-normal text-gray-500">/hr</span></div>
            <p className="mt-1 text-sm text-gray-500">{provider.acceptingJobs ? (provider.instantBook ? '⚡ Instant Book available' : 'Available for new jobs') : 'Not accepting jobs'}</p>
            {slots.length > 0 && (
              <div className="mt-4"><p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Next openings</p><div className="mt-2 flex flex-wrap gap-1.5">{slots.map((s) => <span key={s.date + s.window} className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600">{s.dayLabel.split(',')[0]} {windowLabel(s.window)}</span>)}</div></div>
            )}
            <div className="mt-4"><Btn full disabled={!provider.acceptingJobs} onClick={() => go(`#/book/${provider.id}`)}>{provider.acceptingJobs ? (provider.instantBook ? '⚡ Instant Book' : 'Book this cleaner') : 'Unavailable'}</Btn></div>
            <div className="mt-5 rounded-xl bg-teal-50 p-4 text-sm text-teal-800"><p className="font-semibold">🛡️ HavenClean Guarantee</p><p className="mt-1 text-teal-700">Not happy? We'll send someone to re-clean free, or refund you. Every job, every time.</p></div>
            <ul className="mt-4 space-y-1.5 text-sm text-gray-600"><li>✓ Background-checked &amp; verified</li><li>✓ Secure in-app payments</li><li>✓ Free cancellation up to 24h</li></ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
