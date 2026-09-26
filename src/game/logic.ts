/** Game rules and state transitions. Pure: mutates the GameState you hand it, never touches the DOM. */
import type { Case, Character, Evidence, MotiveCategory } from '../../shared/models';
import { MOTIVE_CATEGORIES } from '../../shared/models';
import { Rng, hashSeed } from '../../shared/generator/rng';
import { MAX_COMPOSURE, spawnPoint } from './world';
import { breaks, checkNight, clockAt, fmtTime, hasCaseAgainst, heldOcc, roomWord, statementPower, tagOf } from './facts';
import type { BreakResult, NightCheck, StmtKind } from './facts';
import { testimony } from './testimony';
import type { Statement } from './testimony';
import { firstPerson, upperFirst } from './text';
import { nextSneakWindow } from './sim';
import type { Chapter, GameState, World } from './types';

export { testimony, tagOf, checkNight, clockAt, roomWord };
export type { Statement, StmtKind };

export interface Line {
  /** Speaker name, or null for narration. */
  who: string | null;
  text: string;
}

export const charById = (w: World, id: string): Character | undefined => w.c.characters.find((x) => x.id === id);
export const evidenceById = (w: World, id: string): Evidence | undefined => w.c.evidence.find((x) => x.id === id);
export const nameOf = (w: World, id: string): string => charById(w, id)?.name || w.witnesses.find((x) => x.id === id)?.name || 'Someone';
const rngFor = (...parts: (string | number)[]): Rng => new Rng(hashSeed(parts.join('|')));

export function mapLabel(w: World, mapId: string): string {
  return (w.maps[mapId]?.name ?? 'somewhere').replace(/^the /i, 'the ');
}

// ---------------------------------------------------------------------------------------------
// state

/** A case needs people, a killer and clues to be playable. Returns what is missing, or null. */
export function unplayableReason(c: Case): string | null {
  if (c.characters.length < 2) return 'Add at least two characters so there is someone to question.';
  if (!c.characters.some((x) => x.isKiller)) return 'Mark one character as the killer so the mystery has a solution.';
  if (!c.evidence.length) return 'Add some evidence so the detective has clues to find.';
  return null;
}

export function newState(w: World, player = 'DETECTIVE'): GameState {
  const s = spawnPoint(w);
  const composure: Record<string, number> = {};
  for (const ch of w.c.characters) composure[ch.id] = MAX_COMPOSURE;
  return {
    v: 3,
    caseId: w.c.id,
    caseStamp: w.c.updatedAt,
    player,
    briefed: false,
    map: s.map,
    x: s.x,
    y: s.y,
    dir: s.dir,
    chapter: 0,
    found: [],
    cleared: [],
    composure,
    broken: [],
    hits: [],
    asked: {},
    motiveKnown: [],
    secretsKnown: {},
    met: [],
    strikes: 0,
    steps: 0,
    hintIdx: 0,
    night: {},
    misses: 0,
    hintsUsed: 0,
    tmin: 0,
    cracked: [],
    seen: [],
    tried: [],
    done: null,
    rank: '',
  };
}

/** Repair a saved state against the current world (the case may have been edited since). */
export function sanitize(w: World, s: GameState): GameState {
  const evIds = new Set(w.c.evidence.map((e) => e.id));
  const charIds = new Set(w.c.characters.map((x) => x.id));
  const fresh = newState(w, s.player);
  const composure: Record<string, number> = { ...fresh.composure };
  for (const [id, v] of Object.entries(s.composure)) if (charIds.has(id)) composure[id] = Math.max(0, Math.min(MAX_COMPOSURE, v));
  const mapOk = !!w.maps[s.map];
  const rooms = new Set(Object.keys(w.maps));
  const night = Object.fromEntries(Object.entries(s.night ?? {}).filter(([id, room]) => charIds.has(id) && rooms.has(room) && room !== w.hubId));
  const { links: _links, ...rest } = s as GameState & { links?: unknown };
  void _links;
  return {
    ...fresh,
    ...rest,
    v: 3,
    caseStamp: w.c.updatedAt,
    map: mapOk ? s.map : fresh.map,
    x: mapOk ? s.x : fresh.x,
    y: mapOk ? s.y : fresh.y,
    chapter: Math.max(0, Math.min(w.chapters.length - 1, s.chapter)),
    found: s.found.filter((id) => evIds.has(id)),
    cleared: s.cleared.filter((id) => evIds.has(id)),
    composure,
    broken: s.broken.filter((id) => charIds.has(id)),
    motiveKnown: s.motiveKnown.filter((id) => charIds.has(id)),
    met: s.met.filter((id) => charIds.has(id)),
    night,
    misses: Math.max(0, Math.floor(s.misses ?? 0)),
    hintsUsed: Math.max(0, Math.floor(s.hintsUsed ?? 0)),
    tmin: Math.max(0, Math.floor(s.tmin ?? 0)),
    cracked: (s.cracked ?? []).filter((k) => charIds.has(k.split(':')[0] as string)),
    seen: s.seen ?? [],
    tried: s.tried ?? [],
  };
}

