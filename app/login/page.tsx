'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Nav from '@/components/Nav';
import { Button, Card, Field } from '@/components/ui';
import { api } from '@/lib/marketplace/client';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { ok, data } = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!ok) {
      setError(data?.error ?? 'Login failed');
      return;
    }
    const dest = next || (data.user.role === 'provider' ? '/dashboard/provider' : '/cleaners');
    router.push(dest);
    router.refresh();
  }

  return (
    <Card className="mx-auto mt-12 max-w-md p-8">
      <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
      <p className="mt-1 text-sm text-gray-500">Log in to book cleanings or manage jobs.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label="Email">
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Password">
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <Button type="submit" full disabled={loading}>
          {loading ? 'Logging in…' : 'Log in'}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-gray-500">
        New here?{' '}
        <Link href="/signup" className="font-semibold text-teal-600 hover:underline">
          Create an account
        </Link>
      </p>
      <div className="mt-6 rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
        <p className="font-medium text-gray-600">Demo accounts (password: password123)</p>
        <p>customer@haven.demo · maria@haven.demo (provider)</p>
      </div>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
