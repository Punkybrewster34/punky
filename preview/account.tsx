import React, { useState } from 'react';
import { serviceLabel, taskLabel, addOnDef } from '../lib/marketplace/constants';
import * as db from './store';
import { REVIEW_TAGS, MEMBERSHIP_PRICE, type PUser, type PJob } from './store';
import {
  Avatar, Badge, Btn, Card, Field, Modal, StarsInput, StatusTracker, Stars, Empty,
  go, input, Money, windowLabel,
} from './ui';

const SUB_LABELS: [keyof db.SubRatings, string][] = [['quality', 'Quality'], ['punctuality', 'Punctuality'], ['communication', 'Communication'], ['value', 'Value']];

// ---------- Customer dashboard ----------
export function CustomerDash({ me, refreshMe }: { me: PUser | null; refreshMe: () => void }) {
  const [, tick] = useState(0);
  const [reviewing, setReviewing] = useState<PJob | null>(null);
  const [tipping, setTipping] = useState<PJob | null>(null);
  const [chat, setChat] = useState<PJob | null>(null);
  const [reschedule, setReschedule] = useState<PJob | null>(null);
  if (!me) return <NeedLogin />;
  if (me.role !== 'customer') return <Empty msg="Log in as a customer to see bookings." />;
  const jobs = db.jobsForCustomer(me.id);
  const refresh = () => { tick((n) => n + 1); refreshMe(); };

  const active = jobs.filter((j) => !['completed', 'declined', 'cancelled'].includes(j.status));
  const past = jobs.filter((j) => ['completed', 'declined', 'cancelled'].includes(j.status));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-gray-900">My bookings</h1>
        <div className="flex gap-2"><Btn variant="secondary" onClick={() => go('#/wallet')}>Wallet · ${me.wallet.toFixed(0)}</Btn><Btn onClick={() => go('#/')}>Book a cleaning</Btn></div>
      </div>

      {me.membership !== 'plus' && (
        <Card className="mt-5 border-purple-200 bg-purple-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="font-semibold text-purple-900">Join HavenClean+ and save on every clean</p><p className="text-sm text-purple-700">10% off all bookings, priority support, free re-cleans — ${MEMBERSHIP_PRICE}/mo.</p></div>
            <Btn variant="dark" onClick={() => go('#/wallet')}>See membership</Btn>
          </div>
        </Card>
      )}

      {jobs.length === 0 ? (
        <Empty msg="No bookings yet." cta={<Btn onClick={() => go('#/')}>Browse cleaners</Btn>} />
      ) : (
        <div className="mt-6 space-y-8">
          {active.length > 0 && (
            <Section title="Active & upcoming">
              {active.map((job) => <CustomerJobCard key={job.id} job={job} me={me} onChat={() => setChat(job)} onCancel={() => { if (confirm('Cancel this booking?')) { db.transitionJob(job.id, 'cancelled'); refresh(); } }} onReschedule={() => setReschedule(job)} refresh={refresh} />)}
            </Section>
          )}
          {past.length > 0 && (
            <Section title="History">
              {past.map((job) => <CustomerJobCard key={job.id} job={job} me={me} past onChat={() => setChat(job)} onReview={() => setReviewing(job)} onTip={() => setTipping(job)} refresh={refresh} />)}
            </Section>
          )}
        </div>
      )}

      {reviewing && <ReviewModal job={reviewing} me={me} onClose={() => setReviewing(null)} onDone={() => { setReviewing(null); refresh(); }} />}
      {tipping && <TipModal job={tipping} onClose={() => setTipping(null)} onDone={() => { setTipping(null); refresh(); }} />}
      {chat && <ChatModal job={chat} me={me} onClose={() => { setChat(null); refresh(); }} />}
      {reschedule && <RescheduleModal job={reschedule} onClose={() => setReschedule(null)} onDone={() => { setReschedule(null); refresh(); }} />}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-400">{title}</h2><div className="space-y-4">{children}</div></div>;
}

