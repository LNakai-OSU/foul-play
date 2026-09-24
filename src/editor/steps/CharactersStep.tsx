import { Copy, Plus, Skull, Trash2, UserPlus, Users } from 'lucide-react';
import { blankCharacter, duplicateCharacter, moveItem, newId, removeCharacter, setAlibiCompanions } from '../../../shared/ops';
import type { Character } from '../../../shared/models';
import { Avatar, Button, Callout, Chip, EmptyState, IconButton, MultiPicker, PageHead, Segmented, SelectField, StringListEditor, Switch, TextField } from '../../ui';
import { useFeedback } from '../../ui/feedback';
import { EntityCard } from '../EntityCard';
import { StepHints } from '../IssueList';
import { SortableList } from '../sortable';
import { useFocusEntity } from '../useFocusEntity';
import { IssueBadge, issuesFor, trimLabel, useOpenCard, type StepProps } from './common';

export function CharactersStep({ doc, update, undo, issues, focus, onGenerate }: StepProps) {
  const [openId, setOpenId] = useOpenCard();
  const { toast, confirm } = useFeedback();
  useFocusEntity(focus, setOpenId);

  const patch = (id: string, p: Partial<Character>, key?: string) =>
    update((c) => ({ ...c, characters: c.characters.map((ch) => (ch.id === id ? { ...ch, ...p } : ch)) }), key ? `${id}:${key}` : undefined);

  const add = () => {
    const ch = blankCharacter();
    update((c) => ({ ...c, characters: [...c.characters, ch] }));
    setOpenId(ch.id);
    setTimeout(() => {
      document.getElementById(`ent-${ch.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      document.getElementById(`f-${ch.id}-name`)?.focus({ preventScroll: true });
    }, 120);
  };

  const remove = async (ch: Character) => {
    const motiveCount = doc.motives.filter((m) => m.characterId === ch.id).length;
    const ok = await confirm({
      title: `Delete ${trimLabel(ch.name, 'this character')}?`,
      body: (
        <>
          This also removes their {motiveCount} motive{motiveCount === 1 ? '' : 's'}, their relationships, and any clue implications pointing at them. You can undo right afterwards.
        </>
      ),
      confirmLabel: 'Delete character',
      danger: true,
    });
    if (!ok) return;
    update((c) => removeCharacter(c, ch.id));
    if (openId === ch.id) setOpenId(null);
    toast({ message: `Deleted ${trimLabel(ch.name, 'character')}`, actionLabel: 'Undo', onAction: undo });
  };

  const killerCount = doc.characters.filter((c) => c.isKiller).length;

  return (
    <>
      <PageHead
        eyebrow="Step 3 of 8"
        title="The suspects"
        lead="Give every guest a role: a public face, a private past, an alibi and something to hide. Drag to reorder, and open a card to edit it."
        actions={
          <Button variant="filled" icon={<UserPlus />} onClick={add}>
            Add character
          </Button>
        }
      />
      <StepHints issues={issues} step="characters" caseId={doc.id} />
      <Callout tone={killerCount === 1 ? 'info' : 'warning'} title={killerCount === 1 ? 'The killer is set' : killerCount === 0 ? 'Nobody is the killer yet' : `${killerCount} killers are marked`}>
        Exactly one character should be the killer. The killer flag is only ever shown here and in the Game Master packet: it never appears on player sheets.
      </Callout>

      {doc.characters.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title="No suspects yet"
          action={
            <div className="row">
              <Button variant="filled" icon={<UserPlus />} onClick={add}>
                Add the first character
              </Button>
              <Button variant="tonal" onClick={onGenerate}>
                Generate a cast
              </Button>
            </div>
          }
        >
          A good party needs at least three suspects. Add them one by one, or let the generator draft a whole cast for you.
        </EmptyState>
      ) : (
        <SortableList
          className="entity-list"
          items={doc.characters}
          itemLabel={(c) => trimLabel(c.name, 'Unnamed character')}
          onMove={(from, to) => update((c) => ({ ...c, characters: moveItem(c.characters, from, to) }))}
        >
          {(ch, index, { handle, isDragging }) => {
            const mine = issuesFor(issues, ch.id);
            const others = doc.characters.filter((o) => o.id !== ch.id);
            return (
              <EntityCard
                id={ch.id}
                open={openId === ch.id}
                onToggle={() => setOpenId(openId === ch.id ? null : ch.id)}
                handle={handle}
                dragging={isDragging}
                hasError={mine.some((i) => i.severity === 'error')}
                lead={<Avatar name={ch.name} index={index} />}
                title={trimLabel(ch.name, 'Unnamed character')}
                subtitle={ch.secretRole || 'No secret role yet'}
                meta={
                  <>
                    {ch.isKiller && (
                      <Chip small tone="tertiary" icon={<Skull />}>
                        Killer
                      </Chip>
                    )}
                    <IssueBadge issues={mine} />
                  </>
                }
                actions={
                  <>
                    <IconButton label={`Duplicate ${trimLabel(ch.name, 'character')}`} icon={<Copy />} size="sm" onClick={() => update((c) => duplicateCharacter(c, ch.id))} />
                    <IconButton label={`Delete ${trimLabel(ch.name, 'character')}`} icon={<Trash2 />} size="sm" danger onClick={() => void remove(ch)} />
                  </>
                }
              >
                <div className="entity-form">
                  <div className="grid-2">
                    <TextField id={`f-${ch.id}-name`} label="Name" value={ch.name} onChange={(v) => patch(ch.id, { name: v }, 'name')} />
                    <TextField id={`f-${ch.id}-secretRole`} label="Secret role" value={ch.secretRole} onChange={(v) => patch(ch.id, { secretRole: v }, 'role')} helper="A hidden identity or agenda, e.g. The Undercover Reporter" />
                  </div>
                  <TextField id={`f-${ch.id}-publicBio`} label="Public bio" value={ch.publicBio} multiline rows={3} onChange={(v) => patch(ch.id, { publicBio: v }, 'bio')} helper="What every other guest is told about this character." />
                  <TextField id={`f-${ch.id}-privateBackstory`} label="Private backstory" value={ch.privateBackstory} multiline rows={5} onChange={(v) => patch(ch.id, { privateBackstory: v }, 'back')} helper="Only this player reads it. The killer's backstory should explain what they did." />
                  <TextField id={`f-${ch.id}-alibi`} label="Alibi" value={ch.alibi} multiline rows={3} onChange={(v) => patch(ch.id, { alibi: v }, 'alibi')} helper="Where they claim to have been when the victim died, in the character's own voice." />
                  <div className="grid-2" style={{ alignItems: 'start' }}>
                    <TextField id={`f-${ch.id}-alibiPlace`} label="Alibi place" value={ch.alibiPlace} onChange={(v) => patch(ch.id, { alibiPlace: v }, 'aplace')} helper="Where they say they were. Two people in the same place must vouch for each other." />
                    <MultiPicker
                      id={`f-${ch.id}-alibiWithIds`}
                      label="Was there with"
                      options={others.map((o) => ({ id: o.id, label: trimLabel(o.name, 'Unnamed character') }))}
                      value={ch.alibiWithIds}
                      addLabel="Add a companion"
                      emptyText="Alone (nobody can vouch)"
                      missingLabel="Missing character"
                      onChange={(ids) => update((c) => setAlibiCompanions(c, ch.id, ids))}
                    />
                  </div>
                  <StringListEditor idPrefix={`f-${ch.id}-secrets`} label="Secrets" items={ch.secrets} addLabel="Add a secret" emptyText="No secrets yet: everybody should be hiding something." multiline onChange={(secrets) => patch(ch.id, { secrets })} />

                  <div className="stack stack--tight">
                    <span className="picker__label">Relationships</span>
                    {ch.relationships.length === 0 && <span className="muted t-body-small">No relationships yet.</span>}
                    {ch.relationships.map((r) => (
                      <div key={r.id} className="row row--wrap" style={{ alignItems: 'flex-start' }}>
                        <div style={{ flex: '1 1 200px' }}>
                          <SelectField
                            id={`f-${ch.id}-rel-${r.id}-target`}
                            label="With"
                            value={r.targetId}
                            error={!others.some((o) => o.id === r.targetId) ? 'This character no longer exists' : undefined}
                            options={[
                              ...(others.some((o) => o.id === r.targetId) ? [] : [{ value: r.targetId, label: 'Missing character' }]),
                              ...others.map((o) => ({ value: o.id, label: trimLabel(o.name, 'Unnamed character') })),
                            ]}
                            onChange={(v) => patch(ch.id, { relationships: ch.relationships.map((x) => (x.id === r.id ? { ...x, targetId: v } : x)) })}
                          />
                        </div>
                        <div style={{ flex: '2 1 220px' }}>
                          <TextField id={`f-${ch.id}-rel-${r.id}-label`} label="Relationship" value={r.label} onChange={(v) => patch(ch.id, { relationships: ch.relationships.map((x) => (x.id === r.id ? { ...x, label: v } : x)) }, `rel-${r.id}`)} />
                        </div>
                        <div style={{ paddingTop: 8 }}>
                          <Segmented
                            small
                            label="Visibility"
                            value={r.visibility}
                            onChange={(v) => patch(ch.id, { relationships: ch.relationships.map((x) => (x.id === r.id ? { ...x, visibility: v } : x)) })}
                            options={[
                              { value: 'public', label: 'Public' },
                              { value: 'private', label: 'Private' },
                            ]}
                          />
                        </div>
                        <IconButton label="Remove relationship" icon={<Trash2 />} danger onClick={() => patch(ch.id, { relationships: ch.relationships.filter((x) => x.id !== r.id) })} />
                      </div>
                    ))}
                    <div>
                      <Button
                        variant="tonal"
                        size="sm"
                        icon={<Plus />}
                        disabled={others.length === 0}
                        onClick={() => patch(ch.id, { relationships: [...ch.relationships, { id: newId('rel'), targetId: (others[0] as Character).id, label: '', visibility: 'public' }] })}
                      >
                        Add relationship
                      </Button>
                    </div>
                  </div>

                  <div className="grid-2">
                    <TextField id={`f-${ch.id}-costume`} label="Costume suggestion" value={ch.costume} onChange={(v) => patch(ch.id, { costume: v }, 'costume')} />
                    <TextField id={`f-${ch.id}-accent`} label="Accent or manner" value={ch.accent} onChange={(v) => patch(ch.id, { accent: v }, 'accent')} />
                  </div>
                  <Switch id={`f-${ch.id}-isKiller`} danger label={ch.isKiller ? 'This character is the killer' : 'Make this character the killer'} checked={ch.isKiller} onChange={(v) => patch(ch.id, { isKiller: v })} />
                </div>
              </EntityCard>
            );
          }}
        </SortableList>
      )}
    </>
  );
}
