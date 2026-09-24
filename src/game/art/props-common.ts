/** Furniture and scenery every setting shares, painted in the setting's own materials. */
import { at, disc, dither, noise, OUT, px, rect, shade, speckle } from './draw';
import { def } from './registry';

// ---- seating and tables ---------------------------------------------------------------------------

def('table', (c, S, _f, v) => {
  rect(c, 2, 12, 2, 4, S.wood[2]);
  rect(c, 12, 12, 2, 4, S.wood[2]);
  rect(c, 0, 4, 16, 9, OUT);
  if (v === 1) {
    rect(c, 1, 5, 14, 7, S.wood[0]);
    rect(c, 1, 5, 14, 1, shade(S.wood[0], 0.35));
    rect(c, 3, 8, 10, 1, S.wood[1]);
  } else {
    const cl = v === 2 ? S.cloth[1] : S.cloth[0];
    rect(c, 1, 5, 14, 7, cl);
    rect(c, 1, 5, 14, 1, shade(cl, 0.35));
    rect(c, 1, 11, 14, 1, shade(cl, -0.3));
    rect(c, 6, 7, 4, 2, '#e8e2d2');
    px(c, 7, 7, '#ffffff');
  }
}, { flavor: ['A sturdy table. Nothing on it but a ring from a glass.', 'You run a finger along the table. Dust.'] });

def('chair', (c, S, _f, v) => {
  rect(c, 4, 2, 8, 6, OUT);
  rect(c, 5, 3, 6, 4, at(S.wood, v));
  rect(c, 3, 8, 10, 4, OUT);
  rect(c, 4, 8, 8, 3, S.cloth[0]);
  rect(c, 4, 8, 8, 1, shade(S.cloth[0], 0.3));
  rect(c, 4, 12, 2, 3, S.wood[2]);
  rect(c, 10, 12, 2, 3, S.wood[2]);
}, { flavor: ['An empty chair. Still slightly warm?'] });

def('stool', (c, S) => {
  rect(c, 3, 6, 10, 4, OUT);
  rect(c, 4, 6, 8, 3, S.cloth[0]);
  rect(c, 4, 6, 8, 1, shade(S.cloth[0], 0.35));
  rect(c, 7, 10, 2, 5, S.metal[1]);
  rect(c, 4, 14, 8, 1, S.metal[2]);
}, { flavor: ['A bar stool. Its cushion has taken the shape of someone regular.'] });

def('sofa', (c, S, _f, v) => {
  const col = at(S.cloth, v);
  rect(c, 0, 3, 16, 12, OUT);
  rect(c, 1, 4, 14, 5, col);
  rect(c, 1, 4, 14, 1, shade(col, 0.3));
  rect(c, 3, 8, 10, 6, shade(col, 0.1));
  rect(c, 1, 8, 2, 6, col);
  rect(c, 13, 8, 2, 6, col);
  rect(c, 3, 8, 10, 1, shade(col, 0.4));
  rect(c, 8, 8, 1, 6, shade(col, -0.25));
}, { flavor: ['A comfortable sofa. You resist the urge to sit.', 'Deep cushions. Something small is lodged behind them: a button, nothing more.'] });

def('armchair', (c, S, _f, v) => {
  const col = at(S.cloth, v);
  rect(c, 2, 2, 12, 13, OUT);
  rect(c, 3, 3, 10, 5, col);
  rect(c, 3, 3, 10, 1, shade(col, 0.3));
  rect(c, 3, 8, 10, 6, shade(col, 0.12));
  rect(c, 2, 7, 2, 7, col);
  rect(c, 12, 7, 2, 7, col);
  rect(c, 4, 14, 2, 1, S.wood[2]);
  rect(c, 10, 14, 2, 1, S.wood[2]);
}, { flavor: ['A deep armchair with a permanent dent. Whoever sat here stayed a while.'] });

def('bench', (c, S) => {
  rect(c, 1, 5, 14, 3, OUT);
  rect(c, 2, 5, 12, 2, S.wood[0]);
  rect(c, 1, 9, 14, 3, OUT);
  rect(c, 2, 9, 12, 2, S.wood[1]);
  rect(c, 2, 12, 2, 3, OUT);
  rect(c, 12, 12, 2, 3, OUT);
}, { flavor: ['A bench. Someone has carved initials into it, long ago.'] });

