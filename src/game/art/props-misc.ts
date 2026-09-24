/** Everything else that gives a setting its accent: train, gallery, restaurant, village fete and country house. */
import { disc, dither, noise, OUT, px, rect, ring, shade, speckle } from './draw';
import { def } from './registry';

// ---- railway --------------------------------------------------------------------------------------

def('coal_pile', (c) => {
  disc(c, 8, 11, 6, OUT);
  for (let i = 0; i < 16; i++) {
    const x = 3 + Math.floor(noise(i, 1, 81) * 10);
    const y = 6 + Math.floor(noise(i, 2, 81) * 8);
    rect(c, x, y, 2, 2, i % 3 ? '#2c2c38' : '#4a4a5c');
  }
  px(c, 6, 8, '#8a8a9c');
}, { flavor: ['A heap of coal. Black dust rises when you step near. There are boot prints in it, going one way only.'] });

def('signal', (c, S, f) => {
  rect(c, 7, 4, 2, 12, '#3a3a46');
  rect(c, 4, 1, 8, 6, OUT);
  disc(c, 8, 3, 1, f % 40 < 20 ? '#ff3a30' : '#7a2020');
  disc(c, 8, 6, 1, f % 40 < 20 ? '#2a5a2a' : '#5be86a');
  rect(c, 5, 14, 6, 2, '#3a3a46');
  void S;
}, { flavor: ['A signal lamp swinging between red and green. Somebody told the train to stop, and somebody told it to run.'], anim: [40, 1], light: { r: 22, color: '#ff5a4a', flicker: 0 } });

def('telegraph', (c, S) => {
  rect(c, 7, 0, 2, 16, S.wood[1]);
  rect(c, 7, 0, 1, 16, S.wood[0]);
  rect(c, 2, 2, 12, 2, S.wood[1]);
  rect(c, 3, 1, 2, 1, '#c8d8e8');
  rect(c, 11, 1, 2, 1, '#c8d8e8');
  rect(c, 3, 6, 10, 1, S.wood[1]);
  rect(c, 5, 15, 6, 1, '#2a2a34');
}, { flavor: ['A telegraph pole. The wires hum with news, or with a very long night.'] });

def('hat_box', (c, S, _f, v) => {
  const col = ['#c23c3c', '#3a5a8a', '#e8dcc0'][v % 3] as string;
  rect(c, 2, 7, 12, 9, OUT);
  rect(c, 3, 8, 10, 7, col);
  rect(c, 3, 8, 10, 2, shade(col, 0.3));
  rect(c, 1, 5, 14, 3, OUT);
  rect(c, 2, 6, 12, 2, shade(col, 0.15));
  rect(c, 6, 10, 4, 4, S.accent);
}, { flavor: ['A hat box. Inside, not a hat but a glove, a single letter, and a pressed violet.'] });

def('firebox', (c, S, f) => {
  rect(c, 0, 0, 16, 16, '#242430');
  rect(c, 2, 4, 12, 11, OUT);
  rect(c, 3, 5, 10, 9, (f >> 1) % 2 ? '#ff8a30' : '#ff6a20');
  rect(c, 4, 6, 8, 5, '#ffd060');
  rect(c, 6, 7, 4, 3, '#fff2b0');
  rect(c, 0, 0, 16, 3, S.metal[2]);
  rect(c, 0, 14, 16, 2, '#3a3a46');
}, { flavor: ['The firebox roars. Whoever shovelled tonight was in a hurry, and spilled half the coal.', 'You feel the heat on your face even from here. Something small and metallic glints in the ash.'], anim: [4, 5], light: { r: 52, color: '#ff8a30', flicker: 0.35 }, wall: false });

// ---- gallery and restaurant -----------------------------------------------------------------------

