/** Paddle-steamer and ocean-liner props: rails, lifeboats, stacks, the paddle wheel, boilers and brass. */
import { disc, dither, noise, OUT, px, rect, ring, shade, speckle, sprite } from './draw';
import { def } from './registry';

def('rail', (c, S, _f, v) => {
  const top = S.id === 'liner' ? '#f4f4f0' : '#f0e6cc';
  const mid = S.id === 'liner' ? '#c8ccd4' : '#c9b58a';
  if (v === 0) {
    // horizontal run
    rect(c, 0, 4, 16, 2, top);
    rect(c, 0, 6, 16, 1, mid);
    rect(c, 0, 9, 16, 1, mid);
    for (const x of [1, 8, 14]) {
      rect(c, x, 3, 2, 10, top);
      rect(c, x + 1, 3, 1, 10, mid);
    }
    rect(c, 0, 13, 16, 1, 'rgba(0,0,0,0.25)');
  } else {
    const x0 = v === 1 ? 1 : 12;
    rect(c, x0, 0, 3, 16, top);
    rect(c, x0 + 2, 0, 1, 16, mid);
    for (const y of [1, 8]) rect(c, x0 - 1, y, 5, 2, top);
    rect(c, v === 1 ? 4 : 9, 0, 1, 16, 'rgba(0,0,0,0.12)');
  }
}, { flavor: ['The rail is cold and wet. Below, the water slides by, black and patient.', 'You lean on the rail. A long way down.'] });

def('lifeboat', (c, S, _f, v) => {
  // two halves: v=0 bow/left, v=1 stern/right
  const white = '#f4f4ee';
  const orange = '#e8772e';
  rect(c, v === 0 ? 3 : 0, 6, v === 0 ? 13 : 13, 9, OUT);
  rect(c, v === 0 ? 4 : 0, 7, v === 0 ? 12 : 12, 7, white);
  rect(c, v === 0 ? 4 : 0, 7, v === 0 ? 12 : 12, 2, orange);
  rect(c, v === 0 ? 4 : 0, 9, v === 0 ? 12 : 12, 1, shade(orange, -0.35));
  rect(c, v === 0 ? 4 : 0, 12, v === 0 ? 12 : 12, 2, '#3f79bd');
  rect(c, v === 0 ? 4 : 0, 12, v === 0 ? 12 : 12, 1, shade('#3f79bd', 0.3));
  for (let x = v === 0 ? 5 : 1; x < 15; x += 4) rect(c, x, 6, 1, 4, S.metal[2]);
  // davit arm
  rect(c, v === 0 ? 10 : 5, 2, 1, 5, S.metal[2]);
  rect(c, v === 0 ? 8 : 5, 2, 3, 1, S.metal[2]);
  if (v === 0) {
    rect(c, 3, 8, 1, 5, OUT);
    px(c, 3, 7, OUT);
  } else rect(c, 15, 8, 1, 5, OUT);
}, { flavor: ['A lifeboat under a canvas cover. You lift the flap: a blanket and a very small flask.', 'LIFEBOAT 3, it says. The rope holding it has been recently tied. Fresh knots.'] });

def('stack_b', (c, S, _f, v) => {
  // the body of a funnel (v0 liner, v1 riverboat)
  const col = v === 0 ? '#c23c3c' : '#2a2a34';
  rect(c, 1, 0, 14, 16, OUT);
  rect(c, 2, 0, 12, 16, col);
  rect(c, 2, 0, 3, 16, shade(col, 0.28));
  rect(c, 11, 0, 3, 16, shade(col, -0.35));
  rect(c, 2, 7, 12, 2, v === 0 ? '#f4f4ee' : S.accent);
  rect(c, 2, 8, 12, 1, shade(v === 0 ? '#f4f4ee' : S.accent, -0.3));
}, { flavor: ['A funnel as wide as a cottage. It is warm to the touch, and humming.'] });

