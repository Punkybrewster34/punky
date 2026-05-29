import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const DATA_DIR = path.join(process.cwd(), 'data');
const APP_FILE = path.join(DATA_DIR, 'app.json');

export type Availability =
  | 'available'
  | 'morning-only'
  | 'afternoon-only'
  | 'not-available'
  | null;

export interface Cleaner {
  id: string;
  name: string;
  token: string;
  notes?: string;
  active: boolean;
  createdAt: string;
}

export interface CleanerSchedule {
  availability: Record<string, Availability>;
  comments: string;
  lastUpdated: string;
}

export interface AppSettings {
  businessName: string;
  welcomeMessage: string;
  scheduleInstructions: string;
  showWeekends: boolean;
}

export interface AppData {
  settings: AppSettings;
  cleaners: Cleaner[];
  schedules: Record<string, CleanerSchedule>;
}

const DEFAULT_SETTINGS: AppSettings = {
  businessName: 'Punky Cleaning',
  welcomeMessage: 'Hi! Please set your availability for the upcoming two weeks.',
  scheduleInstructions:
    'Tap a button to set your availability for each day. Your changes are saved automatically.',
  showWeekends: true,
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function readData(): AppData {
  ensureDataDir();
  if (!fs.existsSync(APP_FILE)) {
    const initial: AppData = { settings: DEFAULT_SETTINGS, cleaners: [], schedules: {} };
    fs.writeFileSync(APP_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  try {
    const raw = fs.readFileSync(APP_FILE, 'utf-8');
    const data = JSON.parse(raw) as AppData;
    if (!data.settings) data.settings = DEFAULT_SETTINGS;
    return data;
  } catch {
    return { settings: DEFAULT_SETTINGS, cleaners: [], schedules: {} };
  }
}

export function writeData(data: AppData): void {
  ensureDataDir();
  fs.writeFileSync(APP_FILE, JSON.stringify(data, null, 2));
}

export function getCleanerByToken(token: string): Cleaner | null {
  const data = readData();
  return data.cleaners.find((c) => c.token === token && c.active) ?? null;
}

export function getScheduleForCleaner(token: string): CleanerSchedule {
  const data = readData();
  return data.schedules[token] ?? { availability: {}, comments: '', lastUpdated: '' };
}

export function updateSchedule(token: string, updates: Partial<CleanerSchedule>): void {
  const data = readData();
  const existing = data.schedules[token] ?? { availability: {}, comments: '', lastUpdated: '' };
  data.schedules[token] = { ...existing, ...updates, lastUpdated: new Date().toISOString() };
  writeData(data);
}

export function addCleaner(name: string, notes?: string): Cleaner {
  const data = readData();
  const cleaner: Cleaner = {
    id: uuidv4(),
    name: name.trim(),
    token: uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, ''),
    notes,
    active: true,
    createdAt: new Date().toISOString(),
  };
  data.cleaners.push(cleaner);
  writeData(data);
  return cleaner;
}

export function updateCleaner(
  id: string,
  updates: { name?: string; notes?: string; active?: boolean }
): boolean {
  const data = readData();
  const idx = data.cleaners.findIndex((c) => c.id === id);
  if (idx === -1) return false;
  data.cleaners[idx] = { ...data.cleaners[idx], ...updates };
  writeData(data);
  return true;
}

export function deleteCleaner(id: string): boolean {
  const data = readData();
  const cleaner = data.cleaners.find((c) => c.id === id);
  if (!cleaner) return false;
  delete data.schedules[cleaner.token];
  data.cleaners = data.cleaners.filter((c) => c.id !== id);
  writeData(data);
  return true;
}

export function updateSettings(updates: Partial<AppSettings>): void {
  const data = readData();
  data.settings = { ...data.settings, ...updates };
  writeData(data);
}
