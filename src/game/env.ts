/**
 * The twelve environments: which setting a case belongs to, and for each one its room themes, ambience, lighting and music.
 * Pure data, no DOM. Unknown or hand-built settings degrade to keyword matching and then to a generic house.
 */
import type { Case } from '../../shared/models';
import { normPlace } from '../../shared/ops';
import type { EnvId } from './art/skins';
import { WT } from './art/interior';
import { K } from './tiles';
import type { Ambient } from './types';

export interface RoomSpec {
  id: string;
  size: [number, number];
  /** ground kind (and optional variant pool) */
  floor: number;
  floorVar?: number[];
  /** wall type (low nibble) | tone << 4 */
  wt: number;
  /** back-wall props ('WINDOW', 'NONE' or prop names; "name:3" fixes the sub-variant, "name:r6" randomises 0-5) */
  back: string[];
  /** furniture pool */
  deco: string[];
  /** how many floor pieces per 100 free cells */
  density?: number;
  /** centre runner: [ground kind, variant] */
  runner?: [number, number];
  dark?: number;
  ambient?: Ambient;
  /** open-air room: what fences it in */
  outdoor?: { border: string[]; top: 'hedge' | 'rail' | 'sky' | 'facade' | 'water'; sky?: number };
  /** ship promenades: the sea beyond the rail */
  deck?: boolean;
}

export interface EnvDef {
  id: EnvId;
  label: string;
  /** hub darkness at the start of the story (0 = bright day) */
  dusk: number;
  ambient: Ambient;
  /** the hub is an indoor space (no weather) */
  indoor?: boolean;
  /** camera sway in px for boats */
  sway?: number;
  /** ambient sound bed */
  sound: 'crowd' | 'wind' | 'waves' | 'river' | 'rain' | 'hum' | 'train' | 'birds' | 'projector' | 'none';
  music: { bpm: number; mode: 'major' | 'minor' | 'blues' | 'dorian' | 'phrygian'; lead: 'square' | 'triangle' | 'sawtooth' | 'sine'; pulse: 'straight' | 'waltz' | 'shuffle' | 'drone'; seed: number };
  rooms: { rx: RegExp; spec: RoomSpec }[];
  /** used when nothing else matches */
  fallback: RoomSpec;
  /** the flavour of the hub's HUD banner */
  banner?: string;
}

const R = (id: string, size: [number, number], floor: number, wt: number, back: string[], deco: string[], extra: Partial<RoomSpec> = {}): RoomSpec => ({ id, size, floor, wt, back, deco, ...extra });
const O = (id: string, size: [number, number], floor: number, top: NonNullable<RoomSpec['outdoor']>['top'], border: string[], deco: string[], extra: Partial<RoomSpec> = {}): RoomSpec => ({
  id,
  size,
  floor,
  wt: 0,
  back: [],
  deco,
  outdoor: { border, top },
  ...extra,
});

const tent = (tone: number) => WT.tent | (tone << 4);
const wall = (t: number, tone = 0) => t | (tone << 4);

// -------------------------------------------------------------------------------------------------
// generic rooms, used by hand-built cases and as fallbacks

const GENERIC: EnvDef['rooms'] = [
  { rx: /garden|greenhouse|conservatory|courtyard|grounds|terrace|deck|yard|orchard|lawn|maze|patio|balcony|pier|dock|park|promenade/, spec: O('garden', [13, 10], K.LAWN, 'hedge', ['tree', 'bush', 'hedge'], ['bush', 'tree', 'statue', 'bench', 'fountain', 'plant', 'rose_bush', 'sundial']) },
  { rx: /kitchen|galley|commissary|pantry|dining|restaurant|cafe|canteen|mess|\bbar\b|tavern|diner|buffet|bakery/, spec: R('kitchen', [12, 9], K.CHECKER, wall(WT.paper), ['counter', 'counter', 'stove', 'WINDOW', 'counter', 'shelf'], ['table', 'table', 'chair', 'barrel', 'crate', 'plant']) },
  { rx: /cellar|warehouse|storage|vault|basement|\bhold\b|garage|shed|workshop|crypt|boiler|engine|stable|\bprop/, spec: R('cellar', [13, 9], K.STONE, wall(WT.stone), ['shelf', 'barrel', 'crate', 'barrel', 'NONE', 'crate'], ['barrel', 'crate', 'crate', 'barrel', 'table', 'barrel'], { dark: 0.3 }) },
  { rx: /booth|control|bridge|cockpit|tower|projection|sound|radio|signal/, spec: R('booth', [10, 8], K.WOOD, wall(WT.paper), ['WINDOW', 'desk', 'WINDOW', 'shelf', 'desk'], ['desk', 'chair', 'crate', 'plant', 'chair']) },
  { rx: /library|study|office|suite|archive|\bden\b|studio|records|\blab|reading|bureau|chart|scene of the crime/, spec: R('study', [12, 9], K.WOOD, wall(WT.paper), ['shelf', 'shelf', 'shelf', 'WINDOW', 'painting', 'shelf'], ['desk', 'table', 'chair', 'plant', 'statue', 'armchair'], { runner: [K.RUG, 0] }) },
  { rx: /bedroom|cabin|quarters|dorm|nursery|dressing|guest/, spec: R('bedroom', [11, 8], K.WOOD, wall(WT.paper, 1), ['WINDOW', 'painting', 'shelf', 'WINDOW', 'painting'], ['bed', 'bed', 'chair', 'plant', 'table', 'sofa'], { runner: [K.RUG, 1] }) },
  { rx: /ballroom|lounge|drawing|parlou?r|salon|theat|\bhall|billiard|music|smoking|cinema|screening|stage|foyer|casino|club/, spec: R('lounge', [14, 10], K.WOOD, wall(WT.paper), ['fireplace', 'WINDOW', 'painting', 'WINDOW', 'painting', 'shelf', 'WINDOW'], ['sofa', 'sofa', 'table', 'piano', 'plant', 'statue', 'armchair'], { runner: [K.RUG, 0] }) },
];
const GENERIC_FALLBACK = R('generic', [12, 9], K.WOOD, wall(WT.paper), ['WINDOW', 'painting', 'shelf', 'WINDOW', 'fireplace'], ['table', 'chair', 'plant', 'sofa', 'statue', 'crate'], { runner: [K.RUG, 2] });