def('art_frame', (c, S, _f, v) => {
  const k = v % 6;
  rect(c, 2, 0, 12, 11, k % 2 ? '#1c1c24' : '#e8e4dc');
  rect(c, 3, 1, 10, 9, '#f4f2ee');
  const cols = ['#d84a3c', '#3f79bd', '#f0c030', '#1c1c24', '#4aa56a', '#8a4aa0'];
  const a = cols[k] as string;
  const b = cols[(k + 2) % 6] as string;
  if (k === 0) { rect(c, 4, 2, 8, 3, a); rect(c, 4, 6, 4, 3, b); }
  else if (k === 1) { disc(c, 8, 5, 3, a); rect(c, 4, 8, 8, 1, b); }
  else if (k === 2) { for (let i = 0; i < 4; i++) rect(c, 4 + i * 2, 2, 1, 7, i % 2 ? a : b); }
  else if (k === 3) { rect(c, 4, 2, 8, 1, a); rect(c, 4, 5, 8, 1, a); rect(c, 4, 8, 8, 1, a); disc(c, 8, 5, 1, '#d84a3c'); }
  else if (k === 4) { for (let i = 0; i < 5; i++) rect(c, 4 + ((i * 3) % 6), 2 + i, 3, 1, i % 2 ? a : b); }
  else { rect(c, 5, 3, 6, 5, a); rect(c, 7, 5, 2, 2, '#f4f2ee'); }
  rect(c, 3, 11, 10, 1, 'rgba(0,0,0,0.2)');
  void S;
}, { flavor: ['An abstract canvas. The label reads "Untitled (Guilt), oil on nothing". Somebody has straightened it.', 'A painting worth more than the building. A single drop of something red has fallen below it.'], wall: true });

def('plinth', (c, S, _f, v) => {
  rect(c, 4, 10, 8, 6, OUT);
  rect(c, 5, 11, 6, 4, '#f0efe8');
  rect(c, 5, 11, 6, 1, '#ffffff');
  const k = v % 4;
  if (k === 0) { disc(c, 8, 6, 4, '#c8a040'); disc(c, 8, 6, 2, '#f0e08a'); }
  else if (k === 1) { rect(c, 6, 1, 4, 9, S.metal[1]); rect(c, 4, 4, 8, 2, S.metal[0]); px(c, 7, 2, '#ffffff'); }
  else if (k === 2) { for (const [x, y] of [[5, 6], [8, 3], [10, 7], [7, 8]] as const) rect(c, x, y, 3, 3, ['#d84a3c', '#3f79bd', '#f0c030'][(x + y) % 3] as string); }
  else { disc(c, 8, 6, 3, '#1c1c24'); rect(c, 7, 1, 2, 4, '#1c1c24'); px(c, 7, 5, '#5a5a6a'); }
}, { flavor: ['A sculpture the plaque calls "Yearning". It looks like a coat hanger having a feeling.', 'Do NOT touch, the sign says. You touch nothing. Your fingers itch.', 'Abstract, and worth a fortune, and slightly crooked on its plinth.'] });

def('gallery_bench', (c, S) => {
  rect(c, 1, 6, 14, 5, OUT);
  rect(c, 2, 6, 12, 4, '#2a2a32');
  rect(c, 2, 6, 12, 1, '#5a5a66');
  rect(c, 2, 11, 2, 4, OUT);
  rect(c, 12, 11, 2, 4, OUT);
  void S;
}, { flavor: ['A black leather bench for contemplating art. Somebody has been contemplating the exit.'] });

def('install_bricks', (c) => {
  for (let r = 0; r < 3; r++) for (let i = 0; i < 3 - r; i++) {
    const x = 2 + i * 5 + r * 2;
    const y = 12 - r * 4;
    rect(c, x, y, 5, 4, OUT);
    rect(c, x + 1, y + 1, 3, 2, '#b8523c');
    px(c, x + 1, y + 1, '#d8785c');
  }
}, { flavor: ['"Fifty Bricks (Untitled)". A pile of bricks. Somebody paid a great deal for it.', 'A pile of bricks, and one very slightly askew. Was one removed?'] });

def('unmade_bed', (c, S) => {
  rect(c, 1, 2, 14, 14, OUT);
  rect(c, 2, 3, 12, 12, '#e8e4dc');
  rect(c, 3, 4, 5, 3, '#ffffff');
  rect(c, 6, 8, 8, 6, '#c23c3c');
  rect(c, 3, 9, 4, 4, '#3f79bd');
  rect(c, 4, 10, 2, 1, '#e8e4dc');
  px(c, 12, 12, '#1c1c24');
  void S;
}, { flavor: ['"Rumpled Sleep". An unmade bed, presented as art. Somebody has slept in it since. There is a hair on the pillow.', 'A famous unmade bed. It looks exactly like a normal unmade bed.'] });

