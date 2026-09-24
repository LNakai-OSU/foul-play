/** The game gallery (#/game-gallery): every environment, room theme, clue icon, character and screen, drawn by the real game renderers. */
import { useEffect, useMemo, useRef, useState } from 'react';
import '@fontsource/press-start-2p/400.css';
import '../styles/game.css';
import { generateCase } from '../../shared/generator/generate';
import { SETTINGS } from '../../shared/generator/settings';
import { normPlace } from '../../shared/ops';
import type { Tone } from '../../shared/models';
import { Rng } from '../../shared/generator/rng';
import { ENVS } from './env';
import { ALL_ICON_IDS, SPECIFIC_ICON_IDS, iconName } from './icons';
import { iconCanvas } from './art/icons-draw';
import { renderSnapshot } from './render';
import { buildRoom } from './rooms';
import { drawBody, drawChar } from './sprites';
import { drawPortrait, drawPortraitBack, PORTRAIT_H, PORTRAIT_W } from './art/portraits';
import { DETECTIVE_LOOK, buildWorld, lookFor } from './world';
import { renderScreens } from './gallery-screens';
import type { EnvId } from './art/skins';
import type { Hat, Look } from './types';
import { hrefs } from '../router';

const TONES: Tone[] = ['comedic', 'serious', 'noir'];
const ENV_IDS = SETTINGS.map((s) => s.id as EnvId);