const env = (e: Omit<EnvDef, 'fallback'> & { fallback?: RoomSpec }): EnvDef => ({ fallback: GENERIC_FALLBACK, ...e });

export const ENVS: Record<EnvId, EnvDef> = {
  // sound: 'wind' (not 'none') so an unmatched hand-built case still has a continuous ambience bed under its
  // score — see round 11's audio pass (and round 12's correction below): the generated melody rests for
  // real (a sparse plucky line, not a sustained pad), and every one of the 12 real settings already has its
  // own bed to cover those rests; 'generic' was the one env that didn't, which would have made its melody's
  // ordinary rests read as the music actually stopping instead of just going quiet.
  //
  // Round 12 correction: round 11's own headline number for this gap ("genuine 1.5-2.3s stretches of true
  // digital silence") was inflated ~4x by a self-inflicted artifact in its rendering script (a `+ 1.5`
  // second silent tail appended to every rendered buffer, counted as if it were an in-song rest). Re-measured
  // with that tail removed, `generic`'s own `town` track's real longest in-song rest is ~0.4s (0.397s exactly,
  // over a 4-loop, tail-free render); across all 12 real settings' town/room/title/battle tracks the same
  // tail-free measurement ranges from ~0.19s (studio) to ~1.45s (manor), so 0.4s is not even the ceiling of
  // what a rest can look like elsewhere -- it is simply what `generic`'s own particular melody happens to do.
  // Verdict: 0.4s of true digital silence during a hub track's rest is still a real, audible dropout over a
  // long play session (confirmed: a mixed render of this exact track with a continuous bed underneath measures
  // ~0.001s of silence, vs 0.397s with no bed at all) -- and since the fix is a one-line, already-proven-safe
  // data change (every other env already uses 'wind' or another bed with zero regressions), it remains
  // justified at the corrected magnitude, just not for the reason originally, incorrectly, claimed.
  generic: env({ id: 'generic', label: 'Town', dusk: 0.3, ambient: 'none', sound: 'wind', music: { bpm: 108, mode: 'major', lead: 'square', pulse: 'straight', seed: 1 }, rooms: GENERIC }),

  fete: env({
    id: 'fete', label: 'Village fete', dusk: 0, ambient: 'petals', sound: 'birds', music: { bpm: 120, mode: 'major', lead: 'square', pulse: 'waltz', seed: 11 },
    rooms: [
      { rx: /tea tent/, spec: R('tea', [13, 9], K.DIRT, tent(0), ['NONE', 'notice_board', 'NONE', 'NONE', 'shelf'], ['trestle:0', 'trestle:1', 'tea_urn', 'chair', 'chair', 'cake_stand', 'stacked_chairs'], { density: 10 }) },
      { rx: /produce|marquee/, spec: R('produce', [14, 9], K.DIRT, tent(2), ['NONE', 'NONE', 'notice_board', 'NONE'], ['trestle:1', 'trestle:2', 'prize_marrow', 'veg_crate', 'hay_bale', 'barrel', 'veg_crate'], { density: 11 }) },
      { rx: /bric|brac|stall/, spec: R('stall', [12, 8], K.DIRT, tent(3), ['NONE', 'NONE', 'NONE', 'painting'], ['junk_table:0', 'junk_table:1', 'trunk', 'statue:1', 'lamp', 'mannequin', 'crate'], { density: 11 }) },
      { rx: /cricket|pavilion/, spec: R('pavilion', [13, 9], K.WOOD, wall(WT.panel), ['scoreboard', 'WINDOW', 'notice_board', 'WINDOW', 'shelf'], ['bench', 'bench', 'table:1', 'chair', 'trunk', 'stacked_chairs', 'plant'], { density: 9 }) },
      { rx: /church|hall/, spec: R('hall', [14, 10], K.WOOD, wall(WT.paper, 2), ['WINDOW', 'notice_board', 'WINDOW', 'painting', 'WINDOW'], ['stacked_chairs', 'table:2', 'chair', 'piano', 'plant', 'trestle:1', 'chair'], { density: 9 }) },
      { rx: /tombola/, spec: R('tombola', [11, 8], K.DIRT, tent(0), ['NONE', 'notice_board', 'NONE', 'NONE'], ['tombola', 'trestle:2', 'hay_bale', 'chair', 'tea_urn', 'crate'], { density: 10 }) },
      { rx: /garden|vicarage/, spec: O('vicarage', [14, 10], K.LAWN, 'hedge', ['hedge', 'tree', 'hedge', 'bush'], ['rose_bush', 'bench', 'sundial', 'bush', 'tree', 'rose_bush', 'plant', 'rose_bush']) },
      { rx: /beer/, spec: R('beer', [13, 9], K.DIRT, tent(1), ['NONE', 'NONE', 'notice_board', 'NONE'], ['barrel', 'barrel', 'trestle:2', 'bench', 'hay_bale', 'barrel', 'chair'], { density: 11 }) },
    ],
  }),

  gallery: env({
    id: 'gallery', label: 'Art gala', dusk: 0.2, ambient: 'none', indoor: true, sound: 'crowd', music: { bpm: 100, mode: 'dorian', lead: 'sine', pulse: 'straight', seed: 21 },
    rooms: [
      { rx: /main hall/, spec: R('main', [16, 10], K.MARBLE, wall(WT.white), ['art_frame:r6', 'art_frame:r6', 'WINDOW', 'art_frame:r6', 'art_frame:r6', 'WINDOW'], ['plinth:r4', 'plinth:r4', 'gallery_bench', 'rope_post', 'plinth:r4', 'install_bricks', 'unmade_bed', 'statue'], { density: 8 }) },
      { rx: /sculpture|court/, spec: R('court', [15, 10], K.MARBLE, wall(WT.white, 1), ['WINDOW', 'WINDOW', 'art_frame:r6', 'WINDOW'], ['plinth:r4', 'plinth:r4', 'palm', 'statue', 'plinth:r4', 'plant', 'fountain'], { density: 9 }) },
      { rx: /restoration|studio/, spec: R('restoration', [12, 9], K.WOOD, wall(WT.white, 1), ['shelf', 'art_frame:r6', 'WINDOW', 'shelf'], ['easel:r2', 'easel:r2', 'desk', 'crate', 'counter', 'plant', 'chair'], { density: 10 }) },
      { rx: /vault/, spec: R('vault', [10, 8], K.METAL, wall(WT.steel), ['deposit_boxes', 'vault_door', 'deposit_boxes', 'deposit_boxes'], ['glass_case', 'crate', 'safe', 'glass_case', 'crate'], { dark: 0.35, density: 9 }) },
      { rx: /cloak/, spec: R('cloak', [10, 8], K.MARBLE, wall(WT.white), ['shelf', 'NONE', 'art_frame:r6', 'shelf'], ['coat_rack:r3', 'coat_rack:r3', 'counter', 'chair', 'trunk', 'plant'], { density: 10 }) },
      { rx: /roof|terrace/, spec: O('terrace', [14, 9], K.MARBLE, 'sky', ['rope_post', 'plant', 'palm'], ['plant', 'palm', 'gallery_bench', 'plant', 'lounger', 'rope_post'], { ambient: 'fog' }) },
      { rx: /gift|shop/, spec: R('shop', [11, 8], K.MARBLE, wall(WT.white, 1), ['shelf', 'art_frame:r6', 'shelf', 'shelf'], ['counter:1', 'plinth:r4', 'crate', 'mannequin', 'plant', 'table:1'], { density: 10 }) },
      { rx: /curator|office/, spec: R('office', [11, 8], K.WOOD, wall(WT.white, 2), ['shelf', 'art_frame:r6', 'WINDOW', 'shelf'], ['desk', 'armchair', 'plant', 'statue:1', 'safe', 'chair'], { runner: [K.RUG, 1], density: 8 }) },
    ],
  }),

  station: env({
    id: 'station', label: 'Polar station', dusk: 0.6, ambient: 'blizzard', sound: 'wind', music: { bpm: 84, mode: 'phrygian', lead: 'sine', pulse: 'drone', seed: 31 },
    rooms: [
      { rx: /mess/, spec: R('mess', [13, 9], K.METAL, wall(WT.steel), ['WINDOW', 'counter', 'pipes', 'WINDOW', 'counter'], ['mess_table:r2', 'mess_table:r2', 'coffee_urn', 'stool', 'chair', 'locker', 'plant'], { density: 9 }) },
      { rx: /lab/, spec: R('lab', [13, 9], K.TILE, wall(WT.steel, 1), ['monitor_bank:r3', 'specimen_fridge', 'pipes', 'WINDOW', 'monitor_bank:r3'], ['lab_bench:r2', 'lab_bench:r2', 'desk', 'chair', 'locker', 'lab_bench:r2'], { density: 10 }) },
      { rx: /generator|shed/, spec: R('generator', [12, 9], K.METAL, wall(WT.tin), ['pipes', 'pipes', 'gauges', 'pipes'], ['generator', 'drum:r3', 'crate', 'drum:r3', 'generator', 'crate_snow'], { dark: 0.25, density: 9, ambient: 'sparks' }) },
      { rx: /radio/, spec: R('radio', [10, 8], K.METAL, wall(WT.steel), ['radio_rack', 'radio_rack', 'WINDOW', 'radio_rack'], ['desk', 'radio', 'chair', 'monitor_bank:r3', 'locker'], { density: 9 }) },
      { rx: /greenhouse|dome/, spec: R('dome', [13, 10], K.TILE, wall(WT.steel, 2), ['WINDOW', 'WINDOW', 'WINDOW', 'planter', 'WINDOW'], ['planter:r3', 'planter:r3', 'plant', 'planter:r3', 'bench', 'palm'], { density: 12, ambient: 'steam' }) },
      { rx: /bunk/, spec: R('bunk', [11, 8], K.METAL, wall(WT.steel), ['locker', 'WINDOW', 'locker', 'locker'], ['bunk:r3', 'bunk:r3', 'locker', 'chair', 'trunk'], { density: 10 }) },
      { rx: /airlock/, spec: R('airlock', [9, 7], K.METAL, wall(WT.steel, 3), ['airlock_hatch', 'suit_rack:r2', 'pipes', 'suit_rack:r2'], ['suit_rack:r2', 'locker', 'bench', 'crate'], { dark: 0.15, density: 8 }) },
      { rx: /observatory/, spec: R('observatory', [11, 9], K.METAL, wall(WT.steel), ['WINDOW', 'WINDOW', 'monitor_bank:r3', 'WINDOW'], ['telescope', 'desk', 'chair', 'monitor_bank:r3', 'telescope'], { dark: 0.3, density: 8 }) },
    ],
  }),

  riverboat: env({
    id: 'riverboat', label: 'Paddle steamer', dusk: 0.42, ambient: 'spray', sway: 1, sound: 'river', music: { bpm: 118, mode: 'major', lead: 'square', pulse: 'shuffle', seed: 41 },
    rooms: [
      { rx: /gaming|saloon|casino/, spec: R('saloon', [15, 10], K.CARPET, wall(WT.gilt), ['painting', 'mirror', 'WINDOW', 'mirror', 'WINDOW', 'painting'], ['roulette', 'card_table:r2', 'card_table:r2', 'plant', 'roulette', 'stool', 'chair', 'round_table'], { density: 8, runner: [K.CARPET, 0] }) },
      { rx: /promenade|deck/, spec: O('promenade', [15, 9], K.DECK, 'water', ['rail'], ['deckchair:r3', 'deckchair:r3', 'rope_coil', 'bollard', 'barrel_pyramid', 'life_ring'], { deck: true, ambient: 'spray' }) },
      { rx: /paddle/, spec: R('paddle', [12, 9], K.BOARDS, wall(WT.panel), ['paddle:1', 'paddle:0', 'paddle:0', 'paddle:2'], ['piston', 'crate', 'barrel', 'rope_coil', 'capstan', 'gauges'], { dark: 0.1, density: 8, ambient: 'spray' }) },
      { rx: /captain/, spec: R('captain', [11, 8], K.WOOD, wall(WT.panel), ['porthole', 'bookcase', 'porthole', 'painting'], ['bed', 'chart_table', 'ship_wheel', 'chair', 'trunk', 'desk'], { runner: [K.RUG, 1], density: 8 }) },
      { rx: /galley|kitchen/, spec: R('galley', [12, 8], K.BOARDS, wall(WT.tin), ['pans_rack', 'stove', 'porthole', 'pans_rack'], ['counter', 'table:1', 'barrel', 'crate', 'stove', 'barrel'], { density: 10, ambient: 'steam' }) },
      { rx: /boiler/, spec: R('boiler', [13, 9], K.METAL, wall(WT.steel), ['pipes', 'gauges', 'pipes', 'gauges'], ['boiler', 'boiler', 'coal_pile', 'barrel', 'piston', 'coal_pile'], { dark: 0.2, density: 8, ambient: 'embers' }) },
      { rx: /ladies|lounge/, spec: R('ladies', [12, 9], K.CARPET, wall(WT.gilt, 1), ['mirror', 'WINDOW', 'painting', 'mirror'], ['sofa:r3', 'armchair:r3', 'table:2', 'plant', 'piano', 'urn', 'sofa:r3'], { density: 8, runner: [K.CARPET, 1] }) },
      { rx: /cargo|hold/, spec: R('hold', [14, 9], K.BOARDS, wall(WT.tin), ['NONE', 'pipes', 'NONE', 'NONE'], ['cotton_bale', 'crate', 'barrel', 'barrel_pyramid', 'cotton_bale', 'rope_coil', 'crate'], { dark: 0.3, density: 12 }) },
    ],
  }),

  manor: env({
    id: 'manor', label: 'Country house', dusk: 0.5, ambient: 'fireflies', sound: 'birds', music: { bpm: 96, mode: 'minor', lead: 'triangle', pulse: 'waltz', seed: 51 },
    rooms: [
      { rx: /library/, spec: R('library', [14, 10], K.WOOD, wall(WT.paper), ['bookcase', 'bookcase', 'fireplace', 'bookcase', 'WINDOW', 'bookcase'], ['armchair:r3', 'table', 'globe', 'desk', 'plant', 'statue:1', 'armchair:r3'], { runner: [K.RUG, 0], density: 8 }) },
      { rx: /conservatory/, spec: R('conservatory', [13, 10], K.CHECKER, wall(WT.white), ['WINDOW', 'WINDOW', 'plant', 'WINDOW', 'WINDOW'], ['palm', 'plant', 'wicker:r3', 'table:2', 'palm', 'plant', 'fountain'], { density: 10 }) },
      { rx: /wine cellar|cellar/, spec: R('cellar', [13, 9], K.DARK, wall(WT.stone), ['wine_rack', 'wine_rack', 'NONE', 'wine_rack'], ['barrel', 'barrel', 'crate', 'table:1', 'barrel', 'wine_rack'], { dark: 0.32, density: 9, ambient: 'drip' }) },
      { rx: /drawing/, spec: R('drawing', [14, 10], K.WOOD, wall(WT.paper, 0), ['fireplace', 'painting', 'WINDOW', 'painting', 'WINDOW', 'mirror'], ['sofa:r3', 'armchair:r3', 'piano', 'table:2', 'plant', 'clock', 'urn'], { floorVar: [3], runner: [K.RUG, 0], density: 8 }) },
      { rx: /greenhouse/, spec: R('greenhouse', [13, 9], K.PATH, wall(WT.white), ['WINDOW', 'WINDOW', 'WINDOW', 'plant'], ['planter:r3', 'plant', 'bench', 'planter:r3', 'barrel', 'palm'], { density: 11 }) },
      { rx: /billiard/, spec: R('billiard', [13, 9], K.WOOD, wall(WT.panel), ['painting', 'WINDOW', 'clock', 'painting', 'bookcase'], ['billiard', 'armchair:r3', 'table:1', 'armchair:r3', 'plant', 'lamp'], { density: 8 }) },
      { rx: /rose|garden/, spec: O('rose', [14, 10], K.LAWN, 'hedge', ['hedge', 'topiary', 'hedge', 'urn'], ['rose_bush', 'fountain', 'bench', 'topiary', 'rose_bush', 'urn', 'sundial', 'rose_bush']) },
      { rx: /servant|stairs/, spec: R('stairs', [9, 10], K.WOOD, wall(WT.brick), ['stairs', 'NONE', 'coat_rack:r3', 'NONE'], ['crate', 'barrel', 'trunk', 'coat_rack:r3'], { density: 8 }) },
    ],
  }),

  liner: env({
    id: 'liner', label: 'Ocean liner', dusk: 0.45, ambient: 'spray', sway: 1, sound: 'waves', music: { bpm: 104, mode: 'major', lead: 'triangle', pulse: 'waltz', seed: 61 },
    rooms: [
      { rx: /first-class|lounge/, spec: R('lounge', [15, 10], K.WOOD, wall(WT.gilt), ['porthole', 'painting', 'porthole', 'mirror', 'porthole'], ['sofa:r3', 'table:2', 'armchair:r3', 'palm', 'piano', 'sofa:r3', 'stool'], { floorVar: [3], runner: [K.CARPET, 1], density: 8 }) },
      { rx: /promenade|deck/, spec: O('promenade', [15, 9], K.DECK, 'water', ['rail'], ['deckchair:r3', 'deckchair:r3', 'life_ring', 'bollard', 'lifeboat', 'rope_coil'], { deck: true, ambient: 'spray' }) },
      { rx: /ballroom/, spec: R('ballroom', [16, 11], K.WOOD, wall(WT.gilt, 1), ['mirror', 'painting', 'WINDOW', 'mirror', 'WINDOW', 'painting'], ['column', 'palm', 'table:2', 'column', 'piano', 'sofa:r3', 'palm'], { floorVar: [3], density: 5 }) },
      { rx: /engine/, spec: R('engine', [14, 9], K.METAL, wall(WT.steel), ['pipes', 'gauges', 'pipes', 'piston'], ['piston', 'boiler', 'barrel', 'piston', 'crate', 'boiler'], { dark: 0.2, density: 9, ambient: 'steam' }) },
      { rx: /captain/, spec: R('captain', [11, 8], K.WOOD, wall(WT.panel), ['porthole', 'bookcase', 'porthole', 'painting'], ['bed', 'chart_table', 'ship_wheel', 'chair', 'trunk', 'desk'], { runner: [K.RUG, 1], density: 8 }) },
      { rx: /radio/, spec: R('radio', [10, 8], K.WOOD, wall(WT.panel), ['radio_rack', 'porthole', 'radio_rack', 'gauges'], ['desk', 'radio', 'chair', 'chair', 'trunk'], { density: 9 }) },
      { rx: /library/, spec: R('library', [12, 9], K.WOOD, wall(WT.panel), ['bookcase', 'bookcase', 'porthole', 'bookcase'], ['armchair:r3', 'table', 'globe', 'desk', 'plant', 'armchair:r3'], { runner: [K.RUG, 0], density: 8 }) },
      { rx: /steward|pantry|wine/, spec: R('pantry', [11, 8], K.BOARDS, wall(WT.panel), ['wine_rack', 'wine_rack', 'porthole', 'wine_rack'], ['crate', 'barrel', 'counter', 'crate', 'trunk', 'table:1'], { density: 10 }) },
    ],
  }),

  lodge: env({
    id: 'lodge', label: 'Alpine lodge', dusk: 0.5, ambient: 'snow', sound: 'wind', music: { bpm: 92, mode: 'dorian', lead: 'triangle', pulse: 'straight', seed: 71 },
    rooms: [
      { rx: /great hall/, spec: R('great', [15, 10], K.WOOD, wall(WT.log), ['antler_mount', 'fireplace', 'antler_mount', 'WINDOW', 'antler_mount', 'WINDOW'], ['sofa:r3', 'armchair:r3', 'table:1', 'bear', 'log_stack', 'lamp', 'plant'], { runner: [K.RUG, 0], density: 8 }) },
      { rx: /hot tub/, spec: O('hottub', [13, 9], K.DECK, 'sky', ['pine', 'pine', 'drift'], ['hot_tub', 'lounger:r3', 'drift', 'pine', 'lounger:r3', 'lamppost'], { ambient: 'snow' }) },
      { rx: /ski/, spec: R('ski', [12, 8], K.STONE, wall(WT.log), ['ski_rack:r3', 'ski_rack:r3', 'WINDOW', 'ski_rack:r3'], ['boots', 'locker:r2', 'bench', 'sled', 'crate', 'boots'], { density: 10 }) },
      { rx: /sauna/, spec: R('sauna', [9, 8], K.WOOD, wall(WT.log, 1), ['NONE', 'NONE', 'NONE', 'NONE'], ['sauna_bench', 'sauna_stove', 'barrel', 'chair', 'sauna_bench'], { dark: 0.15, ambient: 'steam', density: 9 }) },
      { rx: /trophy/, spec: R('trophy', [13, 9], K.WOOD, wall(WT.log), ['antler_mount', 'trophy_case', 'antler_mount', 'trophy_case'], ['bear', 'table:1', 'armchair:r3', 'statue', 'bear', 'lamp'], { runner: [K.RUG, 1], density: 7 }) },
      { rx: /kitchen/, spec: R('kitchen', [12, 9], K.CHECKER, wall(WT.log), ['pans_rack', 'stove', 'WINDOW', 'pans_rack'], ['counter', 'table:1', 'barrel', 'crate', 'stove', 'log_stack'], { density: 10, ambient: 'steam' }) },
      { rx: /boiler/, spec: R('boiler', [11, 8], K.DARK, wall(WT.stone), ['pipes', 'pipes', 'gauges', 'pipes'], ['boiler', 'drum:r3', 'log_stack', 'crate', 'boiler'], { dark: 0.25, density: 9, ambient: 'embers' }) },
      { rx: /balcony|upstairs/, spec: O('balcony', [14, 7], K.DECK, 'sky', ['pine', 'rail', 'drift'], ['lounger:r3', 'drift', 'table:1', 'lamppost', 'lounger:r3'], { ambient: 'snow' }) },
    ],
  }),

  studio: env({
    id: 'studio', label: 'Movie studio', dusk: 0.35, ambient: 'dust', sound: 'projector', music: { bpm: 126, mode: 'major', lead: 'square', pulse: 'shuffle', seed: 81 },
    rooms: [
      { rx: /soundstage|stage nine/, spec: R('stage', [17, 12], K.STAGE, wall(WT.tin), ['flat:r2', 'flat:r2', 'NONE', 'flat:r2', 'NONE', 'flat:r2'], ['klieg', 'film_camera', 'director_chair:r3', 'clapper', 'light_stand', 'cable_coil', 'flat:r2', 'klieg'], { floorVar: [0, 0, 0, 1, 2], density: 11, dark: 0.05 }) },
      { rx: /costume/, spec: R('costume', [13, 9], K.WOOD, wall(WT.paper, 1), ['mirror', 'WINDOW', 'vanity', 'shelf', 'mirror'], ['costume_rack:r3', 'mannequin', 'sewing', 'costume_rack:r3', 'trunk', 'mannequin', 'chair'], { runner: [K.RUG, 3], density: 11 }) },
      { rx: /projection/, spec: R('booth', [9, 7], K.WOOD, wall(WT.tin), ['WINDOW', 'reel_stack', 'WINDOW'], ['projector', 'projector', 'reel_stack', 'desk', 'chair'], { dark: 0.35, density: 9, ambient: 'dust' }) },
      { rx: /commissary/, spec: R('commissary', [14, 9], K.CHECKER, wall(WT.paper, 1), ['WINDOW', 'painting', 'WINDOW', 'jukebox'], ['diner_booth', 'diner_booth', 'table:2', 'chair', 'stool', 'counter:1', 'plant'], { density: 9 }) },
      { rx: /backlot|street/, spec: O('backlot', [16, 10], K.ASPHALT, 'facade', ['lamppost', 'palm'], ['lamppost', 'palm', 'trash_can', 'klieg', 'vintage_car:0', 'water_tower', 'director_chair:r3'], { ambient: 'dust' }) },
      { rx: /executive/, spec: R('exec', [13, 9], K.WOOD, wall(WT.gilt, 2), ['WINDOW', 'painting', 'WINDOW', 'mirror'], ['desk', 'sofa:r3', 'armchair:r3', 'palm', 'statue:1', 'clock', 'plant'], { floorVar: [3], runner: [K.RUG, 0], density: 7 }) },
      { rx: /prop|warehouse/, spec: R('warehouse', [15, 10], K.BOARDS, wall(WT.tin), ['NONE', 'shelf', 'NONE', 'shelf'], ['prop_rack', 'throne', 'crate', 'statue', 'barrel', 'trunk:r3', 'mannequin', 'flat:r2', 'skull'], { dark: 0.15, density: 12 }) },
      { rx: /sound/, spec: R('sound', [9, 7], K.WOOD, wall(WT.steel, 2), ['NONE', 'monitor_bank:r3', 'NONE', 'reel_stack'], ['mixing_desk', 'chair', 'monitor_bank:r3', 'reel_stack', 'cable_coil'], { dark: 0.25, density: 8 }) },
    ],
  }),

  restaurant: env({
    id: 'restaurant', label: 'Fine dining', dusk: 0.25, ambient: 'none', indoor: true, sound: 'crowd', music: { bpm: 88, mode: 'dorian', lead: 'sine', pulse: 'waltz', seed: 91 },
    rooms: [
      { rx: /kitchen/, spec: R('kitchen', [14, 9], K.TILE, wall(WT.tile), ['pans_rack', 'range', 'pans_rack', 'WINDOW', 'range'], ['counter', 'counter', 'range', 'table:1', 'veg_crate:r3', 'oven', 'stool'], { density: 10, ambient: 'steam' }) },
      { rx: /fridge|walk-in/, spec: R('fridge', [9, 7], K.METAL, wall(WT.cold), ['fridge_door', 'shelf', 'NONE', 'shelf'], ['veg_crate:r3', 'crate', 'pallet', 'veg_crate:r3', 'drum:2'], { dark: 0.2, density: 10, ambient: 'fog' }) },
      { rx: /wine cellar|cellar/, spec: R('cellar', [12, 9], K.STONE, wall(WT.stone), ['wine_rack', 'wine_rack', 'NONE', 'wine_rack'], ['barrel', 'wine_rack', 'table:1', 'crate', 'barrel'], { dark: 0.3, density: 9, ambient: 'drip' }) },
      { rx: /private|dining/, spec: R('private', [12, 9], K.CARPET, wall(WT.gilt), ['painting', 'WINDOW', 'painting', 'mirror'], ['dine_table:r2', 'dine_table:r2', 'chair', 'plant', 'statue:1', 'urn'], { density: 7, runner: [K.CARPET, 0] }) },
      { rx: /pastry/, spec: R('pastry', [11, 8], K.TILE, wall(WT.tile), ['pans_rack', 'oven', 'WINDOW', 'shelf'], ['marble_bench', 'oven', 'cake_stand', 'counter:1', 'stool', 'marble_bench'], { density: 10 }) },
      { rx: /loading|dock/, spec: O('dock', [14, 9], K.WET, 'facade', ['dumpster', 'trash_can', 'vent_steam'], ['dumpster', 'pallet', 'veg_crate:r3', 'trash_can', 'vent_steam', 'crate', 'lamppost'], { ambient: 'rain' }) },
      { rx: /\bbar\b/, spec: R('bar', [13, 9], K.CARPET, wall(WT.gilt, 1), ['bottle_shelf', 'bottle_shelf', 'mirror', 'bottle_shelf'], ['bar_counter', 'stool', 'stool', 'round_table', 'stool', 'sofa:r3', 'plant'], { density: 8, runner: [K.CARPET, 1] }) },
      { rx: /manager|office/, spec: R('office', [11, 8], K.WOOD, wall(WT.paper, 1), ['cctv', 'WINDOW', 'shelf', 'cctv'], ['desk', 'safe', 'armchair', 'plant', 'chair', 'trunk'], { runner: [K.RUG, 0], density: 8 }) },
    ],
  }),

  train: env({
    id: 'train', label: 'Luxury express', dusk: 0.5, ambient: 'embers', sound: 'train', music: { bpm: 112, mode: 'minor', lead: 'triangle', pulse: 'shuffle', seed: 101 },
    rooms: [
      { rx: /dining/, spec: R('dining', [17, 7], K.CARPET, wall(WT.panel), ['WINDOW', 'WINDOW', 'NONE', 'WINDOW', 'WINDOW', 'NONE'], ['table:2', 'chair', 'table:2', 'chair', 'lamp'], { density: 12, runner: [K.CARPET, 0] }) },
      { rx: /observation/, spec: R('observation', [14, 8], K.CARPET, wall(WT.panel, 1), ['WINDOW', 'WINDOW', 'WINDOW', 'WINDOW'], ['armchair:r3', 'sofa:r3', 'plant', 'table:2', 'armchair:r3', 'lamp'], { density: 9, runner: [K.CARPET, 1] }) },
      { rx: /sleeping/, spec: R('sleeping', [15, 7], K.CARPET, wall(WT.panel), ['WINDOW', 'NONE', 'WINDOW', 'NONE'], ['bed:r3', 'trunk:r3', 'hat_box:r3', 'armchair:r3', 'bed:r3', 'lamp'], { density: 11, runner: [K.CARPET, 0] }) },
      { rx: /baggage/, spec: R('baggage', [14, 8], K.BOARDS, wall(WT.tin), ['NONE', 'pipes', 'NONE', 'NONE'], ['trunk:r3', 'crate', 'hat_box:r3', 'barrel', 'trunk:r3', 'crate', 'trunk:r3'], { dark: 0.15, density: 14 }) },
      { rx: /smoking/, spec: R('smoking', [12, 8], K.CARPET, wall(WT.panel, 1), ['painting', 'WINDOW', 'painting', 'WINDOW'], ['armchair:r3', 'table:1', 'sofa:r3', 'lamp', 'armchair:r3', 'plant'], { density: 9, ambient: 'smoke', runner: [K.CARPET, 0] }) },
      { rx: /galley|kitchen/, spec: R('galley', [12, 7], K.CHECKER, wall(WT.tin), ['pans_rack', 'stove', 'WINDOW', 'pans_rack'], ['counter', 'table:1', 'barrel', 'crate', 'stove'], { density: 11, ambient: 'steam' }) },
      { rx: /corridor/, spec: R('corridor', [16, 6], K.CARPET, wall(WT.panel, 1), ['WINDOW', 'NONE', 'WINDOW', 'NONE', 'WINDOW'], ['trunk:r3', 'plant', 'lamp', 'hat_box:r3'], { density: 8, runner: [K.CARPET, 1] }) },
      { rx: /engine|cab/, spec: R('cab', [11, 8], K.METAL, wall(WT.steel, 1), ['firebox', 'gauges', 'pipes', 'gauges'], ['coal_pile', 'coal_pile', 'crate', 'barrel', 'boiler'], { dark: 0.2, density: 9, ambient: 'sparks' }) },
    ],
  }),

  club: env({
    id: 'club', label: 'Jazz club', dusk: 0.6, ambient: 'rain', sound: 'rain', music: { bpm: 96, mode: 'blues', lead: 'triangle', pulse: 'shuffle', seed: 111 },
    rooms: [
      { rx: /main floor/, spec: R('floor', [16, 11], K.WOOD, wall(WT.paper), ['neon:0', 'painting', 'neon:1', 'WINDOW', 'neon:2'], ['round_table', 'round_table', 'chair', 'round_table', 'stool', 'plant', 'chair'], { floorVar: [3], density: 8, dark: 0.15 }) },
      { rx: /\bbar\b/, spec: R('bar', [13, 8], K.WOOD, wall(WT.paper, 1), ['bottle_shelf', 'bottle_shelf', 'mirror', 'bottle_shelf', 'neon:0'], ['bar_counter', 'stool', 'stool', 'round_table', 'stool', 'plant'], { dark: 0.15, density: 8 }) },
      { rx: /card|backroom/, spec: R('cards', [11, 8], K.WOOD, wall(WT.brick), ['painting', 'NONE', 'clock', 'NONE'], ['card_table:r2', 'card_table:r2', 'chair', 'safe', 'chair', 'lamp'], { dark: 0.3, density: 10, ambient: 'smoke' }) },
      { rx: /coat/, spec: R('coat', [10, 7], K.WOOD, wall(WT.paper, 1), ['shelf', 'NONE', 'shelf', 'neon:3'], ['coat_rack:r3', 'coat_rack:r3', 'counter', 'trunk', 'chair'], { dark: 0.1, density: 11 }) },
      { rx: /band|stage/, spec: R('stage', [14, 9], K.STAGE, wall(WT.gilt, 1), ['curtain:1', 'curtain:0', 'curtain:1', 'curtain:0', 'curtain:1'], ['drum_kit', 'piano', 'double_bass', 'spotlight', 'music_stand', 'chair', 'spotlight'], { density: 7, dark: 0.2 }) },
      { rx: /alley/, spec: O('alley', [14, 9], K.WET, 'facade', ['dumpster', 'trash_can'], ['dumpster', 'trash_can', 'vent_steam', 'lamppost', 'crate', 'fire_escape', 'vintage_car:0', 'barrel'], { ambient: 'rain' }) },
      { rx: /owner|office/, spec: R('office', [11, 8], K.WOOD, wall(WT.paper), ['shelf', 'painting', 'WINDOW', 'shelf'], ['desk', 'safe', 'armchair', 'phonograph', 'lamp', 'chair'], { runner: [K.RUG, 1], density: 8 }) },
      { rx: /cellar|speakeasy/, spec: R('cellar', [13, 8], K.DARK, wall(WT.brick), ['NONE', 'bottle_shelf', 'NONE', 'bottle_shelf'], ['still', 'barrel', 'crate', 'table:1', 'barrel', 'round_table', 'barrel'], { dark: 0.38, density: 11, ambient: 'drip' }) },
    ],
  }),

  theatre: env({
    id: 'theatre', label: 'Opera house', dusk: 0.3, ambient: 'dust', indoor: true, sound: 'crowd', music: { bpm: 92, mode: 'minor', lead: 'square', pulse: 'waltz', seed: 121 },
    rooms: [
      { rx: /\bstage\b/, spec: R('stage', [16, 11], K.STAGE, wall(WT.tin), ['curtain:1', 'curtain:0', 'curtain:0', 'curtain:1', 'curtain:0', 'curtain:0'], ['flat:r2', 'throne', 'spotlight', 'prop_rack', 'spotlight', 'flat:r2', 'skull'], { floorVar: [0, 0, 1, 2], density: 6, dark: 0.15 }) },
      { rx: /orchestra|pit/, spec: R('pit', [14, 8], K.WOOD, wall(WT.panel), ['pit_rail', 'NONE', 'pit_rail', 'NONE'], ['music_stand', 'cello', 'chair', 'double_bass', 'music_stand', 'drum_kit', 'chair'], { density: 11, dark: 0.2 }) },
      { rx: /green room/, spec: R('green', [12, 8], K.WOOD, wall(WT.paper, 1), ['mirror', 'WINDOW', 'painting', 'mirror'], ['sofa:r3', 'armchair:r3', 'table:2', 'plant', 'vase', 'urn'].filter((p) => p !== 'vase'), { runner: [K.RUG, 0], density: 8 }) },
      { rx: /prop/, spec: R('props', [13, 9], K.BOARDS, wall(WT.brick), ['shelf', 'NONE', 'shelf', 'NONE'], ['prop_rack', 'throne', 'skull', 'crate', 'trunk:r3', 'statue', 'flat:r2', 'barrel'], { dark: 0.2, density: 12 }) },
      { rx: /box/, spec: R('box', [10, 7], K.CARPET, wall(WT.gilt), ['curtain:1', 'box_front', 'box_front', 'curtain:1'], ['armchair:r3', 'armchair:r3', 'table:2', 'column', 'plant'], { density: 8, runner: [K.CARPET, 0] }) },
      { rx: /fly|loft/, spec: R('loft', [13, 9], K.BOARDS, wall(WT.brick), ['NONE', 'pipes', 'NONE', 'pipes'], ['sandbag', 'winch', 'crate', 'sandbag', 'barrel', 'winch', 'crate'], { dark: 0.28, density: 10 }) },
      { rx: /dressing/, spec: R('dressing', [12, 8], K.WOOD, wall(WT.paper, 2), ['vanity', 'vanity', 'mirror', 'vanity'], ['chair', 'wardrobe', 'sofa:r3', 'trunk:r3', 'chair', 'plant'], { density: 8, runner: [K.RUG, 3] }) },
      { rx: /wardrobe|costume/, spec: R('wardrobe', [12, 8], K.WOOD, wall(WT.paper, 3), ['wardrobe', 'mirror', 'costume_rack:r3', 'wardrobe'], ['costume_rack:r3', 'sewing', 'mannequin', 'costume_rack:r3', 'trunk:r3', 'mannequin', 'mannequin'], { density: 11 }) },
    ],
  }),
};