def('glass_case', (c, S, f) => {
  rect(c, 1, 4, 14, 12, OUT);
  rect(c, 2, 5, 12, 9, '#a8d0e0');
  rect(c, 2, 5, 12, 2, '#e4f8ff');
  rect(c, 2, 13, 12, 2, '#f0efe8');
  rect(c, 6, 8, 4, 4, S.accent);
  rect(c, 7, 7, 2, 1, S.accent);
  if (f % 16 < 3) px(c, 7, 8, '#ffffff');
}, { flavor: ['The case is empty. The lock has been picked with a hairpin, by someone who knew what they were doing.', 'A velvet cushion with a dent in it the shape of something valuable.'], anim: [16, 1] });

def('easel', (c, S, _f, v) => {
  rect(c, 3, 2, 10, 9, OUT);
  rect(c, 4, 3, 8, 7, '#f4f0e2');
  if (v % 2) { rect(c, 4, 3, 8, 3, '#88b8e0'); rect(c, 4, 6, 8, 4, '#5a9a4a'); }
  else { disc(c, 8, 6, 2, '#d8a880'); rect(c, 6, 8, 5, 2, '#5a3a60'); }
  rect(c, 3, 10, 1, 6, S.wood[2]);
  rect(c, 12, 10, 1, 6, S.wood[2]);
  rect(c, 7, 11, 2, 5, S.wood[2]);
  rect(c, 5, 10, 6, 1, S.wood[1]);
  px(c, 5, 5, '#d84a3c');
}, { flavor: ['A canvas on an easel. The signature in the corner has been freshly, suspiciously, inked in.', 'The painting is drying. Someone signed it after the party began.'] });

def('deposit_boxes', (c, S) => {
  rect(c, 0, 0, 16, 16, '#3a4652');
  for (let y = 1; y < 15; y += 5) for (let x = 1; x < 15; x += 5) {
    rect(c, x, y, 4, 4, '#8a98a4');
    rect(c, x, y, 4, 1, '#c8d2da');
    px(c, x + 2, y + 2, '#1c1c24');
  }
  void S;
}, { flavor: ['Rows of safe-deposit boxes. One drawer is a fraction open, like a gap in someone\'s smile.'], wall: false });

def('vault_door', (c, S, f) => {
  rect(c, 0, 0, 16, 16, '#3a4652');
  disc(c, 8, 8, 7, OUT);
  disc(c, 8, 8, 6, '#8a98a4');
  disc(c, 8, 8, 4, '#5a6672');
  disc(c, 8, 8, 2, '#c8d2da');
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; rect(c, 8 + Math.round(Math.cos(a) * 3), 8 + Math.round(Math.sin(a) * 3), 1, 1, '#1c1c24'); }
  px(c, 8, 8, '#d6b458');
  disc(c, 14, 2, 1, (f >> 3) % 2 ? '#ff5a4a' : '#7a2a2a');
  void S;
}, { flavor: ['The vault door: half a metre of steel. It is not locked. It has been opened, and closed again, by somebody with a key.'], anim: [4, 20], wall: false });

def('dine_table', (c, _S, f, v) => {
  const cloth = v === 1 ? '#e8d0ca' : '#e8dfc8';
  // a round table dressed for dinner, shaded so it reads as linen over a pedestal, not a flat glowing disc
  disc(c, 8, 9, 7, 'rgba(10,8,14,0.28)'); // the shadow it casts on the floor
  rect(c, 7, 12, 2, 4, '#241c18'); // pedestal leg, glimpsed under the cloth
  disc(c, 8, 8, 7, OUT);
  disc(c, 8, 8, 6, cloth);
  for (let y = -6; y <= 6; y++)
    for (let x = -6; x <= 6; x++)
      if (x * x + y * y <= 36 && x + y >= 3) {
        c.fillStyle = shade(cloth, -0.16 - Math.min(0.14, (x + y - 3) * 0.02));
        c.fillRect(8 + x, 8 + y, 1, 1);
      }
  ring(c, 8, 8, 6, shade(cloth, -0.32)); // the hem
  ring(c, 8, 8, 3, shade(cloth, -0.1)); // a fold line so the cloth doesn't read flat
  // four place settings around the rim: a plate and cutlery each
  for (const [dx, dy] of [[0, -4], [0, 4], [-4, 0], [4, 0]] as const) {
    disc(c, 8 + dx, 8 + dy, 1, '#e4e4e0');
    px(c, 8 + dx, 8 + dy, '#c8c8c0');
  }
  // the centrepiece candle
  rect(c, 7, 6, 2, 3, '#f4f0d8');
  px(c, 8, 5, f % 6 < 3 ? '#ffd070' : '#ff9a3a');
  // two wine glasses catching the light
  px(c, 5, 6, '#c8d8e8');
  px(c, 11, 6, '#c8d8e8');
  if (v === 1) rect(c, 10, 9, 2, 2, '#a83248'); // a spilled glass, on the unlucky table
}, { flavor: ['A table laid for a party that never sat down. The wine has been poured; nobody drank it.', 'Immaculate white linen. One place setting has been used, and cleared away too quickly.'], anim: [6, 5], light: { r: 20, color: '#ffc070', flicker: 0.25 } });

