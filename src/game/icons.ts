/**
 * Clue icons: a matcher that reads a clue's title and description and picks the pixel icon that shows the object,
 * and a cached painter. The matcher is pure so coverage over the generator's whole corpus is unit-tested.
 */
import { ICONS } from './art/icons-art';

export interface IconRef {
  id: string;
  /** true when an icon made for this kind of object matched (false for the tinted paper/box/bag/bottle/tool fallbacks) */
  specific: boolean;
  /** told by a person rather than found: drawn with a speech badge */
  verbal: boolean;
}

type Rule = [RegExp, string];

/** Title rules come first (most specific to least); the same list is retried over the description. */
const RULES: Rule[] = [
  // everyday things a hand-built case might hide
  [/crowbar|jemmy|pry bar|prybar/, 'crowbar'],
  [/necklace|pendant|locket|choker/, 'necklace'],
  [/cufflink|cuff-link|brooch|earring|bracelet/, 'ring'],
  [/\bclock\b|timepiece/, 'clock'],
  [/broken window|smashed window|window pane|windowpane|shattered glass|broken glass/, 'window'],
  [/cigarette|cigar\b|\bbutt\b/, 'cigarette'],
  [/piano wire|garrote|\bwire\b/, 'wire'],
  [/teacup|tea cup|teapot/, 'mug'],
  [/blackmail|ransom/, 'ransom_note'],
  [/torn love letter|torn half of/, 'torn_letter'],
  [/other half/, 'torn_letter2'],
  [/love letter/, 'love_letters'],
  [/clipping|newspaper/, 'clipping'],
  [/spilled/, 'spill'],
  [/defaced|scratched-out/, 'photo_scratched'],
  [/final demand|demand notice/, 'threat_letter'],
  [/transfer of control|contract|agreement/, 'contract'],
  [/\bscrew\b/, 'screw'],
  [/rejection/, 'letter_x'],
  [/fingerprint|glove/, 'gloves'],
  [/lavender/, 'lavender'],
  [/\bwill\b/, 'will'],
  [/thread/, 'thread'],
  [/passport/, 'passport'],
  [/solicitor/, 'legal_letter'],
  [/left-handed/, 'smudged_note'],
  [/ring box/, 'ring_box'],
  [/ring-shaped|signet|glint of gold|ring in the/, 'ring'],
  [/signature/, 'signature'],
  [/cheque|donation/, 'cheque'],
  [/manuscript/, 'manuscript'],
  [/dedication/, 'book_page'],
  [/marked deck|deck of cards|playing cards/, 'cards'],
  [/watch chain/, 'watch_chain'],
  [/\bticking\b|pocket watch/, 'pocket_watch'],
  [/threatening|threat/, 'threat_letter'],
  [/wage/, 'coins'],
  [/lantern/, 'lantern'],
  [/paid in full/, 'receipt'],
  [/\bslip\b/, 'slip'],
  [/swipe|keycard/, 'keycard'],
  [/unlogged call|ham-radio|radio/, 'radio'],
  [/steamed/, 'steamed_letters'],
  [/burnt|half-burned/, 'burnt_note'],
  [/tap, tap|cane/, 'cane'],
  [/ledger/, 'ledger'],
  [/night log|logbook|log shows/, 'logbook'],
  [/envelope of cash|\bcash\b/, 'cash_envelope'],
  [/owl society|membership/, 'id_card'],
  [/thank-you|greeting/, 'greeting_card'],
  [/call sheet/, 'clipboard'],
  [/birthday label|gift tag/, 'gift_tag'],
  [/pastiche|\blabel\b/, 'label'],
  [/pair of glasses|spectacles/, 'glasses'],
  [/\bpaws?\b|trotter/, 'paw'],
  [/footprints?|boot prints/, 'footprints'],
  [/end of the argument/, 'hearts'],
  [/argument/, 'arguing'],
  [/pawn ticket|ticket/, 'ticket'],
  [/tombola/, 'raffle_ticket'],
  [/pipe|tobacco/, 'pipe'],
  [/telegram|radiogram/, 'telegram'],
  [/canvas|painting/, 'canvas'],
  [/stash|chocolate|wrapper/, 'chocolate'],
  [/birthday list|tournament|sign-up|\blist\b|\bsheet\b/, 'list'],
  [/perfumed/, 'perfume'],
  [/photographs?/, 'photos'],
  [/flyer/, 'flyer'],
  [/toothbrush/, 'toothbrush'],
  [/deed|ownership/, 'deed'],
  [/snowmobile|\btracks\b/, 'tracks'],
  [/camera/, 'camera'],
  [/prompt book|script/, 'script'],
  [/padlock|\block\b|hairpin/, 'padlock'],
  [/latch/, 'latch'],
  [/stairs?|shortcut|trapdoor/, 'stairs'],
  [/flash of red|red scarf|\bscarf\b/, 'scarf'],
  [/\bkey\b/, 'key'],
  [/blanket/, 'blanket'],
  [/slipper/, 'slipper'],
  [/towel/, 'towel'],
  [/chef.{0,4}jacket|apron/, 'chef_hat'],
  [/chef.s knife|\bknife\b|dagger/, 'knife'],
  [/letter opener/, 'letter_opener'],
  [/derringer/, 'derringer'],
  [/revolver|pistol|handgun/, 'revolver'],
  [/vial|poison/, 'vial'],
  [/fabric|scrap of/, 'fabric'],
  [/sauna door|ski pole/, 'ski_pole'],
  [/clamp|wrench/, 'wrench'],
  [/amuse/, 'dish'],
  [/sandbag|\brope\b/, 'rope'],
  [/nip of|hip flask|\bflask\b/, 'flask'],
  [/marrow/, 'marrow'],
  [/flute|champagne/, 'champagne_flute'],
  [/cup of coffee/, 'cup_lipstick'],
  [/\bmug\b/, 'mug'],
  [/cocoa/, 'cocoa'],
  [/cocktail/, 'cocktail'],
  [/goblet/, 'goblet'],
  [/abandoned glass|tumbler|bourbon|whisky|whiskey|\brye\b/, 'tumbler'],
  [/ice axe|\baxe\b/, 'ice_axe'],
  [/cake/, 'cake'],
  [/bronze|\bbust\b|figure|statue/, 'bust'],
  [/handkerchief/, 'handkerchief'],
  [/pocket watch|\bwatch\b/, 'pocket_watch'],
  [/glint|\bgold\b/, 'ring'],
  [/\bring\b/, 'ring'],
  [/mutter|whisper|overheard/, 'whisper'],
  [/empty room|nobody home|\bdoor\b/, 'door'],
  [/\bchair\b/, 'chair'],
  [/\bcandle\b/, 'candle'],
  [/\bbottle\b/, 'bottle'],
  [/\bhat\b/, 'hat'],
  [/coins?|money|wages?/, 'coins'],
  [/letter|envelope/, 'letter'],
  [/note|repl(?:y|ies)|memo|page/, 'note'],
  [/receipt|invoice|\bbill\b|slip/, 'receipt'],
  [/sword|blade/, 'sword'],
];

