import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { countIssues, type Issue, type Severity } from '../../shared/checker';
import { Chip } from '../ui';
import { IssueRow } from './IssueList';

type Filter = 'all' | Severity;

export function IssuesPanel({ issues, caseId, onGo }: { issues: Issue[]; caseId: string; onGo?: () => void }) {
  const [filter, setFilter] = useState<Filter>('all');
  const counts = countIssues(issues);
  const shown = filter === 'all' ? issues : issues.filter((i) => i.severity === filter);
  return (
    <div className="stack">
      <div className="chip-row" role="group" aria-label="Filter issues">
        <Chip selected={filter === 'all'} onClick={() => setFilter('all')}>
          All {issues.length}
        </Chip>
        <Chip selected={filter === 'error'} tone={counts.error ? 'error' : undefined} onClick={() => setFilter('error')}>
          Errors {counts.error}
        </Chip>
        <Chip selected={filter === 'warning'} tone={counts.warning ? 'warning' : undefined} onClick={() => setFilter('warning')}>
          Warnings {counts.warning}
        </Chip>
        <Chip selected={filter === 'info'} tone={counts.info ? 'info' : undefined} onClick={() => setFilter('info')}>
          Suggestions {counts.info}
        </Chip>
      </div>
      {shown.length === 0 ? (
        <div className="row" style={{ padding: 'var(--space-4)' }}>
          <CheckCircle2 color="var(--md-sys-color-success)" aria-hidden="true" />
          <span>{issues.length === 0 ? 'No issues. This case is consistent.' : 'Nothing in this category.'}</span>
        </div>
      ) : (
        <ul className="hint-list" aria-label="Consistency issues">
          {shown.map((i) => (
            <li key={i.id}>
              <IssueRow issue={i} caseId={caseId} onGo={onGo} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