def('range', (c, S, f) => {
  rect(c, 0, 3, 16, 13, OUT);
  rect(c, 1, 4, 14, 11, S.metal[1]);
  rect(c, 1, 4, 14, 2, S.metal[0]);
  for (const x of [3, 9]) { disc(c, x + 2, 8, 2, '#1c1c24'); px(c, x + 2, 8, f % 4 < 2 ? '#ff7a3a' : '#c8501c'); }
  rect(c, 2, 11, 12, 4, '#3a3a46');
  rect(c, 3, 12, 10, 2, S.metal[0]);
  rect(c, 12, 5, 2, 2, '#c8c8d4');
}, { flavor: ['A six-burner range. One pot is still simmering, unattended, which no chef would ever allow.', 'The gas is on. The pilot flame trembles.'], anim: [4, 8], light: { r: 26, color: '#ff9a4a', flicker: 0.2 } });

def('pans_rack', (c, S) => {
  rect(c, 0, 3, 16, 1, S.metal[1]);
  for (let i = 0; i < 4; i++) {
    const x = 2 + i * 4;
    rect(c, x + 1, 4, 1, 3, S.metal[2]);
    disc(c, x + 1, 9, 2 + (i % 2), OUT);
    disc(c, x + 1, 9, 1 + (i % 2), i % 2 ? '#b86a3a' : S.metal[0]);
  }
}, { flavor: ['Copper pans on hooks. One hook is empty. A heavy sauté pan is missing.'], wall: true });

def('fridge_door', (c, S, f) => {
  rect(c, 1, 0, 14, 16, OUT);
  rect(c, 2, 1, 12, 14, '#dfe8ec');
  rect(c, 2, 1, 12, 2, '#f4fbff');
  rect(c, 2, 7, 12, 1, '#a4b4bc');
  rect(c, 11, 4, 2, 5, S.metal[1]);
  rect(c, 11, 10, 2, 3, S.metal[1]);
  dither(c, 2, 12, 12, 3, 'rgba(180,220,240,0.55)', f >> 4);
}, { flavor: ['The walk-in door hisses and clouds of cold fog fall out. Something was dragged in here.', 'Cold, so cold. The inside latch has been taped over.'], anim: [2, 30], wall: true });

def('wine_rack', (c, S) => {
  rect(c, 0, 0, 16, 16, S.wood[2]);
  rect(c, 1, 1, 14, 14, '#241612');
  for (let y = 2; y < 14; y += 4) for (let x = 2; x < 14; x += 4) {
    disc(c, x + 1, y + 1, 1, '#0c0806');
    px(c, x + 1, y + 1, ['#8a2a3a', '#3a6a4a', '#c8a040'][(x + y) % 3] as string);
  }
  rect(c, 0, 0, 16, 1, S.wood[1]);
}, { flavor: ['A rack of vintage bottles, dusty as the family secrets. A gap where a very old bottle was removed.', 'The labels are hand-dated. One bottle has been turned label-side to the wall.'], wall: true });

def('veg_crate', (c, S, _f, v) => {
  rect(c, 1, 5, 14, 11, OUT);
  rect(c, 2, 6, 12, 9, S.wood[0]);
  const cols = ['#d84a3c', '#e8a030', '#5aa84a'];
  for (let i = 0; i < 4; i++) disc(c, 4 + i * 3, 6, 2, cols[(i + v) % 3] as string);
  rect(c, 2, 10, 12, 1, S.wood[2]);
}, { flavor: ['A crate of vegetables. Not a wilted leaf. The delivery was this morning.', 'Underneath the lettuce, a wad of banknotes in an envelope.'] });

