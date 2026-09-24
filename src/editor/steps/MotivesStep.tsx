import { Plus, Trash2, Wallet, Heart, Swords, Eye, Crown, Lock, ScrollText, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { MOTIVE_CATEGORIES, type Motive, type MotiveCategory } from '../../../shared/models';
import { blankMotive, characterName, evidenceLabel, removeMotive } from '../../../shared/ops';
import { Avatar, Button, Callout, Chip, EmptyState, IconButton, MultiPicker, PageHead, Segmented, SelectField, TextField } from '../../ui';
import { useFeedback } from '../../ui/feedback';
import { EntityCard } from '../EntityCard';
import { StepHints } from '../IssueList';
import { useFocusEntity } from '../useFocusEntity';
import { IssueBadge, issuesFor, trimLabel, useOpenCard, type StepProps } from './common';

export const CATEGORY_ICON: Record<MotiveCategory, ReactNode> = {
  money: <Wallet />,
  love: <Heart />,
  revenge: <Swords />,
  jealousy: <Eye />,
  power: <Crown />,
  secrecy: <Lock />,
  inheritance: <ScrollText />,
  ambition: <TrendingUp />,
};

const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);

export function MotivesStep({ doc, update, undo, issues, focus }: StepProps) {
  const [openId, setOpenId] = useOpenCard();
  const { toast } = useFeedback();
  useFocusEntity(focus, setOpenId);

  const patch = (id: string, p: Partial<Motive>, key?: string) =>
    update((c) => ({ ...c, motives: c.motives.map((m) => (m.id === id ? { ...m, ...p } : m)) }), key ? `${id}:${key}` : undefined);

  const addFor = (characterId: string) => {
    const m = blankMotive(characterId);
    update((c) => ({ ...c, motives: [...c.motives, m] }));
    setOpenId(m.id);
    setTimeout(() => document.getElementById(`ent-${m.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
  };

  const withoutMotive = doc.characters.filter((ch) => !doc.motives.some((m) => m.characterId === ch.id));
  const evOptions = doc.evidence.map((e) => ({ id: e.id, label: evidenceLabel(e) }));
  // keep motives grouped by the order of the cast
  const order = new Map(doc.characters.map((c, i) => [c.id, i]));
  const sorted = [...doc.motives].sort((a, b) => (order.get(a.characterId) ?? 999) - (order.get(b.characterId) ?? 999));

  return (
    <>
      <PageHead
        eyebrow="Step 4 of 8"
        title="Motives"
        lead="Why would each suspect want the victim dead? Strong motives make good decoys; the killer should have one too. Link the clues that reveal each motive."
        actions={
          <Button variant="filled" icon={<Plus />} disabled={doc.characters.length === 0} onClick={() => addFor((withoutMotive[0] ?? doc.characters[0])!.id)}>
            Add motive
          </Button>
        }
      />
      <StepHints issues={issues} step="motives" caseId={doc.id} />

      {doc.characters.length === 0 ? (
        <Callout tone="warning" title="Add characters first">
          Motives belong to characters. Head back to the Characters step to create some.
        </Callout>
      ) : (
        withoutMotive.length > 0 && (
          <div className="stack stack--tight">
            <span className="section-label">Characters with no motive yet: tap to add one</span>
            <div className="chip-row">
              {withoutMotive.map((ch, i) => (
                <span id={`ent-${ch.id}`} key={ch.id}>
                  <Chip ghost icon={<Plus />} onClick={() => addFor(ch.id)} title={`Add a motive for ${ch.name}`}>
                    {trimLabel(ch.name, `Character ${i + 1}`)}
                  </Chip>
                </span>
              ))}
            </div>
          </div>
        )
      )}

      {sorted.length === 0 && doc.characters.length > 0 ? (
        <EmptyState icon={<Swords />} title="No motives yet">
          Pick a character above to give them a reason to kill.
        </EmptyState>
      ) : (
        <div className="entity-list">
          {sorted.map((m) => {
            const mine = issuesFor(issues, m.id);
            const who = doc.characters.find((c) => c.id === m.characterId);
            const idx = doc.characters.findIndex((c) => c.id === m.characterId);
            return (
              <EntityCard
                key={m.id}
                id={m.id}
                open={openId === m.id}
                onToggle={() => setOpenId(openId === m.id ? null : m.id)}
                hasError={mine.some((i) => i.severity === 'error')}
                lead={who ? <Avatar name={who.name} index={idx} /> : <Avatar name="?" index={0} />}
                title={`${who ? trimLabel(who.name, 'Unnamed character') : 'Unassigned'}: ${cap(m.category)}`}
                subtitle={m.description || 'No description yet'}
                meta={
                  <>
                    <Chip small tone={m.strength === 'strong' ? 'primary' : undefined}>
                      {m.strength === 'strong' ? 'Strong' : 'Weak'}
                    </Chip>
                    {who?.isKiller && <Chip small tone="tertiary">Killer</Chip>}
                    <IssueBadge issues={mine} />
                  </>
                }
                actions={
                  <IconButton
                    label="Delete motive"
                    icon={<Trash2 />}
                    size="sm"
                    danger
                    onClick={() => {
                      update((c) => removeMotive(c, m.id));
                      toast({ message: `Deleted ${cap(m.category)} motive`, actionLabel: 'Undo', onAction: undo });
                    }}
                  />
                }
              >
                <div className="entity-form">
                  <div className="grid-2">
                    <SelectField
                      id={`f-${m.id}-characterId`}
                      label="Belongs to"
                      value={m.characterId}
                      error={who ? undefined : 'This character no longer exists'}
                      options={[
                        ...(who ? [] : [{ value: m.characterId, label: 'Missing character' }]),
                        ...doc.characters.map((c) => ({ value: c.id, label: characterName(doc, c.id) })),
                      ]}
                      onChange={(v) => patch(m.id, { characterId: v })}
                    />
                    <SelectField
                      id={`f-${m.id}-category`}
                      label="Category"
                      value={m.category}
                      options={MOTIVE_CATEGORIES.map((c) => ({ value: c, label: cap(c) }))}
                      onChange={(v) => patch(m.id, { category: v as MotiveCategory })}
                    />
                  </div>
                  <div className="row row--wrap">
                    <span className="picker__label">Strength</span>
                    <Segmented
                      label="Strength"
                      value={m.strength}
                      onChange={(v) => patch(m.id, { strength: v })}
                      options={[
                        { value: 'weak', label: 'Weak' },
                        { value: 'strong', label: 'Strong' },
                      ]}
                    />
                  </div>
                  <TextField id={`f-${m.id}-description`} label="Description" value={m.description} multiline rows={3} onChange={(v) => patch(m.id, { description: v }, 'desc')} />
                  <MultiPicker id={`f-${m.id}-evidenceIds`} label="Evidence that reveals this motive" options={evOptions} value={m.evidenceIds} addLabel="Link a clue" emptyText="No linked clues" missingLabel="Missing clue" onChange={(ids) => patch(m.id, { evidenceIds: ids })} />
                </div>
              </EntityCard>
            );
          })}
        </div>
      )}
    </>
  );
}
