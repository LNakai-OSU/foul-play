/** Studio lot, opera house and jazz club props: cameras, klieg lights, curtains, seats, neon and the band. */
import { disc, dither, OUT, px, rect, ring, shade } from './draw';
import { def } from './registry';

// ---- studio ---------------------------------------------------------------------------------------

def('klieg', (c, S, f) => {
  // a klieg light on a stand, beam animated by the renderer's light pass
  rect(c, 7, 8, 2, 8, '#2c2c38');
  rect(c, 4, 14, 8, 2, '#2c2c38');
  rect(c, 3, 1, 10, 8, OUT);
  rect(c, 4, 2, 8, 6, '#6a6a76');
  disc(c, 8, 5, 3, '#fff2b8');
  disc(c, 8, 5, 1, '#ffffff');
  rect(c, 3, 1, 10, 1, '#8a8a96');
  if (f % 20 > 17) disc(c, 8, 5, 3, '#ffe27a');
  void S;
}, { flavor: ['A klieg light hot enough to melt a candle. Somebody moved it: the tape marks on the floor are off by a foot.', 'The lamp burns white. Underneath, a smell of scorched dust.'], anim: [20, 1], light: { r: 64, color: '#fff0c0', flicker: 0.05 } });

def('film_camera', (c, S, f) => {
  rect(c, 7, 11, 2, 5, '#2c2c38');
  rect(c, 3, 14, 3, 2, '#2c2c38');
  rect(c, 10, 14, 3, 2, '#2c2c38');
  rect(c, 2, 4, 9, 7, OUT);
  rect(c, 3, 5, 7, 5, '#5a5a66');
  rect(c, 3, 5, 7, 1, '#8a8a96');
  rect(c, 10, 6, 4, 4, OUT);
  disc(c, 12, 8, 1, '#8ad8ff');
  // film magazines
  disc(c, 4, 3, 2, OUT);
  disc(c, 8, 3, 2, OUT);
  disc(c, 4, 3, 1, '#c8c8d4');
  disc(c, 8, 3, 1, '#c8c8d4');
  px(c, 4 + (f % 2), 3, OUT);
  px(c, 8 + (f % 2), 3, OUT);
  void S;
}, { flavor: ['A big Mitchell camera. The film magazine is empty; somebody took the reel.', 'The camera lens still faces the spot where the crime was staged. Somebody\'s a director.'], anim: [2, 4] });

def('clapper', (c, _S, f) => {
  rect(c, 7, 8, 2, 8, '#2c2c38');
  rect(c, 2, 6, 12, 8, OUT);
  rect(c, 3, 8, 10, 5, '#2a2a34');
  for (let x = 3; x < 13; x += 2) px(c, x, 10, '#e8e8e0');
  const open = f % 30 > 26;
  for (let x = 2; x < 14; x += 4) {
    rect(c, x, open ? 3 : 4, 2, 3, '#f4f4ee');
    rect(c, x + 2, open ? 3 : 4, 2, 3, '#1c1c24');
  }
  rect(c, 2, open ? 5 : 6, 12, 1, OUT);
}, { flavor: ['A clapperboard: SCENE 9, TAKE 1. Somebody scribbled out the take number and wrote "LAST".', 'You snap the clapper. Somewhere a very tired assistant director flinches.'], anim: [30, 1], sfx: 'clap' });

def('director_chair', (c, S, _f, v) => {
  rect(c, 3, 2, 10, 5, OUT);
  rect(c, 4, 3, 8, 3, at2(v));
  rect(c, 3, 8, 10, 3, OUT);
  rect(c, 4, 8, 8, 2, at2(v));
  rect(c, 3, 11, 1, 5, S.wood[2]);
  rect(c, 12, 11, 1, 5, S.wood[2]);
  rect(c, 4, 13, 8, 1, S.wood[2]);
  rect(c, 6, 4, 4, 1, '#f4f4ee');
}, { flavor: ['A director\'s chair. The back reads NOT YOU.', 'Somebody was sitting here recently; the canvas is still warm.'] });
const at2 = (v: number): string => (['#c23c3c', '#2a3a5a', '#3a3a44'] as const)[v % 3] as string;

def('flat', (c, S, _f, v) => {
  // a painted set flat: fake house, fake sky
  rect(c, 0, 1, 16, 14, OUT);
  rect(c, 1, 2, 14, 12, v % 2 ? '#9ed6f2' : '#d8b48a');
  if (v % 2) {
    rect(c, 1, 9, 14, 5, '#5aa84a');
    rect(c, 3, 3, 5, 2, '#ffffff');
  } else {
    rect(c, 3, 4, 10, 8, '#a8623c');
    rect(c, 5, 6, 3, 3, '#f0dcb0');
    rect(c, 9, 8, 3, 4, '#5a3520');
  }
  rect(c, 6, 15, 4, 1, S.wood[2]);
  rect(c, 1, 2, 14, 1, 'rgba(255,255,255,0.25)');
}, { flavor: ['A painted flat. From the front it is a pretty house; from behind it is plywood and braces.', 'The paint is still tacky. Whatever happened here, it happened in the last hour.'] });