def('pallet', (c, S) => {
  rect(c, 0, 8, 16, 8, OUT);
  for (let x = 0; x < 16; x += 5) rect(c, x, 9, 4, 6, S.wood[1]);
  rect(c, 0, 8, 16, 2, S.wood[0]);
  rect(c, 0, 14, 16, 1, S.wood[2]);
}, { flavor: ['A wooden pallet stacked with boxes. Someone has scratched a route on the wall in chalk.'] });

def('oven', (c, S, f) => {
  rect(c, 1, 2, 14, 14, OUT);
  rect(c, 2, 3, 12, 12, S.metal[1]);
  rect(c, 3, 6, 10, 7, '#26262c');
  rect(c, 4, 7, 8, 5, (f >> 2) % 2 ? '#ff9a3a' : '#ff7a2a');
  rect(c, 4, 7, 8, 1, '#ffd060');
  rect(c, 3, 4, 10, 1, S.metal[0]);
  px(c, 4, 4, '#ff5a4a');
}, { flavor: ['A deck oven, ticking as it cools. Something in the tray has gone black.'], anim: [4, 12], light: { r: 26, color: '#ff8a3a', flicker: 0.2 } });

def('marble_bench', (c, S) => {
  rect(c, 0, 4, 16, 12, OUT);
  rect(c, 1, 5, 14, 5, '#f4f0ec');
  rect(c, 1, 5, 14, 1, '#ffffff');
  rect(c, 4, 7, 3, 1, '#c8c0d0');
  rect(c, 10, 8, 3, 1, '#c8c0d0');
  rect(c, 1, 10, 14, 5, S.metal[1]);
  rect(c, 2, 11, 5, 3, S.metal[0]);
  rect(c, 9, 11, 5, 3, S.metal[0]);
  rect(c, 6, 3, 4, 3, '#f8dcb0');
}, { flavor: ['A marble slab dusted with flour. Somebody was rolling something out here, and stopped abruptly.'] });

def('cake_stand', (c, S) => {
  rect(c, 7, 9, 2, 6, S.metal[0]);
  rect(c, 4, 14, 8, 2, S.metal[0]);
  rect(c, 2, 8, 12, 2, S.metal[0]);
  rect(c, 3, 4, 10, 5, '#f8dcb0');
  rect(c, 3, 4, 10, 2, '#e8a0b8');
  rect(c, 3, 8, 10, 1, '#c8843c');
  px(c, 6, 3, '#c23c3c');
  disc(c, 10, 3, 1, '#c23c3c');
}, { flavor: ['A cake with a slice missing. The remaining slices are intact and untouched. Just the one was taken.'] });

def('cctv', (c, S, f) => {
  rect(c, 1, 3, 14, 12, OUT);
  rect(c, 2, 4, 12, 9, '#26262e');
  for (let i = 0; i < 4; i++) {
    const x = 3 + (i % 2) * 5;
    const y = 5 + ((i / 2) | 0) * 4;
    rect(c, x, y, 4, 3, '#0c1c2c');
    px(c, x + 1 + ((f + i) % 3), y + 1, '#8ad8e8');
  }
  rect(c, 6, 13, 4, 2, S.metal[1]);
}, { flavor: ['A bank of security screens. One camera\'s feed is frozen on an empty corridor, timestamped two minutes before the scream.'], anim: [6, 10], light: { r: 22, color: '#8ad8e8', flicker: 0.08 } });

// ---- village fete ---------------------------------------------------------------------------------

def('trestle', (c, S, f, v) => {
  rect(c, 2, 12, 2, 4, S.wood[2]);
  rect(c, 12, 12, 2, 4, S.wood[2]);
  rect(c, 0, 4, 16, 9, OUT);
  const cl = v === 1 ? '#f4efe2' : v === 2 ? '#c8412f' : '#3f79bd';
  rect(c, 1, 5, 14, 7, cl);
  rect(c, 1, 5, 14, 1, shade(cl, 0.3));
  if (v === 2) for (let x = 1; x < 15; x += 4) rect(c, x, 5, 2, 7, '#f4efe2');
  else if (v === 0) for (let x = 1; x < 15; x += 4) for (let y = 5; y < 12; y += 4) px(c, x + 1, y + 1, '#f4efe2');
  rect(c, 3, 3, 3, 3, '#c9a24a');
  rect(c, 9, 3, 4, 3, '#e8e2d2');
  px(c, 10, 4, '#a83248');
  void f;
}, { flavor: ['A trestle table, bunting-trimmed and slightly crooked. There is a paper plate of biscuits at the end.', 'A tablecloth with a tea stain, and under the stain, a smear of something else.'] });

