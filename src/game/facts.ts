/**
 * The facts of the night, in terms a detective can reason with. Pure and deterministic (no DOM).
 *
 * Everything the deduction uses is built here from the case data:
 *  - the night clock, all relative to the shot;
 *  - each suspect's claim (their room, their company, a trip they admit to);
 *  - what every clue ESTABLISHES (a headcount in a room at some moment, a motive, a trait that fits several people, ...);
 *  - the witnesses' rounds: staff who counted heads in the rooms at the shot (synthesised from the claims, so they are
 *    consistent with the case whatever its text says);
 *  - the rules for when a clue really contradicts a statement, and for when the reconstruction table contradicts itself.
 *
 * Rule of the game: only WHERE PEOPLE WERE AT A MOMENT can contradict where a person swore they were. Objects wander, motives are
 * not places. So a derringer in the Ladies' Lounge says nothing about a man in the Paddle House, but "the Paddle House was empty
 * at 11:33" does.
 */
import type { Case, Character, Evidence } from '../../shared/models';
import { Rng, hashSeed } from '../../shared/generator/rng';
import { normPlace } from '../../shared/ops';
import type { Claim, Fact, GameState, Night, Obs, Witness, World } from './types';

// ---------------------------------------------------------------------------------------------
// time

export function parseTime(s: string): number | null {
  const m = /(\d{1,2}):(\d{2})\s*([AaPp])\.?[Mm]/.exec(s);
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (/p/i.test(m[3] as string)) h += 12;
  return h * 60 + Number(m[2]);
}

/** "11:45 PM" from minutes after midnight (wraps past midnight). */
export function fmtTime(min: number): string {
  const total = ((Math.round(min) % 1440) + 1440) % 1440;
  const h24 = Math.floor(total / 60);
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(total % 60).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
}

export function deriveNight(c: Case): Night {
  const death = parseTime(c.victim.timeOfDeath) ?? 22 * 60 + 30;
  return { death, t1: -40, t2: 10 };
}

export const clockAt = (n: Night, dt: number): string => fmtTime(n.death + dt);

/** Chapter clock labels for the investigation: the Inspector arrives just after the shot, and the beats only move forward from there. */
export function normaliseChapterTimes(chapters: { time: string }[], n: Night): void {
  let prev = 8;
  chapters.forEach((ch, i) => {
    const t = parseTime(ch.time);
    let rel = t === null ? null : ((t - n.death + 720 + 1440 * 2) % 1440) - 720;
    if (i === 0) rel = 8;
    else if (rel === null || rel <= prev) rel = prev + 10;
    ch.time = fmtTime(n.death + rel);
    prev = rel;
  });
}

// ---------------------------------------------------------------------------------------------
// small helpers

const charOf = (c: Case, id: string): Character | undefined => c.characters.find((x) => x.id === id);
const NUM = ['nobody', 'one person', 'two people', 'three people', 'four people', 'five people', 'six people', 'seven people'];
const numWord = (n: number): string => NUM[n] ?? `${n} people`;
const cap = (s: string): string => (s ? (s[0] as string).toUpperCase() + s.slice(1) : s);

/** The name of a room as it reads mid-sentence ("the galley"). */
export function roomWord(w: World | { maps: World['maps'] }, mapId: string): string {
  const n = w.maps[mapId]?.name ?? 'the room';
  return /^the /i.test(n) ? `the ${n.slice(4)}` : n;
}

// ---------------------------------------------------------------------------------------------
// claims

const EXCURSION = /(?:around|at|about)\s+(\d{1,2}:\d{2}\s*[AP]M)[^.]*?(?:slipped out|stepped out)|(\d{1,2}:\d{2}\s*[AP]M)[^.]*slipped out/i;