def('light_stand', (c) => {
  rect(c, 7, 4, 2, 12, '#2c2c38');
  rect(c, 5, 14, 6, 2, '#2c2c38');
  rect(c, 4, 1, 8, 5, OUT);
  rect(c, 5, 2, 6, 3, '#fff2b8');
}, { flavor: ['A studio lamp on a stand. It was moved after the last take.'], light: { r: 40, color: '#fff2c0', flicker: 0.03 } });

def('reel_stack', (c, S) => {
  for (const [x, y] of [[2, 9], [9, 9], [5, 3]] as const) {
    rect(c, x, y, 6, 6, OUT);
    disc(c, x + 3, y + 3, 3, '#3a3a44');
    disc(c, x + 3, y + 3, 1, '#c8c8d4');
    rect(c, x, y + 6, 6, 1, S.metal[2]);
  }
}, { flavor: ['Canisters of film, labelled in three different hands. One label has been altered.', 'A stack of reels. The top can is blank, and rattles.'] });

def('projector', (c, S, f) => {
  rect(c, 1, 4, 12, 11, OUT);
  rect(c, 2, 5, 10, 9, '#4a4a56');
  rect(c, 2, 5, 10, 1, '#7a7a88');
  disc(c, 5, 3, 3, OUT);
  disc(c, 5, 3, 2, '#767684');
  px(c, 5 + (f % 2), 2, OUT);
  rect(c, 12, 7, 3, 4, '#2c2c38');
  rect(c, 13, 8, 2, 2, '#fff2b8');
  rect(c, 3, 8, 6, 3, '#26262e');
  px(c, 4, 9, f % 2 ? '#ffe27a' : '#c8b060');
  void S;
}, { flavor: ['The projector whirrs. A jittering beam falls on a wall with nothing on it.', 'A reel is threaded. The film running through it is not what the label says.'], anim: [2, 3], sfx: 'projector', light: { r: 44, color: '#fff0c0', flicker: 0.2 } });

def('mixing_desk', (c, _S, f) => {
  rect(c, 0, 5, 16, 11, OUT);
  rect(c, 1, 6, 14, 8, '#3a3a46');
  rect(c, 1, 6, 14, 1, '#6a6a78');
  for (let i = 0; i < 6; i++) {
    rect(c, 2 + i * 2, 8, 1, 5, '#1c1c24');
    rect(c, 1 + i * 2, 9 + ((i * 2 + (f >> 3)) % 3), 3, 1, i % 2 ? '#e8e4d0' : '#c23c3c');
  }
  disc(c, 13, 8, 1, '#5be8a0');
  px(c, 13, 11, f % 8 < 4 ? '#ff5a4a' : '#7a2a2a');
}, { flavor: ['A mixing console with a row of faders. Someone pushed them all to zero. Silence, on purpose.', 'Reel-to-reel turning. It has recorded something no one ought to have heard.'], anim: [8, 8] });

def('costume_rack', (c, S, _f, v) => {
  rect(c, 1, 3, 14, 1, S.metal[1]);
  rect(c, 1, 3, 1, 13, S.metal[2]);
  rect(c, 14, 3, 1, 13, S.metal[2]);
  const cols = [['#c23c3c', '#2a3a5a', '#e8b030'], ['#4a9a6a', '#8a4aa0', '#e8dcc0'], ['#2a2a34', '#c8a040', '#a83248']] as const;
  const pal = cols[v % 3] as readonly string[];
  for (let i = 0; i < 4; i++) {
    const col = pal[i % 3] as string;
    rect(c, 2 + i * 3, 4, 3, 10, OUT);
    rect(c, 3 + i * 3, 5, 2, 8, col);
    rect(c, 3 + i * 3, 5, 2, 1, shade(col, 0.3));
  }
}, { flavor: ['A rack of costumes for a picture that was never finished.', 'Somebody has been through these in a hurry; a sleeve trails on the floor, torn.'] });

def('mannequin', (c, S) => {
  rect(c, 7, 12, 2, 4, S.wood[2]);
  rect(c, 4, 15, 8, 1, S.wood[2]);
  rect(c, 4, 6, 8, 7, OUT);
  rect(c, 5, 7, 6, 5, '#d8b898');
  rect(c, 3, 7, 2, 3, OUT);
  rect(c, 11, 7, 2, 3, OUT);
  disc(c, 8, 4, 2, '#e8d0b0');
  rect(c, 5, 8, 6, 3, S.cloth[0]);
  rect(c, 5, 8, 6, 1, shade(S.cloth[0], 0.3));
}, { flavor: ['A dressmaker\'s dummy. It keeps the secret of what it was pinned into.', 'The mannequin wears a coat identical to one somebody was seen in. A joke, or a signature?'] });

