// Config JSON export / import / reset. Mutates the live objects so every reference stays valid.
import { config } from '../config';
import { patterns } from '../levels';

const defaults = JSON.parse(JSON.stringify({ config, patterns })) as { config: unknown; patterns: unknown };

type Obj = Record<string, unknown>;

function isObj(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Copies values from src into dst in place. Arrays are replaced element-wise (objects merged). */
function merge(dst: Obj, src: Obj): void {
  for (const [k, v] of Object.entries(src)) {
    const cur = dst[k];
    if (Array.isArray(v) && Array.isArray(cur)) {
      cur.length = 0;
      for (const item of v) cur.push(isObj(item) ? JSON.parse(JSON.stringify(item)) : item);
    } else if (isObj(v) && isObj(cur)) {
      merge(cur, v);
    } else if (k in dst && typeof v === typeof cur) {
      dst[k] = v;
    }
  }
}

/** Spike defs are replaced as objects so live spikes pick up new defs on the next pattern set. */
function mergePatterns(src: Obj): void {
  const live = patterns as unknown as Obj;
  for (const [id, p] of Object.entries(src)) {
    if (!isObj(p)) continue;
    if (isObj(live[id])) merge(live[id] as Obj, p);
    else live[id] = JSON.parse(JSON.stringify(p));
  }
}

export function exportJson(): string {
  return JSON.stringify({ config, patterns }, null, 2);
}

export function importJson(text: string): boolean {
  try {
    const data = JSON.parse(text) as Obj;
    if (isObj(data.config)) merge(config as unknown as Obj, data.config);
    if (isObj(data.patterns)) mergePatterns(data.patterns);
    return true;
  } catch (e) {
    console.warn('[config] invalid JSON', e);
    return false;
  }
}

export function resetDefaults(): void {
  const d = JSON.parse(JSON.stringify(defaults)) as { config: Obj; patterns: Obj };
  merge(config as unknown as Obj, d.config);
  mergePatterns(d.patterns);
}
