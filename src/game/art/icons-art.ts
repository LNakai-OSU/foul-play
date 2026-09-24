/** The clue icon library: 16x16 pixel icons, one per kind of object, drawn from primitives. Painters take only a ctx. */
import { disc, noise, px, rect, ring, shade } from './draw';
import type { Ctx } from './draw';

export interface IconDef {
  name: string;
  draw: (c: Ctx) => void;
}

const K = '#1f1d2b';
const W = '#f7f3e8';
const WS = '#d9d2bc';
const G = '#c4c8d4';
const M = '#8b90a4';
const D = '#4b4f63';
const R = '#d9453a';
const RD = '#8e2a2c';
const O = '#ea7d2e';
const Y = '#f2c94c';
const YD = '#b98a2a';
const N = '#9a6a3c';
const ND = '#5e3d22';
const T = '#dcb57a';
const B = '#4b8bd0';
const BD = '#2b4f8f';
const C = '#93d6ea';
const E = '#58ad57';
const ED = '#2d6c3c';
const P = '#ef7096';
const U = '#8f52a8';
const S = '#f4cba5';

export const ICONS: Record<string, IconDef> = {};
const def = (id: string, name: string, draw: (c: Ctx) => void): void => {
  ICONS[id] = { name, draw };
};

// ---- paper kit ------------------------------------------------------------------------------------

const sheet = (c: Ctx, o: { x?: number; y?: number; w?: number; h?: number; fill?: string; lines?: number; tear?: 'l' | 'r'; burn?: boolean; ink?: string } = {}): void => {
  const x = o.x ?? 3;
  const y = o.y ?? 2;
  const w = o.w ?? 10;
  const h = o.h ?? 12;
  rect(c, x - 1, y - 1, w + 2, h + 2, K);
  rect(c, x, y, w, h, o.fill ?? W);
  rect(c, x, y, w, 1, 'rgba(255,255,255,0.6)');
  rect(c, x, y + h - 1, w, 1, 'rgba(0,0,0,0.12)');
  const n = o.lines ?? 0;
  for (let i = 0; i < n; i++) rect(c, x + 2, y + 2 + i * 2, w - 4 - ((i * 3) % 3), 1, o.ink ?? M);
  if (o.tear) {
    for (let j = 0; j < h; j++) {
      const off = (j * 5) % 3;
      const tx = o.tear === 'r' ? x + w - 1 - off : x + off;
      px(c, tx, y + j, 'rgba(0,0,0,0)');
      c.clearRect(o.tear === 'r' ? tx : x - 1, y + j, o.tear === 'r' ? w : off + 1, 1);
      px(c, o.tear === 'r' ? tx - 1 : x + off + 1, y + j, K);
    }
  }
  if (o.burn) {
    for (let i = 0; i < w; i++) {
      px(c, x + i, y + h - 1 - (i % 3 === 0 ? 2 : i % 2), '#3a2a20');
      px(c, x + i, y + h - 1, '#1f1d2b');
    }
    px(c, x + 2, y + h - 3, '#ff8a30');
    px(c, x + 7, y + h - 2, '#ffd060');
  }
};
const envelope = (c: Ctx, fill = W, seal = R): void => {
  rect(c, 1, 3, 14, 11, K);
  rect(c, 2, 4, 12, 9, fill);
  for (let i = 0; i < 6; i++) {
    px(c, 2 + i, 4 + i, WS);
    px(c, 13 - i, 4 + i, WS);
  }
  rect(c, 2, 4, 12, 1, 'rgba(255,255,255,0.5)');
  disc(c, 8, 9, 2, seal);
  px(c, 7, 8, shade(seal, 0.4));
};
const heart = (c: Ctx, x: number, y: number, col: string): void => {
  rect(c, x + 1, y, 2, 1, col);
  rect(c, x + 4, y, 2, 1, col);
  rect(c, x, y + 1, 7, 2, col);
  rect(c, x + 1, y + 3, 5, 1, col);
  rect(c, x + 2, y + 4, 3, 1, col);
  px(c, x + 3, y + 5, col);
};

