'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import { Avatar, Button, Card, Field, Spinner } from '@/components/ui';
import {
  SERVICES,
  CHECKLIST_TASKS,
  ADD_ONS,
  PROPERTY_TYPES,
  TIME_WINDOWS,
  RECURRING_OPTIONS,
} from '@/lib/marketplace/constants';
import { estimateJob, PLATFORM_FEE_RATE } from '@/lib/marketplace/pricing';
import { api, fetchMe, getJSON, SessionUser } from '@/lib/marketplace/client';
import type { PublicProvider } from '@/lib/marketplace/db';

export default function BookPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [provider, setProvider] = useState<PublicProvider | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [serviceType, setServiceType] = useState('standard');
  const [propertyType, setPropertyType] = useState('house');
  const [bedrooms, setBedrooms] = useState(2);
  const [bathrooms, setBathrooms] = useState(1);
  const [squareFeet, setSquareFeet] = useState(0);
  const [tasks, setTasks] = useState<string[]>(['dusting', 'vacuum', 'mop', 'bathroom_scrub', 'trash']);
  const [addOns, setAddOns] = useState<string[]>([]);
  const [address, setAddress] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledWindow, setScheduledWindow] = useState('morning');
  const [recurring, setRecurring] = useState('none');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    Promise.all([
      getJSON<{ provider: PublicProvider; error?: string }>(`/api/providers/${id}`),
      fetchMe(),
    ])
      .then(([p, me]) => {
        if (p.provider) {
          setProvider(p.provider);
          if (p.provider.services.length) setServiceType(p.provider.services[0]);
        }
        setUser(me.user);
        if (me.user?.address) setAddress(me.user.address);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const estimate = useMemo(
    () =>
      provider
        ? estimateJob({ hourlyRate: provider.hourlyRate, serviceType, bedrooms, bathrooms, squareFeet, addOns })
        : null,
    [provider, serviceType, bedrooms, bathrooms, squareFeet, addOns]
  );

  function toggle(list: string[], setList: (v: string[]) => void, key: string) {
    setList(list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!user) {
      router.push(`/login?next=/book/${id}`);
      return;
    }
    if (user.role !== 'customer') {
      setError('Only customer accounts can book cleanings.');
      return;
    }
    setSubmitting(true);
    const { ok, data } = await api('/api/jobs', {
      method: 'POST',
      body: JSON.stringify({
        providerId: id,
        serviceType,
        propertyType,
        bedrooms,
        bathrooms,
        squareFeet,
        tasks,
        addOns,
        address,
        scheduledDate,
        scheduledWindow,
        recurring,
        notes,
        lat: user.lat,
        lng: user.lng,
      }),
    });
    setSubmitting(false);
    if (!ok) {
      setError(data?.error ?? 'Could not create booking');
      return;
    }
    router.push('/dashboard/customer?booked=1');
    router.refresh();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Nav />
        <Spinner />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Nav />
        <Card className="mx-auto mt-16 max-w-md p-10 text-center">
          <p className="text-lg font-medium text-gray-700">This cleaner isn't available.</p>
          <div className="mt-4">
            <Button href="/cleaners">Back to search</Button>
          </div>
        </Card>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <a href={`/cleaners/${id}`} className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to profile
        </a>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Book {provider.name}</h1>

        <form onSubmit={submit} className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Service */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900">What kind of clean?</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {SERVICES.filter((s) => provider.services.includes(s.key)).map((s) => (
                  <label
                    key={s.key}
                    className={`cursor-pointer rounded-xl border p-3 text-sm ${serviceType === s.key ? 'border-teal-500 bg-teal-50' : 'border-gray-200'}`}
                  >
                    <input
                      type="radio"
                      name="service"
                      className="sr-only"
                      checked={serviceType === s.key}
                      onChange={() => setServiceType(s.key)}
                    />
                    <span className="font-semibold text-gray-900">{s.label}</span>
                    <p className="mt-0.5 text-xs text-gray-500">{s.description}</p>
                  </label>
                ))}
              </div>
            </Card>

            {/* Property */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900">About the property</h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <Field label="Property type">
                  <select className="input" value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
                    {PROPERTY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t[0].toUpperCase() + t.slice(1)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Approx. square feet" hint="Optional — improves the estimate.">
                  <input
                    className="input"
                    type="number"
                    min={0}
                    value={squareFeet || ''}
                    onChange={(e) => setSquareFeet(Number(e.target.value))}
                  />
                </Field>
                <Field label="Bedrooms">
                  <input className="input" type="number" min={0} value={bedrooms} onChange={(e) => setBedrooms(Number(e.target.value))} />
                </Field>
                <Field label="Bathrooms">
                  <input className="input" type="number" min={0} value={bathrooms} onChange={(e) => setBathrooms(Number(e.target.value))} />
                </Field>
              </div>
            </Card>

            {/* Checklist */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900">What needs doing?</h2>
              <p className="text-sm text-gray-500">Check everything you'd like included.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {CHECKLIST_TASKS.map((t) => (
                  <label key={t.key} className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm">
                    <input type="checkbox" checked={tasks.includes(t.key)} onChange={() => toggle(tasks, setTasks, t.key)} className="h-4 w-4 accent-teal-600" />
                    <span className="text-gray-700">{t.label}</span>
                  </label>
                ))}
              </div>
            </Card>

            {/* Add-ons */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900">Add-ons</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {ADD_ONS.map((a) => (
                  <label key={a.key} className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${addOns.includes(a.key) ? 'border-teal-500 bg-teal-50' : 'border-gray-200'}`}>
                    <span className="flex items-center gap-2">
                      <input type="checkbox" checked={addOns.includes(a.key)} onChange={() => toggle(addOns, setAddOns, a.key)} className="h-4 w-4 accent-teal-600" />
                      <span className="text-gray-700">{a.label}</span>
                    </span>
                    <span className="font-medium text-gray-500">+${a.price}</span>
                  </label>
                ))}
              </div>
            </Card>

            {/* Schedule & address */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900">When &amp; where</h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <Field label="Service address">
                  <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, Austin, TX" required />
                </Field>
                <Field label="Date">
                  <input className="input" type="date" min={today} value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} required />
                </Field>
                <Field label="Preferred time">
                  <select className="input" value={scheduledWindow} onChange={(e) => setScheduledWindow(e.target.value)}>
                    {TIME_WINDOWS.map((w) => (
                      <option key={w} value={w}>
                        {w[0].toUpperCase() + w.slice(1)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Repeat">
                  <select className="input" value={recurring} onChange={(e) => setRecurring(e.target.value)}>
                    {RECURRING_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r === 'none' ? 'One-time' : r[0].toUpperCase() + r.slice(1)}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="mt-4">
                <Field label="Notes for the cleaner" hint="Gate codes, pets, parking, special requests…">
                  <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </Field>
              </div>
            </Card>
          </div>

          {/* Summary */}
          <div>
            <Card className="sticky top-20 p-6">
              <div className="flex items-center gap-3">
                <Avatar src={provider.avatarUrl} name={provider.name} size={44} />
                <div>
                  <p className="font-semibold text-gray-900">{provider.name}</p>
                  <p className="text-sm text-gray-500">${provider.hourlyRate}/hr</p>
                </div>
              </div>

              {estimate && (
                <div className="mt-5 space-y-2 border-t border-gray-100 pt-4 text-sm">
                  <Row label={`Labor (${estimate.hours} hrs)`} value={`$${estimate.labor.toFixed(2)}`} />
                  {estimate.addOnTotal > 0 && <Row label="Add-ons" value={`$${estimate.addOnTotal.toFixed(2)}`} />}
                  <Row label={`Service fee (${Math.round(PLATFORM_FEE_RATE * 100)}%)`} value={`$${estimate.platformFee.toFixed(2)}`} />
                  <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-bold text-gray-900">
                    <span>Estimated total</span>
                    <span>${estimate.total.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-gray-400">Final price confirmed when the cleaner accepts.</p>
                </div>
              )}

              {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

              <div className="mt-5">
                <Button type="submit" full disabled={submitting}>
                  {submitting ? 'Sending request…' : user ? 'Request booking' : 'Log in to book'}
                </Button>
              </div>
              <p className="mt-3 text-center text-xs text-gray-400">
                No charge until {provider.name.split(' ')[0]} accepts your request.
              </p>
            </Card>
          </div>
        </form>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-gray-600">
      <span>{label}</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  );
}
