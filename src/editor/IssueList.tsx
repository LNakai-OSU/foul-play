import { AlertCircle, AlertTriangle, ArrowRight, CheckCircle2, Info } from 'lucide-react';
import type { Issue, Severity } from '../../shared/checker';
import { hrefs, navigate } from '../router';
import { STEP_LABELS } from '../../shared/models';
import { plural } from '../../shared/ops';
import { Callout } from '../ui';

const ICON: Record<Severity, typeof Info> = { error: AlertCircle, warning: AlertTriangle, info: Info };

export function IssueRow({ issue, caseId, onGo, showStep = true }: { issue: Issue; caseId: string; onGo?: () => void; showStep?: boolean }) {
  const Icon = ICON[issue.severity];
  return (
    <button
      type="button"
      className={`issue issue--${issue.severity} state-layer`}
      onClick={() => {
        onGo?.();
        navigate(hrefs.build(caseId, issue.target.step, { entityId: issue.target.entityId, field: issue.target.field }));
      }}
      aria-label={`${issue.severity}: ${issue.message} Go to fix.`}
    >
      <Icon aria-hidden="true" />
      <span style={{ minWidth: 0 }}>
        <span className="issue__msg" style={{ display: 'block' }}>
          {issue.message}
        </span>
        <span className="issue__hint" style={{ display: 'block' }}>
          {issue.hint}
          {showStep ? ` · ${STEP_LABELS[issue.target.step]}` : ''}
        </span>
      </span>
      <span className="issue__go">
        Fix <ArrowRight aria-hidden="true" />
      </span>
    </button>
  );
}

/** Compact "what needs attention on this step" panel shown at the top of every wizard step. */
export function StepHints({ issues, step, caseId }: { issues: Issue[]; step: Issue['target']['step']; caseId: string }) {
  const mine = issues.filter((i) => i.target.step === step);
  const errors = mine.filter((i) => i.severity === 'error').length;
  if (mine.length === 0) {
    return (
      <Callout tone="success" title="This step looks good">
        The consistency checker has nothing to flag here.
      </Callout>
    );
  }
  const tone = errors ? 'error' : mine.some((i) => i.severity === 'warning') ? 'warning' : 'info';
  return (
    <Callout tone={tone} title={`${plural(mine.length, 'thing')} to look at on this step`}>
      <div className="hint-list" style={{ marginTop: 4 }}>
        {mine.slice(0, 5).map((i) => (
          <IssueRow key={i.id} issue={i} caseId={caseId} showStep={false} />
        ))}
        {mine.length > 5 && <span className="muted t-body-small" style={{ padding: '4px 12px' }}>…and {mine.length - 5} more in the issues panel.</span>}
      </div>
    </Callout>
  );
}

export function AllClear() {
  return (
    <div className="row" style={{ padding: 'var(--space-4)' }}>
      <CheckCircle2 color="var(--md-sys-color-success)" />
      <span>No issues. This case is consistent and ready to play.</span>
    </div>
  );
}
