/** Map rendering shared by the overworld, the gallery and the epilogue: tiles, lighting pools, weather and ambient particles. */
import { drawTile, propMeta } from './art/index';
import type { EnvId } from './art/index';
import { K, kindOf } from './tiles';
import { TILE } from './types';
import type { Ambient, Light, MapDef } from './types';
import type { Tone } from '../../shared/models';

type Ctx = CanvasRenderingContext2D;

export interface View {
  cx: number;
  cy: number;
  w: number;
  h: number;
}

/** Draw ground, then each object row through `row(ty)` so characters sort correctly against tall scenery. */
export function drawMapTiles(ctx: Ctx, map: MapDef, v: View, tick: number, row?: (ty: number) => void): void {
  const x0 = Math.max(0, Math.floor(v.cx / TILE));
  const x1 = Math.min(map.w - 1, Math.ceil((v.cx + v.w) / TILE));
  const y0 = Math.max(0, Math.floor(v.cy / TILE));
  const y1 = Math.min(map.h - 1, Math.ceil((v.cy + v.h) / TILE));
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) drawTile(ctx, map.ground[ty * map.w + tx] as number, tx * TILE - v.cx, ty * TILE - v.cy, tick, map.env, map.wt);
  for (let ty = y0; ty <= y1 + 1; ty++) {
    if (ty <= y1) for (let tx = x0; tx <= x1; tx++) drawTile(ctx, map.over[ty * map.w + tx] as number, tx * TILE - v.cx, ty * TILE - v.cy, tick, map.env, map.wt);
    row?.(ty);
  }
}

// ---------------------------------------------------------------------------------------------------
// lighting

const AMBIENT: Record<EnvId, [number, number, number]> = {
  generic: [16, 20, 44],
  fete: [30, 30, 60],
  gallery: [18, 20, 40],
  station: [8, 22, 54],
  riverboat: [28, 22, 52],
  manor: [16, 22, 52],
  liner: [12, 26, 60],
  lodge: [18, 24, 58],
  studio: [42, 24, 60],
  restaurant: [30, 16, 24],
  train: [20, 24, 56],
  club: [30, 14, 44],
  theatre: [34, 14, 22],
};

const stamps = new Map<string, HTMLCanvasElement>();
/** A pixel-banded radial pool of light: `bands` concentric steps so it reads as pixel art rather than a smooth gradient. */
function stamp(r: number, color: string, bands = 5): HTMLCanvasElement {
  const key = `${r}|${color}|${bands}`;
  let cv = stamps.get(key);
  if (cv) return cv;
  cv = document.createElement('canvas');
  cv.width = cv.height = r * 2;
  const c = cv.getContext('2d') as Ctx;
  const img = c.createImageData(r * 2, r * 2);
  const m = /#(..)(..)(..)/.exec(color);
  const [cr, cg, cb] = m ? [parseInt(m[1] as string, 16), parseInt(m[2] as string, 16), parseInt(m[3] as string, 16)] : [255, 230, 160];
  for (let y = 0; y < r * 2; y++)
    for (let x = 0; x < r * 2; x++) {
      const d = Math.hypot(x - r + 0.5, y - r + 0.5) / r;
      if (d >= 1) continue;
      // ordered dither between bands
      const t = (1 - d) ** 1.5;
      const dith = (((x & 1) + (y & 1) * 2) / 4 - 0.375) / bands;
      const q = Math.max(0, Math.min(1, Math.round((t + dith) * bands) / bands));
      const i = (y * r * 2 + x) * 4;
      img.data[i] = cr;
      img.data[i + 1] = cg;
      img.data[i + 2] = cb;
      img.data[i + 3] = Math.round(q * 255);
    }
  c.putImageData(img, 0, 0);
  stamps.set(key, cv);
  return cv;
}

let lightLayer: HTMLCanvasElement | null = null;

export interface LightSource {
  x: number;
  y: number;
  r: number;
  color: string;
  flicker: number;
  strength: number;
}

