'use client';

import { useState } from 'react';

export default function HavenosLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await fetch('/api/havenos/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      window.location.reload();
    } else {
      setError('Wrong password.');
      setBusy(false);
    }
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: '#12307d' }}
    >
      <form
        onSubmit={submit}
        className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-xl"
      >
        <div
          className="text-center mb-1 font-bold text-2xl tracking-[0.3em]"
          style={{ fontFamily: 'Georgia, serif', color: '#12307d' }}
        >
          H A V E N
        </div>
        <div
          className="text-center text-sm mb-6 font-semibold tracking-widest"
          style={{ color: '#ffaf15' }}
        >
          OS · COMMAND CENTER
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          className="w-full border rounded-lg px-4 py-3 mb-3 text-base"
          style={{ borderColor: '#e5e7eb' }}
        />
        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
        <button
          type="submit"
          disabled={busy || !password}
          className="w-full text-white rounded-lg py-3 font-semibold disabled:opacity-50"
          style={{ background: '#0c5cbb' }}
        >
          {busy ? 'Checking…' : 'Open dashboards'}
        </button>
      </form>
    </main>
  );
}