/** Who swears what: their room, their company and any short trip they own up to. */
export function buildClaims(c: Case, charMap: Record<string, string>, night: Night, emptyRoom: string | null): Record<string, Claim> {
  const out: Record<string, Claim> = {};
  for (const ch of c.characters) {
    const room = charMap[ch.id];
    if (!room) continue;
    let excursion: Claim['excursion'] = null;
    for (const sentence of ch.alibi.split(/(?<=[.!?])\s+/)) {
      if (!/slipped out|stepped out/i.test(sentence)) continue;
      // "Clementine slipped out ..." is about a companion; "Around 11:33 PM you slipped out" is about them
      const startsWithName = c.characters.some((o) => o.id !== ch.id && sentence.startsWith(o.name));
      if (startsWithName) continue;
      const m = EXCURSION.exec(sentence);
      const t = m ? parseTime((m[1] ?? m[2]) as string) : null;
      excursion = { dt: t === null ? -12 : ((t - night.death + 2880 + 720) % 1440) - 720, through: emptyRoom };
    }
    out[ch.id] = { room, withIds: ch.alibiWithIds.filter((id) => charMap[id] === room), excursion };
  }
  return out;
}

/** Everyone who swears they were in each room. */
export function claimants(claims: Record<string, Claim>): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const [id, cl] of Object.entries(claims)) m.set(cl.room, [...(m.get(cl.room) ?? []), id]);
  return m;
}

// ---------------------------------------------------------------------------------------------
// what each clue establishes

const EMPTY_WORDS = /\b(empty|cold|nobody|no one|deserted|vacant|silent)\b/i;

/** Finds a corpus witness clue of the "I cut through the room at 11:33 and it was empty" kind. */
export function findEmptyWitness(c: Case, roomKeyToMap: Map<string, string>, night: Night): { evId: string; obs: Obs; by: string | null } | null {
  for (const e of c.evidence) {
    if (e.kind !== 'verbal' || e.veracity !== 'true') continue;
    const text = `${e.title} ${e.description}`;
    if (!EMPTY_WORDS.test(text)) continue;
    const t = parseTime(e.description);
    if (t === null) continue;
    const d = normPlace(e.description);
    let room: string | null = null;
    for (const [k, id] of roomKeyToMap) if (k.length >= 3 && new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(d)) room = id;
    if (!room) continue;
    const speaker = c.characters.find((x) => e.description.startsWith(x.name));
    const dt = ((t - night.death + 2880 + 720) % 1440) - 720;
    return { evId: e.id, obs: { room, dt, min: 0, max: 0 }, by: speaker?.id ?? null };
  }
  return null;
}

export function classifyCorpus(c: Case, empty: { evId: string; obs: Obs; by: string | null } | null, w: { maps: World['maps'] }): Record<string, Fact> {
  const out: Record<string, Fact> = {};
  const debunks = new Set(c.redHerrings.map((r) => r.debunkEvidenceId).filter(Boolean) as string[]);
  const herrings = new Set(c.redHerrings.map((r) => r.evidenceId));
  for (const e of c.evidence) {
    const mot = c.motives.find((m) => m.evidenceIds.includes(e.id));
    if (empty && e.id === empty.evId) {
      out[e.id] = { kind: 'occ', obs: [empty.obs], by: empty.by ?? undefined };
    } else if (mot) out[e.id] = { kind: 'motive', who: [mot.characterId] };
    else if (herrings.has(e.id)) out[e.id] = { kind: 'herring', who: e.implicatedIds };
    else if (debunks.has(e.id)) out[e.id] = { kind: 'debunk' };
    else if (e.veracity === 'true' && e.implicatedIds.length >= 1) out[e.id] = { kind: 'trait', who: e.implicatedIds };
    else out[e.id] = { kind: 'object' };
  }
  void w;
  return out;
}

/** The one-line summary the notebook shows under a clue. Only what the clue text itself makes plain (a headcount, a motive): nothing that would sort the leads from the truths. */
export function tagOf(w: World, evId: string): string {
  const f = w.facts[evId];
  if (!f) return '';
  const ch = (id: string) => charOf(w.c, id)?.name ?? 'someone';
  if (f.kind === 'occ') {
    const parts = (f.obs ?? []).map((o) => `${cap(roomWord(w, o.room))}: ${o.max === 0 ? 'nobody' : o.min === o.max ? String(o.min) : `${o.min}-${o.max}`}${o.dt === 0 ? '' : ` at ${clockAt(w.night, o.dt)}`}`);
    return `HEADCOUNT${(f.obs ?? []).every((o) => o.dt === 0) ? ' AT THE SHOT' : ''}. ${parts.join('. ')}.`;
  }
  if (f.kind === 'motive') return `MOTIVE. It gives ${ch((f.who ?? [])[0] ?? '')} a reason.`;
  return '';
}

