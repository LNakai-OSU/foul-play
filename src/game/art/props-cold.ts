/** Polar station and alpine lodge props: drifts, antennas, generators, monitors, skis, hot tubs and trophies. */
import { disc, dither, OUT, px, rect, ring, shade, speckle } from './draw';
import { def } from './registry';

def('drift', (c, S, _f, v) => {
  const [a, b, d] = S.snow;
  disc(c, 8, 11, 6, d);
  disc(c, 8, 10, 6, b);
  disc(c, 7, 9, 4, a);
  rect(c, 2, 13, 12, 3, b);
  if (v === 1) {
    rect(c, 6, 4, 4, 5, '#7a6a5a');
    rect(c, 5, 5, 6, 1, '#7a6a5a');
  }
  px(c, 5, 7, '#ffffff');
  dither(c, 3, 12, 10, 3, d, v);
}, { flavor: ['A snowdrift, wind-carved and sharp as a shark fin.', 'You poke it. Cold, powdery, keeping something to itself.'] });

def('antenna', (c, S, f) => {
  rect(c, 7, 4, 2, 12, S.metal[1]);
  rect(c, 7, 4, 1, 12, S.metal[0]);
  for (let y = 6; y < 15; y += 3) {
    rect(c, 5, y, 6, 1, S.metal[2]);
    px(c, 6, y + 1, S.metal[2]);
    px(c, 9, y + 1, S.metal[2]);
  }
  rect(c, 6, 3, 4, 1, S.metal[0]);
  disc(c, 8, 2, 1, f % 24 < 12 ? '#ff3a30' : '#7a2020');
  rect(c, 4, 15, 8, 1, S.snow[2]);
}, { flavor: ['The antenna hums in the wind. Somebody has been transmitting on it recently.', 'A red light blinks on top, steady as a heartbeat.'], anim: [24, 1], light: { r: 14, color: '#ff4a3a', flicker: 0 } });

def('radome', (c, S, _f, v) => {
  // v: 0 left half, 1 right half of a geodesic dome
  disc(c, v === 0 ? 16 : 0, 16, 15, OUT);
  disc(c, v === 0 ? 16 : 0, 16, 14, '#e8eef2');
  for (let i = 0; i < 14; i += 4) rect(c, 0, 16 - i - 1, 16, 1, '#b4c0c8');
  for (let x = 0; x < 16; x += 5) rect(c, (x + (v === 0 ? 0 : 2)) % 16, 2, 1, 14, '#b4c0c8');
  rect(c, v === 0 ? 8 : 2, 4, 4, 1, '#ffffff');
  rect(c, 0, 13, 16, 3, S.snow[1]);
}, { flavor: ['A radome, big as a house. Inside, something large turns slowly toward the stars.'] });

def('drum', (c, S, _f, v) => {
  const col = v === 0 ? '#e8772e' : v === 1 ? '#3f7fbf' : '#7a7a86';
  rect(c, 3, 3, 10, 13, OUT);
  rect(c, 4, 4, 8, 11, col);
  rect(c, 4, 4, 2, 11, shade(col, 0.3));
  rect(c, 10, 4, 2, 11, shade(col, -0.3));
  rect(c, 4, 7, 8, 1, shade(col, -0.4));
  rect(c, 4, 11, 8, 1, shade(col, -0.4));
  rect(c, 6, 3, 4, 1, S.metal[0]);
  rect(c, 5, 15, 6, 1, S.snow[1]);
}, { flavor: ['A fuel drum, stencilled DIESEL. The cap is loose. The rim is frosted.', 'It sloshes. Somebody has been siphoning; the ground beneath is stained.'] });

