/**
 * Procedural scenario generator. Pure and seeded: the same options + seed
 * always yield the same case, and every generated case passes the consistency
 * checker with zero errors and zero warnings (see tests/generator.test.ts).
 *
 * The mystery is CONSTRUCTED so consistency and fairness are built in:
 *
 *  - Whereabouts first. A "who was where" plan gives every character one room
 *    for the alibi window. Innocents are placed in reciprocal groups (everyone
 *    names everyone else and agrees on the room) or alone; no room ever holds two
 *    unconnected alibis, and nobody's room is the murder scene. The killer
 *    claims a room they were not in.
 *  - The killer is only identifiable by COMBINING clues. Three visible traits
 *    (public bio) belong to the killer; each decoy shares two of them, so every
 *    trait clue points at several people. A witness who slipped out of their own
 *    (consistent) alibi saw the killer's claimed room empty.
 *  - Decoys are as heavily implicated as the killer: strong motives with genuine
 *    motive clues, shared traits and a red herring rooted in a real secret, each
 *    debunked strictly later by a genuine clue that agrees with their alibi.
 *  - No clue text names the killer alone.
 */
import type { Beat, Case, Character, Evidence, Motive, MotiveCategory, RedHerring, Tone } from '../models';
import { MOTIVE_CATEGORIES } from '../models';
import { estimateRuntimeMinutes, normPlace } from '../ops';
import { makeName, newNamePools } from './names';
import { capitalize, fill, Rng, randomSeed } from './rng';
import { getSetting, SETTINGS, UNIVERSAL_ROLES, type MethodDef, type RoleDef, type SettingDef } from './settings';
import {
  ALIBI_GROUP,
  ALIBI_KILLER,
  ALIBI_LONER,
  EXCURSION_OTHERS,
  EXCURSION_SELF,
  GENERIC_STORIES,
  REL_PRIVATE,
  REL_PUBLIC,
  SETTING_RELS,
  SETTING_STORIES,
  TRAITS,
  type StoryDef,
  type TraitDef,
} from './stories';
import {
  AMOUNTS,
  BEAT_DEFS,
  COMMON_PROPS,
  MINI_GAMES,
  MINOR_SECRETS,
  MOTIVES,
  QUIRKS,
  TITLE_PATTERNS,
  TONE_DRESS,
  TONE_PROPS,
  VICTIM_FLOURISH,
} from './text';

export interface GenerateOptions {
  seed?: number;
  tone?: Tone;
  playerMin?: number;
  playerMax?: number;
  /** A setting id from SETTINGS, or omitted / 'random' for a random one. */
  settingId?: string;
}

export interface GenerateBase {
  id: string;
  createdAt: string;
}

export const MAX_PLAYERS = 14;
export const MIN_PLAYERS = 3;

