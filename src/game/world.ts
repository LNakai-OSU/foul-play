/**
 * Turns a Case into a playable world: a town hub with one building per place, a furnished room for each
 * place, suspects standing where their alibi says they were, clues lying around or waiting to be told,
 * and story chapters from the timeline. Pure and deterministic (no DOM), so it is unit-tested.
 */
import type { Case, Character } from '../../shared/models';
import { Rng, hashSeed } from '../../shared/generator/rng';
import { normPlace } from '../../shared/ops';
import { extractQuote, titleCase, upperFirst } from './text';
import { clueIconFor } from './icons';
import { ENVS, envOf } from './env';
import type { EnvDef } from './env';
import { EXTRAS } from './extras';
import { blockedAt, reachable } from './grid';
import { boatHub, galleryHub, restaurantHub, theatreHub, trainHub } from './hubs2';
import { clubHub, feteHub, lodgeHub, manorHub, plainHub, stationHub, studioHub } from './hubs';
import type { HubResult, Place } from './hubs';
import { buildRoom } from './rooms';
import type { RoomResult } from './rooms';
import type { EnvId } from './art/skins';
import type { IconRef } from './icons';
import type { Chapter, Dir, ExtraDef, Look, MapDef, Witness, World } from './types';
import { buildClaims, classifyCorpus, deriveNight, findEmptyWitness, normaliseChapterTimes, ritualClue, synthRounds } from './facts';
import { RITUALS } from './rituals';
import { propCell } from './art/registry';

// ---------------------------------------------------------------------------------------------
// rules shared with logic.ts

/** Composure lost when a clue that implicates `n` suspects is presented. Rarer clues hit harder. */
export function damageFor(n: number): number {
  if (n <= 0) return 0;
  if (n === 1) return 5;
  if (n === 2) return 3;
  if (n === 3) return 2;
  return 1;
}

export const MAX_COMPOSURE = 10;

export { blockedAt, reachable };

// ---------------------------------------------------------------------------------------------
// places and themes

const FILLER_PLACES = ['the hallway', 'the study', 'the kitchen', 'the garden', 'the parlour', 'the cellar'];

function collectPlaces(c: Case): Place[] {
  const list: Place[] = [];
  const add = (label: string, scene = false) => {
    const key = normPlace(label);
    if (!key) return;
    const ex = list.find((p) => p.key === key);
    if (ex) ex.scene = ex.scene || scene;
    else list.push({ key, label: upperFirst(titleCase(label.trim())), scene });
  };
  add(c.victim.placeOfDeath, true);
  for (const ch of c.characters) add(ch.alibiPlace);
  if (!list.some((p) => p.scene)) add('the scene of the crime', true);
  for (const f of FILLER_PLACES) if (list.length < 4) add(f);
  if (list.length > 12) {
    const scene = list.find((p) => p.scene) as Place;
    const rest = list.filter((p) => p !== scene).slice(0, 11);
    return [scene, ...rest];
  }
  return list;
}

// ---------------------------------------------------------------------------------------------
// looks

const SKINS = ['#f8d8b0', '#e8b890', '#c88858', '#a06840', '#7a4a2c'];
const HAIRS = ['#181410', '#402010', '#704020', '#c8a040', '#d0d0d0', '#a02818', '#30302c', '#e8d8a0'];
const OUTFITS = ['#c03030', '#3050b8', '#308850', '#8840a0', '#d08820', '#28808a', '#903058', '#586068'];
const TRIMS = ['#f0e0a0', '#f8f8f8', '#d0d0d0', '#f0c860'];

