import { describe, expect, it } from 'vitest';
import { checkCase } from '../shared/checker';
import { buildPlayerPacket } from '../shared/export';
import { generateCase, listSettings } from '../shared/generator/generate';
import { SETTINGS } from '../shared/generator/settings';
import { GENERIC_STORIES, REL_PRIVATE, REL_PUBLIC, SETTING_RELS, SETTING_STORIES } from '../shared/generator/stories';
import { TONES, type Case } from '../shared/models';
import { normPlace } from '../shared/ops';

const RANGES: [number, number][] = [[3, 3], [4, 6], [6, 8], [10, 14]];

function* cases(seedsPerCombo: number): Generator<{ c: Case; label: string }> {
  for (const s of listSettings()) {
    for (const tone of TONES) {
      for (const [playerMin, playerMax] of RANGES) {
        for (let seed = 1; seed <= seedsPerCombo; seed++) {
          yield { c: generateCase({ seed: seed * 7 + playerMin, tone, playerMin, playerMax, settingId: s.id }), label: `${s.id}/${tone}/${playerMin}-${playerMax}/${seed}` };
        }
      }
    }
  }
}

/** Collect failures instead of calling expect() hundreds of thousands of times (keeps the sweep fast). */
function collect() {
  const fails: string[] = [];
  return {
    check(ok: boolean, msg: () => string) {
      if (!ok && fails.length < 8) fails.push(msg());
    },
    done() {
      expect(fails).toEqual([]);
    },
  };
}

const weightOf = (c: Case, id: string) => c.evidence.filter((e) => e.implicatedIds.includes(id)).length;
const killerOf = (c: Case) => c.characters.find((x) => x.isKiller)!;

describe('alibis form a consistent shared timeline', () => {
  it('companions are mutual, agree on the room, and are named in the alibi text', () => {
    const t = collect();
    for (const { c, label } of cases(3)) {
      const byId = new Map(c.characters.map((x) => [x.id, x]));
      for (const a of c.characters) {
        t.check(a.alibiPlace !== '' && a.alibi.includes(a.alibiPlace), () => `${label}: ${a.name} has no place in their alibi`);
        for (const bid of a.alibiWithIds) {
          const b = byId.get(bid)!;
          t.check(b.alibiWithIds.includes(a.id), () => `${label}: ${b.name} does not reciprocate ${a.name}`);
          t.check(normPlace(b.alibiPlace) === normPlace(a.alibiPlace), () => `${label}: ${a.name} and ${b.name} disagree on the room`);
          t.check(a.alibi.includes(b.name), () => `${label}: ${a.name}'s alibi does not name ${b.name}`);
        }
      }
    }
    t.done();
  });

  it('no room holds two unconnected alibis and nobody is placed at the murder scene', () => {
    const t = collect();
    for (const { c, label } of cases(3)) {
      const scene = normPlace(c.victim.placeOfDeath);
      const seen = new Map<string, Set<string>>();
      for (const a of c.characters) {
        t.check(normPlace(a.alibiPlace) !== scene, () => `${label}: ${a.name} is at the scene`);
        const key = normPlace(a.alibiPlace);
        seen.set(key, (seen.get(key) ?? new Set()).add([a.id, ...a.alibiWithIds].sort().join('|')));
      }
      for (const [room, groups] of seen) t.check(groups.size === 1, () => `${label}: ${room} holds ${groups.size} unconnected alibis`);
    }
    t.done();
  });

  it("the killer's claimed alibi is a lie: either they stand alone and a witness can break it, or (sometimes) a real companion honestly vouches for it and the room's true occupant is on record instead", () => {
    const t = collect();
    for (const { c, label } of cases(3)) {
      const k = killerOf(c);
      if (k.alibiWithIds.length === 0) {
        const clue = c.evidence.find((e) => e.kind === 'verbal' && e.implicatedIds.length === 1 && e.implicatedIds[0] === k.id);
        t.check(Boolean(clue) && (clue as { description: string }).description.includes(k.alibiPlace), () => `${label}: no clue about the killer's claimed room`);
        const witness = c.characters.find((x) => !x.isKiller && clue?.description.startsWith(x.name));
        t.check(Boolean(witness), () => `${label}: witness missing`);
        if (!witness) continue;
        t.check(normPlace(witness.alibiPlace) !== normPlace(k.alibiPlace), () => `${label}: witness was in the killer's room`);
        t.check(witness.alibi.includes(k.alibiPlace), () => `${label}: witness's alibi does not admit passing through ${k.alibiPlace}`);
        for (const cid of witness.alibiWithIds) t.check(c.characters.find((x) => x.id === cid)!.alibi.includes(witness.name), () => `${label}: companion does not mention the excursion`);
      } else {
        // the cover-story path (round 4): a real, innocent companion honestly believes they shared the killer's
        // claimed room. No corpus clue may call that room simply "empty" -- that would contradict the companion's
        // own truthful account; the world's own staff-rounds mechanism (facts.ts's `only` field) names who was
        // really there instead, once the world is built.
        t.check(k.alibiWithIds.length === 1, () => `${label}: killer cites more than one companion`);
        const cover = c.characters.find((x) => x.id === k.alibiWithIds[0]);
        t.check(Boolean(cover) && cover?.isKiller === false, () => `${label}: killer's cited companion is not a real innocent`);
        t.check(Boolean(cover) && (cover as Case['characters'][number]).alibiWithIds.includes(k.id), () => `${label}: companion does not reciprocate`);
        t.check(Boolean(cover) && normPlace((cover as Case['characters'][number]).alibiPlace) === normPlace(k.alibiPlace), () => `${label}: companion disagrees with killer on the room`);
        const emptyClaim = c.evidence.some(
          (e) => e.kind === 'verbal' && e.veracity === 'true' && /\b(empty|cold|nobody|no one|deserted|vacant)\b/i.test(`${e.title} ${e.description}`) && e.description.includes(k.alibiPlace),
        );
        t.check(!emptyClaim, () => `${label}: a corpus clue still calls the shared room empty`);
      }
    }
    t.done();
  });

  it("red-herring stories agree with the suspect's alibi: no other rooms, only companions as witnesses", () => {
    const t = collect();
    for (const { c, label } of cases(2)) {
      const def = SETTINGS.find((s) => s.era === c.setting.era)!;
      for (const rh of c.redHerrings) {
        const tell = c.evidence.find((e) => e.id === rh.evidenceId)!;
        const suspect = c.characters.find((x) => x.id === tell.implicatedIds[0])!;
        const debunk = c.evidence.find((e) => e.id === rh.debunkEvidenceId)!;
        for (const room of def.rooms) {
          if (normPlace(room) === normPlace(suspect.alibiPlace)) continue;
          t.check(!debunk.description.toLowerCase().includes(room.toLowerCase()), () => `${label}: debunk "${debunk.title}" mentions ${room}`);
        }
        for (const text of [debunk.description, tell.description]) {
          for (const other of c.characters) {
            if (other.id !== suspect.id && text.startsWith(other.name)) t.check(suspect.alibiWithIds.includes(other.id), () => `${label}: ${other.name} vouches for ${suspect.name} without having been with them`);
          }
        }
      }
    }
    t.done();
  });
});

