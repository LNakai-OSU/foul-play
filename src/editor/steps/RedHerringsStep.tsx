import { ArrowRight, Plus, Trash2, Undo2, Fish } from 'lucide-react';
import type { Evidence, RedHerring } from '../../../shared/models';
import { addRedHerring, beatLabel, beatOfEvidence, blankRedHerring, characterName, evidenceLabel, removeRedHerring, setEvidenceVeracity } from '../../../shared/ops';
import { Button, Callout, Chip, EmptyState, IconButton, MultiPicker, PageHead, SelectField, TextField } from '../../ui';
import { useFeedback } from '../../ui/feedback';
import { EntityCard } from '../EntityCard';
import { StepHints } from '../IssueList';
import { useFocusEntity } from '../useFocusEntity';
import { IssueBadge, issuesFor, trimLabel, useOpenCard, type StepProps } from './common';

export function RedHerringsStep({ doc, update, undo, issues, focus }: StepProps) {
  const [openId, setOpenId] = useOpenCard();
  const { toast } = useFeedback();
  useFocusEntity(focus, setOpenId);

  const evById = new Map(doc.evidence.map((e) => [e.id, e]));
  const patchRh = (id: string, p: Partial<RedHerring>, key?: string) =>
    update((c) => ({ ...c, redHerrings: c.redHerrings.map((r) => (r.id === id ? { ...r, ...p } : r)) }), key ? `${id}:${key}` : undefined);
  const patchEv = (id: string, p: Partial<Evidence>, key?: string) =>
    update((c) => ({ ...c, evidence: c.evidence.map((e) => (e.id === id ? { ...e, ...p } : e)) }), key ? `${id}:${key}` : undefined);

  const add = () => {
    let herringId = '';
    update((c) => {
      const r = addRedHerring(c);
      herringId = r.herringId;
      return r.case;
    });
    setOpenId(herringId);
    setTimeout(() => document.getElementById(`ent-${herringId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
  };

  const beatOptions = [{ value: '', label: 'No debunk beat' }, ...doc.beats.map((b, i) => ({ value: b.id, label: `${i + 1}. ${beatLabel(b)}` }))];
  const charOptions = doc.characters.map((c) => ({ id: c.id, label: characterName(doc, c.id) }));
  const convertible = doc.evidence.filter((e) => e.veracity === 'true');
  const trueClues = [{ value: '', label: 'No debunking clue' }, ...doc.evidence.filter((e) => e.veracity === 'true').map((e) => ({ value: e.id, label: evidenceLabel(e) }))];
  // clues flagged red herring but with no details record (checker: herring-record-missing)
  const recordless = doc.evidence.filter((e) => e.veracity === 'red-herring' && !doc.redHerrings.some((r) => r.evidenceId === e.id));

  return (
    <>
      <PageHead
        eyebrow="Step 6 of 8"
        title="Red herrings"
        lead="A red herring is a plausible, misleading clue. Each needs a reason players will believe it and a way to be knocked down later: a beat, a clue, or both. It must be debunked after it is revealed."
        actions={
          <Button variant="filled" icon={<Plus />} onClick={add}>
            Add red herring
          </Button>
        }
      />
      <StepHints issues={issues} step="red-herrings" caseId={doc.id} />

      {recordless.map((e) => (
        <div id={`ent-${e.id}`} key={e.id}>
          <Callout tone="warning" title={`“${evidenceLabel(e)}” is marked as a red herring but has no details`} actions={<Button variant="tonal" size="sm" onClick={() => update((c) => ({ ...c, redHerrings: [...c.redHerrings, blankRedHerring(e.id)] }))}>Create details</Button>}>
            Add the plausibility and debunk info so the checker can verify it.
          </Callout>
        </div>
      ))}

      {doc.redHerrings.length === 0 ? (
        <EmptyState icon={<Fish />} title="No red herrings yet" action={<Button variant="filled" icon={<Plus />} onClick={add}>Add a red herring</Button>}>
          Without red herrings the killer is too easy to spot. Two or three misleading clues, each debunked later, make for a satisfying game.
        </EmptyState>
      ) : (
        <div className="entity-list">
          {doc.redHerrings.map((rh, idx) => {
            const ev = evById.get(rh.evidenceId);
            const mine = issuesFor(issues, rh.id);
            const revealBeat = ev ? beatOfEvidence(doc, ev.id) : null;
            const debunkBeat = rh.debunkBeatId ? doc.beats.find((b) => b.id === rh.debunkBeatId) : undefined;
            const revealIdx = revealBeat ? doc.beats.indexOf(revealBeat) : -1;
            const debunkIdx = debunkBeat ? doc.beats.indexOf(debunkBeat) : -1;
            const orderWrong = revealIdx >= 0 && debunkIdx >= 0 && debunkIdx < revealIdx;
            return (
              <EntityCard
                key={rh.id}
                id={rh.id}
                open={openId === rh.id}
                onToggle={() => setOpenId(openId === rh.id ? null : rh.id)}
                hasError={mine.some((i) => i.severity === 'error')}
                lead={<span className="num-badge">{idx + 1}</span>}
                title={trimLabel(ev ? evidenceLabel(ev) : '', 'Missing clue')}
                subtitle={ev && ev.implicatedIds.length ? `Misleads players about ${ev.implicatedIds.map((i) => characterName(doc, i)).join(', ')}` : 'Not yet aimed at anyone'}
                meta={
                  <>
                    {rh.debunkBeatId || rh.debunkEvidenceId ? <Chip small tone="success">Debunked</Chip> : <Chip small tone="warning">Never debunked</Chip>}
                    <IssueBadge issues={mine} />
                  </>
                }
                actions={
                  <IconButton
                    label="Delete red herring"
                    icon={<Trash2 />}
                    size="sm"
                    danger
                    onClick={() => {
                      update((c) => removeRedHerring(c, rh.id, true));
                      toast({ message: 'Deleted red herring and its clue', actionLabel: 'Undo', onAction: undo });
                    }}
                  />
                }
              >
                <div className="entity-form">
                  {!ev ? (
                    <Callout tone="error" title="The clue behind this red herring was deleted">
                      Delete this card, or restore the clue with Undo.
                    </Callout>
                  ) : (
                    <>
                      {ev.veracity !== 'red-herring' && (
                        <Callout tone="warning" title="This clue is currently marked genuine" actions={<Button size="sm" variant="tonal" onClick={() => update((c) => setEvidenceVeracity(c, ev.id, 'red-herring'))}>Mark as red herring</Button>}>
                          The details below are ignored until the clue is a red herring.
                        </Callout>
                      )}
                      <TextField id={`f-${rh.id}-title`} label="Misleading clue title (GM only)" value={ev.title} onChange={(v) => patchEv(ev.id, { title: v }, 'title')} />
                      <TextField id={`f-${rh.id}-description`} label="What the players see or hear" value={ev.description} multiline rows={3} onChange={(v) => patchEv(ev.id, { description: v }, 'desc')} />
                      <MultiPicker id={`f-${rh.id}-implicatedIds`} label="Misleads players about" options={charOptions} value={ev.implicatedIds} addLabel="Point at a suspect" emptyText="Nobody yet" missingLabel="Missing character" onChange={(ids) => patchEv(ev.id, { implicatedIds: ids })} />
                    </>
                  )}
                  <TextField id={`f-${rh.id}-whyPlausible`} label="Why it is plausible" value={rh.whyPlausible} multiline rows={2} onChange={(v) => patchRh(rh.id, { whyPlausible: v }, 'why')} helper="Why will players believe it?" />

                  <div className="grid-2">
                    <SelectField id={`f-${rh.id}-debunkBeatId`} label="Debunked in beat" value={rh.debunkBeatId ?? ''} options={beatOptions} error={orderWrong ? 'This beat comes before the red herring is revealed.' : rh.debunkBeatId && !debunkBeat ? 'That beat no longer exists.' : undefined} onChange={(v) => patchRh(rh.id, { debunkBeatId: v || null })} />
                    <SelectField id={`f-${rh.id}-debunkEvidenceId`} label="Debunked by clue" value={rh.debunkEvidenceId ?? ''} options={trueClues} error={rh.debunkEvidenceId && !evById.has(rh.debunkEvidenceId) ? 'That clue no longer exists.' : undefined} onChange={(v) => patchRh(rh.id, { debunkEvidenceId: v || null })} />
                  </div>
                  <TextField id={`f-${rh.id}-debunkNote`} label="How it gets debunked (GM notes)" value={rh.debunkNote} multiline rows={2} onChange={(v) => patchRh(rh.id, { debunkNote: v }, 'note')} helper="Shown in the Game Master's solution key." />

                  <div className="debunk-flow" aria-label="Reveal and debunk order">
                    <Chip small tone={revealBeat ? undefined : 'warning'}>{revealBeat ? `Revealed: ${revealIdx + 1}. ${beatLabel(revealBeat)}` : 'Not revealed yet'}</Chip>
                    <ArrowRight aria-hidden="true" />
                    <Chip small tone={orderWrong ? 'error' : debunkBeat ? 'success' : 'warning'}>{debunkBeat ? `Debunked: ${debunkIdx + 1}. ${beatLabel(debunkBeat)}` : 'No debunk beat'}</Chip>
                  </div>
                  {ev && (
                    <div>
                      <Button variant="text" size="sm" icon={<Undo2 />} onClick={() => { update((c) => removeRedHerring(c, rh.id, false)); toast({ message: 'Converted back to a genuine clue', actionLabel: 'Undo', onAction: undo }); }}>
                        Turn back into a genuine clue
                      </Button>
                    </div>
                  )}
                </div>
              </EntityCard>
            );
          })}
        </div>
      )}

      {convertible.length > 0 && (
        <div className="row row--wrap" style={{ alignItems: 'flex-start' }}>
          <div style={{ minWidth: 280, maxWidth: 420, flex: 1 }}>
            <SelectField
              id="f-convert-clue"
              label="Or mark an existing clue as a red herring"
              value=""
              options={[{ value: '', label: 'Choose a clue…' }, ...convertible.map((e) => ({ value: e.id, label: evidenceLabel(e) }))]}
              onChange={(v) => {
                if (!v) return;
                update((c) => setEvidenceVeracity(c, v, 'red-herring'));
                toast({ message: 'Marked as a red herring. Fill in its details above.', actionLabel: 'Undo', onAction: undo });
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