def('sewing', (c, S, f) => {
  rect(c, 0, 5, 16, 10, OUT);
  rect(c, 1, 6, 14, 8, S.wood[1]);
  rect(c, 1, 6, 14, 1, S.wood[0]);
  rect(c, 3, 3, 6, 5, '#2a2a34');
  rect(c, 3, 3, 6, 1, '#6a6a78');
  rect(c, 8, 5, 3, 1, '#8a8a98');
  px(c, 8, 6 + (f % 2), '#d6b458');
  rect(c, 11, 8, 3, 3, '#c23c3c');
  rect(c, 12, 7, 1, 1, '#f4f4ee');
}, { flavor: ['A sewing machine with a half-finished hem. The thread is a colour that does not belong to any costume.'], anim: [2, 5] });

def('vanity', (c, S, f) => {
  rect(c, 1, 0, 14, 8, OUT);
  rect(c, 2, 1, 12, 6, '#cfe2ee');
  rect(c, 2, 1, 12, 2, '#f4fbff');
  for (const x of [2, 6, 10, 13]) px(c, x, 0, (f + x) % 9 === 0 ? '#ffe27a' : '#fff6c8');
  for (const x of [1, 14]) for (const y of [2, 4, 6]) px(c, x, y, '#fff6c8');
  rect(c, 0, 8, 16, 8, OUT);
  rect(c, 1, 9, 14, 6, S.wood[1]);
  rect(c, 3, 9, 3, 2, '#e86a8a');
  rect(c, 8, 10, 2, 3, '#c8c8d4');
  rect(c, 11, 9, 3, 2, '#f4dcc0');
}, { flavor: ['A dressing-table mirror ringed with bulbs. One bulb has been unscrewed, deliberately.', 'Greasepaint, powder, and a note tucked into the mirror frame. Half of it is torn away.'], anim: [9, 20], light: { r: 32, color: '#fff0b0', flicker: 0.08 }, wall: true });

def('jukebox', (c, S, f) => {
  rect(c, 2, 1, 12, 15, OUT);
  rect(c, 3, 2, 10, 13, '#a83248');
  rect(c, 4, 3, 8, 6, '#ffd070');
  rect(c, 4, 3, 8, 1, '#fff4c0');
  for (let i = 0; i < 4; i++) rect(c, 5 + i * 2, 4 + ((f >> 2) + i) % 4, 1, 2, '#c23c3c');
  rect(c, 4, 10, 8, 4, '#3a3a44');
  disc(c, 8, 12, 1, S.accent);
  rect(c, 2, 1, 12, 1, '#ff8a5a');
}, { flavor: ['The jukebox is playing a waltz nobody selected.', 'A record is stuck on the same scratchy line, over and over.'], anim: [8, 6], sfx: 'jukebox', light: { r: 34, color: '#ffb060', flicker: 0.2 } });

def('diner_booth', (c, S, _f, v) => {
  rect(c, 0, 2, 16, 14, OUT);
  rect(c, 1, 3, 14, 5, '#c23c3c');
  rect(c, 1, 3, 14, 1, '#e86a6a');
  rect(c, 1, 9, 14, 6, '#c23c3c');
  rect(c, 1, 9, 14, 1, '#e86a6a');
  rect(c, 3, 6, 10, 4, '#f0efe8');
  rect(c, 3, 6, 10, 1, '#ffffff');
  disc(c, 6, 8, 1, '#f4f4ee');
  disc(c, 10, 8, 1, '#f4f4ee');
  void S; void v;
}, { flavor: ['A booth with a view of the door. Old hands always sit here.', 'A coffee ring, a sugar packet, and a folded napkin with a name on it.'] });

def('prop_rack', (c, S) => {
  rect(c, 0, 12, 16, 4, S.wood[2]);
  rect(c, 0, 12, 16, 1, S.wood[1]);
  for (let i = 0; i < 4; i++) {
    rect(c, 2 + i * 3, 1 + (i % 2), 1, 12, S.metal[0]);
    rect(c, 1 + i * 3, 7 + (i % 2), 3, 1, S.accent);
    px(c, 2 + i * 3, 1 + (i % 2), '#ffffff');
  }
}, { flavor: ['A rack of prop swords and canes. One of them is a little too heavy to be plastic.', 'Rubber daggers, tin crowns. And one real steel blade that should not be here.'] });

def('throne', (c, S) => {
  rect(c, 3, 0, 10, 16, OUT);
  rect(c, 4, 1, 8, 10, '#8a2a3a');
  rect(c, 4, 1, 8, 1, S.accent);
  rect(c, 3, 0, 2, 3, S.accent);
  rect(c, 11, 0, 2, 3, S.accent);
  rect(c, 4, 10, 8, 4, S.cloth[0]);
  rect(c, 3, 8, 2, 7, S.accent);
  rect(c, 11, 8, 2, 7, S.accent);
}, { flavor: ['A throne made of plywood and paint. It creaks if you look at it.', 'The velvet is worn shiny by a hundred impatient understudies.'] });

