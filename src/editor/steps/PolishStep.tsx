import { Play, Plus, Printer, Sparkles, Trash2, Wand2 } from 'lucide-react';
import { countIssues } from '../../../shared/checker';
import { estimateRuntimeMinutes, newId, plural } from '../../../shared/ops';
import { Button, Callout, Card, CardHeader, IconButton, NumberField, PageHead, StringListEditor, TextField } from '../../ui';
import { hrefs } from '../../router';
import { IssuesPanel } from '../IssuesPanel';
import { useFocusEntity } from '../useFocusEntity';
import type { StepProps } from './common';

const DIFFICULTY = ['Cozy', 'Gentle', 'Balanced', 'Tricky', 'Devious'];

export function PolishStep({ doc, update, issues, focus }: StepProps) {
  useFocusEntity(focus, () => undefined);
  const counts = countIssues(issues);
  const ex = doc.extras;
  const setExtras = (p: Partial<typeof ex>, key?: string) => update((c) => ({ ...c, extras: { ...c.extras, ...p } }), key);
  const blocking = counts.error + counts.warning;

  return (
    <>
      <PageHead eyebrow="Step 8 of 8" title="Polish and final check" lead="Add the extras that make a party memorable, then run the consistency check. Fix anything flagged and you are ready to host." />

      {blocking === 0 ? (
        <Callout tone="success" title="Ready to play">
          No errors or warnings. {counts.info ? `${plural(counts.info, 'optional suggestion')} below.` : 'Nothing left to fix.'}
        </Callout>
      ) : (
        <Callout tone={counts.error ? 'error' : 'warning'} title={counts.error ? `${plural(counts.error, 'error')} to fix before you host` : `${plural(counts.warning, 'warning')} worth a look`}>
          Click an issue below to jump to exactly where it needs fixing.
        </Callout>
      )}

      <Card id="ent-checker">
        <CardHeader title="Consistency report" subtitle={`${plural(counts.error, 'error')}, ${plural(counts.warning, 'warning')}, ${plural(counts.info, 'suggestion')}`} />
        <IssuesPanel issues={issues} caseId={doc.id} />
      </Card>

      <Card id="ent-extras">
        <CardHeader title="Entertainment extras" subtitle="Props, costumes and challenges for the evening." />
        <div className="stack stack--loose">
          <StringListEditor idPrefix="f-extras-props" label="Props to gather" items={ex.props} addLabel="Add a prop" emptyText="No props listed yet." onChange={(props) => setExtras({ props })} />
          <StringListEditor idPrefix="f-extras-costumes" label="General costume suggestions" items={ex.generalCostumes} addLabel="Add a suggestion" emptyText="Per-character costume ideas live on each character." onChange={(generalCostumes) => setExtras({ generalCostumes })} />

          <div className="stack">
            <span className="picker__label">Mini-games and challenges</span>
            {ex.miniGames.length === 0 && <span className="muted t-body-small">No mini-games yet.</span>}
            {ex.miniGames.map((g, i) => (
              <div key={g.id} className="row" style={{ alignItems: 'flex-start' }}>
                <div className="stack stack--tight" style={{ flex: 1 }}>
                  <TextField id={`f-extras-game-${i}-title`} label="Game title" value={g.title} onChange={(v) => setExtras({ miniGames: ex.miniGames.map((x) => (x.id === g.id ? { ...x, title: v } : x)) }, `game-${g.id}-t`)} />
                  <TextField id={`f-extras-game-${i}-desc`} label="How it works" value={g.description} multiline rows={2} onChange={(v) => setExtras({ miniGames: ex.miniGames.map((x) => (x.id === g.id ? { ...x, description: v } : x)) }, `game-${g.id}-d`)} />
                </div>
                <IconButton label={`Remove mini-game ${i + 1}`} icon={<Trash2 />} danger onClick={() => setExtras({ miniGames: ex.miniGames.filter((x) => x.id !== g.id) })} />
              </div>
            ))}
            <div>
              <Button variant="tonal" size="sm" icon={<Plus />} onClick={() => setExtras({ miniGames: [...ex.miniGames, { id: newId('game'), title: '', description: '' }] })}>
                Add a mini-game
              </Button>
            </div>
          </div>

          <div className="row row--wrap" style={{ alignItems: 'flex-start', gap: 'var(--space-8)' }}>
            <div className="stack stack--tight">
              <span className="picker__label" id="difficulty-label">Difficulty</span>
              <div className="rating" role="radiogroup" aria-labelledby="difficulty-label">
                {DIFFICULTY.map((label, i) => (
                  <button key={label} type="button" role="radio" aria-checked={ex.difficulty === i + 1} aria-label={`${i + 1} of 5: ${label}`} title={label} className="state-layer" onClick={() => setExtras({ difficulty: i + 1 })}>
                    {i + 1}
                  </button>
                ))}
              </div>
              <span className="muted t-body-small">{DIFFICULTY[ex.difficulty - 1]}</span>
            </div>
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <div style={{ width: 180 }}>
                <NumberField id="f-extras-runtime" label="Estimated runtime (min)" min={0} max={1000} value={ex.runtimeMinutes} onCommit={(n) => setExtras({ runtimeMinutes: n }, 'runtime')} />
              </div>
              <Button variant="tonal" icon={<Wand2 />} onClick={() => setExtras({ runtimeMinutes: estimateRuntimeMinutes(doc) + 30 })} disabled={doc.beats.length === 0}>
                Estimate from timeline
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card variant="filled">
        <CardHeader icon={<Sparkles color="var(--md-sys-color-primary)" />} title="Case at a glance" />
        <div className="stat-grid">
          <div className="stat"><div className="stat__num">{doc.characters.length}</div><div className="stat__label">Characters</div></div>
          <div className="stat"><div className="stat__num">{doc.evidence.length}</div><div className="stat__label">Clues</div></div>
          <div className="stat"><div className="stat__num">{doc.redHerrings.length}</div><div className="stat__label">Red herrings</div></div>
          <div className="stat"><div className="stat__num">{doc.beats.length}</div><div className="stat__label">Beats</div></div>
          <div className="stat"><div className="stat__num">{ex.runtimeMinutes}</div><div className="stat__label">Minutes</div></div>
        </div>
        <div className="row row--wrap" style={{ marginTop: 'var(--space-5)' }}>
          <Button variant="filled" icon={<Play />} href={hrefs.gm(doc.id)}>
            Open the Game Master view
          </Button>
          <Button variant="tonal" icon={<Printer />} href={hrefs.export(doc.id)}>
            Print and export
          </Button>
        </div>
      </Card>
    </>
  );
}
