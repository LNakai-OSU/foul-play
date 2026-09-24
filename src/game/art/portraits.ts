/**
 * Dedicated character portraits (72x92 native pixels, drawn on the same pixel grid as the UI: no scaled sprites). Every face
 * is built from the character's Look plus a few traits derived from it (nose, brows, moustache, ears, age lines), so no two
 * people share a silhouette even when they share a hat. Three moods: calm, rattled (wide eyes, raised brows, sweat) and cracked
 * (squint, tears, grimace, pale, hair coming loose).
 */
import type { Look } from '../types';

type Ctx = CanvasRenderingContext2D;
export type Mood = 'calm' | 'rattled' | 'cracked';

export const PORTRAIT_W = 72;
export const PORTRAIT_H = 92;

const OUT = '#1c1a26';

function hex(c: string): [number, number, number] {
  const m = /#(..)(..)(..)/.exec(c);
  return m ? [parseInt(m[1] as string, 16), parseInt(m[2] as string, 16), parseInt(m[3] as string, 16)] : [128, 128, 128];
}
/** Lighten (f>0) or darken (f<0) a #rrggbb colour. */
export function shade(c: string, f: number): string {
  const [r, g, b] = hex(c);
  const t = f < 0 ? 0 : 255;
  const k = Math.abs(f);
  const h = (v: number) => Math.round(v + (t - v) * k).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}
function mix(a: string, b: string, k: number): string {
  const [r1, g1, b1] = hex(a);
  const [r2, g2, b2] = hex(b);
  const h = (x: number, y: number) => Math.round(x + (y - x) * k).toString(16).padStart(2, '0');
  return `#${h(r1, r2)}${h(g1, g2)}${h(b1, b2)}`;
}

