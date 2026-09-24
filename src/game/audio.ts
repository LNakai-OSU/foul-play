/**
 * Procedural sound on WebAudio: chiptune sound effects, a generated score per setting (waltz for the opera house,
 * shuffle for the paddle-steamer, drone for the polar station...) and ambience beds (wind, waves, rain, train rhythm,
 * crowd murmur, projector whirr). No audio files.
 */
import { ENVS } from './env';
import type { EnvId } from './art/skins';

export type Sfx = 'blip' | 'select' | 'back' | 'door' | 'item' | 'hit' | 'super' | 'break' | 'win' | 'lose' | 'event' | 'bump' | 'battle' | 'objection' | 'slam' | 'link' | 'snap' | 'tick' | 'reveal' | 'hold';
export type Track = 'title' | 'town' | 'room' | 'battle' | 'none';
export type Sound = 'crowd' | 'wind' | 'waves' | 'river' | 'rain' | 'hum' | 'train' | 'birds' | 'projector' | 'none';

export type Note = [freq: number, at: number, dur: number, wave: OscillatorType, vol: number];

export const midi = (n: number): number => 440 * 2 ** ((n - 69) / 12);
const C5 = 72;

/** Exported (alongside the other tables/functions below) so an offline analysis harness can render the exact
 *  compositions used by the running game — see scratchpad `audio-inspect.mjs` — without duplicating this data. */
export const SFX: Record<Sfx, Note[]> = {
  blip: [[660, 0, 0.03, 'square', 0.04]],
  select: [[880, 0, 0.05, 'square', 0.06], [1175, 0.05, 0.06, 'square', 0.06]],
  back: [[520, 0, 0.05, 'square', 0.05], [390, 0.05, 0.06, 'square', 0.05]],
  bump: [[110, 0, 0.05, 'square', 0.05]],
  door: [[330, 0, 0.08, 'square', 0.06], [247, 0.08, 0.08, 'square', 0.06], [196, 0.16, 0.12, 'triangle', 0.07]],
  item: [[midi(C5), 0, 0.09, 'square', 0.07], [midi(C5 + 4), 0.09, 0.09, 'square', 0.07], [midi(C5 + 7), 0.18, 0.09, 'square', 0.07], [midi(C5 + 12), 0.27, 0.28, 'square', 0.07]],
  hit: [[180, 0, 0.06, 'sawtooth', 0.08], [120, 0.06, 0.08, 'sawtooth', 0.08], [80, 0.14, 0.1, 'sawtooth', 0.07]],
  super: [[220, 0, 0.05, 'sawtooth', 0.09], [110, 0.05, 0.08, 'sawtooth', 0.09], [330, 0.13, 0.06, 'square', 0.07], [440, 0.19, 0.06, 'square', 0.07], [660, 0.25, 0.14, 'square', 0.07]],
  break: [[midi(C5 + 7), 0, 0.08, 'square', 0.07], [midi(C5 + 3), 0.08, 0.08, 'square', 0.07], [midi(C5), 0.16, 0.08, 'square', 0.07], [midi(C5 - 5), 0.24, 0.3, 'triangle', 0.09]],
  win: [[midi(C5), 0, 0.14, 'square', 0.07], [midi(C5), 0.16, 0.14, 'square', 0.07], [midi(C5 + 4), 0.32, 0.14, 'square', 0.07], [midi(C5 + 7), 0.48, 0.14, 'square', 0.07], [midi(C5 + 12), 0.64, 0.6, 'square', 0.08], [midi(C5 - 12), 0.64, 0.6, 'triangle', 0.1]],
  lose: [[midi(C5 - 2), 0, 0.3, 'triangle', 0.09], [midi(C5 - 5), 0.32, 0.3, 'triangle', 0.09], [midi(C5 - 9), 0.64, 0.6, 'triangle', 0.09]],
  event: [[midi(C5 - 24), 0, 0.4, 'triangle', 0.12], [midi(C5 - 17), 0.02, 0.4, 'sawtooth', 0.05], [midi(C5 - 12), 0.3, 0.6, 'triangle', 0.1]],
  battle: [[440, 0, 0.05, 'square', 0.06], [330, 0.06, 0.05, 'square', 0.06], [440, 0.12, 0.05, 'square', 0.06], [330, 0.18, 0.05, 'square', 0.06], [660, 0.24, 0.12, 'square', 0.07]],
  // OBJECTION! a stab of brass, then the sting
  objection: [[midi(C5 + 7), 0, 0.09, 'sawtooth', 0.11], [midi(C5 + 12), 0.09, 0.09, 'sawtooth', 0.11], [midi(C5 + 19), 0.18, 0.4, 'square', 0.1], [midi(C5 - 5), 0.18, 0.4, 'sawtooth', 0.1]],
  slam: [[70, 0, 0.12, 'sawtooth', 0.14], [45, 0.02, 0.2, 'square', 0.1]],
  link: [[midi(C5 + 2), 0, 0.07, 'triangle', 0.08], [midi(C5 + 9), 0.07, 0.12, 'triangle', 0.08]],
  snap: [[900, 0, 0.03, 'square', 0.07], [200, 0.03, 0.09, 'sawtooth', 0.06]],
  tick: [[1400, 0, 0.012, 'square', 0.03]],
  reveal: [[midi(C5 - 12), 0, 0.5, 'triangle', 0.1], [midi(C5 - 5), 0.25, 0.5, 'triangle', 0.09], [midi(C5), 0.5, 0.9, 'triangle', 0.1], [midi(C5 + 4), 0.5, 0.9, 'sine', 0.06]],
  hold: [[midi(C5 + 5), 0, 0.08, 'square', 0.08], [midi(C5 + 5), 0.11, 0.08, 'square', 0.08], [midi(C5 + 12), 0.22, 0.2, 'square', 0.09]],
};

