/** Tile painting entry point: picks the painter for a map cell, caches the result per (skin, cell, frame). */
import { ANIM, K, kindOf, variantOf } from '../tiles';
import { GROUND } from './ground';
import { BUILDING } from './buildings';
import { INTERIOR } from './interior';
import { PROPS, propOf, subOf } from './registry';
import type { PropDef } from './registry';
import { SKINS } from './skins';
import type { EnvId, Skin } from './skins';
import './props-common';
import './props-marine';
import './props-cold';
import './props-show';
import './props-misc';

export { PROPS, propId, propCell, propOf, hasProp } from './registry';
export { SKINS } from './skins';
export type { EnvId, Skin } from './skins';
export { WT } from './interior';

const cache = new Map<string, HTMLCanvasElement>();

/** Frame count and period of an animated cell, or null. */
export function animOf(cellValue: number): [number, number] | null {
  const kind = kindOf(cellValue);
  if (kind === K.PROP || kind === K.DECOR) return propOf(variantOf(cellValue))?.meta.anim ?? null;
  return ANIM[kind] ?? null;
}

export function propMeta(cellValue: number): PropDef['meta'] | null {
  const kind = kindOf(cellValue);
  return kind === K.PROP || kind === K.DECOR ? propOf(variantOf(cellValue))?.meta ?? null : null;
}

function paint(c: CanvasRenderingContext2D, cellValue: number, frame: number, S: Skin, wt: number): void {
  const kind = kindOf(cellValue);
  const v = variantOf(cellValue);
  if (kind === K.PROP || kind === K.DECOR) {
    const p = propOf(v);
    if (!p) return;
    if (p.meta.wall) INTERIOR[K.WALL_FACE]!(c, wt, 0, S);
    p.paint(c, S, frame, subOf(v));
    return;
  }
  const fn = GROUND[kind] ?? BUILDING[kind] ?? INTERIOR[kind];
  fn?.(c, v, frame, S);
}

/** Draw the cell at pixel (x, y). `tick` drives animation; `wt` is the wall type of the room (for wall-mounted props). */
export function drawTile(ctx: CanvasRenderingContext2D, cellValue: number, x: number, y: number, tick: number, env: EnvId, wt = 0): void {
  if (!cellValue) return;
  const a = animOf(cellValue);
  const frame = a ? Math.floor(tick / a[1]) % a[0] : 0;
  const key = `${env}|${cellValue}|${wt}|${frame}`;
  let cv = cache.get(key);
  if (!cv) {
    cv = document.createElement('canvas');
    cv.width = 16;
    cv.height = 16;
    paint(cv.getContext('2d') as CanvasRenderingContext2D, cellValue, frame, SKINS[env], wt);
    cache.set(key, cv);
  }
  ctx.drawImage(cv, x, y);
}

/** Every prop id, for the gallery. */
export const ALL_PROPS = PROPS;
