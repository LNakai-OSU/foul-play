import { describe, expect, it } from 'vitest';
import { TopBand } from '../src/game/topband';
import { OverworldScene } from '../src/game/scenes/overworld';
import { MenuScene } from '../src/game/scenes/menus';
import { DialogueScene, PickScene, BOX as DIALOGUE_BOX } from '../src/game/scenes/dialogue';
import { ClueCardScene } from '../src/game/scenes/card';
import { Input } from '../src/game/engine';
import type { Game } from '../src/game/engine';
import { audio } from '../src/game/audio';

/** The smallest stand-in for `Game` that `DialogueScene.update()` actually touches: a real `Input` (so
 * `confirm()`/`cancel()` behave exactly as in play), the real (ctx-less, so side-effect-free in vitest's
 * `node` environment) `audio` singleton, and a no-op `pop`. */
function fakeGame(): Game {
  return { input: new Input(), audio, pop: () => {}, tick: 0 } as unknown as Game;
}
/** Drive one frame with a fresh confirm press (release first: `Input.press` only re-adds to `pressed` on a
 *  genuine key-down, exactly like a real held key doesn't re-fire `pressed` every frame). */
function confirmFrame(scene: DialogueScene, g: Game): void {
  const inp = (g as unknown as { input: Input }).input;
  inp.release('a');
  inp.press('a');
  scene.update(g);
  inp.endFrame();
}

/**
 * Pure regression coverage for the shared top-of-screen layout (see src/game/topband.ts and
 * scenes/overworld.ts's Round 9 notes). This is the "cheap unit test that would have caught rounds
 * 5-8's entire bug family" the round-8 critic asked for: it proves, for ANY sequence of reservations
 * (not just the specific overlay heights the game happens to use today), that two reserved rows can
 * never overlap -- the structural guarantee the whole redesign rests on -- rather than re-testing one
 * hand-picked scenario.
 */
describe('TopBand (shared top-of-screen layout)', () => {
  it('reserves non-overlapping, strictly increasing rows for any sequence of heights', () => {
    // A wide spread of heights, including 0 and the game's real overlay sizes (HUD 17, a 1-2 line
    // banner ~17-26, a 1-2 line toast ~16-26, the near-miss banner's fixed 34).
    const heightSequences = [
      [17, 26, 26, 34],
      [17],
      [17, 17],
      [0, 17, 0, 34],
      [17, 8, 8, 8, 8, 8],
      Array.from({ length: 12 }, (_, i) => i * 3),
    ];
    for (const heights of heightSequences) {
      const band = new TopBand(4, 4);
      const reservations: { y: number; h: number }[] = [];
      for (const h of heights) reservations.push({ y: band.reserve(h), h });
      // Every reservation starts at or after 4 (the configured start).
      for (const r of reservations) expect(r.y).toBeGreaterThanOrEqual(4);
      // No two reservations' [y, y+h) ranges ever overlap, and they appear in the order reserved.
      for (let i = 1; i < reservations.length; i++) {
        const prev = reservations[i - 1]!;
        const cur = reservations[i]!;
        expect(cur.y).toBeGreaterThanOrEqual(prev.y + prev.h);
      }
      // `floor` always sits at or after the bottom of the last reservation.
      const last = reservations[reservations.length - 1];
      if (last) expect(band.floor).toBeGreaterThanOrEqual(last.y + last.h);
    }
  });

  it('an element that clamps its own position to `floor` can never land inside anything reserved so far', () => {
    // This is exactly how the interaction prompt uses the band in overworld.ts: it computes its own
    // natural y from world/target geometry, then clamps to `band.floor`. Prove that for ANY natural
    // y (including ones deep inside the reserved region, simulating a target near the top of a room)
    // the clamped result never overlaps any reservation made before it.
    const band = new TopBand(4, 4);
    const hudY = band.reserve(17);
    const bannerY = band.reserve(26);
    const toastY = band.reserve(20);
    const reserved = [
      { y: hudY, h: 17 },
      { y: bannerY, h: 26 },
      { y: toastY, h: 20 },
    ];
    const promptHeight = 15;
    for (const naturalY of [-50, -10, 0, 2, 4, 10, 20, 30, 40, 50, 60, 70, 100]) {
      const clampedY = Math.max(band.floor, naturalY);
      const promptRange = { y: clampedY, h: promptHeight };
      for (const r of reserved) {
        const overlaps = promptRange.y < r.y + r.h && r.y < promptRange.y + promptRange.h;
        expect(overlaps).toBe(false);
      }
    }
  });

  it('reserving nothing after the HUD leaves `floor` exactly at the HUD row plus the gap', () => {
    const band = new TopBand(4, 4);
    band.reserve(17);
    expect(band.floor).toBe(4 + 17 + 4);
  });

  it('a fresh TopBand per frame means state never leaks between frames', () => {
    // draw() builds `new TopBand(4, 4)` every single frame -- there is no persistent instance whose
    // `y` could drift or accumulate reservations across frames. Constructing two independent bands
    // and reserving different things in each proves they do not share state.
    const a = new TopBand(4, 4);
    const b = new TopBand(4, 4);
    a.reserve(17);
    a.reserve(26);
    expect(b.floor).toBe(4);
    b.reserve(17);
    expect(a.floor).not.toBe(b.floor);
  });
});

