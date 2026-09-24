import { useState, type ReactNode } from 'react';
import type { Issue } from '../../../shared/checker';
import type { Case } from '../../../shared/models';
import { plural } from '../../../shared/ops';
import type { FocusTarget } from '../../router';
import { Badge } from '../../ui';

export interface StepProps {
  doc: Case;
  update: (fn: (c: Case) => Case, key?: string) => void;
  undo: () => void;
  issues: Issue[];
  focus?: FocusTarget;
  onGenerate: () => void;
}

/** Which accordion card is open (one at a time). */
export function useOpenCard(initial: string | null = null) {
  return useState<string | null>(initial);
}

export function issuesFor(issues: Issue[], entityId: string): Issue[] {
  return issues.filter((i) => i.target.entityId === entityId);
}

export function IssueBadge({ issues }: { issues: Issue[] }) {
  if (issues.length === 0) return null;
  const errors = issues.filter((i) => i.severity === 'error').length;
  const warnings = issues.filter((i) => i.severity === 'warning').length;
  if (errors) return <Badge tone="error" label={plural(errors, 'error')}>{errors}</Badge>;
  if (warnings) return <Badge tone="warning" label={plural(warnings, 'warning')}>{warnings}</Badge>;
  return <Badge tone="info" label={plural(issues.length, 'suggestion')}>{issues.length}</Badge>;
}

export function StepIntro({ children }: { children: ReactNode }) {
  return <p className="muted">{children}</p>;
}

export function trimLabel(s: string, fallback: string, max = 48): string {
  const t = s.trim();
  if (!t) return fallback;
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

export function fieldId(entity: string, field: string): string {
  return `f-${entity}-${field}`;
}
