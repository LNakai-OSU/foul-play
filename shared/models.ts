/**
 * Shared data models. One source of truth for both the Express server
 * (input validation) and the React client (types).
 *
 * The schemas are deliberately *structural*: they guarantee shape and length
 * limits but NOT referential integrity. Dangling references (a beat pointing at
 * a deleted clue, a clue implicating a missing character, …) are legal to
 * store so that the consistency checker (shared/checker.ts) can flag them.
 */
import { z } from 'zod';

export const TONES = ['comedic', 'serious', 'noir'] as const;
export type Tone = (typeof TONES)[number];

export const MOTIVE_CATEGORIES = [
  'money',
  'love',
  'revenge',
  'jealousy',
  'power',
  'secrecy',
  'inheritance',
  'ambition',
] as const;
export type MotiveCategory = (typeof MOTIVE_CATEGORIES)[number];

export const TRIGGERS = ['manual', 'timer', 'player-action'] as const;
export type Trigger = (typeof TRIGGERS)[number];

const id = z.string().min(1).max(80);
const short = z.string().max(200);
const medium = z.string().max(2_000);
const long = z.string().max(8_000);

export const SettingSchema = z.object({
  name: short.default(''),
  era: short.default(''),
  description: medium.default(''),
});

export const VictimSchema = z.object({
  name: short.default(''),
  description: medium.default(''),
  causeOfDeath: short.default(''),
  timeOfDeath: short.default(''),
  placeOfDeath: short.default(''),
});

export const RelationshipSchema = z.object({
  id,
  targetId: z.string().max(80),
  label: short.default(''),
  visibility: z.enum(['public', 'private']).default('public'),
});

export const CharacterSchema = z.object({
  id,
  name: short.default(''),
  secretRole: short.default(''),
  publicBio: medium.default(''),
  privateBackstory: long.default(''),
  relationships: z.array(RelationshipSchema).max(60).default([]),
  alibi: medium.default(''),
  /** Structured backing for the alibi: where they say they were … */
  alibiPlace: short.default(''),
  /** … and who was with them (must be mutual: those characters list this one back). */
  alibiWithIds: z.array(z.string().max(80)).max(60).default([]),
  secrets: z.array(medium).max(30).default([]),
  isKiller: z.boolean().default(false),
  costume: medium.default(''),
  accent: short.default(''),
});

export const MotiveSchema = z.object({
  id,
  characterId: z.string().max(80),
  strength: z.enum(['weak', 'strong']).default('weak'),
  category: z.enum(MOTIVE_CATEGORIES).default('money'),
  description: medium.default(''),
  evidenceIds: z.array(z.string().max(80)).max(100).default([]),
});

export const EvidenceSchema = z.object({
  id,
  title: short.default(''),
  description: medium.default(''),
  kind: z.enum(['physical', 'verbal']).default('physical'),
  veracity: z.enum(['true', 'red-herring']).default('true'),
  implicatedIds: z.array(z.string().max(80)).max(60).default([]),
});

export const RedHerringSchema = z.object({
  id,
  evidenceId: z.string().max(80),
  whyPlausible: medium.default(''),
  debunkBeatId: z.string().max(80).nullable().default(null),
  debunkEvidenceId: z.string().max(80).nullable().default(null),
  debunkNote: medium.default(''),
});

export const BeatSchema = z.object({
  id,
  title: short.default(''),
  description: medium.default(''),
  /** In-game clock label, e.g. "9:40 PM". */
  timeLabel: short.default(''),
  round: z.number().int().min(0).max(99).default(1),
  trigger: z.enum(TRIGGERS).default('manual'),
  timerSeconds: z.number().int().min(0).max(24 * 3600).default(0),
  actionPrompt: medium.default(''),
  evidenceIds: z.array(z.string().max(80)).max(100).default([]),
  gmNotes: long.default(''),
});

export const MiniGameSchema = z.object({
  id,
  title: short.default(''),
  description: medium.default(''),
});

