import { Drama, Laugh, Moon, Scale, Sparkles } from 'lucide-react';
import type { Tone } from '../../../shared/models';
import { Button, Card, CardHeader, NumberField, PageHead, TextField } from '../../ui';
import { StepHints } from '../IssueList';
import { useFocusEntity } from '../useFocusEntity';
import type { StepProps } from './common';

const TONES: { value: Tone; label: string; icon: typeof Laugh; desc: string }[] = [
  { value: 'comedic', label: 'Comedic', icon: Laugh, desc: 'Puns, pratfalls and preposterous names. The murder is the least serious thing here.' },
  { value: 'serious', label: 'Serious', icon: Scale, desc: 'A classic whodunnit. Grave, tense, and played with a straight face.' },
  { value: 'noir', label: 'Noir', icon: Moon, desc: 'Rain, smoke, bad money and worse company. Hard-boiled and moody.' },
];

export function SettingStep({ doc, update, issues, focus, onGenerate }: StepProps) {
  useFocusEntity(focus, () => undefined);
  const s = doc.setting;
  const setSetting = (patch: Partial<typeof s>, key: string) => update((c) => ({ ...c, setting: { ...c.setting, ...patch } }), key);
  return (
    <>
      <PageHead eyebrow="Step 1 of 8" title="Set the scene" lead="Where does the murder happen, when, and how seriously should your guests take it? Everything else grows out of these choices." />
      <StepHints issues={issues} step="setting" caseId={doc.id} />

      <Card id="ent-case">
        <CardHeader title="The case file" subtitle="What will be written on the folder." />
        <TextField id="f-setting-title" label="Case title" value={doc.title} onChange={(v) => update((c) => ({ ...c, title: v }), 'title')} maxLength={200} />
      </Card>

      <Card id="ent-setting">
        <CardHeader title="The venue" subtitle="Give players a place they can picture." />
        <div className="stack">
          <div className="grid-2">
            <TextField id="f-setting-name" label="Venue name" value={s.name} onChange={(v) => setSetting({ name: v }, 'set-name')} />
            <TextField id="f-setting-era" label="Era or occasion" value={s.era} onChange={(v) => setSetting({ era: v }, 'set-era')} helper="e.g. 1920s country house weekend" />
          </div>
          <TextField id="f-setting-description" label="Description read aloud at the start" value={s.description} multiline rows={4} onChange={(v) => setSetting({ description: v }, 'set-desc')} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Tone" subtitle="Sets the flavour of generated names, clues and narration." />
        <div className="tiles" role="radiogroup" aria-label="Tone">
          {TONES.map((t) => (
            <button key={t.value} type="button" role="radio" aria-checked={doc.tone === t.value} className="tile state-layer" onClick={() => update((c) => ({ ...c, tone: t.value }))}>
              <t.icon aria-hidden="true" />
              <span className="tile__title">{t.label}</span>
              <span className="tile__desc">{t.desc}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Party size" subtitle={`You currently have ${doc.characters.length} character${doc.characters.length === 1 ? '' : 's'}. Ideally that matches your guest count.`} />
        <div className="row row--wrap" style={{ alignItems: 'flex-start', gap: 'var(--space-6)' }}>
          <div style={{ width: 160 }}>
            <NumberField id="f-setting-playerMin" label="Fewest players" min={2} max={40} value={doc.playerMin} onCommit={(n) => update((c) => ({ ...c, playerMin: n }), 'pmin')} />
          </div>
          <div style={{ width: 160 }}>
            <NumberField id="f-setting-playerMax" label="Most players" min={2} max={40} value={doc.playerMax} onCommit={(n) => update((c) => ({ ...c, playerMax: n }), 'pmax')} />
          </div>
        </div>
      </Card>

      <Card variant="filled">
        <div className="row row--wrap row--between">
          <div className="row" style={{ gap: 'var(--space-4)' }}>
            <Drama size={32} color="var(--md-sys-color-primary)" aria-hidden="true" />
            <div>
              <div className="t-title-medium">Short on inspiration?</div>
              <div className="muted t-body-medium">Generate a complete starter scenario from your tone, party size and setting, then tweak it.</div>
            </div>
          </div>
          <Button variant="filled" icon={<Sparkles />} onClick={onGenerate}>
            Generate a scenario
          </Button>
        </div>
      </Card>
    </>
  );
}