def('letter', 'Letter', (c) => envelope(c));
def('love_letters', 'Love letters', (c) => {
  envelope(c, '#fbe6ec', P);
  rect(c, 1, 12, 14, 3, K);
  rect(c, 2, 12, 12, 2, '#fbe6ec');
  rect(c, 0, 8, 16, 2, RD);
  rect(c, 0, 8, 16, 1, R);
  rect(c, 6, 6, 4, 2, R);
  px(c, 5, 6, R);
  px(c, 10, 6, R);
  heart(c, 5, 1, P);
});
def('torn_letter', 'Torn letter', (c) => {
  sheet(c, { w: 9, lines: 5, tear: 'r' });
  heart(c, 4, 9, P);
});
def('torn_letter2', 'Other half of a letter', (c) => {
  sheet(c, { x: 4, w: 9, lines: 5, tear: 'l' });
  rect(c, 8, 10, 4, 2, RD);
});
def('ransom_note', 'Cut-out note', (c) => {
  sheet(c, { lines: 0 });
  const cols = [R, B, O, ED, U];
  for (let i = 0; i < 6; i++) rect(c, 4 + (i % 3) * 3, 4 + Math.floor(i / 3) * 4, 2 + (i % 2), 3, cols[i % 5] as string);
  rect(c, 4, 12, 8, 1, M);
});
def('clipping', 'Newspaper clipping', (c) => {
  sheet(c, { fill: '#e8e2d0', w: 12, x: 2 });
  rect(c, 4, 4, 8, 2, D);
  rect(c, 4, 7, 4, 3, M);
  rect(c, 9, 7, 3, 1, M);
  rect(c, 9, 9, 3, 1, M);
  rect(c, 4, 11, 8, 1, M);
  ring(c, 10, 8, 3, R);
});
def('will', 'Last will', (c) => {
  rect(c, 2, 2, 12, 12, K);
  rect(c, 3, 3, 10, 10, W);
  rect(c, 1, 1, 3, 14, WS);
  rect(c, 12, 1, 3, 14, WS);
  rect(c, 1, 1, 3, 1, K);
  rect(c, 12, 14, 3, 1, K);
  for (let i = 0; i < 3; i++) rect(c, 5, 4 + i * 2, 6, 1, M);
  disc(c, 10, 11, 2, R);
  rect(c, 9, 12, 1, 2, RD);
  rect(c, 11, 12, 1, 2, RD);
});
def('contract', 'Contract', (c) => {
  sheet(c, { lines: 3 });
  rect(c, 5, 10, 6, 1, K);
  rect(c, 5, 9, 2, 1, BD);
  rect(c, 7, 8, 2, 1, BD);
  rect(c, 12, 8, 1, 5, N);
  rect(c, 13, 7, 1, 2, YD);
});
def('deed', 'Framed deed', (c) => {
  rect(c, 1, 1, 14, 14, YD);
  rect(c, 2, 2, 12, 12, K);
  rect(c, 3, 3, 10, 10, W);
  rect(c, 4, 4, 8, 1, D);
  rect(c, 5, 6, 6, 1, M);
  rect(c, 5, 8, 6, 1, M);
  disc(c, 8, 11, 1, R);
  px(c, 7, 12, R);
  px(c, 9, 12, R);
});
def('cheque', 'Cheque', (c) => {
  rect(c, 0, 4, 16, 9, K);
  rect(c, 1, 5, 14, 7, '#e4f0d8');
  rect(c, 2, 6, 5, 1, M);
  rect(c, 10, 6, 4, 2, BD);
  rect(c, 2, 8, 9, 1, M);
  rect(c, 9, 10, 5, 1, D);
  px(c, 10, 9, D);
  px(c, 12, 9, D);
  rect(c, 2, 10, 4, 1, G);
});
def('receipt', 'Receipt', (c) => {
  rect(c, 3, 0, 10, 15, K);
  rect(c, 4, 1, 8, 13, W);
  for (let x = 4; x < 12; x += 2) px(c, x, 14, W);
  rect(c, 5, 2, 6, 1, D);
  for (let y = 4; y < 10; y += 2) rect(c, 5, y, 3 + (y % 3), 1, M);
  rect(c, 5, 10, 6, 1, D);
  rect(c, 4, 11, 8, 2, R);
  rect(c, 5, 11, 6, 1, '#ffb0a8');
});
def('telegram', 'Telegram', (c) => {
  rect(c, 1, 2, 14, 12, K);
  rect(c, 2, 3, 12, 10, '#f4e2a4');
  rect(c, 2, 3, 12, 2, YD);
  for (let i = 0; i < 3; i++) rect(c, 3, 6 + i * 2, 4 + i * 2, 1, ND);
  rect(c, 11, 6, 2, 1, R);
  rect(c, 11, 8, 2, 1, R);
});
def('ticket', 'Ticket stub', (c) => {
  rect(c, 1, 4, 14, 8, K);
  rect(c, 2, 5, 12, 6, '#f0d488');
  px(c, 1, 8, 'rgba(0,0,0,0)');
  c.clearRect(0, 7, 2, 2);
  c.clearRect(14, 7, 2, 2);
  for (let y = 5; y < 11; y += 2) px(c, 5, y, ND);
  rect(c, 7, 6, 5, 1, ND);
  rect(c, 7, 8, 4, 1, ND);
  rect(c, 3, 6, 1, 4, R);
});
def('note', 'Note', (c) => {
  sheet(c, { x: 2, y: 3, w: 12, h: 10, lines: 3 });
  rect(c, 2, 3, 12, 2, WS);
  px(c, 4, 12, R);
});
def('burnt_note', 'Burnt note', (c) => sheet(c, { lines: 4, burn: true }));
def('smudged_note', 'Smudged note', (c) => {
  sheet(c, { lines: 3 });
  for (let i = 0; i < 9; i++) px(c, 4 + i, 8 + (i % 2), i % 3 === 0 ? BD : 'rgba(43,79,143,0.55)');
  rect(c, 6, 10, 6, 1, 'rgba(43,79,143,0.4)');
  rect(c, 12, 11, 2, 3, S);
});
def('signature', 'Signed page', (c) => {
  sheet(c, { lines: 3 });
  for (let i = 0; i < 8; i++) px(c, 4 + i, 11 - (i % 3 === 1 ? 1 : 0) - (i > 4 ? 1 : 0), BD);
  rect(c, 4, 12, 8, 1, M);
});
def('list', 'Checklist', (c) => {
  sheet(c, {});
  for (let i = 0; i < 4; i++) {
    rect(c, 4, 4 + i * 2, 1, 1, i < 3 ? ED : M);
    rect(c, 6, 4 + i * 2, 5 - (i % 2), 1, M);
  }
  px(c, 5, 5, ED);
});
def('clipboard', 'Clipboard', (c) => {
  rect(c, 2, 1, 12, 14, K);
  rect(c, 3, 2, 10, 12, N);
  rect(c, 4, 4, 8, 9, W);
  rect(c, 5, 0, 6, 3, M);
  rect(c, 6, 1, 4, 1, G);
  for (let i = 0; i < 3; i++) rect(c, 5, 6 + i * 2, 6, 1, M);
  px(c, 5, 5, R);
});
def('flyer', 'Flyer', (c) => {
  sheet(c, { fill: '#f6e6c0' });
  rect(c, 4, 4, 8, 3, R);
  rect(c, 4, 8, 8, 1, D);
  rect(c, 4, 10, 6, 1, M);
  rect(c, 4, 12, 4, 1, M);
});
def('slip', 'Slip of paper', (c) => {
  sheet(c, { x: 3, y: 4, w: 10, h: 8, lines: 2 });
  rect(c, 4, 10, 3, 1, R);
});
def('legal_letter', 'Solicitor letter', (c) => {
  envelope(c, '#f0ead8', BD);
  rect(c, 2, 4, 12, 1, BD);
  rect(c, 6, 10, 4, 1, BD);
});
def('threat_letter', 'Threatening letter', (c) => {
  sheet(c, { fill: '#efe0c4', lines: 2 });
  rect(c, 7, 7, 2, 4, R);
  rect(c, 7, 12, 2, 1, R);
  rect(c, 4, 4, 8, 1, D);
});
def('letter_x', 'Rejection letter', (c) => {
  sheet(c, { lines: 3 });
  for (let i = 0; i < 6; i++) {
    px(c, 5 + i, 8 + i - 1, R);
    px(c, 10 - i, 8 + i - 1, R);
  }
});
def('manuscript', 'Manuscript', (c) => {
  for (let i = 3; i >= 0; i--) {
    rect(c, 2 + i, 1 + i, 10, 12, K);
    rect(c, 3 + i, 2 + i, 8, 10, i === 0 ? W : WS);
  }
  rect(c, 4, 3, 6, 2, D);
  rect(c, 4, 6, 5, 1, M);
  rect(c, 4, 8, 6, 1, M);
});
def('book_page', 'Dedication page', (c) => {
  sheet(c, { lines: 2 });
  heart(c, 5, 8, P);
});
def('ledger', 'Ledger', (c) => {
  rect(c, 2, 1, 12, 14, K);
  rect(c, 3, 2, 10, 12, ED);
  rect(c, 3, 2, 2, 12, '#1f4a2c');
  rect(c, 6, 4, 6, 8, W);
  for (let i = 0; i < 4; i++) {
    rect(c, 7, 5 + i * 2, 4, 1, M);
    px(c, 11, 5 + i * 2, D);
  }
  rect(c, 3, 2, 10, 1, '#7ac088');
});
def('logbook', 'Log book', (c) => {
  rect(c, 2, 1, 12, 14, K);
  rect(c, 3, 2, 10, 12, BD);
  rect(c, 3, 2, 10, 1, B);
  rect(c, 5, 4, 6, 4, WS);
  rect(c, 6, 5, 4, 1, D);
  rect(c, 6, 7, 3, 1, D);
  rect(c, 5, 10, 6, 2, Y);
  rect(c, 12, 5, 1, 6, YD);
});
def('script', 'Prompt book', (c) => {
  rect(c, 2, 1, 12, 14, K);
  rect(c, 3, 2, 10, 12, RD);
  disc(c, 6, 7, 2, W);
  disc(c, 10, 7, 2, W);
  px(c, 5, 6, K);
  px(c, 7, 6, K);
  px(c, 9, 6, K);
  px(c, 11, 6, K);
  rect(c, 5, 9, 2, 1, K);
  rect(c, 9, 8, 3, 1, K);
  rect(c, 4, 11, 8, 1, Y);
});
def('passport', 'Passport', (c) => {
  rect(c, 3, 1, 10, 14, K);
  rect(c, 4, 2, 8, 12, BD);
  rect(c, 4, 2, 8, 1, B);
  disc(c, 8, 6, 2, Y);
  ring(c, 8, 6, 3, YD);
  rect(c, 5, 10, 6, 1, Y);
  rect(c, 6, 12, 4, 1, YD);
});
def('id_card', 'Membership card', (c) => {
  rect(c, 1, 3, 14, 10, K);
  rect(c, 2, 4, 12, 8, '#eef0d8');
  rect(c, 3, 5, 4, 5, B);
  disc(c, 5, 7, 1, S);
  rect(c, 8, 5, 5, 1, D);
  rect(c, 8, 7, 4, 1, M);
  rect(c, 8, 9, 5, 1, M);
  rect(c, 2, 4, 12, 1, ED);
});
def('keycard', 'Swipe card', (c) => {
  rect(c, 1, 3, 14, 10, K);
  rect(c, 2, 4, 12, 8, G);
  rect(c, 2, 5, 12, 3, D);
  rect(c, 3, 10, 5, 1, BD);
  rect(c, 11, 9, 2, 2, YD);
});
def('greeting_card', 'Greeting card', (c) => {
  rect(c, 2, 1, 12, 14, K);
  rect(c, 3, 2, 10, 12, '#fdf0f4');
  heart(c, 5, 4, P);
  rect(c, 4, 11, 8, 1, M);
});
def('gift_tag', 'Gift tag', (c) => {
  rect(c, 4, 4, 8, 11, K);
  rect(c, 5, 5, 6, 9, '#f6e6c0');
  rect(c, 4, 4, 1, 3, 'rgba(0,0,0,0)');
  c.clearRect(4, 4, 2, 2);
  c.clearRect(10, 4, 2, 2);
  rect(c, 7, 6, 2, 2, K);
  rect(c, 8, 0, 1, 6, R);
  rect(c, 6, 10, 4, 1, M);
  rect(c, 6, 12, 3, 1, M);
});
def('cash_envelope', 'Envelope of cash', (c) => {
  rect(c, 2, 2, 12, 4, K);
  rect(c, 3, 3, 10, 3, E);
  rect(c, 4, 4, 2, 1, ED);
  rect(c, 8, 4, 2, 1, ED);
  envelope(c, '#e8d8a8', RD);
  rect(c, 0, 0, 0, 0, K);
});
def('steamed_letters', 'Steamed-open letters', (c) => {
  rect(c, 1, 6, 13, 9, K);
  rect(c, 2, 7, 11, 7, W);
  for (let i = 0; i < 5; i++) px(c, 2 + i, 7 + i, WS);
  rect(c, 3, 11, 8, 1, M);
  rect(c, 6, 9, 3, 2, R);
  for (let i = 0; i < 3; i++) {
    px(c, 4 + i * 4, 4 - (i % 2), 'rgba(200,220,240,0.9)');
    px(c, 5 + i * 4, 2 + (i % 2), 'rgba(200,220,240,0.7)');
    px(c, 4 + i * 4, 1, 'rgba(200,220,240,0.5)');
  }
});
def('photo_scratched', 'Defaced photograph', (c) => {
  rect(c, 1, 2, 14, 12, K);
  rect(c, 2, 3, 12, 10, W);
  rect(c, 3, 4, 10, 6, C);
  disc(c, 5, 7, 1, S);
  rect(c, 4, 8, 3, 2, B);
  disc(c, 10, 7, 1, S);
  rect(c, 9, 8, 3, 2, ED);
  for (let i = 0; i < 4; i++) {
    px(c, 4 + i, 5 + i, R);
    px(c, 7 - i, 5 + i, R);
  }
  rect(c, 3, 11, 8, 1, M);
});
def('photos', 'Photographs', (c) => {
  rect(c, 2, 3, 11, 10, K);
  rect(c, 3, 4, 9, 8, W);
  rect(c, 4, 5, 7, 5, B);
  rect(c, 4, 8, 7, 2, E);
  disc(c, 9, 6, 1, Y);
  rect(c, 5, 1, 9, 9, K);
  rect(c, 6, 2, 7, 7, WS);
  rect(c, 7, 3, 5, 4, '#bfa27a');
});
def('canvas', 'Canvas', (c) => {
  rect(c, 1, 2, 14, 11, K);
  rect(c, 2, 3, 12, 9, '#f4f0e2');
  rect(c, 3, 4, 10, 4, '#88b8e0');
  rect(c, 3, 8, 10, 3, E);
  disc(c, 11, 5, 1, Y);
  rect(c, 8, 10, 4, 1, BD);
  rect(c, 3, 13, 10, 1, D);
  rect(c, 4, 14, 1, 2, N);
  rect(c, 11, 14, 1, 2, N);
});
def('label', 'Label card', (c) => {
  rect(c, 1, 4, 14, 8, YD);
  rect(c, 2, 5, 12, 6, '#f6e6c0');
  rect(c, 4, 6, 8, 1, D);
  rect(c, 4, 8, 6, 1, M);
  px(c, 3, 7, YD);
  px(c, 12, 7, YD);
});
def('raffle_ticket', 'Raffle ticket', (c) => {
  rect(c, 1, 4, 14, 8, K);
  rect(c, 2, 5, 12, 6, '#f4a0a8');
  for (let y = 5; y < 11; y += 2) px(c, 10, y, K);
  rect(c, 4, 6, 4, 1, D);
  rect(c, 4, 8, 3, 2, W);
  px(c, 5, 9, R);
  rect(c, 11, 6, 2, 4, W);
});

