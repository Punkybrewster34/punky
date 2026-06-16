'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Nav from '@/components/Nav';
import { Avatar, Badge, Button, Card, Spinner, Stars, VerifiedBadge } from '@/components/ui';
import { SERVICES, serviceLabel } from '@/lib/marketplace/constants';
import { lookupZip, DEFAULT_LOCATION } from '@/lib/marketplace/geo';
import { getJSON } from '@/lib/marketplace/client';
import type { PublicProvider } from '@/lib/marketplace/db';

interface Loc {
  lat: number;
  lng: number;
  label: string;
}

export default function CleanersPage() {
  const [loc, setLoc] = useState<Loc | null>(null);
  const [zip, setZip] = useState('');
  const [providers, setProviders] = useState<PublicProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [service, setService] = useState('');
  const [sort, setSort] = useState<'distance' | 'rating' | 'price'>('distance');
  const [maxPrice, setMaxPrice] = useState(0);
  const [query, setQuery] = useState('');
  const [geoMsg, setGeoMsg] = useState('');

  // Restore saved location on first load.
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('haven_loc') : null;
    if (saved) {
      try {
        setLoc(JSON.parse(saved));
        return;
      } catch {}
    }
    setLoc({ ...DEFAULT_LOCATION, label: `${DEFAULT_LOCATION.city}, ${DEFAULT_LOCATION.state} (sample area)` });
  }, []);

  const saveLoc = useCallback((l: Loc) => {
    setLoc(l);
    localStorage.setItem('haven_loc', JSON.stringify(l));
  }, []);

  function useMyLocation() {
    setGeoMsg('Locating…');
    if (!navigator.geolocation) {
      setGeoMsg('Geolocation not supported — enter a ZIP instead.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        saveLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: 'Your current location' });
        setGeoMsg('');
      },
      () => setGeoMsg('Could not get location — enter a ZIP instead.')
    );
  }

  function applyZip() {
    const hit = lookupZip(zip);
    if (!hit) {
      setGeoMsg(`We don't have ${zip} yet — try 78701, 10001, 90012, 94102, 60601…`);
      return;
    }
    saveLoc({ lat: hit.lat, lng: hit.lng, label: `${hit.city}, ${hit.state} ${zip}` });
    setGeoMsg('');
  }

  // Fetch providers whenever filters or location change.
  useEffect(() => {
    if (!loc) return;
    setLoading(true);
    const qs = new URLSearchParams();
    qs.set('lat', String(loc.lat));
    qs.set('lng', String(loc.lng));
    qs.set('sort', sort);
    if (service) qs.set('service', service);
    if (maxPrice) qs.set('maxPrice', String(maxPrice));
    if (query) qs.set('query', query);
    getJSON<{ providers: PublicProvider[] }>(`/api/providers?${qs.toString()}`)
      .then((d) => setProviders(d.providers ?? []))
      .finally(() => setLoading(false));
  }, [loc, service, sort, maxPrice, query]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900">Cleaners near you</h1>
        <p className="mt-1 text-gray-500">
          Showing background-checked cleaners around{' '}
          <span className="font-medium text-gray-700">{loc?.label ?? '…'}</span>
        </p>

        {/* Location + filters */}
        <Card className="mt-5 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <span className="mb-1 block text-xs font-medium text-gray-500">Your location</span>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={useMyLocation}>
                  📍 Use my location
                </Button>
                <input
                  className="input !w-28"
                  placeholder="ZIP code"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyZip()}
                />
                <Button variant="secondary" onClick={applyZip}>
                  Go
                </Button>
              </div>
            </div>
            <div>
              <span className="mb-1 block text-xs font-medium text-gray-500">Service</span>
              <select className="input !w-44" value={service} onChange={(e) => setService(e.target.value)}>
                <option value="">All services</option>
                {SERVICES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="mb-1 block text-xs font-medium text-gray-500">Sort by</span>
              <select className="input !w-36" value={sort} onChange={(e) => setSort(e.target.value as any)}>
                <option value="distance">Nearest</option>
                <option value="rating">Top rated</option>
                <option value="price">Lowest price</option>
              </select>
            </div>
            <div>
              <span className="mb-1 block text-xs font-medium text-gray-500">Max $/hr</span>
              <select className="input !w-28" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))}>
                <option value={0}>Any</option>
                <option value={30}>$30</option>
                <option value={40}>$40</option>
                <option value={50}>$50</option>
              </select>
            </div>
            <div className="flex-1 min-w-[160px]">
              <span className="mb-1 block text-xs font-medium text-gray-500">Search</span>
              <input
                className="input"
                placeholder="Name, keyword…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          {geoMsg && <p className="mt-2 text-xs text-amber-600">{geoMsg}</p>}
        </Card>

        {/* Results */}
        {loading ? (
          <Spinner />
        ) : providers.length === 0 ? (
          <Card className="mt-6 p-10 text-center">
            <p className="text-lg font-medium text-gray-700">No cleaners match your filters.</p>
            <p className="mt-1 text-sm text-gray-500">Try widening your search, changing location, or raising the price.</p>
          </Card>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {providers.map((p) => (
              <Link key={p.id} href={`/cleaners/${p.id}`}>
                <Card className="h-full overflow-hidden transition hover:shadow-md">
                  {p.photos[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.photos[0]} alt="" className="h-40 w-full object-cover" />
                  ) : (
                    <div className="h-40 w-full bg-gradient-to-br from-teal-100 to-teal-50" />
                  )}
                  <div className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar src={p.avatarUrl} name={p.name} size={44} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate font-semibold text-gray-900">{p.name}</h3>
                          {p.isTeam && <Badge color="blue">Team of {p.teamSize}</Badge>}
                        </div>
                        <p className="truncate text-xs text-gray-500">{p.headline}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-sm">
                      <Stars rating={p.rating} />
                      <span className="text-gray-600">
                        {p.rating > 0 ? `${p.rating} (${p.reviewCount})` : 'New'}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <VerifiedBadge />
                      {p.insured && <Badge color="teal">Insured</Badge>}
                      {p.distanceMiles != null && <Badge color="gray">{p.distanceMiles} mi away</Badge>}
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-lg font-bold text-gray-900">
                        ${p.hourlyRate}
                        <span className="text-sm font-normal text-gray-500">/hr</span>
                      </span>
                      <span className="text-sm font-semibold text-teal-600">View profile →</span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
