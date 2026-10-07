// The hero's ammo: bullets keep their kind (normal / fire / ice) in arrival order. Pure logic.

export type AmmoKind = 'normal' | 'fire' | 'ice';

interface Packet {
  kind: AmmoKind;
  n: number;
}

export class AmmoPool {
  private packets: Packet[] = [];
  total = 0;

  add(kind: AmmoKind, n: number): void {
    if (n <= 0) return;
    const last = this.packets[this.packets.length - 1];
    if (last && last.kind === kind) last.n += n;
    else this.packets.push({ kind, n });
    this.total += n;
  }

  /** Takes one bullet (oldest first). */
  take(): AmmoKind {
    const p = this.packets[0];
    if (!p) return 'normal';
    p.n--;
    this.total--;
    if (p.n <= 0) this.packets.shift();
    return p.kind;
  }

  /** Removes the n oldest bullets. */
  drop(n: number): void {
    while (n > 0 && this.packets.length > 0) {
      const p = this.packets[0];
      const k = Math.min(n, p.n);
      p.n -= k;
      this.total -= k;
      n -= k;
      if (p.n <= 0) this.packets.shift();
    }
  }

  /** Kind of the next bullet (for the UI). */
  peek(): AmmoKind {
    return this.packets[0]?.kind ?? 'normal';
  }
}