// ---------------------------------------------------------------------------------------------
// chapters and progress

export function unlockedEvidence(w: World, s: GameState): string[] {
  const ids: string[] = [];
  for (let i = 0; i <= s.chapter && i < w.chapters.length; i++) ids.push(...(w.chapters[i] as Chapter).evidenceIds);
  return ids;
}

export function progress(w: World, s: GameState): { found: number; total: number } {
  return { found: s.found.filter((id) => !w.hidden.includes(id)).length, total: w.c.evidence.length - w.hidden.length };
}

/** Enough of the current chapter is solved to move the story on. */
export function chapterReady(w: World, s: GameState): boolean {
  if (s.chapter + 1 >= w.chapters.length) return false;
  const unlocked = unlockedEvidence(w, s);
  if (unlocked.length === 0) return true;
  const got = unlocked.filter((id) => s.found.includes(id)).length;
  return got >= Math.ceil(unlocked.length * 0.6);
}

export function advanceChapter(w: World, s: GameState): Chapter | null {
  if (!chapterReady(w, s)) return null;
  s.chapter += 1;
  return w.chapters[s.chapter] ?? null;
}

// ---------------------------------------------------------------------------------------------
// collecting evidence

export interface Cleared {
  evidenceId: string;
  note: string;
}

/** Red herrings whose debunking clue you now hold (or whose debunking beat has arrived). */
export function checkCleared(w: World, s: GameState): Cleared[] {
  const out: Cleared[] = [];
  for (const rh of w.c.redHerrings) {
    if (!s.found.includes(rh.evidenceId) || s.cleared.includes(rh.evidenceId)) continue;
    const byEvidence = !!rh.debunkEvidenceId && s.found.includes(rh.debunkEvidenceId);
    const beatIdx = rh.debunkBeatId ? w.chapters.findIndex((ch) => ch.beatId === rh.debunkBeatId) : -1;
    const byBeat = !rh.debunkEvidenceId && beatIdx >= 0 && s.chapter >= beatIdx;
    if (byEvidence || byBeat) {
      s.cleared.push(rh.evidenceId);
      out.push({ evidenceId: rh.evidenceId, note: rh.debunkNote || 'It turns out to be a misunderstanding after all.' });
    }
  }
  return out;
}

export function collect(w: World, s: GameState, evId: string): { isNew: boolean; cleared: Cleared[] } {
  if (s.found.includes(evId)) return { isNew: false, cleared: [] };
  s.found.push(evId);
  return { isNew: true, cleared: checkCleared(w, s) };
}

// ---------------------------------------------------------------------------------------------
// interviews

const GREET = {
  comedic: ['Ooh, a detective! Ask away, darling. I have nothing to hide but my age.', 'A detective! Splendid! Do sit... oh, there is no chair. Ask away!', 'Detective! I was JUST about to be innocent at somebody.'],
  serious: ['Detective. I will help however I can. This has been a dreadful night.', 'I understand you have questions. Please, be quick about it.', 'Ask what you must. I have nothing to hide.'],
  noir: ['Another badge. Make it quick, gumshoe. The night is not getting any younger.', 'You have got questions. I have got a cigarette and nothing to say. Shoot.', 'Rain, murder, and now the law. Ask your questions, detective.'],
} as const;

