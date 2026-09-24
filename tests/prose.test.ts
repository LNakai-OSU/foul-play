import { describe, expect, it } from 'vitest';
import { generateCase, listSettings, tidy } from '../shared/generator/generate';
import { TONES, type Case } from '../shared/models';

/** Free-text (sentence) fields. Titles, names, labels and enums are not prose. */
const PROSE_KEYS = new Set([
  'description', 'publicBio', 'privateBackstory', 'alibi', 'secrets', 'actionPrompt', 'gmNotes', 'whyPlausible', 'debunkNote', 'props', 'generalCostumes',
]);

function prose(v: unknown, key = '', out: string[] = []): string[] {
  if (typeof v === 'string') {
    if (PROSE_KEYS.has(key)) out.push(v);
  } else if (Array.isArray(v)) {
    for (const x of v) prose(x, key, out);
  } else if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) prose(x, k, out);
  }
  return out;
}

const RANGES: [number, number][] = [[3, 3], [5, 7], [10, 14]];
function* corpus(seedsPerCombo: number): Generator<{ c: Case; label: string }> {
  for (const s of listSettings()) {
    for (const tone of TONES) {
      for (const [playerMin, playerMax] of RANGES) {
        for (let seed = 1; seed <= seedsPerCombo; seed++) {
          yield { c: generateCase({ seed: seed * 11 + playerMin, tone, playerMin, playerMax, settingId: s.id }), label: `${s.id}/${tone}/${playerMin}-${playerMax}/${seed}` };
        }
      }
    }
  }
}

/**
 * Each entry is a class of prose bug. A sentence that legitimately ends in a quoted
 * exclamation and then starts a new capitalised sentence is fine; a sentence that
 * is split in the middle (`shouts "Objection!" And wins`) is not.
 */