def('cable_coil', (c) => {
  disc(c, 8, 9, 6, OUT);
  disc(c, 8, 9, 5, '#2c2c38');
  disc(c, 8, 9, 3, '#3a3a48');
  disc(c, 8, 9, 1, OUT);
  rect(c, 13, 12, 3, 1, '#2c2c38');
  px(c, 5, 6, '#6a6a7a');
}, { flavor: ['Thick black cable, coiled like a sleeping snake. It leads somewhere important.'] });

def('water_tower', (c, S) => {
  rect(c, 3, 2, 10, 6, OUT);
  rect(c, 4, 3, 8, 4, '#8a5a3c');
  rect(c, 4, 3, 8, 1, '#b07c50');
  rect(c, 2, 1, 12, 2, OUT);
  rect(c, 3, 1, 10, 1, '#6a4a30');
  for (const x of [4, 11]) rect(c, x, 8, 1, 8, OUT);
  rect(c, 5, 9, 6, 1, S.metal[2]);
  rect(c, 6, 5, 4, 1, '#f4f4ee');
}, { flavor: ['The studio water tower, painted with the name in letters bigger than any star.'] });

// ---- theatre --------------------------------------------------------------------------------------

def('curtain', (c, S, f, v) => {
  // v0 plain velvet, v1 with tassel. Sways a little.
  const col = '#9a1f34';
  rect(c, 0, 0, 16, 16, shade(col, -0.35));
  for (let x = 0; x < 16; x += 4) {
    const sway = Math.round(Math.sin((f + x) / 5) * 0.6);
    rect(c, x + sway, 0, 3, 16, col);
    rect(c, x + sway, 0, 1, 16, shade(col, 0.28));
    rect(c, x + 2 + sway, 0, 1, 16, shade(col, -0.3));
  }
  rect(c, 0, 0, 16, 2, S.accent);
  rect(c, 0, 2, 16, 1, shade(S.accent, -0.4));
  if (v === 1) {
    rect(c, 7, 8, 2, 5, S.accent);
    px(c, 7, 13, S.accent);
    px(c, 8, 13, S.accent);
  }
}, { flavor: ['Heavy velvet. A hand has recently brushed the fabric aside, then let it fall.', 'The curtain smells of dust, greasepaint and fear.'], anim: [10, 6], wall: false });

def('seats', (c, S, _f, v) => {
  // a row of red velvet seats
  rect(c, 0, 4, 16, 12, OUT);
  for (let i = 0; i < 2; i++) {
    const x = 1 + i * 7;
    rect(c, x, 5, 7, 5, '#9a1f34');
    rect(c, x, 5, 7, 1, '#c23c5a');
    rect(c, x + 1, 10, 5, 4, '#7a1628');
    rect(c, x + 1, 10, 5, 1, '#a02840');
  }
  rect(c, 0, 15, 16, 1, S.accent);
  if (v === 1) {
    // an occupied seat: a top hat
    rect(c, 3, 3, 3, 3, '#1c1c24');
    rect(c, 2, 5, 5, 1, '#1c1c24');
  }
}, { flavor: ['Velvet seats in rows. Someone left a programme; a name is underlined in pencil.', 'A folded opera glass on a seat. It is trained on a box across the auditorium.'] });

def('pit_rail', (c, S) => {
  rect(c, 0, 2, 16, 3, S.metal[0]);
  rect(c, 0, 2, 16, 1, '#fff0b0');
  rect(c, 0, 5, 16, 1, S.metal[2]);
  for (let x = 1; x < 16; x += 5) rect(c, x, 5, 2, 10, S.metal[1]);
  rect(c, 0, 14, 16, 2, 'rgba(0,0,0,0.5)');
}, { flavor: ['A brass rail at the edge of the orchestra pit. Below, the musicians\' stands wait.'] });

def('music_stand', (c, S, f) => {
  rect(c, 7, 7, 2, 8, S.metal[2]);
  rect(c, 5, 14, 6, 2, S.metal[2]);
  rect(c, 3, 2, 10, 6, OUT);
  rect(c, 4, 3, 8, 4, '#f4efe2');
  for (let y = 4; y < 7; y++) rect(c, 5, y, 6, 1, y % 2 ? '#a8a08c' : '#1c1c24');
  px(c, 10, 4 + (f >> 4) % 3, '#1c1c24');
}, { flavor: ['A music stand, a pencil on the ledge. The score is open to the last movement.'], anim: [3, 40] });

def('cello', (c, S) => {
  rect(c, 5, 1, 6, 4, OUT);
  rect(c, 6, 2, 4, 2, S.wood[1]);
  disc(c, 8, 8, 4, OUT);
  disc(c, 8, 8, 3, S.wood[0]);
  disc(c, 8, 12, 3, OUT);
  disc(c, 8, 12, 2, S.wood[0]);
  rect(c, 8, 1, 1, 14, '#2a1a10');
  rect(c, 7, 8, 1, 1, '#1c1c24');
  rect(c, 9, 8, 1, 1, '#1c1c24');
  rect(c, 7, 15, 2, 1, S.metal[1]);
}, { flavor: ['A cello propped against a chair. A string has been snapped, cleanly, with something sharp.', 'You pluck a string. It sounds guilty.'], sfx: 'cello' });

