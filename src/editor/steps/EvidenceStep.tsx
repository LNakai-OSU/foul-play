import { useState } from 'react';
import { ArrowRight, Copy, FileSearch, MessageSquareQuote, Package, Plus, Trash2 } from 'lucide-react';
import type { Evidence } from '../../../shared/models';
import { beatLabel, beatOfEvidence, blankEvidence, characterName, moveItem, newId, removeEvidence, scheduleEvidence, setEvidenceVeracity } from '../../../shared/ops';
import { Button, Callout, Chip, EmptyState, IconButton, MultiPicker, PageHead, Segmented, SelectField, TextField } from '../../ui';
import { useFeedback } from '../../ui/feedback';
import { hrefs, navigate } from '../../router';
import { EntityCard } from '../EntityCard';
import { StepHints } from '../IssueList';
import { SortableList } from '../sortable';
import { useFocusEntity } from '../useFocusEntity';
import { IssueBadge, issuesFor, trimLabel, useOpenCard, type StepProps } from './common';

type Filter = 'all' | 'true' | 'red-herring' | 'unscheduled';

export function EvidenceStep({ doc, update, undo, issues, focus }: StepProps) {
  const [openId, setOpenId] = useOpenCard();
  const [filter, setFilter] = useState<Filter>('all');
  const { toast } = useFeedback();
  useFocusEntity(focus, (id) => {
    setFilter('all');
    setOpenId(id);
  });

  const patch = (id: string, p: Partial<Evidence>, key?: string) =>
    update((c) => ({ ...c, evidence: c.evidence.map((e) => (e.id === id ? { ...e, ...p } : e)) }), key ? `${id}:${key}` : undefined);

  const add = () => {
    const e = blankEvidence();
    update((c) => ({ ...c, evidence: [...c.evidence, e] }));
    setFilter('all');
    setOpenId(e.id);
    setTimeout(() => {
      document.getElementById(`ent-${e.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      document.getElementById(`f-${e.id}-title`)?.focus({ preventScroll: true });
    }, 120);
  };

  const charOptions = doc.characters.map((c) => ({ id: c.id, label: characterName(doc, c.id) }));
  const beatOptions = [{ value: '', label: 'Not scheduled yet' }, ...doc.beats.map((b, i) => ({ value: b.id, label: `${i + 1}. ${beatLabel(b)}` }))];

  const visible = doc.evidence.filter((e) => {
    if (filter === 'true') return e.veracity === 'true';
    if (filter === 'red-herring') return e.veracity === 'red-herring';
    if (filter === 'unscheduled') return !beatOfEvidence(doc, e.id);
    return true;
  });
  const counts = {
    all: doc.evidence.length,
    true: doc.evidence.filter((e) => e.veracity === 'true').length,
    herring: doc.evidence.filter((e) => e.veracity === 'red-herring').length,
    unscheduled: doc.evidence.filter((e) => !beatOfEvidence(doc, e.id)).length,
  };

  const remove = (e: Evidence) => {
    update((c) => removeEvidence(c, e.id));
    toast({ message: `Deleted clue “${trimLabel(e.title || e.description, 'Untitled clue', 30)}”`, actionLabel: 'Undo', onAction: undo });
  };

  return (
    <>
      <PageHead
        eyebrow="Step 5 of 8"
        title="Evidence and clues"
        lead="Every clue is either genuine or a red herring, points at one or more suspects, and enters play in a timeline beat. Physical clues become handout cards; verbal ones are read aloud."
        actions={
          <Button variant="filled" icon={<Plus />} onClick={add}>
            Add clue
          </Button>
        }
      />
      <StepHints issues={issues} step="evidence" caseId={doc.id} />

      <div className="chip-row" role="group" aria-label="Filter clues">
        <Chip selected={filter === 'all'} onClick={() => setFilter('all')}>All {counts.all}</Chip>
        <Chip selected={filter === 'true'} onClick={() => setFilter('true')}>Genuine {counts.true}</Chip>
        <Chip selected={filter === 'red-herring'} onClick={() => setFilter('red-herring')}>Red herrings {counts.herring}</Chip>
        <Chip selected={filter === 'unscheduled'} tone={counts.unscheduled ? 'warning' : undefined} onClick={() => setFilter('unscheduled')}>Unscheduled {counts.unscheduled}</Chip>
      </div>

      {doc.evidence.length === 0 ? (
        <EmptyState icon={<FileSearch />} title="No clues yet" action={<Button variant="filled" icon={<Plus />} onClick={add}>Add the first clue</Button>}>
          Aim for at least three genuine clues that point at the killer, plus a few red herrings to keep everyone honest.
        </EmptyState>
      ) : visible.length === 0 ? (
        <EmptyState icon={<FileSearch />} title="Nothing matches this filter">
          Try a different filter.
        </EmptyState>
      ) : (
        <SortableList
          className="entity-list"
          items={visible}
          itemLabel={(e) => trimLabel(e.title || e.description, 'Untitled clue')}
          onMove={(from, to) => {
            const fromId = (visible[from] as Evidence).id;
            const toId = (visible[to] as Evidence).id;
            update((c) => {
              const a = c.evidence.findIndex((e) => e.id === fromId);
              const b = c.evidence.findIndex((e) => e.id === toId);
              return { ...c, evidence: moveItem(c.evidence, a, b) };
            });
          }}
        >
          {(e, _i, { handle, isDragging }) => {
            const mine = issuesFor(issues, e.id);
            const beat = beatOfEvidence(doc, e.id);
            const herring = doc.redHerrings.find((r) => r.evidenceId === e.id);
            return (
              <EntityCard
                id={e.id}
                open={openId === e.id}
                onToggle={() => setOpenId(openId === e.id ? null : e.id)}
                handle={handle}
                dragging={isDragging}
                hasError={mine.some((i) => i.severity === 'error')}
                lead={<span className="avatar avatar--square">{e.kind === 'verbal' ? <MessageSquareQuote size={20} /> : <Package size={20} />}</span>}
                title={trimLabel(e.title || e.description, 'Untitled clue')}
                subtitle={e.implicatedIds.length ? `Points at ${e.implicatedIds.map((id) => characterName(doc, id)).join(', ')}` : 'Implicates no one'}
                meta={
                  <>
                    {e.veracity === 'red-herring' ? <Chip small tone="warning">Red herring</Chip> : <Chip small>Genuine</Chip>}
                    {beat ? <Chip small>Beat {doc.beats.indexOf(beat) + 1}</Chip> : <Chip small tone="warning">Unscheduled</Chip>}
                    <IssueBadge issues={mine} />
                  </>
                }
                actions={
                  <>
                    <IconButton
                      label="Duplicate clue"
                      icon={<Copy />}
                      size="sm"
                      onClick={() => update((c) => ({ ...c, evidence: [...c.evidence, { ...e, id: newId('ev'), title: e.title ? `${e.title} (copy)` : '', veracity: 'true' as const, implicatedIds: [...e.implicatedIds] }] }))}
                    />
                    <IconButton label="Delete clue" icon={<Trash2 />} size="sm" danger onClick={() => remove(e)} />
                  </>
                }
              >
                <div className="entity-form">
                  <TextField id={`f-${e.id}-title`} label="Clue title (GM only)" value={e.title} onChange={(v) => patch(e.id, { title: v }, 'title')} helper="Never printed on handout cards." />
                  <TextField id={`f-${e.id}-description`} label="What the players see or hear" value={e.description} multiline rows={3} onChange={(v) => patch(e.id, { description: v }, 'desc')} helper="This exact text goes on the handout card. Do not give the answer away." />
                  <div className="row row--wrap" style={{ gap: 'var(--space-6)' }}>
                    <div className="stack stack--tight">
                      <span className="picker__label">Kind</span>
                      <Segmented
                        label="Kind"
                        value={e.kind}
                        onChange={(v) => patch(e.id, { kind: v })}
                        options={[
                          { value: 'physical', label: 'Physical', icon: <Package /> },
                          { value: 'verbal', label: 'Verbal', icon: <MessageSquareQuote /> },
                        ]}
                      />
                    </div>
                    <div className="stack stack--tight">
                      <span className="picker__label">Veracity</span>
                      <Segmented
                        label="Veracity"
                        value={e.veracity}
                        onChange={(v) => update((c) => setEvidenceVeracity(c, e.id, v))}
                        options={[
                          { value: 'true', label: 'Genuine' },
                          { value: 'red-herring', label: 'Red herring' },
                        ]}
                      />
                    </div>
                  </div>
                  <MultiPicker id={`f-${e.id}-implicatedIds`} label="Implicates" options={charOptions} value={e.implicatedIds} addLabel="Implicate a suspect" emptyText="Nobody in particular" missingLabel="Missing character" onChange={(ids) => patch(e.id, { implicatedIds: ids })} />
                  <SelectField
                    id={`f-${e.id}-reveal`}
                    label="Revealed in beat"
                    value={beat?.id ?? ''}
                    options={beatOptions}
                    error={!beat ? 'Not scheduled: players will never see this clue.' : undefined}
                    onChange={(v) => update((c) => scheduleEvidence(c, e.id, v || null))}
                  />
                  {e.veracity === 'red-herring' && (
                    <Callout tone="info" title="This clue is a red herring" actions={<Button variant="tonal" size="sm" icon={<ArrowRight />} onClick={() => navigate(hrefs.build(doc.id, 'red-herrings', { entityId: herring?.id ?? e.id }))}>Debunk details</Button>}>
                      Explain why it is plausible and how it gets debunked in the Red herrings step.
                    </Callout>
                  )}
                </div>
              </EntityCard>
            );
          }}
        </SortableList>
      )}
    </>
  );
}