def('stack_t', (c, S, f, v) => {
  // the mouth of a funnel seen from above, with smoke curling out
  const col = v === 0 ? '#c23c3c' : '#2a2a34';
  rect(c, 1, 8, 14, 8, OUT);
  rect(c, 2, 9, 12, 7, col);
  rect(c, 2, 9, 3, 7, shade(col, 0.28));
  rect(c, 11, 9, 3, 7, shade(col, -0.35));
  disc(c, 8, 8, 6, OUT);
  disc(c, 8, 8, 5, v === 0 ? '#2a2a34' : '#161620');
  disc(c, 8, 8, 3, '#0c0c12');
  if (v === 0) rect(c, 3, 11, 10, 2, '#1c1c26');
  else for (let x = 2; x < 14; x += 3) rect(c, x, 9, 1, 3, S.accent);
  const p = f % 8;
  disc(c, 8 + Math.round(Math.sin(f / 2)), 5 - (p >> 1), 3, 'rgba(210,210,222,0.85)');
  disc(c, 9 + Math.round(Math.cos(f / 3)), 2 - (p >> 2), 2, 'rgba(200,200,214,0.6)');
}, { flavor: ['Smoke rolls out of the stack in slow black loops.'], anim: [8, 8], light: { r: 22, color: '#ff9a4a', flicker: 0.4 } });

def('paddle', (c, S, f, v) => {
  // v0 wheel housing centre, v1 left end, v2 right end. Slats turn beneath the deck.
  rect(c, 0, 0, 16, 16, S.water[1]);
  const x0 = v === 1 ? 4 : 0;
  const x1 = v === 2 ? 12 : 16;
  rect(c, x0, 0, x1 - x0, 16, '#5a3520');
  rect(c, x0, 0, x1 - x0, 2, '#7a4a30');
  for (let y = 0; y < 16; y += 4) {
    const yy = (y + f * 2) % 16;
    rect(c, x0 + 1, yy, x1 - x0 - 2, 3, '#a56d3c');
    rect(c, x0 + 1, yy, x1 - x0 - 2, 1, '#c98f5a');
    rect(c, x0 + 1, yy + 3, x1 - x0 - 2, 1, '#3a2010');
  }
  if (v === 1) {
    rect(c, 3, 0, 2, 16, OUT);
    rect(c, 0, 0, 3, 16, S.water[1]);
  }
  if (v === 2) {
    rect(c, 11, 0, 2, 16, OUT);
    rect(c, 13, 0, 3, 16, S.water[1]);
  }
  for (let i = 0; i < 3; i++) px(c, (x0 + ((i * 5 + f * 3) % Math.max(1, x1 - x0))) % 16, 14, S.water[3]);
}, { flavor: ['The great paddle wheel turns, thrashing the river white.', 'Spray and thunder. Nobody could hear a scream over this.'], anim: [8, 3] });

def('deckchair', (c, S, _f, v) => {
  const stripe = v === 0 ? '#3f79bd' : v === 1 ? '#c23c3c' : '#4aa056';
  rect(c, 3, 2, 10, 13, OUT);
  rect(c, 4, 3, 8, 11, S.wood[0]);
  for (let y = 3; y < 14; y += 2) rect(c, 4, y, 8, 1, y % 4 === 3 ? stripe : '#f4efe2');
  rect(c, 4, 3, 8, 1, shade(stripe, 0.3));
  rect(c, 3, 2, 1, 13, S.wood[1]);
  rect(c, 12, 2, 1, 13, S.wood[1]);
}, { flavor: ['A striped deck chair. Somebody left a book and a cold cup of tea.', 'The canvas is still dented. They did not go far. Or did they?'] });

def('life_ring', (c) => {
  disc(c, 8, 8, 6, OUT);
  disc(c, 8, 8, 5, '#f4f4ee');
  for (const [x, y] of [[8, 3], [8, 13], [3, 8], [13, 8]] as const) rect(c, x - 1, y - 1, 3, 3, '#e04a3c');
  disc(c, 8, 8, 2, OUT);
  disc(c, 8, 8, 1, '#7a5a3a');
}, { flavor: ['A life ring. The name of the ship is painted on it, in case anyone forgets where they are.'] });