def('snowmobile', (c, S, _f, v) => {
  // v0 left half, v1 right half
  if (v === 0) {
    rect(c, 2, 11, 14, 4, OUT);
    rect(c, 3, 12, 13, 2, '#3a3a44');
    rect(c, 1, 12, 5, 2, '#e04a3c');
    rect(c, 6, 5, 9, 7, '#e04a3c');
    rect(c, 6, 5, 9, 2, '#f08a7a');
    rect(c, 8, 7, 5, 3, '#2a2a34');
    rect(c, 2, 15, 12, 1, S.snow[2]);
  } else {
    rect(c, 0, 5, 12, 7, '#c23c3c');
    rect(c, 0, 5, 12, 2, '#f08a7a');
    rect(c, 1, 7, 8, 3, '#2a2a34');
    rect(c, 0, 11, 14, 4, OUT);
    rect(c, 0, 12, 14, 2, '#3a3a44');
    rect(c, 11, 3, 3, 2, '#f4f4ee');
    rect(c, 0, 15, 14, 1, S.snow[2]);
  }
}, { flavor: ['A snowmobile, engine still faintly warm, though its owner swears it has not moved.', 'The keys are in the ignition. The tank is nearly empty.'] });

def('flag_pole', (c, S, f) => {
  rect(c, 7, 2, 1, 14, S.metal[1]);
  const w = f % 4;
  rect(c, 8, 2, 6, 4, '#e8772e');
  rect(c, 8, 2, 6, 1, '#f8a866');
  rect(c, 8 + (w > 1 ? 1 : 0), 6, 5, 1, '#e8772e');
  rect(c, 5, 15, 5, 1, S.snow[2]);
}, { flavor: ['A flag stiff with ice. It hasn\'t moved since the storm began.'], anim: [4, 12] });

def('marker', (c, S) => {
  rect(c, 7, 3, 2, 13, '#3a3a44');
  rect(c, 8, 3, 4, 3, '#e8772e');
  rect(c, 5, 15, 6, 1, S.snow[2]);
  px(c, 7, 3, '#f8a866');
}, { flavor: ['A marker flag for the route between buildings. In a whiteout, this is the difference between life and a very cold night.'] });

def('crate_snow', (c, S) => {
  rect(c, 1, 3, 14, 13, OUT);
  rect(c, 2, 5, 12, 10, S.wood[0]);
  rect(c, 2, 8, 12, 1, S.wood[2]);
  rect(c, 2, 12, 12, 1, S.wood[2]);
  rect(c, 1, 2, 14, 4, S.snow[0]);
  dither(c, 1, 5, 14, 2, S.snow[1], 0);
  px(c, 4, 4, S.snow[1]);
}, { flavor: ['A supply crate under a cap of snow. The stencil reads: DO NOT STACK. Someone stacked it.'] });

// ---- inside the modules ---------------------------------------------------------------------------

def('monitor_bank', (c, S, f, v) => {
  rect(c, 0, 4, 16, 12, OUT);
  rect(c, 1, 5, 14, 10, S.metal[2]);
  rect(c, 1, 5, 14, 1, S.metal[0]);
  for (const [x, w] of [[2, 6], [9, 5]] as const) {
    rect(c, x, 6, w, 5, '#0c1c2c');
    const col = ['#5be8a0', '#5bcfe8', '#f0c060'][v % 3] as string;
    for (let i = 0; i < 4; i++) rect(c, x + 1, 7 + i, 2 + ((f + i * 2 + x) % (w - 2)), 1, col);
  }
  for (let i = 0; i < 5; i++) px(c, 3 + i * 2, 13, (f + i) % 5 === 0 ? '#ff5a4a' : '#5be8a0');
}, { flavor: ['Data scrolls past on green glass. None of it makes sense to you, yet.', 'The last log entry was made at an hour when everyone claims to have been asleep.'], anim: [10, 6], light: { r: 26, color: '#7ad8c8', flicker: 0.1 }, wall: false });

