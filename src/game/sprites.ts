/** Procedural pixel art: every tile and character is drawn from rectangles, so there are no image assets. */
import type { Dir, Look } from './types';
import { drawIcon } from './art/icons-draw';

type Ctx = CanvasRenderingContext2D;
const OUT = '#242430';

const rect = (c: Ctx, x: number, y: number, w: number, h: number, col: string) => {
  c.fillStyle = col;
  c.fillRect(x, y, w, h);
};

// ---------------------------------------------------------------------------------------------
// characters

function drawHat(c: Ctx, look: Look, dir: Dir): void {
  const col = look.hatColor;
  switch (look.hat) {
    case 'fedora':
      rect(c, 5, 0, 6, 3, col);
      rect(c, 5, 2, 6, 1, 'rgba(0,0,0,0.35)');
      rect(c, 3, 3, 10, 1, col);
      rect(c, 3, 4, 10, 1, 'rgba(0,0,0,0.3)');
      break;
    case 'cap':
      rect(c, 4, 1, 8, 3, col);
      rect(c, dir === 'left' ? 2 : dir === 'right' ? 10 : 4, 4, 4, 1, 'rgba(0,0,0,0.5)');
      break;
    case 'chef':
      rect(c, 4, 0, 8, 4, '#f8f8f8');
      rect(c, 3, 1, 10, 2, '#f8f8f8');
      rect(c, 5, 4, 6, 1, '#d8d8e0');
      break;
    case 'bow':
      rect(c, 5, 1, 6, 3, '#f8f8f8');
      rect(c, 7, 0, 2, 1, '#e0688a');
      break;
    case 'tophat':
      rect(c, 5, 0, 6, 4, '#282830');
      rect(c, 5, 3, 6, 1, '#c03030');
      rect(c, 3, 4, 10, 1, '#282830');
      break;
    case 'beret':
      rect(c, 4, 1, 8, 3, '#b0303c');
      rect(c, 3, 2, 3, 2, '#b0303c');
      rect(c, 8, 0, 1, 1, '#b0303c');
      break;
    case 'police':
      rect(c, 4, 0, 8, 4, '#2c4c8c');
      rect(c, 7, 1, 2, 2, '#f0d060');
      rect(c, 4, 4, 8, 1, '#141c34');
      break;
    default:
  }
}

/** Draw a 16x16 character with its top-left at (x,y). `frame` 0 = standing, 1/2 = mid-step. */
export function drawChar(ctx: Ctx, x: number, y: number, look: Look, dir: Dir, frame = 0, scale = 1): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  const c = ctx;
  rect(c, 3, 15, 10, 1, 'rgba(0,0,0,0.22)');
  // legs
  const lift1 = frame === 1 ? 1 : 0;
  const lift2 = frame === 2 ? 1 : 0;
  rect(c, 5, 12 - lift1, 2, 3, look.pants);
  rect(c, 9, 12 - lift2, 2, 3, look.pants);
  rect(c, 5, 14 - lift1, 2, 1, OUT);
  rect(c, 9, 14 - lift2, 2, 1, OUT);
  // body
  rect(c, 3, 8, 10, 6, OUT);
  rect(c, 4, 8, 8, 5, look.outfit);
  if (look.coat) {
    rect(c, 4, 12, 8, 2, look.outfit);
    rect(c, 7, 9, 2, 5, 'rgba(0,0,0,0.25)');
  }
  if (dir === 'down') {
    rect(c, 7, 8, 2, 3, look.trim);
    rect(c, 3, 10, 1, 3, look.outfit);
    rect(c, 12, 10, 1, 3, look.outfit);
    rect(c, 3, 13, 1, 1, look.skin);
    rect(c, 12, 13, 1, 1, look.skin);
  } else if (dir === 'up') {
    rect(c, 3, 10, 1, 3, look.outfit);
    rect(c, 12, 10, 1, 3, look.outfit);
    rect(c, 5, 8, 6, 1, 'rgba(0,0,0,0.18)');
  } else {
    const fx = dir === 'left' ? 5 : 9;
    rect(c, fx, 9, 2, 4, 'rgba(0,0,0,0.22)');
    rect(c, fx, 12, 2, 1, look.skin);
    rect(c, 6, 8, 4, 1, look.trim);
  }
  // head
  rect(c, 4, 1, 8, 8, OUT);
  rect(c, 5, 2, 6, 6, look.skin);
  if (dir === 'up') {
    rect(c, 5, 2, 6, 6, look.hair);
  } else {
    rect(c, 5, 2, 6, look.hairStyle === 2 ? 3 : 2, look.hair);
    if (look.hairStyle >= 1) {
      rect(c, 5, 2, 1, 4, look.hair);
      rect(c, 10, 2, 1, 4, look.hair);
    }
    if (dir === 'down') {
      const eyeY = look.glasses ? 5 : 4;
      rect(c, 6, eyeY, 1, 2, OUT);
      rect(c, 9, eyeY, 1, 2, OUT);
      if (look.glasses) {
        rect(c, 5, 4, 3, 1, '#4a4a58');
        rect(c, 8, 4, 3, 1, '#4a4a58');
        rect(c, 5, 6, 3, 1, '#4a4a58');
        rect(c, 8, 6, 3, 1, '#4a4a58');
      }
      rect(c, 7, 7, 2, 1, '#c26a5a');
    } else {
      const ex = dir === 'left' ? 6 : 9;
      rect(c, ex, 4, 1, 2, OUT);
      if (look.glasses) rect(c, dir === 'left' ? 5 : 8, 4, 3, 1, '#4a4a58');
      rect(c, dir === 'left' ? 9 : 5, 2, 2, 5, look.hair);
    }
  }
  drawHat(c, look, dir);
  ctx.restore();
}

