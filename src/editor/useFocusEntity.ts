import { useEffect } from 'react';
import type { FocusTarget } from '../router';

/**
 * Handles click-through navigation from the consistency checker: opens the
 * target card, scrolls it into view, flashes it and focuses the offending field.
 */
export function useFocusEntity(focus: FocusTarget | undefined, open: (entityId: string) => void): void {
  const entityId = focus?.entityId;
  const field = focus?.field;
  const nonce = focus?.nonce;
  useEffect(() => {
    if (!entityId) return;
    open(entityId);
    const t1 = window.setTimeout(() => {
      const el = document.getElementById(`ent-${entityId}`);
      const input = field ? document.getElementById(`f-${entityId}-${field}`) : null;
      (input ?? el)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (el) {
        el.classList.remove('flash');
        void el.offsetWidth; // restart the animation
        el.classList.add('flash');
        window.setTimeout(() => el.classList.remove('flash'), 2000);
      }
      if (input) (input as HTMLElement).focus({ preventScroll: true });
    }, 160);
    return () => window.clearTimeout(t1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId, field, nonce]);
}
