/** Story announcements shared by the overworld and interviews: clue found, red herring cleared, chapter reached. */
import type { Game } from '../engine';
import { advanceChapter, checkCleared, evidenceById } from '../logic';
import type { Cleared } from '../logic';
import { ClueCardScene } from './card';
import { say } from './dialogue';

/** Show the item-get card for a clue (with its icon and description), then continue. */
export function announceClue(g: Game, evId: string, found: boolean, then: () => void): void {
  const e = evidenceById(g.world, evId);
  if (!e) return then();
  g.audio.sfx('item');
  g.push(new ClueCardScene(evId, then, found ? 'found' : 'told'));
}

export function announceCleared(g: Game, cleared: Cleared[], then: () => void): void {
  const next = cleared[0];
  if (!next) return then();
  const e = evidenceById(g.world, next.evidenceId);
  g.audio.sfx('event');
  say(g, [`Wait a moment! That changes things. "${e?.title ?? 'That clue'}" was a red herring! If you pinned it on the board, the string just snapped.`, next.note], () => announceCleared(g, cleared.slice(1), then));
}

/** Fire the next story beat if enough has been found. Story-only beats chain into each other. */
export function runChapters(g: Game, then: () => void): void {
  const ch = advanceChapter(g.world, g.state);
  if (!ch) {
    g.save();
    return then();
  }
  const cleared = checkCleared(g.world, g.state);
  g.audio.sfx('event');
  const lines: string[] = [];
  if (ch.description) lines.push(ch.description);
  if (ch.evidenceIds.length) lines.push('That could change things. Perhaps there is something new to find around here.');
  const after = () => announceCleared(g, cleared, () => (ch.evidenceIds.length ? (g.save(), then()) : runChapters(g, then)));
  if (lines.length) say(g, lines, after);
  else after();
}