// ---- voices ------------------------------------------------------------------------------------------

def('whisper', 'Overheard whisper', (c) => {
  rect(c, 1, 2, 14, 9, K);
  rect(c, 2, 3, 12, 7, W);
  rect(c, 3, 11, 3, 2, K);
  rect(c, 3, 10, 3, 1, W);
  px(c, 3, 13, K);
  for (let i = 0; i < 3; i++) disc(c, 5 + i * 3, 6, 0, M);
  rect(c, 4, 6, 2, 1, M);
  rect(c, 7, 6, 2, 1, M);
  rect(c, 10, 6, 2, 1, M);
  rect(c, 5, 8, 6, 1, WS);
});
def('arguing', 'Argument', (c) => {
  rect(c, 0, 1, 9, 7, K);
  rect(c, 1, 2, 7, 5, '#ffd0c8');
  rect(c, 1, 8, 2, 2, K);
  rect(c, 2, 4, 5, 1, R);
  rect(c, 7, 7, 9, 7, K);
  rect(c, 8, 8, 7, 5, '#c8dcff');
  rect(c, 13, 14, 2, 2, K);
  for (let i = 0; i < 3; i++) px(c, 9 + i * 2, 10 + (i % 2), B);
  px(c, 4, 3, R);
  px(c, 5, 3, R);
});
def('hearts', 'Tender words', (c) => {
  heart(c, 1, 4, P);
  heart(c, 8, 6, R);
  rect(c, 6, 1, 1, 2, Y);
  rect(c, 5, 2, 3, 1, Y);
});

// ---- small objects ----------------------------------------------------------------------------------