export const MODES: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  blues: [0, 3, 5, 6, 7, 10, 12],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
};
export const degree = (scale: number[], d: number): number => 12 * Math.floor(d / scale.length) + (scale[((d % scale.length) + scale.length) % scale.length] as number);

export interface Song {
  bpm: number;
  lead: (number | null)[];
  bass: (number | null)[];
  root: number;
  wave: OscillatorType;
  vol: number;
  scale: number[];
  swing: number;
  meter: number;
  pad: boolean;
}

function rngOf(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Generate the score for a setting and a moment (title, hub, room, interrogation). Deterministic per setting. */
export function songFor(env: EnvId, track: Exclude<Track, 'none'>): Song {
  const e = ENVS[env].music;
  const r = rngOf(e.seed * 97 + (track === 'title' ? 1 : track === 'town' ? 2 : track === 'room' ? 3 : 4));
  const scale = MODES[track === 'battle' && e.mode === 'major' ? 'minor' : e.mode] as number[];
  const meter = e.pulse === 'waltz' ? 3 : 4;
  const bars = 8;
  const rest = track === 'room' ? 0.45 : track === 'title' ? 0.35 : track === 'battle' ? 0.1 : 0.25;
  // a motif, restated with variations: A A' B A''
  const motif: number[] = [];
  let d = 2 + Math.floor(r() * 3);
  for (let i = 0; i < meter * 2; i++) {
    d += Math.floor(r() * 5) - 2;
    d = Math.max(-1, Math.min(9, d));
    motif.push(d);
  }
  const lead: (number | null)[] = [];
  for (let b = 0; b < bars; b++) {
    const section = b % 4;
    for (let i = 0; i < meter * 2; i++) {
      let n = motif[i] as number;
      if (section === 1 && i % 3 === 2) n += 1;
      if (section === 2) n = (motif[(i * 3) % motif.length] as number) + 2;
      if (section === 3 && i > meter) n = (motif[i] as number) - 1;
      const held = i > 0 && r() < 0.18;
      lead.push(r() < rest || held ? null : n);
    }
  }
  const prog = [0, 3, 4, 0, 5, 3, 4, 0].map((x) => x - 7);
  const bass: (number | null)[] = [];
  for (let b = 0; b < bars; b++) for (let i = 0; i < meter * 2; i++) bass.push(i === 0 ? (prog[b] as number) : i === meter && meter === 4 ? (prog[b] as number) + 4 : e.pulse === 'shuffle' && i % 2 === 0 ? (prog[b] as number) + (i % 4 === 2 ? 4 : 0) : null);
  return {
    bpm: track === 'battle' ? e.bpm * 1.35 : track === 'room' ? e.bpm * 0.85 : e.bpm,
    lead,
    bass,
    root: e.mode === 'blues' ? 57 : 55 + (e.seed % 5),
    wave: track === 'battle' ? 'square' : e.lead,
    vol: e.lead === 'sine' ? 0.06 : 0.032,
    scale,
    swing: e.pulse === 'shuffle' ? 0.34 : 0,
    meter,
    pad: e.pulse === 'drone' || track === 'room',
  };
}

export interface Bed {
  noise?: { type: BiquadFilterType; freq: number; q: number; gain: number };
  lfo?: { freq: number; depth: number; shape: OscillatorType };
  hum?: number[];
  chirps?: boolean;
}
export const BEDS: Record<Exclude<Sound, 'none'>, Bed> = {
  wind: { noise: { type: 'bandpass', freq: 520, q: 0.6, gain: 0.05 }, lfo: { freq: 0.13, depth: 0.03, shape: 'sine' } },
  waves: { noise: { type: 'lowpass', freq: 520, q: 0.3, gain: 0.06 }, lfo: { freq: 0.11, depth: 0.05, shape: 'sine' } },
  river: { noise: { type: 'bandpass', freq: 340, q: 0.4, gain: 0.05 }, lfo: { freq: 0.27, depth: 0.02, shape: 'sine' } },
  rain: { noise: { type: 'highpass', freq: 2600, q: 0.3, gain: 0.035 }, lfo: { freq: 0.2, depth: 0.008, shape: 'sine' } },
  hum: { hum: [50, 100.3] },
  train: { noise: { type: 'lowpass', freq: 380, q: 0.4, gain: 0.05 }, lfo: { freq: 2.35, depth: 0.045, shape: 'square' } },
  crowd: { noise: { type: 'bandpass', freq: 620, q: 0.9, gain: 0.03 }, lfo: { freq: 0.35, depth: 0.014, shape: 'triangle' } },
  projector: { noise: { type: 'lowpass', freq: 900, q: 0.5, gain: 0.02 }, lfo: { freq: 24, depth: 0.012, shape: 'square' }, hum: [60] },
  birds: { chirps: true, noise: { type: 'bandpass', freq: 300, q: 0.5, gain: 0.012 } },
};

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  muted = false;
  private track: Track = 'none';
  private timer: number | null = null;
  private step_ = 0;
  private nextTime = 0;
  private env: EnvId = 'generic';
  private song: Song | null = null;
  private bedNodes: { stop: () => void } | null = null;
  private bedKey = '';
  private chirpTimer: number | null = null;

  constructor() {
    try {
      this.muted = localStorage.getItem('foulplay:muted') === '1';
    } catch {
      /* storage unavailable */
    }
  }

  /** Browsers only allow audio after a gesture. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 2;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      if (this.track !== 'none') this.startLoop();
      if (this.bedKey) {
        const [k, inside] = this.bedKey.split('|') as [Sound, string];
        this.bedKey = '';
        this.ambience(k, inside === '1');
      }
    } catch {
      this.ctx = null;
    }
  }

  setMuted(m: boolean): void {
    this.muted = m;
    try {
      localStorage.setItem('foulplay:muted', m ? '1' : '0');
    } catch {
      /* ignore */
    }
    if (this.master) this.master.gain.value = m ? 0 : 1;
  }

  /** Which setting's score to play. */
  setEnv(env: EnvId): void {
    this.env = env;
    this.song = null;
    if (this.track !== 'none') {
      const t = this.track;
      this.track = 'none';
      this.play(t);
    }
  }

  private tone(freq: number, when: number, dur: number, wave: OscillatorType, vol: number): void {
    if (!this.ctx || !this.master) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = wave;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, when + Math.max(0.02, dur));
    o.connect(g);
    g.connect(this.master);
    o.start(when);
    o.stop(when + dur + 0.05);
  }

  private burst(when: number, dur: number, vol: number, type: BiquadFilterType, freq: number): void {
    if (!this.ctx || !this.master || !this.noiseBuf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(when, Math.random());
    src.stop(when + dur + 0.02);
  }

  sfx(name: Sfx): void {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    for (const [f, at, d, w, v] of SFX[name]) this.tone(f, t + at, d, w, v);
    if (name === 'objection') this.burst(t + 0.16, 0.25, 0.12, 'highpass', 1800);
    if (name === 'slam') this.burst(t, 0.18, 0.16, 'lowpass', 400);
    if (name === 'snap') this.burst(t, 0.06, 0.1, 'highpass', 3000);
  }

  /** A speaker's voice: each character gets their own pitch and timbre for the typewriter blips. */
  voice(seed: number): void {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const base = 260 + (seed % 9) * 36;
    this.tone(base * (1 + ((seed >> 4) % 3) * 0.06), t, 0.035, (['square', 'triangle', 'sawtooth'] as OscillatorType[])[seed % 3] as OscillatorType, 0.04);
  }

  /** A footstep that suits the ground. */
  step(env: EnvId, outdoor: boolean): void {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    if ((env === 'station' || env === 'lodge') && outdoor) this.burst(t, 0.07, 0.05, 'highpass', 2200);
    else if (env === 'riverboat' || env === 'liner') this.tone(90 + Math.random() * 20, t, 0.05, 'triangle', 0.05);
    else if (env === 'studio' || env === 'club' || env === 'restaurant') this.burst(t, 0.04, 0.035, 'bandpass', 900);
    else if (outdoor) this.burst(t, 0.05, 0.03, 'bandpass', 1400);
    else this.tone(130 + Math.random() * 30, t, 0.035, 'square', 0.025);
  }

  /** Little sounds made by props you examine. */
  prop(kind: string): void {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    switch (kind) {
      case 'piano':
        [0, 4, 7, 12].forEach((n, i) => this.tone(midi(60 + n), t + i * 0.09, 0.4, 'triangle', 0.06));
        break;
      case 'static':
        this.burst(t, 0.5, 0.06, 'bandpass', 1800);
        this.tone(880, t + 0.2, 0.2, 'sine', 0.03);
        break;
      case 'clap':
        this.burst(t, 0.06, 0.16, 'highpass', 1500);
        this.tone(220, t, 0.05, 'square', 0.06);
        break;
      case 'tombola':
        for (let i = 0; i < 6; i++) this.burst(t + i * 0.05, 0.03, 0.05, 'bandpass', 2400);
        break;
      case 'drum':
        this.tone(110, t, 0.15, 'sine', 0.12);
        this.burst(t, 0.06, 0.1, 'bandpass', 700);
        break;
      case 'bass':
      case 'cello':
        this.tone(kind === 'bass' ? 55 : 98, t, 0.6, 'sawtooth', 0.05);
        break;
      case 'jukebox':
      case 'jazz':
        [0, 3, 7, 10, 12].forEach((n, i) => this.tone(midi(64 + n), t + i * 0.11, 0.2, 'square', 0.04));
        break;
      case 'projector':
        for (let i = 0; i < 10; i++) this.burst(t + i * 0.04, 0.02, 0.04, 'bandpass', 1200);
        break;
      default:
        this.sfx('blip');
    }
  }

  play(track: Track): void {
    if (track === this.track) return;
    this.track = track;
    this.stopLoop();
    this.song = null;
    if (track !== 'none') this.startLoop();
  }

  private stopLoop(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
  }

  private startLoop(): void {
    if (!this.ctx || this.track === 'none') return;
    this.step_ = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.stopLoop();
    this.timer = window.setInterval(() => this.schedule(), 60);
  }

  private schedule(): void {
    if (!this.ctx || this.track === 'none' || this.muted) {
      if (this.ctx) this.nextTime = Math.max(this.nextTime, this.ctx.currentTime);
      return;
    }
    const song = (this.song ??= songFor(this.env, this.track));
    const stepDur = 60 / song.bpm / 2;
    while (this.nextTime < this.ctx.currentTime + 0.25) {
      const i = this.step_ % song.lead.length;
      const n = song.lead[i];
      const swung = song.swing && i % 2 === 1 ? stepDur * song.swing : 0;
      if (n !== null && n !== undefined) this.tone(midi(song.root + 12 + degree(song.scale, n)), this.nextTime + swung, stepDur * 0.9, song.wave, song.vol);
      const b = song.bass[i % song.bass.length];
      if (b !== null && b !== undefined) this.tone(midi(song.root + degree(song.scale, b)), this.nextTime, stepDur * (song.meter === 3 ? 2 : 1.8), 'triangle', 0.07);
      if (song.pad && i % (song.meter * 2) === 0) this.tone(midi(song.root - 12 + degree(song.scale, (song.bass[i] as number | null) ?? -7)), this.nextTime, stepDur * song.meter * 2, 'sine', 0.05);
      // a tick of percussion on the beat
      if (this.track === 'battle' && i % 2 === 0) this.burst(this.nextTime, 0.03, 0.05, 'highpass', 5000);
      this.nextTime += stepDur;
      this.step_++;
    }
  }

  /** Ambience bed for the place: wind on the ice, waves on the sea, murmur in a crowd... Muffled when inside. */
  ambience(kind: Sound, inside: boolean): void {
    const key = `${kind}|${inside ? 1 : 0}`;
    if (key === this.bedKey) return;
    this.bedKey = key;
    this.bedNodes?.stop();
    this.bedNodes = null;
    if (this.chirpTimer !== null) window.clearInterval(this.chirpTimer);
    this.chirpTimer = null;
    if (!this.ctx || !this.master || !this.noiseBuf || kind === 'none') return;
    const ctx = this.ctx;
    const bed = BEDS[kind];
    const nodes: AudioNode[] = [];
    const oscs: OscillatorNode[] = [];
    const out = ctx.createGain();
    out.gain.value = inside ? 0.45 : 1;
    const muffle = ctx.createBiquadFilter();
    muffle.type = 'lowpass';
    muffle.frequency.value = inside ? 900 : 12000;
    out.connect(muffle);
    muffle.connect(this.master);
    nodes.push(out, muffle);
    let src: AudioBufferSourceNode | null = null;
    if (bed.noise) {
      src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = bed.noise.type;
      f.frequency.value = bed.noise.freq;
      f.Q.value = bed.noise.q;
      const g = ctx.createGain();
      g.gain.value = bed.noise.gain;
      src.connect(f);
      f.connect(g);
      g.connect(out);
      if (bed.lfo) {
        const o = ctx.createOscillator();
        o.type = bed.lfo.shape;
        o.frequency.value = bed.lfo.freq;
        const depth = ctx.createGain();
        depth.gain.value = bed.lfo.depth;
        o.connect(depth);
        depth.connect(g.gain);
        o.start();
        oscs.push(o);
      }
      src.start();
    }
    for (const hz of bed.hum ?? []) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = hz;
      const g = ctx.createGain();
      g.gain.value = 0.02;
      o.connect(g);
      g.connect(out);
      o.start();
      oscs.push(o);
    }
    if (bed.chirps) {
      this.chirpTimer = window.setInterval(() => {
        if (!this.ctx || this.muted || Math.random() < 0.6) return;
        const t = this.ctx.currentTime;
        const f = 2400 + Math.random() * 1600;
        for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) this.tone(f + i * 220, t + i * 0.09, 0.05, 'sine', 0.012);
      }, 1800);
    }
    this.bedNodes = {
      stop: () => {
        try {
          src?.stop();
          for (const o of oscs) o.stop();
          for (const n of nodes) n.disconnect();
        } catch {
          /* already stopped */
        }
      },
    };
  }

  stop(): void {
    this.stopLoop();
    this.track = 'none';
    this.bedNodes?.stop();
    this.bedNodes = null;
    this.bedKey = '';
    if (this.chirpTimer !== null) window.clearInterval(this.chirpTimer);
    this.chirpTimer = null;
  }
}

export const audio = new AudioEngine();