const AGAIN = {
  comedic: ['Back again? I do love an audience.', 'Oh good, you again. More questions? I have more answers!'],
  serious: ['You again. Go on.', 'More questions, Detective?'],
  noir: ['You keep coming back, copper.', 'Back for more? Go ahead.'],
} as const;

const SHAKEN = {
  comedic: ['I am ruined! RUINED! Do stop looking at me like that.', 'You have rattled me, and I am very hard to rattle. Usually.'],
  serious: ['I have said all I am going to say.', 'Please. I need a moment.'],
  noir: ['You have got me rattled, copper. That is all you are getting.', 'Enough. I need air, and a very strong drink.'],
} as const;



export const MOTIVE_LABEL: Record<MotiveCategory, string> = {
  money: 'Greed',
  love: 'A love gone wrong',
  revenge: 'Revenge',
  jealousy: 'Jealousy',
  power: 'Power',
  secrecy: 'Silencing a secret',
  inheritance: 'The inheritance',
  ambition: 'Ambition',
};

export function greeting(w: World, s: GameState, charId: string): Line {
  const ch = charById(w, charId);
  const first = !s.met.includes(charId);
  const pool = (first ? GREET : AGAIN)[w.c.tone];
  const broken = s.broken.includes(charId);
  const text = broken ? rngFor(charId, 'shaken', s.steps % 3).pick(SHAKEN[w.c.tone]) : rngFor(charId, first ? 'greet' : 'again', s.steps).pick(pool);
  return { who: ch?.name ?? null, text };
}

export function meet(s: GameState, charId: string): void {
  if (!s.met.includes(charId)) s.met.push(charId);
}

function markAsked(s: GameState, charId: string, topic: string): void {
  const list = (s.asked[charId] ??= []);
  if (!list.includes(topic)) list.push(topic);
}

export function askAlibi(w: World, s: GameState, charId: string): Line[] {
  const ch = charById(w, charId);
  if (!ch) return [];
  markAsked(s, charId, 'alibi');
  const raw = ch.alibi.trim() || 'I was around. Nobody keeps a diary of a dull evening.';
  return [{ who: ch.name, text: firstPerson(raw) }];
}

export function askRelations(w: World, s: GameState, charId: string): Line[] {
  const ch = charById(w, charId);
  if (!ch) return [];
  markAsked(s, charId, 'rel');
  const pub = ch.relationships.filter((r) => r.visibility === 'public' && charById(w, r.targetId));
  if (!pub.length) return [{ who: ch.name, text: 'I keep to myself, mostly. Not much to say.' }];
  return pub.map((r) => ({ who: ch.name, text: `Officially? ${upperFirst(r.label)} ${nameOf(w, r.targetId)}.` }));
}

export function askMotive(w: World, s: GameState, charId: string): Line[] {
  const ch = charById(w, charId);
  if (!ch) return [];
  markAsked(s, charId, 'motive');
  const mine = w.c.motives.filter((m) => m.characterId === charId);
  if (!mine.length) return [{ who: ch.name, text: 'Why would I want them dead? I had no reason at all.' }];
  const known = s.motiveKnown.includes(charId);
  const open = mine.filter((m) => m.strength === 'weak' || m.evidenceIds.length === 0 || known);
  if (!open.length) {
    return [{ who: ch.name, text: rngFor(charId, 'deny').pick(['Why would I want them dead? I had every reason to keep them alive.', 'A motive? Me? You will need more than a hunch, Detective.', 'Everyone had a reason. I did not have one. Ask around.']) }];
  }
  const lines: Line[] = [{ who: ch.name, text: known ? 'Fine. You know. Everybody will know now.' : 'People talk, of course. I cannot stop them.' }];
  for (const m of open) lines.push({ who: null, text: m.description });
  if (!s.motiveKnown.includes(charId)) s.motiveKnown.push(charId);
  return lines;
}

/** Verbal clues this person can still tell. Whatever you already hold is not told again, so order never matters. */
export function tipsLeft(w: World, s: GameState, charId: string): { ready: string[]; locked: string[] } {
  const rest = (w.tips[charId] ?? []).filter((id) => !s.found.includes(id));
  const open = new Set(unlockedEvidence(w, s));
  return { ready: rest.filter((id) => open.has(id)), locked: rest.filter((id) => !open.has(id)) };
}

