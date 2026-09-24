import { useEffect, useState } from 'react';
import { Dices, Laugh, Moon, Scale, Sparkles } from 'lucide-react';
import { listSettings, type GenerateOptions } from '../../shared/generator/generate';
import { randomSeed } from '../../shared/generator/rng';
import type { Tone } from '../../shared/models';
import { Button, Callout, IconButton, NumberField, Segmented, SelectField, TextField, Dialog } from '../ui';

export interface GenerateChoice {
  tone: Tone;
  playerMin: number;
  playerMax: number;
  settingId: string;
  seed: number;
}

const KEY = 'foulplay:generate';

export function loadGenerateDefaults(fallback: Partial<GenerateChoice> = {}): GenerateChoice {
  const base: GenerateChoice = { tone: 'noir', playerMin: 6, playerMax: 8, settingId: 'random', seed: randomSeed(), ...fallback };
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<GenerateChoice> | null;
    if (raw) return { ...base, tone: raw.tone ?? base.tone, playerMin: raw.playerMin ?? base.playerMin, playerMax: raw.playerMax ?? base.playerMax, settingId: raw.settingId ?? base.settingId };
  } catch {
    /* storage unavailable: fall through */
  }
  return base;
}

export function rememberGenerate(c: GenerateChoice): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ tone: c.tone, playerMin: c.playerMin, playerMax: c.playerMax, settingId: c.settingId }));
  } catch {
    /* ignore */
  }
}

export function toOptions(c: GenerateChoice): GenerateOptions {
  return { tone: c.tone, playerMin: c.playerMin, playerMax: c.playerMax, settingId: c.settingId === 'random' ? undefined : c.settingId, seed: c.seed };
}

export function GenerateDialog({
  open,
  onClose,
  onGenerate,
  initial,
  replacing,
  title = 'Generate a starter scenario',
  confirmLabel = 'Generate',
}: {
  open: boolean;
  onClose: () => void;
  onGenerate: (c: GenerateChoice) => void;
  initial: Partial<GenerateChoice>;
  replacing?: boolean;
  title?: string;
  confirmLabel?: string;
}) {
  const [choice, setChoice] = useState<GenerateChoice>(() => loadGenerateDefaults(initial));
  useEffect(() => {
    if (open) setChoice(loadGenerateDefaults({ ...initial, seed: randomSeed() }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const set = (p: Partial<GenerateChoice>) => setChoice((c) => ({ ...c, ...p }));
  const rangeOk = choice.playerMin <= choice.playerMax;
  const settings = listSettings();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      wide
      title={title}
      actions={
        <>
          <Button variant="text" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="filled" icon={<Sparkles />} disabled={!rangeOk} type="submit" form="generate-form">
            {confirmLabel}
          </Button>
        </>
      }
    >
      <form
        id="generate-form"
        className="stack"
        style={{ color: 'var(--md-sys-color-on-surface)' }}
        onSubmit={(e) => {
          e.preventDefault();
          if (!rangeOk) return;
          rememberGenerate(choice);
          onGenerate(choice);
        }}
      >
        <p className="muted">The generator drafts a complete, internally consistent case: cast, motives, clues, red herrings and a timed run-sheet. Everything stays editable.</p>
        {replacing && (
          <Callout tone="warning" title="This replaces your current scenario">
            You can undo straight afterwards.
          </Callout>
        )}
        <div className="stack stack--tight">
          <span className="picker__label">Tone</span>
          <Segmented
            label="Tone"
            value={choice.tone}
            onChange={(tone) => set({ tone })}
            options={[
              { value: 'comedic', label: 'Comedic', icon: <Laugh /> },
              { value: 'serious', label: 'Serious', icon: <Scale /> },
              { value: 'noir', label: 'Noir', icon: <Moon /> },
            ]}
          />
        </div>
        <SelectField id="gen-setting" label="Setting" value={choice.settingId} onChange={(settingId) => set({ settingId })} options={[{ value: 'random', label: 'Surprise me' }, ...settings.map((s) => ({ value: s.id, label: `${s.label}: ${s.era}` }))]} />
        <div className="grid-2">
          <NumberField id="gen-min" label="Fewest players" min={3} max={14} value={choice.playerMin} onCommit={(n) => set({ playerMin: n })} />
          <NumberField id="gen-max" label="Most players" min={3} max={14} value={choice.playerMax} onCommit={(n) => set({ playerMax: n })} helper={rangeOk ? undefined : 'Must be at least the minimum'} />
        </div>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <TextField id="gen-seed" label="Seed" value={String(choice.seed)} onChange={(v) => set({ seed: Number.parseInt(v.replace(/\D/g, '') || '0', 10) })} helper="Same seed and options give the same mystery." />
          </div>
          <IconButton label="Roll a new seed" icon={<Dices />} tonal onClick={() => set({ seed: randomSeed() })} />
        </div>
      </form>
    </Dialog>
  );
}
