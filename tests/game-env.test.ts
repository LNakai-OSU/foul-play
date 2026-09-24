import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { generateCase } from '../shared/generator/generate';
import { SETTINGS } from '../shared/generator/settings';
import { normPlace } from '../shared/ops';
import type { Case, Tone } from '../shared/models';
import { Rng } from '../shared/generator/rng';
import { ENVS, envOf, specFor } from '../src/game/env';
import { hasProp, PROPS, propOf } from '../src/game/art/index';
import { ICONS } from '../src/game/art/icons-art';
import { SPECIFIC_ICON_IDS, clueIconFor } from '../src/game/icons';
import { buildRoom } from '../src/game/rooms';
import { blockedAt, buildWorld, reachable } from '../src/game/world';
import { K, kindOf, variantOf } from '../src/game/tiles';
import { newState, sanitize } from '../src/game/logic';
import { goodCase } from './helpers';
import type { MapDef } from '../src/game/types';

const TONES: Tone[] = ['comedic', 'serious', 'noir'];
const gen = (settingId: string, tone: Tone, i = 0): Case => generateCase({ seed: 700 + i * 31, tone, settingId, playerMin: 4 + i * 4, playerMax: 6 + i * 6 });

/** The set of tile "words" a hub is made of: which kinds, and which props. */
function signature(m: MapDef): Set<string> {
  const out = new Set<string>();
  for (const c of [...m.ground, ...m.over]) {
    if (!c) continue;
    const k = kindOf(c);
    out.add(k === K.PROP || k === K.DECOR ? `prop:${propOf(variantOf(c))?.name}` : `k:${k}`);
  }
  return out;
}
const jaccard = (a: Set<string>, b: Set<string>): number => [...a].filter((x) => b.has(x)).length / new Set([...a, ...b]).size;

