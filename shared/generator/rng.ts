/** Small seeded PRNG (mulberry32) plus helpers. Deterministic per seed. */

export function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

export class Rng {
  private state: number;
  constructor(seed: number) {
    this.state = seed >>> 0 || 0x9e3779b9;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error('pick() from empty array');
    return arr[Math.floor(this.next() * arr.length)] as T;
  }

  shuffle<T>(arr: readonly T[]): T[] {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [out[i], out[j]] = [out[j] as T, out[i] as T];
    }
    return out;
  }

  /** n distinct items (or fewer if the array is shorter). */
  sample<T>(arr: readonly T[], n: number): T[] {
    return this.shuffle(arr).slice(0, n);
  }

  /** Base-36 id fragment. */
  token(len = 8): string {
    let s = '';
    while (s.length < len) s += Math.floor(this.next() * 36 ** 4).toString(36).padStart(4, '0');
    return s.slice(0, len);
  }
}

/** Replace {placeholders}. Unknown keys are left in place so tests can catch them. */
export function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (m, key: string) => (key in vars ? (vars[key] as string) : m));
}

export function capitalize(s: string): string {
  return s ? s[0]!.toUpperCase() + s.slice(1) : s;
}
