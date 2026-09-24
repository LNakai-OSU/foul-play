import { Check } from 'lucide-react';
import { STEPS, STEP_LABELS, type StepId } from '../../shared/models';
import type { IssueCounts } from '../../shared/checker';
import { hrefs } from '../router';
import { plural } from '../../shared/ops';

export function WizardStepper({
  caseId,
  current,
  done,
  counts,
}: {
  caseId: string;
  current: StepId;
  done: Record<StepId, boolean>;
  counts: Record<StepId, IssueCounts>;
}) {
  return (
    <nav className="stepper no-print" aria-label="Builder steps">
      {STEPS.map((s, i) => {
        const c = counts[s];
        return (
          <div key={s} className={['stepper__item', done[s] && 'is-done', current === s && 'is-current'].filter(Boolean).join(' ')}>
            <a
              className="stepper__btn state-layer"
              href={hrefs.build(caseId, s)}
              aria-current={current === s ? 'step' : undefined}
              aria-label={`Step ${i + 1}: ${STEP_LABELS[s]}${done[s] ? ' (complete)' : ''}${c.error ? `, ${plural(c.error, 'error')}` : c.warning ? `, ${plural(c.warning, 'warning')}` : ''}`}
            >
              <span className="stepper__dot">
                {done[s] && current !== s ? <Check aria-hidden="true" /> : i + 1}
                {c.error > 0 ? <span className="stepper__flag" /> : c.warning > 0 ? <span className="stepper__flag stepper__flag--warning" /> : null}
              </span>
              <span className="stepper__label">{STEP_LABELS[s]}</span>
            </a>
          </div>
        );
      })}
    </nav>
  );
}