describe('environments', () => {
  it('every generator setting resolves to its own environment', () => {
    for (const s of SETTINGS) {
      for (const tone of TONES) expect(envOf(gen(s.id, tone)), `${s.id}/${tone}`).toBe(s.id);
      expect(ENVS[s.id as keyof typeof ENVS], s.id).toBeTruthy();
    }
    expect(new Set(SETTINGS.map((s) => ENVS[s.id as keyof typeof ENVS].label)).size).toBe(SETTINGS.length);
  });

  it('gives the twelve hubs genuinely different make-ups', () => {
    const hubs = SETTINGS.map((s) => {
      const w = buildWorld(gen(s.id, 'serious', 1));
      return { id: s.id, sig: signature(w.maps[w.hubId] as MapDef), w };
    });
    for (let i = 0; i < hubs.length; i++)
      for (let j = i + 1; j < hubs.length; j++) {
        const sim = jaccard(hubs[i]!.sig, hubs[j]!.sig);
        expect(sim, `${hubs[i]!.id} vs ${hubs[j]!.id} hubs are too alike`).toBeLessThan(0.62);
      }
    // and they are different shapes, not one template re-skinned
    const shapes = new Set(hubs.map((h) => `${(h.w.maps[h.w.hubId] as MapDef).w}x${(h.w.maps[h.w.hubId] as MapDef).h}`));
    expect(shapes.size).toBeGreaterThanOrEqual(8);
  });

  it('a room with the same name looks different in different settings', () => {
    const kitchens = ['restaurant', 'lodge', 'train', 'riverboat', 'manor'].map((id) => {
      const spec = specFor(id as never, normPlace(id === 'train' || id === 'riverboat' ? 'the galley' : 'the kitchen'));
      return buildRoom({ key: 'the kitchen', label: 'Kitchen', scene: false }, new Rng(5), 'r', id as never).map.ground.slice(0, 40).join(',') + spec.wt;
    });
    expect(new Set(kitchens).size).toBe(kitchens.length);
  });

  it('every room theme uses only props that exist, and every setting room is themed', () => {
    for (const s of SETTINGS) {
      const e = ENVS[s.id as keyof typeof ENVS];
      for (const r of e.rooms) {
        for (const tok of [...r.spec.back, ...r.spec.deco, ...(r.spec.outdoor?.border ?? [])]) {
          if (tok === 'WINDOW' || tok === 'NONE') continue;
          expect(hasProp(tok.split(':')[0] as string), `${s.id}/${r.spec.id}: ${tok}`).toBe(true);
        }
      }
      for (const room of s.rooms) {
        const key = normPlace(room);
        expect(e.rooms.some((r) => r.rx.test(key)), `${s.id}: "${room}" has no themed room`).toBe(true);
      }
    }
    expect(PROPS.length).toBeGreaterThan(150);
  });

  it('every room of every setting builds and is walkable from the door', () => {
    for (const s of SETTINGS) {
      for (const [i, room] of s.rooms.entries()) {
        const r = buildRoom({ key: normPlace(room), label: room, scene: false }, new Rng(i + 3), `room:${i}`, s.id as never);
        const seen = reachable(r.map, r.map.entrance.x, r.map.entrance.y);
        expect(seen.size, `${s.id}/${room}`).toBeGreaterThan(20);
        expect(blockedAt(r.map, r.map.entrance.x, r.map.entrance.y)).toBe(false);
      }
    }
  });

  it('degrades gracefully for a hand-built case with odd names', () => {
    const c = goodCase(3, 5, 5);
    const odd: Case = {
      ...c,
      setting: { name: 'The Wobbly Zeppelin', era: 'Steampunk airship', description: 'A dirigible above the clouds.' },
      title: 'Death Aloft',
      characters: c.characters.map((ch, i) => ({ ...ch, alibiPlace: ['the gondola', 'the bubble', 'the ballast tank', 'the crows nest'][i % 4] as string })),
      victim: { ...c.victim, placeOfDeath: 'the gas envelope' },
    };
    expect(envOf(odd)).toBe('generic');
    const w = buildWorld(odd);
    expect(Object.keys(w.maps).length).toBeGreaterThan(3);
    for (const m of Object.values(w.maps)) for (const n of m.npcs) expect([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => reachable(m, m.entrance.x, m.entrance.y).has(`${n.x + dx!},${n.y + dy!}`)), `${m.name}: ${n.name}`).toBe(true);
  });

  it('keyword-matches a hand-built case that names the rooms of a known setting', () => {
    const c = goodCase(9, 6, 6);
    const homemade: Case = { ...c, title: 'Murder Afloat', setting: { name: 'My Boat', era: 'Whenever', description: 'Party afloat.' }, characters: c.characters.map((ch, i) => ({ ...ch, alibiPlace: ['the boiler deck', 'the galley', 'the promenade deck', 'the cargo hold'][i % 4] as string })) };
    expect(['riverboat', 'liner']).toContain(envOf(homemade));
  });

  it('is deterministic including the wandering extras', () => {
    const c = gen('studio', 'noir', 1);
    expect(JSON.stringify(buildWorld(c).maps)).toBe(JSON.stringify(buildWorld(structuredClone(c)).maps));
  });

  it('gives every hub a few background people who can be reached', () => {
    for (const s of SETTINGS) {
      const w = buildWorld(gen(s.id, 'comedic', 1));
      const hub = w.maps[w.hubId] as MapDef;
      expect(hub.extras.length, s.id).toBeGreaterThanOrEqual(2);
      const seen = reachable(hub, hub.entrance.x, hub.entrance.y);
      for (const e of hub.extras) expect(seen.has(`${e.x},${e.y}`), `${s.id}: ${e.name}`).toBe(true);
    }
  });
});

describe('clue icons', () => {
  const corpus: { title: string; description: string; kind: string }[] = [];
  for (const s of SETTINGS) for (const tone of TONES) for (let i = 0; i < 4; i++) for (const e of gen(s.id, tone, i).evidence) corpus.push(e);

  it('gives 100% of generated clues an icon that exists, and at least 95% a specific one', () => {
    let specific = 0;
    for (const e of corpus) {
      const r = clueIconFor(e);
      expect(ICONS[r.id], `${e.title} -> ${r.id}`).toBeTruthy();
      if (r.specific) specific++;
    }
    expect(specific / corpus.length).toBeGreaterThanOrEqual(0.95);
  });

  it('has 60+ designed icons and maps the same clue to the same icon', () => {
    expect(SPECIFIC_ICON_IDS.length).toBeGreaterThanOrEqual(60);
    const a = clueIconFor({ title: 'A broken watch chain', description: 'x', kind: 'physical' });
    expect(clueIconFor({ title: 'A broken watch chain', description: 'x', kind: 'physical' })).toEqual(a);
    expect(a.id).toBe('watch_chain');
    expect(clueIconFor({ title: 'Ticking', description: 'X says: "..."', kind: 'verbal' }).verbal).toBe(true);
  });

  it('recognises the objects the user named, from title or description', () => {
    const id = (title: string, description = '') => clueIconFor({ title, description, kind: 'physical' }).id;
    expect(id('Bloodied letter opener')).toBe('letter_opener');
    expect(id('Empty poison vial')).toBe('vial');
    expect(id('Cold cup of coffee')).toBe('cup_lipstick');
    expect(id('Copy of the will')).toBe('will');
    expect(id('The telegram')).toBe('telegram');
    expect(id('Ring-shaped mark')).toBe('ring');
    expect(id('Missing cellar key')).toBe('key');
    expect(id('Muddy footprints')).toBe('footprints');
    expect(id('Something odd', 'A silver knife lay under the rug.')).toBe('knife');
  });

  it('falls back to a varied family icon for unknown things, never nothing', () => {
    const seen = new Set<string>();
    for (const t of ['Zorblax', 'Quantum widget', 'A strange thing', 'Item 7', 'Whatchamacallit', 'The odd bit', 'Thingummy', 'Mystery gizmo']) {
      const r = clueIconFor({ title: t, description: 'Something unremarkable and vague.', kind: 'physical' });
      expect(ICONS[r.id]).toBeTruthy();
      expect(r.specific).toBe(false);
      seen.add(r.id);
    }
    expect(seen.size).toBeGreaterThan(3);
  });
});