// -------------------------------------------------------------------------------------------------
// resolving

const ERA_RX: [EnvId, RegExp][] = [
  ['station', /polar|research (?:station|base)|ice station|antarctic|arctic|midwinter/i],
  ['riverboat', /paddle|riverboat|river boat|mississippi|steamboat|steamer/i],
  ['liner', /ocean liner|transatlantic|cruise|\bliner\b|\bs\.?s\.? |\brms\b|\bmv\b/i],
  ['train', /express|railway|railroad|\btrain\b|orient|sleeper/i],
  ['fete', /\bfete\b|village show|flower fair|summer show|village fair/i],
  ['gallery', /gallery|museum|art gala|vernissage/i],
  ['lodge', /ski lodge|alpine|chalet|\blodge\b|snowed in/i],
  ['studio', /hollywood|movie studio|film studio|soundstage|backlot|pictures|studios/i],
  ['restaurant', /restaurant|fine.dining|bistro|brasserie|\bdiner\b|trattoria/i],
  ['club', /jazz|nightclub|night club|speakeasy|prohibition|\bclub\b/i],
  ['theatre', /opera|theatre|theater|playhouse|music hall/i],
  ['manor', /manor|country house|\babbey\b|mansion|stately|estate|\bhall\b/i],
];

/** Which environment does this case belong to? Setting text first, then the rooms it names. */
export function envOf(c: Case): EnvId {
  const head = `${c.setting.name} ${c.setting.era}`;
  for (const [id, rx] of ERA_RX) if (rx.test(head)) return id;
  const body = `${c.setting.description} ${c.title}`;
  for (const [id, rx] of ERA_RX) if (rx.test(body)) return id;
  // hand-built: score by how many of its places look like a known environment's rooms
  const places = [c.victim.placeOfDeath, ...c.characters.map((x) => x.alibiPlace)].map((p) => normPlace(p)).filter(Boolean);
  let best: EnvId = 'generic';
  let bestN = 1;
  for (const id of Object.keys(ENVS) as EnvId[]) {
    if (id === 'generic') continue;
    const n = places.filter((p) => ENVS[id].rooms.some((r) => r.rx.test(p))).length;
    if (n > bestN) {
      best = id;
      bestN = n;
    }
  }
  return best;
}

/** The room spec for a place name in an environment; falls back to keyword themes, then a plain house room. */
export function specFor(envId: EnvId, placeKey: string): RoomSpec {
  const e = ENVS[envId];
  for (const r of e.rooms) if (r.rx.test(placeKey)) return r.spec;
  if (envId !== 'generic') for (const r of GENERIC) if (r.rx.test(placeKey)) return retint(r.spec, envId);
  return envId === 'generic' ? GENERIC_FALLBACK : retint(e.fallback, envId);
}

/** Generic rooms in a themed setting still wear the setting's walls. */
function retint(spec: RoomSpec, envId: EnvId): RoomSpec {
  const home = ENVS[envId].rooms[0]?.spec;
  if (!home || spec.outdoor) return spec;
  return { ...spec, wt: home.wt, floor: spec.floor === K.WOOD ? home.floor : spec.floor };
}