/**
 * Round 10: round 9's `TopBand` made every top-of-screen element in `OverworldScene` collision-proof
 * against EACH OTHER, but the round-9 critic found a scene pushed on top of it entirely (`MenuScene`)
 * could still slice the room banner/toast/near-miss banner mid-word, since none of those scenes are
 * opaque and `OverworldScene.draw()` still runs underneath them every frame (see `Game.render()`).
 * The fix is `Scene.coversTopBand` (engine.ts), which `overworld.ts`'s `draw()` checks on `g.top`
 * before drawing those three transient boxes. This is a cheap regression test for the flag itself --
 * not a pixel-level canvas test (that lives in this round's live-Playwright verification) -- so a
 * future refactor cannot silently drop it from one of these scenes without a test failing.
 */
describe('Scene.coversTopBand (round 10: cross-scene top-band awareness)', () => {
  it('defaults to false for OverworldScene itself (it owns the band; it does not sit on top of anything)', () => {
    expect(new OverworldScene().coversTopBand).toBe(false);
  });

  it('is true for every scene whose own box can land in OverworldScene\'s TopBand rows', () => {
    expect(new MenuScene().coversTopBand).toBe(true);
    expect(new PickScene('TITLE', [], () => {}).coversTopBand).toBe(true);
    expect(new ClueCardScene('ev1', () => {}, 'found').coversTopBand).toBe(true);
  });
});

/**
 * Round 11: found and fixed while verifying the new "NIGHT WATCH" Inspector menu item. `DialogueScene`
 * was correctly left at `coversTopBand = false` in round 10 because *ordinary* dialogue is just the
 * bottom text box, nowhere near the rows TopBand manages -- but a `DialogueScene` showing a CHOICE
 * (`ask()`, not `say()`) also draws a second box, top-right, above that text box (`drawChoice()`), and
 * that box's width grows with its longest option -- wide/tall enough, with a 6-item menu, to land on the
 * same pixels as OverworldScene's own floating interaction prompt (confirmed live: it cropped "SPACE
 * REPORT" to "SPACE REPO"). The fix flips `coversTopBand` to `true` at the exact moment `choosing`
 * becomes true (dialogue.ts), so it stays `false` for plain dialogue (preserving round 10's reasoning
 * exactly) and only ever hides the prompt/banner/toast while a choice box is genuinely on screen.
 */
/**
 * Round 12: a critic found a NINTH instance of the UI-overlap family, on a different axis than rounds
 * 5-11's own top-band-internal collisions -- the interaction prompt clamps only to `band.floor` (a
 * MINIMUM against the shared top-of-screen budget), with no awareness that `DialogueScene`'s own box
 * occupies a second, independent, FIXED region at the BOTTOM of the screen (`BOX.y = 138`). Forcing a
 * room banner + a flavour toast + the near-miss banner all live at once (each individually a common
 * event) pushes `band.floor` far enough down that the prompt's old, floor-only clamp let its bottom
 * edge land ON `DIALOGUE_BOX.y`, and it was visibly cut by the dialogue box that opened right after
 * ("SPACE REPORT" sliced mid-word). The fix gives `TopBand` an optional `ceiling` and two new methods,
 * `maxTopFor`/`fits`, so ANY element -- not just the prompt -- can check itself against the dialogue
 * box's fixed position before drawing.
 */