export const ExtrasSchema = z.object({
  props: z.array(short).max(60).default([]),
  generalCostumes: z.array(medium).max(30).default([]),
  miniGames: z.array(MiniGameSchema).max(30).default([]),
  difficulty: z.number().int().min(1).max(5).default(3),
  runtimeMinutes: z.number().int().min(0).max(1_000).default(90),
});

export const CaseSchema = z.object({
  id,
  schemaVersion: z.literal(1).default(1),
  title: short.default(''),
  setting: SettingSchema.default({}),
  tone: z.enum(TONES).default('noir'),
  playerMin: z.number().int().min(1).max(40).default(6),
  playerMax: z.number().int().min(1).max(40).default(8),
  victim: VictimSchema.default({}),
  characters: z.array(CharacterSchema).max(60).default([]),
  motives: z.array(MotiveSchema).max(300).default([]),
  evidence: z.array(EvidenceSchema).max(300).default([]),
  redHerrings: z.array(RedHerringSchema).max(100).default([]),
  beats: z.array(BeatSchema).max(200).default([]),
  extras: ExtrasSchema.default({}),
  /** Seed the scenario was generated from (null if hand-built). */
  seed: z.number().int().nullable().default(null),
  createdAt: z.string().max(40),
  updatedAt: z.string().max(40),
});

export type Setting = z.infer<typeof SettingSchema>;
export type Victim = z.infer<typeof VictimSchema>;
export type Relationship = z.infer<typeof RelationshipSchema>;
export type Character = z.infer<typeof CharacterSchema>;
export type Motive = z.infer<typeof MotiveSchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;
export type RedHerring = z.infer<typeof RedHerringSchema>;
export type Beat = z.infer<typeof BeatSchema>;
export type MiniGame = z.infer<typeof MiniGameSchema>;
export type Extras = z.infer<typeof ExtrasSchema>;
export type Case = z.infer<typeof CaseSchema>;

/** Lightweight row for the case library. */
export interface CaseSummary {
  id: string;
  title: string;
  tone: Tone;
  settingName: string;
  characterCount: number;
  evidenceCount: number;
  beatCount: number;
  playerMin: number;
  playerMax: number;
  createdAt: string;
  updatedAt: string;
}

export function summarize(c: Case): CaseSummary {
  return {
    id: c.id,
    title: c.title,
    tone: c.tone,
    settingName: c.setting.name,
    characterCount: c.characters.length,
    evidenceCount: c.evidence.length,
    beatCount: c.beats.length,
    playerMin: c.playerMin,
    playerMax: c.playerMax,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; errors: string[] };

/** Validate and normalise unknown input into a Case (defaults fill gaps). */
export function parseCase(input: unknown): ParseResult<Case> {
  const r = CaseSchema.safeParse(input);
  if (r.success) return { ok: true, value: r.data };
  return {
    ok: false,
    errors: r.error.issues.slice(0, 12).map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`),
  };
}

/** Wizard step identifiers, in order. */
export const STEPS = [
  'setting',
  'victim',
  'characters',
  'motives',
  'evidence',
  'red-herrings',
  'timeline',
  'polish',
] as const;
export type StepId = (typeof STEPS)[number];

export const STEP_LABELS: Record<StepId, string> = {
  setting: 'Setting',
  victim: 'Victim',
  characters: 'Characters',
  motives: 'Motives',
  evidence: 'Evidence',
  'red-herrings': 'Red herrings',
  timeline: 'Timeline',
  polish: 'Polish',
};

/**
 * Validate an imported case file (a bare case, or the {case: …} wrapper) and
 * return it with a fresh id and timestamps. Shared by server and client so the
 * client can reject bad files without a failing network request.
 */
export function parseImport(body: unknown, newId: string): ParseResult<Case> {
  const candidate = body && typeof body === 'object' && !Array.isArray(body) && 'case' in body ? (body as { case: unknown }).case : body;
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return { ok: false, errors: ['The file must contain a case object.'] };
  }
  const now = new Date().toISOString();
  const raw = candidate as Record<string, unknown>;
  const parsed = parseCase({ ...raw, id: newId, createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : now, updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : now });
  if (!parsed.ok) return parsed;
  return { ok: true, value: { ...parsed.value, id: newId, createdAt: now, updatedAt: now } };
}
