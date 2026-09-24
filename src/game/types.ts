/** Shared types for the detective game. Pure data: no DOM here, so the core is unit-testable. */
import type { Case } from '../../shared/models';
import type { EnvId } from './art/skins';
import type { IconRef } from './icons';

export const TILE = 16;
export const VIEW_W = 320; // 20 tiles
export const VIEW_H = 192; // 12 tiles

export type Dir = 'up' | 'down' | 'left' | 'right';
export const DIR_VEC: Record<Dir, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
export const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };

export type Hat = 'none' | 'fedora' | 'cap' | 'chef' | 'bow' | 'tophat' | 'beret' | 'police';

export interface Look {
  skin: string;
  hair: string;
  hairStyle: 0 | 1 | 2;
  outfit: string;
  trim: string;
  pants: string;
  hat: Hat;
  hatColor: string;
  glasses: boolean;
  coat: boolean;
}

export type NpcKind = 'suspect' | 'inspector' | 'body';

export interface NpcDef {
  id: string;
  kind: NpcKind;
  charId: string | null;
  name: string;
  x: number;
  y: number;
  dir: Dir;
  look: Look;
}

export interface ItemDef {
  evidenceId: string;
  x: number;
  y: number;
}

export interface Warp {
  x: number;
  y: number;
  to: string;
  tx: number;
  ty: number;
  dir: Dir;
  /** What the player sees when facing the door. */
  label?: string;
  scene?: boolean;
}

export interface Light {
  /** tile coordinates of the centre */
  x: number;
  y: number;
  r: number;
  color: string;
  flicker?: number;
}

/** A person who wanders a map for atmosphere: crew, guests, stage hands. Not part of the mystery. */
export interface ExtraDef {
  id: string;
  name: string;
  x: number;
  y: number;
  look: Look;
  line: string;
  /** Present when this person is a witness who can tell you what they saw at the shot. */
  witnessId?: string;
}

/** A member of staff who did their rounds while the shot rang out. Not a suspect: they only tell the truth. */
export interface Witness {
  id: string;
  name: string;
  line: string;
}

/** One thing a witness observed at a moment of the night: how many people were in a room. `dt` = minutes relative to the shot. */
export interface Obs {
  room: string;
  dt: number;
  min: number;
  max: number;
  /**
   * When a witness names exactly who they saw (not just a count), the real occupants' ids. Used only when a room's
   * claimants include someone who was not really there (the killer's cover story), so the solver can tell the honest
   * companion apart from the liar even though both swore to the same room -- a plain headcount alone cannot.
   */
  only?: string[];
}

export type FactKind = 'occ' | 'motive' | 'trait' | 'herring' | 'debunk' | 'object' | 'caught' | 'absent';

/** What a clue establishes, in terms the deduction can reason with. Shown to the player as a short tag. */
export interface Fact {
  kind: FactKind;
  /** occupancy observations (kind 'occ') */
  obs?: Obs[];
  /** motive: the person; trait/herring: everyone it fits */
  who?: string[];
  by?: string;
}

/** What a suspect swears about the night. */
export interface Claim {
  room: string;
  withIds: string[];
  /** a short trip they admit to, e.g. cutting through another room at the witness time */
  excursion: { dt: number; through: string | null } | null;
}

/** The clock of the night, all relative to the shot at `death` (minutes after midnight). */
export interface Night {
  death: number;
  /** the alibi window, relative to the shot */
  t1: number;
  t2: number;
}

export type Ambient = 'none' | 'snow' | 'blizzard' | 'rain' | 'steam' | 'embers' | 'dust' | 'smoke' | 'drip' | 'sparks' | 'spray' | 'petals' | 'fireflies' | 'fog';

export interface MapDef {
  id: string;
  name: string;
  /** The setting this map belongs to: picks the palette and painters. */
  env: EnvId;
  /** Room theme id ('hub' for the overworld). */
  theme: string;
  /** Wall type of the interior wall face (for wall-mounted props). */
  wt: number;
  /** Base darkness 0..1 of the lighting layer (before story progress). */
  dark: number;
  ambient: Ambient;
  w: number;
  h: number;
  /** Tile cells (kind | variant << 8), row-major. */
  ground: number[];
  over: number[];
  warps: Warp[];
  npcs: NpcDef[];
  extras: ExtraDef[];
  lights: Light[];
  items: ItemDef[];
  signs: Record<string, string>;
  outdoor: boolean;
  /** Where the player lands when entering (rooms) or the hub spawn. */
  entrance: { x: number; y: number };
}

export interface Chapter {
  beatId: string | null;
  title: string;
  time: string;
  description: string;
  evidenceIds: string[];
}

export interface World {
  c: Case;
  env: EnvId;
  hubId: string;
  sceneMapId: string;
  maps: Record<string, MapDef>;
  /** charId -> map the suspect stands in. */
  charMap: Record<string, string>;
  /** evidenceId -> its icon. */
  icons: Record<string, IconRef>;
  /** evidenceId -> map it lies in (physical clues). */
  itemMap: Record<string, string>;
  /** charId -> verbal evidence ids that person can tell you. */
  tips: Record<string, string[]>;
  /** evidenceId -> the person who tells it (verbal clues). */
  tipGiver: Record<string, string>;
  /** evidenceId -> what is said, cleaned up for speech. */
  tipText: Record<string, string>;
  chapters: Chapter[];
  night: Night;
  /** evidenceId -> what it establishes */
  facts: Record<string, Fact>;
  /** charId -> what they swear */
  claims: Record<string, Claim>;
  witnesses: Witness[];
  /** clues that are only ever earned in play (never lying around, never told): not counted in the totals */
  hidden: string[];
  /** the clue earned by catching the killer in the sealed scene */
  caughtId: string | null;
  /** this setting's signature interaction, when a room could take its prop */
  ritual: { evId: string; map: string; x: number; y: number } | null;
  inspectorName: string;
  killerId: string | null;
  /** Total composure the killer has in the final showdown. */
  showdownHp: number;
}

export interface GameState {
  v: 3;
  caseId: string;
  caseStamp: string;
  player: string;
  briefed: boolean;
  map: string;
  x: number;
  y: number;
  dir: Dir;
  chapter: number;
  found: string[];
  cleared: string[];
  composure: Record<string, number>;
  broken: string[];
  hits: string[];
  asked: Record<string, string[]>;
  motiveKnown: string[];
  secretsKnown: Record<string, number>;
  met: string[];
  strikes: number;
  steps: number;
  hintIdx: number;
  /** charId -> the room the detective placed them in on THE NIGHT table (the reconstruction). */
  night: Record<string, string>;
  /** wrong presents and wrong table entries: they cost rank */
  misses: number;
  hintsUsed: number;
  /** minutes elapsed within the current chapter (the clock) */
  tmin: number;
  /** statements already in pieces: "charId:kind" */
  cracked: string[];
  /** things you witnessed with your own eyes: "caught", "absent:charId" */
  seen: string[];
  /** signature interactions already done */
  tried: string[];
  done: null | 'won' | 'lost';
  rank: string;
}