export function askNight(w: World, s: GameState, charId: string): { lines: Line[]; found: string[]; cleared: Cleared[] } {
  const ch = charById(w, charId) ?? w.witnesses.find((x) => x.id === charId);
  const out = { lines: [] as Line[], found: [] as string[], cleared: [] as Cleared[] };
  if (!ch) return out;
  markAsked(s, charId, 'night');
  const { ready, locked } = tipsLeft(w, s, charId);
  const next = ready[0];
  if (!next) {
    const text = locked.length ? 'Hmm. Nothing else comes to mind just yet. Ask me again a little later.' : 'I have told you everything I noticed, Detective.';
    out.lines.push({ who: ch.name, text });
    return out;
  }
  const ev = evidenceById(w, next);
  out.lines.push({ who: ch.name, text: 'There is something I noticed that night...' });
  out.lines.push({ who: ch.name, text: w.tipText[next] ?? ev?.description ?? '' });
  const r = collect(w, s, next);
  if (r.isNew) out.found.push(next);
  out.cleared = r.cleared;
  return out;
}

// ---------------------------------------------------------------------------------------------
// the clock: the night is a real timeline, and it keeps moving while the detective works

/** Minutes after the shot at which the investigation begins: the Inspector has just arrived. */
export const CLOCK_START = 8;

/** Where the clock stands: minutes relative to the shot. It runs whenever the detective is walking around, and a little more for every action. */
export function clockRel(_w: World, s: GameState): number {
  return CLOCK_START + s.tmin;
}

export const clockLabel = (w: World, s: GameState): string => fmtTime(w.night.death + clockRel(w, s));

/** Let time pass. */
export function tickClock(_w: World, s: GameState, mins: number): void {
  s.tmin = Math.min(s.tmin + Math.max(0, mins), 24 * 60);
}

/** How the venue looks at this point of the night. Everything here is a pure function of the chapter. */
export interface Weather {
  dark: number;
  storm: 0 | 1 | 2;
  blackout: boolean;
  crowd: boolean;
}

export function nightState(w: World, s: GameState): Weather {
  const n = Math.max(1, w.chapters.length - 1);
  const f = Math.min(1, s.chapter / n);
  const mid = Math.ceil(n / 2);
  return {
    dark: 0.04 + f * 0.34,
    storm: s.chapter >= Math.ceil((2 * n) / 3) ? 2 : s.chapter >= Math.ceil(n / 3) ? 1 : 0,
    blackout: n >= 3 && s.chapter >= mid && s.chapter < n,
    crowd: s.chapter >= 1,
  };
}

/** How much darker the night gets as the story advances. */
export function storyDarkness(w: World, s: GameState): number {
  return nightState(w, s).dark;
}

// ---------------------------------------------------------------------------------------------
// cross-examination: every suspect stands behind four statements; only what really contradicts them breaks them

export interface PresentResult {
  before: number;
  after: number;
  broke: boolean;
  react: string;
  secret: string | null;
  motiveRevealed: boolean;
}

const REACT = {
  where: ['Ngh! Where did you find THAT?!', 'That is... that is not... how did you...?!'],
  scene: ['That... that cannot be... I was never...!', 'You cannot possibly have known that!'],
  why: ['Hmph. So you know about that. It proves nothing.', 'That is private! ...Fine. It is true. It still proves nothing.'],
  with: ['I do not see what that has to do with anything.'],
} as const;

export type CrossResult =
  | { kind: 'objection'; stmt: StmtKind; why: string; res: PresentResult }
  | { kind: 'hold'; why: string }
  | { kind: 'herring'; res: PresentResult }
  | { kind: 'again'; why: string };

export const crackKey = (charId: string, kind: StmtKind): string => `${charId}:${kind}`;
export const isCracked = (s: GameState, charId: string, kind: StmtKind): boolean => s.cracked.includes(crackKey(charId, kind));

/** A red herring you hold that points at this person and has not been explained away yet. */
export function liveHerring(w: World, s: GameState, charId: string, evId: string): boolean {
  const e = evidenceById(w, evId);
  return !!e && e.veracity === 'red-herring' && e.implicatedIds.includes(charId) && !s.cleared.includes(evId);
}