/** All lights visible in the view: map lights, glowing props, warm windows, and the detective's own lantern. */
export function collectLights(map: MapDef, v: View, tick: number, lantern?: { x: number; y: number } | null): LightSource[] {
  const out: LightSource[] = [];
  const push = (l: Light, strength = 1) => out.push({ x: l.x * TILE + 8 - v.cx, y: l.y * TILE + 8 - v.cy, r: l.r, color: l.color, flicker: l.flicker ?? 0, strength });
  for (const l of map.lights) push(l);
  const x0 = Math.max(0, Math.floor(v.cx / TILE) - 4);
  const x1 = Math.min(map.w - 1, Math.ceil((v.cx + v.w) / TILE) + 4);
  const y0 = Math.max(0, Math.floor(v.cy / TILE) - 4);
  const y1 = Math.min(map.h - 1, Math.ceil((v.cy + v.h) / TILE) + 4);
  for (let ty = y0; ty <= y1; ty++)
    for (let tx = x0; tx <= x1; tx++) {
      const cv = map.over[ty * map.w + tx] as number;
      if (!cv) continue;
      const k = kindOf(cv);
      if (k === K.PROP || k === K.DECOR) {
        const meta = propMeta(cv);
        if (meta?.light) push({ x: tx, y: ty, r: meta.light.r, color: meta.light.color, flicker: meta.light.flicker }, 1);
      } else if (k === K.WINDOW_B && map.dark > 0.25) push({ x: tx, y: ty + 1, r: 26, color: '#ffc46a', flicker: 0.04 }, 0.7);
      else if (k === K.WINDOW_W && map.dark > 0.25) push({ x: tx, y: ty + 1, r: 26, color: map.env === 'station' || map.env === 'lodge' ? '#9ad0ff' : '#ffd08a', flicker: 0.02 }, 0.6);
    }
  if (lantern) out.push({ x: lantern.x - v.cx, y: lantern.y - v.cy, r: 46 + Math.round(map.dark * 20), color: '#ffdca0', flicker: 0.05, strength: 0.85 });
  void tick;
  return out;
}