def('bed', (c, S, _f, v) => {
  rect(c, 1, 1, 14, 15, S.wood[2]);
  rect(c, 2, 2, 12, 13, '#f0e8e0');
  rect(c, 3, 3, 10, 3, '#ffffff');
  const col = at(S.cloth, v);
  rect(c, 2, 7, 12, 8, col);
  rect(c, 2, 7, 12, 1, shade(col, 0.35));
  rect(c, 2, 14, 12, 1, shade(col, -0.3));
}, { flavor: ['A bed, neatly made. Somebody has been careful.', 'The blanket is tucked with military precision.'] });

def('bunk', (c, S, _f, v) => {
  rect(c, 0, 1, 16, 15, S.metal[2]);
  rect(c, 1, 2, 14, 6, '#e8e4dc');
  rect(c, 1, 2, 5, 3, '#ffffff');
  rect(c, 6, 2, 9, 6, at(S.cloth, v));
  rect(c, 1, 9, 14, 6, '#d8d4cc');
  rect(c, 6, 9, 9, 6, at(S.cloth, v + 1));
  rect(c, 1, 8, 14, 1, S.metal[0]);
  rect(c, 0, 1, 1, 15, S.metal[0]);
  rect(c, 15, 1, 1, 15, S.metal[0]);
}, { flavor: ['A bunk with a name taped above it. The pillow has not been slept on tonight.', 'Two mattresses, one thin blanket, and a paperback that has been read to pieces.'] });

// ---- storage ---------------------------------------------------------------------------------------

def('barrel', (c, S) => {
  rect(c, 2, 2, 12, 14, OUT);
  rect(c, 3, 3, 10, 12, S.wood[0]);
  rect(c, 3, 3, 10, 2, shade(S.wood[0], 0.25));
  rect(c, 3, 6, 10, 1, S.metal[2]);
  rect(c, 3, 11, 10, 1, S.metal[2]);
  rect(c, 5, 3, 1, 12, S.wood[1]);
  rect(c, 10, 3, 1, 12, S.wood[1]);
}, { flavor: ['A barrel. It sloshes, but you decide not to open it.', 'A barrel. Sealed tight.'] });

def('crate', (c, S) => {
  rect(c, 1, 3, 14, 13, OUT);
  rect(c, 2, 4, 12, 11, S.wood[0]);
  rect(c, 2, 7, 12, 1, S.wood[2]);
  rect(c, 2, 11, 12, 1, S.wood[2]);
  rect(c, 2, 4, 2, 11, S.wood[1]);
  rect(c, 12, 4, 2, 11, S.wood[1]);
  rect(c, 6, 5, 4, 1, S.wood[2]);
}, { flavor: ['A crate marked FRAGILE. It is fragile.', 'A crate of odds and ends. Nothing useful.'] });

def('trunk', (c, S, _f, v) => {
  const col = at([S.wood[1], S.cloth[0], '#5a4a3a'], v);
  rect(c, 1, 4, 14, 12, OUT);
  rect(c, 2, 5, 12, 10, col);
  rect(c, 2, 5, 12, 2, shade(col, 0.28));
  rect(c, 2, 9, 12, 1, S.metal[0]);
  rect(c, 7, 8, 2, 3, S.metal[0]);
  rect(c, 3, 5, 1, 10, S.metal[1]);
  rect(c, 12, 5, 1, 10, S.metal[1]);
}, { flavor: ['A steamer trunk with somebody\'s initials. Locked. Or perhaps just stubborn.', 'Travel stickers from six cities. None of them look happy.'] });

def('cabinet', (c, S) => {
  rect(c, 1, 1, 14, 15, OUT);
  rect(c, 2, 2, 12, 13, S.wood[1]);
  rect(c, 3, 3, 4, 11, S.wood[0]);
  rect(c, 9, 3, 4, 11, S.wood[0]);
  rect(c, 3, 3, 4, 1, shade(S.wood[0], 0.3));
  rect(c, 9, 3, 4, 1, shade(S.wood[0], 0.3));
  px(c, 6, 8, S.metal[0]);
  px(c, 9, 8, S.metal[0]);
}, { flavor: ['Locked. The key is probably in somebody\'s pocket.', 'You rattle the handle. It rattles back.'], wall: true });