export function listSettings(): { id: string; label: string; era: string }[] {
  return SETTINGS.map((s) => ({ id: s.id, label: capitalize(s.names[0] ?? s.id), era: s.era }));
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

function clock(mins: number): string {
  const total = ((Math.round(mins) % 1440) + 1440) % 1440;
  const h24 = Math.floor(total / 60);
  const m = total % 60;
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${m.toString().padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
}

const embedName = (n: string) => (/^the /i.test(n) ? `the ${n.slice(4)}` : n);
const bareName = (n: string) => (/^the /i.test(n) ? n.slice(4) : n);

function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * Capitalise the first letter of every sentence (templates may start one with a
 * lowercase place name). A closing quote or bracket right after the terminator
 * means the sentence may still be running on (`shouts "Objection!" and wins`,
 * `'Who did it?' asked the maid`), so only a bare `. ! ?` starts a new sentence.
 */
export function tidy(text: string): string {
  return text.replace(/(^|[.!?]\s+)([a-z])/g, (_m, lead: string, ch: string) => lead + ch.toUpperCase());
}

const TEXT_KEYS = new Set([
  'title', 'description', 'publicBio', 'privateBackstory', 'alibi', 'secrets', 'actionPrompt', 'gmNotes',
  'whyPlausible', 'debunkNote', 'props', 'generalCostumes', 'costume', 'causeOfDeath', 'placeOfDeath', 'secretRole',
]);

export type DayPart = 'morning' | 'afternoon' | 'evening' | 'night';

/** Part of the day for a time given in minutes since midnight (may run past 24h). */
export function dayPart(minutes: number): DayPart {
  const h = Math.floor(minutes / 60) % 24;
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

/**
 * Templates are written for an evening party. For daytime settings (an afternoon
 * fete) swap the evening/night vocabulary so the prose matches the clock.
 */
export function daytimeWords(text: string): string {
  return text
    .replace(/\bLast Night\b/g, 'Last Day')
    .replace(/\btonight\b/g, 'today')
    .replace(/\bTonight\b/g, 'Today')
    .replace(/\bevening\b(?! (?:wear|dress|gowns?|suits?|attire))/g, 'afternoon')
    .replace(/\bEvening\b(?! (?:wear|dress|gowns?|suits?|attire))/g, 'Afternoon')
    .replace(/\bmidnight\b/g, 'sundown')
    .replace(/\balone in the dark\b/g, 'alone and quiet');
}

/** Tidy only free-text fields (never enums or ids). */
function tidyDeep<T>(value: T, daytime: boolean, isText = false): T {
  if (typeof value === 'string') return (isText ? tidy(daytime ? daytimeWords(value) : value) : value) as T;
  if (Array.isArray(value)) return value.map((v) => tidyDeep(v, daytime, isText)) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = tidyDeep(v, daytime, TEXT_KEYS.has(k));
    return out as T;
  }
  return value;
}

const WITNESS_LINES: { title: string; desc: string }[] = [
  { title: 'The empty room', desc: "{w} says: 'When I cut through {kroom} at about {tw}, it was completely empty. Anyone who claims to have sat there all evening is mistaken.'" },
  { title: 'A cold chair', desc: "{w} recalls: 'The door of {kroom} stood open at {tw}, the lamp was out and the chair was cold. Nobody had sat there for a good while.'" },
  { title: 'Nobody home', desc: "{w} remarks: 'At {tw} I hurried through {kroom}. The fire had gone out and the room was silent and empty.'" },
];

type BeatKey = (typeof BEAT_DEFS)[number]['key'];

export function generateCase(opts: GenerateOptions = {}, base?: GenerateBase): Case {
  const seed = opts.seed ?? randomSeed();
  const rng = new Rng(seed);
  const tone: Tone = opts.tone ?? 'noir';
  const playerMin = clamp(Math.round(opts.playerMin ?? 6), MIN_PLAYERS, MAX_PLAYERS);
  const playerMax = clamp(Math.round(opts.playerMax ?? Math.max(playerMin, 8)), playerMin, MAX_PLAYERS);
  const setting: SettingDef = (opts.settingId && opts.settingId !== 'random' ? getSetting(opts.settingId) : undefined) ?? rng.pick(SETTINGS);

  const usedIds = new Set<string>();
  const gid = (prefix: string): string => {
    let id: string;
    do id = `${prefix}_${rng.token(9)}`;
    while (usedIds.has(id));
    usedIds.add(id);
    return id;
  };

  // ------------------------------------------------------------ world
  const settingName = capitalize(rng.pick(setting.names));
  const method: MethodDef = rng.pick(setting.methods);
  const poison = /poison/i.test(method.cause);
  const deathMin = setting.startHour * 60 + 5 * rng.int(24, 34);
  const when = dayPart(deathMin);
  const t1 = clock(deathMin - 40);
  const t2 = clock(deathMin + 10);
  const tw = clock(deathMin - 12);
  const pools = newNamePools();
  const roleQueue: RoleDef[] = [...rng.shuffle(setting.roles), ...rng.shuffle(UNIVERSAL_ROLES)];
  const count = Math.min(rng.int(playerMin, playerMax), roleQueue.length);

  const victimName = makeName(rng, tone, pools);
  const baseVars = {
    v: victimName,
    venue: setting.noun,
    setting: embedName(settingName),
    Setting: settingName,
    place: method.place,
    Place: capitalize(method.place),
  };
  const victimDescription = `${fill(setting.victim.bio, { name: victimName, setting: embedName(settingName) })} ${rng.pick(VICTIM_FLOURISH[tone])}`;

  // ------------------------------------------------------------ cast
  const quirks = rng.shuffle(QUIRKS[tone]);
  const minorSecrets = rng.shuffle(MINOR_SECRETS);
  const characters: Character[] = [];
  const roleOf = new Map<string, RoleDef>();
  for (let i = 0; i < count; i++) {
    const role = roleQueue[i] as RoleDef;
    const name = makeName(rng, tone, pools, role.honorific);
    const ch: Character = {
      id: gid('char'),
      name,
      secretRole: role.secret,
      publicBio: '',
      privateBackstory: '',
      relationships: [],
      alibi: '',
      alibiPlace: '',
      alibiWithIds: [],
      secrets: [],
      isKiller: false,
      costume: role.costume,
      accent: rng.pick(setting.accents),
    };
    characters.push(ch);
    roleOf.set(ch.id, role);
  }
  const killer = rng.pick(characters);
  killer.isKiller = true;
  const killerRole = roleOf.get(killer.id) as RoleDef;
  const innocents = characters.filter((c) => c !== killer);
  const byId = new Map(characters.map((c) => [c.id, c]));

  // decoys: strong-motive suspects who also share the killer's traits
  const strongInnocents = rng.sample(innocents, Math.min(2, innocents.length));
  const third = innocents.find((c) => !strongInnocents.includes(c));
  const decoys: Character[] = [...strongInnocents, ...(third ? [third] : [])];

  // ------------------------------------------------------------ whereabouts (the shared alibi timeline)
  const rooms = rng.shuffle(setting.rooms.filter((r) => normPlace(r) !== normPlace(method.place)));
  const killerRoom = rooms.shift() as string;
  // Almost always, the killer's alibi names a real companion instead of standing alone: an innocent who honestly
  // believes they spent the window together (a mistake, not a conspiracy -- they are never told, and their own
  // account never changes). This gives the WITH statement a second person worth investigating: if that
  // companion's own story ever came apart, the killer's claimed company would come apart with it (see
  // facts.ts's chained-alibi rule). It never lets the room's headcount alone hide the killer behind the
  // companion, because the witness who counts heads there names exactly who was really in it (see
  // `synthRounds`'s `only` field) -- so this can never blur into the "who was really where" proof the solver
  // relies on. Reserved for casts with enough spare innocents that a normal loner/group split still forms.
  // Round 4 shipped this at 45% activation, gated to casts of 8+; a demanding review of that round correctly called
  // this "a probabilistic side-mechanic" a majority of players would never see. Round 5: this is now the norm, not
  // the exception (90% whenever the cast can support it, from a smaller cast of 5 up), so the "the headcount lied
  // by identity, not by count" read is a recurring interrogation habit rather than a rare surprise -- see
  // `checkNight`'s `named` issue and `scenes/second-truth.ts`'s vignette, which fires the first time a player
  // untangles one of these for themselves.
  const coverCandidates = innocents.filter((ch) => !decoys.includes(ch));
  const coverWitness = innocents.length >= 4 && coverCandidates.length > 0 && rng.chance(0.9) ? (rng.pick(coverCandidates) as Character) : null;
  const restInnocents = coverWitness ? innocents.filter((ch) => ch !== coverWitness) : innocents;
  const lonerCount = restInnocents.length <= 2 ? restInnocents.length : restInnocents.length >= 7 ? 2 : 1;
  const ordered = [...decoys, ...rng.shuffle(restInnocents.filter((c) => !decoys.includes(c)))];
  const loners = ordered.slice(0, lonerCount);
  const grouped = rng.shuffle(ordered.slice(lonerCount));
  const groupRoomsAvail = rooms.length - loners.length;
  const groups: Character[][] = [];
  if (grouped.length > 0) {
    const size = Math.max(2, Math.ceil(grouped.length / Math.max(1, groupRoomsAvail)));
    for (let i = 0; i < grouped.length; i += size) groups.push(grouped.slice(i, i + size));
    if (groups.length > 1 && (groups[groups.length - 1] as Character[]).length === 1) {
      const lone = groups.pop() as Character[];
      (groups[groups.length - 1] as Character[]).push(...lone);
    }
  }
  let roomCursor = 0;
  const nextRoom = () => rooms[roomCursor++] as string;
  killer.alibiPlace = killerRoom;
  for (const l of loners) l.alibiPlace = nextRoom();
  for (const g of groups) {
    const room = nextRoom();
    for (const m of g) {
      m.alibiPlace = room;
      m.alibiWithIds = g.filter((o) => o !== m).map((o) => o.id);
    }
  }
  if (coverWitness) {
    coverWitness.alibiPlace = killerRoom;
    coverWitness.alibiWithIds = [killer.id];
    killer.alibiWithIds = [coverWitness.id];
  }

  // the witness briefly leaves their own alibi and crosses the killer's claimed room
  const witness = rng.pick(grouped.length ? grouped : restInnocents);
  const excursionVars = { tw, kroom: killerRoom, w: witness.name };
  // one shared account per group, so companions describe the same activity
  const groupTemplate = new Map<string, string>(groups.map((g) => [(g[0] as Character).alibiPlace, rng.pick(ALIBI_GROUP)]));
  if (coverWitness) groupTemplate.set(killerRoom, rng.pick(ALIBI_GROUP));

  for (const ch of characters) {
    const room = ch.alibiPlace;
    const companions = ch.alibiWithIds.map((id) => (byId.get(id) as Character).name);
    let text: string;
    if (ch === killer && companions.length === 0) text = fill(rng.pick(ALIBI_KILLER), { t1, t2, room });
    else if (companions.length === 0) text = fill(rng.pick(ALIBI_LONER), { t1, t2, room });
    else text = fill(groupTemplate.get(room) as string, { t1, t2, room, others: joinNames(companions) });
    if (ch === witness) text += ` ${fill(EXCURSION_SELF, excursionVars)}`;
    else if (witness.alibiWithIds.includes(ch.id)) text += ` ${fill(EXCURSION_OTHERS, excursionVars)}`;
    ch.alibi = text;
  }

  // ------------------------------------------------------------ traits (public, visible)
  const killerTraits = rng.sample(TRAITS, 3);
  const spare = TRAITS.filter((t) => !killerTraits.includes(t));
  const traitsOf = new Map<string, TraitDef[]>(characters.map((c) => [c.id, []]));
  const give = (c: Character, t: TraitDef) => (traitsOf.get(c.id) as TraitDef[]).push(t);
  for (const t of killerTraits) give(killer, t);
  const [T0, T1, T2] = killerTraits as [TraitDef, TraitDef, TraitDef];
  const pairs: [TraitDef, TraitDef][] = [[T0, T1], [T1, T2], [T0, T2]];
  decoys.forEach((d, i) => (pairs[i] as [TraitDef, TraitDef]).forEach((t) => give(d, t)));
  for (const c of innocents) {
    if (decoys.includes(c)) continue;
    if (rng.chance(0.35)) give(c, rng.pick(killerTraits)); // at most ONE of the killer's traits
    else if (rng.chance(0.5)) give(c, rng.pick(spare));
  }
  const holders = (t: TraitDef) => characters.filter((c) => (traitsOf.get(c.id) as TraitDef[]).includes(t));
  characters.forEach((ch, i) => {
    const role = roleOf.get(ch.id) as RoleDef;
    const traitLines = rng.shuffle((traitsOf.get(ch.id) as TraitDef[]).map((t) => t.bio));
    ch.publicBio = [fill(role.bio, { c: ch.name, venue: setting.noun, v: victimName }), ...traitLines, quirks[i % quirks.length]].join(' ');
  });

  // ------------------------------------------------------------ evidence bookkeeping
  const evidence: Evidence[] = [];
  const plan = new Map<BeatKey, string[]>();
  const addEv = (e: Omit<Evidence, 'id'>, beat: BeatKey): string => {
    const id = gid('ev');
    evidence.push({ id, ...e });
    plan.set(beat, [...(plan.get(beat) ?? []), id]);
    return id;
  };

  // ------------------------------------------------------------ motives
  const motives: Motive[] = [];
  const cats = rng.shuffle<MotiveCategory>([...MOTIVE_CATEGORIES]);
  const killerCat = cats[0] as MotiveCategory;
  const decoyCats = cats.slice(1);

  const motiveClueFor = (who: Character, cat: MotiveCategory, beat: BeatKey): string => {
    const def = MOTIVES[cat];
    const other = rng.pick(characters.filter((c) => c !== who));
    return addEv(
      {
        title: def.clueTitle,
        description: fill(def.clueDesc, { c: who.name, v: victimName, vi: victimName.charAt(0), venue: setting.noun, amount: rng.pick(AMOUNTS), other: other.name }),
        kind: def.clueKind,
        veracity: 'true',
        implicatedIds: [who.id],
      },
      beat,
    );
  };
  const addMotive = (who: Character, cat: MotiveCategory, strength: 'weak' | 'strong', evidenceIds: string[]) => {
    const desc = fill(rng.pick(MOTIVES[cat].desc[tone]), { c: who.name, v: victimName, venue: setting.noun });
    motives.push({ id: gid('mot'), characterId: who.id, strength, category: cat, description: desc, evidenceIds });
  };

  strongInnocents.forEach((who, i) => {
    const cat = decoyCats[i] as MotiveCategory;
    addMotive(who, cat, 'strong', [motiveClueFor(who, cat, i === 0 ? 'questions' : 'whispers')]);
  });
  addMotive(killer, killerCat, 'strong', [motiveClueFor(killer, killerCat, 'locker')]);
  for (const who of innocents) {
    if (!strongInnocents.includes(who)) addMotive(who, rng.pick(MOTIVE_CATEGORIES), 'weak', []);
  }

  // ------------------------------------------------------------ clues that point at the killer (only together)
  addEv({ title: method.weaponTitle, description: method.weaponDesc, kind: 'physical', veracity: 'true', implicatedIds: [] }, 'discover');

  const traitBeats: BeatKey[] = ['challenge', 'testimony', 'locker'];
  killerTraits.forEach((t, i) => {
    const w2 = rng.pick(innocents);
    const verbal = rng.chance(0.4);
    const form = verbal ? t.verbal : t.physical;
    addEv(
      {
        title: form.title,
        description: fill(form.desc, { place: method.place, w: w2.name, wroom: w2.alibiPlace }),
        kind: verbal ? 'verbal' : 'physical',
        veracity: 'true',
        implicatedIds: holders(t).map((c) => c.id),
      },
      traitBeats[i] as BeatKey,
    );
  });

  // this corpus line always claims the killer's room was completely empty, which is only true when nobody else
  // claims it; when a cover-story companion does, the staff's own rounds (see synthRounds' `only` field) name
  // who was really there instead, so no two clues can ever disagree about the same room.
  if (!coverWitness) {
    const wl = rng.pick(WITNESS_LINES);
    addEv({ title: wl.title, description: fill(wl.desc, excursionVars), kind: 'verbal', veracity: 'true', implicatedIds: [killer.id] }, 'testimony');
  }

  const suspectsHeard = [killer, ...rng.shuffle(decoys).slice(0, 2)];
  for (const c of rng.shuffle(innocents)) if (suspectsHeard.length < 3 && !suspectsHeard.includes(c)) suspectsHeard.push(c);
  addEv(
    {
      title: 'An overheard mutter',
      description: `Several guests heard someone mutter ${method.knew}, moments after the body was found. Nobody agrees who said it: it might have been ${joinNames(rng.shuffle(suspectsHeard).map((c) => c.name))}.`,
      kind: 'verbal',
      veracity: 'true',
      implicatedIds: suspectsHeard.map((c) => c.id),
    },
    'slip',
  );

  // ------------------------------------------------------------ red herrings
  const herringCount = count <= 5 ? 2 : count <= 8 ? 3 : 4;
  const revealKeys: BeatKey[] = ['whispers', 'challenge', 'testimony', 'testimony'];
  const debunkKeys: BeatKey[] = ['truth', 'locker', 'slip', 'locker'];
  const suspects = ordered.slice(0, Math.min(herringCount, innocents.length));
  const storyPool: StoryDef[] = [...GENERIC_STORIES, ...(SETTING_STORIES[setting.id] ?? [])];
  const specific = new Set(SETTING_STORIES[setting.id] ?? []);
  const usedStories = new Set<StoryDef>();
  const redHerrings: RedHerring[] = [];
  const debunkAt: { rhId: string; key: BeatKey; title: string; note: string }[] = [];
  const revealAt: { key: BeatKey; title: string; why: string }[] = [];
  const secretOf = new Map<string, string>();
  const storyRel = new Map<string, { target: Character; label: string }>();

  suspects.forEach((suspect, i) => {
    let candidates = storyPool.filter((s) => !usedStories.has(s) && (!s.group || suspect.alibiWithIds.length > 0) && !(poison && s.violent));
    const favoured = candidates.filter((s) => specific.has(s));
    if (favoured.length && rng.chance(0.6)) candidates = favoured;
    const story = rng.pick(candidates);
    usedStories.add(story);
    const other = story.group ? (byId.get(rng.pick(suspect.alibiWithIds)) as Character) : rng.pick(innocents.filter((c) => c !== suspect));
    const vars = { c: suspect.name, other: other.name, v: victimName, place: rng.pick(setting.rooms), room: suspect.alibiPlace };
    const tellId = addEv({ title: story.tellTitle, description: fill(story.tell, vars), kind: story.tellKind, veracity: 'red-herring', implicatedIds: [suspect.id] }, revealKeys[i] as BeatKey);
    const debunkId = addEv({ title: story.debunkTitle, description: fill(story.debunkDesc, vars), kind: story.debunkKind, veracity: 'true', implicatedIds: [] }, debunkKeys[i] as BeatKey);
    const rh: RedHerring = {
      id: gid('rh'),
      evidenceId: tellId,
      whyPlausible: fill(story.whyPlausible, vars),
      debunkBeatId: null, // patched once beats exist
      debunkEvidenceId: debunkId,
      debunkNote: fill(story.note, vars),
    };
    redHerrings.push(rh);
    secretOf.set(suspect.id, fill(story.secret, vars));
    if (story.rel && story.group) storyRel.set(suspect.id, { target: other, label: story.rel });
    debunkAt.push({ rhId: rh.id, key: debunkKeys[i] as BeatKey, title: story.tellTitle, note: rh.debunkNote });
    revealAt.push({ key: revealKeys[i] as BeatKey, title: story.tellTitle, why: rh.whyPlausible });
  });

  // ------------------------------------------------------------ secrets, relationships, backstories
  const miniPick = rng.sample(MINI_GAMES, rng.int(2, 3));
  const killMotive = motives.find((m) => m.characterId === killer.id) as Motive;
  const publicLabels = [...REL_PUBLIC, ...(SETTING_RELS[setting.id] ?? [])];
  for (const ch of characters) {
    const role = roleOf.get(ch.id) as RoleDef;
    const others = characters.filter((c) => c !== ch);

    const secrets: string[] = [];
    const framed = secretOf.get(ch.id);
    if (framed) secrets.push(framed);
    while (secrets.length < (framed ? 2 : rng.int(1, 2))) secrets.push(minorSecrets.pop() ?? (MINOR_SECRETS[0] as string));
    ch.secrets = secrets;

    // a private relationship implied by a secret takes priority, so secrets and relationships never conflict
    const implied = storyRel.get(ch.id);
    const privTarget = implied?.target ?? rng.pick(others);
    const pubPool = others.filter((c) => c !== privTarget);
    const pubTarget = rng.pick(pubPool.length ? pubPool : others);
    ch.relationships = [
      { id: gid('rel'), targetId: pubTarget.id, label: rng.pick(publicLabels), visibility: 'public' },
      { id: gid('rel'), targetId: privTarget.id, label: implied?.label ?? rng.pick(REL_PRIVATE), visibility: 'private' },
    ];

    const closing =
      ch === killer
        ? `The ${when} ${victimName} died, you are the one who did it: ${victimName} was ${method.cause}, in ${method.place}. Nobody must ever find out.`
        : `The ${when} ${victimName} died, you are innocent, but you know exactly how it looks. Stick to your alibi, and do not let a small secret turn into a confession.`;
    // The motive is listed on the sheet under "What people might suspect about you"; do not repeat it here.
    ch.privateBackstory = `${fill(role.back, { v: victimName, venue: setting.noun })} ${closing}`;
  }

  // ------------------------------------------------------------ timeline
  const includeIntermission = rng.chance(0.5);
  const beats: Beat[] = [];
  const beatIdByKey = new Map<BeatKey, string>();
  let cursor = setting.startHour * 60;
  const tips: Record<string, string[]> = {};
  for (const r of revealAt) (tips[r.key] ??= []).push(`Red herring in play: "${r.title}". ${r.why}`);
  for (const d of debunkAt) (tips[d.key] ??= []).push(`Debunks "${d.title}": ${d.note}`);

  for (const def of BEAT_DEFS) {
    if (def.optional && !includeIntermission) continue;
    if (def.key === 'discover') cursor = deathMin + 15;
    else if (def.key !== 'arrive') cursor += def.gap;
    const id = gid('beat');
    beatIdByKey.set(def.key, id);
    let notes = def.notes;
    if (tips[def.key]) notes += `\n${(tips[def.key] as string[]).join('\n')}`;
    if (def.key === 'testimony') notes += `\nThe witness (${witness.name}) briefly left their alibi group and cut through ${killerRoom}: it is the room ${killer.name} claims to have been sitting in.`;
    if (def.key === 'reveal') {
      notes += `\nThe killer is ${killer.name} (${killerRole.label}). ${killer.name} did it: ${victimName} was ${method.cause}, in ${method.place}. Motive: ${killMotive.description}`;
      notes += `\nHow the puzzle resolves: only ${killer.name} has all three traits (${killerTraits.map((t) => t.id).join(', ')}), and ${killer.name}'s claimed alibi in ${killerRoom} was contradicted by ${witness.name}.`;
    }
    const timerMin = def.timerMin ? def.timerMin + (rng.chance(0.5) ? 0 : rng.int(1, 3)) : 0;
    const game = miniPick[0] as (typeof MINI_GAMES)[number];
    beats.push({
      id,
      title: def.title[tone],
      description: fill(def.desc[tone], baseVars),
      timeLabel: clock(cursor),
      round: def.round,
      trigger: def.trigger,
      timerSeconds: def.trigger === 'timer' ? timerMin * 60 : 0,
      actionPrompt: def.trigger === 'player-action' ? `Play "${game.title}". ${game.description} Confirm here once a winner has emerged.` : '',
      evidenceIds: plan.get(def.key) ?? [],
      gmNotes: notes,
    });
  }
  for (const d of debunkAt) {
    const rh = redHerrings.find((r) => r.id === d.rhId) as RedHerring;
    rh.debunkBeatId = beatIdByKey.get(d.key) ?? null;
  }

  // ------------------------------------------------------------ extras + title
  const props = Array.from(new Set([...rng.sample(setting.props, 4), ...rng.sample(TONE_PROPS[tone], 2), ...COMMON_PROPS]));
  const generalCostumes = [...rng.sample(setting.dress, 3), TONE_DRESS[tone]];
  const difficulty = clamp(2 + (herringCount - 2) + (count >= 10 ? 1 : 0) + (tone === 'serious' ? 1 : 0) - (tone === 'comedic' ? 1 : 0), 1, 5);

  const now = new Date().toISOString();
  const title = fill(rng.pick(TITLE_PATTERNS[tone]), { S: embedName(settingName), B: bareName(settingName) });
  const result: Case = {
    id: base?.id ?? gid('case'),
    schemaVersion: 1,
    title: capitalize(title),
    setting: { name: settingName, era: setting.era, description: capitalize(fill(setting.blurb[tone], baseVars)) },
    tone,
    playerMin,
    playerMax,
    victim: {
      name: victimName,
      description: victimDescription,
      causeOfDeath: capitalize(method.cause),
      timeOfDeath: clock(deathMin),
      placeOfDeath: capitalize(method.place),
    },
    characters,
    motives,
    evidence,
    redHerrings,
    beats,
    extras: {
      props,
      generalCostumes,
      miniGames: miniPick.map((g) => ({ id: gid('game'), title: g.title, description: g.description })),
      difficulty,
      runtimeMinutes: 90,
    },
    seed,
    createdAt: base?.createdAt ?? now,
    updatedAt: now,
  };
  result.extras.runtimeMinutes = estimateRuntimeMinutes(result) + 30;
  return tidyDeep(result, setting.startHour < 17);
}
