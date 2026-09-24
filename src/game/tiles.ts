/** Tile kinds. A map cell is `kind | (variant << 8)`. Props are one kind (PROP) whose variant is the prop id. */

const NAMES = [
  'NONE',
  // ground layer
  'GRASS', 'FLOWERS', 'PATH', 'COBBLE', 'WOOD', 'CHECKER', 'STONE', 'RUG', 'MAT',
  'DECK', 'WATER', 'SNOW', 'SNOWPATH', 'ICE', 'METAL', 'MARBLE', 'ASPHALT', 'WET', 'PLATFORM', 'BALLAST',
  'STAGE', 'CARPET', 'TILE', 'DIRT', 'LAWN', 'DARK', 'BOARDS',
  // structure (solid unless listed as walkable below)
  'ROOF_TOP', 'ROOF_BOT', 'WALL_B', 'WINDOW_B', 'DOOR_B', 'WALL', 'WALL_FACE', 'WINDOW_W', 'PROP', 'SKY', 'BLOCK',
  // walkable overlays
  'DECOR',
] as const;

export type KName = (typeof NAMES)[number];
export const K = Object.fromEntries(NAMES.map((n, i) => [n, i])) as { readonly [k in KName]: number };
export const KIND_NAMES: readonly string[] = NAMES;

export const cell = (kind: number, variant = 0): number => kind | (variant << 8);
export const kindOf = (c: number): number => c & 0xff;
export const variantOf = (c: number): number => c >> 8;

/** Kinds you can stand on when they sit in the object layer. */
const WALKABLE = new Set<number>([K.NONE, K.DOOR_B, K.MAT, K.DECOR]);
export const isSolidKind = (kind: number): boolean => !WALKABLE.has(kind);

/** Kinds that animate: [frames, ticks per frame]. Props declare their own in the prop registry. */
export const ANIM: Record<number, [number, number]> = {
  [K.WATER]: [4, 22],
  [K.SKY]: [4, 30],
  [K.WINDOW_W]: [4, 12],
};

/** A building's look is chosen per building: variant = style << 4 | colour. */
export const STYLES = ['plaster', 'brick', 'stone', 'log', 'module', 'tent', 'hangar', 'facade', 'car', 'cabin', 'glass', 'timber', 'deco', 'loco', 'shed'] as const;
export type BStyle = (typeof STYLES)[number];
export const styleVar = (s: BStyle, colour = 0): number => (STYLES.indexOf(s) << 4) | (colour & 15);
export const styleOf = (v: number): BStyle => STYLES[(v >> 4) % STYLES.length] as BStyle;
export const colourOf = (v: number): number => v & 15;

/** Fallback look-at lines for structure tiles (props carry their own). */
export const FLAVOR: Record<number, string[]> = {
  [K.WALL_B]: ['A solid wall.'],
  [K.WINDOW_B]: ['The curtains are drawn.', 'You cup your hands and peer in. Nobody waves back.'],
  [K.WALL]: ['A solid wall.'],
  [K.WALL_FACE]: ['A solid wall. You knock politely. It says nothing.'],
  [K.WINDOW_W]: ['You peer outside. Nothing but darkness and reflections.'],
  [K.ROOF_TOP]: ['Best not to climb on that.'],
  [K.ROOF_BOT]: ['Best not to climb on that.'],
};