function traits(look: Look): { nose: number; brow: number; stache: number; ears: number; age: number; jaw: number } {
  let h = 2166136261;
  for (const ch of `${look.skin}${look.hair}${look.outfit}${look.hat}${look.hairStyle}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  h >>>= 0;
  return { nose: h % 3, brow: (h >> 3) % 3, stache: (h >> 6) % 7 === 0 ? 1 : (h >> 6) % 11 === 1 ? 2 : 0, ears: (h >> 9) % 2, age: (h >> 11) % 3, jaw: (h >> 14) % 3 };
}

const rect = (c: Ctx, x: number, y: number, w: number, h: number, col: string) => {
  c.fillStyle = col;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};

/** A filled ellipse from scanlines, with an optional darker right-hand shadow band. */
function blob(c: Ctx, cx: number, cy: number, rx: number, ry: number, col: string, shadow?: string, outline?: string): void {
  for (let y = -ry; y <= ry; y++) {
    const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry + 0.01))));
    if (outline) rect(c, cx - half - 1, cy + y, half * 2 + 2, 1, outline);
  }
  if (outline) {
    rect(c, cx - Math.round(rx * 0.35), cy - ry - 1, Math.round(rx * 0.7), 1, outline);
    rect(c, cx - Math.round(rx * 0.35), cy + ry + 1, Math.round(rx * 0.7), 1, outline);
  }
  for (let y = -ry; y <= ry; y++) {
    const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry + 0.01))));
    rect(c, cx - half, cy + y, half * 2, 1, col);
    if (shadow) {
      const s = Math.round(half * 0.45);
      rect(c, cx + half - s, cy + y, s, 1, shadow);
    }
  }
}

export function drawPortrait(ctx: Ctx, x0: number, y0: number, look: Look, mood: Mood = 'calm', t = 0, flash = 0): void {
  const tr = traits(look);
  ctx.save();
  ctx.translate(Math.round(x0), Math.round(y0));
  if (flash) {
    // a hard white burst behind the head when an OBJECTION lands
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let k = 0; k < 8; k++) ctx.fillRect(36 - 30 + k * 3, 4 + k * 4, 60 - k * 6, 3);
  }
  const breathe = Math.round(Math.sin(t / 30) * 0.8 + 0.4);
  const skin = mood === 'cracked' ? mix(look.skin, '#cfd8e8', 0.28) : mood === 'rattled' ? mix(look.skin, '#f2b0a0', 0.18) : look.skin;
  const skinD = shade(skin, -0.16);
  const skinL = shade(skin, 0.12);
  const hair = look.hair;
  const hairD = shade(hair, -0.28);
  const hairL = shade(hair, 0.22);
  const out = OUT;

  // ---- long hair behind everything
  if (look.hairStyle === 2) {
    rect(ctx, 16, 26, 40, 46, out);
    rect(ctx, 17, 27, 38, 44, hair);
    rect(ctx, 46, 30, 9, 40, hairD);
  }

  // ---- torso and clothes
  const top = 60 + breathe;
  for (let y = top; y < PORTRAIT_H; y++) {
    const half = Math.min(35, 17 + Math.round((y - top) * 0.95));
    rect(ctx, 36 - half - 1, y, half * 2 + 2, 1, out);
  }
  for (let y = top + 1; y < PORTRAIT_H; y++) {
    const half = Math.min(34, 16 + Math.round((y - top) * 0.95));
    rect(ctx, 36 - half, y, half * 2, 1, look.outfit);
    rect(ctx, 36 + Math.round(half * 0.5), y, Math.round(half * 0.5), 1, shade(look.outfit, -0.16));
    rect(ctx, 36 - half, y, 2, 1, shade(look.outfit, 0.14));
  }
  // neck
  rect(ctx, 29, 50, 14, 14 + breathe, out);
  rect(ctx, 30, 50, 12, 14 + breathe, skinD);
  rect(ctx, 30, 50, 12, 5, shade(skinD, -0.18));
  const shirt = look.trim;
  const uni = look.hat === 'police' ? '#2c4c8c' : look.hat === 'chef' ? '#f4f4f0' : null;
  if (uni) {
    rect(ctx, 6, top + 2, 60, 30, uni);
    rect(ctx, 36 + 12, top + 2, 18, 30, shade(uni, -0.15));
  }
  // collar and front
  const fc = uni ?? look.outfit;
  if (look.hat === 'chef') {
    for (let k = 0; k < 3; k++) rect(ctx, 33 + k * 0, top + 8 + k * 9, 6, 3, '#c8c8d0');
    rect(ctx, 35, top + 2, 2, 28, '#d8d8e0');
  } else if (look.hat === 'police') {
    rect(ctx, 33, top + 2, 6, 26, '#1c3468');
    for (let k = 0; k < 3; k++) rect(ctx, 34, top + 6 + k * 8, 4, 3, '#f0d060');
    rect(ctx, 46, top + 6, 8, 9, '#f0d060');
    rect(ctx, 48, top + 8, 4, 5, '#a08020');
  } else {
    // shirt V with a tie or scarf
    for (let y = 0; y < 16; y++) rect(ctx, 36 - 8 + Math.round(y * 0.45), top + y, 16 - Math.round(y * 0.9), 1, shirt);
    if (look.coat || look.hat === 'tophat' || look.hat === 'fedora') {
      rect(ctx, 34, top + 2, 4, 3, look.hat === 'tophat' ? '#c03030' : '#a02830');
      for (let y = 5; y < 22; y++) rect(ctx, 34 + (y < 8 ? 0 : 1), top + y, 4 - (y < 8 ? 0 : 1) * 2 + (y < 8 ? 0 : 0), 1, look.hat === 'tophat' ? '#c03030' : '#a02830');
    } else if (look.hat === 'bow') {
      rect(ctx, 12, top + 4, 48, 26, '#f4f4f0');
      rect(ctx, 30, top + 4, 12, 3, '#e0688a');
    } else if (look.hat === 'beret') {
      rect(ctx, 20, top + 4, 32, 6, '#b0303c');
    }
    // lapels
    rect(ctx, 20, top + 1, 8, 20, shade(fc, 0.1));
    rect(ctx, 44, top + 1, 8, 20, shade(fc, -0.1));
  }
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(29, 55 + breathe, 14, 6);

  // ---- ears
  const eh = tr.ears ? 5 : 4;
  blob(ctx, 20, 36, 2, eh, skin, undefined, out);
  blob(ctx, 52, 36, 2, eh, skinD, undefined, out);
  rect(ctx, 20, 35, 1, 3, skinD);

  // ---- head
  const rx = 15 + (tr.jaw === 2 ? 1 : 0);
  blob(ctx, 36, 33, rx, 19, skin, skinD, out);
  // jaw and chin shading
  rect(ctx, 36 - 8, 49, 16, 1, skinD);
  if (tr.age >= 1) {
    rect(ctx, 26, 39, 3, 1, skinD);
    rect(ctx, 43, 39, 3, 1, skinD);
  }
  if (tr.age === 2) {
    rect(ctx, 30, 26, 12, 1, skinD);
    rect(ctx, 28, 44, 2, 3, skinD);
  }
  // cheeks
  if (mood !== 'cracked') {
    rect(ctx, 26, 42, 4, 2, mix(skin, '#e07070', mood === 'rattled' ? 0.5 : 0.25));
    rect(ctx, 42, 42, 4, 2, mix(skin, '#e07070', mood === 'rattled' ? 0.5 : 0.25));
  }

  // ---- hair
  const loose = mood === 'cracked';
  if (look.hairStyle !== 2) {
    const fringe = look.hairStyle === 1 ? 9 : 6;
    for (let y = 14; y <= 26; y++) {
      const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - ((y - 33) * (y - 33)) / (19 * 19 + 0.01))));
      rect(ctx, 36 - half - 1, y, half * 2 + 2, 1, out);
    }
    for (let y = 15; y <= 26; y++) {
      const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - ((y - 33) * (y - 33)) / (19 * 19 + 0.01))));
      const cut = y > 22 ? Math.min(half, fringe + (y - 22) * 2) : half;
      rect(ctx, 36 - half, y, half * 2, 1, hair);
      if (y > 22) {
        // forehead shows between the temples
        rect(ctx, 36 - cut + (look.hairStyle === 1 ? 6 : 0), y, cut * 2 - (look.hairStyle === 1 ? 6 : 0), 1, skin);
      }
    }
    rect(ctx, 24, 17, 16, 2, hairL);
    rect(ctx, 44, 20, 8, 5, hairD);
    // temples
    rect(ctx, 21, 23, 3, 9, hair);
    rect(ctx, 48, 23, 3, 9, hairD);
    if (look.hairStyle === 1) rect(ctx, 28, 21, 15, 3, hair);
  } else {
    for (let y = 14; y <= 26; y++) {
      const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - ((y - 33) * (y - 33)) / (19 * 19 + 0.01))));
      rect(ctx, 36 - half - 1, y, half * 2 + 2, 1, out);
      rect(ctx, 36 - half, y, half * 2, 1, hair);
    }
    rect(ctx, 20, 26, 32, 4, hair);
    rect(ctx, 26, 28, 9, 3, skin);
    rect(ctx, 38, 28, 8, 3, skin);
    rect(ctx, 24, 17, 16, 2, hairL);
    rect(ctx, 44, 20, 8, 6, hairD);
  }
  if (loose) {
    rect(ctx, 30, 11, 1, 5, hair);
    rect(ctx, 41, 12, 2, 4, hair);
    rect(ctx, 47, 15, 1, 3, hairL);
  }

  // ---- eyes and brows
  const blink = t % 170 < 6 && mood !== 'rattled';
  const ey = 35;
  for (const ex of [29, 42]) {
    if (mood === 'cracked') {
      rect(ctx, ex, ey + 1, 6, 1, out);
      rect(ctx, ex + 1, ey + 2, 4, 1, out);
      rect(ctx, ex + 2, ey + 3, 1, 4 + Math.round(Math.sin(t / 5 + ex) * 1 + 1), '#7ab8f0');
    } else if (blink) rect(ctx, ex, ey + 2, 6, 1, out);
    else {
      const big = mood === 'rattled';
      rect(ctx, ex, ey - (big ? 1 : 0), 6, big ? 6 : 4, out);
      rect(ctx, ex + 1, ey + 0 - (big ? 1 : 0), 4, big ? 4 : 2, '#f4f4f8');
      rect(ctx, ex + 2 + (big ? Math.round(Math.sin(t / 9)) : 0), ey + (big ? 0 : 0), 2, big ? 3 : 2, shade(look.hair, -0.1) === OUT ? '#2c2c3c' : '#3a2a20');
      rect(ctx, ex + 2, ey, 1, 1, '#ffffff');
    }
  }
  // brows
  const bc = shade(hair, -0.12);
  const bw = tr.brow === 2 ? 3 : 2;
  if (mood === 'calm') {
    rect(ctx, 28, 31, 7, bw, bc);
    rect(ctx, 41, 31, 7, bw, bc);
  } else if (mood === 'rattled') {
    rect(ctx, 28, 29, 4, 2, bc);
    rect(ctx, 32, 28, 3, 2, bc);
    rect(ctx, 41, 28, 3, 2, bc);
    rect(ctx, 44, 29, 4, 2, bc);
  } else {
    rect(ctx, 28, 30, 4, 2, bc);
    rect(ctx, 32, 32, 3, 2, bc);
    rect(ctx, 41, 32, 3, 2, bc);
    rect(ctx, 44, 30, 4, 2, bc);
  }
  // nose
  const nl = 4 + tr.nose;
  rect(ctx, 35, 36, 2, nl, skinD);
  rect(ctx, 33 + (tr.nose === 2 ? -1 : 0), 36 + nl - 1, 6 + (tr.nose === 2 ? 2 : 0), 2, skinD);
  rect(ctx, 36, 37, 1, nl - 2, skinL);
  // mouth
  const my = 46;
  if (mood === 'calm') {
    rect(ctx, 31, my, 10, 1, '#8a3a3a');
    rect(ctx, 30, my - 1, 1, 1, '#8a3a3a');
    rect(ctx, 41, my - (tr.age === 2 ? 0 : 1), 1, 1, '#8a3a3a');
  } else if (mood === 'rattled') {
    rect(ctx, 32, my, 8, 3, out);
    rect(ctx, 33, my + 1, 6, 1, '#b04a4a');
    rect(ctx, 30 + ((t >> 3) % 2), my - 1, 1, 1, '#8a3a3a');
  } else {
    rect(ctx, 30, my - 1, 12, 6, out);
    rect(ctx, 31, my, 10, 2, '#f4f4f0');
    rect(ctx, 32, my + 3, 8, 1, '#b04a4a');
  }
  // facial hair
  if (tr.stache === 1) {
    rect(ctx, 28, my - 3, 16, 2, hairD);
    rect(ctx, 27, my - 2, 2, 3, hairD);
    rect(ctx, 43, my - 2, 2, 3, hairD);
  } else if (tr.stache === 2) {
    rect(ctx, 24, my - 3, 24, 2, hairD);
    rect(ctx, 24, my - 1, 4, 12, hairD);
    rect(ctx, 44, my - 1, 4, 12, hairD);
    rect(ctx, 28, my + 7, 16, 5, hairD);
    rect(ctx, 31, my, 10, 2, mood === 'calm' ? '#8a3a3a' : out);
  }
  // glasses
  if (look.glasses) {
    for (const ex of [27, 40]) {
      rect(ctx, ex, 33, 9, 1, '#3a3a4c');
      rect(ctx, ex, 39, 9, 1, '#3a3a4c');
      rect(ctx, ex, 33, 1, 7, '#3a3a4c');
      rect(ctx, ex + 8, 33, 1, 7, '#3a3a4c');
      rect(ctx, ex + 1, 34, 2, 1, 'rgba(255,255,255,0.5)');
    }
    rect(ctx, 36, 35, 4, 1, '#3a3a4c');
  }
  // sweat
  if (mood !== 'calm') {
    const d = (t % 40) / 40;
    rect(ctx, 50, 22 + Math.round(d * 6), 2, 3, '#8ad8ff');
    rect(ctx, 50, 22 + Math.round(d * 6), 1, 1, '#ffffff');
    if (mood === 'cracked') rect(ctx, 20, 26 + Math.round(((t + 20) % 40) / 40 * 6), 2, 3, '#8ad8ff');
  }

  // ---- hats
  const hc = look.hatColor;
  switch (look.hat) {
    case 'fedora':
      rect(ctx, 14, 16, 44, 5, out);
      rect(ctx, 15, 17, 42, 3, hc);
      rect(ctx, 22, 3, 28, 15, out);
      rect(ctx, 23, 4, 26, 13, hc);
      rect(ctx, 23, 12, 26, 3, shade(hc, -0.4));
      rect(ctx, 26, 5, 6, 3, shade(hc, 0.2));
      rect(ctx, 30, 4, 12, 2, shade(hc, -0.2));
      rect(ctx, 14, 20, 44, 2, 'rgba(0,0,0,0.3)');
      break;
    case 'cap':
      rect(ctx, 18, 8, 36, 12, out);
      rect(ctx, 19, 9, 34, 10, hc);
      rect(ctx, 19, 9, 34, 2, shade(hc, 0.2));
      rect(ctx, 14, 19, 30, 4, out);
      rect(ctx, 15, 19, 28, 2, shade(hc, -0.4));
      rect(ctx, 33, 12, 6, 4, '#f0d060');
      break;
    case 'chef':
      rect(ctx, 18, 0, 36, 20, out);
      rect(ctx, 19, 1, 34, 18, '#f8f8f8');
      rect(ctx, 14, 6, 44, 8, out);
      rect(ctx, 15, 7, 42, 6, '#f8f8f8');
      rect(ctx, 40, 2, 10, 15, '#dcdce6');
      rect(ctx, 19, 16, 34, 3, '#c8c8d4');
      break;
    case 'bow':
      rect(ctx, 20, 12, 32, 9, out);
      rect(ctx, 21, 13, 30, 7, '#f8f8f8');
      rect(ctx, 32, 6, 8, 8, out);
      rect(ctx, 33, 7, 6, 6, '#e0688a');
      rect(ctx, 28, 8, 5, 5, '#e0688a');
      rect(ctx, 39, 8, 5, 5, '#e0688a');
      break;
    case 'tophat':
      rect(ctx, 14, 16, 44, 5, out);
      rect(ctx, 15, 17, 42, 3, '#2c2c34');
      rect(ctx, 21, -6, 30, 24, out);
      rect(ctx, 22, -5, 28, 22, '#2c2c34');
      rect(ctx, 22, 10, 28, 4, '#c03030');
      rect(ctx, 26, -3, 4, 12, '#4a4a58');
      break;
    case 'beret':
      rect(ctx, 16, 8, 42, 13, out);
      rect(ctx, 17, 9, 40, 11, '#b0303c');
      rect(ctx, 12, 12, 10, 8, out);
      rect(ctx, 13, 13, 8, 6, '#b0303c');
      rect(ctx, 34, 5, 4, 4, '#b0303c');
      rect(ctx, 20, 10, 12, 2, '#d0505c');
      break;
    case 'police':
      rect(ctx, 16, 6, 40, 14, out);
      rect(ctx, 17, 7, 38, 12, '#2c4c8c');
      rect(ctx, 14, 19, 44, 4, out);
      rect(ctx, 15, 19, 42, 2, '#141c34');
      rect(ctx, 31, 9, 10, 9, '#f0d060');
      rect(ctx, 34, 11, 4, 5, '#a08020');
      break;
    default:
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// cached, static portraits for screens outside the battle (the notebook, the dialogue name-tag): drawn once per
// (look, mood) at native size onto an offscreen canvas, then blitted at any scale, exactly like `iconCanvas` caches icons.

const bitmapCache = new Map<string, HTMLCanvasElement>();

function lookKey(look: Look): string {
  return `${look.skin}|${look.hair}|${look.hairStyle}|${look.outfit}|${look.trim}|${look.pants}|${look.hat}|${look.hatColor}|${look.glasses ? 1 : 0}|${look.coat ? 1 : 0}`;
}

function portraitBitmap(look: Look, mood: Mood): HTMLCanvasElement {
  const key = `${lookKey(look)}|${mood}`;
  let cv = bitmapCache.get(key);
  if (cv) return cv;
  cv = document.createElement('canvas');
  cv.width = PORTRAIT_W;
  cv.height = PORTRAIT_H;
  drawPortrait(cv.getContext('2d') as Ctx, 0, 0, look, mood, 0, 0);
  bitmapCache.set(key, cv);
  return cv;
}

/** The full portrait, scaled (pixelated, cached) to fit a w x h box: for the notebook's suspect detail page. */
export function drawPortraitScaled(ctx: Ctx, x: number, y: number, look: Look, mood: Mood, w: number, h: number): void {
  const bmp = portraitBitmap(look, mood);
  ctx.imageSmoothingEnabled = false;
  const scale = Math.min(w / PORTRAIT_W, h / PORTRAIT_H);
  const dw = Math.round(PORTRAIT_W * scale);
  const dh = Math.round(PORTRAIT_H * scale);
  ctx.drawImage(bmp, Math.round(x + (w - dw) / 2), Math.round(y + (h - dh) / 2), dw, dh);
}

/** Just the head and hat, cropped from the same cached portrait: a small, unmistakable face for a name-tag or a list row. */
export function drawPortraitHead(ctx: Ctx, x: number, y: number, look: Look, mood: Mood, size: number): void {
  const bmp = portraitBitmap(look, mood);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(bmp, 13, 1, 46, 53, Math.round(x), Math.round(y), size, size);
}

/** The detective seen from behind, over the shoulder: the same native scale as the suspect's portrait. */
export function drawPortraitBack(ctx: Ctx, x0: number, y0: number, look: Look, t = 0): void {
  ctx.save();
  ctx.translate(Math.round(x0), Math.round(y0));
  const breathe = Math.round(Math.sin(t / 34) * 0.8 + 0.4);
  const top = 58 + breathe;
  // coat and shoulders
  for (let y = top; y < PORTRAIT_H; y++) {
    const half = Math.min(35, 20 + Math.round((y - top) * 0.9));
    rect(ctx, 36 - half - 1, y, half * 2 + 2, 1, OUT);
  }
  for (let y = top + 1; y < PORTRAIT_H; y++) {
    const half = Math.min(34, 19 + Math.round((y - top) * 0.9));
    rect(ctx, 36 - half, y, half * 2, 1, look.outfit);
    rect(ctx, 36 + Math.round(half * 0.4), y, Math.round(half * 0.6), 1, shade(look.outfit, -0.18));
    rect(ctx, 36 - half, y, 3, 1, shade(look.outfit, 0.16));
  }
  rect(ctx, 35, top + 4, 2, PORTRAIT_H - top - 4, shade(look.outfit, -0.3));
  // popped collar and neck
  rect(ctx, 22, top - 2, 28, 7, OUT);
  rect(ctx, 23, top - 1, 26, 5, shade(look.outfit, 0.12));
  rect(ctx, 29, 46, 14, 14, OUT);
  rect(ctx, 30, 46, 12, 13, shade(look.skin, -0.2));
  // head from behind: hair, ears
  blob(ctx, 20, 33, 2, 4, look.skin, undefined, OUT);
  blob(ctx, 52, 33, 2, 4, shade(look.skin, -0.16), undefined, OUT);
  blob(ctx, 36, 31, 15, 18, look.hair, shade(look.hair, -0.3), OUT);
  rect(ctx, 24, 40, 24, 5, shade(look.hair, -0.15));
  // the hat, brim and band
  const hc = look.hatColor;
  rect(ctx, 12, 14, 48, 6, OUT);
  rect(ctx, 13, 15, 46, 4, hc);
  rect(ctx, 20, 2, 32, 14, OUT);
  rect(ctx, 21, 3, 30, 12, hc);
  rect(ctx, 21, 11, 30, 3, '#f0d878');
  rect(ctx, 24, 4, 6, 3, shade(hc, 0.25));
  rect(ctx, 13, 18, 46, 1, 'rgba(0,0,0,0.35)');
  ctx.restore();
}
