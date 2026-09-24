/**
 * Design-system components. Thin React wrappers over the CSS classes in
 * styles/components.css so every screen shares the same tokens and states.
 */
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Plus, Trash2, X, AlertCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

// ------------------------------------------------------------------ buttons

type Variant = 'filled' | 'tonal' | 'outlined' | 'text' | 'danger' | 'danger-text' | 'elevated';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  block?: boolean;
  href?: string;
}

export function Button({ variant = 'text', size = 'md', icon, block, href, children, type, ...rest }: ButtonProps) {
  const cls = cx(
    'btn state-layer',
    variant === 'danger-text' ? 'btn--text btn--danger-text' : `btn--${variant}`,
    size === 'sm' && 'btn--sm',
    size === 'lg' && 'btn--lg',
    !!icon && 'btn--icon-lead',
    block && 'btn--block',
  );
  const inner = (
    <>
      {icon}
      {children && <span className="btn__text">{children}</span>}
    </>
  );
  if (href) {
    return (
      <a className={cls} href={href} aria-disabled={rest.disabled || undefined}>
        {inner}
      </a>
    );
  }
  return (
    <button type={type ?? 'button'} className={cls} {...rest}>
      {inner}
    </button>
  );
}

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> {
  label: string;
  icon: ReactNode;
  size?: 'sm' | 'md';
  tonal?: boolean;
  danger?: boolean;
  toggled?: boolean;
}

export function IconButton({ label, icon, size = 'md', tonal, danger, toggled, type, ...rest }: IconButtonProps) {
  return (
    <button
      type={type ?? 'button'}
      className={cx('icon-btn state-layer', size === 'sm' && 'icon-btn--sm', tonal && 'icon-btn--tonal', danger && 'icon-btn--danger', toggled && 'is-toggled')}
      aria-label={label}
      title={label}
      {...rest}
    >
      {icon}
    </button>
  );
}

// -------------------------------------------------------------------- cards

export function Card({
  variant = 'elevated',
  children,
  className,
  ...rest
}: {
  variant?: 'elevated' | 'filled' | 'outlined';
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section className={cx('card', `card--${variant}`, className)} {...rest}>
      {children}
    </section>
  );
}

export function CardHeader({ title, subtitle, actions, icon }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="card__header">
      {icon}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h2 className="card__title">{title}</h2>
        {subtitle && <p className="card__subtitle">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

// -------------------------------------------------------------------- chips

export function Chip({
  tone,
  icon,
  small,
  selected,
  ghost,
  onClick,
  onRemove,
  removeLabel,
  children,
  title,
}: {
  tone?: 'primary' | 'tertiary' | 'error' | 'warning' | 'info' | 'success';
  icon?: ReactNode;
  small?: boolean;
  selected?: boolean;
  ghost?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  removeLabel?: string;
  children: ReactNode;
  title?: string;
}) {
  const cls = cx('chip', small && 'chip--sm', tone && `chip--${tone}`, selected && 'is-selected', ghost && 'chip--ghost', onClick && 'state-layer');
  const body = (
    <>
      {icon}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{children}</span>
      {onRemove && (
        <button type="button" className="chip__x state-layer" aria-label={removeLabel ?? 'Remove'} onClick={(e) => { e.stopPropagation(); onRemove(); }}>
          <X />
        </button>
      )}
    </>
  );
  return onClick ? (
    <button type="button" className={cls} onClick={onClick} aria-pressed={selected} title={title}>
      {body}
    </button>
  ) : (
    <span className={cls} title={title}>
      {body}
    </span>
  );
}

export function Badge({ tone = 'error', children, label }: { tone?: 'error' | 'warning' | 'info' | 'success' | 'neutral'; children: ReactNode; label?: string }) {
  return (
    <span className={cx('badge', tone !== 'error' && `badge--${tone}`)} aria-label={label}>
      {children}
    </span>
  );
}

// ------------------------------------------------------------------- fields

interface FieldBase {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  helper?: string;
  error?: string;
  disabled?: boolean;
}

export function TextField({
  id,
  label,
  value,
  onChange,
  helper,
  error,
  multiline,
  rows,
  type = 'text',
  min,
  max,
  maxLength,
  disabled,
  onBlur,
}: FieldBase & { multiline?: boolean; rows?: number; type?: 'text' | 'number'; min?: number; max?: number; maxLength?: number; onBlur?: () => void }) {
  const describedBy = helper || error ? `${id}-support` : undefined;
  const common = {
    id,
    className: 'field__control',
    value,
    placeholder: ' ',
    disabled,
    maxLength,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
    onBlur,
  } as const;
  return (
    <div className={cx('field', error && 'has-error')}>
      {multiline ? (
        <textarea {...common} rows={rows ?? 4} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input {...common} type={type} min={min} max={max} inputMode={type === 'number' ? 'numeric' : undefined} onChange={(e) => onChange(e.target.value)} />
      )}
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      {(helper || error) && (
        <div className="field__support" id={describedBy}>
          {error ?? helper}
        </div>
      )}
    </div>
  );
}

export function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  helper,
  error,
  disabled,
}: FieldBase & { options: { value: string; label: string; disabled?: boolean }[] }) {
  return (
    <div className={cx('field', error && 'has-error')}>
      <select id={id} className="field__control" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} aria-invalid={error ? true : undefined}>
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      {(helper || error) && <div className="field__support">{error ?? helper}</div>}
    </div>
  );
}