/** Darken the scene and cut pools of light out of the dark. `dark` is 0..1. */
export function drawLighting(ctx: Ctx, map: MapDef, v: View, tick: number, dark: number, tone: Tone, lights: LightSource[]): void {
  const glow = lights.length > 0;
  const d = Math.min(0.9, Math.max(0, dark) * (tone === 'noir' ? 1.15 : tone === 'comedic' ? 0.8 : 1));
  if (d < 0.03 && !glow) return;
  if (!lightLayer) lightLayer = document.createElement('canvas');
  if (lightLayer.width !== v.w || lightLayer.height !== v.h) {
    lightLayer.width = v.w;
    lightLayer.height = v.h;
  }
  const L = lightLayer.getContext('2d') as Ctx;
  L.globalCompositeOperation = 'source-over';
  L.clearRect(0, 0, v.w, v.h);
  const [ar, ag, ab] = AMBIENT[map.env];
  if (d >= 0.03) {
    L.fillStyle = `rgba(${ar},${ag},${ab},${d})`;
    L.fillRect(0, 0, v.w, v.h);
    L.globalCompositeOperation = 'destination-out';
    for (const l of lights) {
      const fl = l.flicker ? 1 - l.flicker * (0.5 + 0.5 * Math.sin(tick * 0.35 + l.x * 0.9 + l.y)) : 1;
      const r = Math.max(6, Math.round(l.r * (0.92 + 0.08 * fl)));
      L.globalAlpha = Math.min(1, l.strength * fl * 0.95);
      L.drawImage(stamp(r, '#ffffff'), Math.round(l.x - r), Math.round(l.y - r));
    }
    L.globalAlpha = 1;
    ctx.drawImage(lightLayer, 0, 0);
  }
  if (glow) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const l of lights) {
      const fl = l.flicker ? 1 - l.flicker * (0.5 + 0.5 * Math.sin(tick * 0.35 + l.x * 0.9 + l.y)) : 1;
      const r = Math.max(6, Math.round(l.r * 0.85));
      ctx.globalAlpha = Math.min(0.3, d * 0.42 * l.strength * fl);
      ctx.drawImage(stamp(r, l.color, 4), Math.round(l.x - r), Math.round(l.y - r));
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------------------------------
// ambient particles: deterministic in `tick`, so no state to keep

const hash = (i: number, s: number): number => {
  let h = (i * 374761393 + s * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

export function drawAmbient(ctx: Ctx, kind: Ambient, v: View, tick: number, outdoor: boolean): void {
  const W = v.w;
  const H = v.h;
  const dot = (x: number, y: number, w: number, h: number, col: string) => {
    ctx.fillStyle = col;
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
  };
  switch (kind) {
    case 'snow':
    case 'blizzard': {
      const n = kind === 'blizzard' ? 90 : 46;
      const wind = kind === 'blizzard' ? 2.6 : 0.6;
      for (let i = 0; i < n; i++) {
        const sp = 0.5 + hash(i, 1) * 1.1;
        const x = (((hash(i, 2) * W + tick * wind * sp + Math.sin(tick / 40 + i) * 4) % W) + W) % W;
        const y = (hash(i, 3) * H + tick * sp * (kind === 'blizzard' ? 1.4 : 0.9)) % H;
        dot(x, y, kind === 'blizzard' ? 2 : 1 + (i % 3 === 0 ? 1 : 0), kind === 'blizzard' && i % 2 ? 1 : 2 - (i % 2), 'rgba(255,255,255,0.85)');
      }
      if (kind === 'blizzard') {
        const gust = (Math.sin(tick / 90) + 1) / 2;
        ctx.fillStyle = `rgba(230,240,250,${0.05 + gust * 0.12})`;
        ctx.fillRect(0, 0, W, H);
      }
      break;
    }
    case 'rain': {
      for (let i = 0; i < 52; i++) {
        const sp = 3 + hash(i, 4) * 2;
        const x = ((hash(i, 5) * W + tick * 0.9) % W);
        const y = (hash(i, 6) * H + tick * sp) % H;
        dot(x, y, 1, 4, 'rgba(176,196,244,0.55)');
        if (hash(i, 7) > 0.85) dot(x - 1, ((y + 5) % H), 3, 1, 'rgba(200,214,255,0.4)');
      }
      break;
    }
    case 'spray': {
      for (let i = 0; i < 26; i++) {
        const x = (hash(i, 8) * W + tick * (1 + hash(i, 9))) % W;
        const y = (hash(i, 10) * H + Math.sin(tick / 12 + i) * 3 + H) % H;
        dot(x, y, 1, 1, 'rgba(240,250,255,0.6)');
      }
      break;
    }
    case 'petals': {
      for (let i = 0; i < 16; i++) {
        const x = (hash(i, 11) * W + tick * 0.5 + Math.sin(tick / 30 + i) * 10 + W) % W;
        const y = (hash(i, 12) * H + tick * 0.35) % H;
        dot(x, y, 2, 1, i % 3 ? 'rgba(255,214,230,0.9)' : 'rgba(255,244,190,0.9)');
      }
      break;
    }
    case 'fireflies': {
      for (let i = 0; i < 14; i++) {
        const x = hash(i, 13) * W + Math.sin(tick / 50 + i * 2) * 14;
        const y = hash(i, 14) * H + Math.cos(tick / 44 + i * 3) * 10;
        const on = (Math.sin(tick / 22 + i * 5) + 1) / 2;
        if (on > 0.35) {
          dot(x, y, 1, 1, `rgba(255,244,140,${0.4 + on * 0.6})`);
          if (on > 0.8) dot(x - 1, y, 3, 1, 'rgba(255,244,140,0.35)');
        }
      }
      break;
    }
    case 'embers':
    case 'sparks': {
      for (let i = 0; i < (kind === 'sparks' ? 18 : 22); i++) {
        const sp = 0.3 + hash(i, 15) * 0.7;
        const y = H - ((hash(i, 16) * H + tick * sp * 1.1) % H);
        const x = (hash(i, 17) * W + Math.sin(tick / 20 + i) * 6 + W) % W;
        dot(x, y, 1, 1, hash(i, 18) > 0.5 ? 'rgba(255,170,70,0.9)' : 'rgba(255,220,130,0.85)');
      }
      break;
    }
    case 'dust': {
      for (let i = 0; i < 26; i++) {
        const x = (hash(i, 19) * W + tick * 0.12 + Math.sin(tick / 60 + i) * 5 + W) % W;
        const y = (hash(i, 20) * H + Math.cos(tick / 70 + i * 2) * 5 + H) % H;
        dot(x, y, 1, 1, `rgba(255,240,200,${0.18 + hash(i, 21) * 0.3})`);
      }
      break;
    }
    case 'steam':
    case 'smoke':
    case 'fog': {
      const n = kind === 'fog' ? 6 : 8;
      for (let i = 0; i < n; i++) {
        const x = (hash(i, 22) * W + tick * (kind === 'fog' ? 0.25 : 0.1)) % W;
        const y = kind === 'fog' ? hash(i, 23) * H : H - ((hash(i, 23) * H + tick * 0.35) % H);
        const a = kind === 'fog' ? 0.09 : 0.12;
        ctx.fillStyle = kind === 'smoke' ? `rgba(200,200,214,${a})` : `rgba(236,240,250,${a})`;
        ctx.fillRect(Math.round(x), Math.round(y), 30 + (i % 3) * 10, 8 + (i % 2) * 4);
        ctx.fillRect(Math.round(x + 6), Math.round(y - 3), 18, 4);
      }
      break;
    }
    case 'drip': {
      for (let i = 0; i < 3; i++) {
        const t = (tick + i * 47) % 130;
        const x = 30 + hash(i, 24) * (W - 60);
        if (t < 26) dot(x, hash(i, 25) * 40 + t * 1.6, 1, 2, 'rgba(180,210,240,0.8)');
        else if (t < 32) dot(x - 1, hash(i, 25) * 40 + 40, 3, 1, 'rgba(180,210,240,0.5)');
      }
      break;
    }
    default:
  }
  void outdoor;
}

// ---------------------------------------------------------------------------------------------------
// a whole map on one canvas (gallery, epilogue thumbnails)

import { drawBody, drawChar, drawItem } from './sprites';
import type { World } from './types';

export function renderSnapshot(canvas: HTMLCanvasElement, map: MapDef, world: World | null, o: { tick?: number; tone?: Tone; dark?: number; scale?: number } = {}): void {
  const tick = o.tick ?? 0;
  const W = map.w * TILE;
  const H = map.h * TILE;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { alpha: false }) as Ctx;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(0, 0, W, H);
  const v: View = { cx: 0, cy: 0, w: W, h: H };
  drawMapTiles(ctx, map, v, tick, (ty) => {
    for (const it of map.items) if (it.y === ty && world) drawItem(ctx, it.x * TILE, it.y * TILE, world.icons[it.evidenceId] ?? { id: 'gen-paper:0', verbal: false }, tick);
    for (const n of map.npcs) {
      if (n.y !== ty) continue;
      if (n.kind === 'body') drawBody(ctx, n.x * TILE, n.y * TILE, n.look);
      else drawChar(ctx, n.x * TILE, n.y * TILE, n.look, n.dir, 0);
    }
    for (const e of map.extras) if (e.y === ty) drawChar(ctx, e.x * TILE, e.y * TILE, e.look, 'down', 0);
  });
  const dark = o.dark ?? map.dark;
  drawLighting(ctx, map, v, tick, dark, o.tone ?? 'serious', collectLights(map, v, tick, null));
  drawAmbient(ctx, map.ambient, v, tick, map.outdoor);
}
