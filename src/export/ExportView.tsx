import { useMemo, useState } from 'react';
import { BookLock, Download, FileText, Printer, ScrollText, ShieldCheck, Users } from 'lucide-react';
import type { Issue } from '../../shared/checker';
import { countIssues } from '../../shared/checker';
import { buildGmPacket, buildPlayerPacket, sheetSections, type CharacterSheet, type GmPacket, type PlayerPacket } from '../../shared/export';
import type { Case } from '../../shared/models';
import { plural } from '../../shared/ops';
import { downloadBlob, errorMessage } from '../api';
import { hrefs, navigate, type ExportTab } from '../router';
import { Button, Callout, EmptyState, PageHead, SelectField, Tabs } from '../ui';
import { useFeedback } from '../ui/feedback';

function SheetPaper({ packet, sheet }: { packet: PlayerPacket; sheet: CharacterSheet }) {
  return (
    <article className="paper paper--sheet" aria-label={`Character sheet for ${sheet.name}`} data-testid="sheet">
      <div className="paper__eyebrow">
        {packet.title} · {packet.setting.name} · {packet.playerRange}
      </div>
      <div className="paper__stamp">Character sheet · for your eyes only</div>
      <h2 className="paper__name">{sheet.name || 'Unnamed character'}</h2>
      <hr className="paper__rule" />
      {sheetSections(sheet).map((s) => (
        <section className="paper__section" key={s.heading}>
          <div className="paper__h">{s.heading}</div>
          {s.text && <p className="paper__p">{s.text}</p>}
          {s.items && (
            <ul>
              {s.items.map((it, i) => (
                <li key={i}>{it}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
      <p className="paper__foot">The guest list, the scene of the crime and the house rules are on the shared table card.</p>
    </article>
  );
}

/** One shared card for the table: scene, public guest list, dress code, house rules. */
function TableCard({ packet }: { packet: PlayerPacket }) {
  const v = packet.victim;
  return (
    <article className="paper paper--sheet" aria-label="Shared table card" data-testid="table-card">
      <div className="paper__eyebrow">
        {packet.title} · {packet.setting.name} · {packet.playerRange}
      </div>
      <div className="paper__stamp">Table card · shared, everyone may read it</div>
      <h2 className="paper__name">{packet.title || 'Untitled mystery'}</h2>
      <hr className="paper__rule" />
      {packet.setting.description && <p className="paper__p paper__small"><em>{packet.setting.description}</em></p>}
      <section className="paper__section">
        <div className="paper__h">The victim</div>
        <p className="paper__p paper__small">
          <strong>{v.name}</strong>. {v.description}
        </p>
        <p className="paper__p paper__small paper__muted">
          {[v.causeOfDeath && `Found: ${v.causeOfDeath}`, v.placeOfDeath && `Place: ${v.placeOfDeath}`, v.timeOfDeath && `Time: ${v.timeOfDeath}`].filter(Boolean).join('  ·  ')}
        </p>
      </section>
      <section className="paper__section paper__roster">
        <div className="paper__h">The guests (public knowledge)</div>
        {packet.guestList.map((g, i) => (
          <p key={i}>
            <strong>{g.name}</strong>: {g.publicBio}
          </p>
        ))}
      </section>
      {packet.dressCode.length > 0 && (
        <section className="paper__section">
          <div className="paper__h">Dress code</div>
          <ul className="paper__small">
            {packet.dressCode.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </section>
      )}
      <section className="paper__section">
        <div className="paper__h">House rules</div>
        <ul className="paper__small">
          {packet.houseRules.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </section>
    </article>
  );
}

function Handouts({ packet }: { packet: PlayerPacket }) {
  const pages: PlayerPacket['handouts'][] = [];
  for (let i = 0; i < packet.handouts.length; i += 8) pages.push(packet.handouts.slice(i, i + 8));
  return (
    <>
      {pages.map((page, p) => (
        <div className="handout-page" key={p} aria-label={`Handout page ${p + 1}`}>
          {page.map((card) => (
            <div className="handout-card" key={card.number} data-testid="handout">
              <div className="handout-card__label">
                Clue {card.number} · {card.kindLabel}
              </div>
              <div className="handout-card__text">{card.text}</div>
              <div className="handout-card__foot">{packet.title}</div>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

function GmPaper({ gm }: { gm: GmPacket }) {
  const s = gm.solution;
  return (
    <>
      <article className="paper paper--gm paper--flow" data-testid="gm-packet">
        <div className="paper__stamp" style={{ marginTop: 0 }}>Game master packet · contains spoilers</div>
        <h2 className="paper__title">{gm.title || 'Untitled mystery'}</h2>
        <p className="paper__small paper__muted">
          {gm.setting.name}
          {gm.setting.era ? ` (${gm.setting.era})` : ''} · about {gm.runtimeMinutes} minutes · difficulty {gm.difficulty}/5
        </p>
        <hr className="paper__rule" />
        <section className="paper__section">
          <div className="paper__h">Solution key</div>
          <p className="paper__p" style={{ fontSize: 22, fontWeight: 700 }}>{s.killerName ?? 'Nobody is marked as the killer'}</p>
          <p className="paper__p paper__small">{gm.victim.name}: {s.method}.</p>
          {s.motives.map((m, i) => (
            <p className="paper__p paper__small" key={i}><strong>Motive ({m.category}, {m.strength}):</strong> {m.description}</p>
          ))}
          {s.keyEvidence.length > 0 && (
            <>
              <h3>Key evidence</h3>
              <ul className="paper__small">{s.keyEvidence.map((e) => (<li key={e.id}><strong>{e.title}</strong>{e.revealedIn ? ` (${e.revealedIn})` : ''}: {e.description}</li>))}</ul>
            </>
          )}
          {s.herrings.length > 0 && (
            <>
              <h3>Red herrings</h3>
              <ul className="paper__small">
                {s.herrings.map((h) => (
                  <li key={h.id}><strong>{h.title}</strong>{h.misleads.length ? ` (points at ${h.misleads.join(', ')})` : ''}. Revealed: {h.revealedIn ?? 'never'}. Debunked: {h.debunkedIn ?? 'no beat'}{h.debunkedBy ? ` by “${h.debunkedBy}”` : ''}. {h.note}</li>
                ))}
              </ul>
            </>
          )}
        </section>
        <section className="paper__section">
          <div className="paper__h">Timeline</div>
          {gm.timeline.map((b) => (
            <div key={b.number} className="paper__beat" style={{ breakInside: 'avoid' }}>
              <h3>{b.number}. {b.title}</h3>
              <p className="paper__small paper__muted">Round {b.round}{b.timeLabel ? ` · ${b.timeLabel}` : ''} · {b.trigger === 'timer' ? `timer ${Math.round(b.timerSeconds / 60)} min` : b.trigger === 'player-action' ? 'player action' : 'GM advances'}</p>
              {b.description && <p className="paper__p paper__small">{b.description}</p>}
              {b.actionPrompt && <p className="paper__p paper__small"><em>Players must: {b.actionPrompt}</em></p>}
              {b.clues.length > 0 && <ul className="paper__small">{b.clues.map((c, i) => (<li key={i}><strong>Reveal “{c.title}”:</strong> {c.text}</li>))}</ul>}
              {b.gmNotes && <p className="paper__p paper__small paper__muted" style={{ whiteSpace: 'pre-wrap' }}>GM notes: {b.gmNotes}</p>}
            </div>
          ))}
        </section>
      </article>
      <article className="paper paper--gm">
        <div className="paper__h">Cast, alibis and secrets</div>
        {gm.cast.map((c, i) => (
          <div key={i} className="paper__beat" style={{ breakInside: 'avoid' }}>
            <h3>{c.name}{c.isKiller ? '  [KILLER]' : ''}{c.secretRole ? `: ${c.secretRole}` : ''}</h3>
            <p className="paper__p paper__small">Alibi: {c.alibi || 'none'}</p>
            {c.secrets.length > 0 && <p className="paper__p paper__small paper__muted">Secrets: {c.secrets.join(' / ')}</p>}
          </div>
        ))}
        {(gm.props.length > 0 || gm.miniGames.length > 0) && (
          <>
            <div className="paper__h" style={{ marginTop: 20 }}>Props and challenges</div>
            <ul className="paper__small">
              {gm.props.map((p, i) => (<li key={`p${i}`}>{p}</li>))}
              {gm.miniGames.map((g, i) => (<li key={`g${i}`}><strong>{g.title}:</strong> {g.description}</li>))}
            </ul>
          </>
        )}
        <section className="paper__section" style={{ marginTop: 20, breakInside: 'avoid' }}>
          <div className="paper__h">Scorecard: who accused whom</div>
          <p className="paper__small paper__muted">Fill in at the reveal. One point for the killer, one for the motive, one for the key clue.</p>
          <table className="scorecard" data-testid="scorecard">
            <thead>
              <tr><th style={{ width: '28%' }}>Player</th><th style={{ width: '26%' }}>Accuses</th><th>Motive and key clue</th><th style={{ width: '9%' }}>Points</th></tr>
            </thead>
            <tbody>
              {Array.from({ length: Math.min(12, Math.max(6, gm.cast.length)) }, (_, i) => (<tr key={i}><td /><td /><td /><td /></tr>))}
            </tbody>
          </table>
        </section>
      </article>
    </>
  );
}

export function ExportView({ doc, issues, tab }: { doc: Case; issues: Issue[]; tab: ExportTab }) {
  const packet = useMemo(() => buildPlayerPacket(doc), [doc]);
  const gm = useMemo(() => buildGmPacket(doc), [doc]);
  const [who, setWho] = useState('all');
  const [busy, setBusy] = useState(false);
  const { toast } = useFeedback();
  const counts = countIssues(issues);
  const selected = who === 'all' ? packet.sheets : who === 'table' ? [] : packet.sheets.filter((s) => s.characterId === who);
  const showCard = who === 'all' || who === 'table';

  const pdf = async () => {
    setBusy(true);
    try {
      const m = await import('../../shared/pdf');
      const base = m.slug(doc.title);
      let file: string;
      let out;
      if (tab === 'sheets') {
        const one = who !== 'all' && who !== 'table' ? packet.sheets.find((s) => s.characterId === who) : undefined;
        out = who === 'table' ? m.buildSheetsPdf({ ...packet, sheets: [] }) : m.buildSheetsPdf(packet, one?.characterId);
        file = who === 'table' ? `${base}-table-card.pdf` : one ? `${base}-sheet-${m.slug(one.name, 'character')}.pdf` : `${base}-character-sheets.pdf`;
      } else if (tab === 'handouts') {
        out = m.buildHandoutsPdf(packet);
        file = `${base}-clue-handouts.pdf`;
      } else {
        out = m.buildGmPdf(gm);
        file = `${base}-gm-packet.pdf`;
      }
      await downloadBlob(file, out.output('arraybuffer'), 'application/pdf');
      toast(`Downloaded ${file}`);
    } catch (e) {
      toast(`Could not build the PDF: ${errorMessage(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const empty = tab === 'sheets' ? packet.sheets.length === 0 : tab === 'handouts' ? packet.handouts.length === 0 : false;

  return (
    <>
      <PageHead eyebrow="Print and export" title="Player kit and GM packet" lead="What you see below is exactly what gets printed or saved as PDF. Player materials are built from a whitelist of fields, so secrets, red-herring flags and the solution can never leak onto them." />
      <Tabs<ExportTab>
        label="Export type"
        value={tab}
        onChange={(t) => navigate(hrefs.export(doc.id, t))}
        tabs={[
          { value: 'sheets', label: 'Character sheets', icon: <Users /> },
          { value: 'handouts', label: 'Clue handouts', icon: <ScrollText /> },
          { value: 'gm', label: 'GM packet', icon: <BookLock /> },
        ]}
      />
      {tab !== 'gm' ? (
        <Callout tone="success" title="Spoiler-safe by construction">
          <span className="t-body-medium">
            {tab === 'sheets'
              ? 'Each sheet shows only that character’s own information. One shared table card carries the public guest list and house rules. Every sheet has the same sections, so nobody can spot the killer by the shape of the page.'
              : 'Cards carry the clue text only: no titles, no red-herring flags, no suspect lists, no solution. Cut along the dashed lines.'}
          </span>
        </Callout>
      ) : (
        <Callout tone="warning" title="Keep this packet away from players">
          It contains the killer, the motive, every secret and how each red herring is debunked.
        </Callout>
      )}
      {counts.error > 0 && (
        <Callout tone="error" title={`${plural(counts.error, 'consistency error')} in this case`}>
          You can still export, but the results may be incomplete or confusing. Open the consistency check in the top bar to fix them.
        </Callout>
      )}

      <div className="export-toolbar no-print">
        {tab === 'sheets' && packet.sheets.length > 0 && (
          <div style={{ minWidth: 260 }}>
            <SelectField id="export-who" label="Print for" value={who} onChange={setWho} options={[{ value: 'all', label: `Everyone (table card + ${plural(packet.sheets.length, 'sheet')})` }, { value: 'table', label: 'Shared table card only' }, ...packet.sheets.map((s) => ({ value: s.characterId, label: s.name || 'Unnamed character' }))]} />
          </div>
        )}
        <span className="spacer" />
        <Button variant="tonal" icon={<Printer />} onClick={() => window.print()} disabled={empty}>
          Print
        </Button>
        <Button variant="filled" icon={<Download />} onClick={() => void pdf()} disabled={empty || busy}>
          {busy ? 'Building PDF…' : 'Download PDF'}
        </Button>
      </div>

      {empty ? (
        <EmptyState
          icon={<FileText />}
          title={tab === 'sheets' ? 'No characters to print yet' : 'No clues to print yet'}
          action={<Button variant="filled" href={hrefs.build(doc.id, tab === 'sheets' ? 'characters' : 'evidence')}>{tab === 'sheets' ? 'Add characters' : 'Add clues'}</Button>}
        >
          Build the case first, then come back to print it.
        </EmptyState>
      ) : (
        <div className="paper-stack print-area" data-tab={tab}>
          {tab === 'sheets' && showCard && <TableCard packet={packet} />}
          {tab === 'sheets' && selected.map((s) => <SheetPaper key={s.characterId} packet={packet} sheet={s} />)}
          {tab === 'handouts' && <Handouts packet={packet} />}
          {tab === 'gm' && <GmPaper gm={gm} />}
        </div>
      )}
      <p className="muted t-body-small no-print" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <ShieldCheck size={16} aria-hidden="true" /> Tip: in the print dialog, turn off “Headers and footers” for clean pages.
      </p>
    </>
  );
}
