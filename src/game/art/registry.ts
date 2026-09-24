/** Registry of props: every furniture piece, plant, vehicle and gadget is a PROP tile whose variant is its id. */
import { K, cell } from '../tiles';
import type { Ctx } from './draw';
import type { Skin } from './skins';

/** frame counter `f`, prop variant `v` is stripped: props are painted per (id, sub-variant). */
export type PropPaint = (c: Ctx, S: Skin, f: number, v: number) => void;

export interface PropMeta {
  /** Look-at lines (falls back to a shrug). */
  flavor?: string[];
  /** Animation: [frames, ticks per frame]. */
  anim?: [number, number];
  /** Emits light: radius in px, colour, flicker 0..1. */
  light?: { r: number; color: string; flicker?: number };
  /** Draw the room's wall face behind (for things hung on a wall). */
  wall?: boolean;
  /** Walk-through (drawn over the floor). */
  walk?: boolean;
  /** Sound effect key played when examined. */
  sfx?: string;
}

export interface PropDef {
  id: number;
  name: string;
  paint: PropPaint;
  meta: PropMeta;
}

export const PROPS: PropDef[] = [];
const byName = new Map<string, number>();

export function def(name: string, paint: PropPaint, meta: PropMeta = {}): void {
  if (byName.has(name)) throw new Error(`prop ${name} defined twice`);
  byName.set(name, PROPS.length);
  PROPS.push({ id: PROPS.length, name, paint, meta });
}

export function propId(name: string): number {
  const id = byName.get(name);
  if (id === undefined) throw new Error(`unknown prop ${name}`);
  return id;
}
export const hasProp = (name: string): boolean => byName.has(name);
export function propCell(name: string, sub = 0): number {
  const id = propId(name);
  const walk = (PROPS[id] as PropDef).meta.walk;
  return cell(walk ? K.DECOR : K.PROP, id | (sub << 10));
}
/** PROP variant layout: low 10 bits = prop id, above = sub-variant. */
export const propOf = (variant: number): PropDef | undefined => PROPS[variant & 1023];
export const subOf = (variant: number): number => variant >> 10;
