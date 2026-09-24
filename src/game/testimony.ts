/**
 * What each suspect swears, written from the facts of the case (their room, their company, the time of the shot, the trip they
 * admit to), so that every statement is a claim a thinking detective can check. Everyone gets the same four kinds of claim in
 * the same voice; only the killer's are false, and only some of them can be broken. Pure.
 */
import { Rng, hashSeed } from '../../shared/generator/rng';
import { clockAt, roomWord, type StmtKind } from './facts';
import { firstPerson, upperFirst } from './text';
import type { World } from './types';

export interface Statement {
  kind: StmtKind;
  /** what they say */
  text: string;
  /** what they add when pressed: leads to other people, never the answer */
  press: string[];
}

const KINDS: StmtKind[] = ['where', 'with', 'scene', 'why'];
const strip = (n: string): string => n.replace(/["“”][^"“”]*["“”]/g, '').replace(/\s+/g, ' ').trim();
const firstName = (n: string): string => strip(n).split(' ')[0] as string;

function join(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** The four statements a suspect stands behind. Pure: derived from the case, never stored. */
export function testimony(w: World, charId: string): Statement[] {
  const ch = w.c.characters.find((x) => x.id === charId);
  const cl = w.claims[charId];
  if (!ch || !cl) return [];
  const tone = w.c.tone;
  const rng = new Rng(hashSeed(`stmt|${w.c.id}|${charId}`));
  const V = w.c.victim.name || 'the victim';
  const room = roomWord(w, cl.room);
  const scene = roomWord(w, w.sceneMapId);
  const t1 = clockAt(w.night, w.night.t1);
  const t2 = clockAt(w.night, w.night.t2);
  const shot = clockAt(w.night, 0);
  const mates = cl.withIds.map((id) => w.c.characters.find((x) => x.id === id)).filter((x): x is NonNullable<typeof x> => !!x);
  const mateNames = mates.map((m) => firstName(m.name));
  const group = mates.length > 0;
  // a companion who admitted stepping out (the witness): everyone in the group mentions it
  const stepper = mates.find((m) => w.claims[m.id]?.excursion);
  const steps = cl.excursion;
  const stepTime = stepper ? clockAt(w.night, (w.claims[stepper.id] as NonNullable<(typeof w.claims)[string]>).excursion!.dt) : steps ? clockAt(w.night, steps.dt) : '';
  const through = steps?.through ? roomWord(w, steps.through) : null;
  const staff = w.witnesses.map((x) => x.name.toLowerCase());
  const staffLead = staff.length ? `The ${staff[rng.int(0, staff.length - 1)]} does the rounds all night. Ask them who was where when the shot rang out.` : 'Someone must have passed the door. Ask around.';

  // --- WHERE
  const whereGroup = {
    comedic: [`From ${t1} until the gun went off I never left ${room}. I was there with ${join(mateNames)}, being insufferable.`, `${upperFirst(room)}, ${t1} to ${t2}, with ${join(mateNames)}. We were riveting company.`],
    serious: [`I was in ${room} from ${t1} to ${t2}, together with ${join(mateNames)}. None of us left.`, `From ${t1} I was in ${room} with ${join(mateNames)}, and I stayed there until well after the shot.`],
    noir: [`${upperFirst(room)}, ${t1} to ${t2}. ${join(mateNames)} and me. Nobody moved.`, `I was in ${room} with ${join(mateNames)} the whole hour. Ask any of them.`],
  }[tone];
  const whereAlone = {
    comedic: [`I was alone in ${room} from ${t1} to ${t2}. Thrilling, I know.`, `${upperFirst(room)}, ${t1} to ${t2}, on my own, doing absolutely nothing suspicious. It is my speciality.`],
    serious: [`I was alone in ${room} from ${t1} to ${t2}. I did not leave it.`, `From ${t1} I was by myself in ${room}. I stayed there until after the shot.`],
    noir: [`${upperFirst(room)}, ${t1} to ${t2}. Alone. I never left it.`, `I was on my own in ${room}, the whole hour. It is not much of an alibi. It is the truth.`],
  }[tone];
  let where = rng.pick(group ? whereGroup : whereAlone);
  if (steps) where += ` Bar a few minutes around ${stepTime}, when I slipped out${through ? ` and cut through ${through}` : ''}.`;
  const wherePress = group
    ? [`${join(mateNames)} will tell you the same. Ask them.`, stepper ? `${firstName(stepper.name)} slipped out around ${stepTime} for a few minutes. Ask what ${firstName(stepper.name)} saw on the way.` : steps ? `I only slipped out that once. Ask me about THE NIGHT.` : 'None of us budged.']
    : [staffLead, steps ? `I only slipped out that once. Ask me about THE NIGHT.` : 'I did not budge.'];

  // --- WITH
  const withGroup = {
    comedic: `${join(mateNames)} ${mates.length > 1 ? 'were' : 'was'} with me at the shot. We were shouting about nothing, as one does.`,
    serious: `${join(mateNames)} ${mates.length > 1 ? 'were' : 'was'} with me when the shot rang out at ${shot}. They will say so.`,
    noir: `${join(mateNames)} ${mates.length > 1 ? 'were' : 'was'} right there when the gun went off at ${shot}. Ask them.`,
  }[tone];
  const withAlone = {
    comedic: 'Nobody was with me. Nobody saw me. That is what a quiet evening looks like.',
    serious: 'Nobody was with me at the shot. I am afraid there is no one to vouch for me.',
    noir: "Nobody was with me. Nobody saw me. That's how I like it, and that's how it looks.",
  }[tone];
  const withPress = group ? [`Ask ${mateNames[0]}. We have told this story a dozen times tonight.`, 'We were together. That is all there is to it.'] : [staffLead, 'No accomplices, no witnesses. Just me.'];

  // --- SCENE
  const sceneText = {
    comedic: [`I never went anywhere near ${scene}. Not a toe.`, `Me, in ${scene}? I would not know where to stand.`],
    serious: [`I never went near ${scene}, before or after the shot.`, `I was nowhere near ${scene} that night.`],
    noir: [`${upperFirst(scene)}? I stayed clear of it. I have got instincts.`, `I never set foot in ${scene}. Not once.`],
  }[tone];
  const scenePress = [`${w.inspectorName} sealed ${scene} the minute they found ${V}.`, 'I only heard about it when the shouting started.'];

  // --- WHY
  const rel = ch.relationships.filter((r) => r.visibility === 'public' && w.c.characters.some((x) => x.id === r.targetId));
  const whyText = {
    comedic: [`Why would I want ${V} dead? I am a delight. Ask anyone.`, `I had no reason to harm ${V}. A very small reason, at most.`],
    serious: [`I had no reason whatsoever to wish ${V} harm.`, `${V} and I had no quarrel that would come to this.`],
    noir: [`${V} and me? We had no quarrel. Not one.`, `I had no reason to want ${V} gone. Not one worth a bullet.`],
  }[tone];
  const whyPress = rel.length
    ? rel.slice(0, 2).map((r) => `Officially? ${upperFirst(firstPerson(r.label))} ${firstName(w.c.characters.find((x) => x.id === r.targetId)?.name ?? '')}. Nothing to do with ${V}.`)
    : [`We were on perfectly good terms, ${V} and I.`];

  const all: Record<StmtKind, Statement> = {
    where: { kind: 'where', text: where, press: wherePress },
    with: { kind: 'with', text: group ? withGroup : withAlone, press: withPress },
    scene: { kind: 'scene', text: rng.pick(sceneText), press: scenePress },
    why: { kind: 'why', text: rng.pick(whyText), press: whyPress },
  };
  // WHERE stays first (it is the alibi); the rest are shuffled per person so position never gives anyone away
  const rest = rng.shuffle(KINDS.filter((k) => k !== 'where'));
  return ['where' as StmtKind, ...rest].map((k) => all[k]);
}