/** Descriptions are wordy, so only objects a description would name outright are trusted (not "note", "page", "door"...). */
const DESC_SKIP = new Set(['clock', 'wire', 'window', 'cigarette', 'necklace', 'crowbar', 'note', 'receipt', 'door', 'chair', 'coins', 'whisper', 'list', 'label', 'ticket', 'tracks', 'cash_envelope', 'ring', 'letter', 'slip', 'pocket_watch', 'stairs', 'lantern', 'key', 'radio']);
const DESC_RULES: Rule[] = RULES.filter(([, id]) => !DESC_SKIP.has(id));

const FAMILIES: [RegExp, string][] = [
  [/letter|note|paper|page|list|form|document|card|sheet|book|slip|memo|record|register|log/, 'gen-paper'],
  [/box|case|chest|trunk|crate|tin|drawer|locker|cabinet/, 'gen-box'],
  [/bag|sack|pouch|coat|jacket|cloth|hat|shoe|boot|apron|glove/, 'gen-bag'],
  [/bottle|glass|vial|cup|jug|flask|jar|pot|cask|barrel|drink|tea|wine/, 'gen-bottle'],
  [/tool|knife|wrench|axe|hammer|blade|weapon|pin|hook|wire|bolt|pliers|chisel|saw|shovel|screwdriver/, 'gen-tool'],
  [/gem|jewel|pearl|diamond|emerald|ruby|tiara|amulet|stone|crystal|gold|silver/, 'gen-gem'],
];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export interface ClueLike {
  title?: string;
  description?: string;
  kind?: string;
}

/** Which icon shows this clue? Pure and deterministic. */
export function clueIconFor(e: ClueLike): IconRef {
  const title = (e.title ?? '').toLowerCase();
  const desc = (e.description ?? '').toLowerCase();
  const verbal = e.kind === 'verbal';
  for (const [rx, id] of RULES) if (rx.test(title)) return { id, specific: true, verbal };
    for (const [rx, id] of DESC_RULES) if (rx.test(desc)) return { id, specific: true, verbal };
  if (verbal) return { id: 'whisper', specific: false, verbal };
  const text = `${title} ${desc}`;
  const fam = (FAMILIES.find(([rx]) => rx.test(text)) ?? [null, 'gen-box'])[1] as string;
  return { id: `${fam}:${hash(title || desc) % 8}`, specific: false, verbal };
}

export const iconName = (id: string): string => ICONS[id]?.name ?? 'Clue';
/** The designed (non-fallback) icons, for the gallery and the coverage test. */
export const SPECIFIC_ICON_IDS: string[] = Object.keys(ICONS).filter((id) => !id.includes(':'));
export const ALL_ICON_IDS: string[] = Object.keys(ICONS);
export const hasIcon = (id: string): boolean => id in ICONS;