def('rope_coil', (c, S) => {
  disc(c, 8, 9, 6, OUT);
  disc(c, 8, 9, 5, '#c9a86a');
  disc(c, 8, 9, 3, '#a98850');
  disc(c, 8, 9, 1, OUT);
  for (let i = 0; i < 12; i++) px(c, 8 + Math.round(Math.cos(i / 2) * 4), 9 + Math.round(Math.sin(i / 2) * 4), '#8a6a3a');
  void S;
}, { flavor: ['A neat coil of rope. Whoever coiled it was in no hurry.'] });

def('capstan', (c, S) => {
  disc(c, 8, 9, 6, OUT);
  disc(c, 8, 9, 5, S.metal[1]);
  disc(c, 8, 9, 3, S.metal[0]);
  disc(c, 8, 9, 1, OUT);
  for (const [x, y] of [[2, 9], [14, 9], [8, 3], [8, 15]] as const) rect(c, x, y, 2, 1, S.wood[1]);
}, { flavor: ['A capstan. Heavy, salty, and warm from the sun.'] });

def('ship_wheel', (c, S) => {
  rect(c, 6, 10, 4, 6, S.wood[2]);
  disc(c, 8, 7, 6, OUT);
  disc(c, 8, 7, 5, S.wood[0]);
  disc(c, 8, 7, 3, S.wood[2]);
  disc(c, 8, 7, 1, S.metal[0]);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    px(c, 8 + Math.round(Math.cos(a) * 6), 7 + Math.round(Math.sin(a) * 6), S.wood[0]);
  }
  for (const [x, y] of [[2, 7], [14, 7], [8, 1]] as const) rect(c, x, y, 1, 1, S.metal[0]);
}, { flavor: ['The wheel is locked amidships. Somebody wanted the ship to keep her course.'] });

def('chart_table', (c, S) => {
  rect(c, 0, 4, 16, 11, OUT);
  rect(c, 1, 5, 14, 9, S.wood[1]);
  rect(c, 2, 6, 12, 7, '#efe4c0');
  rect(c, 3, 8, 8, 1, '#3f79bd');
  px(c, 4, 7, '#c23c3c');
  rect(c, 10, 9, 3, 1, '#3a2a1a');
  rect(c, 6, 10, 1, 2, '#c9b06a');
  rect(c, 12, 11, 2, 2, S.metal[0]);
}, { flavor: ['A chart with the course pencilled in. One line has been rubbed out and drawn again, elsewhere.', 'Dividers, a pencil, and a route that does not quite match the log.'] });

def('porthole', (c, S, f) => {
  // a round brass porthole with the sea rolling past
  disc(c, 8, 6, 6, S.metal[1]);
  disc(c, 8, 6, 5, S.metal[0]);
  disc(c, 8, 6, 4, '#1c3c66');
  rect(c, 5, 4, 6, 3, S.id === 'riverboat' ? S.sky[2] : S.sky[1]);
  rect(c, 4, 7, 8, 3, S.water[1]);
  for (let i = 0; i < 2; i++) rect(c, 5 + ((i * 4 + f) % 5), 8 + i, 3, 1, S.water[2]);
  ring(c, 8, 6, 4, S.metal[2]);
  px(c, 6, 4, 'rgba(255,255,255,0.8)');
}, { flavor: ['Through the porthole: black water, white foam, and nothing else for miles.', 'The porthole is screwed shut. Nobody left this way.'], anim: [4, 12], wall: true });