def('key', 'Key', (c) => {
  disc(c, 4, 5, 3, K);
  disc(c, 4, 5, 2, Y);
  disc(c, 4, 5, 1, 'rgba(0,0,0,0)');
  c.clearRect(4, 5, 1, 1);
  rect(c, 6, 5, 9, 3, K);
  rect(c, 6, 5, 9, 2, Y);
  rect(c, 6, 5, 9, 1, '#fff2a0');
  rect(c, 11, 7, 2, 3, K);
  rect(c, 11, 7, 2, 2, YD);
  rect(c, 14, 7, 1, 3, YD);
});
def('padlock', 'Padlock', (c) => {
  ring(c, 8, 5, 4, K);
  ring(c, 8, 5, 3, G);
  rect(c, 3, 7, 10, 8, K);
  rect(c, 4, 8, 8, 6, Y);
  rect(c, 4, 8, 8, 1, '#fff2a0');
  rect(c, 7, 10, 2, 3, K);
  disc(c, 8, 10, 1, K);
  for (let i = 0; i < 3; i++) px(c, 5 + i * 3, 12 + (i % 2), R);
});
def('screw', 'Tiny screw', (c) => {
  rect(c, 6, 2, 4, 3, K);
  rect(c, 6, 3, 4, 2, G);
  rect(c, 7, 3, 2, 1, D);
  rect(c, 7, 5, 2, 8, K);
  rect(c, 7, 5, 2, 8, M);
  for (let y = 6; y < 13; y += 2) rect(c, 6, y, 4, 1, G);
  px(c, 8, 13, K);
  px(c, 8, 14, K);
});
def('wrench', 'Wrench', (c) => {
  for (let i = 0; i < 9; i++) {
    rect(c, 4 + i, 11 - i, 3, 3, K);
    rect(c, 5 + i, 12 - i, 1, 1, i % 2 ? G : M);
  }
  disc(c, 12, 4, 3, K);
  disc(c, 12, 4, 2, G);
  c.clearRect(12, 2, 2, 2);
  disc(c, 3, 13, 2, K);
  disc(c, 3, 13, 1, G);
});
def('knife', 'Knife', (c) => {
  for (let i = 0; i < 8; i++) {
    rect(c, 2 + i, 10 - i, 4, 3, K);
    rect(c, 3 + i, 10 - i, 3, 1, G);
    rect(c, 3 + i, 11 - i, 2, 1, i % 2 ? W : M);
  }
  rect(c, 9, 3, 5, 3, K);
  rect(c, 10, 4, 3, 1, N);
  rect(c, 11, 5, 3, 3, ND);
});
def('letter_opener', 'Letter opener', (c) => {
  for (let i = 0; i < 9; i++) {
    rect(c, 2 + i, 12 - i, 3, 3, K);
    px(c, 3 + i, 12 - i, i < 4 ? R : G);
  }
  rect(c, 10, 3, 4, 3, K);
  rect(c, 11, 4, 2, 1, Y);
  rect(c, 11, 4, 3, 3, YD);
  px(c, 4, 12, RD);
});
def('revolver', 'Revolver', (c) => {
  rect(c, 1, 4, 12, 4, K);
  rect(c, 2, 5, 10, 2, M);
  rect(c, 2, 5, 10, 1, G);
  rect(c, 9, 7, 5, 3, K);
  rect(c, 10, 7, 4, 2, N);
  rect(c, 9, 8, 3, 6, K);
  rect(c, 10, 9, 2, 4, ND);
  rect(c, 6, 8, 3, 2, K);
  rect(c, 12, 3, 2, 2, K);
  disc(c, 7, 5, 2, D);
  px(c, 7, 5, G);
});
def('derringer', 'Derringer', (c) => {
  rect(c, 1, 5, 10, 3, K);
  rect(c, 2, 6, 8, 1, G);
  rect(c, 2, 5, 8, 1, W);
  rect(c, 9, 6, 5, 4, K);
  rect(c, 10, 7, 3, 2, '#f4ecd0');
  rect(c, 11, 9, 3, 5, K);
  rect(c, 12, 10, 1, 3, N);
  rect(c, 7, 8, 3, 2, K);
  px(c, 1, 6, D);
});
def('vial', 'Poison vial', (c) => {
  rect(c, 6, 1, 4, 3, K);
  rect(c, 7, 2, 2, 1, N);
  rect(c, 5, 4, 6, 10, K);
  rect(c, 6, 5, 4, 8, '#c8f0d8');
  rect(c, 6, 9, 4, 4, '#7ad89a');
  rect(c, 7, 6, 1, 3, W);
  rect(c, 6, 7, 4, 3, W);
  disc(c, 8, 8, 0, K);
  px(c, 7, 8, K);
  px(c, 9, 8, K);
  px(c, 8, 9, K);
});
def('flask', 'Hip flask', (c) => {
  rect(c, 6, 1, 4, 3, K);
  rect(c, 7, 2, 2, 1, YD);
  rect(c, 3, 3, 10, 12, K);
  rect(c, 4, 4, 8, 10, M);
  rect(c, 4, 4, 2, 10, G);
  rect(c, 6, 7, 4, 4, Y);
  rect(c, 7, 8, 2, 2, YD);
  rect(c, 4, 13, 8, 1, D);
});
def('tumbler', 'Glass of whisky', (c) => {
  rect(c, 3, 3, 10, 11, K);
  rect(c, 4, 3, 8, 10, '#f0f8ff');
  rect(c, 4, 7, 8, 6, O);
  rect(c, 4, 7, 8, 1, '#ffc070');
  rect(c, 4, 4, 1, 8, W);
  rect(c, 9, 9, 2, 2, '#ffe0a0');
  rect(c, 3, 14, 10, 1, K);
});
def('spill', 'Spilled glass', (c) => {
  rect(c, 1, 9, 14, 6, 'rgba(234,125,46,0.6)');
  rect(c, 2, 11, 12, 3, O);
  rect(c, 4, 13, 8, 1, '#ffc070');
  for (let i = 0; i < 5; i++) rect(c, 3 + i, 2 + i, 6, 3, K);
  for (let i = 0; i < 5; i++) rect(c, 4 + i, 3 + i, 4, 1, '#f0f8ff');
  rect(c, 11, 8, 2, 3, O);
  px(c, 13, 12, O);
});
def('champagne_flute', 'Champagne flute', (c) => {
  rect(c, 5, 1, 6, 8, K);
  rect(c, 6, 1, 4, 8, '#f6f0c8');
  rect(c, 6, 1, 4, 3, '#f0f8ff');
  rect(c, 6, 2, 1, 6, W);
  rect(c, 7, 9, 2, 4, K);
  rect(c, 7, 9, 2, 4, G);
  rect(c, 4, 13, 8, 2, K);
  rect(c, 5, 13, 6, 1, G);
  px(c, 8, 4, W);
  px(c, 9, 6, W);
  rect(c, 9, 3, 1, 2, P);
});
def('cocktail', 'Cocktail glass', (c) => {
  for (let i = 0; i < 6; i++) rect(c, 1 + i, 2 + i, 14 - i * 2, 1, K);
  for (let i = 0; i < 5; i++) rect(c, 2 + i, 3 + i, 12 - i * 2, 1, i < 2 ? W : '#f8c8d8');
  rect(c, 7, 8, 2, 5, K);
  rect(c, 7, 8, 2, 5, G);
  rect(c, 4, 13, 8, 2, K);
  rect(c, 5, 13, 6, 1, G);
  disc(c, 9, 4, 1, R);
  rect(c, 10, 1, 1, 4, ND);
});
def('goblet', 'Goblet', (c) => {
  rect(c, 3, 1, 10, 7, K);
  rect(c, 4, 2, 8, 5, Y);
  rect(c, 4, 2, 8, 1, '#fff2a0');
  rect(c, 4, 5, 8, 2, YD);
  rect(c, 7, 8, 2, 4, K);
  rect(c, 7, 8, 2, 4, YD);
  rect(c, 4, 12, 8, 3, K);
  rect(c, 5, 12, 6, 2, Y);
  px(c, 6, 4, R);
  px(c, 9, 4, B);
});
def('mug', 'Coffee mug', (c) => {
  rect(c, 2, 4, 9, 10, K);
  rect(c, 3, 5, 7, 8, W);
  rect(c, 3, 5, 7, 2, '#5e3d22');
  rect(c, 3, 5, 1, 8, '#ffffff');
  ring(c, 12, 8, 2, K);
  rect(c, 11, 7, 2, 3, W);
  c.clearRect(11, 8, 2, 1);
  px(c, 5, 2, 'rgba(200,210,220,0.9)');
  px(c, 7, 1, 'rgba(200,210,220,0.7)');
});
def('cup_lipstick', 'Cup with lipstick', (c) => {
  rect(c, 1, 12, 14, 3, K);
  rect(c, 2, 12, 12, 2, W);
  rect(c, 3, 4, 9, 9, K);
  rect(c, 4, 5, 7, 7, W);
  rect(c, 4, 5, 7, 2, '#5e3d22');
  ring(c, 13, 8, 2, K);
  rect(c, 4, 7, 3, 1, R);
  rect(c, 3, 8, 4, 2, R);
  rect(c, 4, 10, 3, 1, RD);
  px(c, 4, 8, '#ff9a90');
});
def('cocoa', 'Cocoa and powder', (c) => {
  rect(c, 1, 6, 8, 8, K);
  rect(c, 2, 7, 6, 6, '#e8e0d0');
  rect(c, 2, 7, 6, 2, ND);
  rect(c, 1, 7, 2, 3, 'rgba(0,0,0,0)');
  rect(c, 9, 8, 1, 3, K);
  c.clearRect(1, 7, 1, 1);
  rect(c, 9, 10, 6, 5, K);
  rect(c, 10, 9, 4, 1, W);
  rect(c, 10, 11, 4, 3, W);
  rect(c, 11, 12, 2, 1, WS);
  rect(c, 9, 9, 6, 1, WS);
});
def('dish', 'Plate', (c) => {
  disc(c, 8, 9, 7, K);
  disc(c, 8, 9, 6, W);
  disc(c, 8, 9, 4, G);
  disc(c, 8, 9, 3, W);
  rect(c, 6, 7, 4, 4, '#e8c890');
  px(c, 7, 6, ED);
  px(c, 8, 6, E);
  px(c, 9, 7, R);
  px(c, 8, 8, E);
});
def('cake', 'Cake slice', (c) => {
  rect(c, 1, 7, 14, 7, K);
  rect(c, 2, 8, 12, 5, '#f4e0b0');
  rect(c, 2, 8, 12, 2, '#f8a0b8');
  rect(c, 2, 11, 12, 1, '#c8843c');
  rect(c, 1, 14, 14, 1, D);
  rect(c, 3, 6, 4, 2, K);
  rect(c, 4, 6, 2, 2, '#f8a0b8');
  disc(c, 11, 6, 1, R);
  rect(c, 11, 4, 1, 2, ED);
});
def('marrow', 'Prize marrow', (c) => {
  for (let i = 0; i < 9; i++) rect(c, 1 + i, 10 - Math.floor(i / 2), 6, 4, K);
  for (let i = 0; i < 9; i++) rect(c, 2 + i, 11 - Math.floor(i / 2), 4, 2, E);
  for (let i = 0; i < 9; i++) px(c, 2 + i, 11 - Math.floor(i / 2), '#a8e090');
  rect(c, 12, 5, 3, 2, K);
  rect(c, 13, 4, 2, 2, ED);
  disc(c, 3, 3, 2, R);
  px(c, 3, 3, Y);
});
def('ring', 'Ring', (c) => {
  ring(c, 8, 10, 4, K);
  ring(c, 8, 10, 3, Y);
  disc(c, 8, 10, 2, 'rgba(0,0,0,0)');
  c.clearRect(7, 9, 3, 3);
  rect(c, 6, 3, 4, 3, K);
  rect(c, 7, 3, 2, 2, C);
  px(c, 7, 3, W);
  rect(c, 5, 6, 6, 1, YD);
  px(c, 2, 2, W);
  px(c, 13, 3, W);
  px(c, 14, 2, W);
});
def('ring_box', 'Ring box', (c) => {
  rect(c, 2, 8, 12, 7, K);
  rect(c, 3, 9, 10, 5, '#6a1f34');
  rect(c, 3, 9, 10, 1, '#9a3a55');
  rect(c, 2, 3, 12, 5, K);
  rect(c, 3, 4, 10, 3, '#8a2a44');
  rect(c, 5, 10, 6, 1, K);
  rect(c, 5, 11, 6, 1, '#1a0a10');
  px(c, 8, 1, Y);
  px(c, 7, 2, Y);
  px(c, 9, 2, Y);
});
def('pocket_watch', 'Pocket watch', (c) => {
  rect(c, 7, 0, 2, 3, YD);
  ring(c, 8, 1, 1, K);
  disc(c, 8, 9, 6, K);
  disc(c, 8, 9, 5, Y);
  disc(c, 8, 9, 4, W);
  rect(c, 8, 6, 1, 4, K);
  rect(c, 8, 9, 3, 1, K);
  for (const [x, y] of [[8, 5], [12, 9], [8, 13], [4, 9]] as const) px(c, x, y, M);
  px(c, 5, 6, '#ffffff');
});
def('watch_chain', 'Broken watch chain', (c) => {
  for (let i = 0; i < 6; i++) {
    ring(c, 2 + i * 2, 5 + (i % 2), 1, i % 2 ? YD : Y);
  }
  disc(c, 12, 11, 3, K);
  disc(c, 12, 11, 2, Y);
  disc(c, 12, 11, 1, W);
  ring(c, 13, 5, 1, K);
  px(c, 15, 6, Y);
  rect(c, 12, 7, 1, 2, YD);
});
def('glasses', 'Spectacles', (c) => {
  ring(c, 4, 8, 3, K);
  ring(c, 12, 8, 3, K);
  disc(c, 4, 8, 2, 'rgba(147,214,234,0.75)');
  disc(c, 12, 8, 2, 'rgba(147,214,234,0.75)');
  rect(c, 7, 7, 2, 1, K);
  rect(c, 0, 6, 2, 1, K);
  rect(c, 14, 6, 2, 1, K);
  px(c, 3, 7, W);
  px(c, 11, 7, W);
});
def('cane', 'Walking cane', (c) => {
  rect(c, 8, 4, 2, 12, K);
  rect(c, 8, 5, 1, 10, ND);
  rect(c, 9, 5, 1, 10, N);
  rect(c, 4, 1, 6, 3, K);
  rect(c, 5, 2, 4, 1, Y);
  rect(c, 3, 2, 2, 3, K);
  rect(c, 4, 3, 1, 1, YD);
  rect(c, 8, 14, 2, 1, D);
});
def('pipe', 'Pipe', (c) => {
  rect(c, 2, 10, 12, 2, K);
  rect(c, 3, 10, 10, 1, N);
  rect(c, 9, 4, 5, 8, K);
  rect(c, 10, 5, 3, 6, ND);
  rect(c, 10, 5, 3, 2, '#3a3a44');
  px(c, 11, 3, 'rgba(200,210,220,0.8)');
  px(c, 12, 1, 'rgba(200,210,220,0.6)');
  px(c, 10, 2, 'rgba(200,210,220,0.5)');
});
def('gloves', 'Gloves', (c) => {
  for (const x of [1, 8]) {
    rect(c, x, 5, 7, 9, K);
    rect(c, x + 1, 6, 5, 8, x === 1 ? W : G);
    for (let i = 0; i < 4; i++) rect(c, x + i + (x === 1 ? 0 : 0), 2 + (i % 2), 1, 4, K);
    for (let i = 0; i < 4; i++) rect(c, x + 1 + i, 3 + (i % 2), 1, 3, x === 1 ? W : G);
    rect(c, x + 1, 13, 5, 1, YD);
  }
});
def('scarf', 'Scarf', (c) => {
  rect(c, 2, 3, 12, 4, K);
  rect(c, 3, 4, 10, 2, R);
  rect(c, 3, 4, 10, 1, '#ff8a80');
  rect(c, 9, 6, 4, 8, K);
  rect(c, 10, 7, 2, 6, R);
  for (let y = 8; y < 13; y += 2) rect(c, 10, y, 2, 1, W);
  for (let i = 0; i < 3; i++) px(c, 10 + i, 14, W);
});
def('handkerchief', 'Handkerchief', (c) => {
  rect(c, 2, 3, 12, 11, K);
  rect(c, 3, 4, 10, 9, W);
  rect(c, 3, 4, 10, 1, '#ffffff');
  rect(c, 4, 5, 8, 1, B);
  rect(c, 4, 12, 8, 1, B);
  disc(c, 8, 8, 1, R);
  px(c, 12, 12, WS);
});
def('fabric', 'Torn fabric', (c) => {
  rect(c, 2, 2, 12, 11, K);
  rect(c, 3, 3, 10, 9, '#5a3a8a');
  for (let i = 0; i < 5; i++) rect(c, 3, 4 + i * 2, 10, 1, '#7a5aaa');
  for (let x = 3; x < 13; x += 2) {
    px(c, x, 13, '#5a3a8a');
    px(c, x + 1, 14, '#5a3a8a');
  }
  px(c, 4, 6, Y);
});
def('thread', 'Red thread', (c) => {
  rect(c, 3, 1, 1, 4, M);
  rect(c, 3, 1, 1, 1, G);
  for (let i = 0; i < 12; i++) px(c, 4 + i, 4 + Math.round(Math.sin(i / 2) * 2) + 3, i % 2 ? R : '#ff7a70');
  rect(c, 12, 10, 3, 5, K);
  rect(c, 13, 11, 1, 3, R);
  px(c, 4, 11, R);
});
def('slipper', 'Slipper', (c) => {
  rect(c, 1, 8, 14, 6, K);
  rect(c, 2, 9, 12, 4, '#6a3a8a');
  rect(c, 2, 9, 12, 1, '#a070c0');
  rect(c, 2, 4, 7, 5, K);
  rect(c, 3, 5, 5, 3, '#6a3a8a');
  rect(c, 2, 13, 12, 1, D);
  disc(c, 12, 10, 1, P);
});
def('towel', 'Towel', (c) => {
  rect(c, 2, 2, 12, 12, K);
  rect(c, 3, 3, 10, 10, C);
  for (let i = 0; i < 4; i++) rect(c, 3, 4 + i * 3, 10, 1, '#f0fbff');
  for (let x = 3; x < 13; x += 2) px(c, x, 14, C);
  rect(c, 3, 3, 10, 1, W);
});
def('blanket', 'Blanket and flask', (c) => {
  rect(c, 1, 5, 14, 10, K);
  rect(c, 2, 6, 12, 8, '#b8503c');
  for (let x = 2; x < 14; x += 3) rect(c, x, 6, 1, 8, '#f0d488');
  for (let y = 7; y < 14; y += 3) rect(c, 2, y, 12, 1, '#f0d488');
  rect(c, 10, 1, 4, 5, K);
  rect(c, 11, 2, 2, 3, M);
});
def('chef_hat', 'Chef jacket', (c) => {
  disc(c, 5, 5, 3, K);
  disc(c, 8, 4, 3, K);
  disc(c, 11, 5, 3, K);
  rect(c, 3, 5, 10, 4, K);
  disc(c, 5, 5, 2, W);
  disc(c, 8, 4, 2, W);
  disc(c, 11, 5, 2, W);
  rect(c, 4, 5, 8, 4, W);
  rect(c, 3, 9, 10, 4, K);
  rect(c, 4, 9, 8, 3, WS);
  px(c, 6, 6, '#ffffff');
});
def('toothbrush', 'Toothbrush', (c) => {
  for (let i = 0; i < 11; i++) {
    rect(c, 2 + i, 12 - i, 2, 2, K);
    px(c, 2 + i, 12 - i, i < 3 ? W : B);
  }
  for (let i = 0; i < 4; i++) rect(c, 10 + i, 3 - (i % 2), 1, 3, W);
  rect(c, 10, 5, 5, 1, C);
});
def('perfume', 'Scented note', (c) => {
  rect(c, 5, 6, 8, 9, K);
  rect(c, 6, 7, 6, 7, '#f6d0e8');
  rect(c, 6, 7, 2, 7, '#ffffff');
  rect(c, 7, 3, 4, 3, K);
  rect(c, 8, 4, 2, 1, YD);
  rect(c, 8, 1, 2, 3, P);
  heart(c, 7, 9, P);
  px(c, 1, 3, P);
  px(c, 2, 2, P);
  px(c, 1, 6, P);
});
def('lavender', 'Lavender', (c) => {
  for (const [x, l] of [[4, 9], [8, 11], [12, 8]] as const) {
    rect(c, x, 15 - l, 1, l, ED);
    for (let i = 0; i < 5; i++) {
      rect(c, x - 1, 15 - l - i * 1, 3, 1, i % 2 ? U : '#b080d0');
    }
  }
  rect(c, 2, 13, 12, 1, YD);
});
def('candle', 'Candle', (c) => {
  rect(c, 5, 6, 6, 9, K);
  rect(c, 6, 7, 4, 7, '#f6f0d8');
  rect(c, 6, 7, 1, 7, '#ffffff');
  rect(c, 7, 4, 2, 2, K);
  rect(c, 7, 2, 2, 3, O);
  rect(c, 8, 1, 1, 3, Y);
  rect(c, 4, 14, 8, 2, YD);
});
def('lantern', 'Lantern', (c) => {
  ring(c, 8, 3, 3, K);
  rect(c, 4, 5, 8, 9, K);
  rect(c, 5, 6, 6, 7, '#ffd070');
  rect(c, 6, 8, 4, 4, '#fff2b0');
  rect(c, 7, 9, 2, 2, W);
  rect(c, 4, 5, 8, 1, D);
  rect(c, 4, 13, 8, 2, D);
  rect(c, 8, 6, 1, 7, K);
});
def('camera', 'Hidden camera', (c) => {
  rect(c, 1, 5, 14, 9, K);
  rect(c, 2, 6, 12, 7, D);
  rect(c, 2, 6, 12, 1, M);
  rect(c, 3, 3, 4, 3, K);
  rect(c, 4, 4, 2, 1, G);
  disc(c, 8, 9, 3, K);
  disc(c, 8, 9, 2, BD);
  px(c, 7, 8, '#8ad8ff');
  rect(c, 11, 7, 2, 1, R);
});
def('radio', 'Radio', (c) => {
  rect(c, 1, 5, 14, 10, K);
  rect(c, 2, 6, 12, 8, N);
  rect(c, 3, 7, 6, 5, YD);
  for (let y = 8; y < 12; y += 2) rect(c, 4, y, 4, 1, ND);
  disc(c, 12, 8, 1, G);
  disc(c, 12, 12, 1, G);
  rect(c, 11, 1, 1, 4, G);
  rect(c, 10, 1, 3, 1, G);
});
def('cards', 'Playing cards', (c) => {
  for (let i = 0; i < 3; i++) {
    const x = 1 + i * 4;
    rect(c, x, 3 + i, 8, 11, K);
    rect(c, x + 1, 4 + i, 6, 9, W);
  }
  px(c, 10, 8, R);
  px(c, 9, 9, R);
  px(c, 11, 9, R);
  px(c, 10, 10, R);
  px(c, 3, 5, K);
  px(c, 7, 6, K);
  px(c, 8, 5, K);
  px(c, 5, 8, K);
});
def('tracks', 'Tracks in snow', (c) => {
  rect(c, 0, 0, 16, 16, '#dcebf6');
  for (let y = 0; y < 16; y += 2) {
    rect(c, 3, y, 3, 1, '#9dbbd6');
    rect(c, 10, y, 3, 1, '#9dbbd6');
    if (y % 4 === 0) {
      rect(c, 4, y, 1, 1, '#7a9cbc');
      rect(c, 11, y, 1, 1, '#7a9cbc');
    }
  }
  for (const [x, y] of [[7, 3], [8, 8], [7, 13]] as const) rect(c, x, y, 2, 3, '#b8ccdc');
});
def('footprints', 'Muddy footprints', (c) => {
  for (const [x, y, f] of [[3, 2, 0], [9, 6, 1], [3, 10, 0]] as const) {
    rect(c, x, y, 4, 5, N);
    rect(c, x + (f ? 0 : 1), y + 5, 3, 3, ND);
    rect(c, x, y + 1, 1, 2, ND);
    px(c, x + 3, y + 1, ND);
    for (let i = 0; i < 3; i++) px(c, x + i, y - 1, ND);
  }
  px(c, 12, 12, N);
  px(c, 13, 13, N);
});
def('paw', 'Paw prints', (c) => {
  for (const [x, y] of [[2, 7], [9, 2], [9, 9]] as const) {
    disc(c, x + 2, y + 3, 2, ND);
    for (const [dx, dy] of [[-1, 0], [1, -1], [3, -1], [5, 0]] as const) rect(c, x + dx, y + dy, 1, 2, ND);
  }
  px(c, 4, 9, '#c8503c');
  px(c, 11, 11, '#c8503c');
});
def('stairs', 'Stairs', (c) => {
  for (let i = 0; i < 5; i++) {
    rect(c, 1 + i * 3, 3 + i * 2, 16 - 1 - i * 3, 13 - i * 2, K);
    rect(c, 2 + i * 3, 4 + i * 2, 14 - i * 3, 2, T);
    rect(c, 2 + i * 3, 6 + i * 2, 14 - i * 3, 1, N);
  }
});
def('door', 'Door', (c) => {
  rect(c, 3, 1, 10, 14, K);
  rect(c, 4, 2, 8, 13, N);
  rect(c, 5, 3, 3, 5, '#b8843c');
  rect(c, 9, 3, 2, 5, '#b8843c');
  rect(c, 5, 9, 6, 5, '#b8843c');
  disc(c, 10, 9, 1, Y);
  rect(c, 3, 15, 10, 1, D);
});
def('chair', 'Empty chair', (c) => {
  rect(c, 4, 1, 8, 7, K);
  rect(c, 5, 2, 6, 5, T);
  rect(c, 5, 2, 6, 1, '#f0d8a8');
  for (let x = 6; x < 11; x += 2) rect(c, x, 3, 1, 3, N);
  rect(c, 3, 8, 10, 3, K);
  rect(c, 4, 8, 8, 2, T);
  rect(c, 4, 11, 2, 4, K);
  rect(c, 10, 11, 2, 4, K);
  rect(c, 4, 11, 1, 3, N);
});
def('bust', 'Bronze bust', (c) => {
  rect(c, 4, 12, 8, 3, K);
  rect(c, 5, 12, 6, 2, '#a8a8b4');
  rect(c, 4, 8, 8, 4, K);
  rect(c, 5, 8, 6, 3, '#c88a44');
  disc(c, 8, 5, 4, K);
  disc(c, 8, 5, 3, '#c88a44');
  rect(c, 6, 3, 2, 2, '#e8b070');
  rect(c, 6, 5, 1, 1, K);
  rect(c, 9, 5, 1, 1, K);
  rect(c, 9, 2, 3, 3, '#7a4a28');
  px(c, 10, 3, '#5e3d22');
});
def('latch', 'Jammed latch', (c) => {
  rect(c, 1, 5, 14, 6, K);
  rect(c, 2, 6, 12, 4, M);
  rect(c, 2, 6, 12, 1, G);
  rect(c, 5, 3, 6, 3, K);
  rect(c, 6, 4, 4, 1, D);
  for (let i = 0; i < 5; i++) {
    px(c, 3 + i * 2, 11 + (i % 2), K);
    px(c, 4 + i * 2, 12 + (i % 2), '#3a3a44');
  }
  rect(c, 9, 7, 4, 2, R);
});
def('ski_pole', 'Ski pole', (c) => {
  for (let i = 0; i < 14; i++) px(c, 13 - i, 1 + i, K);
  for (let i = 0; i < 14; i++) px(c, 12 - i, 1 + i, i % 5 === 0 ? R : G);
  ring(c, 3, 12, 2, K);
  rect(c, 12, 0, 3, 3, K);
  rect(c, 13, 0, 2, 2, R);
  px(c, 3, 15, K);
});
def('ice_axe', 'Ice axe', (c) => {
  for (let i = 0; i < 11; i++) rect(c, 4 + i, 13 - i, 2, 2, K);
  for (let i = 0; i < 11; i++) px(c, 4 + i, 13 - i, i % 3 ? N : YD);
  rect(c, 8, 1, 6, 3, K);
  rect(c, 9, 2, 4, 1, G);
  rect(c, 12, 3, 3, 3, K);
  rect(c, 13, 3, 1, 2, M);
  px(c, 4, 14, D);
});
def('rope', 'Cut rope', (c) => {
  for (let i = 0; i < 6; i++) {
    rect(c, 1 + i * 2, 7 + Math.round(Math.sin(i) * 2), 3, 3, K);
    px(c, 2 + i * 2, 8 + Math.round(Math.sin(i) * 2), i % 2 ? T : '#f0d8a8');
  }
  for (let i = 0; i < 3; i++) {
    px(c, 12 + i, 5 - i, T);
    px(c, 13 + i, 6 - i, T);
  }
  rect(c, 6, 12, 8, 3, K);
  rect(c, 7, 13, 6, 1, '#c8c8d4');
  rect(c, 11, 12, 3, 3, K);
  px(c, 12, 13, G);
});
def('powder', 'Paper twist of powder', (c) => {
  rect(c, 3, 6, 10, 8, K);
  rect(c, 4, 7, 8, 6, W);
  rect(c, 4, 7, 8, 2, '#ffffff');
  for (const [x, y] of [[3, 3], [6, 2], [9, 3], [12, 2]] as const) rect(c, x, y, 2, 2, K);
  rect(c, 4, 3, 1, 2, W);
  rect(c, 7, 3, 1, 1, W);
  rect(c, 10, 4, 1, 1, W);
  px(c, 6, 9, WS);
  px(c, 9, 11, WS);
});
def('coins', 'Coins and wages', (c) => {
  disc(c, 5, 10, 4, K);
  disc(c, 5, 10, 3, Y);
  disc(c, 5, 10, 1, YD);
  disc(c, 11, 6, 4, K);
  disc(c, 11, 6, 3, Y);
  disc(c, 11, 6, 1, YD);
  px(c, 4, 8, '#fff2a0');
  px(c, 10, 4, '#fff2a0');
});
def('chocolate', 'Chocolate wrappers', (c) => {
  rect(c, 1, 5, 12, 8, K);
  rect(c, 2, 6, 10, 6, '#6a3a8a');
  rect(c, 2, 6, 10, 1, '#a070c0');
  rect(c, 4, 8, 6, 2, Y);
  rect(c, 12, 4, 3, 6, K);
  rect(c, 12, 5, 2, 4, '#c8a8e8');
  rect(c, 10, 11, 5, 3, K);
  rect(c, 11, 12, 3, 1, ND);
  px(c, 5, 3, '#c8a8e8');
});
def('hat', 'Hat', (c) => {
  rect(c, 4, 3, 8, 6, K);
  rect(c, 5, 4, 6, 4, '#6a4a2a');
  rect(c, 5, 7, 6, 1, R);
  rect(c, 1, 9, 14, 3, K);
  rect(c, 2, 9, 12, 2, '#7a5a3a');
  rect(c, 2, 9, 12, 1, '#a08050');
});
def('bottle', 'Bottle', (c) => {
  rect(c, 6, 1, 4, 4, K);
  rect(c, 7, 1, 2, 2, N);
  rect(c, 4, 5, 8, 10, K);
  rect(c, 5, 6, 6, 8, '#3a8a5a');
  rect(c, 5, 6, 2, 8, '#6ad090');
  rect(c, 5, 9, 6, 3, '#f0e8c8');
  rect(c, 6, 10, 4, 1, D);
});
def('sword', 'Blade', (c) => {
  for (let i = 0; i < 10; i++) {
    rect(c, 3 + i, 12 - i, 3, 3, K);
    px(c, 4 + i, 12 - i, W);
  }
  rect(c, 2, 11, 5, 2, YD);
  rect(c, 1, 13, 3, 3, ND);
});
def('magnifier', 'Magnifying glass', (c) => {
  ring(c, 6, 6, 5, K);
  ring(c, 6, 6, 4, YD);
  disc(c, 6, 6, 3, 'rgba(147,214,234,0.7)');
  px(c, 4, 4, '#ffffff');
  for (let i = 0; i < 5; i++) rect(c, 10 + i, 10 + i, 2, 2, K);
  for (let i = 0; i < 5; i++) px(c, 10 + i, 10 + i, N);
});