export function lookFor(seed: string, text: string, forceHat?: Look['hat']): Look {
  const r = new Rng(hashSeed(seed));
  const t = text.toLowerCase();
  let hat: Look['hat'] = forceHat ?? 'none';
  let coat = r.chance(0.3);
  let outfit = r.pick(OUTFITS);
  if (!forceHat) {
    if (/chef|cook|baker/.test(t)) hat = 'chef';
    else if (/butler|servant|footman|valet/.test(t)) {
      hat = 'none';
      outfit = '#282830';
    } else if (/doctor|physician|nurse|surgeon/.test(t)) {
      outfit = '#f0f0f0';
      coat = true;
    } else if (/captain|sailor|pilot|commodore|steward/.test(t)) hat = 'cap';
    else if (/maid|governess/.test(t)) hat = 'bow';
    else if (/lawyer|banker|magnate|tycoon|baron|lord/.test(t)) hat = 'tophat';
    else if (/artist|painter|actress|singer|diva|star|poet/.test(t)) hat = 'beret';
    else if (/detective|inspector|journalist|reporter/.test(t)) hat = 'fedora';
    else if (r.chance(0.25)) hat = r.pick(['fedora', 'cap', 'bow', 'beret'] as const);
  }
  return {
    skin: r.pick(SKINS),
    hair: r.pick(HAIRS),
    hairStyle: r.pick([0, 1, 2] as const),
    outfit,
    trim: r.pick(TRIMS),
    pants: r.pick(['#384058', '#403830', '#282830', '#504868']),
    hat,
    hatColor: r.pick(['#583820', '#282830', '#8a2020', '#204a70', '#e8e8e8']),
    glasses: r.chance(0.22),
    coat,
  };
}

export const DETECTIVE_LOOK: Look = {
  skin: '#f8d8b0',
  hair: '#402010',
  hairStyle: 1,
  outfit: '#d8452a',
  trim: '#f8e8a0',
  pants: '#242a44',
  hat: 'fedora',
  hatColor: '#2a2436',
  glasses: false,
  coat: true,
};

const INSPECTORS = ['Inspector Hale', 'Inspector Finch', 'Sergeant Byrne', 'Chief Okafor', 'Inspector Marlowe', 'Sergeant Quill', 'Chief Ramos', 'Inspector Doyle'];

// ---------------------------------------------------------------------------------------------
// hubs

const HUBS: Record<EnvId, (places: Place[], rng: Rng) => HubResult> = {
  generic: plainHub,
  fete: feteHub,
  gallery: galleryHub,
  station: stationHub,
  riverboat: (p, r) => boatHub('riverboat', p, r),
  manor: manorHub,
  liner: (p, r) => boatHub('liner', p, r),
  lodge: lodgeHub,
  studio: studioHub,
  restaurant: restaurantHub,
  train: trainHub,
  club: clubHub,
  theatre: theatreHub,
};