def('boiler', (c, _S, f, v) => {
  rect(c, 1, 1, 14, 15, OUT);
  rect(c, 2, 2, 12, 13, '#5a5a66');
  rect(c, 2, 2, 4, 13, '#767684');
  rect(c, 11, 2, 3, 13, '#3c3c48');
  for (const y of [4, 9]) rect(c, 2, y, 12, 1, '#2a2a34');
  for (const [x, y] of [[4, 3], [8, 3], [12, 3], [4, 8], [8, 8], [12, 8]] as const) px(c, x, y, '#9a9aa8');
  disc(c, 8, 6, 2, '#d6b458');
  disc(c, 8, 6, 1, '#f4f0d8');
  rect(c, 5, 11, 6, 4, '#1c1c24');
  const g = f % 4;
  rect(c, 6, 12, 4, 2, g < 2 ? '#ff9a3a' : '#ff6a20');
  px(c, 7 + (g % 2), 12, '#ffe07a');
  void v;
}, { flavor: ['The boiler ticks and groans. A gauge needle trembles in the red.', 'Hot enough to fry an egg, or a suspect\'s alibi.'], anim: [4, 7], light: { r: 40, color: '#ff8a3a', flicker: 0.35 } });

def('piston', (c, S, f) => {
  rect(c, 2, 0, 12, 16, '#3c3c48');
  rect(c, 4, 0, 8, 16, '#767684');
  rect(c, 4, 0, 2, 16, '#a4a4b4');
  const y = 3 + Math.round(Math.abs(Math.sin(f / 2)) * 7);
  rect(c, 6, y, 4, 8, S.metal[1]);
  rect(c, 5, y + 7, 6, 3, OUT);
  rect(c, 5, y + 7, 6, 1, S.metal[0]);
  rect(c, 2, 0, 12, 2, OUT);
}, { flavor: ['The piston hammers up and down, patient as a heartbeat.', 'Oil, steam, and a rhythm you feel in your teeth.'], anim: [16, 3] });

def('pipes', (c, S, f) => {
  rect(c, 0, 0, 16, 16, '#3a3a46');
  rect(c, 0, 3, 16, 3, S.metal[1]);
  rect(c, 0, 3, 16, 1, S.metal[0]);
  rect(c, 0, 5, 16, 1, S.metal[2]);
  rect(c, 0, 9, 16, 3, S.metal[2]);
  rect(c, 0, 9, 16, 1, S.metal[1]);
  rect(c, 4, 0, 3, 16, S.metal[1]);
  rect(c, 4, 0, 1, 16, S.metal[0]);
  rect(c, 3, 7, 5, 2, S.accent);
  disc(c, 12, 7, 2, '#d8d8e0');
  rect(c, 12, 5, 1, 2, '#c02828');
  if (f % 8 > 5) px(c, 13, 8, 'rgba(255,255,255,0.6)');
}, { flavor: ['Pipes, valves and wheels, all labelled in a code only an engineer would love.', 'A valve wheel someone has turned very recently. The paint is scuffed.'], anim: [8, 10], wall: true });

def('gauges', (c, S, f) => {
  rect(c, 1, 1, 14, 14, OUT);
  rect(c, 2, 2, 12, 12, S.metal[2]);
  for (const [x, y] of [[5, 5], [11, 5]] as const) {
    disc(c, x, y, 3, '#e8e4d0');
    ring(c, x, y, 3, S.metal[0]);
    const a = -2.4 + ((f + x) % 8) * 0.08;
    px(c, x + Math.round(Math.cos(a) * 2), y + Math.round(Math.sin(a) * 2), '#c02828');
    px(c, x, y, OUT);
  }
  rect(c, 3, 10, 10, 2, '#1c1c24');
  for (let i = 0; i < 4; i++) px(c, 4 + i * 3, 11, i === f % 4 ? '#5be8a0' : '#2a5a40');
}, { flavor: ['Gauges and dials. Every needle points at something ominous.'], anim: [8, 14], wall: true });