def('radio_rack', (c, S, f) => {
  rect(c, 1, 0, 14, 16, OUT);
  rect(c, 2, 1, 12, 14, S.metal[1]);
  for (let r = 0; r < 3; r++) {
    const y = 2 + r * 4;
    rect(c, 3, y, 10, 3, S.metal[2]);
    disc(c, 5, y + 1, 1, '#e8e4d0');
    disc(c, 8, y + 1, 1, '#e8e4d0');
    px(c, 11, y + 1, (f + r) % 4 < 2 ? '#5be8a0' : '#2a5a40');
    px(c, 12, y + 1, (f + r) % 6 < 3 ? '#ff5a4a' : '#5a2a2a');
  }
  rect(c, 5, 14, 6, 1, '#1c1c24');
}, { flavor: ['You turn the dial. Static, then a faint voice counting numbers, then static again.', 'The radio is tuned to a frequency nobody logged.'], anim: [8, 10], sfx: 'static', light: { r: 20, color: '#8ee8c0', flicker: 0.15 }, wall: true });

def('radio', (c, S, f) => {
  rect(c, 2, 6, 12, 9, OUT);
  rect(c, 3, 7, 10, 7, S.wood[1]);
  rect(c, 4, 8, 5, 4, '#d6b458');
  rect(c, 4, 8, 5, 1, '#f0d888');
  disc(c, 11, 9, 1, '#e8e4d0');
  disc(c, 11, 12, 1, '#e8e4d0');
  px(c, 6 + (f % 3), 10, '#c02828');
  rect(c, 6, 3, 1, 4, S.metal[0]);
}, { flavor: ['A wireless set with a glowing dial. The last station it was tuned to is a mystery.', 'Crackle. Somewhere a dance band plays to an empty room.'], anim: [3, 20], sfx: 'static', light: { r: 18, color: '#ffd98a', flicker: 0.1 } });

def('generator', (c, _S, f) => {
  rect(c, 0, 2, 16, 14, OUT);
  rect(c, 1, 3, 14, 12, '#4a5a6a');
  rect(c, 1, 3, 14, 3, '#6a7c8e');
  rect(c, 2, 7, 12, 5, '#2c3844');
  for (let x = 3; x < 13; x += 2) rect(c, x, 8, 1, 3, '#1c242c');
  const s = f % 4;
  rect(c, 12, 4, 2, 1, s < 2 ? '#e8c440' : '#f8e880');
  disc(c, 4, 5, 1, s % 2 ? '#5be8a0' : '#2a5a40');
  rect(c, 0, 14, 16, 2, 'rgba(0,0,0,0.4)');
}, { flavor: ['The generator throbs. If it stopped, so would everything else.', 'A warm, oily thrum. Somebody has been at the fuel line.'], anim: [4, 5], light: { r: 34, color: '#ffb84a', flicker: 0.18 } });

def('telescope', (c, S) => {
  rect(c, 5, 12, 6, 3, OUT);
  rect(c, 6, 12, 4, 2, S.metal[1]);
  rect(c, 7, 9, 2, 4, S.metal[2]);
  const px0 = [[4, 9], [5, 8], [6, 7], [7, 6], [8, 5], [9, 4], [10, 3]] as const;
  for (const [x, y] of px0) {
    rect(c, x, y, 2, 2, OUT);
    px(c, x, y, S.metal[0]);
    px(c, x + 1, y + 1, S.metal[1]);
  }
  disc(c, 12, 2, 1, '#8ad8ff');
}, { flavor: ['You squint through the eyepiece: a hundred thousand stars and one small window, lit.', 'The telescope is pointed at the ground, not the sky. Curious.'] });

