// localStorage helpers (always wrapped: private mode / blocked storage must not crash the game).
import { newMeta, type MetaState } from './logic/meta';

const KEY_TUTORIAL = 'pophero.tutorialDone';

function get(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function set(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export function tutorialDone(): boolean {
  return get(KEY_TUTORIAL) === '1';
}

export function markTutorialDone(): void {
  set(KEY_TUTORIAL, '1');
}

const KEY_SETTINGS = 'pophero.settings';

export interface Settings {
  muted: boolean;
  music: boolean;
  haptics: boolean;
  reducedMotion: boolean;
}

export function loadSettings(): Partial<Settings> {
  try {
    return JSON.parse(get(KEY_SETTINGS) ?? '{}') as Partial<Settings>;
  } catch {
    return {};
  }
}

export function saveSettings(s: Settings): void {
  set(KEY_SETTINGS, JSON.stringify(s));
}

const KEY_FTUE = 'pophero.ftueDone';

/** First-run hints (hand icon, lock explanation) already shown. */
export function ftueDone(): boolean {
  return get(KEY_FTUE) === '1';
}

export function markFtueDone(): void {
  set(KEY_FTUE, '1');
}

const KEY_META = 'pophero.meta';

/** Coins, permanent upgrades and unlocks (see logic/meta.ts). Missing fields fall back to defaults. */
export function loadMeta(): MetaState {
  const base = newMeta();
  try {
    const raw = JSON.parse(get(KEY_META) ?? '{}') as Partial<MetaState>;
    return { ...base, ...raw, levels: { ...base.levels, ...(raw.levels ?? {}) } };
  } catch {
    return base;
  }
}

export function saveMeta(m: MetaState): void {
  set(KEY_META, JSON.stringify(m));
}
