'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppState, Project } from './types';

const STORAGE_KEY = 'dreamhouse.v1';

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createProject(name = 'My Dream Home'): Project {
  const now = Date.now();
  return {
    id: uid(),
    name,
    location: '',
    lotWidth: 80,
    lotDepth: 110,
    stories: 1,
    budget: 600000,
    qualityTier: 'premium',
    style: 'farmhouse',
    exterior: 'fibercement',
    roof: 'architectural',
    finishes: { flooring: 'lvp', countertop: 'quartz', cabinets: 'semi' },
    features: [],
    contingencyPct: 10,
    rooms: [],
    notes: '',
    createdAt: now,
    updatedAt: now,
  };
}

// A ready-to-tour sample so the canvas is never empty on first load.
export function sampleProject(): Project {
  const p = createProject('Sunridge Modern Farmhouse');
  p.location = 'Austin, TX';
  p.budget = 850000;
  p.features = ['fireplace', 'smarthome', 'solar', 'evcharger', 'landscape'];
  p.rooms = [
    { id: uid(), type: 'porch', name: 'Front Porch', floor: 0, x: 6, y: 0, w: 28, h: 8 },
    { id: uid(), type: 'foyer', name: 'Foyer', floor: 0, x: 14, y: 8, w: 10, h: 8 },
    { id: uid(), type: 'great', name: 'Great Room', floor: 0, x: 0, y: 16, w: 24, h: 20 },
    { id: uid(), type: 'kitchen', name: 'Kitchen', floor: 0, x: 24, y: 16, w: 16, h: 14 },
    { id: uid(), type: 'pantry', name: 'Pantry', floor: 0, x: 40, y: 16, w: 7, h: 6 },
    { id: uid(), type: 'dining', name: 'Dining', floor: 0, x: 24, y: 30, w: 16, h: 12 },
    { id: uid(), type: 'master', name: 'Primary Suite', floor: 0, x: 0, y: 36, w: 18, h: 16 },
    { id: uid(), type: 'ensuite', name: 'Primary Bath', floor: 0, x: 18, y: 42, w: 12, h: 10 },
    { id: uid(), type: 'garage2', name: '2-Car Garage', floor: 0, x: 47, y: 16, w: 22, h: 22 },
    { id: uid(), type: 'laundry', name: 'Laundry', floor: 0, x: 40, y: 22, w: 7, h: 8 },
  ];
  return p;
}

function defaultState(): AppState {
  const proj = sampleProject();
  return { projects: [proj], activeProjectId: proj.id, isPro: false };
}

function loadState(): AppState {
  if (typeof window === 'undefined') return defaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed.projects || parsed.projects.length === 0) return defaultState();
    return parsed;
  } catch {
    return defaultState();
  }
}

export function useAppState() {
  // Start from a deterministic default so server and first client render match,
  // then hydrate from localStorage after mount to avoid hydration mismatch.
  const [state, setState] = useState<AppState>(() => defaultState());
  const [hydrated, setHydrated] = useState(false);
  const skipSave = useRef(true);

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full or unavailable — ignore */
    }
  }, [state, hydrated]);

  const activeProject =
    state.projects.find((p) => p.id === state.activeProjectId) ?? state.projects[0] ?? null;

  const updateProject = useCallback((patch: Partial<Project>) => {
    setState((s) => ({
      ...s,
      projects: s.projects.map((p) =>
        p.id === s.activeProjectId ? { ...p, ...patch, updatedAt: Date.now() } : p,
      ),
    }));
  }, []);

  return { state, setState, hydrated, activeProject, updateProject };
}