function applyBreak(w: World, s: GameState, charId: string, kind: StmtKind, power: number): PresentResult {
  const before = s.composure[charId] ?? MAX_COMPOSURE;
  const after = Math.max(0, before - power);
  s.composure[charId] = after;
  let broke = false;
  let secret: string | null = null;
  const motiveRevealed = kind === 'why' && !s.motiveKnown.includes(charId);
  if (motiveRevealed) s.motiveKnown.push(charId);
  if (after === 0 && !s.broken.includes(charId)) {
    broke = true;
    s.broken.push(charId);
    const sec = charById(w, charId)?.secrets.find((x) => x.trim());
    if (sec) {
      secret = firstPerson(sec);
      s.secretsKnown[charId] = Math.max(1, s.secretsKnown[charId] ?? 0);
    }
  }
  return { before, after, broke, react: rngFor(charId, kind, 'react').pick(REACT[kind] as readonly string[]), secret, motiveRevealed };
}

/** Present one clue, or two together, on one statement. Only a real contradiction lands an OBJECTION; a miss says why it is not one. */
export function crossExamine(w: World, s: GameState, charId: string, stmtIdx: number, evIds: string[]): CrossResult {
  const st = testimony(w, charId)[stmtIdx];
  if (!st) return { kind: 'hold', why: 'There is nothing to press there.' };
  if (isCracked(s, charId, st.kind)) return { kind: 'again', why: 'That statement is already in pieces.' };
  const first = evIds[0] as string;
  if (evIds.length === 1 && liveHerring(w, s, charId, first)) {
    s.hits.push(`${charId}:${first}`);
    const before = s.composure[charId] ?? MAX_COMPOSURE;
    return { kind: 'herring', res: { before, after: before, broke: false, react: 'That is not what it looks like! There is an innocent explanation... though I suppose you will need proof.', secret: null, motiveRevealed: false } };
  }
  const r: BreakResult = breaks(w, s, charId, st.kind, evIds);
  if (!r.ok) {
    s.misses += 1;
    return { kind: 'hold', why: r.why };
  }
  s.cracked.push(crackKey(charId, st.kind));
  for (const id of evIds) if (!s.hits.includes(`${charId}:${id}`)) s.hits.push(`${charId}:${id}`);
  return { kind: 'objection', stmt: st.kind, why: r.why, res: applyBreak(w, s, charId, st.kind, r.power) };
}

/** The killer's showdown: the statements that matter (WHERE and SCENE). Returns the damage dealt (0 = a miss). */
export function showdownBreak(w: World, s: GameState, stmtIdx: number, evIds: string[]): { ok: boolean; dmg: number; why: string; kind: StmtKind | null } {
  const k = w.killerId;
  const st = k ? testimony(w, k)[stmtIdx] : undefined;
  if (!k || !st) return { ok: false, dmg: 0, why: 'There is nothing to press there.', kind: null };
  const r = breaks(w, s, k, st.kind, evIds);
  if (!r.ok) return { ok: false, dmg: 0, why: r.why, kind: st.kind };
  return { ok: true, dmg: st.kind === 'where' || st.kind === 'scene' ? statementPower(st.kind) : 0, why: r.why, kind: st.kind };
}

// ---------------------------------------------------------------------------------------------
// hints and objectives

export function hint(w: World, s: GameState): string {
  s.hintsUsed += 1;
  const open = unlockedEvidence(w, s).filter((id) => !s.found.includes(id));
  if (s.met.length < Math.min(3, w.c.characters.length)) return 'Start by talking to everyone. Ask each suspect where they were when the shot rang out, then PRESS what they say.';
  if (!open.length) {
    if (s.chapter + 1 < w.chapters.length) return 'You have found everything so far. Keep talking to people; something new is bound to shake loose. The staff on their rounds see more than they say.';
    const chk = checkNight(w, s);
    if (chk.unplaced.length) return 'Open THE NIGHT (ENTER) and account for everyone at the moment of the shot. The staff counted heads in the rooms.';
    return 'Compare each headcount with who swore they were in that room. One room is short of people. Where must that person have been?';
  }
  const id = open[s.hintIdx % open.length] as string;
  s.hintIdx += 1;
  const giver = w.tipGiver[id];
  if (giver) return `${nameOf(w, giver)} knows more than they let on. Ask them about THE NIGHT.`;
  const map = w.itemMap[id];
  if (map) return `Something is lying around in ${mapLabel(w, map)}. Have another look there.`;
  return 'Retrace your steps. Something has been overlooked.';
}