def('planter', (c, _S, f, v) => {
  rect(c, 0, 5, 16, 11, OUT);
  rect(c, 1, 6, 14, 9, '#5a3a2a');
  rect(c, 1, 6, 14, 2, '#7a5a3a');
  for (let i = 0; i < 4; i++) {
    const x = 2 + i * 3;
    rect(c, x + 1, 2, 1, 5, '#3f9a45');
    disc(c, x + 1, 3, 2, i % 2 ? '#63bd5a' : '#3f9a45');
    if ((i + v) % 3 === 0) px(c, x + 1, 2, '#ee6a8a');
  }
  rect(c, 0, 4, 16, 1, '#c89aff');
  dither(c, 0, 5, 16, 1, '#a76dff', f);
}, { flavor: ['Tomatoes, in the middle of a polar night. Somebody tends these lovingly.', 'The soil is freshly turned. Something was buried, or dug up.'], anim: [2, 20], light: { r: 30, color: '#c89aff', flicker: 0.05 } });

def('locker', (c, S, _f, v) => {
  rect(c, 2, 1, 12, 15, OUT);
  rect(c, 3, 2, 5, 13, S.metal[1]);
  rect(c, 9, 2, 4, 13, v % 2 ? '#3f7fbf' : S.metal[1]);
  rect(c, 3, 2, 5, 1, S.metal[0]);
  for (const y of [4, 5]) rect(c, 5, y, 2, 1, S.metal[2]);
  px(c, 7, 8, S.accent);
  px(c, 10, 8, S.accent);
}, { flavor: ['A locker with a padlock. Padlocks mean secrets, or a bad memory.', 'The name tag has been swapped. The handwriting does not match.'], wall: true });

def('lab_bench', (c, S, f, v) => {
  rect(c, 0, 5, 16, 11, OUT);
  rect(c, 1, 6, 14, 3, '#dfe6ea');
  rect(c, 1, 9, 14, 6, S.metal[1]);
  rect(c, 3, 10, 4, 4, S.metal[0]);
  rect(c, 9, 10, 4, 4, S.metal[0]);
  // glassware
  rect(c, 3, 2, 3, 5, 'rgba(180,230,255,0.7)');
  rect(c, 3, 4, 3, 3, v % 2 ? '#e86aa8' : '#6aa8e8');
  rect(c, 9, 4, 2, 3, '#b8d8e8');
  px(c, 10, 3 + (f % 2), '#f0f8ff');
  rect(c, 12, 4, 2, 3, '#3a3a44');
  px(c, 12, 4, '#8a98a4');
}, { flavor: ['Glassware, a burner, and a label that reads DO NOT TOUCH in three languages.', 'A lab bench where something was mixed and hastily cleaned away.'], anim: [2, 30] });

def('specimen_fridge', (c, _S) => {
  rect(c, 1, 0, 14, 16, OUT);
  rect(c, 2, 1, 12, 14, '#e4eef2');
  rect(c, 2, 1, 12, 2, '#bfe0f2');
  rect(c, 3, 4, 10, 10, '#a8c8d8');
  for (const y of [5, 9]) {
    rect(c, 4, y, 8, 3, '#8ab0c4');
    rect(c, 5, y, 2, 3, '#e8f4fa');
    rect(c, 9, y, 2, 3, '#c8e0ec');
  }
  rect(c, 12, 6, 1, 3, '#7a8a94');
}, { flavor: ['Sample tubes in neat rows. One rack has a gap where a vial ought to be.', 'The fridge hums at minus forty. Somebody left a sandwich in with the samples.'], wall: true });

def('airlock_hatch', (c, _S, f) => {
  rect(c, 1, 0, 14, 16, '#e8c440');
  for (let y = 0; y < 16; y += 4) rect(c, 1, y, 14, 2, '#2a2a30');
  rect(c, 3, 1, 10, 15, '#5a6672');
  rect(c, 4, 2, 8, 13, '#8a98a4');
  disc(c, 8, 6, 3, '#bfe8ff');
  ring(c, 8, 6, 3, '#3a4652');
  rect(c, 5, 10, 6, 1, '#3a4652');
  rect(c, 7, 9, 2, 4, '#c9d3da');
  disc(c, 13, 2, 1, (f >> 3) % 2 ? '#ff5a4a' : '#7a2a2a');
}, { flavor: ['The outer hatch. Beyond it: minus fifty and a wind like a knife.', 'Frost rimes the seal. Someone came in from the cold recently, and did not close it right.'], anim: [4, 20], wall: true });

