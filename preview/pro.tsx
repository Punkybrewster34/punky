import React, { useState } from 'react';
import { SERVICES, serviceLabel, taskLabel, addOnDef } from '../lib/marketplace/constants';
import * as db from './store';
import { DAYS, WINDOWS, LANGUAGES, type PUser, type PJob, type PJobStatus } from './store';
import {
  Avatar, Badge, Btn, Card, Field, ProgressBar, Stat, StatusTracker, Stars, RatingBars, TierBadge, Tog, Empty,
  go, input, windowLabel,
} from './ui';
import { ChatModal, NeedLogin } from './account';

export function ProviderDash({ me, refreshMe }: { me: PUser | null; refreshMe: () => void }) {
  const [tab, setTab] = useState<'overview' | 'jobs' | 'schedule' | 'profile' | 'reviews'>('overview');
  const [, tick] = useState(0);
  if (!me) return <NeedLogin />;
  if (me.role !== 'provider') return <Empty msg="Log in as a provider (e.g. maria@haven.demo)." />;
  const profile = db.getProfile(me.id)!;
  const jobs = db.jobsForProvider(me.id);
  const stats = db.providerStats(me.id);
  const refresh = () => { tick((n) => n + 1); refreshMe(); };
  const newCount = jobs.filter((j) => j.status === 'requested').length;

  const tabs: [typeof tab, string][] = [['overview', 'Overview'], ['jobs', `Jobs${newCount ? ` (${newCount})` : ''}`], ['schedule', 'Schedule'], ['profile', 'Profile'], ['reviews', 'Reviews']];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-gray-900">Cleaner dashboard</h1>
        <div className="flex items-center gap-2"><TierBadge tier={stats.tier} /><Btn variant="secondary" onClick={() => go('#/wallet')}>Earnings · ${me.wallet.toFixed(0)}</Btn></div>
      </div>

      <VerifyBanner profile={profile} userId={me.id} refresh={refresh} />

      <div className="mt-6 flex gap-1 overflow-x-auto border-b border-gray-200">
        {tabs.map(([t, label]) => <button key={t} onClick={() => setTab(t)} className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-semibold ${tab === t ? 'border-teal-600 text-teal-700' : 'border-transparent text-gray-500'}`}>{label}</button>)}
      </div>

      {tab === 'overview' && <Overview stats={stats} profile={profile} me={me} />}
      {tab === 'jobs' && <Jobs jobs={jobs} me={me} refresh={refresh} />}
      {tab === 'schedule' && <Schedule profile={profile} me={me} refresh={refresh} />}
      {tab === 'profile' && <ProfileEditor me={me} profile={profile} refresh={refresh} />}
      {tab === 'reviews' && <ReviewsMgmt me={me} refresh={refresh} />}
    </div>
  );
}

function VerifyBanner({ profile, userId, refresh }: any) {
  const bc = profile.backgroundCheck;
  if (profile.isVerified) return <Card className="mt-5 border-emerald-200 bg-emerald-50 p-4"><p className="font-semibold text-emerald-800">✓ You're verified and live in search.</p><p className="mt-1 text-sm text-emerald-700">Customers near you can find and book you.</p></Card>;
  if (bc.status === 'pending') return (
    <Card className="mt-5 border-amber-200 bg-amber-50 p-4"><p className="font-semibold text-amber-800">Background check in progress…</p><p className="mt-1 text-sm text-amber-700">Reference {bc.reference}. {bc.note}</p><p className="mt-2 text-xs text-amber-600">Demo: an admin approves these on the Admin page — or auto-approve below.</p><div className="mt-3"><Btn onClick={() => { db.decideBackgroundCheck(userId, true); refresh(); }}>Auto-approve (demo)</Btn></div></Card>
  );
  return (
    <Card className="mt-5 border-teal-200 bg-teal-50 p-4"><p className="font-semibold text-teal-800">{bc.status === 'rejected' ? 'Your screening was not approved.' : 'One step left: get verified.'}</p><p className="mt-1 text-sm text-teal-700">{bc.status === 'rejected' ? bc.note : 'Complete your profile, then submit a background check. You must be verified before customers can find you.'}</p><div className="mt-3"><Btn onClick={() => { db.submitBackgroundCheck(userId); refresh(); }}>Submit background check</Btn></div></Card>
  );
}

function Overview({ stats, profile, me }: { stats: db.ProviderStats; profile: db.PProfile; me: PUser }) {
  const comp = db.profileCompleteness(profile, me);
  return (
    <div className="mt-6 space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="This week" value={`$${stats.earningsWeek.toFixed(0)}`} />
        <Stat label="This month" value={`$${stats.earningsMonth.toFixed(0)}`} />
        <Stat label="All-time" value={`$${stats.earningsAll.toFixed(0)}`} />
        <Stat label="Tips earned" value={`$${stats.tips.toFixed(0)}`} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Completed jobs" value={stats.completed} />
        <Stat label="Upcoming" value={stats.upcoming} />
        <Stat label="Rating" value={stats.rating ? `${stats.rating}★` : '—'} sub={`${stats.reviewCount} reviews`} />
        <Stat label="Reputation" value={stats.tier} />
      </div>
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900">Performance</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Metric label="Acceptance rate" pct={stats.acceptanceRate} />
          <Metric label="On-time rate" pct={stats.onTimeRate} />
          <Metric label="Repeat clients" pct={stats.repeatRate} />
        </div>
        <p className="mt-4 text-sm text-gray-500">Avg. response time: <span className="font-medium text-gray-700">{stats.responseMins} min</span>. Faster responses win more jobs.</p>
      </Card>
      <Card className="p-6">
        <div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-gray-900">Profile strength</h2><span className="text-2xl font-bold text-teal-600">{comp.pct}%</span></div>
        <div className="mt-3"><ProgressBar pct={comp.pct} /></div>
        {comp.missing.length > 0 ? (
          <div className="mt-4"><p className="text-sm font-medium text-gray-700">Boost your ranking:</p><ul className="mt-2 space-y-1">{comp.missing.map((m) => <li key={m} className="flex items-center gap-2 text-sm text-gray-600">○ {m}</li>)}</ul></div>
        ) : <p className="mt-3 text-sm text-emerald-600">🎉 Your profile is fully complete — top search placement!</p>}
      </Card>
    </div>
  );
}
function Metric({ label, pct }: { label: string; pct: number }) {
  return <div><div className="flex items-center justify-between text-sm"><span className="text-gray-500">{label}</span><span className="font-semibold text-gray-900">{pct}%</span></div><div className="mt-1"><ProgressBar pct={pct} color={pct >= 80 ? 'emerald' : pct >= 50 ? 'teal' : 'amber'} /></div></div>;
}

// ---------- Jobs ----------
function Jobs({ jobs, me, refresh }: { jobs: PJob[]; me: PUser; refresh: () => void }) {
  const [chat, setChat] = useState<PJob | null>(null);
  function act(job: PJob, to: PJobStatus) { let reason = ''; if (to === 'declined') reason = prompt('Optional: reason for declining') ?? ''; db.transitionJob(job.id, to, reason); refresh(); }
  const requests = jobs.filter((j) => j.status === 'requested');
  const active = jobs.filter((j) => ['accepted', 'on_the_way', 'arrived', 'in_progress'].includes(j.status));
  const past = jobs.filter((j) => ['completed', 'declined', 'cancelled'].includes(j.status));
  if (jobs.length === 0) return <Empty msg="No job requests yet." cta={<Btn onClick={() => go('#/')}>Preview your listing</Btn>} />;
  return (
    <div className="mt-6 space-y-8">
      {requests.length > 0 && <Sec title={`New requests (${requests.length})`}>{requests.map((j) => <JobCard key={j.id} job={j} me={me} onChat={() => setChat(j)}><Btn onClick={() => act(j, 'accepted')}>Accept</Btn><Btn variant="danger" onClick={() => act(j, 'declined')}>Decline</Btn></JobCard>)}</Sec>}
      {active.length > 0 && <Sec title="Active & upcoming">{active.map((j) => { const next = db.nextStatus(j.status); const labels: any = { on_the_way: 'Start driving 🚗', arrived: 'Mark arrived 📍', in_progress: 'Start cleaning 🧹', completed: 'Mark complete ✨' }; return <JobCard key={j.id} job={j} me={me} contact track onChat={() => setChat(j)}>{next && <Btn onClick={() => act(j, next)}>{labels[next]}</Btn>}<Btn variant="danger" size="sm" onClick={() => act(j, 'cancelled')}>Cancel</Btn></JobCard>; })}</Sec>}
      {past.length > 0 && <Sec title="History">{past.map((j) => <JobCard key={j.id} job={j} me={me} onChat={() => setChat(j)} />)}</Sec>}
      {chat && <ChatModal job={chat} me={me} onClose={() => { setChat(null); refresh(); }} />}
    </div>
  );
}
function Sec({ title, children }: { title: string; children: React.ReactNode }) { return <div><h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-400">{title}</h2><div className="space-y-4">{children}</div></div>; }

function JobCard({ job, me, children, contact, track, onChat }: any) {
  const cust = db.userById(job.customerId);
  const unread = job.messages.filter((m: any) => m.fromRole === 'customer' && !m.read).length;
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><p className="font-semibold text-gray-900">{cust?.name ?? 'Customer'}</p><p className="text-sm text-gray-500">{serviceLabel(job.serviceType)} · {new Date(job.scheduledDate + 'T12:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · {windowLabel(job.scheduledWindow)}</p></div>
        <div className="text-right"><p className="text-lg font-bold text-gray-900">${job.quote.providerPayout.toFixed(2)}</p><p className="text-xs text-gray-400">you earn{job.tip ? ` +$${job.tip} tip` : ''}</p></div>
      </div>
      {track && <div className="mt-4"><StatusTracker status={job.status} /></div>}
      <div className="mt-3 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
        <div><span className="text-gray-400">Property</span><p>{job.propertyType} · {job.bedrooms} bd · {job.bathrooms} ba {job.squareFeet ? `· ${job.squareFeet} sqft` : ''}</p></div>
        <div><span className="text-gray-400">Address</span><p>{contact ? job.address : job.address.replace(/^\s*\d+\s*/, '••• ')}</p></div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">{job.tasks.map((t: string) => <span key={t} className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{taskLabel(t)}</span>)}{job.addOns.map((a: string) => <span key={a} className="rounded-md bg-teal-50 px-2 py-0.5 text-xs text-teal-700">+ {addOnDef(a)?.label ?? a}</span>)}{job.recurring !== 'none' && <Badge color="purple">🔁 {job.recurring}</Badge>}</div>
      {job.notes && <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">“{job.notes}”</p>}
      {contact && cust?.phone && <p className="mt-3 text-sm text-gray-600">📞 <span className="font-medium text-gray-800">{cust.phone}</span></p>}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
        <Btn variant="secondary" size="sm" onClick={onChat}>💬 Message {unread > 0 && <span className="rounded-full bg-teal-600 px-1.5 text-[10px] text-white">{unread}</span>}</Btn>
        {children}
      </div>
    </Card>
  );
}

// ---------- Schedule ----------
function Schedule({ profile, me, refresh }: { profile: db.PProfile; me: PUser; refresh: () => void }) {
  const [avail, setAvail] = useState<db.Availability>({ ...profile.availability });
  const [instant, setInstant] = useState(profile.instantBook);
  const [saved, setSaved] = useState(false);
  function toggle(day: string, win: string) {
    setAvail((a) => { const cur = a[day] || []; const next = cur.includes(win) ? cur.filter((w) => w !== win) : [...cur, win]; const copy = { ...a }; if (next.length) copy[day] = next; else delete copy[day]; return copy; });
    setSaved(false);
  }
  function save() { db.updateProfile(me.id, { availability: avail, instantBook: instant }); setSaved(true); refresh(); }
  return (
    <div className="mt-6 space-y-6">
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900">Weekly availability</h2>
        <p className="text-sm text-gray-500">Tap the windows you work. Customers can only book open slots — no back-and-forth.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr><th /> {WINDOWS.map((w) => <th key={w.key} className="px-2 pb-2 text-xs font-semibold text-gray-500">{w.label}<br /><span className="font-normal text-gray-400">{w.time}</span></th>)}</tr></thead>
            <tbody>{DAYS.map((d) => (
              <tr key={d.key}><td className="py-1 pr-2 text-sm font-medium text-gray-700">{d.label}</td>{WINDOWS.map((w) => { const on = (avail[d.key] || []).includes(w.key); return <td key={w.key} className="px-1 py-1 text-center"><button onClick={() => toggle(d.key, w.key)} className={`h-9 w-full rounded-lg text-xs font-semibold ${on ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>{on ? '✓' : '+'}</button></td>; })}</tr>
            ))}</tbody>
          </table>
        </div>
      </Card>
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900">Instant Book</h2>
        <p className="mt-1 text-sm text-gray-500">Auto-accept bookings in your open slots. Instant-book pros get an ⚡ badge and rank higher.</p>
        <div className="mt-3"><Tog label="Enable Instant Book" v={instant} on={setInstant} /></div>
      </Card>
      <div className="flex items-center justify-end gap-3">{saved && <span className="text-sm font-medium text-emerald-600">Saved ✓</span>}<Btn onClick={save}>Save schedule</Btn></div>
    </div>
  );
}