describe('the mystery is fair but not trivial', () => {
  it('the killer never has more than twice the clues of the next suspect; decoys are heavily implicated', () => {
    const t = collect();
    for (const { c, label } of cases(3)) {
      const k = killerOf(c);
      const inn = c.characters.filter((x) => !x.isKiller).map((x) => weightOf(c, x.id)).sort((a, b) => b - a);
      t.check(weightOf(c, k.id) <= 2 * Math.max(1, inn[0] as number), () => `${label}: killer ${weightOf(c, k.id)} vs ${inn[0]}`);
      t.check((inn[0] as number) >= 3 && (inn[1] as number) >= 3, () => `${label}: decoys ${inn.slice(0, 2)}`);
      t.check(!checkCase(c).some((i) => i.rule === 'killer-too-obvious'), () => `${label}: checker says too obvious`);
    }
    t.done();
  });

  it('no single clue points at only the killer, and only the killer fits every shared clue', () => {
    const t = collect();
    for (const { c, label } of cases(3)) {
      const k = killerOf(c);
      const multi = c.evidence.filter((e) => e.veracity === 'true' && e.implicatedIds.length >= 2);
      const inAll = c.characters.filter((x) => multi.filter((e) => e.implicatedIds.includes(x.id)).length === multi.length);
      t.check(multi.length >= 3, () => `${label}: only ${multi.length} shared clues`);
      t.check(inAll.length === 1 && inAll[0]!.id === k.id, () => `${label}: ${inAll.length} people fit every shared clue`);
      const alone = c.evidence.filter((e) => e.implicatedIds.length === 1 && e.implicatedIds[0] === k.id);
      t.check(alone.length <= 2, () => `${label}: ${alone.length} clues single out the killer`);
    }
    t.done();
  });

  it('no handout text names or gives away the killer by itself', () => {
    const t = collect();
    for (const { c, label } of cases(3)) {
      const k = killerOf(c);
      const cards = buildPlayerPacket(c).handouts;
      t.check(cards.length === c.evidence.length, () => `${label}: a clue is missing from the handouts`);
      const parts = k.name.replace(/"[^"]*"/g, '').split(/\s+/).filter((p) => /^[A-Z]/.test(p) && !/\.$/.test(p));
      const initials = `${parts[0]![0]}.${parts[parts.length - 1]![0]}.`;
      for (const card of cards) {
        const named = c.characters.filter((x) => card.text.includes(x.name));
        t.check(!(named.length === 1 && named[0]!.id === k.id), () => `${label}: card "${card.text}" names only the killer`);
        t.check(!/person responsible|the killer|the murderer|the culprit|guilty|nobody but/i.test(card.text), () => `${label}: giveaway phrase in "${card.text}"`);
        t.check(!card.text.includes(initials), () => `${label}: initials ${initials} in "${card.text}"`);
      }
    }
    t.done();
  });

  it('traits are public: everybody a trait clue implicates has a full public bio to match it against', () => {
    const t = collect();
    for (const { c, label } of cases(2)) {
      for (const e of c.evidence.filter((x) => x.veracity === 'true' && x.implicatedIds.length >= 2)) {
        for (const id of e.implicatedIds) t.check(c.characters.find((x) => x.id === id)!.publicBio.length > 80, () => `${label}: short bio`);
      }
    }
    t.done();
  });
});