export function Switch({ id, label, checked, onChange, danger }: { id: string; label: ReactNode; checked: boolean; onChange: (v: boolean) => void; danger?: boolean }) {
  return (
    <label className={cx('switch', danger && 'switch--danger')} htmlFor={id}>
      <input id={id} type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch__track" aria-hidden="true">
        <span className="switch__thumb" />
      </span>
      <span className="switch__label">{label}</span>
    </label>
  );
}

export function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
  small,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: ReactNode }[];
  small?: boolean;
}) {
  return (
    <div className={cx('segmented', small && 'segmented--sm')} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className="segmented__btn state-layer" onClick={() => onChange(o.value)}>
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Tabs<T extends string>({ label, value, onChange, tabs }: { label: string; value: T; onChange: (v: T) => void; tabs: { value: T; label: string; icon?: ReactNode }[] }) {
  return (
    <div className="tabs no-print" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button key={t.value} role="tab" type="button" aria-selected={value === t.value} className="tab state-layer" onClick={() => onChange(t.value)}>
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ------------------------------------------------------- pickers and lists

export function MultiPicker({
  id,
  label,
  options,
  value,
  onChange,
  addLabel = 'Add',
  emptyText = 'None yet',
  missingLabel = 'Missing item',
}: {
  id: string;
  label: string;
  options: { id: string; label: string }[];
  value: string[];
  onChange: (ids: string[]) => void;
  addLabel?: string;
  emptyText?: string;
  missingLabel?: string;
}) {
  const byId = new Map(options.map((o) => [o.id, o.label]));
  const available = options.filter((o) => !value.includes(o.id));
  return (
    <div className="picker">
      <span className="picker__label" id={`${id}-label`}>
        {label}
      </span>
      <div className="picker__row" role="group" aria-labelledby={`${id}-label`}>
        {value.length === 0 && <span className="muted t-body-small">{emptyText}</span>}
        {value.map((v) => {
          const name = byId.get(v);
          return (
            <Chip key={v} small={false} tone={name ? undefined : 'error'} icon={name ? undefined : <AlertCircle />} onRemove={() => onChange(value.filter((x) => x !== v))} removeLabel={`Remove ${name ?? missingLabel}`}>
              {name ?? missingLabel}
            </Chip>
          );
        })}
        {available.length > 0 && (
          <span className="picker__add">
            <select
              id={id}
              aria-label={`${addLabel} — ${label}`}
              value=""
              onChange={(e) => {
                if (e.target.value) onChange([...value, e.target.value]);
              }}
            >
              <option value="">+ {addLabel}</option>
              {available.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown />
          </span>
        )}
      </div>
    </div>
  );
}

export function StringListEditor({
  idPrefix,
  label,
  items,
  onChange,
  addLabel = 'Add',
  multiline,
  emptyText,
}: {
  idPrefix: string;
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  addLabel?: string;
  multiline?: boolean;
  emptyText?: string;
}) {
  return (
    <div className="list-editor" id={idPrefix}>
      <span className="picker__label">{label}</span>
      {items.length === 0 && emptyText && <span className="muted t-body-small">{emptyText}</span>}
      {items.map((item, i) => (
        <div className="list-editor__row" key={i}>
          <TextField id={`${idPrefix}-${i}`} label={`${label} ${i + 1}`} value={item} multiline={multiline} rows={2} onChange={(v) => onChange(items.map((x, j) => (j === i ? v : x)))} />
          <IconButton label={`Remove ${label.toLowerCase()} ${i + 1}`} icon={<Trash2 />} danger onClick={() => onChange(items.filter((_, j) => j !== i))} />
        </div>
      ))}
      <div>
        <Button variant="tonal" size="sm" icon={<Plus />} onClick={() => onChange([...items, ''])}>
          {addLabel}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- overlays

export function Dialog({
  open,
  onClose,
  title,
  children,
  actions,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  const titleId = `dlg-${title.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <dialog
      ref={ref}
      className={cx('dialog', wide && 'dialog--wide')}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onMouseDown={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {open && (
        <>
          <div className="dialog__head">
            <h2 className="dialog__title" id={titleId}>
              {title}
            </h2>
          </div>
          <div className="dialog__body">{children}</div>
          {actions && <div className="dialog__actions">{actions}</div>}
        </>
      )}
    </dialog>
  );
}

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export function Menu({ label, trigger, items }: { label: string; trigger: ReactNode; items: MenuItem[] }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const open = pos !== null;

  const toggle = () => {
    if (open) return setPos(null);
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const width = 224;
    const height = items.length * 48 + 16;
    const left = Math.max(8, Math.min(window.innerWidth - width - 8, r.right - width));
    const below = r.bottom + 4;
    const top = below + height > window.innerHeight - 8 ? Math.max(8, r.top - height - 4) : below;
    setPos({ top, left });
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !btnRef.current?.contains(t)) setPos(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPos(null);
        btnRef.current?.focus();
      }
    };
    const close = () => setPos(null);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    menuRef.current?.querySelector<HTMLElement>('button:not([disabled])')?.focus();
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [open]);

  return (
    <div className="menu-anchor">
      <button ref={btnRef} type="button" className="icon-btn state-layer" aria-label={label} title={label} aria-haspopup="menu" aria-expanded={open} onClick={toggle}>
        {trigger}
      </button>
      {pos &&
        createPortal(
          // Rendered in <body> with fixed positioning so no card, overflow or stacking context can cover or clip it.
          <div ref={menuRef} className="menu" role="menu" aria-label={label} style={{ top: pos.top, left: pos.left }}>
            {items.map((it) => (
              <button
                key={it.label}
                type="button"
                role="menuitem"
                disabled={it.disabled}
                className={cx('menu__item state-layer', it.danger && 'menu__item--danger')}
                onClick={() => {
                  setPos(null);
                  it.onClick();
                }}
              >
                {it.icon}
                {it.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}

// ---------------------------------------------------------------- misc

export function EmptyState({ icon, title, children, action }: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty__icon" aria-hidden="true">
        {icon}
      </div>
      <h3 className="empty__title">{title}</h3>
      {children && <p className="empty__text">{children}</p>}
      {action}
    </div>
  );
}

export function Callout({ tone = 'info', title, children, actions }: { tone?: 'info' | 'warning' | 'error' | 'success'; title?: string; children?: ReactNode; actions?: ReactNode }) {
  const Icon = tone === 'error' ? AlertCircle : tone === 'warning' ? AlertTriangle : tone === 'success' ? CheckCircle2 : Info;
  return (
    <div className={cx('callout', `callout--${tone}`)} role={tone === 'error' ? 'alert' : undefined}>
      <Icon aria-hidden="true" />
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && <div className="callout__title">{title}</div>}
        {children}
      </div>
      {actions}
    </div>
  );
}

export function PageHead({ eyebrow, title, lead, actions }: { eyebrow?: string; title: string; lead?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="page-head no-print">
      <div className="row row--between row--wrap" style={{ alignItems: 'flex-start' }}>
        <div className="stack stack--tight" style={{ flex: 1, minWidth: 0 }}>
          {eyebrow && <span className="page-head__eyebrow">{eyebrow}</span>}
          <h1 className="page-head__title">{title}</h1>
        </div>
        {actions}
      </div>
      {lead && <p className="page-head__lead">{lead}</p>}
    </header>
  );
}

export function Progress({ value, tall, label }: { value: number; tall?: boolean; label: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div className={cx('progress', tall && 'progress--tall')} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <div className="progress__bar" style={{ width: `${pct}%` }} />
    </div>
  );
}

const AVATARS = [
  ['var(--md-sys-color-primary-container)', 'var(--md-sys-color-on-primary-container)'],
  ['var(--md-sys-color-tertiary-container)', 'var(--md-sys-color-on-tertiary-container)'],
  ['var(--md-sys-color-info-container)', 'var(--md-sys-color-info)'],
  ['var(--md-sys-color-success-container)', 'var(--md-sys-color-success)'],
  ['var(--md-sys-color-secondary-container)', 'var(--md-sys-color-on-secondary-container)'],
  ['var(--md-sys-color-warning-container)', 'var(--md-sys-color-warning)'],
];

export function Avatar({ name, index, square }: { name: string; index: number; square?: boolean }) {
  const letters =
    name
      .replace(/"[^"]*"/g, '')
      .split(/\s+/)
      .filter((p) => p && !/^(Dr\.|Professor|Colonel|Captain|Judge|Conductor|Maestro)$/.test(p))
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?';
  const [bg, fg] = AVATARS[index % AVATARS.length] as [string, string];
  return (
    <span className={cx('avatar', square && 'avatar--square')} style={{ ['--avatar-bg' as string]: bg, ['--avatar-fg' as string]: fg }} aria-hidden="true">
      {letters}
    </span>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="loading" role="status" aria-live="polite">
      <div className="stack" style={{ alignItems: 'center' }}>
        <div className="spinner" />
        <span className="t-label-medium">{label}</span>
      </div>
    </div>
  );
}

/** Integer field with local text state: lets you clear and retype without the value snapping back. */
export function NumberField({
  id,
  label,
  value,
  min,
  max,
  onCommit,
  helper,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onCommit: (n: number) => void;
  helper?: string;
}) {
  const [text, setText] = useState(String(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(String(value));
  }, [value]);
  const n = Number(text);
  const valid = text.trim() !== '' && Number.isInteger(n) && n >= min && n <= max;
  return (
    <div onFocus={() => (focused.current = true)}>
      <TextField
        id={id}
        label={label}
        type="number"
        min={min}
        max={max}
        value={text}
        helper={helper}
        error={!valid ? `Enter a whole number from ${min} to ${max}` : undefined}
        onChange={(v) => {
          setText(v);
          const num = Number(v);
          if (v.trim() !== '' && Number.isInteger(num) && num >= min && num <= max) onCommit(num);
        }}
        onBlur={() => {
          focused.current = false;
          setText(String(value));
        }}
      />
    </div>
  );
}