def('tea_urn', (c, S, f) => {
  rect(c, 4, 3, 8, 12, OUT);
  rect(c, 5, 4, 6, 10, S.metal[0]);
  rect(c, 5, 4, 2, 10, '#ffffff');
  rect(c, 9, 4, 2, 10, S.metal[1]);
  rect(c, 6, 2, 4, 2, S.metal[1]);
  rect(c, 11, 8, 3, 1, S.metal[2]);
  if (f % 12 < 6) px(c, 13, 6, 'rgba(255,255,255,0.7)');
}, { flavor: ['The tea urn hisses. It has been on since morning and has heard every word.'], anim: [12, 12] });

def('tombola', (c, S, f) => {
  rect(c, 3, 12, 10, 4, S.wood[1]);
  rect(c, 3, 12, 10, 1, S.wood[0]);
  disc(c, 8, 7, 5, OUT);
  disc(c, 8, 7, 4, '#d8ecf4');
  const cols = ['#d84a3c', '#f0c030', '#3f79bd', '#4aa56a'];
  for (let i = 0; i < 6; i++) px(c, 5 + ((i * 3 + (f >> 2)) % 7), 5 + (i % 4), cols[i % 4] as string);
  rect(c, 7, 0, 2, 3, S.metal[1]);
  rect(c, 12, 6, 3, 1, S.metal[1]);
}, { flavor: ['The tombola drum, tickets rattling. The false bottom has been recently disturbed.', 'You give the handle a turn. Number 13, again. Why is it always 13?'], anim: [8, 6], sfx: 'tombola' });

def('hay_bale', (c) => {
  rect(c, 1, 5, 14, 11, OUT);
  rect(c, 2, 6, 12, 9, '#d8b84a');
  rect(c, 2, 6, 12, 2, '#f0d878');
  for (let x = 3; x < 14; x += 3) rect(c, x, 8, 1, 6, '#b09030');
  rect(c, 2, 10, 12, 1, '#8a6a2a');
  speckle(c, 2, '#f0d878', 8, 2, 6, 12, 9);
}, { flavor: ['A bale of hay, sat upon by several generations of village children.', 'Hay. And in the hay, a pearl button that does not match anything.'] });

def('bunting', (c, S, f) => {
  const cols = ['#d8483c', '#f4efe2', '#3f79bd', '#e4b638', '#4aa056'];
  rect(c, 0, 1, 16, 1, '#8a7a5a');
  for (let i = 0; i < 4; i++) {
    const x = i * 4;
    const sway = (f + i) % 8 > 4 ? 1 : 0;
    const col = cols[(i + (f >> 6)) % 5] as string;
    rect(c, x, 2, 4, 1, col);
    rect(c, x + 1, 3 + sway, 2, 1, col);
    px(c, x + 1 + (sway ? 1 : 0), 4, col);
  }
  void S;
}, { anim: [8, 10], walk: true });

def('maypole', (c, S, f) => {
  rect(c, 7, 2, 2, 14, '#e8e0cc');
  for (let y = 3; y < 15; y += 3) rect(c, 7, y, 2, 1, '#c23c3c');
  const cols = ['#d8483c', '#3f79bd', '#e4b638', '#4aa056'];
  for (let i = 0; i < 4; i++) {
    const a = ((f / 8) + i) * (Math.PI / 2);
    px(c, 8 + Math.round(Math.cos(a) * 5), 3 + i * 3, cols[i] as string);
    rect(c, 8, 3 + i * 3, Math.round(Math.cos(a) * 5) || 1, 1, cols[i] as string);
  }
  rect(c, 4, 14, 8, 2, S.wood[2]);
  rect(c, 6, 0, 4, 2, '#4aa056');
}, { flavor: ['The maypole, ribbons tangled from the last dance. Somebody tied a knot in them that no dancer could have made.'], anim: [64, 2] });