def('cotton_bale', (c) => {
  rect(c, 1, 4, 14, 12, OUT);
  rect(c, 2, 5, 12, 10, '#e8dcbc');
  rect(c, 2, 5, 12, 2, '#f8f0d8');
  for (const x of [5, 10]) rect(c, x, 5, 1, 10, '#7a6a4a');
  rect(c, 2, 9, 12, 1, '#7a6a4a');
  speckle(c, 3, '#c8bc9c', 6, 2, 5, 12, 10);
}, { flavor: ['A bale of cotton, bound with iron hoops. Someone has pushed a hand into the middle of it.', 'Soft, dusty, and stamped with a ship\'s mark.'] });

def('roulette', (c, S) => {
  rect(c, 0, 3, 16, 12, OUT);
  rect(c, 1, 4, 14, 10, '#1f6a3a');
  rect(c, 1, 4, 14, 1, '#3f8a58');
  disc(c, 8, 8, 4, S.wood[2]);
  disc(c, 8, 8, 3, '#c23c3c');
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    px(c, 8 + Math.round(Math.cos(a) * 2), 8 + Math.round(Math.sin(a) * 2), i % 2 ? '#1c1c24' : '#f4f4ee');
  }
  disc(c, 8, 8, 1, S.accent);
  rect(c, 12, 11, 2, 2, '#f4f4ee');
  px(c, 12, 11, '#c23c3c');
}, { flavor: ['The roulette wheel has stopped on 13. Naturally.', 'A stack of chips is missing from the table. The croupier looks nervous.'] });

def('card_table', (c, S, _f, v) => {
  rect(c, 0, 4, 16, 11, OUT);
  rect(c, 1, 5, 14, 9, v === 1 ? '#3a4a8a' : '#1f6a3a');
  rect(c, 1, 5, 14, 1, 'rgba(255,255,255,0.2)');
  rect(c, 3, 7, 3, 4, '#f4f4ee');
  rect(c, 7, 8, 3, 4, '#f4f4ee');
  px(c, 4, 8, '#c23c3c');
  px(c, 8, 9, '#1c1c24');
  disc(c, 12, 8, 1, S.accent);
  disc(c, 13, 10, 1, '#c23c3c');
}, { flavor: ['A hand of cards, face down. Nobody dares look. Nobody dares fold.', 'The felt is worn where an elbow rested all night.'] });

def('anchor', (c, S) => {
  rect(c, 7, 2, 2, 11, S.metal[2]);
  rect(c, 5, 4, 6, 1, S.metal[2]);
  disc(c, 8, 2, 1, S.metal[1]);
  rect(c, 3, 11, 10, 1, S.metal[2]);
  rect(c, 2, 9, 2, 3, S.metal[2]);
  rect(c, 12, 9, 2, 3, S.metal[2]);
  px(c, 7, 3, S.metal[0]);
}, { flavor: ['An anchor, resting on the deck like a sleeping animal.'] });

def('mast', (c, S) => {
  rect(c, 7, 2, 2, 14, S.wood[1]);
  rect(c, 7, 2, 1, 14, S.wood[0]);
  rect(c, 3, 5, 10, 1, S.wood[2]);
  rect(c, 8, 1, 6, 4, '#c23c3c');
  rect(c, 8, 1, 6, 1, '#e86a6a');
  rect(c, 10, 2, 2, 2, '#f4f4ee');
}, { flavor: ['A flag snaps at the top of the mast. Wind from the north, and it smells of rain.'], anim: [4, 10] });

def('barrel_pyramid', (c, S) => {
  disc(c, 4, 12, 3, OUT);
  disc(c, 12, 12, 3, OUT);
  disc(c, 8, 6, 3, OUT);
  for (const [x, y] of [[4, 12], [12, 12], [8, 6]] as const) {
    disc(c, x, y, 2, S.wood[0]);
    rect(c, x - 2, y, 5, 1, S.metal[2]);
  }
}, { flavor: ['Barrels stacked in a neat pyramid. The bottom one is leaking, quietly.'] });

// deco: unused pixel tweak to keep tree-shaking honest
void dither; void noise; void sprite;