/** The victim, lying inside a chalk outline. */
export function drawBody(ctx: Ctx, x: number, y: number, look: Look): void {
  ctx.save();
  ctx.translate(x, y);
  const c = ctx;
  // pool of blood
  rect(c, 9, 9, 6, 4, '#8a1c1c');
  rect(c, 10, 8, 4, 1, '#8a1c1c');
  // chalk outline
  for (const [px, py, w, h] of [[0, 4, 16, 1], [0, 14, 16, 1], [0, 4, 1, 11], [15, 4, 1, 11], [7, 4, 1, 3], [7, 12, 1, 3]] as const) rect(c, px, py, w, h, '#f4f4f0');
  // legs, torso, head
  rect(c, 2, 7, 4, 3, OUT);
  rect(c, 2, 8, 4, 1, look.pants);
  rect(c, 2, 9, 3, 1, look.pants);
  rect(c, 5, 6, 6, 5, OUT);
  rect(c, 6, 7, 4, 3, look.outfit);
  rect(c, 10, 6, 5, 5, OUT);
  rect(c, 11, 7, 3, 3, look.skin);
  rect(c, 11, 7, 3, 1, look.hair);
  rect(c, 12, 8, 1, 1, OUT);
  ctx.restore();
}

/** A clue lying on the floor: its own icon, bobbing above a soft pulsing ring, with a glint. */
export function drawItem(ctx: Ctx, x: number, y: number, icon: { id: string; verbal: boolean }, tick: number): void {
  const bob = Math.round(Math.sin(tick / 14) * 1.2);
  const pulse = (Math.sin(tick / 16) + 1) / 2;
  ctx.save();
  ctx.fillStyle = `rgba(255,236,150,${0.16 + pulse * 0.16})`;
  ctx.beginPath();
  ctx.ellipse(x + 8, y + 12, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(x + 4, y + 14, 8, 1);
  ctx.restore();
  drawIcon(ctx, icon.id, x, y - 1 + bob, 1, icon.verbal);
  const t = Math.floor(tick / 12) % 4;
  const pts: [number, number][] = [[3, 3], [12, 2], [13, 9], [1, 8]];
  const [sx, sy] = pts[t] as [number, number];
  rect(ctx, x + sx, y + sy, 1, 1, '#ffffff');
  rect(ctx, x + sx - 1, y + sy, 3, 1, 'rgba(255,255,255,0.7)');
  rect(ctx, x + sx, y + sy - 1, 1, 3, 'rgba(255,255,255,0.7)');
}

/** A clue icon at native size (2x via the caller's transform when needed), no shadow. */
export function drawItemIcon(ctx: Ctx, id: string, x: number, y: number, verbal = false): void {
  drawIcon(ctx, id, x, y, 1, verbal);
}

/** Head and shoulders of a character, for name tags and the notebook. Draws into a 16x12 area at (x, y). */
export function drawBust(ctx: Ctx, x: number, y: number, look: Look): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, 16, 12);
  ctx.clip();
  drawChar(ctx, x, y, look, 'down', 0, 1);
  ctx.restore();
}

/** The little "!" bubble that pops over a head. */
export function drawBubble(ctx: Ctx, x: number, y: number): void {
  rect(ctx, x + 4, y - 11, 8, 10, OUT);
  rect(ctx, x + 5, y - 10, 6, 8, '#f8f8f8');
  rect(ctx, x + 7, y - 9, 2, 4, '#d02828');
  rect(ctx, x + 7, y - 4, 2, 1, '#d02828');
  rect(ctx, x + 7, y - 1, 2, 2, OUT);
}

/** A little person-shaped token (9x10): hair, face, coat. Used on THE NIGHT table. */
export function drawToken(ctx: Ctx, x: number, y: number, look: Look, lit = false): void {
  rect(ctx, x + 1, y + 9, 7, 1, 'rgba(0,0,0,0.3)');
  rect(ctx, x + 1, y + 5, 7, 4, OUT);
  rect(ctx, x + 2, y + 5, 5, 3, look.outfit);
  rect(ctx, x + 3, y, 3, 1, OUT);
  rect(ctx, x + 2, y + 1, 5, 5, OUT);
  rect(ctx, x + 3, y + 2, 3, 3, look.skin);
  rect(ctx, x + 3, y + 1, 3, 1, look.hair);
  if (look.hat !== 'none') rect(ctx, x + 2, y + 1, 5, 1, look.hatColor);
  if (lit) {
    ctx.strokeStyle = '#ffe27a';
    ctx.strokeRect(x + 0.5, y + 0.5, 8, 9);
  }
}

const halos = new Map<string, HTMLCanvasElement>();
/** The detective: a bright coat with a dark rim around the whole silhouette, so the player never vanishes into planks, snow or carpet. */
export function drawDetective(ctx: Ctx, x: number, y: number, look: Look, dir: Dir, frame = 0): void {
  const key = `${dir}|${frame}|${look.outfit}`;
  let h = halos.get(key);
  if (!h) {
    h = document.createElement('canvas');
    h.width = h.height = 20;
    const c = h.getContext('2d') as Ctx;
    drawChar(c, 2, 2, look, dir, frame, 1);
    c.globalCompositeOperation = 'source-in';
    c.fillStyle = '#0c0a14';
    c.fillRect(0, 0, 20, 20);
    halos.set(key, h);
  }
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) ctx.drawImage(h, Math.round(x) - 2 + dx, Math.round(y) - 2 + dy);
  drawChar(ctx, Math.round(x), Math.round(y), look, dir, frame, 1);
}