def('prize_marrow', (c) => {
  rect(c, 1, 8, 14, 8, '#5a3a2a');
  disc(c, 5, 9, 3, OUT);
  rect(c, 2, 6, 12, 5, OUT);
  rect(c, 3, 7, 10, 3, '#3f9a45');
  rect(c, 3, 7, 10, 1, '#63bd5a');
  rect(c, 4, 8, 6, 1, '#8fdc70');
  rect(c, 12, 5, 3, 3, '#e4b638');
  px(c, 13, 6, '#c23c3c');
}, { flavor: ['The champion marrow, on a plinth of velvet. There is a suspicious dent, freshly polished over.', '"FIRST PRIZE". The rosette is pinned a little too eagerly.'] });

def('junk_table', (c, S, _f, v) => {
  rect(c, 0, 5, 16, 10, OUT);
  rect(c, 1, 6, 14, 8, S.wood[1]);
  rect(c, 2, 2, 3, 5, '#a8d0e0');
  rect(c, 6, 3, 3, 4, '#c8a040');
  disc(c, 12, 4, 2, ['#e8dcc0', '#d8a0a8', '#c8d0d8'][v % 3] as string);
  rect(c, 3, 9, 4, 3, '#a83248');
  rect(c, 9, 10, 4, 2, '#3f79bd');
  px(c, 4, 9, '#f0d060');
}, { flavor: ['Bric-a-brac: a china dog, a cracked vase, a dozen dodgy watches. Someone has tampered with a price tag.', 'Junk, all of it, and yet one item is priced far too high. Or far too low.'] });

def('scoreboard', (c, S) => {
  rect(c, 1, 1, 14, 11, OUT);
  rect(c, 2, 2, 12, 9, '#1f4a3a');
  for (let i = 0; i < 4; i++) { rect(c, 3 + i * 3, 3, 2, 3, '#f4efe2'); rect(c, 3 + i * 3, 7, 2, 3, '#f4efe2'); }
  rect(c, 2, 6, 12, 1, S.wood[1]);
}, { flavor: ['The cricket scoreboard: 0 for 10. Nobody has changed it in years.', 'A number has been altered recently. The paint is still wet.'], wall: true });

def('notice_board', (c, S) => {
  rect(c, 1, 1, 14, 11, S.wood[2]);
  rect(c, 2, 2, 12, 9, '#b8905a');
  rect(c, 3, 3, 4, 4, '#f4efe2');
  rect(c, 8, 4, 5, 3, '#f0e0a8');
  rect(c, 4, 8, 6, 2, '#f4efe2');
  px(c, 4, 3, '#d8483c');
  px(c, 9, 4, '#d8483c');
}, { flavor: ['Village notices: Jumble Sale, Choir Practice, and a card in a shaky hand: "I KNOW WHAT YOU DID."', 'A notice for the Fete raffle. Somebody has torn off every ticket with the same number.'], wall: true });

def('stacked_chairs', (c, S) => {
  for (let i = 0; i < 4; i++) {
    rect(c, 3, 12 - i * 3, 10, 2, OUT);
    rect(c, 4, 12 - i * 3, 8, 1, S.wood[i % 2]);
  }
  rect(c, 3, 3, 1, 12, S.metal[2]);
  rect(c, 12, 3, 1, 12, S.metal[2]);
}, { flavor: ['A stack of stacking chairs, waiting for the next tea-time. One is upside down.'] });

def('rose_bush', (c, S) => {
  disc(c, 8, 10, 6, OUT);
  disc(c, 8, 10, 5, '#2f7c36');
  disc(c, 6, 8, 2, '#3f9a45');
  for (const [x, y, col] of [[5, 7, '#d8283c'], [10, 9, '#f4a0b8'], [7, 12, '#f8e8d0'], [11, 6, '#d8283c']] as const) { rect(c, x, y, 2, 2, col); px(c, x, y, shade(col, 0.4)); }
  void S;
}, { flavor: ['Prize roses. A stem has been snipped; there is a single red petal on the path beyond.', 'The thorns are sharp enough to scratch a suspect\'s sleeve.'] });

def('sundial', (c) => {
  rect(c, 5, 8, 6, 8, OUT);
  rect(c, 6, 9, 4, 6, '#c8c0b0');
  disc(c, 8, 6, 5, OUT);
  disc(c, 8, 6, 4, '#d8d0c0');
  rect(c, 8, 3, 1, 4, '#3a3a44');
  rect(c, 8, 6, 3, 1, '#3a3a44');
  px(c, 5, 6, '#a8a090');
  px(c, 11, 6, '#a8a090');
}, { flavor: ['A sundial. Its shadow points to an hour that has long since passed.'] });