def('drum_kit', (c, _S, f) => {
  disc(c, 8, 10, 5, OUT);
  disc(c, 8, 10, 4, '#a83248');
  disc(c, 8, 10, 3, '#f0ead8');
  disc(c, 3, 5, 3, OUT);
  disc(c, 3, 5, 2, '#c9b06a');
  disc(c, 13, 5, 3, OUT);
  disc(c, 13, 5, 2, '#c9b06a');
  rect(c, 7, 2, 3, 3, '#f0ead8');
  rect(c, 7, 2, 3, 1, OUT);
  px(c, 3, 5, (f >> 3) % 2 ? '#fff0b0' : '#e0c880');
}, { flavor: ['A drum kit. The snare has a small tear in the skin, as if someone tested it with a blade.', 'You tap a cymbal. It sings out, and every head in the room turns.'], sfx: 'drum', anim: [2, 8] });

def('double_bass', (c, S) => {
  disc(c, 8, 12, 4, OUT);
  disc(c, 8, 12, 3, S.wood[0]);
  disc(c, 8, 6, 3, OUT);
  disc(c, 8, 6, 2, S.wood[1]);
  rect(c, 8, 0, 1, 9, '#1a1008');
  rect(c, 7, 0, 3, 2, '#1a1008');
  rect(c, 6, 9, 1, 1, OUT);
  rect(c, 10, 9, 1, 1, OUT);
}, { flavor: ['A double bass, tall as a man and twice as stubborn.'], sfx: 'bass' });

def('spotlight', (c, S, f) => {
  rect(c, 7, 10, 2, 6, '#2c2c38');
  rect(c, 3, 2, 10, 8, OUT);
  rect(c, 4, 3, 8, 6, '#54545e');
  disc(c, 8, 6, 2, f % 40 < 38 ? '#fff6c8' : '#c8b878');
  rect(c, 3, 2, 10, 1, '#7a7a86');
  void S;
}, { flavor: ['A stage spot. The gel is a very pale pink: the sort you use for a leading lady.'], light: { r: 50, color: '#ffe0e8', flicker: 0.04 }, anim: [40, 1] });

def('skull', (c, S) => {
  rect(c, 6, 10, 4, 6, S.wood[2]);
  rect(c, 5, 15, 6, 1, S.wood[2]);
  disc(c, 8, 6, 4, OUT);
  disc(c, 8, 6, 3, '#f0ead8');
  rect(c, 6, 5, 2, 2, OUT);
  rect(c, 9, 5, 2, 2, OUT);
  rect(c, 7, 8, 2, 1, OUT);
  rect(c, 6, 9, 5, 1, '#f0ead8');
}, { flavor: ['Poor Yorick, papier-mâché. He has seen a hundred understudies weep.', 'The skull rattles. Something is hidden in its hollow: a note, folded small.'] });

def('sandbag', (c, S) => {
  rect(c, 3, 5, 10, 10, OUT);
  rect(c, 4, 6, 8, 8, '#c8b48a');
  rect(c, 4, 6, 8, 2, '#e4d4a8');
  rect(c, 6, 3, 4, 3, OUT);
  rect(c, 7, 4, 2, 2, '#6a5a3a');
  rect(c, 7, 0, 2, 4, S.metal[1]);
}, { flavor: ['A sandbag on a rope. Somebody has cut its brother loose.', 'A counterweight, meant to hold, not to fall.'] });

def('winch', (c, S, f) => {
  rect(c, 2, 4, 12, 10, OUT);
  rect(c, 3, 5, 10, 8, S.wood[1]);
  disc(c, 8, 9, 4, OUT);
  disc(c, 8, 9, 3, S.metal[1]);
  disc(c, 8, 9, 1, S.metal[0]);
  const a = (f / 6) * Math.PI;
  rect(c, 8 + Math.round(Math.cos(a) * 5), 9 + Math.round(Math.sin(a) * 5), 2, 2, S.wood[0]);
  rect(c, 13, 6, 2, 8, '#c9a86a');
}, { flavor: ['A rope winch for the scenery. The brake was released recently.'], anim: [12, 8] });

def('box_front', (c, S) => {
  rect(c, 0, 4, 16, 12, OUT);
  rect(c, 1, 5, 14, 9, '#9a1f34');
  rect(c, 1, 5, 14, 2, S.accent);
  for (let x = 2; x < 15; x += 3) {
    rect(c, x, 8, 1, 6, S.accent);
    px(c, x, 7, S.accent);
  }
  rect(c, 0, 14, 16, 2, S.accent);
  rect(c, 0, 2, 16, 3, S.wood[0]);
}, { flavor: ['The gilded front of a box. From here you can see everything on stage, and everyone can see you.'] });

