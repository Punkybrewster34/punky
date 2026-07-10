'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card, Field, Spinner, Stars } from '@/components/ui';
import { serviceLabel } from '@/lib/marketplace/constants';
import { api } from '@/lib/marketplace/client';

interface AdminProvider {
  userId: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  hourlyRate: number;
  services: string[];
  backgroundCheck: { status: string; submittedAt: string | null; reference: string | null; note: string };
  isVerified: boolean;
  rating: number;
  reviewCount: number;
  createdAt: string;
}

export default function AdminProvidersPage() {
  const [providers, setProviders] = useState<AdminProvider[] | null>(null);
  const [authed, setAuthed] = useState(true);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  async function load() {
    const { ok, status, data } = await api<{ providers: AdminProvider[] }>('/api/admin/marketplace/providers');
    if (status === 401) {
      setAuthed(false);
      return;
    }
    if (ok) {
      setAuthed(true);
      setProviders(data.providers);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoginError('');
    const { ok, data } = await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }) });
    if (!ok) {
      setLoginError(data?.error ?? 'Invalid password');
      return;
    }
    load();
  }

  async function decide(p: AdminProvider, decision: 'approve' | 'reject') {
    let note = '';
    if (decision === 'reject') note = prompt('Reason (optional)') ?? '';
    await api(`/api/admin/marketplace/providers/${p.userId}`, {
      method: 'POST',
      body: JSON.stringify({ decision, note }),
    });
    load();
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Card className="mx-auto mt-20 max-w-sm p-8">
          <h1 className="text-xl font-bold text-gray-900">Admin sign in</h1>
          <p className="mt-1 text-sm text-gray-500">Provider verification console.</p>
          <form onSubmit={login} className="mt-5 space-y-4">
            <Field label="Admin password">
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            {loginError && <p className="text-sm text-red-600">{loginError}</p>}
            <Button type="submit" full>
              Sign in
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  if (!providers) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Spinner />
      </div>
    );
  }

  const pending = providers.filter((p) => p.backgroundCheck.status === 'pending');
  const others = providers.filter((p) => p.backgroundCheck.status !== 'pending');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Provider verification</h1>
          <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700">
            ← Schedule admin
          </Link>
        </div>
        <p className="mt-1 text-gray-500">Approve background checks to make cleaners discoverable.</p>

        <h2 className="mt-8 text-sm font-bold uppercase tracking-wide text-gray-400">
          Pending review ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">Nothing waiting. 🎉</p>
        ) : (
          <div className="mt-3 space-y-4">
            {pending.map((p) => (
              <ProviderRow key={p.userId} p={p} onDecide={decide} />
            ))}
          </div>
        )}

        <h2 className="mt-10 text-sm font-bold uppercase tracking-wide text-gray-400">
          All cleaners ({others.length})
        </h2>
        <div className="mt-3 space-y-4">
          {others.map((p) => (
            <ProviderRow key={p.userId} p={p} onDecide={decide} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ProviderRow({ p, onDecide }: { p: AdminProvider; onDecide: (p: AdminProvider, d: 'approve' | 'reject') => void }) {
  const status = p.backgroundCheck.status;
  const color = status === 'approved' ? 'green' : status === 'pending' ? 'amber' : status === 'rejected' ? 'red' : 'gray';
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-gray-900">{p.name}</p>
          <p className="text-sm text-gray-500">
            {p.email} · {p.phone || 'no phone'} · {p.city || '—'}, {p.state || '—'}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium text-gray-700">${p.hourlyRate}/hr</span>
            <Stars rating={p.rating} />
            <span className="text-gray-500">{p.reviewCount} reviews</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {p.services.map((s) => (
              <span key={s} className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                {serviceLabel(s)}
              </span>
            ))}
          </div>
        </div>
        <div className="text-right">
          <Badge color={color as any}>{status.replace('_', ' ')}</Badge>
          {p.backgroundCheck.reference && (
            <p className="mt-1 text-xs text-gray-400">{p.backgroundCheck.reference}</p>
          )}
        </div>
      </div>
      <div className="mt-4 flex gap-2 border-t border-gray-100 pt-4">
        <Button onClick={() => onDecide(p, 'approve')} disabled={status === 'approved'}>
          Approve
        </Button>
        <Button variant="danger" onClick={() => onDecide(p, 'reject')} disabled={status === 'rejected'}>
          Reject
        </Button>
      </div>
    </Card>
  );
}
