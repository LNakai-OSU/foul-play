import { generateCase } from '../shared/generator/generate';
import type { Case } from '../shared/models';

/** A fresh, valid, error-free case (deterministic). */
export function goodCase(seed = 11, playerMin = 6, playerMax = 6): Case {
  return structuredClone(generateCase({ seed, tone: 'noir', playerMin, playerMax }));
}

export function killerOf(c: Case) {
  const k = c.characters.find((x) => x.isKiller);
  if (!k) throw new Error('no killer');
  return k;
}

export function innocentsOf(c: Case) {
  return c.characters.filter((x) => !x.isKiller);
}
