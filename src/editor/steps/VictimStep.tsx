import { Card, CardHeader, PageHead, TextField } from '../../ui';
import { StepHints } from '../IssueList';
import { useFocusEntity } from '../useFocusEntity';
import type { StepProps } from './common';

export function VictimStep({ doc, update, issues, focus }: StepProps) {
  useFocusEntity(focus, () => undefined);
  const v = doc.victim;
  const set = (patch: Partial<typeof v>, key: string) => update((c) => ({ ...c, victim: { ...c.victim, ...patch } }), key);
  return (
    <>
      <PageHead eyebrow="Step 2 of 8" title="The victim" lead="Who died, how, when and where? Players will see all of this at the start: it is the fixed point every alibi is measured against." />
      <StepHints issues={issues} step="victim" caseId={doc.id} />
      <Card id="ent-victim">
        <CardHeader title="Who was killed" />
        <div className="stack">
          <TextField id="f-victim-name" label="Victim's name" value={v.name} onChange={(x) => set({ name: x }, 'v-name')} />
          <TextField id="f-victim-description" label="Who they were" value={v.description} multiline rows={3} onChange={(x) => set({ description: x }, 'v-desc')} helper="Public: read aloud to every player." />
        </div>
      </Card>
      <Card>
        <CardHeader title="The scene of the crime" />
        <div className="stack">
          <TextField id="f-victim-causeOfDeath" label="Cause of death" value={v.causeOfDeath} onChange={(x) => set({ causeOfDeath: x }, 'v-cause')} helper="e.g. Poisoned in the after-dinner brandy" />
          <div className="grid-2">
            <TextField id="f-victim-timeOfDeath" label="Time of death" value={v.timeOfDeath} onChange={(x) => set({ timeOfDeath: x }, 'v-time')} helper="In-game clock, e.g. 9:40 PM" />
            <TextField id="f-victim-placeOfDeath" label="Place of death" value={v.placeOfDeath} onChange={(x) => set({ placeOfDeath: x }, 'v-place')} helper="e.g. The library" />
          </div>
        </div>
      </Card>
    </>
  );
}
