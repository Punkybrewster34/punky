'use client';

// Thin client-side fetch helpers shared across marketplace pages.

export interface SessionUser {
  id: string;
  email: string;
  role: 'customer' | 'provider';
  name: string;
  phone: string;
  avatarUrl: string;
  lat: number | null;
  lng: number | null;
  address: string;
}

export async function api<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

export async function getJSON<T = any>(url: string): Promise<T> {
  const res = await fetch(url);
  return res.json();
}

export async function fetchMe(): Promise<{ user: SessionUser | null; profile: any }> {
  const res = await fetch('/api/auth/me', { cache: 'no-store' });
  return res.json();
}