// ---- fallback families (deterministic tint from the clue text) -------------------------------------

const TINTS = ['#4b8bd0', '#d9453a', '#58ad57', '#b98a2a', '#8f52a8', '#ea7d2e', '#3aa8a8', '#c4587a'];
const family = (name: string, id: string, fn: (c: Ctx, t: string) => void): void => {
  for (let i = 0; i < TINTS.length; i++) def(`${id}:${i}`, name, (c) => fn(c, TINTS[i] as string));
};
family('Paper', 'gen-paper', (c, t) => {
  sheet(c, { lines: 3 });
  rect(c, 4, 10, 4, 2, t);
});
family('Box', 'gen-box', (c, t) => {
  rect(c, 2, 5, 12, 10, K);
  rect(c, 3, 6, 10, 8, t);
  rect(c, 3, 6, 10, 2, shade(t, 0.3));
  rect(c, 2, 4, 12, 3, K);
  rect(c, 3, 5, 10, 1, shade(t, 0.45));
  rect(c, 7, 9, 2, 3, W);
  rect(c, 3, 13, 10, 1, shade(t, -0.4));
});
family('Bag', 'gen-bag', (c, t) => {
  rect(c, 3, 5, 10, 10, K);
  rect(c, 4, 6, 8, 8, t);
  rect(c, 4, 6, 3, 8, shade(t, 0.3));
  rect(c, 4, 3, 8, 3, K);
  rect(c, 5, 4, 6, 1, shade(t, -0.4));
  rect(c, 6, 9, 4, 3, W);
  ring(c, 8, 2, 2, K);
});
family('Vessel', 'gen-bottle', (c, t) => {
  rect(c, 6, 1, 4, 4, K);
  rect(c, 4, 5, 8, 10, K);
  rect(c, 5, 6, 6, 8, t);
  rect(c, 5, 6, 2, 8, shade(t, 0.4));
  rect(c, 6, 9, 4, 2, W);
});
family('Tool', 'gen-tool', (c, t) => {
  for (let i = 0; i < 9; i++) {
    rect(c, 3 + i, 12 - i, 3, 3, K);
    px(c, 4 + i, 12 - i, i % 2 ? G : M);
  }
  disc(c, 12, 4, 3, K);
  disc(c, 12, 4, 2, t);
  px(c, 11, 3, W);
});
family('Trinket', 'gen-gem', (c, t) => {
  rect(c, 3, 4, 10, 3, K);
  for (let i = 0; i < 5; i++) rect(c, 3 + i, 6 + i, 10 - i * 2, 1, K);
  rect(c, 4, 5, 8, 2, t);
  for (let i = 0; i < 4; i++) rect(c, 4 + i, 7 + i, 8 - i * 2, 1, shade(t, -0.2 * i));
  rect(c, 5, 5, 2, 1, W);
  px(c, 2, 2, W);
  px(c, 13, 2, W);
});