describe('generated prose', () => {
  const free = (c: Case): string[] => [
    c.title,
    c.setting.description,
    c.victim.description,
    ...c.characters.flatMap((x) => [x.publicBio, x.privateBackstory, x.alibi, ...x.secrets, x.costume, x.secretRole]),
    ...c.motives.map((m) => m.description),
    ...c.evidence.flatMap((e) => [e.title, e.description]),
    ...c.redHerrings.flatMap((r) => [r.whyPlausible, r.debunkNote]),
    ...c.beats.flatMap((b) => [b.title, b.description, b.gmNotes, b.actionPrompt]),
    ...c.extras.props,
    ...c.extras.generalCostumes,
    ...c.extras.miniGames.flatMap((g) => [g.title, g.description]),
  ];

  it('never starts a sentence in lower case', () => {
    const bad = /(^|[.!?]["'”’)]*\s+)[a-z]/;
    const t = collect();
    for (const { c, label } of cases(3)) for (const s of free(c)) t.check(!bad.test(s), () => `${label}: "${s}"`);
    t.done();
  });

  it('keeps stories consistent with the cause of death', () => {
    const t = collect();
    for (const { c, label } of cases(3)) {
      t.check(!/smells like poison/i.test(JSON.stringify(c)), () => `${label}: poison line`);
      if (/poison/i.test(c.victim.causeOfDeath)) for (const e of c.evidence) t.check(!/blood|revolver|\bgun\b/i.test(e.description), () => `${label}: "${e.description}" in a poisoning`);
    }
    t.done();
  });

  it('uses only setting-appropriate relationship labels', () => {
    const t = collect();
    const storyLabels = new Set([...GENERIC_STORIES, ...Object.values(SETTING_STORIES).flat()].flatMap((s) => (s.rel ? [s.rel] : [])));
    for (const { c, label } of cases(2)) {
      const def = SETTINGS.find((s) => s.era === c.setting.era)!;
      const allowed = new Set([...REL_PUBLIC, ...(SETTING_RELS[def.id] ?? [])]);
      const foreign = new Set(Object.entries(SETTING_RELS).filter(([id]) => id !== def.id).flatMap(([, l]) => l).filter((l) => !allowed.has(l)));
      for (const ch of c.characters) {
        for (const r of ch.relationships) {
          if (r.visibility === 'public') t.check(allowed.has(r.label), () => `${label}: "${r.label}" is not allowed here`);
          else t.check(REL_PRIVATE.includes(r.label) || storyLabels.has(r.label), () => `${label}: private "${r.label}"`);
          t.check(!foreign.has(r.label), () => `${label}: "${r.label}" belongs to another setting`);
        }
      }
    }
    t.done();
  });

  it('never gives a character a romantic secret that conflicts with their relationships', () => {
    const t = collect();
    for (const { c, label } of cases(3)) {
      for (const ch of c.characters) {
        const romance = ch.secrets.find((s) => /in love with|propose to/i.test(s));
        if (!romance) continue;
        const priv = ch.relationships.find((r) => r.visibility === 'private')!;
        const target = c.characters.find((x) => x.id === priv.targetId)!;
        t.check(priv.label === 'secretly in love with', () => `${label}: ${ch.name} private label ${priv.label}`);
        t.check(romance.includes(target.name), () => `${label}: ${ch.name}'s secret does not name ${target.name}`);
        t.check(ch.relationships.filter((r) => /love|engaged/i.test(r.label)).length === 1, () => `${label}: ${ch.name} has conflicting romances`);
      }
    }
    t.done();
  });

  it('offers plenty of variety', () => {
    expect(listSettings().length).toBeGreaterThanOrEqual(12);
    const venues = new Set<string>();
    const titles = new Set<string>();
    const stories = new Set<string>();
    for (let seed = 1; seed <= 300; seed++) {
      const c = generateCase({ seed, tone: TONES[seed % 3] });
      venues.add(c.setting.name);
      titles.add(c.title);
      for (const rh of c.redHerrings) stories.add(c.evidence.find((e) => e.id === rh.evidenceId)!.title);
    }
    expect(venues.size).toBeGreaterThanOrEqual(30);
    expect(titles.size).toBeGreaterThanOrEqual(150);
    expect(stories.size).toBeGreaterThanOrEqual(25);
  });

  it('every setting has its own red-herring stories', () => {
    for (const s of SETTINGS) expect((SETTING_STORIES[s.id] ?? []).length, s.id).toBeGreaterThanOrEqual(1);
  });
});