def('shelf', (c, S, _f, v) => {
  rect(c, 0, 0, 16, 16, S.wood[2]);
  rect(c, 1, 1, 14, 14, shade(S.wood[2], -0.35));
  const cols = [S.cloth[0], S.cloth[2], '#3a8a5a', '#c8a040', '#8a4aa0', '#d8d0c0'];
  for (const y of [2, 7, 12]) {
    rect(c, 1, y + 3, 14, 1, S.wood[1]);
    let x = 2;
    for (let i = 0; x < 14; i++) {
      const w = 1 + Math.floor(noise(i + y, v, 9) * 2);
      const h = 2 + Math.floor(noise(i, y, 10) * 2);
      rect(c, x, y + 3 - h, w, h, cols[Math.floor(noise(i, y + v, 11) * 6)] as string);
      x += w + (noise(i, y, 12) > 0.85 ? 1 : 0);
    }
  }
}, { flavor: ['Shelves of dusty books. Nothing out of place.', 'You skim the spines. Nobody has read these lately.', 'Every book is in order. Almost suspiciously so.'], wall: true });

def('counter', (c, S, _f, v) => {
  const metal = S.id === 'restaurant' || S.id === 'station';
  rect(c, 0, 3, 16, 13, OUT);
  if (metal) {
    rect(c, 0, 4, 16, 3, '#eef2f4');
    rect(c, 0, 7, 16, 8, S.metal[1]);
    rect(c, 1, 8, 6, 6, S.metal[0]);
    rect(c, 9, 8, 6, 6, S.metal[0]);
    rect(c, 3, 10, 2, 1, S.metal[2]);
    rect(c, 11, 10, 2, 1, S.metal[2]);
  } else {
    rect(c, 0, 4, 16, 3, S.wood[0]);
    rect(c, 0, 4, 16, 1, shade(S.wood[0], 0.35));
    rect(c, 0, 7, 16, 8, S.wood[1]);
    rect(c, 3, 9, 4, 5, S.wood[2]);
    rect(c, 9, 9, 4, 5, S.wood[2]);
    px(c, 6, 11, S.accent);
    px(c, 9, 11, S.accent);
  }
  if (v === 1) {
    rect(c, 3, 2, 3, 2, '#c8c8d0');
    rect(c, 10, 1, 2, 3, '#7a3a2a');
  }
}, { flavor: ['A spotless counter. Suspiciously spotless.', 'The counter has been wiped down recently.'] });

def('desk', (c, S) => {
  rect(c, 0, 3, 16, 13, OUT);
  rect(c, 1, 4, 14, 4, S.wood[0]);
  rect(c, 1, 4, 14, 1, shade(S.wood[0], 0.35));
  rect(c, 1, 8, 14, 7, S.wood[1]);
  rect(c, 3, 9, 4, 5, S.wood[2]);
  rect(c, 9, 9, 4, 5, S.wood[2]);
  px(c, 5, 11, S.accent);
  px(c, 10, 11, S.accent);
  rect(c, 4, 5, 3, 2, '#f0eadc');
  rect(c, 10, 5, 2, 2, '#3a3a44');
}, { flavor: ['A desk with a blotter and an empty inkwell. Nothing of interest.', 'The drawers are locked or empty. Nothing here.'] });

// ---- decoration ------------------------------------------------------------------------------------

def('plant', (c) => {
  disc(c, 8, 5, 4, '#2f7c36');
  disc(c, 5, 7, 3, '#3f9a45');
  disc(c, 11, 7, 3, '#3f9a45');
  disc(c, 7, 4, 2, '#63bd5a');
  rect(c, 4, 10, 8, 6, OUT);
  rect(c, 5, 10, 6, 5, '#b8683a');
  rect(c, 5, 10, 6, 1, '#d88a5a');
}, { flavor: ['A potted plant. Someone has been overwatering it.', 'A fern. It looks like it has seen things.'] });

def('palm', (c, S) => {
  rect(c, 7, 6, 2, 8, '#7a5a3a');
  rect(c, 7, 6, 1, 8, '#5a4028');
  for (const [x, y, w] of [[1, 3, 6], [9, 3, 6], [3, 1, 5], [8, 1, 5], [5, 4, 6]] as const) rect(c, x, y, w, 2, '#3f9a45');
  rect(c, 2, 4, 4, 1, '#2f7c36');
  rect(c, 10, 4, 4, 1, '#2f7c36');
  rect(c, 6, 2, 4, 1, '#63bd5a');
  rect(c, 5, 13, 6, 3, S.id === 'studio' ? '#c8a070' : '#b8683a');
}, { flavor: ['A palm tree. Real, unlike most things in this place.', 'A palm. It sways as if it has been directed to.'] });

