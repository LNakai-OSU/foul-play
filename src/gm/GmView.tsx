import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleCheck,
  Eye,
  EyeOff,
  Flag,
  Hand,
  Lock,
  MessageSquareQuote,
  Package,
  Pause,
  Play,
  RotateCcw,
  Search,
  ShieldAlert,
  Skull,
  Timer as TimerIcon,
  UserCheck,
  Users,
} from 'lucide-react';
import type { Issue } from '../../shared/checker';
import { countIssues } from '../../shared/checker';
import type { Case } from '../../shared/models';
import { beatLabel, characterName, evidenceLabel, plural } from '../../shared/ops';
import { canAdvance, currentBeat, formatClock, missedClues, pendingClues, timerIsRunning, timerRemainingMs } from '../../shared/run';
import { deriveSolution } from '../../shared/solution';
import { hrefs } from '../router';
import { Avatar, Button, Callout, Card, CardHeader, Chip, EmptyState, Progress } from '../ui';
import { useFeedback } from '../ui/feedback';
import { chime, useNow, useRun } from './useRun';

const TRIGGER_ICON = { manual: <Hand />, timer: <TimerIcon />, 'player-action': <UserCheck /> };
const TRIGGER_LABEL = { manual: 'GM advances', timer: 'Timed', 'player-action': 'Player action' };

function formatElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}` : `${m}:${sec.toString().padStart(2, '0')}`;
}

export function GmView({ doc, issues }: { doc: Case; issues: Issue[] }) {
  const { run, actions } = useRun(doc);
  const { confirm } = useFeedback();
  const [solutionOpen, setSolutionOpen] = useState(false); // deliberately NOT persisted
  const running = run.status === 'running';
  const beat = currentBeat(run, doc);
  const hasTimer = running && run.timer !== null;
  const now = useNow(running, hasTimer ? 250 : 1000);
  const solution = useMemo(() => deriveSolution(doc), [doc]);
  const counts = countIssues(issues);
  const evById = useMemo(() => new Map(doc.evidence.map((e) => [e.id, e])), [doc.evidence]);

  const remaining = hasTimer ? timerRemainingMs(run, now) : null;
  const timerRunning = timerIsRunning(run);
  const timeUp = remaining === 0 && timerRunning;

  // chime once when a countdown hits zero
  const alarmed = useRef<string>('');
  useEffect(() => {
    if (!timeUp || !beat) return;
    const token = `${beat.id}:${run.entered[beat.id] ?? 0}`;
    if (alarmed.current !== token) {
      alarmed.current = token;
      chime();
    }
  }, [timeUp, beat, run.entered]);

  const pending = pendingClues(run, doc);
  const missed = missedClues(run, doc);
  const advanceCheck = canAdvance(run, doc);
  const last = running && run.index >= doc.beats.length - 1;
  const nextBeat = running ? doc.beats[run.index + 1] : undefined;
  const beatClues = beat ? beat.evidenceIds.filter((id) => evById.has(id)) : [];

  // Keyboard: → reveals the next clue only; Shift+→ advances to the next beat (deliberate, and debounced,
  // so a stray key press on a live screen can never skip a beat).
  const keyActions = useRef({ reveal: actions.revealNext, advance: actions.advance, pending: pending.length, canAdvance: advanceCheck.ok, running });
  keyActions.current = { reveal: actions.revealNext, advance: actions.advance, pending: pending.length, canAdvance: advanceCheck.ok, running };
  const lastKey = useRef({ reveal: 0, advance: 0 });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.tagName === 'BUTTON' || t.tagName === 'A' || t.tagName === 'SUMMARY' || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.key !== 'ArrowRight' || e.repeat) return;
      const k = keyActions.current;
      if (!k.running) return;
      const now = Date.now();
      if (e.shiftKey) {
        if (!k.canAdvance || now - lastKey.current.advance < 500) return;
        e.preventDefault();
        lastKey.current.advance = now;
        k.advance();
      } else if (k.pending > 0 && now - lastKey.current.reveal < 250) {
        e.preventDefault();
      } else if (k.pending > 0) {
        e.preventDefault();
        lastKey.current.reveal = now;
        k.reveal();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const askReset = async () => {
    const ok = await confirm({ title: 'Reset the run?', body: 'The evening goes back to the start: revealed clues, confirmations and timers are cleared. Your case is not changed.', confirmLabel: 'Reset run', danger: true });
    if (ok) actions.reset();
  };

  const askReveal = async () => {
    const ok = await confirm({ title: 'Reveal the solution?', body: 'Spoilers ahead. Anyone who can see this screen will learn who the killer is and how the mystery unfolds. The key hides itself again when you refresh.', confirmLabel: 'Show the solution' });
    if (ok) setSolutionOpen(true);
  };

  // ------------------------------------------------------------------ views
  const header = (
    <header className="page-head">
      <span className="page-head__eyebrow">Live run</span>
      <div className="row row--between row--wrap">
        <h1 className="page-head__title">{doc.title || 'Untitled mystery'}</h1>
        <div className="row row--wrap">
          {running && (
            <>
              <Chip icon={<Flag />} tone="primary">
                Beat {run.index + 1} of {doc.beats.length}
              </Chip>
              <Chip icon={<TimerIcon />}>{formatElapsed(now - (run.startedAt ?? now))} elapsed</Chip>
            </>
          )}
          {run.status === 'finished' && <Chip tone="success" icon={<CircleCheck />}>Finished</Chip>}
          {run.status !== 'idle' && (
            <Button variant="outlined" size="sm" icon={<RotateCcw />} onClick={() => void askReset()}>
              Reset run
            </Button>
          )}
        </div>
      </div>
      {running && <Progress value={(run.index + 1) / Math.max(1, doc.beats.length)} label="Run progress" />}
    </header>
  );

  const rail = (
    <Card>
      <CardHeader title="Timeline" subtitle={plural(doc.beats.length, 'beat')} />
      <ol className="rail" aria-label="Timeline">
        {doc.beats.map((b, i) => {
          const state = run.status === 'finished' || (running && i < run.index) ? 'done' : running && i === run.index ? 'current' : 'upcoming';
          return (
            <li key={b.id} className={`rail__item is-${state}`} aria-current={state === 'current' ? 'step' : undefined}>
              <span className="rail__dot">{state === 'done' ? <Check aria-hidden="true" /> : i + 1}</span>
              <span>
                <span className="rail__title" style={{ display: 'block' }}>
                  {beatLabel(b)}
                </span>
                <span className="rail__sub">
                  {b.timeLabel && <span>{b.timeLabel}</span>}
                  <span>{TRIGGER_LABEL[b.trigger]}{b.trigger === 'timer' && b.timerSeconds ? ` ${formatClock(b.timerSeconds * 1000)}` : ''}</span>
                  {b.evidenceIds.length > 0 && <span>{b.evidenceIds.length} clue{b.evidenceIds.length === 1 ? '' : 's'}</span>}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </Card>
  );

  const castCard = (
    <Card>
      <CardHeader icon={<Users size={20} color="var(--md-sys-color-primary)" />} title="Cast" subtitle={solutionOpen ? 'GM notes visible' : 'Public information only'} />
      <ul className="stack stack--tight">
        {doc.characters.map((c, i) => (
          <li key={c.id}>
            <details>
              <summary className="row" style={{ cursor: 'pointer', gap: 'var(--space-3)', padding: '4px 0' }}>
                <Avatar name={c.name} index={i} />
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span className="t-title-small" style={{ display: 'block' }}>{characterName(doc, c.id)}</span>
                  <span className="t-body-small muted" style={{ display: 'block' }}>{solutionOpen ? c.secretRole || '—' : 'Tap for public bio'}</span>
                </span>
                {solutionOpen && c.isKiller && <Chip small tone="tertiary" icon={<Skull />}>Killer</Chip>}
              </summary>
              <div className="t-body-small" style={{ padding: '6px 0 10px 52px' }}>
                <p>{c.publicBio || 'No public bio.'}</p>
                {solutionOpen && (
                  <>
                    <p className="muted" style={{ marginTop: 6 }}><strong>Alibi:</strong> {c.alibi || 'none'}</p>
                    {c.secrets.length > 0 && <p className="muted" style={{ marginTop: 4 }}><strong>Secrets:</strong> {c.secrets.join(' / ')}</p>}
                  </>
                )}
              </div>
            </details>
          </li>
        ))}
        {doc.characters.length === 0 && <li className="muted t-body-small">No characters yet.</li>}
      </ul>
    </Card>
  );

  const solutionCard = (
    <section className="card solution" aria-label="Solution key">
      <div className="tape" aria-hidden="true" />
      {!solutionOpen ? (
        <div className="solution__locked">
          <Lock aria-hidden="true" />
          <h2 className="t-title-large">Solution key</h2>
          <p className="muted t-body-medium">Hidden until you choose to see it. Keep this screen away from players.</p>
          <Button variant="tonal" icon={<Eye />} onClick={() => void askReveal()}>
            Reveal the solution
          </Button>
        </div>
      ) : (
        <div className="stack" style={{ paddingTop: 'var(--space-4)' }}>
          <div className="row row--between">
            <span className="stamp">Spoilers</span>
            <Button variant="text" size="sm" icon={<EyeOff />} onClick={() => setSolutionOpen(false)}>
              Hide
            </Button>
          </div>
          <div>
            <div className="section-label">The killer</div>
            <div className="solution__killer">{solution.killerName ?? 'Nobody is marked as the killer!'}</div>
            {solution.method && <p className="muted">{doc.victim.name || 'The victim'}: {solution.method}.</p>}
          </div>
          {solution.motives.length > 0 && (
            <div>
              <div className="section-label">Motive</div>
              <ul>{solution.motives.map((m, i) => (<li key={i}><strong>{m.category}</strong> ({m.strength}): {m.description}</li>))}</ul>
            </div>
          )}
          {solution.keyEvidence.length > 0 && (
            <div>
              <div className="section-label">Key evidence</div>
              <ul>{solution.keyEvidence.map((e) => (<li key={e.id}><strong>{e.title}</strong>{e.revealedIn ? ` (${e.revealedIn})` : ''}: {e.description}</li>))}</ul>
            </div>
          )}
          {solution.herrings.length > 0 && (
            <div>
              <div className="section-label">Red herrings and how they fall</div>
              <ul>
                {solution.herrings.map((h) => (
                  <li key={h.id}>
                    <strong>{h.title}</strong>{h.misleads.length ? ` (points at ${h.misleads.join(', ')})` : ''}. Revealed: {h.revealedIn ?? 'never'}. Debunked: {h.debunkedIn ?? 'no beat'}{h.debunkedBy ? ` by “${h.debunkedBy}”` : ''}. {h.note}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );

  // -------------------------------------------------------------- not started
  if (run.status === 'idle') {
    return (
      <>
        {header}
        {doc.beats.length === 0 ? (
          <EmptyState icon={<Flag />} title="There is no timeline to run" action={<Button variant="filled" href={hrefs.build(doc.id, 'timeline')}>Build the timeline</Button>}>
            Add at least a few beats (arrivals, the discovery, questioning, the reveal) and come back.
          </EmptyState>
        ) : (
          <div className="gm-grid">
            <div className="stack">
              <Card>
                <CardHeader title="Ready to run the evening?" subtitle="Everything below is only visible on this screen." />
                <div className="stat-grid" style={{ marginBottom: 'var(--space-5)' }}>
                  <div className="stat"><div className="stat__num">{doc.beats.length}</div><div className="stat__label">Beats</div></div>
                  <div className="stat"><div className="stat__num">{doc.evidence.length}</div><div className="stat__label">Clues</div></div>
                  <div className="stat"><div className="stat__num">{doc.characters.length}</div><div className="stat__label">Players</div></div>
                  <div className="stat"><div className="stat__num">~{doc.extras.runtimeMinutes}</div><div className="stat__label">Minutes</div></div>
                </div>
                {counts.error > 0 ? (
                  <Callout tone="error" title={`${plural(counts.error, 'consistency error')} in this case`} actions={<Button size="sm" variant="tonal" href={hrefs.build(doc.id, 'polish')}>Review</Button>}>
                    The game will still run, but something may not work as intended (for example a clue that never appears).
                  </Callout>
                ) : (
                  <Callout tone="success" title="Consistency check passed">No errors found. Break a leg.</Callout>
                )}
                <div className="primary-action" style={{ marginTop: 'var(--space-5)' }}>
                  <Button variant="filled" size="lg" icon={<Play />} onClick={actions.start}>
                    Start the evening
                  </Button>
                  <span className="muted t-body-small">
                    Use <kbd>→</kbd> to reveal clues and <kbd>Shift</kbd> + <kbd>→</kbd> to advance. Progress is saved, even across devices.
                  </span>
                </div>
              </Card>
              {solutionCard}
            </div>
            <div className="stack">{rail}{castCard}</div>
          </div>
        )}
      </>
    );
  }

  // ------------------------------------------------------- running / finished
  const revealedList = [...run.revealed].reverse().map((id) => evById.get(id)).filter((e): e is NonNullable<typeof e> => Boolean(e));

  return (
    <>
      {header}
      <div className="gm-grid">
        <div className="stack">
          {run.status === 'finished' && (
            <Card variant="filled" className="finish-banner">
              <Flag size={36} color="var(--md-sys-color-primary)" aria-hidden="true" style={{ margin: '0 auto 8px' }} />
              <h2 className="t-headline-small">The evening is complete</h2>
              <p className="muted" style={{ margin: '8px auto 16px', maxWidth: '52ch' }}>
                The final beat has played. Collect the accusations, reveal the solution, and pour something well earned.
              </p>
              <div className="row row--wrap" style={{ justifyContent: 'center' }}>
                {!solutionOpen && <Button variant="filled" icon={<Eye />} onClick={() => void askReveal()}>Reveal the solution</Button>}
                <Button variant="outlined" icon={<ArrowLeft />} onClick={actions.back}>Back to the last beat</Button>
                <Button variant="text" icon={<RotateCcw />} onClick={() => void askReset()}>Run it again</Button>
              </div>
            </Card>
          )}

          {beat && (
            <Card className="gm-now" variant="elevated">
              <div className="tape" aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, top: 0 }} />
              <div className="gm-now__meta" style={{ marginTop: 'var(--space-2)' }}>
                <Chip tone="primary">Round {beat.round}</Chip>
                {beat.timeLabel && <Chip>{beat.timeLabel}</Chip>}
                <Chip icon={TRIGGER_ICON[beat.trigger]}>{TRIGGER_LABEL[beat.trigger]}</Chip>
              </div>
              <h2 className="gm-now__title" aria-live="polite">{beatLabel(beat)}</h2>
              {beat.description && <p className="gm-now__desc">{beat.description}</p>}

              {hasTimer && remaining !== null && run.timer && (
                <div className={['timer', remaining <= 30_000 && 'is-low', timeUp && 'is-zero'].filter(Boolean).join(' ')} style={{ marginTop: 'var(--space-5)' }} role="timer" aria-label="Countdown">
                  <div className="timer__digits" aria-live="off">{formatClock(remaining)}</div>
                  <div className="timer__bar stack stack--tight">
                    <Progress value={run.timer.durationMs ? remaining / run.timer.durationMs : 0} label="Time remaining" tall />
                    <div className="t-body-small muted" role="status">
                      {timeUp ? 'Time is up. Advance when you are ready.' : timerRunning ? 'Counting down…' : 'Paused'}
                    </div>
                  </div>
                  <div className="row">
                    {timerRunning ? (
                      <Button variant="tonal" icon={<Pause />} onClick={actions.pause}>Pause</Button>
                    ) : (
                      <Button variant="tonal" icon={<Play />} onClick={actions.resume} disabled={remaining === 0}>Resume</Button>
                    )}
                    <Button variant="text" icon={<RotateCcw />} onClick={actions.restartTimer}>Restart</Button>
                  </div>
                </div>
              )}

              {beat.trigger === 'player-action' && (
                <div className={['action-gate', run.confirmed.includes(beat.id) && 'is-confirmed'].filter(Boolean).join(' ')} style={{ marginTop: 'var(--space-5)' }}>
                  <UserCheck aria-hidden="true" />
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div className="t-title-small">{run.confirmed.includes(beat.id) ? 'Players completed the action' : 'Waiting for the players'}</div>
                    <div className="t-body-medium muted">{beat.actionPrompt || 'Players must complete an action before the game moves on.'}</div>
                  </div>
                  {run.confirmed.includes(beat.id) ? (
                    <Chip tone="success" icon={<Check />}>Confirmed</Chip>
                  ) : (
                    <Button variant="filled" icon={<Check />} onClick={actions.confirm}>Players did it</Button>
                  )}
                </div>
              )}

              {beatClues.length > 0 && (
                <div style={{ marginTop: 'var(--space-5)' }}>
                  <div className="section-label" style={{ marginBottom: 'var(--space-2)' }}>Clues in this beat</div>
                  <div className="clue-tray">
                    {beatClues.map((id, i) => {
                      const e = evById.get(id);
                      if (!e) return null;
                      const shown = run.revealed.includes(id);
                      return (
                        <div key={id} className={['clue', shown ? 'is-revealed' : 'is-hidden'].join(' ')}>
                          <span className="clue__label">Clue {i + 1} · {e.kind === 'verbal' ? 'Statement' : 'Physical'}</span>
                          {shown ? (
                            <>
                              <div className="t-title-small">{evidenceLabel(e)}</div>
                              <div className="clue__text">{e.description}</div>
                              <div className="t-label-small muted">Handed out or read aloud</div>
                            </>
                          ) : (
                            <>
                              <div className="clue__text">Not revealed yet.</div>
                              <Button variant="tonal" size="sm" icon={<Eye />} onClick={() => actions.revealClue(id)}>
                                Reveal this clue
                              </Button>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="primary-action" style={{ marginTop: 'var(--space-6)' }}>
                {running && pending.length > 0 ? (
                  <Button variant="filled" size="lg" icon={<Search />} onClick={actions.revealNext}>
                    Reveal next clue ({pending.length} left)
                  </Button>
                ) : running ? (
                  <Button variant="filled" size="lg" icon={last ? <Flag /> : <ArrowRight />} onClick={actions.advance} disabled={!advanceCheck.ok}>
                    {last ? 'Finish the evening' : `Advance: ${beatLabel(nextBeat)}`}
                  </Button>
                ) : null}
                {running && pending.length > 0 && (
                  <Button variant="outlined" icon={<ArrowRight />} onClick={actions.advance} disabled={!advanceCheck.ok}>
                    {last ? 'Finish' : 'Skip to next beat'}
                  </Button>
                )}
                {running && run.index > 0 && (
                  <Button variant="text" icon={<ArrowLeft />} onClick={actions.back}>
                    Previous beat
                  </Button>
                )}
              </div>
              {running && !advanceCheck.ok && <p className="t-body-small muted" style={{ marginTop: 'var(--space-2)' }} role="status">{advanceCheck.reason}</p>}
              {running && <p className="t-body-small muted" style={{ marginTop: 'var(--space-3)' }}>Shortcuts: <kbd>→</kbd> reveals the next clue, <kbd>Shift</kbd> + <kbd>→</kbd> advances.</p>}

              {beat.gmNotes.trim() && (
                <details style={{ marginTop: 'var(--space-5)' }}>
                  <summary className="t-label-large" style={{ cursor: 'pointer' }}>GM notes for this beat</summary>
                  <p className="muted t-body-medium" style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{beat.gmNotes}</p>
                </details>
              )}
            </Card>
          )}

          {missed.length > 0 && (
            <Callout tone="warning" title="Clues from earlier beats were never revealed">
              <div className="chip-row" style={{ marginTop: 6 }}>
                {missed.map((id) => (
                  <Chip key={id} ghost icon={<Eye />} onClick={() => actions.revealClue(id)}>
                    Reveal “{evidenceLabel(evById.get(id))}”
                  </Chip>
                ))}
              </div>
            </Callout>
          )}

          <Card>
            <CardHeader title="Clues in play" subtitle={`${run.revealed.length} of ${doc.evidence.length} revealed`} />
            {revealedList.length === 0 ? (
              <p className="muted">Nothing revealed yet. Revealed clues collect here so you can re-read them.</p>
            ) : (
              <ul className="stack stack--tight">
                {revealedList.map((e) => (
                  <li key={e.id} className="row" style={{ alignItems: 'flex-start' }}>
                    {e.kind === 'verbal' ? <MessageSquareQuote size={18} aria-hidden="true" style={{ marginTop: 3, flex: 'none' }} /> : <Package size={18} aria-hidden="true" style={{ marginTop: 3, flex: 'none' }} />}
                    <span><strong>{evidenceLabel(e)}</strong><span className="muted"> — {e.description}</span></span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="stack">
          {rail}
          {solutionCard}
          {castCard}
          {counts.error > 0 && (
            <Callout tone="error" title="Case has errors" actions={<Button size="sm" variant="tonal" icon={<ShieldAlert />} href={hrefs.build(doc.id, 'polish')}>Review</Button>}>
              {plural(counts.error, 'consistency error')}.
            </Callout>
          )}
        </div>
      </div>
    </>
  );
}