// ---------------------------------------------------------------------------------------------
// the witnesses' rounds (synthetic clues)

const ROUNDS_INTRO = {
  comedic: ["At the shot I was doing my rounds, and I have marvellous ears.", "When the gun went off I was mid-round. Nobody notices staff, which is handy.", "I was on my rounds at the shot, counting heads out of habit."],
  serious: ['When the shot rang out I was making my rounds, so I noticed who was where.', 'I was walking my rounds at the moment of the shot, and I counted heads as I went.', 'At the shot I was on my rounds. It is my job to know who is in which room.'],
  noir: ["Shot goes off and I'm working the halls, same as every night. Eyes open.", "The gun cracks; I'm halfway down the corridor. Habit made me count who was where.", "I was on my rounds when it happened. Staff see everything and get asked about nothing."],
} as const;

const ROUNDS_OUTRO = {
  comedic: ['That is all I know, and I know it thoroughly.', 'Nobody asked me earlier. Splendid to be asked.'],
  serious: ['That is exactly what I saw. I would swear to it.', 'I have told you everything I noticed.'],
  noir: ["That's the whole round. Make of it what you can.", "That's what I counted. The rest is your department."],
} as const;

export function obsSentence(w: { maps: World['maps'] }, o: Obs, tone: Case['tone'], i: number, nameOf?: (id: string) => string): string {
  const room = cap(roomWord(w, o.room));
  if (o.max === 0) {
    return [`${room}: nobody. The door stood ajar, the lamp was out, the chair was cold.`, `${room}: empty. Not a soul, not a sound.`, `${room}: nobody in it. Just an open door and a room going cold.`][(i + tone.length) % 3] as string;
  }
  if (o.only && nameOf) {
    const names = o.only.map(nameOf);
    const list = names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
    return [`${room}: just ${list}, and nobody else.`, `${room}: only ${list} in there, alone.`, `${room}: ${list}, on their own. Nobody else was with them.`][(i + tone.length) % 3] as string;
  }
  const n = o.min === o.max ? numWord(o.min) : `${o.min} or ${o.max} people`;
  if (o.max === 1) return [`${room}: ${n}, moving about.`, `${room}: just ${n}, on their own.`, `${room}: ${n} inside, alone with their thoughts.`][(i + tone.length) % 3] as string;
  return [`${room}: ${n}, all talking at once.`, `${room}: ${n} in there, I heard every one of them.`, `${room}: ${n} by the sound, a murmur of voices.`][(i + tone.length) % 3] as string;
}

export interface SynthOut {
  evidence: Evidence[];
  facts: Record<string, Fact>;
  giver: Record<string, string>;
  text: Record<string, string>;
  /** killer-contradicting clue ids, for chapter placement */
  keyIds: string[];
}