def('suit_rack', (c, S, _f, v) => {
  rect(c, 1, 0, 14, 3, S.metal[1]);
  for (const x of [3, 9]) {
    const col = v % 2 ? '#e8772e' : '#d84a3c';
    rect(c, x, 3, 5, 11, OUT);
    rect(c, x + 1, 4, 3, 9, col);
    rect(c, x + 1, 4, 3, 1, shade(col, 0.3));
    disc(c, x + 2, 5, 2, '#cfd8de');
    rect(c, x + 1, 13, 1, 2, '#3a3a44');
    rect(c, x + 3, 13, 1, 2, '#3a3a44');
  }
}, { flavor: ['Cold-weather suits, hung up to dry. One is still damp inside.', 'Six suits on the rack. Seven hooks. One suit is missing.'], wall: true });

def('mess_table', (c, S, _f, v) => {
  rect(c, 0, 4, 16, 10, OUT);
  rect(c, 1, 5, 14, 8, S.metal[0]);
  rect(c, 1, 5, 14, 1, '#ffffff');
  rect(c, 1, 12, 14, 1, S.metal[2]);
  disc(c, 5, 8, 2, '#f4f4ee');
  disc(c, 11, 8, 2, '#f4f4ee');
  px(c, 5, 8, v % 2 ? '#c8842c' : '#8a5a3a');
  rect(c, 8, 6, 1, 2, '#c8c8d0');
  rect(c, 1, 13, 2, 3, OUT);
  rect(c, 13, 13, 2, 3, OUT);
}, { flavor: ['A canteen table bolted to the floor. Somebody\'s meal is still on the tray.', 'Two mugs. One was drunk from; one was poured and left.'] });

def('coffee_urn', (c, S, f) => {
  rect(c, 4, 3, 8, 12, OUT);
  rect(c, 5, 4, 6, 10, S.metal[0]);
  rect(c, 5, 4, 2, 10, '#ffffff');
  rect(c, 9, 4, 2, 10, S.metal[1]);
  rect(c, 6, 2, 4, 2, S.metal[1]);
  rect(c, 11, 8, 2, 1, S.metal[2]);
  px(c, 6, 11, f % 8 < 4 ? '#ff5a4a' : '#7a2a2a');
  if (f % 16 < 8) px(c, 12 - (f % 2), 5, 'rgba(255,255,255,0.7)');
}, { flavor: ['The coffee urn is bottomless and tastes like a punishment.', 'Still hot. Somebody made a fresh pot not long ago, at an hour when the station was supposed to be asleep.'], anim: [16, 14] });

def('sauna_stove', (c, _S, f) => {
  rect(c, 2, 4, 12, 12, OUT);
  rect(c, 3, 5, 10, 10, '#3a3a44');
  rect(c, 3, 5, 10, 1, '#5a5a66');
  for (let i = 0; i < 6; i++) disc(c, 5 + (i % 3) * 3, 7 + ((i / 3) | 0) * 3, 1, i % 2 ? '#6a4a3a' : '#8a6a5a');
  rect(c, 5, 12, 6, 3, f % 4 < 2 ? '#ff9a3a' : '#ff6a20');
  rect(c, 6, 12, 4, 1, '#ffe07a');
  if (f % 6 < 3) rect(c, 6 + (f % 3), 2, 2, 2, 'rgba(240,240,250,0.6)');
}, { flavor: ['The sauna stove ticks as it cools. Steam hisses from the stones.', 'Water thrown on the rocks, and a very quiet secret in the steam.'], anim: [12, 6], light: { r: 34, color: '#ff8a3a', flicker: 0.3 } });

