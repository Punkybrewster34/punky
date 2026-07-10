import React, { useEffect, useState } from 'react';
import { WINDOWS, type PJobStatus } from './store';

// ---------- router ----------
export function useRoute() {
  const [hash, setHash] = useState(() => location.hash || '#/');
  useEffect(() => {
    const on = () => setHash(location.hash || '#/');
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const q = hash.indexOf('?');
  const path = q === -1 ? hash : hash.slice(0, q);
  const parts = path.replace(/^#\//, '').split('/');
  return { name: parts[0] || 'home', param: parts[1] || '', raw: hash };
}
export function go(path: string) { location.hash = path; window.scrollTo(0, 0); }

export const input =
  'w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent';

export function Money({ value, className = '' }: { value: number; className?: string }) {
  return <span className={className}>${value.toFixed(2)}</span>;
}

export function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
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
export function StarsInput({ value, onChange, size = 30 }: { value: number; onChange: (n: number) => void; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} style={{ fontSize: size }} className="leading-none">
          <span className={n <= value ? 'text-amber-400' : 'text-gray-300'}>★</span>
        </button>
      ))}
    </span>
  );
}

export function Badge({ children, color = 'gray' }: { children: React.ReactNode; color?: string }) {
  const c: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-700', green: 'bg-emerald-100 text-emerald-700', teal: 'bg-teal-100 text-teal-700',
    amber: 'bg-amber-100 text-amber-800', red: 'bg-red-100 text-red-700', blue: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700', dark: 'bg-gray-900 text-white',
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${c[color]}`}>{children}</span>;
}
export function Verified() { return <Badge color="green">✓ Background-checked</Badge>; }
export function TierBadge({ tier }: { tier: string }) {
  const map: Record<string, string> = { 'Elite Pro': 'purple', 'Top Pro': 'teal', Pro: 'blue', Rising: 'amber', New: 'gray' };
  const icon: Record<string, string> = { 'Elite Pro': '👑', 'Top Pro': '⭐', Pro: '✓', Rising: '↑', New: '•' };
  return <Badge color={map[tier] ?? 'gray'}>{icon[tier] ?? ''} {tier}</Badge>;
}

export function Btn({ children, onClick, variant = 'primary', disabled, full, type = 'button', size = 'md' }: any) {
  const v: Record<string, string> = {
    primary: 'bg-teal-600 text-white hover:bg-teal-700 shadow-sm', secondary: 'bg-white text-gray-800 border border-gray-300 hover:bg-gray-50',
    danger: 'bg-white text-red-600 border border-red-200 hover:bg-red-50', dark: 'bg-gray-900 text-white hover:bg-black',
    ghost: 'text-teal-700 hover:bg-teal-50',
  };
  const s = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm';
  return <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition disabled:opacity-50 ${v[variant]} ${s} ${full ? 'w-full' : ''}`}>{children}</button>;
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-gray-200 bg-white shadow-sm ${className}`}>{children}</div>;
}
export function Avatar({ src, name, size = 48 }: { src?: string; name: string; size?: number }) {
  const initials = name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  if (src) return <img src={src} alt={name} className="rounded-full object-cover bg-gray-100" style={{ width: size, height: size }} />;
  return <div className="flex items-center justify-center rounded-full bg-teal-100 font-semibold text-teal-700" style={{ width: size, height: size, fontSize: size / 2.6 }}>{initials || '?'}</div>;
}
export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-medium text-gray-700">{label}</span>{children}{hint && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}</label>;
}
export function Tog({ label, v, on }: { label: string; v: boolean; on: (b: boolean) => void }) {
  return <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={v} onChange={(e) => on(e.target.checked)} className="h-4 w-4 accent-teal-600" />{label}</label>;
}

export function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        {title && <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold text-gray-900">{title}</h2><button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button></div>}
        {children}
      </div>
    </div>
  );
}

export function ProgressBar({ pct, color = 'teal' }: { pct: number; color?: string }) {
  const c: Record<string, string> = { teal: 'bg-teal-500', amber: 'bg-amber-500', emerald: 'bg-emerald-500' };
  return <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100"><div className={`h-full ${c[color]}`} style={{ width: `${pct}%` }} /></div>;
}

export function RatingBars({ sub }: { sub: { quality: number; punctuality: number; communication: number; value: number } }) {
  const rows: [string, number][] = [['Quality', sub.quality], ['Punctuality', sub.punctuality], ['Communication', sub.communication], ['Value', sub.value]];
  return (
    <div className="space-y-2">
      {rows.map(([label, v]) => (
        <div key={label} className="flex items-center gap-3 text-sm">
          <span className="w-28 text-gray-500">{label}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100"><div className="h-full bg-amber-400" style={{ width: `${(v / 5) * 100}%` }} /></div>
          <span className="w-8 text-right font-medium text-gray-700">{v.toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return <div className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-2xl font-bold text-gray-900">{value}</p><p className="text-xs font-medium text-gray-500">{label}</p>{sub && <p className="mt-0.5 text-xs text-emerald-600">{sub}</p>}</div>;
}

// Visual job status tracker (happy path).
const TRACK: { status: PJobStatus; label: string; icon: string }[] = [
  { status: 'accepted', label: 'Confirmed', icon: '✓' },
  { status: 'on_the_way', label: 'On the way', icon: '🚗' },
  { status: 'arrived', label: 'Arrived', icon: '📍' },
  { status: 'in_progress', label: 'Cleaning', icon: '🧹' },
  { status: 'completed', label: 'Done', icon: '✨' },
];
const ORDER: PJobStatus[] = ['requested', 'accepted', 'on_the_way', 'arrived', 'in_progress', 'completed'];
export function StatusTracker({ status }: { status: PJobStatus }) {
  if (status === 'declined' || status === 'cancelled') {
    return <div className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-500">{status === 'declined' ? 'Declined by cleaner' : 'Cancelled'}</div>;
  }
  const cur = ORDER.indexOf(status);
  return (
    <div className="flex items-center">
      {TRACK.map((step, i) => {
        const idx = ORDER.indexOf(step.status);
        const done = cur >= idx;
        return (
          <React.Fragment key={step.status}>
            <div className="flex flex-col items-center">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${done ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-400'}`}>{step.icon}</div>
              <span className={`mt-1 text-[10px] ${done ? 'font-semibold text-teal-700' : 'text-gray-400'}`}>{step.label}</span>
            </div>
            {i < TRACK.length - 1 && <div className={`mx-1 h-0.5 flex-1 ${cur > idx ? 'bg-teal-600' : 'bg-gray-200'}`} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export function windowLabel(key: string) { return WINDOWS.find((w) => w.key === key)?.label ?? key; }
export function Empty({ msg, cta }: { msg: string; cta?: React.ReactNode }) {
  return <Card className="mx-auto mt-16 max-w-md p-10 text-center"><p className="text-lg font-medium text-gray-700">{msg}</p><div className="mt-4 flex justify-center gap-2">{cta ?? <Btn onClick={() => go('#/')}>Back to search</Btn>}</div></Card>;
}