describe('saves', () => {
  it('resets or migrates old saves safely', () => {
    const c = gen('riverboat', 'noir', 1);
    const w = buildWorld(c);
    const s = newState(w);
    expect(s.v).toBe(3);
    const old = { ...s, v: 2, links: { gone: ['nobody'] } } as unknown as Parameters<typeof sanitize>[1];
    const fixed = sanitize(w, old);
    expect(fixed.v).toBe(3);
    expect(fixed.night).toEqual({});
    expect((fixed as unknown as { links?: unknown }).links).toBeUndefined();
    const dirty = { ...s, night: { nobody: 'room:x', [c.characters[0]!.id]: 'room:nowhere' }, cracked: ['ghost:where'], misses: -3, tmin: -5 };
    const clean = sanitize(w, dirty);
    expect(clean.night).toEqual({});
    expect(clean.cracked).toEqual([]);
    expect(clean.misses).toBe(0);
    expect(clean.tmin).toBe(0);
  });
});

describe('player-facing wording', () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => {
      const p = path.join(dir, f);
      return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(f) ? [p] : [];
    });
  const root = path.resolve(__dirname, '..');
  const files = [...walk(path.join(root, 'src', 'game'))];

  it('never tells a keyboard player to press A', () => {
    const bad = /\bPRESS A\b|\bpress A\b|\bA: NEXT|\bwith A\b|\bA button\b|\bhit A\b/;
    for (const f of files) {
      const lines = readFileSync(f, 'utf8').split('\n');
      lines.forEach((l, i) => expect(bad.test(l) && !/^\s*\/\//.test(l), `${path.relative(root, f)}:${i + 1}: ${l.trim()}`).toBe(false));
    }
    const readme = readFileSync(path.join(root, 'README.md'), 'utf8');
    expect(readme).not.toMatch(bad);
    expect(readme).toMatch(/SPACE/);
  });

  it('teaches SPACE where it matters', () => {
    const src = files.map((f) => readFileSync(f, 'utf8')).join('\n');
    expect(src).toMatch(/PRESS SPACE/);
    expect(src).toMatch(/SPACE: NEXT/);
    expect(src).toMatch(/press SPACE/);
  });
});

describe('the icon matcher generalises to hand-built clues', () => {
  it('gives everyday objects an icon that shows the object, never a gem or tool blob', () => {
    const cases: [string, string, string][] = [
      ['A crowbar', 'Left leaning against the shed door.', 'crowbar'],
      ['Pearl necklace', 'Snapped, with beads across the carpet.', 'necklace'],
      ['The stopped clock', 'It halted at ten past eleven.', 'clock'],
      ['A broken window', 'Shards inside, not outside.', 'window'],
      ['Cigarette butt', 'Still warm.', 'cigarette'],
      ['Piano wire', 'A short length, blood on one end.', 'wire'],
      ['Poisoned teacup', 'A faint almond smell.', 'mug'],
      ['Gold cufflink', 'Found under the sofa.', 'ring'],
      ['A silver key', 'On a red ribbon.', 'key'],
      ['A bloody dagger', 'Wiped on a curtain.', 'knife'],
    ];
    for (const [title, description, want] of cases) {
      const r = clueIconFor({ title, description, kind: 'physical' });
      expect(r.id, title).toBe(want);
      expect(r.specific, title).toBe(true);
      expect(ICONS[r.id], title).toBeTruthy();
    }
  });
});
