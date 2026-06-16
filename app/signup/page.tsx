'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Nav from '@/components/Nav';
import { Button, Card, Field } from '@/components/ui';
import { api } from '@/lib/marketplace/client';

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [role, setRole] = useState<'customer' | 'provider'>('customer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (params.get('role') === 'provider') setRole('provider');
  }, [params]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { ok, data } = await api('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, phone, password, role }),
    });
    setLoading(false);
    if (!ok) {
      setError(data?.error ?? 'Sign up failed');
      return;
    }
    router.push(role === 'provider' ? '/dashboard/provider' : '/cleaners');
    router.refresh();
  }

  return (
    <Card className="mx-auto mt-12 max-w-md p-8">
      <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
      <p className="mt-1 text-sm text-gray-500">Join HavenClean in under a minute.</p>

      <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => setRole('customer')}
          className={`rounded-lg py-2 text-sm font-semibold transition ${role === 'customer' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500'}`}
        >
          I need cleaning
        </button>
        <button
          type="button"
          onClick={() => setRole('provider')}
          className={`rounded-lg py-2 text-sm font-semibold transition ${role === 'provider' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500'}`}
        >
          I'm a cleaner
        </button>
      </div>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label={role === 'provider' ? 'Your name or business name' : 'Full name'}>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Email">
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Phone" hint="Shared with the other party only after a job is accepted.">
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Password" hint="At least 8 characters.">
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        </Field>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <Button type="submit" full disabled={loading}>
          {loading ? 'Creating account…' : role === 'provider' ? 'Start cleaning' : 'Create account'}
        </Button>
      </form>

      {role === 'provider' && (
        <p className="mt-4 rounded-lg bg-teal-50 px-3 py-2 text-xs text-teal-700">
          Next you'll build your profile and submit a background check. You'll appear in search once approved.
        </p>
      )}

      <p className="mt-5 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-teal-600 hover:underline">
          Log in
        </Link>
      </p>
    </Card>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <Suspense>
        <SignupForm />
      </Suspense>
    </div>
  );
}
