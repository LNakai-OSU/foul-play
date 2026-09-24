import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

/** Accordion card used for every editable entity (character, clue, beat, …). */
export function EntityCard({
  id,
  open,
  onToggle,
  lead,
  title,
  subtitle,
  meta,
  actions,
  handle,
  hasError,
  dragging,
  children,
}: {
  id: string;
  open: boolean;
  onToggle: () => void;
  lead?: ReactNode;
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  handle?: ReactNode;
  hasError?: boolean;
  dragging?: boolean;
  children: ReactNode;
}) {
  return (
    <article id={`ent-${id}`} className={['entity', open && 'is-open', hasError && 'has-error', dragging && 'is-dragging'].filter(Boolean).join(' ')}>
      <div className="entity__head">
        {handle}
        <button type="button" className="entity__toggle state-layer" aria-expanded={open} aria-controls={`body-${id}`} onClick={onToggle}>
          {lead}
          <span style={{ minWidth: 0, flex: 1 }}>
            <span className="entity__title" style={{ display: 'block' }}>
              {title}
            </span>
            {subtitle && (
              <span className="entity__sub" style={{ display: 'block' }}>
                {subtitle}
              </span>
            )}
          </span>
          <span className="entity__meta">{meta}</span>
          <ChevronDown className="entity__chev" aria-hidden="true" width={20} height={20} />
        </button>
        {actions}
      </div>
      {open && (
        <div className="entity__body" id={`body-${id}`}>
          {children}
        </div>
      )}
    </article>
  );
}
