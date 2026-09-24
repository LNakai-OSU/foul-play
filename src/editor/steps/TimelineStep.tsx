import { ArrowDown, ArrowUp, Clock, Hand, ListPlus, Plus, Timer, Trash2, UserCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Beat, Trigger } from '../../../shared/models';
import { blankBeat, evidenceLabel, moveItem, removeBeat, setBeatEvidence } from '../../../shared/ops';
import { Button, Chip, EmptyState, IconButton, MultiPicker, NumberField, PageHead, Segmented, TextField } from '../../ui';
import { useFeedback } from '../../ui/feedback';
import { EntityCard } from '../EntityCard';
import { StepHints } from '../IssueList';
import { SortableList } from '../sortable';
import { useFocusEntity } from '../useFocusEntity';
import { IssueBadge, issuesFor, trimLabel, useOpenCard, type StepProps } from './common';

export const TRIGGER_META: Record<Trigger, { label: string; icon: ReactNode }> = {
  manual: { label: 'GM advances', icon: <Hand /> },
  timer: { label: 'Timer', icon: <Timer /> },
  'player-action': { label: 'Player action', icon: <UserCheck /> },
};

export function TimelineStep({ doc, update, undo, issues, focus, onGenerate }: StepProps) {
  const [openId, setOpenId] = useOpenCard();
  const { toast } = useFeedback();
  useFocusEntity(focus, setOpenId);

  const patch = (id: string, p: Partial<Beat>, key?: string) =>
    update((c) => ({ ...c, beats: c.beats.map((b) => (b.id === id ? { ...b, ...p } : b)) }), key ? `${id}:${key}` : undefined);

  const insertAt = (index: number) => {
    const round = doc.beats[Math.max(0, Math.min(index - 1, doc.beats.length - 1))]?.round ?? 1;
    const b = blankBeat(round);
    update((c) => {
      const beats = [...c.beats];
      beats.splice(index, 0, b);
      return { ...c, beats };
    });
    setOpenId(b.id);
    setTimeout(() => {
      document.getElementById(`ent-${b.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      document.getElementById(`f-${b.id}-title`)?.focus({ preventScroll: true });
    }, 120);
  };

  const move = (from: number, to: number) => update((c) => ({ ...c, beats: moveItem(c.beats, from, to) }));
  const evOptions = doc.evidence.map((e) => ({ id: e.id, label: evidenceLabel(e) }));

  return (
    <>
      <PageHead
        eyebrow="Step 7 of 8"
        title="The timeline"
        lead="The evening as a sequence of beats. Drag the grip (or focus it and use Space plus the arrow keys) to reorder. Each beat can advance manually, on a timer, or when players complete an action, and reveals its clues as it plays."
        actions={
          <Button variant="filled" icon={<Plus />} onClick={() => insertAt(doc.beats.length)}>
            Add beat
          </Button>
        }
      />
      <StepHints issues={issues} step="timeline" caseId={doc.id} />

      {doc.beats.length === 0 ? (
        <EmptyState icon={<Clock />} title="The timeline is empty" action={<div className="row"><Button variant="filled" icon={<Plus />} onClick={() => insertAt(0)}>Add the first beat</Button><Button variant="tonal" onClick={onGenerate}>Generate one</Button></div>}>
          Start with the arrivals, then the discovery of the body, a few rounds of questioning and clues, and finish with accusations and the reveal.
        </EmptyState>
      ) : (
        <SortableList className="entity-list entity-list--timeline" items={doc.beats} itemLabel={(b, i) => `beat ${i + 1}: ${trimLabel(b.title, 'Untitled beat')}`} onMove={move}>
          {(b, i, { handle, isDragging }) => {
            const mine = issuesFor(issues, b.id);
            const meta = TRIGGER_META[b.trigger];
            const debunks = doc.redHerrings.filter((r) => r.debunkBeatId === b.id).length;
            const mins = Math.floor(b.timerSeconds / 60);
            const secs = b.timerSeconds % 60;
            return (
              <EntityCard
                id={b.id}
                open={openId === b.id}
                onToggle={() => setOpenId(openId === b.id ? null : b.id)}
                handle={handle}
                dragging={isDragging}
                hasError={mine.some((x) => x.severity === 'error')}
                lead={<span className="num-badge">{i + 1}</span>}
                title={trimLabel(b.title, 'Untitled beat')}
                subtitle={`Round ${b.round}${b.timeLabel ? ` · ${b.timeLabel}` : ''}${b.evidenceIds.length ? ` · ${b.evidenceIds.length} clue${b.evidenceIds.length === 1 ? '' : 's'}` : ''}`}
                meta={
                  <>
                    <Chip small icon={meta.icon}>
                      {b.trigger === 'timer' && b.timerSeconds > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : meta.label}
                    </Chip>
                    {debunks > 0 && <Chip small tone="success">Debunks {debunks}</Chip>}
                    <IssueBadge issues={mine} />
                  </>
                }
                actions={
                  <>
                    <IconButton label="Move beat up" icon={<ArrowUp />} size="sm" disabled={i === 0} onClick={() => move(i, i - 1)} />
                    <IconButton label="Move beat down" icon={<ArrowDown />} size="sm" disabled={i === doc.beats.length - 1} onClick={() => move(i, i + 1)} />
                    <IconButton label="Insert a beat below" icon={<ListPlus />} size="sm" onClick={() => insertAt(i + 1)} />
                    <IconButton
                      label="Delete beat"
                      icon={<Trash2 />}
                      size="sm"
                      danger
                      onClick={() => {
                        update((c) => removeBeat(c, b.id));
                        toast({ message: `Deleted beat “${trimLabel(b.title, 'Untitled beat', 30)}”`, actionLabel: 'Undo', onAction: undo });
                      }}
                    />
                  </>
                }
              >
                <div className="entity-form">
                  <TextField id={`f-${b.id}-title`} label="Beat title" value={b.title} onChange={(v) => patch(b.id, { title: v }, 'title')} />
                  <div className="grid-3">
                    <TextField id={`f-${b.id}-timeLabel`} label="In-game time" value={b.timeLabel} onChange={(v) => patch(b.id, { timeLabel: v }, 'time')} helper="e.g. 9:40 PM" />
                    <NumberField id={`f-${b.id}-round`} label="Round" min={0} max={99} value={b.round} onCommit={(n) => patch(b.id, { round: n })} />
                    <div className="stack stack--tight">
                      <span className="picker__label">Advances when</span>
                      <Segmented
                        small
                        label="Trigger"
                        value={b.trigger}
                        onChange={(v) => patch(b.id, { trigger: v, timerSeconds: v === 'timer' && b.timerSeconds === 0 ? 300 : b.timerSeconds })}
                        options={(Object.keys(TRIGGER_META) as Trigger[]).map((t) => ({ value: t, label: TRIGGER_META[t].label, icon: TRIGGER_META[t].icon }))}
                      />
                    </div>
                  </div>
                  {b.trigger === 'timer' && (
                    <div className="row row--wrap" style={{ alignItems: 'flex-start' }}>
                      <div style={{ width: 150 }}>
                        <NumberField id={`f-${b.id}-timerSeconds`} label="Timer minutes" min={0} max={600} value={mins} onCommit={(n) => patch(b.id, { timerSeconds: n * 60 + secs })} />
                      </div>
                      <div style={{ width: 150 }}>
                        <NumberField id={`f-${b.id}-timerSecs`} label="Seconds" min={0} max={59} value={secs} onCommit={(n) => patch(b.id, { timerSeconds: mins * 60 + n })} />
                      </div>
                    </div>
                  )}
                  {b.trigger === 'player-action' && (
                    <TextField id={`f-${b.id}-actionPrompt`} label="What must the players do?" value={b.actionPrompt} multiline rows={2} onChange={(v) => patch(b.id, { actionPrompt: v }, 'prompt')} helper="The GM confirms it in the live view before the game moves on." />
                  )}
                  <TextField id={`f-${b.id}-description`} label="Read-aloud description" value={b.description} multiline rows={3} onChange={(v) => patch(b.id, { description: v }, 'desc')} />
                  <MultiPicker id={`f-${b.id}-evidenceIds`} label="Clues revealed in this beat" options={evOptions} value={b.evidenceIds} addLabel="Reveal a clue" emptyText="No clues" missingLabel="Missing clue" onChange={(ids) => update((c) => setBeatEvidence(c, b.id, ids))} />
                  <TextField id={`f-${b.id}-gmNotes`} label="GM notes" value={b.gmNotes} multiline rows={3} onChange={(v) => patch(b.id, { gmNotes: v }, 'notes')} helper="Private: never printed on player materials." />
                </div>
              </EntityCard>
            );
          }}
        </SortableList>
      )}
    </>
  );
}
