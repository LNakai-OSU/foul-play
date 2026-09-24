import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CircleCheck,
  CirclePlay,
  Clock,
  Cloud,
  CloudOff,
  FileSearch,
  Fish,
  Flame,
  FolderOpen,
  Landmark,
  Loader2,
  Printer,
  Redo2,
  Search,
  ShieldAlert,
  Skull,
  Sparkles,
  Undo2,
  Users,
  RefreshCw,
  X,
  Dices,
  Gamepad2,
} from 'lucide-react';
import { countIssues, issuesByStep } from '../../shared/checker';
import { generateCase } from '../../shared/generator/generate';
import { randomSeed } from '../../shared/generator/rng';
import { plural } from '../../shared/ops';
import { STEPS, STEP_LABELS, type Case, type StepId } from '../../shared/models';
import { hrefs, navigate, type Route } from '../router';
import { Badge, Button, EmptyState, IconButton, Progress, Spinner } from '../ui';
import { useFeedback } from '../ui/feedback';
import { ExportView } from '../export/ExportView';
import { GmView } from '../gm/GmView';
import { GenerateDialog, loadGenerateDefaults, rememberGenerate, toOptions, type GenerateChoice } from './GenerateDialog';
import { IssuesPanel } from './IssuesPanel';
import { WizardStepper } from './WizardStepper';
import { CharactersStep } from './steps/CharactersStep';
import type { StepProps } from './steps/common';
import { EvidenceStep } from './steps/EvidenceStep';
import { MotivesStep } from './steps/MotivesStep';
import { PolishStep } from './steps/PolishStep';
import { RedHerringsStep } from './steps/RedHerringsStep';
import { SettingStep } from './steps/SettingStep';
import { TimelineStep } from './steps/TimelineStep';
import { VictimStep } from './steps/VictimStep';
import { useCaseEditor, type SaveState } from './useCaseEditor';

const STEP_ICON: Record<StepId, typeof Landmark> = {
  setting: Landmark,
  victim: Skull,
  characters: Users,
  motives: Flame,
  evidence: FileSearch,
  'red-herrings': Fish,
  timeline: Clock,
  polish: Sparkles,
};

function stepDone(doc: Case, step: StepId): boolean {
  switch (step) {
    case 'setting':
      return Boolean(doc.title.trim() && doc.setting.name.trim());
    case 'victim':
      return Boolean(doc.victim.name.trim() && doc.victim.causeOfDeath.trim());
    case 'characters':
      return doc.characters.length >= 3;
    case 'motives':
      return doc.motives.length > 0;
    case 'evidence':
      return doc.evidence.length > 0;
    case 'red-herrings':
      return doc.redHerrings.length > 0;
    case 'timeline':
      return doc.beats.length > 0;
    case 'polish':
      return doc.extras.props.length > 0 || doc.extras.miniGames.length > 0;
  }
}

