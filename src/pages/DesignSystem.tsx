import { useState } from 'react';
import { ArrowLeft, Plus, Trash2, Search } from 'lucide-react';
import { hrefs } from '../router';
import { Badge, Button, Callout, Card, CardHeader, Chip, Dialog, EmptyState, IconButton, Progress, Segmented, SelectField, Switch, Tabs, TextField } from '../ui';
import { useFeedback } from '../ui/feedback';

const ROLES = [
  ['primary', 'on-primary'], ['primary-container', 'on-primary-container'], ['secondary', 'on-secondary'], ['secondary-container', 'on-secondary-container'],
  ['tertiary', 'on-tertiary'], ['tertiary-container', 'on-tertiary-container'], ['error', 'on-error'], ['error-container', 'on-error-container'],
  ['success', 'on-success'], ['warning', 'on-warning'], ['info', 'on-info'], ['surface-container-lowest', 'on-surface'], ['surface-container-low', 'on-surface'],
  ['surface-container', 'on-surface'], ['surface-container-high', 'on-surface'], ['surface-container-highest', 'on-surface'], ['surface', 'on-surface'], ['outline', 'surface'],
  ['outline-variant', 'on-surface'], ['inverse-surface', 'inverse-on-surface'],
];
const TYPE = ['display-large', 'display-medium', 'display-small', 'headline-large', 'headline-medium', 'headline-small', 'title-large', 'title-medium', 'title-small', 'body-large', 'body-medium', 'body-small', 'label-large', 'label-medium', 'label-small'];
const SHAPES = ['none', 'extra-small', 'small', 'medium', 'large', 'extra-large', 'full'];