// ---- country house --------------------------------------------------------------------------------

def('bookcase', (c, S, _f, v) => {
  rect(c, 0, 0, 16, 16, S.wood[2]);
  rect(c, 1, 1, 14, 14, '#2a1a10');
  const cols = ['#a03a3a', '#3a5aa0', '#3a8a5a', '#c8a040', '#8a4aa0', '#d8d0c0', '#5a3a2a'];
  for (const y of [1, 6, 11]) {
    rect(c, 1, y + 4, 14, 1, S.wood[0]);
    let x = 2;
    for (let i = 0; x < 14; i++) {
      const w = 1 + Math.floor(noise(i + y, v, 9) * 2);
      const h = 3 + Math.floor(noise(i, y, 10) * 2);
      rect(c, x, y + 4 - h, w, h, cols[Math.floor(noise(i, y + v, 11) * 7)] as string);
      x += w + (noise(i, y, 12) > 0.9 ? 1 : 0);
    }
  }
  rect(c, 0, 0, 16, 1, S.metal[0]);
}, { flavor: ['Leather-bound books, floor to ceiling. One volume sits proud of the rest, as if pulled out and hurriedly returned.', 'Shelves of sermons, and one book that isn\'t a book at all.'], wall: true });

def('armor', (c, S) => {
  rect(c, 5, 1, 6, 5, OUT);
  rect(c, 6, 2, 4, 3, S.metal[0]);
  rect(c, 7, 3, 2, 1, '#1c1c24');
  rect(c, 3, 6, 10, 7, OUT);
  rect(c, 4, 7, 8, 5, S.metal[1]);
  rect(c, 4, 7, 3, 5, S.metal[0]);
  rect(c, 5, 13, 2, 3, S.metal[2]);
  rect(c, 9, 13, 2, 3, S.metal[2]);
  rect(c, 13, 3, 1, 12, S.wood[1]);
  px(c, 13, 2, S.metal[0]);
}, { flavor: ['A suit of armour with a rusty halberd. Its visor has been raised, and it looks knowing.', 'Something shifts inside the armour when you brush against it. Probably a mouse.'] });

def('billiard', (c, S) => {
  rect(c, 0, 3, 16, 12, OUT);
  rect(c, 1, 4, 14, 10, S.wood[1]);
  rect(c, 2, 5, 12, 8, '#1f6a3a');
  rect(c, 2, 5, 12, 1, '#3f8a58');
  disc(c, 5, 8, 1, '#f4f4ee');
  disc(c, 9, 9, 1, '#c23c3c');
  disc(c, 11, 7, 1, '#e8c030');
  px(c, 7, 8, '#1c1c24');
  rect(c, 1, 14, 3, 2, OUT);
  rect(c, 12, 14, 3, 2, OUT);
}, { flavor: ['The billiard table. The balls are set as if halfway through a break, mid-argument.', 'A cue chalked but never used. The felt bears a faint scuff of a bootheel.'] });

def('stairs', (c, S) => {
  rect(c, 0, 0, 16, 16, S.wood[2]);
  for (let y = 0; y < 16; y += 4) {
    rect(c, 0, y, 16, 3, S.wood[0]);
    rect(c, 0, y, 16, 1, shade(S.wood[0], 0.35));
    rect(c, 0, y + 3, 16, 1, '#1c1208');
  }
  rect(c, 0, 0, 1, 16, S.metal[1]);
  rect(c, 15, 0, 1, 16, S.metal[1]);
}, { flavor: ['A narrow servants\' staircase, worn in the middle. Everyone who is anyone has quietly used it.', 'The stairs creak. Your footsteps would announce you to the whole house.'] });

def('wicker', (c, S, _f, v) => {
  rect(c, 3, 3, 10, 12, OUT);
  rect(c, 4, 4, 8, 10, '#c8a060');
  for (let y = 5; y < 14; y += 2) rect(c, 4, y, 8, 1, '#a88040');
  rect(c, 5, 8, 6, 5, S.cloth[v % 3]);
  rect(c, 5, 8, 6, 1, shade(S.cloth[v % 3], 0.3));
}, { flavor: ['A wicker armchair. A book lies face-down on the arm; a bookmark, a ticket stub.'] });

dither; ring;