// ---------- Profile editor ----------
function ProfileEditor({ me, profile, refresh }: { me: PUser; profile: db.PProfile; refresh: () => void }) {
  const [form, setForm] = useState<any>({ ...profile });
  const [avatar, setAvatar] = useState(me.avatarUrl);
  const [photoInput, setPhotoInput] = useState('');
  const [saved, setSaved] = useState(false);
  const set = (k: string, v: any) => { setForm((f: any) => ({ ...f, [k]: v })); setSaved(false); };
  const toggleArr = (k: string, val: string) => set(k, form[k].includes(val) ? form[k].filter((s: string) => s !== val) : [...form[k], val]);
  function useMyLoc() { if (!navigator.geolocation) return; navigator.geolocation.getCurrentPosition((p) => { set('lat', p.coords.latitude); set('lng', p.coords.longitude); }); }
  function save() { db.updateProfile(me.id, { ...form, hourlyRate: Number(form.hourlyRate), yearsExperience: Number(form.yearsExperience), teamSize: Number(form.teamSize), isTeam: Number(form.teamSize) > 1, serviceRadiusMiles: Number(form.serviceRadiusMiles), responseMins: Number(form.responseMins) }); if (avatar !== me.avatarUrl) db.updateUser(me.id, { avatarUrl: avatar }); setSaved(true); refresh(); }
  return (
    <div className="mt-6 space-y-6">
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900">Photo &amp; intro</h2>
        <div className="mt-4 flex items-center gap-4"><Avatar src={avatar} name={me.name} size={64} /><div className="flex-1"><Field label="Profile photo URL"><input className={input} value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://…" /></Field></div></div>
        <div className="mt-4 space-y-4"><Field label="Headline"><input className={input} value={form.headline} onChange={(e) => set('headline', e.target.value)} placeholder="Detail-obsessed solo cleaner • 8 yrs" /></Field><Field label="Bio"><textarea className={input} rows={5} value={form.bio} onChange={(e) => set('bio', e.target.value)} /></Field></div>
      </Card>
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900">Rates &amp; details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Hourly rate (USD)"><input className={input} type="number" value={form.hourlyRate} onChange={(e) => set('hourlyRate', e.target.value)} /></Field>
          <Field label="Years experience"><input className={input} type="number" value={form.yearsExperience} onChange={(e) => set('yearsExperience', e.target.value)} /></Field>
          <Field label="Team size" hint="1 = solo"><input className={input} type="number" value={form.teamSize} onChange={(e) => set('teamSize', e.target.value)} /></Field>
          <Field label="Service radius (miles)"><input className={input} type="number" value={form.serviceRadiusMiles} onChange={(e) => set('serviceRadiusMiles', e.target.value)} /></Field>
          <Field label="Avg response time (min)"><input className={input} type="number" value={form.responseMins} onChange={(e) => set('responseMins', e.target.value)} /></Field>
          <Field label="Cancellation policy"><select className={input} value={form.cancellationPolicy} onChange={(e) => set('cancellationPolicy', e.target.value)}><option value="flexible">Flexible</option><option value="moderate">Moderate</option><option value="strict">Strict</option></select></Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-4"><Tog label="Insured" v={form.insured} on={(b) => set('insured', b)} /><Tog label="ID verified" v={form.idVerified} on={(b) => set('idVerified', b)} /><Tog label="I bring supplies" v={form.suppliesIncluded} on={(b) => set('suppliesIncluded', b)} /><Tog label="Accepting new jobs" v={form.acceptingJobs} on={(b) => set('acceptingJobs', b)} /></div>
      </Card>
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900">Services</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">{SERVICES.map((s) => <label key={s.key} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${form.services.includes(s.key) ? 'border-teal-500 bg-teal-50' : 'border-gray-200'}`}><input type="checkbox" checked={form.services.includes(s.key)} onChange={() => toggleArr('services', s.key)} className="h-4 w-4 accent-teal-600" /><span className="text-gray-700">{s.label}</span></label>)}</div>
        <h3 className="mt-5 text-sm font-semibold text-gray-700">Languages</h3>
        <div className="mt-2 flex flex-wrap gap-2">{LANGUAGES.map((l) => <button key={l} type="button" onClick={() => toggleArr('languages', l)} className={`rounded-full border px-3 py-1 text-xs ${form.languages.includes(l) ? 'border-teal-600 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-600'}`}>{l}</button>)}</div>
      </Card>
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900">Where you work</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3"><Field label="City"><input className={input} value={form.city} onChange={(e) => set('city', e.target.value)} /></Field><Field label="State"><input className={input} value={form.state} onChange={(e) => set('state', e.target.value)} /></Field><Field label="ZIP"><input className={input} value={form.zip} onChange={(e) => set('zip', e.target.value)} /></Field></div>
        <div className="mt-4 flex items-center gap-3"><Btn variant="secondary" onClick={useMyLoc}>📍 Set my base location</Btn><span className="text-sm text-gray-500">{form.lat != null && form.lng != null ? `${form.lat.toFixed(4)}, ${form.lng.toFixed(4)}` : 'Not set'}</span></div>
      </Card>
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900">Work photos</h2>
        <div className="mt-3 flex gap-2"><input className={input} value={photoInput} onChange={(e) => setPhotoInput(e.target.value)} placeholder="https://image-url.jpg" /><Btn variant="secondary" onClick={() => { if (photoInput.trim()) { set('photos', [...form.photos, photoInput.trim()]); setPhotoInput(''); } }}>Add</Btn></div>
        {form.photos.length > 0 && <div className="mt-4 flex flex-wrap gap-3">{form.photos.map((p: string, i: number) => <div key={i} className="relative"><img src={p} alt="" className="h-24 w-32 rounded-lg object-cover" /><button onClick={() => set('photos', form.photos.filter((_: string, idx: number) => idx !== i))} className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white">✕</button></div>)}</div>}
      </Card>
      <div className="sticky bottom-4 flex items-center justify-end gap-3">{saved && <span className="text-sm font-medium text-emerald-600">Saved ✓</span>}<Btn onClick={save}>Save profile</Btn></div>
    </div>
  );
}

// ---------- Reviews management ----------
function ReviewsMgmt({ me, refresh }: { me: PUser; refresh: () => void }) {
  const [, tick] = useState(0);
  const reviews = db.reviewsFor(me.id);
  const prov = db.getProvider(me.id)!;
  const [replyId, setReplyId] = useState<string | null>(null);
  const [text, setText] = useState('');
  if (reviews.length === 0) return <Empty msg="No reviews yet." cta={<span className="text-sm text-gray-500">Complete jobs to earn reviews.</span>} />;
  return (
    <div className="mt-6 space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-6">
          <div className="text-center"><p className="text-4xl font-extrabold text-gray-900">{prov.rating}</p><Stars rating={prov.rating} /><p className="mt-1 text-xs text-gray-500">{prov.reviewCount} reviews</p></div>
          <div className="flex-1"><RatingBars sub={prov.subAverages} /></div>
        </div>
      </Card>
      {reviews.map((r) => (
        <Card key={r.id} className="p-5">
          <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Stars rating={r.rating} /><span className="text-sm font-medium text-gray-700">{r.customerName}</span></div><span className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</span></div>
          {r.tags.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{r.tags.map((t) => <Badge key={t} color="teal">{t}</Badge>)}</div>}
          <p className="mt-2 text-gray-700">{r.comment}</p>
          {r.reply ? (
            <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm"><p className="font-semibold text-gray-700">Your reply</p><p className="text-gray-600">{r.reply.text}</p></div>
          ) : replyId === r.id ? (
            <div className="mt-3 flex gap-2"><input className={input} value={text} onChange={(e) => setText(e.target.value)} placeholder="Thank your customer…" /><Btn onClick={() => { db.replyToReview(r.id, me.id, text); setReplyId(null); setText(''); tick((n) => n + 1); refresh(); }}>Reply</Btn></div>
          ) : (
            <button className="mt-2 text-sm font-medium text-teal-600" onClick={() => { setReplyId(r.id); setText(''); }}>+ Reply publicly</button>
          )}
        </Card>
      ))}
    </div>
  );
}