/**
 * The night watch's log: when the sealed scene will next be thin of anyone watching, so a player who wants to
 * catch the sneak in the act can plan a stakeout instead of stumbling into one. Purely informational -- it
 * never names anyone (the same spoiler discipline as the near-miss toast), it doesn't touch `hintsUsed`/rank
 * (catching the killer is optional bonus content, not part of the required deduction), and it is safe to ask
 * for as many times as the player likes since the answer just tracks the clock forward.
 */
export function sneakWatchHint(w: World, sneaks: { from: number; to: number }[], tmin: number): string {
  const room = w.maps[w.sceneMapId]?.name || 'the sealed scene';
  const win = nextSneakWindow(sneaks, tmin);
  if (!win) return `Nothing more on the log for ${room} tonight, Detective. Whatever was going to happen there already has.`;
  const to = clockAt(w.night, CLOCK_START + win.to);
  if (win.from <= tmin) return `The log says the watch by ${room} is thin right now, until about ${to}. If you want to see for yourself, go now.`;
  const from = clockAt(w.night, CLOCK_START + win.from);
  return `The log says the watch by ${room} goes thin between ${from} and ${to}. Somebody who did not want to be seen might use that.`;
}

/** One line on what to do next, for the goal banner and the menu. */
export function goalText(w: World, s: GameState): string {
  if (s.done) return 'The case is closed.';
  if (!s.briefed) return `Talk to ${w.inspectorName}: walk up and press the yellow button.`;
  const open = unlockedEvidence(w, s).filter((id) => !s.found.includes(id));
  const chk = checkNight(w, s);
  if (open.length) return `Question everyone, ask the staff what they saw, and hunt for clues. Then rebuild THE NIGHT (ENTER).`;
  if (s.chapter + 1 < w.chapters.length) return 'Talk to people again: something new may shake loose.';
  if (!chk.complete) return `Rebuild THE NIGHT (ENTER): place everyone at the moment of the shot.`;
  return `The night adds up. Tell ${w.inspectorName} who did it.`;
}

export function objective(w: World, s: GameState): string {
  if (s.done) return 'Case closed';
  const { found, total } = progress(w, s);
  return `Clues ${found}/${total}`;
}

// ---------------------------------------------------------------------------------------------
// THE NIGHT: the reconstruction table

/** Everyone who is not yet on the table but whose sworn room you know (you have met them). */
export function placeAsSworn(w: World, s: GameState): number {
  let n = 0;
  for (const c of w.c.characters) {
    if (s.night[c.id] || !s.met.includes(c.id)) continue;
    const room = w.claims[c.id]?.room;
    if (room) {
      s.night[c.id] = room;
      n++;
    }
  }
  return n;
}

export interface NamedReveal {
  room: string;
  trueIds: string[];
  wrongIds: string[];
  witness: string;
}

/** Put someone in a room (or take them off the table with `null`). A placement that newly contradicts a headcount you hold costs a slip. */
export function placeToken(w: World, s: GameState, charId: string, room: string | null): { check: NightCheck; slip: boolean; reveal?: NamedReveal } {
  const beforeNight: Record<string, string> = { ...s.night };
  const before = checkNight(w, s);
  if (room) s.night[charId] = room;
  else delete s.night[charId];
  const after = checkNight(w, s);
  let slip = false;
  if (room && after.issues.some((i) => i.ids.includes(charId) && !before.issues.some((b) => b.room === i.room && b.text === i.text))) {
    const key = `slip:${charId}:${room}`;
    if (!s.seen.includes(key)) {
      s.seen.push(key);
      s.misses += 1;
      slip = true;
    }
  }
  // this placement just settled a room where a witness named exactly who was really there -- the count could already
  // have been wrong (too many claimants) or subtly wrong (the right number, the wrong person); either way, the moment
  // the room's occupants first match the witness's names exactly is worth a beat of its own (see scenes/second-truth.ts),
  // not just a cleared issue on the table.
  let reveal: NamedReveal | undefined;
  for (const h of heldOcc(w, s)) {
    if (h.o.dt !== 0 || !h.o.only) continue;
    const only = h.o.only;
    const r = h.o.room;
    const inRoom = (night: Record<string, string>) => w.c.characters.filter((c) => night[c.id] === r).map((c) => c.id);
    const beforeHere = inRoom(beforeNight);
    const afterHere = inRoom(s.night);
    const matches = (here: string[]) => here.length === only.length && only.every((id) => here.includes(id));
    if (matches(afterHere) && !matches(beforeHere)) {
      const wrongBefore = beforeHere.filter((id) => !only.includes(id));
      if (wrongBefore.length === 0) continue; // nothing was ever wrong here: not a "two stories" moment, just filling it in
      const witnessId = w.facts[h.evId]?.by;
      reveal = { room: r, trueIds: [...only], wrongIds: wrongBefore, witness: witnessId ? nameOf(w, witnessId) : 'A witness' };
      break;
    }
  }
  return { check: after, slip, reveal };
}

