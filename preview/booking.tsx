import React, { useMemo, useState } from 'react';
import {
  SERVICES, CHECKLIST_TASKS, ADD_ONS, PROPERTY_TYPES, serviceLabel,
} from '../lib/marketplace/constants';
import * as db from './store';
import { PROMO_CODES, RECURRING_DISCOUNT, MEMBERSHIP_DISCOUNT } from './store';
import type { PUser } from './store';
import { Avatar, Badge, Btn, Card, Field, Empty, go, input, Money } from './ui';

export function Booking({ id, me }: { id: string; me: PUser | null }) {
  const provider = db.getProvider(id);
  const slots = useMemo(() => (provider ? db.availableSlots(id) : []), [id, provider]);
  const [serviceType, setServiceType] = useState(provider?.services[0] ?? 'standard');
  const [propertyType, setPropertyType] = useState('house');
  const [bedrooms, setBedrooms] = useState(2);
  const [bathrooms, setBathrooms] = useState(1);
  const [squareFeet, setSquareFeet] = useState(0);
  const [tasks, setTasks] = useState<string[]>(['dusting', 'vacuum', 'mop', 'bathroom_scrub', 'trash']);
  const [addOns, setAddOns] = useState<string[]>([]);
  const [address, setAddress] = useState(me?.address ?? '');
  const [slotKey, setSlotKey] = useState(slots[0] ? slots[0].date + '|' + slots[0].window : '');
  const [recurring, setRecurring] = useState('none');
  const [notes, setNotes] = useState('');
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState<string | null>(null);
  const [promoMsg, setPromoMsg] = useState('');
  const [useCredit, setUseCredit] = useState(true);
  const [error, setError] = useState('');

  const membershipOn = me?.membership === 'plus';
  const credit = me && useCredit ? me.wallet : 0;

  const quote = useMemo(
    () => provider ? db.buildQuote(
      { hourlyRate: provider.hourlyRate, serviceType, bedrooms, bathrooms, squareFeet, addOns },
      { recurring, membership: membershipOn, promo, credit }
    ) : null,
    [provider, serviceType, bedrooms, bathrooms, squareFeet, addOns, recurring, membershipOn, promo, credit]
  );

  if (!provider) return <Empty msg="This cleaner isn't available." />;
  const toggle = (list: string[], set: (v: string[]) => void, k: string) => set(list.includes(k) ? list.filter((x) => x !== k) : [...list, k]);

  function applyPromo() {
    const code = promoInput.trim().toUpperCase();
    if (!PROMO_CODES[code]) { setPromoMsg('Invalid code'); return; }
    setPromo(code); setPromoMsg(`${PROMO_CODES[code].label} applied!`);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!me) return go('#/login');
    if (me.role !== 'customer') return setError('Only customer accounts can book. Log in as customer@haven.demo.');
    if (!address) return setError('A service address is required');
    if (!slotKey) return setError('Please choose an available time slot');
    const [date, window] = slotKey.split('|');
    db.createJob({
      customerId: me.id, providerId: id, address, lat: me.lat, lng: me.lng, propertyType,
      bedrooms, bathrooms, squareFeet, serviceType, tasks, addOns, notes,
      scheduledDate: date, scheduledWindow: window, recurring, quote: quote!, instant: provider!.instantBook,
    });
    go('#/customer');
  }

  // group slots by day for a compact picker
  const byDay: Record<string, db.Slot[]> = {};
  slots.forEach((s) => { (byDay[s.dayLabel] ??= []).push(s); });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <button onClick={() => go(`#/cleaner/${id}`)} className="text-sm text-gray-500 hover:text-gray-700">← Back to profile</button>
      <h1 className="mt-2 text-3xl font-bold text-gray-900">Book {provider.name}</h1>
      {provider.instantBook && <p className="mt-1 inline-flex"><Badge color="amber">⚡ Instant Book — confirmed immediately, no waiting</Badge></p>}

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
                <label key={t.key} className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm"><input type="checkbox" checked={tasks.includes(t.key)} onChange={() => toggle(tasks, setTasks, t.key)} className="h-4 w-4 accent-teal-600" /><span className="text-gray-700">{t.label}</span></label>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900">Add-ons</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {ADD_ONS.map((a) => (
                <label key={a.key} className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${addOns.includes(a.key) ? 'border-teal-500 bg-teal-50' : 'border-gray-200'}`}><span className="flex items-center gap-2"><input type="checkbox" checked={addOns.includes(a.key)} onChange={() => toggle(addOns, setAddOns, a.key)} className="h-4 w-4 accent-teal-600" /><span className="text-gray-700">{a.label}</span></span><span className="font-medium text-gray-500">+${a.price}</span></label>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900">Pick an available time</h2>
            <p className="text-sm text-gray-500">These are {provider.name.split(' ')[0]}'s real open slots — booked times are hidden.</p>
            {slots.length === 0 ? (
              <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">No open slots in the next two weeks. Try another cleaner or message them.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {Object.entries(byDay).slice(0, 8).map(([day, ss]) => (
                  <div key={day}>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">{day}</p>
                    <div className="flex flex-wrap gap-2">
                      {ss.map((s) => {
                        const k = s.date + '|' + s.window;
                        const sel = slotKey === k;
                        return <button type="button" key={k} onClick={() => setSlotKey(k)} className={`rounded-lg border px-3 py-2 text-sm ${sel ? 'border-teal-600 bg-teal-600 text-white' : 'border-gray-200 text-gray-700 hover:border-teal-400'}`}>{db.WINDOWS.find((w) => w.key === s.window)?.label} <span className={sel ? 'text-teal-100' : 'text-gray-400'}>{db.WINDOWS.find((w) => w.key === s.window)?.time}</span></button>;
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Service address"><input className={input} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, Austin, TX" /></Field>
              <Field label="Make it recurring & save">
                <select className={input} value={recurring} onChange={(e) => setRecurring(e.target.value)}>
                  <option value="none">One-time</option>
                  <option value="weekly">Weekly — save {Math.round(RECURRING_DISCOUNT.weekly * 100)}%</option>
                  <option value="biweekly">Every 2 weeks — save {Math.round(RECURRING_DISCOUNT.biweekly * 100)}%</option>
                  <option value="monthly">Monthly — save {Math.round(RECURRING_DISCOUNT.monthly * 100)}%</option>
                </select>
              </Field>
            </div>
            <div className="mt-4"><Field label="Notes for the cleaner" hint="Gate codes, pets, parking…"><textarea className={input} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field></div>
          </Card>
        </div>

        {/* Sticky summary */}
        <div>
          <Card className="sticky top-24 p-6">
            <div className="flex items-center gap-3"><Avatar src={provider.avatarUrl} name={provider.name} size={44} /><div><p className="font-semibold text-gray-900">{provider.name}</p><p className="text-sm text-gray-500">${provider.hourlyRate}/hr · ⭐ {provider.rating || '—'}</p></div></div>

            <div className="mt-4">
              <div className="flex gap-2">
                <input className={input} placeholder="Promo code" value={promoInput} onChange={(e) => setPromoInput(e.target.value)} />
                <Btn variant="secondary" onClick={applyPromo}>Apply</Btn>
              </div>
              {promoMsg && <p className={`mt-1 text-xs ${promo ? 'text-emerald-600' : 'text-red-500'}`}>{promoMsg}</p>}
              <p className="mt-1 text-[11px] text-gray-400">Try SPARKLE20 · WELCOME15 · FRESHSTART</p>
            </div>

            {quote && (
              <div className="mt-5 space-y-2 border-t border-gray-100 pt-4 text-sm">
                <Row label={`Labor (${quote.hours} hrs)`} value={`$${quote.labor.toFixed(2)}`} />
                {quote.addOnTotal > 0 && <Row label="Add-ons" value={`$${quote.addOnTotal.toFixed(2)}`} />}
                {quote.discount > 0 && <Row label={`Discount (${quote.discountLabel})`} value={`−$${quote.discount.toFixed(2)}`} green />}
                <Row label={`Service fee`} value={`$${quote.platformFee.toFixed(2)}`} />
                {me && me.wallet > 0 && (
                  <label className="flex items-center justify-between gap-2 text-gray-600">
                    <span className="flex items-center gap-2"><input type="checkbox" checked={useCredit} onChange={(e) => setUseCredit(e.target.checked)} className="h-4 w-4 accent-teal-600" />Apply wallet credit</span>
                    <span className="font-medium text-emerald-600">−${quote.creditApplied.toFixed(2)}</span>
                  </label>
                )}
                <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-bold text-gray-900"><span>Total</span><Money value={quote.total} /></div>
                {!membershipOn && <p className="text-xs text-purple-600">HavenClean+ members save 10% more →</p>}
                <p className="text-xs text-gray-400">Cleaner earns ${quote.providerPayout.toFixed(2)} + any tip.</p>
              </div>
            )}
            {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <div className="mt-5"><Btn type="submit" full>{!me ? 'Log in to book' : provider.instantBook ? '⚡ Instant Book' : 'Request booking'}</Btn></div>
            <p className="mt-3 text-center text-xs text-gray-400">{provider.instantBook ? 'Confirmed instantly.' : `No charge until ${provider.name.split(' ')[0]} accepts.`} · Covered by the HavenClean Guarantee.</p>
          </Card>
        </div>
      </form>
    </div>
  );
}

function Row({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return <div className="flex justify-between text-gray-600"><span>{label}</span><span className={`font-medium ${green ? 'text-emerald-600' : 'text-gray-800'}`}>{value}</span></div>;
}