/** One staff member's "rounds" clue per two or three rooms, so that the headcounts of every claimed room are on record. */
export function synthRounds(c: Case, claims: Record<string, Claim>, sceneMapId: string, night: Night, wits: Witness[], w: { maps: World['maps'] }): SynthOut {
  const out: SynthOut = { evidence: [], facts: {}, giver: {}, text: {}, keyIds: [] };
  if (!wits.length) return out;
  const killer = c.characters.find((x) => x.isKiller);
  const byRoom = claimants(claims);
  const rng = new Rng(hashSeed(`rounds|${c.id}|${c.seed ?? 0}`));
  const rooms = [...byRoom.keys()].filter((r) => r !== sceneMapId);
  const nameOf = (id: string): string => {
    const person = c.characters.find((x) => x.id === id);
    return person ? first(person.name) : 'someone';
  };
  const obs: Obs[] = rooms.map((room) => {
    const ids = byRoom.get(room) as string[];
    const honestIds = ids.filter((id) => id !== killer?.id);
    const honest = honestIds.length;
    // the killer is among the claimants but really was not: name who genuinely was, so nobody can hide in the headcount
    const withKiller = !!killer && ids.includes(killer.id);
    return { room, dt: 0, min: honest, max: honest, ...(withKiller && honest > 0 ? { only: honestIds } : {}) };
  });
  const order = rng.shuffle(obs);
  // chunks of two (three for an odd remainder); the killer's empty room never travels alone
  const chunks: Obs[][] = [];
  for (let i = 0; i < order.length; i += 2) chunks.push(order.slice(i, i + 2));
  if (chunks.length > 1 && (chunks[chunks.length - 1] as Obs[]).length === 1) {
    const last = chunks.pop() as Obs[];
    (chunks[chunks.length - 1] as Obs[]).push(...last);
  }
  const usedTitles = new Set<string>();
  chunks.forEach((chunk, i) => {
    const wit = wits[i % wits.length] as Witness;
    const id = `fx_${hashSeed(`${c.id}|${i}`).toString(36)}`;
    let title = `${wit.name}'s rounds`;
    if (usedTitles.has(title)) title = `${wit.name}'s second round`;
    usedTitles.add(title);
    const body = [rng.pick(ROUNDS_INTRO[c.tone]), ...chunk.map((o, k) => obsSentence(w, o, c.tone, k + i, nameOf)), rng.pick(ROUNDS_OUTRO[c.tone])].join(' ');
    const ev: Evidence = { id, title, description: `${wit.name} says: '${body}'`, kind: 'verbal', veracity: 'true', implicatedIds: [] };
    out.evidence.push(ev);
    out.facts[id] = { kind: 'occ', obs: chunk, by: wit.id };
    out.giver[id] = wit.id;
    out.text[id] = body;
    if (chunk.some((o) => o.max === 0)) out.keyIds.push(id);
  });
  void night;
  return out;
}

// ---------------------------------------------------------------------------------------------
// held facts

export function heldOcc(w: World, s: Pick<GameState, 'found'>): { evId: string; o: Obs }[] {
  const out: { evId: string; o: Obs }[] = [];
  for (const id of s.found) for (const o of w.facts[id]?.obs ?? []) out.push({ evId: id, o });
  return out;
}

/** Everyone who swears they were in `room`. */
export const claimantsOf = (w: World, room: string): string[] => Object.entries(w.claims).filter(([, cl]) => cl.room === room).map(([id]) => id);

/** Headcounts at the shot that the detective holds, for one room. */
function shotCount(w: World, s: Pick<GameState, 'found'>, room: string): Obs | null {
  const hit = heldOcc(w, s).find((h) => h.o.room === room && h.o.dt === 0);
  return hit ? hit.o : null;
}

/**
 * Is this person pinned down at the shot by the headcounts you hold? True when the room they swear to had exactly as many
 * people as swear they were in it (so everybody who claims it is really there).
 */
export function accounted(w: World, s: Pick<GameState, 'found'>, charId: string): boolean {
  const cl = w.claims[charId];
  if (!cl) return false;
  const o = shotCount(w, s, cl.room);
  if (!o || o.min !== o.max || o.min < 1) return false;
  // a headcount that names names settles it by identity, not just quantity (see the cover-story companion in generate.ts)
  if (o.only) return o.only.includes(charId);
  return o.min >= claimantsOf(w, cl.room).length;
}

// ---------------------------------------------------------------------------------------------
// statements and what breaks them

export type StmtKind = 'where' | 'with' | 'scene' | 'why';

/** Does a held headcount show that the room they swore to was short of people during the window? */
export function windowBreakers(w: World, charId: string, evId: string): boolean {
  const cl = w.claims[charId];
  const f = w.facts[evId];
  if (!cl || !f || f.kind !== 'occ') return false;
  const sworn = claimantsOf(w, cl.room).length;
  return (f.obs ?? []).some((o) => {
    if (o.room !== cl.room || o.dt < w.night.t1 || o.dt > w.night.t2) return false;
    // they admit to stepping out at that time: the empty room is consistent with what they said
    if (cl.excursion && Math.abs(cl.excursion.dt - o.dt) <= 4) return false;
    // a witness who named names vouches for anyone on that list: the shortfall is about somebody else in the room, not them
    if (o.only && o.only.includes(charId)) return false;
    return o.max < sworn;
  });
}