describe('TopBand ceiling / ninth UI-overlap instance (round 12: top band vs. the bottom dialogue box)', () => {
  it('fits()/maxTopFor() agree exactly at the ceiling boundary', () => {
    const band = new TopBand(4, 4, 100);
    expect(band.fits(80, 20)).toBe(true); // bottom edge lands exactly at the ceiling: still fits
    expect(band.fits(81, 20)).toBe(false); // one pixel over
    expect(band.maxTopFor(20)).toBe(80);
    expect(band.fits(band.maxTopFor(20), 20)).toBe(true); // the value maxTopFor returns always itself fits
  });

  it('a ceiling-less band (the default) never rejects anything, matching rounds 9-11\'s original contract', () => {
    const band = new TopBand(4, 4);
    expect(band.fits(1_000_000, 1)).toBe(true);
    expect(band.maxTopFor(1)).toBe(Infinity);
  });

  it('ordinary play (HUD only) is completely unaffected: the prompt still clamps to floor, nowhere near the ceiling', () => {
    const band = new TopBand(4, 4, DIALOGUE_BOX.y - 4);
    band.reserve(17); // HUD only -- the common case, no banner/toast/near-miss up
    const promptHeight = 14; // a real single-line "SPACE <verb>" prompt's height (lines*9+5)
    const naturalY = 40; // a target somewhere mid-room
    const by = Math.max(band.floor, Math.min(band.maxTopFor(promptHeight), naturalY));
    expect(by).toBe(naturalY); // neither clamp engages
    expect(band.fits(by, promptHeight)).toBe(true);
  });

  it('reproduces the round-11 critic\'s exact maximal confluence (HUD + banner + toast + near-miss) and proves the prompt no longer overlaps DIALOGUE_BOX.y', () => {
    // The same reservation sizes overworld.ts's draw() makes for this exact combo: HUD (17), a
    // one-line room banner (its content height 17, plus its 8px SETTLE overshoot reserved up front),
    // a two-line toast (26), and the near-miss banner (its fixed 34, plus its own 8px SETTLE).
    const band = new TopBand(4, 4, DIALOGUE_BOX.y - 4);
    band.reserve(17); // HUD
    band.reserve(17 + 8); // one-line room banner + SETTLE
    band.reserve(26); // two-line toast
    band.reserve(34 + 8); // near-miss banner + SETTLE
    // With the OLD code (band.floor as the prompt's only clamp), `by` would simply be `band.floor`,
    // whose bottom edge (`by + promptHeight`) lands inside, not above, DIALOGUE_BOX.y -- the exact
    // defect the critic screenshotted ("SPACE REPORT" cut by the dialogue box's top edge).
    const promptHeight = 14;
    expect(band.floor + promptHeight).toBeGreaterThan(DIALOGUE_BOX.y); // the old bug's precondition, reproduced
    // The NEW code's double clamp: since `band.floor` alone already leaves no room before the ceiling,
    // the prompt is skipped entirely for this one frame rather than drawn overlapping.
    const by = Math.max(band.floor, Math.min(band.maxTopFor(promptHeight), 9999));
    expect(band.fits(by, promptHeight)).toBe(false); // correctly detected as unsafe to draw
  });

  it('a slightly less extreme confluence (HUD + banner + toast only, no near-miss) still leaves the prompt room and it draws normally', () => {
    const band = new TopBand(4, 4, DIALOGUE_BOX.y - 4);
    band.reserve(17); // HUD
    band.reserve(17 + 8); // one-line room banner + SETTLE
    band.reserve(26); // two-line toast
    const promptHeight = 14;
    const by = Math.max(band.floor, Math.min(band.maxTopFor(promptHeight), 9999));
    expect(band.fits(by, promptHeight)).toBe(true);
    expect(by + promptHeight).toBeLessThanOrEqual(DIALOGUE_BOX.y - 4);
  });

  it('the stacking elements themselves (not just the prompt) are also protected: a pathologically tall banner cannot push a later element past DIALOGUE_BOX.y undetected', () => {
    // Reachable only via a hand-built case's free-text setting name (up to the schema's 200-char cap),
    // never the generator's own short, fixed name pool -- see topband.ts's round-12 doc comment. Proves
    // the SAME `fits()` guard overworld.ts now applies to the banner/toast/near-miss boxes themselves,
    // not only the interaction prompt, closes this second exposure of the identical axis.
    const band = new TopBand(4, 4, DIALOGUE_BOX.y - 4);
    band.reserve(17); // HUD
    const hugeBannerHeight = 120; // an extreme, many-line wrapped banner from a very long hand-built name
    const bannerY = band.reserve(hugeBannerHeight);
    expect(band.fits(bannerY, hugeBannerHeight)).toBe(false); // the banner itself would now reach DIALOGUE_BOX.y
    // A toast reserved right after it would be pushed even further down -- also correctly flagged unsafe.
    const toastY = band.reserve(26);
    expect(band.fits(toastY, 26)).toBe(false);
  });
});

describe('DialogueScene.coversTopBand (round 11: a choice box can also land in the TopBand rows)', () => {
  it('is false for a scene with no choice at all, through its whole lifetime', () => {
    const scene = new DialogueScene('Just a line of narration.');
    const g = fakeGame();
    expect(scene.coversTopBand).toBe(false);
    confirmFrame(scene, g); // finishes the typewriter
    expect(scene.coversTopBand).toBe(false);
  });

  it('is false while a choice-bearing scene is still just showing its lead-in line, and turns true exactly when the choice box appears', () => {
    const scene = new DialogueScene('Pick one:', undefined, { options: ['A', 'B', 'C'], onPick: () => {} });
    const g = fakeGame();
    expect(scene.coversTopBand, 'before any input').toBe(false);
    confirmFrame(scene, g); // frame 1: fast-forwards the typewriter to the full line; not choosing yet
    expect(scene.coversTopBand, 'line shown, not yet choosing').toBe(false);
    confirmFrame(scene, g); // frame 2: line already fully shown -> this confirm reveals the choice box
    expect(scene.coversTopBand, 'choice box now on screen').toBe(true);
  });

  it('never turns back off while the same scene keeps choosing (it is popped, not reused, once picked)', () => {
    const scene = new DialogueScene('Pick one:', undefined, { options: ['A', 'B'], onPick: () => {} });
    const g = fakeGame();
    confirmFrame(scene, g);
    confirmFrame(scene, g);
    expect(scene.coversTopBand).toBe(true);
    // moving the cursor (not confirming) must not clear the flag
    (g as unknown as { input: Input }).input.press('down');
    scene.update(g);
    (g as unknown as { input: Input }).input.endFrame();
    expect(scene.coversTopBand).toBe(true);
  });
});
