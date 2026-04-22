import { TypingProfile, TypingSettings, HistoryEntry } from '../types/typing';
import { getDefaultSettings, validateSettings } from '../engine/planning';

const PROFILES_KEY = 'autotyper.profiles.v1';
const ACTIVE_PROFILE_KEY = 'autotyper.activeProfile.v1';
const HISTORY_KEY = 'autotyper.history.v1';
const HISTORY_CAP = 50;

export const BUILTIN_PROFILE_IDS = {
  careful: 'builtin:careful',
  casual: 'builtin:casual',
  fastMessy: 'builtin:fast-messy',
} as const;

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function genId(prefix: string): string {
  return `${prefix}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
}

function makeBuiltIns(): TypingProfile[] {
  const base = getDefaultSettings();
  const now = Date.now();
  return [
    {
      id: BUILTIN_PROFILE_IDS.careful,
      name: 'Careful',
      builtIn: true,
      createdAt: now,
      settings: validateSettings({
        ...base,
        wpm: 55,
        mistakeProbability: 0.005,
        speedRandomness: 0,
        useHomophoneSwaps: false,
        useBursts: false,
      }),
    },
    {
      id: BUILTIN_PROFILE_IDS.casual,
      name: 'Casual',
      builtIn: true,
      createdAt: now,
      settings: validateSettings({
        ...base,
        wpm: 80,
        mistakeProbability: 0.02,
        speedRandomness: 1,
        homophoneSwapProbability: 0.04,
      }),
    },
    {
      id: BUILTIN_PROFILE_IDS.fastMessy,
      name: 'Fast & messy',
      builtIn: true,
      createdAt: now,
      settings: validateSettings({
        ...base,
        wpm: 130,
        mistakeProbability: 0.06,
        maxExtraLettersAfterMistake: 4,
        speedRandomness: 2,
        homophoneSwapProbability: 0.08,
      }),
    },
  ];
}

export function loadProfiles(): TypingProfile[] {
  if (typeof localStorage === 'undefined') return makeBuiltIns();
  const stored = safeParse<TypingProfile[]>(localStorage.getItem(PROFILES_KEY)) ?? [];
  const userProfiles = stored
    .filter(p => p && p.id && p.name && p.settings && !p.builtIn)
    .map(p => ({ ...p, settings: validateSettings(p.settings) }));
  return [...makeBuiltIns(), ...userProfiles];
}

function persistUserProfiles(profiles: TypingProfile[]): void {
  if (typeof localStorage === 'undefined') return;
  const userOnly = profiles.filter(p => !p.builtIn);
  localStorage.setItem(PROFILES_KEY, JSON.stringify(userOnly));
}

export function saveProfile(name: string, settings: TypingSettings): TypingProfile {
  const profiles = loadProfiles();
  const trimmed = name.trim();
  const existing = profiles.find(p => !p.builtIn && p.name.toLowerCase() === trimmed.toLowerCase());
  let updated: TypingProfile;
  let next: TypingProfile[];
  if (existing) {
    updated = { ...existing, settings: validateSettings(settings) };
    next = profiles.map(p => (p.id === existing.id ? updated : p));
  } else {
    updated = {
      id: genId('profile'),
      name: trimmed || 'Untitled',
      settings: validateSettings(settings),
      createdAt: Date.now(),
    };
    next = [...profiles, updated];
  }
  persistUserProfiles(next);
  return updated;
}

export function renameProfile(id: string, name: string): TypingProfile[] {
  const profiles = loadProfiles();
  const trimmed = name.trim() || 'Untitled';
  const next = profiles.map(p =>
    p.id === id && !p.builtIn ? { ...p, name: trimmed } : p
  );
  persistUserProfiles(next);
  return next;
}

export function deleteProfile(id: string): TypingProfile[] {
  const profiles = loadProfiles();
  const next = profiles.filter(p => !(p.id === id && !p.builtIn));
  persistUserProfiles(next);
  if (loadActiveProfileId() === id) {
    saveActiveProfileId(null);
  }
  return next;
}

export function loadActiveProfileId(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(ACTIVE_PROFILE_KEY);
}

export function saveActiveProfileId(id: string | null): void {
  if (typeof localStorage === 'undefined') return;
  if (id) {
    localStorage.setItem(ACTIVE_PROFILE_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_PROFILE_KEY);
  }
}

export function loadHistory(): HistoryEntry[] {
  if (typeof localStorage === 'undefined') return [];
  const stored = safeParse<HistoryEntry[]>(localStorage.getItem(HISTORY_KEY)) ?? [];
  return stored
    .filter(e => e && e.id && typeof e.createdAt === 'number')
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function appendHistory(entry: Omit<HistoryEntry, 'id' | 'createdAt'>): HistoryEntry {
  const full: HistoryEntry = {
    ...entry,
    id: genId('hist'),
    createdAt: Date.now(),
  };
  const existing = loadHistory();
  const next = [full, ...existing].slice(0, HISTORY_CAP);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  }
  return full;
}

export function deleteHistoryEntry(id: string): HistoryEntry[] {
  const next = loadHistory().filter(e => e.id !== id);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  }
  return next;
}

export function clearHistory(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(HISTORY_KEY);
}