function SaveIndicator({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  if (state === 'error')
    return (
      <button type="button" className="save-state is-error" onClick={onRetry} title="Saving failed. Click to retry.">
        <CloudOff aria-hidden="true" /> Not saved. Retry
      </button>
    );
  return (
    <span className="save-state" role="status" aria-live="polite">
      {state === 'saved' ? <Cloud aria-hidden="true" /> : <Loader2 aria-hidden="true" />}
      {state === 'saved' ? 'Saved' : 'Saving…'}
    </span>
  );
}

export function CaseWorkspace({ route }: { route: Extract<Route, { name: 'build' | 'gm' | 'export' }> }) {
  const editor = useCaseEditor(route.caseId);
  const { toast, confirm } = useFeedback();
  const { doc, issues } = editor;
  const [issuesOpen, setIssuesOpen] = useState(false);
  const [genOpen, setGenOpen] = useState(false);

  const counts = useMemo(() => countIssues(issues), [issues]);
  const byStep = useMemo(() => issuesByStep(issues), [issues]);
  const done = useMemo(() => {
    const out = {} as Record<StepId, boolean>;
    for (const s of STEPS) out[s] = doc ? stepDone(doc, s) : false;
    return out;
  }, [doc]);

  // title of the browser tab
  useEffect(() => {
    document.title = doc ? `${doc.title || 'Untitled'} · Foul Play` : 'Foul Play';
  }, [doc]);

  // Escape closes the issues drawer
  useEffect(() => {
    if (!issuesOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIssuesOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [issuesOpen]);

  // Undo / redo shortcuts. Skipped only where the browser has its own text undo (text
  // fields, textareas, contenteditable); switches, checkboxes, buttons and selects use ours.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && isTextEntry(t)) return;
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) {
        e.preventDefault();
        editor.undo();
      } else if ((k === 'z' && e.shiftKey) || k === 'y') {
        e.preventDefault();
        editor.redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editor]);

  const runGenerate = useCallback(
    async (choice: GenerateChoice, needsConfirm: boolean) => {
      if (!doc) return;
      if (needsConfirm) {
        const ok = await confirm({
          title: 'Replace your scenario?',
          body: 'Everything you have built in this case will be replaced by a freshly generated scenario. You can undo it right afterwards.',
          confirmLabel: 'Replace',
          danger: true,
        });
        if (!ok) return;
      }
      rememberGenerate(choice);
      let title = '';
      editor.update((c) => {
        const next = generateCase(toOptions(choice), { id: c.id, createdAt: c.createdAt });
        title = next.title;
        return next;
      });
      setGenOpen(false);
      toast({ message: `Generated “${title}”`, actionLabel: 'Undo', onAction: editor.undo });
    },
    [doc, confirm, editor, toast],
  );

  if (editor.status === 'loading') return <Spinner label="Opening case file…" />;
  if (editor.status === 'error' || !doc) {
    return (
      <div className="library__inner">
        <EmptyState
          icon={<AlertCircle />}
          title={editor.notFound ? 'Case not found' : 'Could not open this case'}
          action={
            <Button variant="filled" icon={<FolderOpen />} href={hrefs.library()}>
              Back to the case library
            </Button>
          }
        >
          {editor.notFound ? 'It may have been deleted, or the link is wrong.' : editor.error}
        </EmptyState>
      </div>
    );
  }

  const hasContent = doc.characters.length > 0 || doc.evidence.length > 0 || doc.beats.length > 0;
  const stepIndex = route.name === 'build' ? STEPS.indexOf(route.step) : -1;
  const progress = STEPS.filter((s) => done[s]).length / STEPS.length;
  const viewTitle = route.name === 'build' ? STEP_LABELS[route.step] : route.name === 'gm' ? 'Game master' : 'Print and export';

  const stepProps: StepProps = { doc, update: editor.update, undo: editor.undo, issues, focus: route.name === 'build' ? route.focus : undefined, onGenerate: () => setGenOpen(true) };

  const renderStep = (step: StepId) => {
    switch (step) {
      case 'setting':
        return <SettingStep {...stepProps} />;
      case 'victim':
        return <VictimStep {...stepProps} />;
      case 'characters':
        return <CharactersStep {...stepProps} />;
      case 'motives':
        return <MotivesStep {...stepProps} />;
      case 'evidence':
        return <EvidenceStep {...stepProps} />;
      case 'red-herrings':
        return <RedHerringsStep {...stepProps} />;
      case 'timeline':
        return <TimelineStep {...stepProps} />;
      case 'polish':
        return <PolishStep {...stepProps} />;
    }
  };

  return (
    <div className="shell">
      <aside className="sidebar no-print" aria-label="Case navigation">
        <div className="sidebar__brand">
          <a className="brand" href={hrefs.library()} aria-label="Foul Play: back to the case library">
            <span className="brand__mark">
              <Search aria-hidden="true" />
            </span>
            <span className="brand__text">
              <div className="brand__name">Foul Play</div>
              <div className="brand__tag">Party kit builder</div>
            </span>
          </a>
        </div>
        <div className="sidebar__case">
          <div className="t-label-small muted" style={{ marginBottom: 4 }}>
            CURRENT CASE
          </div>
          <div className="sidebar__case-title">{doc.title || 'Untitled mystery'}</div>
          <div style={{ marginTop: 10 }}>
            <Progress value={progress} label="Build progress" />
            <div className="t-body-small muted" style={{ marginTop: 6 }}>
              {Math.round(progress * STEPS.length)} of {STEPS.length} steps complete
            </div>
          </div>
        </div>

        <div className="sidebar__group section-label">Build</div>
        {STEPS.map((s, i) => {
          const Icon = STEP_ICON[s];
          const c = byStep[s];
          const current = route.name === 'build' && route.step === s;
          return (
            <a key={s} href={hrefs.build(doc.id, s)} className={['nav-item state-layer', done[s] && 'is-done'].filter(Boolean).join(' ')} aria-current={current ? 'page' : undefined} title={STEP_LABELS[s]} aria-label={`${STEP_LABELS[s]}${c.error ? `, ${plural(c.error, 'error')}` : c.warning ? `, ${plural(c.warning, 'warning')}` : ''}`}>
              <span className="nav-item__num">{done[s] ? <Check aria-hidden="true" /> : i + 1}</span>
              <Icon className="nav-item__icon" aria-hidden="true" />
              <span className="nav-item__label">{STEP_LABELS[s]}</span>
              {c.error > 0 ? <Badge tone="error">{c.error}</Badge> : c.warning > 0 ? <Badge tone="warning">{c.warning}</Badge> : null}
            </a>
          );
        })}

        <div className="sidebar__group section-label">Play</div>
        <a href={hrefs.gm(doc.id)} className="nav-item state-layer" aria-current={route.name === 'gm' ? 'page' : undefined} title="Game master">
          <CirclePlay className="nav-item__icon" style={{ display: 'block' }} aria-hidden="true" />
          <span className="nav-item__label">Game master</span>
        </a>
        <a href={hrefs.play(doc.id)} className="nav-item state-layer" title="Play as the detective">
          <Gamepad2 className="nav-item__icon" style={{ display: 'block' }} aria-hidden="true" />
          <span className="nav-item__label">Play as detective</span>
        </a>
        <a href={hrefs.export(doc.id)} className="nav-item state-layer" aria-current={route.name === 'export' ? 'page' : undefined} title="Print and export">
          <Printer className="nav-item__icon" style={{ display: 'block' }} aria-hidden="true" />
          <span className="nav-item__label">Print and export</span>
        </a>
        <div className="sidebar__spacer" />
        <a href={hrefs.library()} className="nav-item state-layer" title="Case library">
          <FolderOpen className="nav-item__icon" style={{ display: 'block' }} aria-hidden="true" />
          <span className="nav-item__label">Case library</span>
        </a>
      </aside>

      <div className="shell__main">
        <header className="topbar no-print">
          <h1 className="topbar__title">{viewTitle}</h1>
          <div className="topbar__actions">
            <SaveIndicator state={editor.saveState} onRetry={editor.retry} />
            <IconButton label="Undo (Ctrl+Z)" icon={<Undo2 />} disabled={!editor.canUndo} onClick={editor.undo} />
            <IconButton label="Redo (Ctrl+Shift+Z)" icon={<Redo2 />} disabled={!editor.canRedo} onClick={editor.redo} />
            {route.name === 'build' && (
              <>
                <Button variant="tonal" icon={<Dices />} onClick={() => setGenOpen(true)}>
                  Generate
                </Button>
                <IconButton
                  label="Re-roll: generate a new scenario with the same settings"
                  icon={<RefreshCw />}
                  onClick={() => {
                    const d = loadGenerateDefaults({ tone: doc.tone, playerMin: doc.playerMin, playerMax: doc.playerMax });
                    void runGenerate({ ...d, tone: doc.tone, playerMin: doc.playerMin, playerMax: doc.playerMax, seed: randomSeed() }, hasContent);
                  }}
                />
              </>
            )}
            <Button variant={counts.error ? 'danger' : counts.warning ? 'tonal' : 'outlined'} icon={counts.error ? <ShieldAlert /> : <CircleCheck />} onClick={() => setIssuesOpen(true)} aria-label={`Consistency check: ${plural(counts.error, 'error')}, ${plural(counts.warning, 'warning')}, ${plural(counts.info, 'suggestion')}`}>
              {counts.error + counts.warning === 0 ? 'Consistent' : `${plural(counts.error, 'error')} · ${plural(counts.warning, 'warning')}`}
            </Button>
          </div>
        </header>

        <main className="content">
          <div className="content__inner" key={route.name === 'build' ? route.step : route.name}>
            {route.name === 'build' && (
              <>
                <WizardStepper caseId={doc.id} current={route.step} done={done} counts={byStep} />
                {renderStep(route.step)}
                <div className="wizard-nav no-print">
                  {stepIndex > 0 ? (
                    <Button variant="outlined" icon={<ArrowLeft />} href={hrefs.build(doc.id, STEPS[stepIndex - 1] as StepId)}>
                      {STEP_LABELS[STEPS[stepIndex - 1] as StepId]}
                    </Button>
                  ) : (
                    <span />
                  )}
                  {stepIndex < STEPS.length - 1 ? (
                    <Button variant="filled" href={hrefs.build(doc.id, STEPS[stepIndex + 1] as StepId)} icon={<ArrowRight />}>
                      Next: {STEP_LABELS[STEPS[stepIndex + 1] as StepId]}
                    </Button>
                  ) : (
                    <Button variant="filled" href={hrefs.gm(doc.id)} icon={<CirclePlay />}>
                      Run the game
                    </Button>
                  )}
                </div>
              </>
            )}
            {route.name === 'gm' && <GmView doc={doc} issues={issues} />}
            {route.name === 'export' && <ExportView doc={doc} issues={issues} tab={route.tab} />}
          </div>
        </main>
      </div>

      {issuesOpen && (
        <>
          <div className="scrim no-print" onClick={() => setIssuesOpen(false)} />
          <aside className="drawer no-print" aria-label="Consistency check">
            <div className="drawer__head">
              <div style={{ flex: 1 }}>
                <h2 className="t-title-large">Consistency check</h2>
                <p className="muted t-body-small">
                  {plural(counts.error, 'error')} · {plural(counts.warning, 'warning')} · {plural(counts.info, 'suggestion')}
                </p>
              </div>
              <IconButton label="Close consistency check" icon={<X />} onClick={() => setIssuesOpen(false)} />
            </div>
            <div className="drawer__body">
              <IssuesPanel issues={issues} caseId={doc.id} onGo={() => setIssuesOpen(false)} />
            </div>
          </aside>
        </>
      )}

      <GenerateDialog
        open={genOpen}
        onClose={() => setGenOpen(false)}
        initial={{ tone: doc.tone, playerMin: doc.playerMin, playerMax: doc.playerMax }}
        replacing={hasContent}
        onGenerate={(c) => void runGenerate(c, false)}
      />
    </div>
  );
}

export function goToStep(caseId: string, step: StepId): void {
  navigate(hrefs.build(caseId, step));
}

const NON_TEXT_INPUTS = new Set(['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file', 'image']);

/** True when the element has native text editing (and so its own Ctrl+Z). */
function isTextEntry(el: HTMLElement): boolean {
  if (el.isContentEditable || el.tagName === 'TEXTAREA') return true;
  return el instanceof HTMLInputElement && !NON_TEXT_INPUTS.has(el.type);
}