def('column', (c, S) => {
  rect(c, 4, 0, 8, 16, OUT);
  rect(c, 5, 1, 6, 14, '#e8dcc0');
  rect(c, 5, 1, 2, 14, '#f8f0d8');
  rect(c, 9, 1, 2, 14, '#c8bc9c');
  rect(c, 3, 0, 10, 2, S.accent);
  rect(c, 3, 14, 10, 2, S.accent);
  for (let y = 3; y < 13; y += 3) rect(c, 7, y, 1, 2, '#b4a888');
}, { flavor: ['A gilded column. Carved acanthus leaves, and a tiny chip in the base where something hit it.'] });

def('wardrobe', (c, S) => {
  rect(c, 1, 0, 14, 16, OUT);
  rect(c, 2, 1, 12, 14, S.wood[1]);
  rect(c, 3, 2, 4, 12, S.wood[0]);
  rect(c, 9, 2, 4, 12, S.wood[0]);
  rect(c, 3, 2, 4, 1, shade(S.wood[0], 0.3));
  rect(c, 9, 2, 4, 1, shade(S.wood[0], 0.3));
  rect(c, 7, 7, 1, 2, S.accent);
  rect(c, 8, 7, 1, 2, S.accent);
  rect(c, 1, 15, 14, 1, 'rgba(0,0,0,0.3)');
}, { flavor: ['A tall wardrobe. Inside: a cloak with a torn hem, and a smell of stage smoke.', 'Locked. You hear something sliding around inside, and think better of it.'], wall: true });

// ---- jazz club ------------------------------------------------------------------------------------

def('neon', (c, S, f, v) => {
  // v0 martini glass, v1 star, v2 sax note, v3 arrow
  const on = f % 40 < 34 || f % 4 < 2;
  const col = [S.accent, '#3de0ff', '#ffe040', '#ff8a3a'][v % 4] as string;
  rect(c, 1, 1, 14, 13, '#181820');
  rect(c, 1, 1, 14, 1, '#3a3a48');
  if (!on) {
    for (let y = 3; y < 12; y++) px(c, 7, y, '#3a3a48');
    return;
  }
  const g = (x: number, y: number) => {
    px(c, x, y, col);
    px(c, x, y - 1, 'rgba(255,255,255,0.35)');
  };
  if (v % 4 === 0) {
    for (let i = 0; i < 6; i++) {
      g(3 + i, 3 + i);
      g(12 - i, 3 + i);
    }
    for (let y = 8; y < 12; y++) g(7, y);
    for (let x = 5; x < 10; x++) g(x, 12);
    for (let x = 4; x < 12; x++) px(c, x, 3, col);
    px(c, 9, 5, '#7cff8a');
  } else if (v % 4 === 1) {
    for (const [x, y] of [[8, 2], [8, 12], [3, 5], [13, 5], [5, 11], [11, 11]] as const) g(x, y);
    for (let i = 0; i < 5; i++) {
      g(8 - i / 2, 4 + i);
      g(8 + i / 2, 4 + i);
    }
    for (let x = 4; x < 12; x++) px(c, x, 6, col);
  } else if (v % 4 === 2) {
    for (let y = 2; y < 9; y++) g(6, y);
    for (let x = 6; x < 11; x++) px(c, x, 9, col);
    disc(c, 11, 10, 2, col);
    px(c, 12, 3, col);
    for (let x = 7; x < 12; x++) px(c, x, 2, col);
  } else {
    for (let x = 2; x < 13; x++) g(x, 7);
    for (let i = 0; i < 4; i++) {
      g(9 + i, 4 + i);
      g(9 + i, 10 - i);
    }
  }
  dither(c, 1, 1, 14, 13, 'rgba(255,255,255,0.05)', f);
}, { flavor: ['The neon buzzes and stutters. Its glow paints everything pink and guilty.', 'A neon sign with a dying tube. It flickers in a rhythm that almost sounds like Morse.'], anim: [40, 1], light: { r: 46, color: '#ff5a9a', flicker: 0.5 }, wall: false });

def('round_table', (c, S, f) => {
  rect(c, 6, 11, 4, 5, '#2a2a34');
  disc(c, 8, 7, 7, OUT);
  disc(c, 8, 7, 6, S.cloth[1]);
  disc(c, 8, 7, 6, '#f0e8d8');
  ring(c, 8, 7, 5, S.cloth[1]);
  rect(c, 7, 5, 2, 3, '#f4f0d8');
  px(c, 8, 4, f % 6 < 3 ? '#ffd070' : '#ff9a3a');
  px(c, 5, 8, '#c8d8e8');
  px(c, 11, 8, '#c8d8e8');
}, { flavor: ['A round table with a candle and two glasses. One glass has a lipstick print. The other has been wiped.', 'The candle has burned down to a stub. Whoever sat here stayed for hours.'], anim: [6, 5], light: { r: 22, color: '#ffc070', flicker: 0.3 } });

