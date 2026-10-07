// navigator.vibrate where available (Android). iOS Safari has none: silently ignored.
import { config } from '../config';

export function vibrate(ms: number): void {
  if (!config.haptics.enabled || ms <= 0) return;
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(ms);
  } catch {
    // ignore
  }
}