def('statue', (c, S, _f, v) => {
  const stone = S.id === 'gallery' ? '#f2f0ea' : '#e0e0e8';
  rect(c, 3, 11, 10, 5, OUT);
  rect(c, 4, 12, 8, 3, '#bcbcc6');
  rect(c, 5, 4, 6, 8, OUT);
  rect(c, 6, 5, 4, 6, stone);
  disc(c, 8, 3, 2, stone);
  if (v === 1) {
    // a bust
    rect(c, 5, 5, 6, 2, stone);
  }
  rect(c, 5, 6, 1, 3, stone);
  rect(c, 10, 6, 1, 3, stone);
}, { flavor: ['A marble statue. It offers no comment.', 'The statue stares straight ahead. No help there.'] });

def('lamp', (c, S) => {
  rect(c, 7, 5, 2, 11, '#3a3a46');
  rect(c, 5, 1, 6, 5, OUT);
  rect(c, 6, 2, 4, 3, S.glow);
  rect(c, 5, 15, 6, 1, '#3a3a46');
}, { flavor: ['A lamp. It flickers, then steadies.'], light: { r: 34, color: '#ffd98a', flicker: 0.1 } });

def('lamppost', (c, S, f) => {
  rect(c, 7, 6, 2, 10, '#2c2c38');
  rect(c, 5, 15, 6, 1, '#2c2c38');
  rect(c, 5, 1, 6, 6, OUT);
  rect(c, 6, 2, 4, 4, S.glow);
  rect(c, 6, 2, 4, 1, '#ffffff');
  rect(c, 4, 0, 8, 1, '#2c2c38');
  if (f % 30 > 26) rect(c, 6, 2, 4, 4, shade(S.glow, -0.25));
}, { flavor: ['A street lamp with a moth for company.'], light: { r: 46, color: '#ffe0a0', flicker: 0.06 }, anim: [30, 1] });

def('fireplace', (c, S, f) => {
  rect(c, 1, 0, 14, 16, S.id === 'lodge' ? '#8a8a94' : '#8a6a4a');
  rect(c, 0, 1, 16, 3, S.id === 'lodge' ? '#5c5c66' : '#6c4c30');
  rect(c, 3, 4, 10, 12, '#26262c');
  const fl = f % 4;
  rect(c, 6, 10, 4, 5, '#e8742c');
  rect(c, 7, 8 - (fl % 2), 2, 4, '#f8c840');
  rect(c, 7, 12, 2, 3, '#fff0a0');
  if (fl > 1) px(c, 5 + fl, 9, '#f8c840');
  for (let y = 5; y < 16; y += 4) rect(c, 1, y, 2, 1, '#5c4230');
}, { flavor: ['The fire crackles. Somebody was burning something other than logs.', 'Warm. The ashes have been raked over more than once.'], anim: [4, 8], light: { r: 58, color: '#ff9a4a', flicker: 0.3 }, wall: true });

def('painting', (c, S, _f, v) => {
  rect(c, 3, 1, 10, 9, S.metal[0]);
  rect(c, 4, 2, 8, 7, v % 2 ? '#88b8e0' : '#e8dcc0');
  if (v % 2) {
    rect(c, 4, 6, 8, 3, '#5a9a4a');
    disc(c, 10, 4, 1, '#f8e060');
  } else {
    disc(c, 8, 5, 2, '#d8a880');
    rect(c, 6, 7, 5, 2, '#5a3a60');
  }
}, { flavor: ['A portrait with eyes that seem to follow you.', 'A landscape painting. Nothing hidden behind it.'], wall: true });

def('mirror', (c, S) => {
  rect(c, 3, 0, 10, 12, S.metal[0]);
  rect(c, 4, 1, 8, 10, '#cfe2ee');
  rect(c, 4, 1, 8, 2, '#f4fbff');
  for (let i = 0; i < 4; i++) px(c, 5 + i * 2, 3 + i, '#ffffff');
}, { flavor: ['Your reflection looks like it has had a long night too.', 'The mirror shows a detective who is definitely on to something.'], wall: true });

