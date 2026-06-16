import React, { useState } from 'react';
import * as db from './store';
import type { PublicProvider } from './store';
import { Badge, Btn, Card, Stars, TierBadge, go } from './ui';

export function Admin() {
  const [, tick] = useState(0);
  const providers = db.allProviders();
  const refresh = () => tick((n) => n + 1);
  function decide(id: string, approve: boolean) { let note = ''; if (!approve) note = prompt('Reason (optional)') ?? ''; db.decideBackgroundCheck(id, approve, note); refresh(); }
  const pending = providers.filter((p) => p.backgroundCheck.status === 'pending');
  const others = providers.filter((p) => p.backgroundCheck.status !== 'pending');
  const totalJobs = db.allProviders().reduce((s, p) => s + p.completedJobs, 0);
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900">Operations console</h1>
      <p className="mt-1 text-gray-500">Approve background checks and monitor the marketplace.</p>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4"><p className="text-2xl font-bold text-gray-900">{providers.length}</p><p className="text-xs text-gray-500">Cleaners</p></Card>
        <Card className="p-4"><p className="text-2xl font-bold text-gray-900">{providers.filter((p) => p.isVerified).length}</p><p className="text-xs text-gray-500">Verified</p></Card>
        <Card className="p-4"><p className="text-2xl font-bold text-amber-600">{pending.length}</p><p className="text-xs text-gray-500">Pending review</p></Card>
        <Card className="p-4"><p className="text-2xl font-bold text-gray-900">{totalJobs}</p><p className="text-xs text-gray-500">Completed jobs</p></Card>
      </div>

      <h2 className="mt-8 text-sm font-bold uppercase tracking-wide text-gray-400">Pending review ({pending.length})</h2>
      {pending.length === 0 ? <p className="mt-2 text-sm text-gray-500">Nothing waiting. 🎉</p> : <div className="mt-3 space-y-4">{pending.map((p) => <Row key={p.id} p={p} decide={decide} />)}</div>}
      <h2 className="mt-10 text-sm font-bold uppercase tracking-wide text-gray-400">All cleaners ({others.length})</h2>
      <div className="mt-3 space-y-4">{others.map((p) => <Row key={p.id} p={p} decide={decide} />)}</div>
    </div>
  );
}

function Row({ p, decide }: { p: PublicProvider; decide: (id: string, approve: boolean) => void }) {
  const s = p.backgroundCheck.status;
  const color = s === 'approved' ? 'green' : s === 'pending' ? 'amber' : s === 'rejected' ? 'red' : 'gray';
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><button onClick={() => go(`#/cleaner/${p.id}`)} className="font-semibold text-gray-900 hover:underline">{p.name}</button><TierBadge tier={p.tier} /></div>
          <p className="text-sm text-gray-500">{p.city || '—'}, {p.state || '—'} · ${p.hourlyRate}/hr · {p.completedJobs} jobs</p>
          <div className="mt-2 flex items-center gap-2 text-sm"><Stars rating={p.rating} /><span className="text-gray-500">{p.reviewCount} reviews</span>{p.idVerified && <Badge color="blue">ID verified</Badge>}{p.insured && <Badge color="teal">Insured</Badge>}</div>
        </div>
        <div className="text-right"><Badge color={color}>{s.replace('_', ' ')}</Badge>{p.backgroundCheck.reference && <p className="mt-1 text-xs text-gray-400">{p.backgroundCheck.reference}</p>}</div>
      </div>
      <div className="mt-4 flex gap-2 border-t border-gray-100 pt-4"><Btn onClick={() => decide(p.id, true)} disabled={s === 'approved'}>Approve</Btn><Btn variant="danger" onClick={() => decide(p.id, false)} disabled={s === 'rejected'}>Reject</Btn></div>
    </Card>
  );
}
