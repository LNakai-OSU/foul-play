/** High-level story flow: picking up clues, interviews, the Inspector, and the accusation that ends the case. */
import type { Game } from '../engine';
import { askNight, charById, collect, hint, judge, MOTIVE_LABEL, motiveChoices, progress, sneakWatchHint, tickClock } from '../logic';
import type { NpcDef } from '../types';
import { announceCleared, announceClue, runChapters } from './announce';
import { BattleScene } from './battle';
import { NightScene } from './night';
import type { BattleResult } from './battle';
import { PickScene, ask, say } from './dialogue';
import { EndingScene } from './ending';
import { Transition } from './misc';
import { NotebookScene } from './notebook';
import { ReconstructionScene } from './recon';
import { RitualScene } from './ritual';
import { RITUALS } from '../rituals';

export function pickUpClue(g: Game, evId: string): void {
  const r = collect(g.world, g.state, evId);
  tickClock(g.world, g.state, 2);
  announceClue(g, evId, true, () => announceCleared(g, r.cleared, () => runChapters(g, () => g.save())));
}

/** Staff who did their rounds at the shot: chat, and (if you ask) tell you what they counted. */
export function witnessTalk(g: Game, wit: { id: string; name: string; line: string }): void {
  const ask1 = () =>
    ask(g, [{ who: wit.name, text: wit.line }], ['WHAT DID YOU SEE?', 'NEVERMIND'], (i) => {
      if (i !== 0) return;
      const r = askNight(g.world, g.state, wit.id);
      tickClock(g.world, g.state, 3);
      say(g, r.lines, () => {
        const id = r.found[0];
        if (!id) return runChapters(g, () => g.save());
        announceClue(g, id, false, () => announceCleared(g, r.cleared, () => runChapters(g, () => g.save())));
      });
    }, 1);
  ask1();
}

/** The setting's signature interaction: optional, skippable, and it only ever earns a headcount you could also get from the staff. */
export function runRitual(g: Game): void {
  const w = g.world;
  const r = w.ritual;
  if (!r) return;
  const def = RITUALS[w.env];
  if (g.state.found.includes(r.evId)) {
    say(g, [`You already got everything ${def.title.toLowerCase()} could give you.`]);
    return;
  }
  g.push(
    new RitualScene(def, `${w.c.id}|${w.env}`, (won) => {
      tickClock(w, g.state, won ? 8 : 2);
      if (!won) {
        say(g, [def.skip]);
        return;
      }
      g.state.tried.push('ritual');
      collect(w, g.state, r.evId);
      announceClue(g, r.evId, true, () => runChapters(g, () => g.save()));
    }),
  );
}

export function talkTo(g: Game, npc: NpcDef): void {
  if (npc.kind === 'inspector') inspectorTalk(g);
  else if (npc.kind === 'body') bodyTalk(g);
}

export function beginInterview(g: Game, npc: NpcDef): void {
  const charId = npc.charId;
  if (!charId) return;
  g.push(
    new Transition(
      'out',
      'bars',
      () => {
        g.push(
          // Any interview can be what tips the story forward (a chapter with no clues of its own
          // would otherwise never start).
          new BattleScene(g, charId, 'interview', () => runChapters(g, () => g.save())),
        );
      },
      24,
    ),
  );
}

function bodyTalk(g: Game): void {
  const v = g.world.c.victim;
  const seen = (g.state.asked.body ??= []);
  const first = !seen.includes('seen');
  if (first) seen.push('seen');
  const lines = first
    ? [`${g.state.player} examined the body of ${v.name || 'the victim'}.`, v.description, `${v.causeOfDeath || 'Cause of death unknown'}${v.timeOfDeath ? `, around ${v.timeOfDeath}` : ''}.`, 'A chalk outline marks where they fell. There is nothing more to learn from the body itself.']
    : [`${v.name || 'The victim'}. ${v.causeOfDeath || ''}`.trim(), 'Nothing more to learn from the body itself. Look around the room.'];
  say(g, lines);
}