def('bar_counter', (c, S) => {
  rect(c, 0, 3, 16, 13, OUT);
  rect(c, 0, 4, 16, 4, S.wood[0]);
  rect(c, 0, 4, 16, 1, shade(S.wood[0], 0.4));
  rect(c, 0, 8, 16, 7, S.wood[1]);
  for (let x = 1; x < 16; x += 4) rect(c, x, 9, 2, 5, S.wood[2]);
  rect(c, 0, 14, 16, 1, S.metal[0]);
  rect(c, 2, 2, 2, 3, '#c8d8e8');
  rect(c, 9, 2, 3, 2, '#c8d8e8');
  px(c, 3, 2, '#ffffff');
}, { flavor: ['The bar top is polished by ten thousand elbows. A ring where a glass stood is still wet.', 'Someone has carved a tally into the wood, and then crossed it out.'] });

def('bottle_shelf', (c, S, f) => {
  rect(c, 0, 0, 16, 16, S.wood[2]);
  rect(c, 1, 1, 14, 14, '#1c1418');
  const cols = ['#3a8a4a', '#c8842c', '#a83248', '#c8d8e8', '#5a3a2a', '#3f79bd'];
  for (const y of [1, 6, 11]) {
    rect(c, 1, y + 4, 14, 1, S.wood[1]);
    for (let x = 2; x < 14; x += 3) {
      const col = cols[(x + y) % 6] as string;
      rect(c, x, y, 2, 4, col);
      px(c, x, y, shade(col, 0.4));
    }
  }
  rect(c, 1, 1, 14, 1, 'rgba(255,220,160,0.25)');
  if (f % 12 < 6) px(c, 6, 3, '#ffffff');
}, { flavor: ['Bottles in ranks, half of them labelled for medicinal use. One gap in the line: a bottle recently taken.', 'The good stuff is at the back. The back has been disturbed.'], anim: [12, 8], wall: true, light: { r: 26, color: '#ffc070', flicker: 0.1 } });

def('still', (c, _S, f) => {
  rect(c, 3, 7, 10, 9, OUT);
  disc(c, 8, 10, 5, '#b86a3a');
  disc(c, 8, 10, 4, '#d8884a');
  disc(c, 6, 8, 1, '#f0b078');
  rect(c, 7, 2, 2, 5, '#b86a3a');
  rect(c, 8, 2, 6, 1, '#b86a3a');
  rect(c, 13, 2, 1, 8, '#b86a3a');
  if (f % 6 < 3) rect(c, 6 + (f % 3), 0, 2, 2, 'rgba(240,240,250,0.6)');
  rect(c, 10, 14, 4, 2, '#3a3a44');
}, { flavor: ['A copper still, gurgling to itself. If the police found this, the whole club would be finished.', 'The still is warm. Somebody has been cooking something illegal, and recently.'], anim: [12, 6], light: { r: 26, color: '#ff9a4a', flicker: 0.3 } });

def('safe', (c, S) => {
  rect(c, 1, 3, 14, 13, OUT);
  rect(c, 2, 4, 12, 11, '#5a6672');
  rect(c, 2, 4, 12, 2, '#8a98a4');
  rect(c, 3, 7, 10, 7, '#4a5662');
  disc(c, 8, 10, 3, '#8a98a4');
  disc(c, 8, 10, 2, '#5a6672');
  rect(c, 7, 9, 2, 1, '#e8e4d0');
  px(c, 8, 10, '#d6b458');
  rect(c, 11, 8, 2, 4, '#3a4652');
  void S;
}, { flavor: ['A safe with the door ajar. Empty, except for a burnt scrap of paper.', 'The safe has been opened without force. Whoever did this knew the combination.'] });

def('phonograph', (c, S, f) => {
  rect(c, 2, 8, 12, 8, OUT);
  rect(c, 3, 9, 10, 6, S.wood[1]);
  disc(c, 8, 9, 5, '#1c1c24');
  disc(c, 8, 9, 1, '#c23c3c');
  px(c, 8 + Math.round(Math.cos(f / 2) * 3), 9 + Math.round(Math.sin(f / 2) * 3), '#4a4a58');
  rect(c, 10, 2, 4, 1, S.metal[0]);
  rect(c, 13, 2, 1, 6, S.metal[0]);
  rect(c, 3, 2, 6, 5, S.accent);
  rect(c, 4, 3, 4, 3, '#d8b040');
}, { flavor: ['A phonograph, still spinning. The needle skips on a scratch; a woman\'s voice sings a lullaby.', 'The record on the turntable is labelled with a name that isn\'t on any guest list.'], anim: [12, 3], sfx: 'jazz' });