// ---- redrawn for clarity (later definitions replace earlier ones) ------------------------------------

/** A straight-edged blade pointing right, tapering from (x0, top0..bot0) to a point at x1. */
const blade = (c: Ctx, x0: number, x1: number, top0: number, bot0: number, tipY: number): void => {
  for (let x = x0; x <= x1; x++) {
    const t = (x - x0) / Math.max(1, x1 - x0);
    const top = Math.round(top0 + (tipY - top0) * t * t);
    const bot = Math.round(bot0 + (tipY - bot0) * t);
    rect(c, x, top - 1, 1, 1, K);
    rect(c, x, bot + 1, 1, 1, K);
    rect(c, x, top, 1, bot - top + 1, G);
    px(c, x, top, W);
    px(c, x, bot, M);
  }
  rect(c, x1 + 1, tipY, 1, 1, K);
};
def('knife', 'Chef knife', (c) => {
  rect(c, 0, 6, 6, 5, K);
  rect(c, 1, 7, 4, 3, ND);
  rect(c, 1, 7, 4, 1, N);
  px(c, 2, 8, YD);
  px(c, 4, 8, YD);
  rect(c, 6, 4, 1, 8, K);
  rect(c, 6, 5, 1, 6, D);
  blade(c, 7, 14, 5, 10, 9);
});
def('letter_opener', 'Letter opener', (c) => {
  rect(c, 0, 7, 4, 3, K);
  rect(c, 1, 8, 2, 1, Y);
  rect(c, 4, 6, 1, 5, YD);
  blade(c, 5, 14, 7, 9, 8);
  px(c, 12, 8, R);
  px(c, 13, 8, R);
  px(c, 11, 9, RD);
  px(c, 14, 10, R);
  px(c, 14, 12, R);
});
def('sword', 'Blade', (c) => {
  rect(c, 0, 6, 3, 4, K);
  rect(c, 1, 7, 1, 2, ND);
  rect(c, 3, 4, 2, 8, YD);
  rect(c, 3, 4, 1, 8, Y);
  blade(c, 5, 15, 6, 9, 7);
});
def('handkerchief', 'Handkerchief', (c) => {
  rect(c, 2, 3, 12, 11, K);
  rect(c, 3, 4, 10, 9, W);
  rect(c, 3, 4, 10, 1, '#ffffff');
  for (let x = 3; x < 13; x += 2) {
    px(c, x, 5, B);
    px(c, x, 12, B);
  }
  for (let y = 6; y < 12; y += 2) {
    px(c, 4, y, B);
    px(c, 11, y, B);
  }
  for (let i = 0; i < 3; i++) px(c, 7 + i, 8 + (i % 2), '#c8b8e8');
  px(c, 12, 13, WS);
  px(c, 3, 12, WS);
});
def('glasses', 'Spectacles', (c) => {
  for (const cx of [4, 12]) {
    disc(c, cx, 8, 3, K);
    disc(c, cx, 8, 2, '#b8e4f4');
    px(c, cx - 1, 7, '#ffffff');
    px(c, cx, 6, WS);
  }
  rect(c, 7, 7, 2, 1, K);
  rect(c, 0, 6, 1, 2, K);
  rect(c, 15, 6, 1, 2, K);
  rect(c, 0, 5, 2, 1, K);
  rect(c, 14, 5, 2, 1, K);
});
def('gloves', 'Leather gloves', (c) => {
  // one glove, fingers up
  rect(c, 4, 12, 8, 4, K);
  rect(c, 5, 12, 6, 3, YD);
  rect(c, 3, 6, 10, 7, K);
  rect(c, 4, 7, 8, 5, N);
  rect(c, 4, 7, 8, 1, T);
  for (let i = 0; i < 4; i++) {
    rect(c, 3 + i * 2 + (i > 1 ? 1 : 0), 1 + (i === 0 || i === 3 ? 2 : 0) - (i === 1 || i === 2 ? 0 : 0), 2, 6, K);
    rect(c, 4 + i * 2 + (i > 1 ? 1 : 0) - 0, 2 + (i === 0 || i === 3 ? 2 : 0), 1, 5, N);
  }
  rect(c, 1, 8, 3, 3, K);
  rect(c, 2, 8, 2, 2, N);
  px(c, 6, 9, D);
  px(c, 9, 9, D);
});
def('scarf', 'Scarf', (c) => {
  // a knotted scarf: a wavy band with two hanging ends and fringe
  for (let x = 1; x < 15; x++) {
    const y = 4 + Math.round(Math.sin(x / 2.2) * 1.5);
    rect(c, x, y - 1, 1, 6, K);
    rect(c, x, y, 1, 4, x % 4 < 2 ? R : '#f4efe2');
    px(c, x, y, x % 4 < 2 ? '#ff8a80' : '#ffffff');
  }
  rect(c, 8, 8, 5, 7, K);
  rect(c, 9, 8, 3, 6, R);
  for (let y = 9; y < 14; y += 2) rect(c, 9, y, 3, 1, '#f4efe2');
  for (let x = 9; x < 12; x += 1) px(c, x, 15, x % 2 ? R : '#f4efe2');
  rect(c, 5, 8, 3, 5, K);
  rect(c, 6, 8, 1, 4, R);
});
def('tracks', 'Tracks in snow', (c) => {
  rect(c, 1, 1, 14, 14, K);
  rect(c, 2, 2, 12, 12, '#dcebf6');
  rect(c, 2, 2, 12, 1, W);
  for (let y = 3; y < 14; y += 2) {
    rect(c, 4, y, 2, 1, '#6f8aa8');
    rect(c, 10, y, 2, 1, '#6f8aa8');
    if (y % 4 === 3) {
      px(c, 3, y, '#9dbbd6');
      px(c, 6, y, '#9dbbd6');
      px(c, 9, y, '#9dbbd6');
      px(c, 12, y, '#9dbbd6');
    }
  }
  rect(c, 7, 6, 2, 3, '#9dbbd6');
});
def('rope', 'Cut rope', (c) => {
  ring(c, 7, 8, 5, K);
  ring(c, 7, 8, 4, T);
  ring(c, 7, 8, 3, '#b8925a');
  ring(c, 7, 8, 2, K);
  for (let i = 0; i < 8; i++) px(c, 7 + Math.round(Math.cos(i) * 4), 8 + Math.round(Math.sin(i) * 4), '#fff0c8');
  rect(c, 11, 10, 5, 3, K);
  rect(c, 11, 11, 4, 1, T);
  px(c, 15, 10, '#fff0c8');
  px(c, 15, 12, '#fff0c8');
  px(c, 15, 11, K);
});

