'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import { Avatar, Badge, Button, Card, Field, Spinner, Stars } from '@/components/ui';
import { SERVICES, serviceLabel, taskLabel, addOnDef } from '@/lib/marketplace/constants';
import { api, fetchMe, getJSON, SessionUser } from '@/lib/marketplace/client';
import type { ProviderProfile, Job, JobStatus } from '@/lib/marketplace/types';

type ProviderJob = Job & { customerName: string; customerPhone: string };

export default function ProviderDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<'jobs' | 'profile'>('jobs');
  const [user, setUser] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [jobs, setJobs] = useState<ProviderJob[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const me = await fetchMe();
    if (!me.user) {
      router.push('/login?next=/dashboard/provider');
      return;
    }
    if (me.user.role !== 'provider') {
      router.push('/dashboard/customer');
      return;
    }
    setUser(me.user);
    setProfile(me.profile);
    const j = await getJSON<{ jobs: ProviderJob[] }>('/api/provider/jobs');
    setJobs(j.jobs ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (loading || !user || !profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Nav />
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900">Cleaner dashboard</h1>

        <VerificationBanner profile={profile} onChange={load} />

        <div className="mt-6 flex gap-2 border-b border-gray-200">
          {(['jobs', 'profile'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${tab === t ? 'border-teal-600 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {t === 'jobs' ? `Jobs (${jobs.length})` : 'My profile'}
            </button>
          ))}
        </div>

        {tab === 'jobs' ? (
          <JobsPanel jobs={jobs} onChange={load} />
        ) : (
          <ProfilePanel user={user} profile={profile} onChange={load} />
        )}
      </div>
    </div>
  );
}

function VerificationBanner({ profile, onChange }: { profile: ProviderProfile; onChange: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const bc = profile.backgroundCheck;

  async function submit() {
    setSubmitting(true);
    await api('/api/provider/background-check', { method: 'POST' });
    setSubmitting(false);
    onChange();
  }

  if (profile.isVerified) {
    return (
      <Card className="mt-5 border-emerald-200 bg-emerald-50 p-4">
        <p className="flex items-center gap-2 font-semibold text-emerald-800">
          ✓ You're verified and live in search.
        </p>
        <p className="mt-1 text-sm text-emerald-700">
          Customers near you can find and book you. Keep your profile sharp to win more jobs.
        </p>
      </Card>
    );
  }

  if (bc.status === 'pending') {
    return (
      <Card className="mt-5 border-amber-200 bg-amber-50 p-4">
        <p className="font-semibold text-amber-800">Background check in progress…</p>
        <p className="mt-1 text-sm text-amber-700">
          Reference {bc.reference}. {bc.note} You'll appear in search once approved.
        </p>
      </Card>
    );
  }

  return (
    <Card className="mt-5 border-teal-200 bg-teal-50 p-4">
      <p className="font-semibold text-teal-800">
        {bc.status === 'rejected' ? 'Your screening was not approved.' : 'One step left: get verified.'}
      </p>
      <p className="mt-1 text-sm text-teal-700">
        {bc.status === 'rejected'
          ? bc.note
          : 'Complete your profile, then submit a background check. You must be verified before customers can find you.'}
      </p>
      <div className="mt-3">
        <Button onClick={submit} disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit background check'}
        </Button>
      </div>
    </Card>
  );
}

function JobsPanel({ jobs, onChange }: { jobs: ProviderJob[]; onChange: () => void }) {
  async function act(job: ProviderJob, action: string) {
    let reason = '';
    if (action === 'decline') {
      reason = prompt('Optional: reason for declining') ?? '';
    }
    const { ok, data } = await api(`/api/provider/jobs/${job.id}`, {
      method: 'POST',
      body: JSON.stringify({ action, reason }),
    });
    if (!ok) alert(data?.error ?? 'Action failed');
    onChange();
  }

  const requests = jobs.filter((j) => j.status === 'requested');
  const active = jobs.filter((j) => j.status === 'accepted' || j.status === 'in_progress');
  const past = jobs.filter((j) => ['completed', 'declined', 'cancelled'].includes(j.status));

  if (jobs.length === 0) {
    return (
      <Card className="mt-6 p-10 text-center">
        <p className="text-lg font-medium text-gray-700">No job requests yet.</p>
        <p className="mt-1 text-sm text-gray-500">Once you're verified, nearby customers can request you.</p>
      </Card>
    );
  }

  return (
    <div className="mt-6 space-y-8">
      {requests.length > 0 && (
        <Section title={`New requests (${requests.length})`}>
          {requests.map((j) => (
            <JobCard key={j.id} job={j}>
              <Button onClick={() => act(j, 'accept')}>Accept job</Button>
              <Button variant="danger" onClick={() => act(j, 'decline')}>
                Decline
              </Button>
            </JobCard>
          ))}
        </Section>
      )}
      {active.length > 0 && (
        <Section title="Upcoming & active">
          {active.map((j) => (
            <JobCard key={j.id} job={j} showContact>
              {j.status === 'accepted' && <Button onClick={() => act(j, 'start')}>Mark started</Button>}
              <Button variant="secondary" onClick={() => act(j, 'complete')}>
                Mark complete
              </Button>
            </JobCard>
          ))}
        </Section>
      )}
      {past.length > 0 && (
        <Section title="History">
          {past.map((j) => (
            <JobCard key={j.id} job={j} />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-400">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

const STATUS_META: Record<JobStatus, { label: string; color: any }> = {
  requested: { label: 'New request', color: 'amber' },
  accepted: { label: 'Confirmed', color: 'green' },
  in_progress: { label: 'In progress', color: 'blue' },
  completed: { label: 'Completed', color: 'teal' },
  declined: { label: 'Declined', color: 'red' },
  cancelled: { label: 'Cancelled', color: 'gray' },
};

function JobCard({
  job,
  children,
  showContact,
}: {
  job: ProviderJob;
  children?: React.ReactNode;
  showContact?: boolean;
}) {
  const meta = STATUS_META[job.status];
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900">{job.customerName}</p>
          <p className="text-sm text-gray-500">
            {serviceLabel(job.serviceType)} · {new Date(job.scheduledDate).toLocaleDateString()} ({job.scheduledWindow})
          </p>
        </div>
        <div className="text-right">
          <Badge color={meta.color}>{meta.label}</Badge>
          <p className="mt-1 text-lg font-bold text-gray-900">${job.estimatedPrice.toFixed(2)}</p>
        </div>
      </div>

      <div className="mt-3 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
        <div>
          <span className="text-gray-400">Property</span>
          <p>
            {job.propertyType} · {job.bedrooms} bd · {job.bathrooms} ba {job.squareFeet ? `· ${job.squareFeet} sqft` : ''}
          </p>
        </div>
        <div>
          <span className="text-gray-400">Address</span>
          <p>{showContact ? job.address : maskAddress(job.address)}</p>
        </div>
      </div>

      {job.tasks.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {job.tasks.map((t) => (
            <span key={t} className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {taskLabel(t)}
            </span>
          ))}
          {job.addOns.map((a) => (
            <span key={a} className="rounded-md bg-teal-50 px-2 py-0.5 text-xs text-teal-700">
              + {addOnDef(a)?.label ?? a}
            </span>
          ))}
        </div>
      )}

      {job.notes && <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">“{job.notes}”</p>}

      {showContact && job.customerPhone && (
        <p className="mt-3 text-sm text-gray-600">
          📞 <span className="font-medium text-gray-800">{job.customerPhone}</span>
        </p>
      )}

      {children && <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4">{children}</div>}
    </Card>
  );
}

function maskAddress(addr: string): string {
  // Hide the exact street number until the job is accepted.
  return addr.replace(/^\s*\d+\s*/, '••• ');
}

function ProfilePanel({
  user,
  profile,
  onChange,
}: {
  user: SessionUser;
  profile: ProviderProfile;
  onChange: () => void;
}) {
  const [form, setForm] = useState(profile);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [photoInput, setPhotoInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [geoMsg, setGeoMsg] = useState('');

  function set<K extends keyof ProviderProfile>(key: K, value: ProviderProfile[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  function toggleService(key: string) {
    const has = form.services.includes(key);
    set('services', has ? form.services.filter((s) => s !== key) : [...form.services, key]);
  }

  function useMyLocation() {
    setGeoMsg('Locating…');
    if (!navigator.geolocation) {
      setGeoMsg('Geolocation not supported.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set('lat', pos.coords.latitude);
        set('lng', pos.coords.longitude);
        setGeoMsg('Location captured ✓');
      },
      () => setGeoMsg('Could not get location.')
    );
  }

  async function save() {
    setSaving(true);
    await api('/api/provider/profile', {
      method: 'PATCH',
      body: JSON.stringify({
        headline: form.headline,
        bio: form.bio,
        hourlyRate: Number(form.hourlyRate),
        yearsExperience: Number(form.yearsExperience),
        teamSize: Number(form.teamSize),
        isTeam: Number(form.teamSize) > 1,
        services: form.services,
        serviceRadiusMiles: Number(form.serviceRadiusMiles),
        city: form.city,
        state: form.state,
        zip: form.zip,
        lat: form.lat,
        lng: form.lng,
        photos: form.photos,
        insured: form.insured,
        suppliesIncluded: form.suppliesIncluded,
        acceptingJobs: form.acceptingJobs,
      }),
    });
    if (avatarUrl !== user.avatarUrl) {
      await api('/api/account', { method: 'PATCH', body: JSON.stringify({ avatarUrl }) });
    }
    setSaving(false);
    setSaved(true);
    onChange();
  }

  return (
    <div className="mt-6 space-y-6">
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900">Profile photo &amp; intro</h2>
        <div className="mt-4 flex items-center gap-4">
          <Avatar src={avatarUrl} name={user.name} size={64} />
          <div className="flex-1">
            <Field label="Profile photo URL">
              <input className="input" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://…" />
            </Field>
          </div>
        </div>
        <div className="mt-4 space-y-4">
          <Field label="Headline" hint="A short tagline customers see in search.">
            <input className="input" value={form.headline} onChange={(e) => set('headline', e.target.value)} placeholder="Detail-obsessed solo cleaner • 8 yrs experience" />
          </Field>
          <Field label="Bio">
            <textarea className="input" rows={5} value={form.bio} onChange={(e) => set('bio', e.target.value)} placeholder="Tell customers about your experience, style, and what makes you great…" />
          </Field>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900">Rates &amp; experience</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Hourly rate (USD)">
            <input className="input" type="number" min={0} value={form.hourlyRate} onChange={(e) => set('hourlyRate', Number(e.target.value))} />
          </Field>
          <Field label="Years of experience">
            <input className="input" type="number" min={0} value={form.yearsExperience} onChange={(e) => set('yearsExperience', Number(e.target.value))} />
          </Field>
          <Field label="Team size" hint="1 = solo. More than 1 shows as a team.">
            <input className="input" type="number" min={1} value={form.teamSize} onChange={(e) => set('teamSize', Number(e.target.value))} />
          </Field>
          <Field label="Service radius (miles)">
            <input className="input" type="number" min={1} value={form.serviceRadiusMiles} onChange={(e) => set('serviceRadiusMiles', Number(e.target.value))} />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-4">
          <Toggle label="Insured" checked={form.insured} onChange={(v) => set('insured', v)} />
          <Toggle label="I bring supplies" checked={form.suppliesIncluded} onChange={(v) => set('suppliesIncluded', v)} />
          <Toggle label="Accepting new jobs" checked={form.acceptingJobs} onChange={(v) => set('acceptingJobs', v)} />
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900">Services</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {SERVICES.map((s) => (
            <label key={s.key} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${form.services.includes(s.key) ? 'border-teal-500 bg-teal-50' : 'border-gray-200'}`}>
              <input type="checkbox" checked={form.services.includes(s.key)} onChange={() => toggleService(s.key)} className="h-4 w-4 accent-teal-600" />
              <span className="text-gray-700">{s.label}</span>
            </label>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900">Where you work</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="City">
            <input className="input" value={form.city} onChange={(e) => set('city', e.target.value)} />
          </Field>
          <Field label="State">
            <input className="input" value={form.state} onChange={(e) => set('state', e.target.value)} />
          </Field>
          <Field label="ZIP">
            <input className="input" value={form.zip} onChange={(e) => set('zip', e.target.value)} />
          </Field>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button variant="secondary" onClick={useMyLocation}>
            📍 Set my base location
          </Button>
          <span className="text-sm text-gray-500">
            {form.lat != null && form.lng != null ? `${form.lat.toFixed(4)}, ${form.lng.toFixed(4)}` : 'Not set — set this so nearby customers can find you.'}
          </span>
        </div>
        {geoMsg && <p className="mt-2 text-xs text-teal-600">{geoMsg}</p>}
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900">Work photos</h2>
        <p className="text-sm text-gray-500">Add image URLs of homes you've cleaned to build trust.</p>
        <div className="mt-3 flex gap-2">
          <input className="input" value={photoInput} onChange={(e) => setPhotoInput(e.target.value)} placeholder="https://image-url.jpg" />
          <Button
            variant="secondary"
            onClick={() => {
              if (photoInput.trim()) {
                set('photos', [...form.photos, photoInput.trim()]);
                setPhotoInput('');
              }
            }}
          >
            Add
          </Button>
        </div>
        {form.photos.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-3">
            {form.photos.map((p, i) => (
              <div key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p} alt="" className="h-24 w-32 rounded-lg object-cover" />
                <button
                  onClick={() => set('photos', form.photos.filter((_, idx) => idx !== i))}
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="sticky bottom-4 flex items-center justify-end gap-3">
        {saved && <span className="text-sm font-medium text-emerald-600">Saved ✓</span>}
        <Button onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save profile'}
        </Button>
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-teal-600" />
      {label}
    </label>
  );
}