function Canvas({ draw, className, scale = 1, animate = false, label }: { draw: (c: HTMLCanvasElement, tick: number) => void; className?: string; scale?: number; animate?: boolean; label?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [hot, setHot] = useState(false);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    draw(c, 0);
    c.style.setProperty('--gg-w', `${c.width}px`);
    if (!animate || !hot) return;
    let raf = 0;
    let tick = 0;
    let last = 0;
    const loop = (t: number) => {
      if (t - last > 66) {
        tick += 4;
        draw(c, tick);
        last = t;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [draw, animate, hot]);
  return <canvas ref={ref} className={`gg-canvas ${className ?? ''}`} style={{ width: `calc(var(--gg-w, 1px) * ${scale})` }} aria-label={label} onMouseEnter={() => setHot(true)} onMouseLeave={() => setHot(false)} />;
}

function useCase(settingId: string, tone: Tone) {
  return useMemo(() => {
    const c = generateCase({ seed: 4242, tone, settingId, playerMin: 8, playerMax: 9 });
    return { c, w: buildWorld(c) };
  }, [settingId, tone]);
}

function EnvCard({ id, tone }: { id: EnvId; tone: Tone }) {
  const { c, w } = useCase(id, tone);
  const hub = w.maps[w.hubId]!;
  const [dusk, setDusk] = useState<number | null>(null);
  const env = ENVS[id];
  const dark = dusk ?? hub.dark;
  return (
    <section className="gg-card" id={`env-${id}`}>
      <header className="gg-card__head">
        <h3>{env.label}</h3>
        <span>{c.setting.name} · {c.setting.era}</span>
      </header>
      <div className="gg-hub" style={{ ['--gg-w' as string]: `${hub.w * 16}px` }}>
        <Canvas className="gg-hub__canvas" label={`${env.label} hub`} animate draw={(cv, tick) => renderSnapshot(cv, hub, w, { tick, tone, dark })} />
      </div>
      <div className="gg-row">
        <span className="gg-tag">tone</span>
        {TONES.map((t) => (
          <a key={t} className={`gg-thumb ${t === tone ? 'is-on' : ''}`} href={`#/game-gallery?tone=${t}`}>
            <ToneThumb id={id} tone={t} />
            <span>{t}</span>
          </a>
        ))}
        <span className="gg-tag">light</span>
        {[0, 0.3, 0.6].map((d) => (
          <button key={d} type="button" className={`gg-chip ${dusk === d ? 'is-on' : ''}`} onClick={() => setDusk(dusk === d ? null : d)}>
            {d === 0 ? 'day' : d === 0.3 ? 'dusk' : 'night'}
          </button>
        ))}
      </div>
    </section>
  );
}

function ToneThumb({ id, tone }: { id: EnvId; tone: Tone }) {
  const { w } = useCase(id, tone);
  const hub = w.maps[w.hubId]!;
  return <Canvas className="gg-thumb__canvas" draw={(cv) => renderSnapshot(cv, hub, w, { tone })} />;
}

function Rooms({ id, tone }: { id: EnvId; tone: Tone }) {
  const setting = SETTINGS.find((s) => s.id === id)!;
  const rooms = useMemo(
    () =>
      setting.rooms.map((name, i) => {
        const label = name.replace(/^the /, '').replace(/^\w/, (m) => m.toUpperCase());
        const r = buildRoom({ key: normPlace(name), label, scene: false }, new Rng(77 + i * 13), `room:${i}`, id);
        return { label, map: r.map };
      }),
    [id, setting],
  );
  return (
    <div className="gg-rooms">
      {rooms.map((r) => (
        <figure key={r.label} className="gg-room" style={{ ['--gg-w' as string]: `${r.map.w * 16}px` }}>
          <Canvas className="gg-room__canvas" label={`${r.label}`} animate draw={(cv, tick) => renderSnapshot(cv, r.map, null, { tick, tone })} />
          <figcaption>{r.label}</figcaption>
        </figure>
      ))}
    </div>
  );
}

function CastRow({ id, tone }: { id: EnvId; tone: Tone }) {
  const w = useCase(id, tone).w;
  return (
    <div className="gg-cast-row">
      <span>{ENVS[id].label}</span>
      <Canvas className="gg-cast" draw={(cv) => drawChars(cv, (w.maps[w.hubId]?.extras ?? []).map((e) => ({ look: e.look, label: e.name })))} label={`${id} extras`} />
    </div>
  );
}

function drawPortraits(cv: HTMLCanvasElement, looks: { look: Look; label: string }[]): void {
  const cw = PORTRAIT_W + 8;
  cv.width = (looks.length + 1) * cw;
  cv.height = PORTRAIT_H * 3 + 14;
  const c = cv.getContext('2d') as CanvasRenderingContext2D;
  c.imageSmoothingEnabled = false;
  c.fillStyle = '#26243a';
  c.fillRect(0, 0, cv.width, cv.height);
  const moods = ['calm', 'rattled', 'cracked'] as const;
  looks.forEach((l, i) => moods.forEach((m, k) => drawPortrait(c, i * cw + 4, k * PORTRAIT_H + 4, l.look, m, 4 + i * 7)));
  drawPortraitBack(c, looks.length * cw + 4, 4, DETECTIVE_LOOK, 0);
}

const HATS: Hat[] = ['none', 'fedora', 'cap', 'chef', 'bow', 'tophat', 'beret', 'police'];

function drawChars(cv: HTMLCanvasElement, looks: { look: Look; label: string; body?: boolean }[], scale = 3): void {
  const cell = Math.max(16 * scale + 14, Math.max(...looks.map((l) => l.label.length)) * 8 + 10);
  cv.width = looks.length * cell;
  cv.height = 16 * scale + 30;
  const ctx = cv.getContext('2d') as CanvasRenderingContext2D;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#2a2436';
  ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.font = '8px "Press Start 2P", monospace';
  ctx.textBaseline = 'top';
  looks.forEach((l, i) => {
    const x = i * cell + Math.round((cell - 16 * scale) / 2);
    ctx.save();
    if (l.body) drawBody(ctx, x + 0, 8 + 8, l.look);
    else drawChar(ctx, x, 6, l.look, 'down', 0, scale);
    ctx.restore();
    ctx.fillStyle = '#d8d0c0';
    ctx.fillText(l.label, i * cell + Math.round((cell - l.label.length * 8) / 2), 16 * scale + 14);
  });
}

export default function GameGallery() {
  const [tone, setTone] = useState<Tone>(() => {
    const q = /tone=(\w+)/.exec(window.location.hash)?.[1] as Tone | undefined;
    return q && TONES.includes(q) ? q : 'serious';
  });
  useEffect(() => {
    document.title = 'Foul Play · Game gallery';
    const onHash = () => {
      const q = /tone=(\w+)/.exec(window.location.hash)?.[1] as Tone | undefined;
      if (q && TONES.includes(q)) setTone(q);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    document.fonts.load('8px "Press Start 2P"', 'Aa1').then(() => setReady(true), () => setReady(true));
  }, []);
  const sample = useCase('manor', tone).w;
  const screens = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ready && screens.current) renderScreens(screens.current, sample);
  }, [ready, sample]);

  const allLooks = useMemo(() => {
    const out: { look: Look; label: string; body?: boolean }[] = [{ look: DETECTIVE_LOOK, label: 'YOU' }, { look: lookFor('inspector', '', 'police'), label: 'CHIEF' }, { look: lookFor('victim', ''), label: 'BODY', body: true }];
    for (const h of HATS) out.push({ look: lookFor(`hat${h}`, '', h), label: h.toUpperCase() });
    return out;
  }, []);

  if (!ready) return <div className="gg-page gg-loading">Loading the gallery…</div>;
  return (
    <div className="gg-page">
      <header className="gg-head">
        <a href={hrefs.library()} className="gg-back">← Case library</a>
        <h1>Game gallery</h1>
        <p>Everything the detective game can draw, rendered live by the game itself: {ENV_IDS.length} settings, every room theme, {SPECIFIC_ICON_IDS.length} clue icons, the cast and the screens.</p>
        <nav className="gg-nav">
          {ENV_IDS.map((id) => (
            <a key={id} href={`#env-${id}`} onClick={(e) => { e.preventDefault(); document.getElementById(`env-${id}`)?.scrollIntoView({ behavior: 'smooth' }); }}>{ENVS[id].label}</a>
          ))}
          <a href="#icons" onClick={(e) => { e.preventDefault(); document.getElementById('icons')?.scrollIntoView({ behavior: 'smooth' }); }}>Clue icons</a>
          <a href="#cast" onClick={(e) => { e.preventDefault(); document.getElementById('cast')?.scrollIntoView({ behavior: 'smooth' }); }}>Cast</a>
          <a href="#screens" onClick={(e) => { e.preventDefault(); document.getElementById('screens')?.scrollIntoView({ behavior: 'smooth' }); }}>Screens</a>
        </nav>
        <div className="gg-row">
          <span className="gg-tag">tone</span>
          {TONES.map((t) => (
            <button key={t} type="button" className={`gg-chip ${t === tone ? 'is-on' : ''}`} onClick={() => setTone(t)}>{t}</button>
          ))}
        </div>
      </header>

      <h2 className="gg-h2">Environments</h2>
      {ENV_IDS.map((id) => (
        <div key={id}>
          <EnvCard id={id} tone={tone} />
          <Rooms id={id} tone={tone} />
        </div>
      ))}

      <h2 className="gg-h2" id="icons">Clue icons ({ALL_ICON_IDS.length} incl. fallbacks)</h2>
      <div className="gg-icons">
        {SPECIFIC_ICON_IDS.map((id) => (
          <figure key={id} className="gg-icon">
            <Canvas className="gg-icon__canvas" draw={(cv) => { cv.width = 16; cv.height = 16; const c = cv.getContext('2d')!; c.imageSmoothingEnabled = false; c.drawImage(iconCanvas(id, false), 0, 0); }} label={iconName(id)} />
            <figcaption>{iconName(id)}</figcaption>
          </figure>
        ))}
      </div>
      <h3 className="gg-h3">Told by someone (speech badge) and generic families</h3>
      <div className="gg-icons">
        {['whisper', 'key', 'ring', 'pipe', 'scarf', 'door', 'flask', 'gloves'].map((id) => (
          <figure key={`v${id}`} className="gg-icon">
            <Canvas className="gg-icon__canvas" draw={(cv) => { cv.width = 16; cv.height = 16; const c = cv.getContext('2d')!; c.imageSmoothingEnabled = false; c.drawImage(iconCanvas(id, true), 0, 0); }} label={`told: ${iconName(id)}`} />
            <figcaption>told: {iconName(id)}</figcaption>
          </figure>
        ))}
        {ALL_ICON_IDS.filter((id) => id.endsWith(':1') || id.endsWith(':5')).map((id) => (
          <figure key={id} className="gg-icon">
            <Canvas className="gg-icon__canvas" draw={(cv) => { cv.width = 16; cv.height = 16; const c = cv.getContext('2d')!; c.imageSmoothingEnabled = false; c.drawImage(iconCanvas(id, false), 0, 0); }} label={id} />
            <figcaption>{id.replace('gen-', '')}</figcaption>
          </figure>
        ))}
      </div>

      <h2 className="gg-h2" id="cast">Cast</h2>
      <Canvas className="gg-cast" draw={(cv) => drawChars(cv, allLooks)} label="Characters" />
      <h3 className="gg-h3">Portraits: calm, rattled, cracked (and the detective from behind)</h3>
      <Canvas className="gg-cast" draw={(cv) => drawPortraits(cv, allLooks.filter((l) => !l.body).slice(1, 10))} label="Portraits in three moods" />
      <h3 className="gg-h3">The people who wander each setting</h3>
      <div className="gg-cast-rows">
        {ENV_IDS.map((id) => (
          <CastRow key={id} id={id} tone={tone} />
        ))}
      </div>

      <h2 className="gg-h2" id="screens">Screens</h2>
      <div ref={screens} className="gg-screens" />
    </div>
  );
}