function CustomerJobCard({ job, me, past, onChat, onCancel, onReview, onTip, onReschedule, refresh }: any) {
  const prov = db.getProvider(job.providerId);
  const reviewed = !!db.reviewForJob(job.id);
  const unread = job.messages.filter((m: any) => m.fromRole === 'provider' && !m.read).length;
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <button className="flex items-center gap-3 text-left" onClick={() => go(`#/cleaner/${job.providerId}`)}>
          <Avatar src={prov?.avatarUrl} name={prov?.name ?? '?'} size={48} />
          <div><p className="font-semibold text-gray-900">{prov?.name}</p><p className="text-sm text-gray-500">{serviceLabel(job.serviceType)} · {new Date(job.scheduledDate + 'T12:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · {windowLabel(job.scheduledWindow)}</p></div>
        </button>
        <span className="text-lg font-bold text-gray-900">${job.quote.total.toFixed(2)}</span>
      </div>

      {!past && <div className="mt-4"><StatusTracker status={job.status} /></div>}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {job.tasks.map((t: string) => <span key={t} className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{taskLabel(t)}</span>)}
        {job.addOns.map((a: string) => <span key={a} className="rounded-md bg-teal-50 px-2 py-0.5 text-xs text-teal-700">+ {addOnDef(a)?.label ?? a}</span>)}
        {job.recurring !== 'none' && <Badge color="purple">🔁 {job.recurring}</Badge>}
      </div>

      {job.status === 'declined' && job.declineReason && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">Reason: {job.declineReason}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
        <Btn variant="secondary" size="sm" onClick={onChat}>💬 Message {unread > 0 && <span className="rounded-full bg-teal-600 px-1.5 text-[10px] text-white">{unread}</span>}</Btn>
        {(job.status === 'requested' || job.status === 'accepted') && <><Btn variant="secondary" size="sm" onClick={onReschedule}>Reschedule</Btn><Btn variant="danger" size="sm" onClick={onCancel}>Cancel</Btn></>}
        {job.status === 'completed' && !reviewed && <Btn size="sm" onClick={onReview}>Leave a review</Btn>}
        {job.status === 'completed' && reviewed && <Badge color="green">★ Reviewed</Badge>}
        {job.status === 'completed' && (job.tip ? <Badge color="amber">Tipped ${job.tip}</Badge> : <Btn variant="secondary" size="sm" onClick={onTip}>🙏 Add a tip</Btn>)}
      </div>
    </Card>
  );
}

// ---------- Modals ----------
export function ReviewModal({ job, me, onClose, onDone }: { job: PJob; me: PUser; onClose: () => void; onDone: () => void }) {
  const [sub, setSub] = useState<db.SubRatings>({ quality: 5, punctuality: 5, communication: 5, value: 5 });
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const overall = Math.round(((sub.quality + sub.punctuality + sub.communication + sub.value) / 4) * 10) / 10;
  function submit() {
    const r = db.createReview({ jobId: job.id, customerId: me.id, customerName: me.name, providerId: job.providerId, rating: overall, sub, tags, comment });
    if ('error' in r) return setError(r.error);
    onDone();
  }
  return (
    <Modal title="Rate your clean" onClose={onClose}>
      <div className="space-y-4">
        {SUB_LABELS.map(([k, label]) => (
          <div key={k} className="flex items-center justify-between"><span className="text-sm text-gray-600">{label}</span><StarsInput value={sub[k]} onChange={(n) => setSub((s) => ({ ...s, [k]: n }))} size={26} /></div>
        ))}
        <div className="rounded-lg bg-gray-50 p-3 text-center text-sm text-gray-600">Overall: <span className="font-bold text-gray-900">{overall.toFixed(1)} ★</span></div>
        <div>
          <p className="mb-1.5 text-sm font-medium text-gray-700">What stood out?</p>
          <div className="flex flex-wrap gap-2">{REVIEW_TAGS.map((t) => <button key={t} type="button" onClick={() => setTags((x) => x.includes(t) ? x.filter((y) => y !== t) : [...x, t])} className={`rounded-full border px-3 py-1 text-xs ${tags.includes(t) ? 'border-teal-600 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-600'}`}>{t}</button>)}</div>
        </div>
        <textarea className={input} rows={3} placeholder="Tell others about your experience…" value={comment} onChange={(e) => setComment(e.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Btn full onClick={submit}>Submit review</Btn>
      </div>
    </Modal>
  );
}

function TipModal({ job, onClose, onDone }: { job: PJob; onClose: () => void; onDone: () => void }) {
  const [amt, setAmt] = useState(10);
  const prov = db.getProvider(job.providerId);
  return (
    <Modal title={`Tip ${prov?.name ?? 'your cleaner'}`} onClose={onClose}>
      <p className="text-sm text-gray-500">100% of tips go straight to your cleaner.</p>
      <div className="mt-4 flex gap-2">{[5, 10, 15, 20].map((v) => <button key={v} onClick={() => setAmt(v)} className={`flex-1 rounded-lg border py-3 font-semibold ${amt === v ? 'border-teal-600 bg-teal-600 text-white' : 'border-gray-200 text-gray-700'}`}>${v}</button>)}</div>
      <div className="mt-3"><Field label="Custom amount"><input className={input} type="number" min={0} value={amt} onChange={(e) => setAmt(Number(e.target.value))} /></Field></div>
      <div className="mt-4"><Btn full onClick={() => { db.addTip(job.id, amt); onDone(); }}>Send ${amt} tip</Btn></div>
    </Modal>
  );
}

function RescheduleModal({ job, onClose, onDone }: { job: PJob; onClose: () => void; onDone: () => void }) {
  const slots = db.availableSlots(job.providerId);
  const [k, setK] = useState(slots[0] ? slots[0].date + '|' + slots[0].window : '');
  return (
    <Modal title="Reschedule" onClose={onClose}>
      {slots.length === 0 ? <p className="text-sm text-gray-500">No open slots available.</p> : (
        <>
          <div className="max-h-72 space-y-2 overflow-y-auto">{slots.map((s) => { const key = s.date + '|' + s.window; return <button key={key} onClick={() => setK(key)} className={`block w-full rounded-lg border px-3 py-2 text-left text-sm ${k === key ? 'border-teal-600 bg-teal-50' : 'border-gray-200'}`}>{s.label}</button>; })}</div>
          <div className="mt-4"><Btn full onClick={() => { const [d, w] = k.split('|'); db.rescheduleJob(job.id, d, w); onDone(); }}>Confirm new time</Btn></div>
        </>
      )}
    </Modal>
  );
}

export function ChatModal({ job, me, onClose }: { job: PJob; me: PUser; onClose: () => void }) {
  const [, tick] = useState(0);
  const [text, setText] = useState('');
  const other = me.role === 'customer' ? db.getProvider(job.providerId) : db.userById(job.customerId);
  const otherName = me.role === 'customer' ? (other as any)?.name : (other as any)?.name;
  // mark incoming as read
  job.messages.forEach((m) => { if (m.fromRole !== me.role) m.read = true; });
  function send() { if (!text.trim()) return; db.sendMessage(job.id, me.id, me.role, text); setText(''); tick((n) => n + 1); }
  return (
    <Modal title={`Chat with ${otherName ?? 'them'}`} onClose={onClose}>
      <p className="-mt-2 mb-3 text-xs text-gray-400">About your {new Date(job.scheduledDate + 'T12:00').toLocaleDateString()} clean</p>
      <div className="flex max-h-72 min-h-[8rem] flex-col gap-2 overflow-y-auto rounded-lg bg-gray-50 p-3">
        {job.messages.length === 0 && <p className="m-auto text-sm text-gray-400">No messages yet. Say hello 👋</p>}
        {job.messages.map((m) => (
          <div key={m.id} className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.fromRole === me.role ? 'self-end bg-teal-600 text-white' : 'self-start bg-white text-gray-700 border border-gray-200'}`}>{m.text}</div>
        ))}
      </div>
      <div className="mt-3 flex gap-2"><input className={input} placeholder="Type a message…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} /><Btn onClick={send}>Send</Btn></div>
    </Modal>
  );
}

// ---------- Wallet / membership / referrals ----------
export function Wallet({ me, refreshMe }: { me: PUser | null; refreshMe: () => void }) {
  const [, tick] = useState(0);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  if (!me) return <NeedLogin />;
  const refresh = () => { tick((n) => n + 1); refreshMe(); };
  function redeem() { const r = db.redeemReferral(me!.id, code); setMsg(r.msg); if (r.ok) refresh(); }
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <button onClick={() => go(me.role === 'provider' ? '#/provider' : '#/customer')} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
      <h1 className="mt-2 text-3xl font-bold text-gray-900">Wallet &amp; rewards</h1>

      <Card className="mt-5 bg-gradient-to-br from-teal-600 to-teal-700 p-6 text-white">
        <p className="text-sm text-teal-100">Available credit</p>
        <p className="text-4xl font-extrabold">${me.wallet.toFixed(2)}</p>
        <p className="mt-1 text-sm text-teal-100">Applied automatically at checkout.</p>
      </Card>

      <Card className="mt-5 p-6">
        <h2 className="text-lg font-semibold text-gray-900">HavenClean+ membership</h2>
        {me.membership === 'plus' ? (
          <div className="mt-2"><Badge color="purple">★ Active member</Badge><p className="mt-2 text-sm text-gray-600">You're saving 10% on every clean, plus free re-cleans and priority support.</p><div className="mt-3"><Btn variant="secondary" onClick={() => { db.setMembership(me.id, false); refresh(); }}>Cancel membership</Btn></div></div>
        ) : (
          <div className="mt-2"><p className="text-sm text-gray-600">10% off all cleans · free re-clean guarantee · priority booking & support.</p><p className="mt-1 text-2xl font-bold text-gray-900">${MEMBERSHIP_PRICE}<span className="text-sm font-normal text-gray-500">/mo</span></p><div className="mt-3"><Btn variant="dark" onClick={() => { db.setMembership(me.id, true); refresh(); }}>Start saving</Btn></div></div>
        )}
      </Card>

      <Card className="mt-5 p-6">
        <h2 className="text-lg font-semibold text-gray-900">Refer friends, earn $20</h2>
        <p className="text-sm text-gray-600">Share your code. When a friend joins, you each get $20 in credit.</p>
        <div className="mt-3 flex items-center gap-2"><code className="rounded-lg bg-gray-100 px-4 py-2 font-mono text-lg font-bold text-teal-700">{me.referralCode}</code><Btn variant="secondary" onClick={() => { navigator.clipboard?.writeText(me.referralCode); setMsg('Copied!'); }}>Copy</Btn></div>
        <div className="mt-4 border-t border-gray-100 pt-4">
          <Field label="Have a friend's code?"><div className="flex gap-2"><input className={input} value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter code" /><Btn onClick={redeem}>Redeem</Btn></div></Field>
          {msg && <p className="mt-1 text-sm text-emerald-600">{msg}</p>}
        </div>
      </Card>

      <Card className="mt-5 p-6">
        <h2 className="text-lg font-semibold text-gray-900">Activity</h2>
        {me.ledger.length === 0 ? <p className="mt-2 text-sm text-gray-500">No activity yet.</p> : (
          <ul className="mt-3 divide-y divide-gray-100">{me.ledger.map((t) => (
            <li key={t.id} className="flex items-center justify-between py-2 text-sm"><span className="text-gray-600">{t.label}<span className="ml-2 text-xs text-gray-400">{new Date(t.at).toLocaleDateString()}</span></span><span className={`font-semibold ${t.amount >= 0 ? 'text-emerald-600' : 'text-gray-500'}`}>{t.amount >= 0 ? '+' : ''}${t.amount.toFixed(2)}</span></li>
          ))}</ul>
        )}
      </Card>
    </div>
  );
}

// ---------- Auth ----------
export function Login({ refreshMe }: { refreshMe: () => void }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  function submit(e: React.FormEvent) { e.preventDefault(); const u = db.login(email); if (!u) return setError('No account with that email. Try a demo account below or sign up.'); refreshMe(); go(u.role === 'provider' ? '#/provider' : '#/'); }
  const demos = ['customer@haven.demo', 'maria@haven.demo', 'team@brighttidy.demo'];
  return (
    <Card className="mx-auto mt-12 max-w-md p-8">
      <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
      <p className="mt-1 text-sm text-gray-500">Demo login — just enter an email (no password needed).</p>
      <form onSubmit={submit} className="mt-6 space-y-4"><Field label="Email"><input className={input} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="customer@haven.demo" /></Field>{error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}<Btn type="submit" full>Log in</Btn></form>
      <div className="mt-5"><p className="text-xs font-medium text-gray-500">Tap a demo account:</p><div className="mt-2 flex flex-wrap gap-2">{demos.map((d) => <button key={d} onClick={() => { db.login(d); refreshMe(); go(d.includes('customer') ? '#/' : '#/provider'); }} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">{d}</button>)}</div></div>
      <p className="mt-5 text-center text-sm text-gray-500">New here? <button onClick={() => go('#/signup')} className="font-semibold text-teal-600">Create an account</button></p>
    </Card>
  );
}
export function Signup({ refreshMe }: { refreshMe: () => void }) {
  const [role, setRole] = useState<'customer' | 'provider'>('customer');
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [phone, setPhone] = useState(''); const [ref, setRef] = useState(''); const [error, setError] = useState('');
  function submit(e: React.FormEvent) { e.preventDefault(); const r = db.signup({ name, email, phone, role }); if ('error' in r) return setError(r.error); if (ref.trim()) db.redeemReferral(r.id, ref); refreshMe(); go(role === 'provider' ? '#/provider' : '#/'); }
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
        {role === 'customer' && <Field label="Referral code (optional)" hint="Get $10 welcome credit + $20 when you use a friend's code."><input className={input} value={ref} onChange={(e) => setRef(e.target.value)} /></Field>}
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <Btn type="submit" full>{role === 'provider' ? 'Start cleaning' : 'Create account'}</Btn>
      </form>
      {role === 'provider' && <p className="mt-4 rounded-lg bg-teal-50 px-3 py-2 text-xs text-teal-700">Next you'll build your profile and submit a background check. You'll appear in search once approved.</p>}
    </Card>
  );
}

export function NeedLogin() {
  return <Empty msg="Please log in first." cta={<><Btn onClick={() => go('#/login')}>Log in</Btn><Btn variant="secondary" onClick={() => go('#/signup')}>Sign up</Btn></>} />;
}
