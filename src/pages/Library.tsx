import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Download, EllipsisVertical, FolderOpen, Gamepad2, Pencil, Plus, Search, Sparkles, Trash2, Upload, Users, FileSearch, Clock, Palette, Laugh, Moon, Scale } from 'lucide-react';
import { parseImport, type Case, type CaseSummary, type Tone } from '../../shared/models';
import { generateCase } from '../../shared/generator/generate';
import { plural } from '../../shared/ops';
import { api, downloadBlob, errorMessage } from '../api';
import { hrefs, navigate } from '../router';
import { Button, Callout, Chip, Dialog, EmptyState, Menu, Spinner, TextField } from '../ui';
import { useFeedback } from '../ui/feedback';
import { GenerateDialog, toOptions, type GenerateChoice } from '../editor/GenerateDialog';

const TONE_ICON: Record<Tone, typeof Laugh> = { comedic: Laugh, serious: Scale, noir: Moon };

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function Library() {
  const [cases, setCases] = useState<CaseSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [genOpen, setGenOpen] = useState(false);
  const [renaming, setRenaming] = useState<CaseSummary | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast, confirm } = useFeedback();

  const refresh = useCallback(async () => {
    try {
      setCases(await api.list());
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);
  useEffect(() => {
    document.title = 'Foul Play · Case library';
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (cases ?? []).filter((c) => !q || `${c.title} ${c.settingName}`.toLowerCase().includes(q));
  }, [cases, query]);

  const createBlank = async () => {
    try {
      const c = await api.create({ title: 'Untitled mystery' });
      navigate(hrefs.build(c.id, 'setting'));
    } catch (e) {
      toast(errorMessage(e));
    }
  };

  const createGenerated = async (choice: GenerateChoice) => {
    try {
      const c = await api.create({ generate: toOptions(choice) });
      setGenOpen(false);
      toast(`Generated “${c.title}”`);
      navigate(hrefs.build(c.id, 'setting'));
    } catch (e) {
      toast(errorMessage(e));
    }
  };

  const duplicate = async (c: CaseSummary) => {
    try {
      const copy = await api.duplicate(c.id);
      await refresh();
      toast(`Duplicated as “${copy.title}”`);
    } catch (e) {
      toast(errorMessage(e));
    }
  };

  const exportJson = async (c: CaseSummary) => {
    try {
      const full = await api.get(c.id);
      const safe = (full.title || 'mystery').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'mystery';
      downloadBlob(`${safe}.mystery.json`, JSON.stringify(full, null, 2), 'application/json');
      toast('Case exported as JSON');
    } catch (e) {
      toast(errorMessage(e));
    }
  };

  const remove = async (c: CaseSummary) => {
    const ok = await confirm({
      title: `Delete “${c.title || 'Untitled mystery'}”?`,
      body: 'The case is removed from the library. You can undo right afterwards.',
      confirmLabel: 'Delete case',
      danger: true,
    });
    if (!ok) return;
    try {
      const full = await api.get(c.id);
      await api.remove(c.id);
      await refresh();
      toast({
        message: `Deleted “${c.title || 'Untitled mystery'}”`,
        actionLabel: 'Undo',
        onAction: () => {
          api
            .import(full)
            .then(refresh)
            .catch((e: unknown) => toast(errorMessage(e)));
        },
      });
    } catch (e) {
      toast(errorMessage(e));
    }
  };

  const saveRename = async () => {
    if (!renaming) return;
    try {
      const full: Case = await api.get(renaming.id);
      await api.save({ ...full, title: newTitle.trim() || 'Untitled mystery' });
      setRenaming(null);
      await refresh();
      toast('Renamed');
    } catch (e) {
      toast(errorMessage(e));
    }
  };

  const onImportFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('That file is not valid JSON.');
      }
      const checked = parseImport(data, 'case_import_check');
      if (!checked.ok) throw new Error(`This is not a case file (${checked.errors[0] ?? 'invalid'}).`);
      const c = await api.import(data);
      await refresh();
      toast({ message: `Imported “${c.title || 'Untitled mystery'}”`, actionLabel: 'Open', onAction: () => navigate(hrefs.build(c.id, 'setting')) });
    } catch (e) {
      toast(`Import failed: ${errorMessage(e)}`);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="library">
      <header className="library__top">
        <a className="brand" href={hrefs.library()}>
          <span className="brand__mark">
            <Search aria-hidden="true" />
          </span>
          <span>
            <div className="brand__name">Foul Play</div>
            <div className="brand__tag">Murder mystery party builder</div>
          </span>
        </a>
        <span className="spacer" />
        <Button variant="text" icon={<Palette />} href={hrefs.design()}>
          Design system
        </Button>
      </header>

      <div className="library__inner">
        <section className="hero">
          <span className="stamp" style={{ marginBottom: 'var(--space-4)' }}>Case files</span>
          <h1 className="hero__title">Every great party needs a body.</h1>
          <p className="hero__lead">Build a complete murder-mystery kit: suspects, motives, clues, red herrings and a timed run-sheet. Then print the character sheets and run the night from the game-master screen.</p>
          <div className="hero__actions">
            <Button variant="filled" size="lg" icon={<Sparkles />} onClick={() => setGenOpen(true)}>
              Generate a mystery
            </Button>
            <Button variant="tonal" size="lg" icon={<Plus />} onClick={() => void createBlank()}>
              Start from scratch
            </Button>
            <Button variant="outlined" size="lg" icon={<Upload />} onClick={() => fileRef.current?.click()}>
              Import JSON
            </Button>
            <input ref={fileRef} type="file" accept=".json,application/json" hidden aria-label="Import case JSON file" onChange={(e) => void onImportFile(e.target.files?.[0])} />
          </div>
          <div className="tape" aria-hidden="true" />
        </section>

        <section className="stack" aria-label="Your cases">
          <div className="toolbar">
            <h2 className="t-headline-small">Your cases</h2>
            {cases && cases.length > 0 && <Chip small>{cases.length}</Chip>}
            <span className="spacer" />
            <label className="search">
              <Search aria-hidden="true" />
              <input type="search" placeholder="Search cases" aria-label="Search cases" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
          </div>

          {error ? (
            <Callout tone="error" title="Could not load your cases" actions={<Button variant="tonal" size="sm" onClick={() => void refresh()}>Retry</Button>}>
              {error}
            </Callout>
          ) : cases === null ? (
            <Spinner label="Loading the case library…" />
          ) : cases.length === 0 ? (
            <EmptyState
              icon={<FolderOpen />}
              title="The case library is empty"
              action={
                <div className="row row--wrap" style={{ justifyContent: 'center' }}>
                  <Button variant="filled" icon={<Sparkles />} onClick={() => setGenOpen(true)}>Generate your first mystery</Button>
                  <Button variant="tonal" icon={<Plus />} onClick={() => void createBlank()}>Start from scratch</Button>
                </div>
              }
            >
              Nothing here yet. Generate a starter scenario in one click, or build one yourself step by step.
            </EmptyState>
          ) : filtered.length === 0 ? (
            <EmptyState icon={<Search />} title="No cases match your search">Try a different word.</EmptyState>
          ) : (
            <ul className="case-grid">
              {filtered.map((c) => {
                const ToneIcon = TONE_ICON[c.tone];
                return (
                  <li key={c.id}>
                    <article className="card card--elevated card--interactive case-card" data-testid="case-card">
                      <button type="button" className="case-card__open" aria-label={`Open ${c.title || 'Untitled mystery'}`} onClick={() => navigate(hrefs.build(c.id, 'setting'))} />
                      <div className="row row--between" style={{ alignItems: 'flex-start' }}>
                        <Chip small tone="primary" icon={<ToneIcon />}>{c.tone[0]!.toUpperCase() + c.tone.slice(1)}</Chip>
                        <div className="pointer">
                          <Menu
                            label={`Actions for ${c.title || 'Untitled mystery'}`}
                            trigger={<EllipsisVertical />}
                            items={[
                              { label: 'Open', icon: <FolderOpen />, onClick: () => navigate(hrefs.build(c.id, 'setting')) },
                              { label: 'Play as detective', icon: <Gamepad2 />, onClick: () => navigate(hrefs.play(c.id)) },
                              { label: 'Rename', icon: <Pencil />, onClick: () => { setRenaming(c); setNewTitle(c.title); } },
                              { label: 'Duplicate', icon: <Copy />, onClick: () => void duplicate(c) },
                              { label: 'Export JSON', icon: <Download />, onClick: () => void exportJson(c) },
                              { label: 'Delete', icon: <Trash2 />, danger: true, onClick: () => void remove(c) },
                            ]}
                          />
                        </div>
                      </div>
                      <h3 className="case-card__title">{c.title || 'Untitled mystery'}</h3>
                      <p className="muted t-body-medium">{c.settingName || 'No setting yet'}</p>
                      <div className="case-card__meta">
                        <Chip small icon={<Users />}>{plural(c.characterCount, 'suspect')}</Chip>
                        <Chip small icon={<FileSearch />}>{plural(c.evidenceCount, 'clue')}</Chip>
                        <Chip small icon={<Clock />}>{plural(c.beatCount, 'beat')}</Chip>
                      </div>
                      <div className="case-card__foot">
                        <span className="t-label-medium muted">{c.playerMin === c.playerMax ? plural(c.playerMin, 'player') : `${c.playerMin}–${c.playerMax} players`}</span>
                        <span className="t-label-medium muted">Edited {formatDate(c.updatedAt)}</span>
                      </div>
                      <div className="pointer">
                        <Button variant="tonal" size="sm" icon={<Gamepad2 />} href={hrefs.play(c.id)} aria-label={`Play ${c.title || 'Untitled mystery'} as the detective`}>
                          Play as detective
                        </Button>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <GenerateDialog open={genOpen} onClose={() => setGenOpen(false)} title="Generate a new mystery" confirmLabel="Generate and open" initial={{}} onGenerate={(c) => void createGenerated(c)} />

      <Dialog
        open={renaming !== null}
        onClose={() => setRenaming(null)}
        title="Rename case"
        actions={
          <>
            <Button variant="text" onClick={() => setRenaming(null)}>Cancel</Button>
            <Button variant="filled" type="submit" form="rename-form">Save</Button>
          </>
        }
      >
        <form
          id="rename-form"
          style={{ paddingTop: 8 }}
          onSubmit={(e) => {
            e.preventDefault();
            void saveRename();
          }}
        >
          <TextField id="rename-title" label="Case title" value={newTitle} onChange={setNewTitle} maxLength={200} />
        </form>
      </Dialog>
    </div>
  );
}

// re-exported so tests / other pages can build a case locally without the API
export { generateCase };
