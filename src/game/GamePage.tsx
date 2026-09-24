/** Hosts the detective game: loads the case, sizes the canvas to a crisp integer scale, wires keyboard and touch. */
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Gamepad2, Pencil, Volume2, VolumeX } from 'lucide-react';
import '@fontsource/press-start-2p/400.css';
import '../styles/game.css';
import { api, errorMessage } from '../api';
import { hrefs, navigate } from '../router';
import { Button, EmptyState, Spinner } from '../ui';
import { audio } from './audio';
import { Game } from './engine';
import type { Btn } from './engine';
import * as logic from './logic';
import * as facts from './facts';
import { newState, unplayableReason } from './logic';
import { blockedAt } from './grid';
import { TitleScene } from './scenes/title';
import { VIEW_H, VIEW_W } from './types';
import { buildWorld } from './world';

const TOUCH: { btn: Btn; label: string; cls: string }[] = [
  { btn: 'up', label: '▲', cls: 'pad-up' },
  { btn: 'left', label: '◀', cls: 'pad-left' },
  { btn: 'right', label: '▶', cls: 'pad-right' },
  { btn: 'down', label: '▼', cls: 'pad-down' },
  { btn: 'b', label: 'BACK', cls: 'pad-b' },
  { btn: 'a', label: 'SPACE', cls: 'pad-a' },
  { btn: 'start', label: 'MENU', cls: 'pad-start' },
];

export default function GamePage({ caseId }: { caseId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'unplayable'>('loading');
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('');
  const [muted, setMuted] = useState(audio.muted);
  const [scale, setScale] = useState(2);

  useEffect(() => {
    let cancelled = false;
    let game: Game | null = null;
    let detach: (() => void) | null = null;
    setStatus('loading');
    (async () => {
      try {
        const [c] = await Promise.all([api.get(caseId), Promise.race([document.fonts.load('8px "Press Start 2P"', 'Aa1').catch(() => null), new Promise((r) => setTimeout(r, 3000))])]);
        if (cancelled) return;
        document.title = `Foul Play · Play ${c.title || 'mystery'}`;
        setTitle(c.title || 'Untitled mystery');
        const why = unplayableReason(c);
        if (why) {
          setMessage(why);
          setStatus('unplayable');
          return;
        }
        const world = buildWorld(c);
        const canvas = canvasRef.current as HTMLCanvasElement;
        const g = new Game(canvas, world, newState(world), () => navigate(hrefs.library()));
        g.restart = () => {
          g.setState(newState(world));
          g.reset(new TitleScene(g));
        };
        game = g;
        detach = g.attachKeyboard(window);
        g.push(new TitleScene(g));
        g.start();
        gameRef.current = g;
        if (import.meta.env.DEV) {
          (window as unknown as { __game?: Game; __logic?: unknown }).__game = g;
          (window as unknown as { __logic?: unknown }).__logic = { ...logic, ...facts, blockedAt };
          void Promise.all([import('./scenes/night'), import('./scenes/notebook'), import('./scenes/recon'), import('./scenes/battle'), import('./scenes/card'), import('./scenes/ending'), import('./scenes/ritual'), import('./rituals')]).then(([b, n, r, bt, cd, e, rt, rs]) => {
            (window as unknown as { __scenes?: unknown }).__scenes = { ...b, ...n, ...r, ...bt, ...cd, ...e, ...rt, ...rs };
          });
        }
        setStatus('ready');
      } catch (e) {
        if (cancelled) return;
        setMessage(errorMessage(e));
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
      detach?.();
      game?.stop();
      gameRef.current = null;
    };
  }, [caseId]);

  // integer scaling keeps the pixels crisp
  useEffect(() => {
    const fit = () => {
      // subtract the stage padding (16 each side), the bezel and its border so the frame never overflows
      const bezel = window.innerWidth <= 720 ? 8 : 14;
      const w = (wrapRef.current?.clientWidth ?? VIEW_W) - 32 - bezel * 2 - 6;
      const reserve = window.matchMedia('(pointer: coarse)').matches ? 300 : 210;
      const s = Math.min(w / VIEW_W, (window.innerHeight - reserve) / VIEW_H);
      setScale(s >= 2 ? Math.floor(s) : Math.max(0.6, s));
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (wrapRef.current) ro.observe(wrapRef.current);
    window.addEventListener('resize', fit);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, []);

  const press = (b: Btn, down: boolean) => {
    const g = gameRef.current;
    if (!g) return;
    audio.unlock();
    if (down) g.input.press(b);
    else g.input.release(b);
  };

  return (
    <div className="game-page">
      <header className="game-head">
        <Button variant="text" icon={<ArrowLeft />} href={hrefs.library()}>
          Case library
        </Button>
        <div className="game-head__title">
          <span className="game-head__kicker">Play as the detective</span>
          <span className="game-head__name">{title}</span>
        </div>
        <div className="game-head__actions">
          <Button variant="text" icon={<Pencil />} href={hrefs.build(caseId, 'setting')}>
            Edit case
          </Button>
          <Button
            variant="tonal"
            icon={muted ? <VolumeX /> : <Volume2 />}
            aria-pressed={muted}
            onClick={() => {
              audio.unlock();
              audio.setMuted(!audio.muted);
              setMuted(audio.muted);
            }}
          >
            {muted ? 'Sound off' : 'Sound on'}
          </Button>
        </div>
      </header>

      <div className="game-stage" ref={wrapRef}>
        {status === 'loading' && (
          <div className="game-note">
            <Spinner /> Setting the scene…
          </div>
        )}
        {(status === 'error' || status === 'unplayable') && (
          <EmptyState icon={<Gamepad2 />} title={status === 'error' ? 'Could not start the game' : 'This case is not playable yet'} action={<Button variant="filled" href={status === 'error' ? hrefs.library() : hrefs.build(caseId, 'characters')}>{status === 'error' ? 'Back to the case library' : 'Fix it in the builder'}</Button>}>
            {message}
          </EmptyState>
        )}
        <div className="game-frame" style={{ display: status === 'ready' ? undefined : 'none' }}>
          <canvas ref={canvasRef} className="game-canvas" width={VIEW_W} height={VIEW_H} style={{ width: VIEW_W * scale, height: VIEW_H * scale }} aria-label="Detective game screen" role="img" />
        </div>
        {status === 'ready' && (
          <div className="game-touch" aria-hidden="true">
            {TOUCH.map((t) => (
              <button
                key={t.btn}
                type="button"
                tabIndex={-1}
                className={`pad ${t.cls}`}
                onPointerDown={(e) => {
                  e.preventDefault();
                  (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                  press(t.btn, true);
                }}
                onPointerUp={() => press(t.btn, false)}
                onPointerCancel={() => press(t.btn, false)}
                onLostPointerCapture={() => press(t.btn, false)}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {status === 'ready' && (
        <dl className="game-keys">
          <div>
            <dt>Move</dt>
            <dd>Arrows / WASD</dd>
          </div>
          <div>
            <dt>Talk / confirm</dt>
            <dd>Space (or Z, E)</dd>
          </div>
          <div>
            <dt>Menu / notebook</dt>
            <dd>Enter</dd>
          </div>
          <div>
            <dt>Back</dt>
            <dd>X / Esc (back)</dd>
          </div>
          <div>
            <dt>Run</dt>
            <dd>Hold Shift</dd>
          </div>
          <div>
            <dt>Mute</dt>
            <dd>M</dd>
          </div>
        </dl>
      )}
    </div>
  );
}