void noise;

// ---- everyday things a hand-built case might hide (the matcher generalises beyond the generator's own corpus) --------

def('crowbar', 'Crowbar', (c) => {
  for (let i = 0; i < 10; i++) {
    rect(c, 3 + i, 12 - i, 3, 3, K);
    rect(c, 4 + i, 12 - i, 1, 1, i % 2 ? G : M);
  }
  rect(c, 11, 1, 4, 3, K);
  rect(c, 12, 2, 2, 1, G);
  rect(c, 1, 12, 4, 3, K);
  rect(c, 2, 13, 2, 1, G);
  px(c, 12, 2, R);
});
def('necklace', 'Necklace', (c) => {
  for (let i = 0; i <= 12; i++) {
    const x = 2 + i;
    const y = 3 + Math.round(Math.sin((i / 12) * Math.PI) * 6);
    rect(c, x, y, 2, 2, K);
    rect(c, x, y, 1, 1, i % 2 ? Y : YD);
  }
  disc(c, 8, 12, 3, K);
  disc(c, 8, 12, 2, C);
  px(c, 7, 11, W);
});
def('clock', 'Stopped clock', (c) => {
  disc(c, 8, 8, 7, K);
  disc(c, 8, 8, 6, W);
  for (const [x, y] of [[8, 3], [8, 13], [3, 8], [13, 8]] as const) px(c, x, y, K);
  rect(c, 8, 8, 1, -4 + 0, K);
  rect(c, 8, 4, 1, 5, K);
  rect(c, 8, 8, 4, 1, K);
  px(c, 8, 8, R);
  rect(c, 5, 2, 6, 1, YD);
  px(c, 4, 4, 'rgba(0,0,0,0.25)');
  rect(c, 10, 10, 1, 1, R);
});
def('window', 'Broken window', (c) => {
  rect(c, 2, 1, 12, 14, K);
  rect(c, 3, 2, 10, 12, ND);
  rect(c, 4, 3, 4, 5, C);
  rect(c, 9, 3, 3, 5, C);
  rect(c, 4, 9, 4, 4, C);
  rect(c, 9, 9, 3, 4, C);
  for (const [x, y] of [[9, 4], [10, 5], [11, 6], [10, 7], [9, 9], [11, 10], [10, 11]] as const) px(c, x, y, K);
  px(c, 11, 4, W);
  px(c, 5, 4, W);
});
def('cigarette', 'Cigarette end', (c) => {
  rect(c, 2, 9, 10, 3, K);
  rect(c, 3, 10, 8, 1, W);
  rect(c, 3, 10, 2, 1, N);
  rect(c, 11, 9, 3, 3, K);
  rect(c, 12, 10, 1, 1, O);
  px(c, 13, 10, R);
  px(c, 11, 6, WS);
  px(c, 12, 4, WS);
  px(c, 11, 2, G);
});
def('wire', 'Piano wire', (c) => {
  for (let r = 6; r >= 2; r -= 2) ring(c, 8, 8, r, r % 4 ? M : G);
  rect(c, 8, 8, 6, 1, M);
  rect(c, 13, 7, 2, 3, K);
  px(c, 14, 8, R);
});
