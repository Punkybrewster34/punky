import fs from 'fs';
import os from 'os';
import path from 'path';
import { MarketplaceData } from './types';

// Single-file JSON store. Keeps the app dependency-free and instantly
// deployable on any host with a persistent disk. For multi-instance /
// serverless scale, swap these read/write helpers for a real database
// (the rest of the domain layer in db.ts only talks through these).

// Pick a writable data directory. A persistent-disk host uses the project
// `data/` folder (data survives restarts). On a serverless/read-only
// filesystem (e.g. Vercel) the project dir isn't writable, so fall back to
// the OS temp dir — the demo re-seeds on each cold start.
function resolveDataDir(): string {
  const projectDir = path.join(process.cwd(), 'data');
  if (process.env.DATA_DIR) return process.env.DATA_DIR;
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join(os.tmpdir(), 'havenclean-data');
  }
  try {
    fs.mkdirSync(projectDir, { recursive: true });
    fs.accessSync(projectDir, fs.constants.W_OK);
    return projectDir;
  } catch {
    return path.join(os.tmpdir(), 'havenclean-data');
  }
}

const DATA_DIR = resolveDataDir();
const FILE = path.join(DATA_DIR, 'marketplace.json');

const EMPTY: MarketplaceData = {
  users: [],
  profiles: [],
  jobs: [],
  reviews: [],
  seeded: false,
};

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function readData(): MarketplaceData {
  ensureDir();
  if (!fs.existsSync(FILE)) {
    fs.writeFileSync(FILE, JSON.stringify(EMPTY, null, 2));
    return structuredClone(EMPTY);
  }
  try {
    const raw = fs.readFileSync(FILE, 'utf-8');
    const data = JSON.parse(raw) as MarketplaceData;
    return {
      users: data.users ?? [],
      profiles: data.profiles ?? [],
      jobs: data.jobs ?? [],
      reviews: data.reviews ?? [],
      seeded: data.seeded ?? false,
    };
  } catch {
    return structuredClone(EMPTY);
  }
}

export function writeData(data: MarketplaceData): void {
  ensureDir();
  // Write atomically via a temp file to avoid corruption on crash.
  const tmp = `${FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, FILE);
}

// Read-modify-write helper used by every mutation in the domain layer.
export function mutate<T>(fn: (data: MarketplaceData) => T): T {
  const data = readData();
  const result = fn(data);
  writeData(data);
  return result;
}