def('sauna_bench', (c, S) => {
  rect(c, 0, 3, 16, 4, OUT);
  rect(c, 0, 3, 16, 3, S.wood[0]);
  rect(c, 0, 3, 16, 1, shade(S.wood[0], 0.35));
  rect(c, 0, 8, 16, 5, OUT);
  rect(c, 0, 8, 16, 4, S.wood[1]);
  for (let x = 3; x < 16; x += 5) rect(c, x, 3, 1, 3, S.wood[2]);
  rect(c, 2, 13, 2, 3, S.wood[2]);
  rect(c, 12, 13, 2, 3, S.wood[2]);
}, { flavor: ['A sauna bench, damp and pale. A towel is folded on it with hospital corners.'] });

def('ski_rack', (c, S, _f, v) => {
  rect(c, 0, 12, 16, 4, S.wood[2]);
  rect(c, 0, 12, 16, 1, S.wood[1]);
  const cols = ['#e04a3c', '#3f79bd', '#f4f4ee', '#4aa056', '#e8b030'];
  for (let i = 0; i < 5; i++) {
    const col = cols[(i + v) % 5] as string;
    rect(c, 1 + i * 3, 1 + (i % 2), 2, 13, col);
    rect(c, 1 + i * 3, 1 + (i % 2), 2, 2, shade(col, 0.3));
  }
  rect(c, 0, 8, 16, 1, S.metal[2]);
}, { flavor: ['Skis, racked and waxed. One pair is still wet, though the owner claims not to have gone out.', 'A row of skis with names on the tails. One pair has not been claimed.'], wall: true });

def('boots', (c, S) => {
  for (const x of [2, 9]) {
    rect(c, x, 8, 5, 7, OUT);
    rect(c, x + 1, 9, 3, 5, '#7a4a2a');
    rect(c, x + 1, 9, 3, 1, '#a06a3a');
    rect(c, x, 13, 5, 2, '#2a2a34');
    rect(c, x + 1, 6, 3, 3, '#e8e0cc');
  }
  dither(c, 2, 14, 12, 2, S.snow[1], 0);
}, { flavor: ['A pair of boots, caked in melting snow. The tread pattern is oddly familiar.', 'Wet boots left by the door. Somebody has been outside, and does not want to say so.'] });

def('sled', (c, S) => {
  rect(c, 1, 4, 14, 8, OUT);
  rect(c, 2, 5, 12, 6, S.wood[0]);
  rect(c, 2, 5, 12, 1, shade(S.wood[0], 0.3));
  rect(c, 0, 12, 16, 2, S.metal[1]);
  rect(c, 0, 12, 16, 1, S.metal[0]);
  rect(c, 3, 7, 3, 2, '#c23c3c');
}, { flavor: ['A sled leaning by the wall. Somebody has been dragging something heavy on it.'] });

def('log_stack', (c, S) => {
  for (const [x, y] of [[2, 10], [8, 10], [5, 6], [11, 6], [2, 2], [8, 2]] as const) {
    disc(c, x + 2, y + 2, 3, OUT);
    disc(c, x + 2, y + 2, 2, S.wood[0]);
    px(c, x + 2, y + 2, S.wood[2]);
  }
  dither(c, 0, 13, 16, 3, S.wood[2], 0);
}, { flavor: ['Split logs, stacked to the ceiling. Something is wedged between two of them, but it is only a mitten.'] });