const BUGS: Array<{ name: string; re: RegExp }> = [
  { name: 'sentence split after a quoted !/? by a lowercase continuation word', re: /[!?]["”']\s+(And|But|Or|So|To|Which|Who|Whose|While|Because|Then|As|Nor|Yet)\b/ },
  { name: 'sentence starts in lowercase', re: /(?:^|[.!?]["”')]*\s+)[a-z]/ },
  { name: 'double space', re: /\S {2,}\S/ },
  { name: 'space before punctuation', re: /\s[,.;:!?](?!\.)/ },
  { name: 'doubled punctuation', re: /,,|;;|::|(?<!\.)\.\.(?!\.)|,\.|\.,|!\.|\?\./ },
  { name: 'repeated word', re: /\b([A-Za-z]{2,})\s+\1\b/i },
  { name: 'unfilled template', re: /[{}]|undefined|NaN|\[object/ },
  { name: 'leading or trailing whitespace', re: /^\s|\s$/ },
  { name: 'unbalanced double quotes', re: /^[^"]*("[^"]*"[^"]*)*"[^"]*$/ },
];

describe('generated prose is clean', () => {
  it('tidy() capitalises real sentence starts but never splits a sentence after a quoted exclamation', () => {
    expect(tidy('Shouts "Objection!" and wins a bonus question.')).toBe('Shouts "Objection!" and wins a bonus question.');
    expect(tidy("'Who did it?' asked the maid.")).toBe("'Who did it?' asked the maid.");
    expect(tidy('It is over. the study is locked! the key is gone? yes.')).toBe('It is over. The study is locked! The key is gone? Yes.');
    expect(tidy('the study is locked.')).toBe('The study is locked.');
  });

  it('contains none of the known prose bugs across every setting, tone and player range', () => {
    const fails: string[] = [];
    let texts = 0;
    for (const { c, label } of corpus(4)) {
      for (const t of prose(c)) {
        texts++;
        for (const bug of BUGS) {
          const m = bug.re.exec(t);
          if (m && fails.length < 8) fails.push(`${label}: ${bug.name}: …${t.slice(Math.max(0, m.index - 30), m.index + 50)}…`);
        }
      }
    }
    expect(texts).toBeGreaterThan(10000);
    expect(fails).toEqual([]);
  });

  it('never repeats a whole sentence inside one text', () => {
    const fails: string[] = [];
    for (const { c, label } of corpus(3)) {
      for (const t of prose(c)) {
        const sentences = t.split(/(?<=[.!?]["”']?)\s+/).map((s) => s.trim()).filter((s) => s.length > 25);
        const dup = sentences.find((s, i) => sentences.indexOf(s) !== i);
        if (dup && fails.length < 8) fails.push(`${label}: repeated “${dup.slice(0, 70)}”`);
      }
    }
    expect(fails).toEqual([]);
  });

  it('method-dependent wording follows the cause of death', () => {
    const VIOLENT = /\b(knife|knives|blood|bloody|bloodstained|stab\w*|dagger|gun|bullets?|revolver|derringer|shot)\b/i;
    const POISONY = /\b(poison\w*|toxic|arsenic|cyanide|antidote)\b/i;
    const fails: string[] = [];
    let poisonings = 0;
    let others = 0;
    for (const { c, label } of corpus(4)) {
      const poisoned = /poison/i.test(c.victim.causeOfDeath);
      poisoned ? poisonings++ : others++;
      // role bios / secret roles / costumes may mention a profession's tools; everything else is method-driven prose
      const texts = [c.title, c.setting.description, ...c.beats.flatMap((b) => [b.title, b.description]), ...prose({ ...c, characters: c.characters.map((x) => ({ ...x, publicBio: '' })) })];
      for (const t of texts) {
        // "bad blood" is an idiom about feuds, not a wound
        const scrubbed = t.replace(/bad blood/gi, '');
        const m = (poisoned ? VIOLENT : POISONY).exec(scrubbed);
        if (m && fails.length < 8) {
          fails.push(`${label} (${c.victim.causeOfDeath}): “${m[0]}” in …${scrubbed.slice(Math.max(0, m.index - 40), m.index + 50)}…`);
        }
      }
    }
    expect(poisonings).toBeGreaterThan(20);
    expect(others).toBeGreaterThan(20);
    expect(fails).toEqual([]);
  });

  it('time-of-day wording follows the time of death', () => {
    const hourOf = (t: string) => {
      const m = /^(\d+):(\d+) (AM|PM)$/.exec(t)!;
      return (Number(m[1]) % 12) + (m[3] === 'PM' ? 12 : 0);
    };
    const fails: string[] = [];
    const seen = new Set<string>();
    for (const { c, label } of corpus(3)) {
      const h = hourOf(c.victim.timeOfDeath);
      const expected = h >= 5 && h < 12 ? 'morning' : h >= 12 && h < 17 ? 'afternoon' : h >= 17 && h < 21 ? 'evening' : 'night';
      seen.add(expected);
      for (const ch of c.characters) {
        const m = /The (morning|afternoon|evening|night) .{3,40} died, you are/.exec(ch.privateBackstory);
        if (!m || m[1] !== expected) fails.push(`${label}: ${c.victim.timeOfDeath} but backstory says ${m?.[1]}`);
      }
      if (expected === 'afternoon') {
        for (const t of [c.title, ...prose(c)]) {
          const m = /\b(tonight|evening|midnight|last night)\b/i.exec(t);
          if (m && fails.length < 8) fails.push(`${label}: daytime case says “${m[0]}” in …${t.slice(Math.max(0, m.index - 30), m.index + 40)}…`);
        }
      }
    }
    expect(fails.slice(0, 8)).toEqual([]);
    expect(seen.has('afternoon') && seen.has('night')).toBe(true);
  });

  it('a character sheet never repeats its motive text between the backstory and the suspicion list', () => {
    const fails: string[] = [];
    for (const { c, label } of corpus(2)) {
      for (const ch of c.characters) {
        for (const m of c.motives.filter((x) => x.characterId === ch.id && x.description.trim())) {
          if (ch.privateBackstory.includes(m.description)) fails.push(`${label}: ${ch.name}`);
        }
        if (/what people whisper/i.test(ch.privateBackstory)) fails.push(`${label}: ${ch.name} still has the whisper lead-in`);
      }
    }
    expect(fails.slice(0, 8)).toEqual([]);
  });
});