export function DesignSystem() {
  const [tab, setTab] = useState<'a' | 'b'>('a');
  const [seg, setSeg] = useState<'x' | 'y'>('x');
  const [sw, setSw] = useState(true);
  const [dlg, setDlg] = useState(false);
  const [text, setText] = useState('Hello, detective');
  const { toast } = useFeedback();
  return (
    <div className="library">
      <header className="library__top">
        <Button variant="text" icon={<ArrowLeft />} href={hrefs.library()}>Case library</Button>
        <span className="spacer" />
        <Button variant="tonal" href={hrefs.gallery()}>Game gallery</Button>
        <span className="stamp">Design system</span>
      </header>
      <div className="library__inner">
        <div className="page-head">
          <span className="page-head__eyebrow">Foul Play</span>
          <h1 className="page-head__title">Noir design system</h1>
          <p className="page-head__lead">A Material 3-structured token layer (color roles, type scale, shape, elevation, state layers, motion, spacing) rendered in a dark brass-and-blood palette. Every screen is built from these tokens and components. Tokens live in <code>src/styles/tokens.css</code>.</p>
        </div>

        <Card>
          <CardHeader title="Color roles" subtitle="Primary is brass, secondary is smoke, tertiary is blood. Surfaces use five container tiers." />
          <div className="swatch-grid">
            {ROLES.map(([bg, fg]) => (
              <div className="swatch" key={bg}>
                <div className="swatch__chip" style={{ background: `var(--md-sys-color-${bg})`, color: `var(--md-sys-color-${fg})`, display: 'grid', placeItems: 'center', font: 'var(--md-sys-typescale-label-large)' }}>Aa</div>
                <div className="swatch__meta">{bg}<code>--md-sys-color-{bg}</code></div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Type scale" subtitle="Playfair Display for display, headline and large titles; Inter for everything else; Special Elite for case-file stamps." />
          {TYPE.map((t) => (
            <div className="type-row" key={t}>
              <code>{t}</code>
              <span className={`t-${t}`}>Nobody leaves the manor</span>
            </div>
          ))}
          <div className="type-row"><code>stamp</code><span className="t-stamp">Case file no. 0042</span></div>
        </Card>

        <div className="grid-2">
          <Card>
            <CardHeader title="Shape scale" />
            <div className="row row--wrap">
              {SHAPES.map((s) => (
                <div key={s} className="stack stack--tight" style={{ alignItems: 'center' }}>
                  <div className="shape-demo" style={{ borderRadius: `var(--md-sys-shape-${s})` }}>{s}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <CardHeader title="Elevation" subtitle="Shadow plus a brass tonal tint." />
            <div className="row row--wrap">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="elev-demo" style={{ boxShadow: `var(--md-sys-elevation-${n})`, ['--tint' as string]: n === 0 ? '0%' : `var(--md-sys-elevation-tint-${n})` }}>Level {n}</div>
              ))}
            </div>
          </Card>
        </div>

        <Card>
          <CardHeader title="Buttons" subtitle="Five emphasis levels, plus icon buttons. Hover, focus and pressed use state layers." />
          <div className="row row--wrap">
            <Button variant="filled">Filled</Button>
            <Button variant="tonal">Tonal</Button>
            <Button variant="outlined">Outlined</Button>
            <Button variant="text">Text</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="filled" icon={<Plus />}>With icon</Button>
            <Button variant="filled" disabled>Disabled</Button>
            <IconButton label="Delete" icon={<Trash2 />} />
            <IconButton label="Search" icon={<Search />} tonal />
          </div>
        </Card>

        <Card>
          <CardHeader title="Inputs and selection" />
          <div className="stack">
            <div className="grid-2">
              <TextField id="ds-text" label="Text field" value={text} onChange={setText} helper="Helper text" />
              <TextField id="ds-err" label="With error" value="" onChange={() => undefined} error="This field is required" />
              <SelectField id="ds-sel" label="Select" value="a" onChange={() => undefined} options={[{ value: 'a', label: 'Option A' }, { value: 'b', label: 'Option B' }]} />
              <TextField id="ds-multi" label="Multi-line" multiline rows={3} value="" onChange={() => undefined} />
            </div>
            <div className="row row--wrap">
              <Switch id="ds-switch" label="Switch" checked={sw} onChange={setSw} />
              <Segmented label="Segmented" value={seg} onChange={setSeg} options={[{ value: 'x', label: 'One' }, { value: 'y', label: 'Two' }]} />
            </div>
            <div className="chip-row">
              <Chip>Assist</Chip><Chip selected onClick={() => undefined}>Filter selected</Chip><Chip tone="primary">Primary</Chip><Chip tone="tertiary">Tertiary</Chip>
              <Chip tone="error">Error</Chip><Chip tone="warning">Warning</Chip><Chip tone="success">Success</Chip><Chip onRemove={() => undefined}>Input chip</Chip>
              <Badge>3</Badge><Badge tone="warning">2</Badge><Badge tone="info">1</Badge>
            </div>
            <Progress value={0.6} label="Progress" tall />
          </div>
        </Card>

        <Card>
          <CardHeader title="Tabs, callouts and empty states" />
          <div className="stack">
            <Tabs label="Demo" value={tab} onChange={setTab} tabs={[{ value: 'a', label: 'First' }, { value: 'b', label: 'Second' }]} />
            <Callout tone="info" title="Info">Something worth knowing.</Callout>
            <Callout tone="warning" title="Warning">Something worth fixing.</Callout>
            <Callout tone="error" title="Error">Something is broken.</Callout>
            <Callout tone="success" title="Success">All clear.</Callout>
            <EmptyState icon={<Search />} title="Empty state">Explains what will appear here and how to get started.</EmptyState>
          </div>
        </Card>

        <Card>
          <CardHeader title="Dialog and snackbar" />
          <div className="row">
            <Button variant="tonal" onClick={() => setDlg(true)}>Open dialog</Button>
            <Button variant="outlined" onClick={() => toast({ message: 'Deleted a clue', actionLabel: 'Undo', onAction: () => undefined })}>Show snackbar</Button>
          </div>
          <Dialog open={dlg} onClose={() => setDlg(false)} title="Dialog" actions={<><Button onClick={() => setDlg(false)}>Cancel</Button><Button variant="filled" onClick={() => setDlg(false)}>Confirm</Button></>}>
            Dialogs are native modal elements: focus is trapped, Escape closes them, and the backdrop is scrimmed.
          </Dialog>
        </Card>
      </div>
    </div>
  );
}