def('hot_tub', (c, S, f) => {
  rect(c, 0, 2, 16, 14, OUT);
  rect(c, 1, 3, 14, 12, S.wood[1]);
  rect(c, 2, 4, 12, 10, '#5cc8e8');
  rect(c, 2, 4, 12, 2, '#9ee0f4');
  for (let i = 0; i < 5; i++) px(c, 3 + ((i * 3 + f) % 10), 6 + (i % 4) * 2, '#e8fbff');
  rect(c, 2, 13, 12, 1, '#2f8ab0');
  if (f % 3 === 0) rect(c, 5, 1, 2, 2, 'rgba(240,250,255,0.5)');
  else rect(c, 9, 0, 2, 3, 'rgba(240,250,255,0.5)');
}, { flavor: ['Steam curls off the hot tub. It has been heated recently, and by someone who did not want to be found.', 'The water is warm. Very warm. A single slipper floats in it.'], anim: [6, 8], light: { r: 26, color: '#7adcf4', flicker: 0.1 } });

def('lounger', (c, S, _f, v) => {
  rect(c, 3, 1, 10, 14, OUT);
  rect(c, 4, 2, 8, 12, '#efe8d8');
  rect(c, 4, 2, 8, 4, S.cloth[v % 3]);
  rect(c, 4, 2, 8, 1, shade(S.cloth[v % 3], 0.3));
  rect(c, 3, 13, 10, 2, S.wood[1]);
}, { flavor: ['A lounger with a snowy cushion. Somebody brushed off the snow, then left in a hurry.'] });

def('antler_mount', (c, _S) => {
  rect(c, 5, 5, 6, 6, OUT);
  rect(c, 6, 6, 4, 5, '#8a5a3a');
  rect(c, 7, 9, 2, 2, '#3a2a1c');
  rect(c, 3, 2, 1, 4, '#e8dcc0');
  rect(c, 2, 1, 2, 1, '#e8dcc0');
  rect(c, 12, 2, 1, 4, '#e8dcc0');
  rect(c, 12, 1, 2, 1, '#e8dcc0');
  rect(c, 4, 4, 2, 1, '#e8dcc0');
  rect(c, 10, 4, 2, 1, '#e8dcc0');
  px(c, 7, 7, '#ffffff');
  px(c, 9, 7, '#ffffff');
}, { flavor: ['A mounted elk head. Its glass eyes have witnessed everything and are refusing to testify.', 'The antlers have been dusted recently. The dust on the wall behind is thicker, disturbed.'], wall: true });

def('bear', (c, _S) => {
  rect(c, 3, 3, 10, 13, OUT);
  rect(c, 4, 4, 8, 11, '#5a3a24');
  rect(c, 4, 4, 8, 2, '#7a5238');
  disc(c, 8, 4, 3, '#6a4630');
  px(c, 6, 3, '#e8e0cc');
  px(c, 10, 3, '#e8e0cc');
  rect(c, 7, 5, 2, 2, '#2a1a10');
  rect(c, 2, 8, 2, 5, '#5a3a24');
  rect(c, 12, 8, 2, 5, '#5a3a24');
  rect(c, 5, 15, 2, 1, '#e8e0cc');
  rect(c, 9, 15, 2, 1, '#e8e0cc');
}, { flavor: ['A stuffed grizzly, mid-roar. The taxidermist gave it a slightly embarrassed expression.', 'The bear\'s claw has a dab of something dark on it. Probably shoe polish.'] });

def('trophy_case', (c, S, f) => {
  rect(c, 1, 1, 14, 15, OUT);
  rect(c, 2, 2, 12, 13, '#a8d0e0');
  rect(c, 2, 2, 12, 2, '#d8f0fa');
  rect(c, 2, 7, 12, 1, S.wood[1]);
  rect(c, 2, 12, 12, 1, S.wood[1]);
  for (const [x, y] of [[4, 4], [9, 4], [6, 9], [11, 9]] as const) {
    rect(c, x, y, 3, 3, S.accent);
    rect(c, x + 1, y + 3, 1, 1, S.accent);
  }
  if (f % 20 < 3) px(c, 12, 3, '#ffffff');
}, { flavor: ['Silver cups and medals. One shelf has a clean, dust-free square where something used to stand.', 'The lock on the case has been forced. Delicately. By someone who knew how.'], anim: [20, 1], wall: true });

speckle; ring;