def('coat_rack', (c, S, _f, v) => {
  rect(c, 7, 1, 2, 14, S.wood[2]);
  rect(c, 4, 14, 8, 2, S.wood[2]);
  const cols = ['#3a3a44', '#7a4a3a', '#5a6a78', '#8a2a3a'];
  for (let i = 0; i < 3; i++) {
    const col = cols[(i + v) % 4] as string;
    rect(c, 1 + i * 5, 3, 4, 9, OUT);
    rect(c, 2 + i * 5, 4, 2, 7, col);
    rect(c, 2 + i * 5, 4, 2, 1, shade(col, 0.3));
  }
  rect(c, 2, 2, 12, 1, S.metal[1]);
}, { flavor: ['Coats on hangers, one on a hook by itself. A ticket stub is tucked in the pocket.', 'The coat check ticket doesn\'t match any coat. Somebody took the wrong one, or the right one.'] });

def('fire_escape', (c, S, f) => {
  rect(c, 0, 0, 16, 16, '#2a2a34');
  for (let x = 0; x < 16; x += 4) rect(c, x, 0, 1, 16, '#3a3a46');
  rect(c, 0, 4, 16, 2, '#4a4a58');
  rect(c, 0, 10, 16, 2, '#4a4a58');
  for (let y = 5; y < 16; y += 3) rect(c, 3, y, 10, 1, '#5a5a68');
  rect(c, 0, 0, 2, 16, '#1c1c24');
  rect(c, 14, 0, 2, 16, '#1c1c24');
  if (f % 30 < 2) px(c, 8, 8, '#8a8a98');
  void S;
}, { flavor: ['A fire escape, slick with rain. Somebody has recently climbed it: there is fresh scuffing on every step.'], anim: [30, 1] });

def('dumpster', (c, S) => {
  rect(c, 0, 4, 16, 12, OUT);
  rect(c, 1, 5, 14, 10, '#3a5a4a');
  rect(c, 1, 5, 14, 2, '#5a8a72');
  rect(c, 0, 3, 16, 3, '#2a4a3a');
  rect(c, 1, 8, 14, 1, '#2a4a3a');
  rect(c, 1, 12, 14, 1, '#2a4a3a');
  rect(c, 3, 14, 2, 2, '#1c1c24');
  rect(c, 11, 14, 2, 2, '#1c1c24');
  void S;
}, { flavor: ['A dumpster that smells like all of tonight\'s regrets.', 'Someone went through this recently: a bag torn open, an envelope not quite burned.'] });

def('trash_can', (c) => {
  rect(c, 4, 4, 8, 12, OUT);
  rect(c, 5, 5, 6, 10, '#6a7280');
  rect(c, 5, 5, 2, 10, '#8a92a0');
  rect(c, 3, 3, 10, 2, '#4a5260');
  rect(c, 5, 8, 6, 1, '#4a5260');
  rect(c, 5, 12, 6, 1, '#4a5260');
}, { flavor: ['A trash can with a folded newspaper on top. Dated tonight; a page has been torn out.'] });

def('vent_steam', (c, S, f) => {
  rect(c, 3, 10, 10, 5, OUT);
  rect(c, 4, 11, 8, 3, '#3a3a46');
  for (let x = 5; x < 12; x += 2) rect(c, x, 11, 1, 3, '#1c1c24');
  for (let i = 0; i < 4; i++) {
    const t = (f + i * 3) % 12;
    disc(c, 8 + Math.round(Math.sin((f + i) / 2) * 2), 9 - t, 1 + (t > 4 ? 1 : 0), `rgba(230,230,240,${0.7 - t * 0.05})`);
  }
  void S;
}, { flavor: ['A steam vent. The city breathes, and it smells of coal and wet pavement.'], anim: [12, 4], walk: false });

def('vintage_car', (c, S, _f, v) => {
  // v0 left half (front), v1 right half (rear): a black 1930s sedan
  const body = '#23232e';
  if (v === 0) {
    rect(c, 2, 4, 14, 11, OUT);
    rect(c, 3, 5, 13, 9, body);
    rect(c, 3, 5, 13, 2, '#5a5a6a');
    rect(c, 6, 6, 6, 4, '#7a9ab0');
    rect(c, 6, 6, 6, 1, '#cfe0ec');
    rect(c, 1, 8, 2, 4, '#e8e0a8');
    rect(c, 3, 14, 4, 2, '#1c1c24');
    rect(c, 3, 14, 4, 1, '#6a6a7a');
  } else {
    rect(c, 0, 4, 14, 11, OUT);
    rect(c, 0, 5, 13, 9, body);
    rect(c, 0, 5, 13, 2, '#5a5a6a');
    rect(c, 2, 6, 6, 4, '#7a9ab0');
    rect(c, 2, 6, 6, 1, '#cfe0ec');
    rect(c, 13, 9, 2, 3, '#c23c3c');
    rect(c, 9, 14, 4, 2, '#1c1c24');
    rect(c, 9, 14, 4, 1, '#6a6a7a');
  }
  void S;
}, { flavor: ['A big black sedan idling at the curb. The driver has been very patient for a very long time.', 'The bonnet is warm. This car has been driven tonight, hard.'] });

speckleUnused();
function speckleUnused(): void {}