/** Can the detective name this person now? The table must be complete, consistent, and put exactly them alone with the victim. */
export function canAccuse(w: World, s: GameState, charId: string): { ok: boolean; why: string } {
  const chk = checkNight(w, s);
  if (s.night[charId] !== w.sceneMapId) return { ok: false, why: `${w.inspectorName}: "Show me on THE NIGHT table where they were at the shot. They have to be the one alone with ${w.c.victim.name || 'the body'}."` };
  if (chk.unplaced.length) return { ok: false, why: `${w.inspectorName}: "Account for everyone first. ${chk.unplaced.length} ${chk.unplaced.length === 1 ? 'person is' : 'people are'} still off your table."` };
  if (chk.issues.length) return { ok: false, why: `${w.inspectorName}: "Your table contradicts itself. ${(chk.issues[0] as { text: string }).text}"` };
  if (!hasCaseAgainst(w, s, charId)) return { ok: false, why: `${w.inspectorName}: "That is a hunch, not a case. Find something that actually puts a hole in ${nameOf(w, charId).split(' ')[0]}'s own story before you point at them."` };
  return { ok: true, why: '' };
}

// ---------------------------------------------------------------------------------------------
// accusation

export function killerMotive(w: World): MotiveCategory {
  const mine = w.c.motives.filter((m) => m.characterId === w.killerId);
  return (mine.find((m) => m.strength === 'strong') ?? mine[0])?.category ?? 'money';
}

/** The killer's real motive plus three plausible alternatives, in a stable shuffled order. */
export function motiveChoices(w: World): MotiveCategory[] {
  const real = killerMotive(w);
  const rng = rngFor(w.c.id, 'motive-choices');
  const others = rng.sample(MOTIVE_CATEGORIES.filter((m) => m !== real), 3);
  return rng.shuffle([real, ...others]);
}

export type Verdict = 'wrong-suspect' | 'wrong-motive' | 'correct';

export function judge(w: World, suspectId: string, motive: MotiveCategory): Verdict {
  if (suspectId !== w.killerId) return 'wrong-suspect';
  return motive === killerMotive(w) ? 'correct' : 'wrong-motive';
}

/** Rank: mistakes, hints and missed clues all cost points, so a clean solve is worth something. */
export function computeRank(w: World, s: GameState): { rank: string; score: number; truthFound: number; truthTotal: number } {
  const truth = w.c.evidence.filter((e) => e.veracity === 'true' && w.killerId && e.implicatedIds.includes(w.killerId));
  const found = truth.filter((e) => s.found.includes(e.id)).length;
  const prog = progress(w, s);
  const coverage = prog.total ? prog.found / prog.total : 1;
  const score = Math.round(100 - 22 * s.strikes - 4 * s.misses - 6 * Math.max(0, s.hintsUsed - 1) - 24 * (1 - coverage));
  const rank = score >= 90 ? 'S' : score >= 75 ? 'A' : score >= 55 ? 'B' : 'C';
  return { rank, score, truthFound: found, truthTotal: truth.length };
}

export function killerOf(w: World): Character | undefined {
  return w.killerId ? charById(w, w.killerId) : undefined;
}
