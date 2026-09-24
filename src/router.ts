import { useEffect, useState } from 'react';
import { STEPS, type StepId } from '../shared/models';

export type ExportTab = 'sheets' | 'handouts' | 'gm';

export interface FocusTarget {
  entityId?: string;
  field?: string;
  nonce?: string;
}

export type Route =
  | { name: 'library' }
  | { name: 'design' }
  | { name: 'gallery' }
  | { name: 'build'; caseId: string; step: StepId; focus?: FocusTarget }
  | { name: 'gm'; caseId: string }
  | { name: 'play'; caseId: string }
  | { name: 'export'; caseId: string; tab: ExportTab }
  | { name: 'notfound' };

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, '') || '/';
  const [path = '/', query = ''] = raw.split('?');
  const parts = path.split('/').filter(Boolean);
  const q = new URLSearchParams(query);
  if (parts.length === 0) return { name: 'library' };
  if (parts[0] === 'design') return { name: 'design' };
  if (parts[0] === 'game-gallery') return { name: 'gallery' };
  if (parts[0] === 'case' && parts[1]) {
    const caseId = decodeURIComponent(parts[1]);
    const view = parts[2] ?? 'setting';
    if (view === 'gm') return { name: 'gm', caseId };
    if (view === 'play') return { name: 'play', caseId };
    if (view === 'export') {
      const tab = parts[3];
      return { name: 'export', caseId, tab: tab === 'handouts' || tab === 'gm' ? tab : 'sheets' };
    }
    if ((STEPS as readonly string[]).includes(view)) {
      return {
        name: 'build',
        caseId,
        step: view as StepId,
        focus: { entityId: q.get('focus') ?? undefined, field: q.get('field') ?? undefined, nonce: q.get('n') ?? undefined },
      };
    }
  }
  return { name: 'notfound' };
}

export const hrefs = {
  library: () => '#/',
  design: () => '#/design',
  gallery: () => '#/game-gallery',
  build: (caseId: string, step: StepId, focus?: { entityId?: string; field?: string }) => {
    const q = new URLSearchParams();
    if (focus?.entityId) q.set('focus', focus.entityId);
    if (focus?.field) q.set('field', focus.field);
    if (focus?.entityId) q.set('n', Date.now().toString(36));
    const qs = q.toString();
    return `#/case/${encodeURIComponent(caseId)}/${step}${qs ? `?${qs}` : ''}`;
  },
  gm: (caseId: string) => `#/case/${encodeURIComponent(caseId)}/gm`,
  play: (caseId: string) => `#/case/${encodeURIComponent(caseId)}/play`,
  export: (caseId: string, tab: ExportTab = 'sheets') => `#/case/${encodeURIComponent(caseId)}/export/${tab}`,
};

export function navigate(href: string): void {
  if (window.location.hash === href) {
    // re-notify listeners so an identical "focus" navigation still re-triggers
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = href;
  }
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  useEffect(() => {
    const on = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