export function motiveClueFor(w: World, charId: string, evId: string): boolean {
  const f = w.facts[evId];
  return !!f && f.kind === 'motive' && (f.who ?? []).includes(charId);
}

export interface BreakResult {
  ok: boolean;
  /** damage to composure when it lands */
  power: number;
  /** in-fiction reason it does or does not contradict the statement */
  why: string;
  /** the suspect (someone else) that a trait clue also fits, when the reason is that you cannot tell them apart yet */
  alsoFits: string[];
}

const POWER: Record<StmtKind, number> = { where: 4, scene: 4, why: 2, with: 0 };
export const statementPower = (k: StmtKind): number => POWER[k];

function nameOf(w: World, id: string): string {
  return charOf(w.c, id)?.name ?? w.witnesses.find((x) => x.id === id)?.name ?? 'someone';
}
const first = (n: string): string => n.replace(/["“”][^"“”]*["“”]/g, '').replace(/\s+/g, ' ').trim().split(' ')[0] as string;

/** Does presenting these clues (one, or two together) break this suspect's statement of this kind? Uses only what the detective holds. */
export function breaks(w: World, s: Pick<GameState, 'found'>, charId: string, kind: StmtKind, evIds: string[]): BreakResult {
  const no = (why: string, alsoFits: string[] = []): BreakResult => ({ ok: false, power: 0, why, alsoFits });
  const name = first(nameOf(w, charId));
  const cl = w.claims[charId];
  const evs = evIds.map((id) => w.c.evidence.find((e) => e.id === id)).filter((e): e is Evidence => !!e);
  if (!evs.length) return no('There is nothing to show.');
  const a = evs[0] as Evidence;
  const fa = w.facts[a.id];
  const room = cl ? roomWord(w, cl.room) : 'their room';
  if (kind === 'where') {
    if (evIds.some((id) => windowBreakers(w, charId, id))) return { ok: true, power: POWER.where, why: `${cap(room)} was short of people while ${name} swore they never left it.`, alsoFits: [] };
    if (fa?.kind === 'occ') {
      const o = (fa.obs ?? [])[0];
      const other = o && o.room !== cl?.room;
      return no(other ? `That headcount is about ${roomWord(w, (o as Obs).room)}. ${name} says ${room}.` : `That count agrees with ${name}: ${room} held the people who swear they were there.`);
    }
    if (fa?.kind === 'motive') return no('A motive is not a place. It says why, not where.');
    if (fa?.kind === 'trait' || fa?.kind === 'herring') return no(`A mark or a lead does not put ${name} anywhere at a moment. Objects wander; people at the shot do not.`);
    return no(`"${a.title}" only shows where a thing lay. Nothing in it says ${name} left ${room}.`);
  }
  if (kind === 'why') {
    if (evIds.some((id) => motiveClueFor(w, charId, id))) return { ok: true, power: POWER.why, why: `It gives ${name} a reason after all.`, alsoFits: [] };
    if (fa?.kind === 'motive') return no(`That motive belongs to someone else, not ${name}.`);
    return no(`That does not show ${name} had any reason to wish the victim harm.`);
  }
  if (kind === 'with') {
    // chained alibi: if this clue would break a named companion's own WHERE (their story didn't hold up), that companion cannot
    // really have been there either -- so they were not "with" them, whatever else is true of this person's own account.
    for (const mateId of cl?.withIds ?? []) {
      const chain = breaks(w, s, mateId, 'where', evIds);
      if (chain.ok) {
        const mateName = first(nameOf(w, mateId));
        return { ok: true, power: POWER.with, why: `${mateName}'s own story just fell apart: ${chain.why} If ${mateName} was not really there, ${name} was not "with" ${mateName} either.`, alsoFits: [] };
      }
    }
    return no(`Nothing you hold contradicts who ${name} says kept them company.`);
  }
  // scene: "I never went near the scene". Caught in the act settles it; otherwise it needs the marks left at the scene and the
  // elimination of everyone else who fits them
  if (evs.some((e) => w.facts[e.id]?.kind === 'caught')) {
    const caught = evs.find((e) => w.facts[e.id]?.kind === 'caught') as Evidence;
    if ((w.facts[caught.id]?.who ?? []).includes(charId)) return { ok: true, power: POWER.scene, why: `${cap(name)} was seen going into the scene with their own eyes.`, alsoFits: [] };
    return no(`That was somebody else's doing, not ${name}'s.`);
  }
  const traits = evs.filter((e) => w.facts[e.id]?.kind === 'trait');
  if (traits.length !== evs.length) return no(`"${a.title}" does not put anyone in the scene of the crime.`);
  const sets = traits.map((e) => new Set(w.facts[e.id]?.who ?? []));
  const fits = [...(sets[0] as Set<string>)].filter((id) => sets.every((x) => x.has(id)));
  if (!fits.includes(charId)) return no(`${name} does not fit ${traits.length > 1 ? 'those marks' : 'that mark'}. It cannot have been them.`);
  const rivals = fits.filter((id) => id !== charId && !accounted(w, s, id));
  if (rivals.length) {
    const names = rivals.map((id) => first(nameOf(w, id)));
    return no(`It fits ${name}, but it also fits ${names.join(' and ')}, and you have not ruled ${names.length > 1 ? 'them' : 'them'} out yet.${traits.length < 2 ? ' One mark alone is nobody\'s fingerprint. Tie it to something else.' : ''}`, rivals);
  }
  const alone = (sets[0] as Set<string>).size === 1;
  if (traits.length < 2 && !alone) return no(`It fits ${name}, and everyone else it fits is accounted for. But one mark alone is thin. Tie it to a second one.`);
  return { ok: true, power: POWER.scene, why: `${cap(name)} fits, and everyone else who fits was somewhere else at the shot.`, alsoFits: [] };
}

/** Every combination of held clues that breaks this statement (for the solver and the hint system). */
export function breakingSets(w: World, s: Pick<GameState, 'found'>, charId: string, kind: StmtKind): string[][] {
  const ids = s.found;
  const out: string[][] = [];
  for (const a of ids) if (breaks(w, s, charId, kind, [a]).ok) out.push([a]);
  if (kind === 'scene') for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) if (breaks(w, s, charId, kind, [ids[i] as string, ids[j] as string]).ok) out.push([ids[i] as string, ids[j] as string]);
  return out;
}

/**
 * The "prove it" gate: does the detective actually hold a real contradiction against this person -- something that breaks their
 * WHERE or puts them at the scene -- rather than a bare guess? Deliberately excludes WITH: a collapsed companion's story casts
 * doubt (see `breaks`'s `with` case) but is never, by itself, proof against the person who cited them.
 */
export function hasCaseAgainst(w: World, s: Pick<GameState, 'found'>, charId: string): boolean {
  return breakingSets(w, s, charId, 'where').length > 0 || breakingSets(w, s, charId, 'scene').length > 0;
}

// ---------------------------------------------------------------------------------------------
// THE NIGHT table: the detective places everyone at the moment of the shot

export interface Issue {
  /** the room that is wrong */
  room: string;
  /** the tokens involved */
  ids: string[];
  text: string;
}

export interface NightCheck {
  issues: Issue[];
  /** everyone is placed and nothing contradicts a held headcount */
  complete: boolean;
  atScene: string[];
  unplaced: string[];
}

/** What the table says, checked against the headcounts (and only the headcounts) you hold. */
export function checkNight(w: World, s: Pick<GameState, 'found' | 'night'>): NightCheck {
  const issues: Issue[] = [];
  const ids = w.c.characters.map((x) => x.id);
  const placed = ids.filter((id) => s.night[id]);
  const unplaced = ids.filter((id) => !s.night[id]);
  const inRoom = (room: string) => placed.filter((id) => s.night[id] === room);
  const rooms = new Set<string>(Object.keys(w.maps).filter((m) => m !== w.hubId));
  for (const room of rooms) {
    const here = inRoom(room);
    if (room === w.sceneMapId) {
      if (here.length > 1) issues.push({ room, ids: here, text: `Only one person was alone with ${w.c.victim.name || 'the victim'} at the shot, not ${here.length}.` });
      continue;
    }
    const o = shotCount(w, s, room);
    if (!o) continue;
    if (here.length > o.max) issues.push({ room, ids: here, text: `${cap(roomWord(w, room))} held ${o.max === 0 ? 'nobody' : numWord(o.max)} at the shot. You put ${here.length} there.` });
    else if (unplaced.length === 0 && here.length < o.min) issues.push({ room, ids: here, text: `${cap(roomWord(w, room))} held ${numWord(o.min)} at the shot. You only put ${here.length} there.` });
    else if (o.only) {
      // the count alone matches, but a witness named exactly who was there -- the right number in the wrong hands is still wrong
      const wrong = here.filter((id) => !(o.only as string[]).includes(id));
      if (wrong.length) issues.push({ room, ids: wrong, text: `A witness named who was really in ${roomWord(w, room)} at the shot. It was not them.` });
      else if (unplaced.length === 0) {
        const missing = (o.only as string[]).filter((id) => !here.includes(id));
        if (missing.length) issues.push({ room, ids: missing, text: `A witness put someone specific in ${roomWord(w, room)} at the shot. You have not placed them there.` });
      }
    }
  }
  const atScene = inRoom(w.sceneMapId);
  if (unplaced.length === 0 && atScene.length === 0) issues.push({ room: w.sceneMapId, ids: [], text: `Somebody was alone with ${w.c.victim.name || 'the victim'} when the shot was fired. Who?` });
  return { issues, complete: unplaced.length === 0 && issues.length === 0, atScene, unplaced };
}

/**
 * Solver: with the given clues in hand and every suspect's sworn room known, which (liar, room) pairs are consistent with
 * "everyone except the killer told the truth about where they were" and the headcounts? Used by the tests to prove the case is
 * solvable by reasoning alone, and unique.
 */
export function consistentLiars(w: World, held: string[]): { liar: string; room: string }[] {
  const s = { found: held, night: {} as Record<string, string> };
  const ids = w.c.characters.map((x) => x.id);
  const rooms = Object.keys(w.maps).filter((m) => m !== w.hubId);
  const out: { liar: string; room: string }[] = [];
  for (const liar of ids) {
    for (const room of rooms) {
      if (room === w.claims[liar]?.room) continue;
      const night: Record<string, string> = {};
      for (const id of ids) night[id] = id === liar ? room : (w.claims[id]?.room as string);
      const chk = checkNight(w, { found: s.found, night });
      // window observations (not at the shot) also count: an empty room at 11:33 contradicts an honest claimant
      const window = ids.some((id) => id !== liar && s.found.some((ev) => windowBreakers(w, id, ev)));
      if (chk.issues.length === 0 && !window) out.push({ liar, room });
    }
  }
  return out;
}

export function killerRoomHint(w: World): string | null {
  const k = w.killerId ? w.claims[w.killerId] : null;
  return k ? k.room : null;
}

/** The headcount you get from a setting's signature interaction: the killer's room among two counted rooms, in the first person. */
export function ritualClue(c: Case, claims: Record<string, Claim>, sceneMapId: string, w: { maps: World['maps'] }, lead: string, title: string, id: string): { ev: Evidence; fact: Fact } | null {
  const killer = c.characters.find((x) => x.isKiller);
  if (!killer || !claims[killer.id]) return null;
  const byRoom = claimants(claims);
  const rooms = [...byRoom.keys()].filter((r) => r !== sceneMapId);
  const kroom = claims[killer.id]?.room as string;
  const other = rooms.find((r) => r !== kroom);
  const nameOf = (id: string): string => {
    const person = c.characters.find((x) => x.id === id);
    return person ? first(person.name) : 'someone';
  };
  const mk = (room: string): Obs => {
    const ids = byRoom.get(room) ?? [];
    const honestIds = ids.filter((x) => x !== killer.id);
    const honest = honestIds.length;
    const withKiller = ids.includes(killer.id);
    return { room, dt: 0, min: honest, max: honest, ...(withKiller && honest > 0 ? { only: honestIds } : {}) };
  };
  const obs = other ? [mk(kroom), mk(other)] : [mk(kroom)];
  const sentences = obs.map((o, i) => obsSentence(w, o, c.tone, i + 3, nameOf));
  return { ev: { id, title, description: `${lead} ${sentences.join(' ')}`, kind: 'physical', veracity: 'true', implicatedIds: [] }, fact: { kind: 'occ', obs } };
}
