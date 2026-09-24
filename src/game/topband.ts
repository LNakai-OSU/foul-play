/**
 * Shared vertical layout for every top-of-screen overlay in the overworld scene (the CLUES/clock
 * HUD, the room-name banner, flavour toasts, the near-miss "JUST MISSED" banner, and the "what
 * SPACE would do" interaction prompt when it would otherwise land under the HUD).
 *
 * Why this exists (see creator-notes.md, "Round 9" for the full history): rounds 5 through 8 each
 * found a NEW instance of the same bug in `scenes/overworld.ts` -- an independently-clamped
 * top-of-screen UI box that collided with whatever else happened to be on screen, because each one
 * computed its own y from a hardcoded guess about what else might be showing (a near-miss banner
 * clamped against an assumed toast row, a toast deferred against an assumed banner row, an
 * interaction prompt floored at a constant that predated the HUD's own final size). Fixing one
 * instance never audited the others, because each used a different field name and a different
 * hardcoded number.
 *
 * This module is the single, shared authority instead. Build ONE `TopBand` per frame in `draw()`.
 * Every overlay that wants a dedicated row calls `reserve(height)`, in a fixed priority order
 * (HUD first, since it is always present; then whichever of banner/toast/near-miss are active this
 * frame), and gets back the y its own box should render at -- always exactly below everything
 * reserved before it, never a number any element invented on its own. An overlay that instead
 * floats at a position it computes itself (the interaction prompt, anchored to whatever the player
 * is facing) still calls `floor` to find out the lowest y it is safe to rise to THIS frame, so it
 * automatically respects any combination of the others without needing to know their names.
 *
 * A fifth future overlay slots in the same way: either `reserve()` its own row (if it is a generic
 * top banner/toast-like element) or clamp its own position to `floor` (if it is contextual, like
 * the prompt) -- either way it composes correctly with everything already on screen by
 * construction, with no separate audit required.
 *
 * Round 10: this discipline only ever covered collisions BETWEEN these elements, not a box belonging
 * to some other scene pushed on top of `OverworldScene` (round 9's critic report: opening the pause
 * menu sliced the room banner/toast/near-miss banner mid-word, because `MenuScene` never knew this
 * module existed). That gap is closed one level up, in `overworld.ts`'s `draw()`: it checks
 * `Scene.coversTopBand` (see `engine.ts`) on whatever is actually on top of the stack and skips
 * *drawing* (never reserving space for) these three transient boxes for that one frame if so. This
 * module's own contract is unchanged -- it is still the one authority for the relative order and
 * non-overlap of these rows among themselves.
 *
 * Round 12: every guarantee above is about the TOP of the screen only -- nothing here ever knew that
 * `DialogueScene` occupies a second, independent, FIXED region at the BOTTOM of the screen
 * (`dialogue.ts`'s `BOX.y`). A critic found the interaction prompt (the one element that floats
 * anywhere, clamped only to `floor`) landing on and getting cut by that box when an unusually tall
 * top-band stack pushed it down far enough. An audit for the same axis found the stacking elements
 * (banner/toast/near-miss) are theoretically exposed too: their absolute position is a straight sum of
 * everything reserved before them, so a long enough banner/toast (reachable only via a hand-built
 * case's free-text setting name, up to the schema's 200-char cap -- never via the generator's own
 * short, fixed name pool) could in principle push a LATER element's own box down far enough to reach
 * `BOX.y` on its own, with no interaction prompt involved at all. Fixed the same way for every element,
 * not just the prompt: an optional `ceiling` (the first y that belongs to that fixed bottom region, not
 * the shared top budget) lets any caller ask `fits(y, h)` before drawing -- exactly the same
 * "hide a would-be-cropped box rather than draw it corrupted" discipline `coveredByOverlay` already
 * uses one scene up, applied here to a second, independent screen region instead of a second scene.
 */
export class TopBand {
  private y: number;
  private readonly gap: number;
  private readonly ceiling: number;

  constructor(start = 4, gap = 4, ceiling = Infinity) {
    this.y = start;
    this.gap = gap;
    this.ceiling = ceiling;
  }

  /** Reserve `h` px of vertical space for the next overlay, in priority order. Returns its top y. */
  reserve(h: number): number {
    const y = this.y;
    this.y += h + this.gap;
    return y;
  }

  /** The first y not yet claimed by anything reserved so far this frame. */
  get floor(): number {
    return this.y;
  }

  /** The largest `y` a box of height `h` can start at while staying entirely above `ceiling`. */
  maxTopFor(h: number): number {
    return this.ceiling - h;
  }

  /** True if a box at `y` of height `h` stays entirely above `ceiling` (the fixed bottom region, if any). */
  fits(y: number, h: number): boolean {
    return y + h <= this.ceiling;
  }
}