def('piano', (c) => {
  rect(c, 0, 2, 16, 13, OUT);
  rect(c, 1, 3, 14, 7, '#2a2a34');
  rect(c, 2, 4, 12, 1, '#565664');
  rect(c, 1, 10, 14, 4, '#f4f4f0');
  for (let x = 3; x < 14; x += 3) rect(c, x, 10, 1, 2, '#242430');
  rect(c, 2, 14, 2, 2, OUT);
  rect(c, 12, 14, 2, 2, OUT);
}, { flavor: ['You press a key. It plays a sour note, and you decide to stop.'], sfx: 'piano' });

def('stove', (c, S) => {
  rect(c, 1, 3, 14, 13, OUT);
  rect(c, 2, 4, 12, 11, S.metal[1]);
  rect(c, 3, 5, 4, 3, '#26262c');
  rect(c, 9, 5, 4, 3, '#26262c');
  rect(c, 3, 9, 10, 5, '#3c3c46');
  rect(c, 4, 10, 8, 3, S.metal[0]);
  px(c, 4, 6, '#ff7a3a');
  px(c, 10, 6, '#ff7a3a');
}, { flavor: ['The stove is cold. Nobody has cooked here tonight.'] });

def('fountain', (c, S) => {
  disc(c, 8, 9, 7, OUT);
  disc(c, 8, 9, 6, '#b4b4c0');
  disc(c, 8, 9, 5, S.water[2]);
  rect(c, 7, 3, 2, 7, '#dcdce4');
  rect(c, 6, 2, 4, 2, '#b4e4ff');
  rect(c, 5, 8, 1, 1, '#ffffff');
}, { flavor: ['A fountain. You spot a few coins, but no clues.'], anim: [4, 10] });

def('urn', (c, S) => {
  rect(c, 4, 12, 8, 3, OUT);
  rect(c, 5, 6, 6, 7, OUT);
  rect(c, 6, 7, 4, 5, '#c4b8a0');
  rect(c, 6, 7, 1, 5, '#e4dcc8');
  rect(c, 5, 4, 6, 3, OUT);
  rect(c, 6, 5, 4, 1, '#d8ccb0');
  rect(c, 5, 13, 6, 2, '#a4987e');
  void S;
}, { flavor: ['An urn. The label reads "Ashes of a dull afternoon". Probably a joke.'] });

def('clock', (c, S) => {
  rect(c, 4, 0, 8, 16, OUT);
  rect(c, 5, 1, 6, 14, S.wood[1]);
  rect(c, 5, 1, 6, 1, S.wood[0]);
  disc(c, 8, 5, 2, '#f0e8d0');
  rect(c, 8, 3, 1, 2, OUT);
  rect(c, 8, 5, 2, 1, OUT);
  rect(c, 6, 9, 4, 5, '#3a2a1c');
  rect(c, 8, 9, 1, 4, '#d6b458');
}, { flavor: ['The clock has stopped. Ten past something. It will not say what.', 'Tick. Tick. Somebody wound it very recently.'], anim: [2, 30] });

def('globe', (c, S) => {
  rect(c, 6, 12, 4, 3, S.wood[2]);
  rect(c, 7, 9, 2, 4, S.metal[1]);
  disc(c, 8, 6, 5, OUT);
  disc(c, 8, 6, 4, '#4a86c0');
  rect(c, 6, 4, 3, 2, '#5aa050');
  rect(c, 9, 7, 2, 3, '#5aa050');
  px(c, 6, 4, '#8fdc70');
}, { flavor: ['You spin the globe. Your finger lands on a country that no longer exists.'] });

def('topiary', (c) => {
  rect(c, 7, 12, 2, 3, '#5a3a1c');
  disc(c, 8, 9, 4, '#2f7c36');
  disc(c, 8, 4, 3, '#2f7c36');
  disc(c, 7, 8, 2, '#3f9a45');
  disc(c, 7, 3, 1, '#63bd5a');
  rect(c, 5, 14, 6, 2, '#b8683a');
}, { flavor: ['Clipped into a shape that is either a swan or a very ambitious teapot.'] });

// ---- outdoors --------------------------------------------------------------------------------------