/** Wandering background people in the hub (crew, guests, stagehands). */
function placeExtras(hub: HubResult, env: EnvDef, rng: Rng): ExtraDef[] {
  const kinds = EXTRAS[env.id];
  const m = hub.map;
  const free = (x: number, y: number) => !blockedAt(m, x, y) && !(Math.abs(x - hub.spawn.x) < 3 && Math.abs(y - hub.spawn.y) < 3) && !Object.values(hub.doors).some((d) => d.sx === x && d.sy === y);
  const seen = reachable(m, hub.spawn.x, hub.spawn.y);
  const out: ExtraDef[] = [];
  const cells = rng.shuffle([...seen].map((k) => k.split(',').map(Number) as [number, number]).filter(([x, y]) => free(x as number, y as number)));
  const want = Math.min(kinds.length, 4);
  for (let i = 0; i < want && cells[i]; i++) {
    const kind = kinds[i % kinds.length] as (typeof kinds)[number];
    const [x, y] = cells[i] as [number, number];
    out.push({ id: `extra:${i}`, name: kind.name, x, y, look: lookFor(`extra${i}${env.id}`, kind.hint), line: kind.line, witnessId: `wit:${i}` });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// the world

export function buildWorld(c: Case): World {
  const rng = new Rng((c.seed ?? 0) ^ hashSeed(c.id + c.title) || 7);
  const envId = envOf(c);
  const env = ENVS[envId];
  const places = collectPlaces(c);
  const ordered = rng.shuffle(places);
  const hub = HUBS[envId](ordered, rng);
  hub.map.extras = placeExtras(hub, env, rng);
  hub.map.name = c.setting.name ? upperFirst(titleCase(c.setting.name)) : hub.map.name;
  const maps: Record<string, MapDef> = { hub: hub.map };
  const rooms = new Map<string, RoomResult>();
  const roomIdOf = (key: string) => `room:${key}`;
  for (const p of places) {
    const room = buildRoom(p, rng, roomIdOf(p.key), envId);
    const door = hub.doors[p.key] as HubResult['doors'][string];
    room.map.warps.push({ x: room.grid.entrance.x, y: room.map.h - 1, to: 'hub', tx: door.sx, ty: door.sy, dir: door.dir, label: hub.map.name });
    hub.map.warps.push({ x: door.x, y: door.y, to: room.map.id, tx: room.grid.entrance.x, ty: room.grid.entrance.y, dir: 'up', label: p.scene ? `CRIME SCENE: ${p.label}` : p.label, scene: p.scene });
    maps[room.map.id] = room.map;
    rooms.set(p.key, room);
  }
  const scenePlace = places.find((p) => p.scene) as Place;
  const sceneMapId = roomIdOf(scenePlace.key);
  const fallbackPlace = places.find((p) => !p.scene) ?? scenePlace;

  const place = (room: RoomResult, avoidNear?: { x: number; y: number }, far = false): { x: number; y: number } | null => {
    const g = room.grid;
    const cells: [number, number][] = [];
    for (let y = room.region.y0; y <= room.region.y1; y++) for (let x = room.region.x0; x <= room.region.x1; x++) cells.push([x, y]);
    let pool = rng.shuffle(cells);
    if (avoidNear) pool = pool.sort((a, b) => (far ? -1 : 1) * (Math.abs(a[0] - avoidNear.x) + Math.abs(a[1] - avoidNear.y) - (Math.abs(b[0] - avoidNear.x) + Math.abs(b[1] - avoidNear.y))));
    for (const [x, y] of pool) if (g.canPlace(x, y, room.region, true)) return { x, y };
    return null;
  };

  // suspects stand where their alibi says
  const charMap: Record<string, string> = {};
  const lastByRoom = new Map<string, { x: number; y: number }>();
  for (const ch of c.characters) {
    const key = normPlace(ch.alibiPlace);
    const p = places.find((pl) => pl.key === key && !pl.scene) ?? fallbackPlace;
    const room = rooms.get(p.key) as RoomResult;
    // suspects stand apart, not in a tidy row: take the cell farthest from whoever is already here (random when alone)
    const spot = place(room, lastByRoom.get(p.key), true);
    if (!spot) continue;
    lastByRoom.set(p.key, spot);
    const dirs: Dir[] = ['down', 'left', 'right', 'up'];
    room.grid.npcs.push({ id: `npc:${ch.id}`, kind: 'suspect', charId: ch.id, name: ch.name, x: spot.x, y: spot.y, dir: rng.pick(dirs), look: lookFor(ch.id + ch.name, `${ch.publicBio} ${ch.secretRole} ${ch.costume}`) });
    charMap[ch.id] = room.map.id;
  }
  // the body
  const sceneRoom = rooms.get(scenePlace.key) as RoomResult;
  const bodySpot = place(sceneRoom, { x: sceneRoom.map.w >> 1, y: sceneRoom.map.h >> 1 });
  if (bodySpot) sceneRoom.grid.npcs.push({ id: 'npc:body', kind: 'body', charId: null, name: c.victim.name || 'The victim', x: bodySpot.x, y: bodySpot.y, dir: 'down', look: lookFor('victim', '') });
  // the inspector waits near the spawn
  const inspectorName = INSPECTORS[hashSeed(c.id + c.title) % INSPECTORS.length] as string;
  hub.map.npcs.push({ id: 'npc:inspector', kind: 'inspector', charId: null, name: inspectorName, x: hub.inspector.x, y: hub.inspector.y, dir: 'left', look: lookFor('inspector', '', 'police') });

  // evidence: physical clues lie around, verbal ones are told
  const itemMap: Record<string, string> = {};
  const tips: Record<string, string[]> = {};
  const tipGiver: Record<string, string> = {};
  const tipText: Record<string, string> = {};
  const load = new Map<string, number>(places.map((p) => [p.key, 0]));
  for (const e of c.evidence) {
    if (e.kind === 'verbal') {
      const { speaker, quote } = extractQuote(e.description);
      const named = speaker ? c.characters.find((x) => x.name === speaker) : undefined;
      const pool = c.characters.filter((x) => !e.implicatedIds.includes(x.id));
      const giver: Character | undefined = named ?? (pool.length ? rng.pick(pool) : c.characters[0]);
      if (!giver || !charMap[giver.id]) {
        // nobody can tell it: drop it on the floor as a note instead
      } else {
        (tips[giver.id] ??= []).push(e.id);
        tipGiver[e.id] = giver.id;
        tipText[e.id] = named ? quote : `Word is that ${quote.charAt(0).toLowerCase()}${quote.slice(1)}`;
        continue;
      }
    }
    const d = normPlace(e.description);
    let target = places.find((p) => p.key.length > 3 && d.includes(p.key));
    if (!target && /\bat the scene\b|\bscene\b|\bthe body\b|\bvictim'?s desk\b/.test(d)) target = scenePlace;
    if (!target) {
      const cand = rng.sample(places, 3).sort((a, b) => (load.get(a.key) as number) - (load.get(b.key) as number));
      target = cand[0] as Place;
    }
    let room = rooms.get(target.key) as RoomResult;
    let spot = place(room);
    if (!spot) {
      for (const p of places) {
        room = rooms.get(p.key) as RoomResult;
        spot = place(room);
        if (spot) break;
      }
    }
    if (!spot) throw new Error('No room left for a clue');
    room.grid.items.push({ evidenceId: e.id, x: spot.x, y: spot.y });
    itemMap[e.id] = room.map.id;
    load.set(target.key, (load.get(target.key) as number) + 1);
  }

  // the facts of the night: claims, what each clue establishes, and the staff who counted heads at the shot
  const night = deriveNight(c);
  const roomKeyToMap = new Map<string, string>(places.map((p) => [p.key, roomIdOf(p.key)]));
  const emptyW = findEmptyWitness(c, roomKeyToMap, night);
  const claims = buildClaims(c, charMap, night, emptyW?.obs.room ?? null);
  const witnesses: Witness[] = hub.map.extras.filter((e) => e.witnessId).map((e) => ({ id: e.witnessId as string, name: e.name, line: e.line }));
  const facts = classifyCorpus(c, emptyW, { maps });
  const synth = synthRounds(c, claims, sceneMapId, night, witnesses, { maps });
  const evidenceAll = [...c.evidence, ...synth.evidence];
  Object.assign(facts, synth.facts);
  for (const e of synth.evidence) {
    const giver = synth.giver[e.id] as string;
    (tips[giver] ??= []).push(e.id);
    tipGiver[e.id] = giver;
    tipText[e.id] = synth.text[e.id] as string;
  }

  // chapters from the timeline
  const known = new Set(c.evidence.map((e) => e.id));
  const claimed = new Set<string>();
  const sorted = c.beats.map((b, i) => ({ b, i })).sort((a, z) => a.b.round - z.b.round || a.i - z.i).map((x) => x.b);
  const chapters: Chapter[] = sorted.map((b) => {
    const ids = b.evidenceIds.filter((id) => known.has(id) && !claimed.has(id));
    ids.forEach((id) => claimed.add(id));
    return { beatId: b.id, title: b.title || 'A new development', time: b.timeLabel, description: b.description, evidenceIds: ids };
  });
  const orphans = c.evidence.map((e) => e.id).filter((id) => !claimed.has(id));
  if (!chapters.length) chapters.push({ beatId: null, title: 'The investigation begins', time: c.victim.timeOfDeath, description: '', evidenceIds: orphans });
  else (chapters[0] as Chapter).evidenceIds.push(...orphans);
  normaliseChapterTimes(chapters, night);
  // the staff's rounds arrive as the night goes on; the one that shows an empty room comes about halfway
  const N = chapters.length;
  synth.evidence.forEach((e, i) => {
    const key = synth.keyIds.includes(e.id);
    const at = N <= 1 ? 0 : key ? Math.min(N - 1, Math.ceil(N / 2)) : 1 + (i % Math.max(1, N - 2));
    (chapters[at] as Chapter).evidenceIds.push(e.id);
  });

  // the final showdown: the killer's alibi and their "I was never there" must both come apart (see facts.ts)
  const killer = c.characters.find((x) => x.isKiller) ?? null;
  const showdownHp = killer && claims[killer.id] ? 8 : 0;

  const icons: Record<string, IconRef> = {};
  for (const e of c.evidence) icons[e.id] = clueIconFor(e);
  for (const e of synth.evidence) icons[e.id] = { id: 'whisper', specific: true, verbal: true };

  // one clue that exists only to be earned: the killer caught slipping into the sealed scene (see sim.ts)
  const hidden: string[] = [];
  if (killer && claims[killer.id]) {
    const scene = c.victim.placeOfDeath || 'the scene of the crime';
    const id = `fx_caught_${hashSeed(c.id).toString(36)}`;
    evidenceAll.push({ id, title: 'Caught in the act', description: `${killer.name} was caught slipping into ${scene} after it was sealed, and stammered something about looking for the powder room.`, kind: 'physical', veracity: 'true', implicatedIds: [killer.id] });
    facts[id] = { kind: 'caught', who: [killer.id] };
    icons[id] = { id: 'footprints', specific: true, verbal: false };
    itemMap[id] = sceneMapId;
    hidden.push(id);
  }
  // the setting's signature interaction: one prop in one room, and the headcount you earn by working it
  let ritual: World['ritual'] = null;
  const rd = RITUALS[envId];
  if (killer && claims[killer.id]) {
    for (const p of places) {
      if (p.scene) continue;
      const room = rooms.get(p.key) as RoomResult;
      const spot = place(room, { x: room.map.w >> 1, y: room.map.h >> 1 });
      if (!spot) continue;
      const id = `fx_ritual_${hashSeed(c.id).toString(36)}`;
      const made = ritualClue(c, claims, sceneMapId, { maps }, rd.clueLead, rd.clueTitle, id);
      if (!made) break;
      room.grid.oset(spot.x, spot.y, propCell(rd.prop, 0));
      evidenceAll.push(made.ev);
      facts[id] = made.fact;
      icons[id] = { id: 'magnifier', specific: true, verbal: false };
      itemMap[id] = room.map.id;
      hidden.push(id);
      ritual = { evId: id, map: room.map.id, x: spot.x, y: spot.y };
      break;
    }
  }
  const cAll: Case = { ...c, evidence: evidenceAll };
  return { c: cAll, env: envId, hubId: 'hub', sceneMapId, maps, charMap, itemMap, icons, tips, tipGiver, tipText, chapters, night, facts, claims, witnesses, hidden, caughtId: hidden.find((h) => h.startsWith('fx_caught')) ?? null, ritual, inspectorName, killerId: killer?.id ?? null, showdownHp };
}

export function spawnPoint(w: World): { map: string; x: number; y: number; dir: Dir } {
  const hub = w.maps[w.hubId] as MapDef;
  return { map: hub.id, x: hub.entrance.x, y: hub.entrance.y, dir: 'up' };
}