export function inspectorTalk(g: Game): void {
  const w = g.world;
  const s = g.state;
  const c = w.c;
  const name = w.inspectorName;
  const menu = () =>
    ask(
      g,
      [{ who: name, text: 'What can I do for you, Detective?' }],
      ['LEADS', 'CASE FILE', 'THE NIGHT', 'NIGHT WATCH', 'ACCUSE', 'NEVERMIND'],
      (i) => {
        if (i === 0) say(g, [{ who: name, text: hint(w, s) }], () => g.save());
        else if (i === 1) g.push(new NotebookScene('case'));
        else if (i === 2) g.push(new NightScene('browse'));
        else if (i === 3) say(g, [{ who: name, text: sneakWatchHint(w, g.sim.plan.sneaks, s.tmin) }]);
        else if (i === 4) accuse(g);
      },
      5,
    );
  if (s.briefed) return runChapters(g, menu);
  const lines = [
    { who: name, text: `${s.player}! Thank goodness you are here.` },
    { who: name, text: c.setting.description || `It is a night to remember at ${c.setting.name || 'the estate'}. Unfortunately.` },
    { who: name, text: `${c.victim.name || 'The host'} was found dead in ${c.victim.placeOfDeath || 'the building'}${c.victim.timeOfDeath ? ` at ${c.victim.timeOfDeath}` : ''}. ${c.victim.causeOfDeath ? c.victim.causeOfDeath + '.' : ''}`.trim() },
    { who: name, text: `${c.characters.length} suspects are in the building, and I have told every one of them to stay put. The staff did their rounds at the shot and counted heads in the rooms. Somebody's story does not add up.` },
    { who: name, text: 'Walk up to people and things and press SPACE. Question everyone and read their statements: PRESS them for leads. Rebuild THE NIGHT from what you learn (ENTER opens it). When the table adds up, find me.' },
  ];
  say(g, lines, () => {
    s.briefed = true;
    g.save();
    runChapters(g, menu);
  });
}

// ---------------------------------------------------------------------------------------------
// accusation

function accuse(g: Game): void {
  const w = g.world;
  const name = w.inspectorName;
  const total = w.c.evidence.length;
  const { found } = progress(w, g.state);
  const thin = found < Math.ceil(total / 2);
  const start = () => g.push(new NightScene('accuse', (id) => pickMotive(g, id)));
  ask(
    g,
    [{ who: name, text: thin ? `You have only ${found} of ${total} clues. Are you certain you are ready to name the culprit?` : 'So you know who did it. Are you ready to name the culprit?' }],
    ['YES', 'NOT YET'],
    (i) => {
      if (i === 0) start();
    },
    1,
  );
}

function pickMotive(g: Game, suspectId: string): void {
  const w = g.world;
  const choices = motiveChoices(w);
  g.push(
    new PickScene(
      `WHY DID ${(charById(w, suspectId)?.name ?? 'THEY').split(' ')[0]?.toUpperCase()} DO IT?`,
      choices.map((m) => ({ label: MOTIVE_LABEL[m] })),
      (i) => resolve(g, suspectId, choices[i] as (typeof choices)[number]),
      () => g.push(new NightScene('accuse', (id) => pickMotive(g, id))),
      { x: 6, y: 4, w: 224, rows: 4 },
    ),
  );
}

function resolve(g: Game, suspectId: string, motive: Parameters<typeof judge>[2]): void {
  const w = g.world;
  const verdict = judge(w, suspectId, motive);
  const accused = charById(w, suspectId)?.name ?? 'Someone';
  say(g, [{ who: w.inspectorName, text: `${g.state.player} names ${accused}. Let us see if it holds up...` }], () => {
    if (verdict !== 'correct') {
      // Both wrong answers read the same, so the reaction cannot leak who the killer is.
      say(g, [{ who: accused, text: 'That theory has more holes than a fishing net, Detective.' }, { who: w.inspectorName, text: 'It does not add up. Something is wrong with that theory.' }], () => strike(g));
      return;
    }
    g.push(
      new Transition(
        'out',
        'bars',
        () => {
          g.push(
            new BattleScene(g, suspectId, 'showdown', (r: BattleResult) => {
              if (r === 'won') end(g, 'won');
              else strike(g);
            }),
          );
        },
        24,
      ),
    );
  });
}

function strike(g: Game): void {
  const s = g.state;
  s.strikes += 1;
  g.audio.sfx('lose');
  if (s.strikes >= 3) {
    say(g, [{ who: g.world.inspectorName, text: 'That is three wrong accusations. The Commissioner has taken you off the case.' }], () => end(g, 'lost'));
    return;
  }
  g.save();
  say(g, [{ who: g.world.inspectorName, text: `That is strike ${s.strikes} of 3. Gather more evidence before you try again.` }]);
}

function end(g: Game, kind: 'won' | 'lost'): void {
  g.state.done = kind;
  g.save();
  g.push(new Transition('out', 'fade', () => g.push(kind === 'won' ? new ReconstructionScene(() => g.push(new EndingScene(kind))) : new EndingScene(kind)), 20));
}