def('tree', (c, S) => {
  rect(c, 6, 11, 4, 5, '#7a4a24');
  rect(c, 6, 11, 1, 5, '#5c3618');
  const dusk = S.id === 'manor' || S.id === 'theatre';
  disc(c, 8, 7, 7, dusk ? '#245a2c' : '#2f7c36');
  disc(c, 8, 7, 6, dusk ? '#2f7a38' : '#3f9a45');
  disc(c, 6, 5, 3, dusk ? '#4a9a48' : '#63bd5a');
  rect(c, 10, 8, 3, 1, dusk ? '#245a2c' : '#2f7c36');
  rect(c, 4, 9, 3, 1, dusk ? '#245a2c' : '#2f7c36');
}, { flavor: ['A tall tree. Nothing hiding in the branches.', 'Leaves rustle. Nothing else.'] });

def('bush', (c, _S, _f, v) => {
  disc(c, 8, 10, 6, '#2f7c36');
  disc(c, 8, 10, 5, '#3f9a45');
  disc(c, 6, 8, 2, '#63bd5a');
  if (v === 1) rect(c, 10, 9, 2, 2, '#ee6a8a');
}, { flavor: ['A neatly clipped hedge. Nothing suspicious.', 'You poke the bush. It pokes back, slightly.'] });

def('hedge', (c, S) => {
  const dusk = S.id === 'manor';
  rect(c, 0, 3, 16, 13, OUT);
  rect(c, 0, 4, 16, 11, dusk ? '#2f6a34' : '#3f9a45');
  rect(c, 0, 4, 16, 3, dusk ? '#3f8a44' : '#63bd5a');
  for (let x = 1; x < 16; x += 3) px(c, x, 8 + (x % 2), dusk ? '#245a2c' : '#2f7c36');
  dither(c, 0, 10, 16, 4, dusk ? '#245a2c' : '#2f7c36', 0);
}, { flavor: ['A hedge, clipped with alarming precision.'] });

def('pine', (c, S) => {
  const snow = S.id === 'lodge' || S.id === 'station' || S.id === 'train';
  rect(c, 7, 12, 2, 4, '#5a3a1c');
  const g = snow ? '#1f4a3a' : '#2a6a3a';
  for (const [y, w] of [[10, 12], [6, 10], [2, 6]] as const) {
    rect(c, 8 - w / 2, y, w, 4, g);
    rect(c, 8 - w / 2, y, w, 1, shade(g, 0.25));
    if (snow) {
      rect(c, 8 - w / 2 + 1, y, w - 2, 1, '#f4f8fb');
      px(c, 8 - w / 2 + 2, y + 1, '#dfeaf3');
    }
  }
}, { flavor: ['A tall pine, heavy with snow. It shakes off a little as you pass.', 'Pine needles and silence. The forest keeps its own counsel.'] });

def('fence', (c, S) => {
  rect(c, 0, 5, 16, 2, S.id === 'studio' ? '#8a8a94' : '#e8e0cc');
  rect(c, 0, 10, 16, 2, S.id === 'studio' ? '#8a8a94' : '#e8e0cc');
  for (let x = 1; x < 16; x += 5) rect(c, x, 2, 2, 13, S.id === 'studio' ? '#6c6c78' : '#d6ceb8');
  rect(c, 0, 12, 16, 1, 'rgba(0,0,0,0.25)');
}, { flavor: ['A fence. It has been painted more often than it has been leaned on.'] });

def('sign', (c) => {
  rect(c, 7, 9, 2, 7, '#6a4424');
  rect(c, 1, 2, 14, 8, OUT);
  rect(c, 2, 3, 12, 6, '#dbb476');
  rect(c, 4, 4, 8, 1, '#7a4a24');
  rect(c, 4, 6, 6, 1, '#7a4a24');
}, { flavor: [] });

def('rope_post', (c, S) => {
  rect(c, 7, 4, 2, 11, S.metal[0]);
  rect(c, 6, 3, 4, 2, S.metal[0]);
  rect(c, 5, 14, 6, 2, S.metal[2]);
  rect(c, 0, 5, 6, 1, S.cloth[2]);
  rect(c, 10, 5, 6, 1, S.cloth[2]);
  px(c, 8, 3, '#ffffff');
}, { flavor: ['A velvet rope. It protects nothing at the moment.'] });

def('bollard', (c, S) => {
  rect(c, 5, 9, 6, 6, OUT);
  rect(c, 6, 5, 4, 6, OUT);
  rect(c, 6, 6, 4, 5, S.metal[1]);
  rect(c, 7, 6, 1, 5, S.metal[0]);
  rect(c, 5, 5, 6, 2, S.metal[0]);
}, { flavor: ['A mooring post, rubbed shiny by ropes.'] });

speckle; dither;
