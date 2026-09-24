/**
 * Red-herring stories, visible character traits, alibi phrasing and
 * relationship labels: everything the generator needs to build a mystery whose
 * clues only point at the killer when COMBINED.
 */

// --------------------------------------------------------------------------- traits
//
// A trait is a visible quirk that appears in a character's PUBLIC bio. Clues
// describe the trait, never a name. The killer holds three traits; each decoy
// holds two of them, so any single clue points at several people and only the
// combination (plus a false alibi) singles out the killer.

export interface TraitDef {
  id: string;
  /** Sentence appended to the public bio of everyone who has the trait. */
  bio: string;
  physical: { title: string; desc: string };
  /** {w} = witness, {wroom} = where the witness was. */
  verbal: { title: string; desc: string };
}

export const TRAITS: TraitDef[] = [
  {
    id: 'ring',
    bio: 'Never takes off a heavy signet ring.',
    physical: { title: 'Ring-shaped mark', desc: "A faint, curved imprint on the victim's sleeve: the sort of mark a heavy signet ring leaves when it grips hard." },
    verbal: { title: 'A glint of gold', desc: "{w} says: 'From {wroom} I glimpsed a hand on the rail, just before the scream, with a fat gold ring catching the light.'" },
  },
  {
    id: 'tobacco',
    bio: 'Smokes a pipe, and smells of it.',
    physical: { title: 'Fresh pipe ash', desc: 'A pinch of warm pipe ash on the floor beside the body, and a match stub that has barely stopped smouldering.' },
    verbal: { title: 'A whiff of tobacco', desc: "{w} says: 'Out by {wroom}, moments before the scream, I caught a strong whiff of pipe smoke.'" },
  },
  {
    id: 'left',
    bio: 'Is fiercely left-handed.',
    physical: { title: 'A left-handed smudge', desc: "A hurried note in the victim's pocket, its ink dragged across the page from right to left, the way only a left hand smears it." },
    verbal: { title: 'A left-handed scrawl', desc: "{w} says: 'I watched someone scribble a note just outside {wroom}. Left-handed, ink all over the cuff.'" },
  },
  {
    id: 'perfume',
    bio: 'Wears a heavy lavender scent.',
    physical: { title: 'Lingering lavender', desc: 'A heavy scent of lavender hangs about the scene, stronger than the room can explain, as if someone stood very close to the body.' },
    verbal: { title: 'A trail of lavender', desc: "{w} says: 'Someone brushed past the door of {wroom} just before the scream, and the air smelled of lavender for minutes afterwards.'" },
  },
  {
    id: 'cane',
    bio: 'Walks with a silver-topped cane.',
    physical: { title: 'Cane marks', desc: 'Two neat round marks, evenly spaced and fresh, pressed into the floor near the body: the mark of a cane, planted firmly.' },
    verbal: { title: 'Tap, tap, tap', desc: "{w} says: 'I heard a steady tap, tap, tap just outside {wroom}, and then a hurried scuffle. That was a cane, I would stake my life on it.'" },
  },
  {
    id: 'red',
    bio: 'Is rarely seen without something bright red: a scarf, a tie or a hat.',
    physical: { title: 'A red woollen thread', desc: 'A single red woollen thread, snagged on a rough edge at the scene and still swaying in the draught.' },
    verbal: { title: 'A flash of red', desc: "{w} says: 'A blur of bright red went past the door of {wroom}. A scarf, or a hat. I only saw it for a second.'" },
  },
  {
    id: 'spectacles',
    bio: 'Cannot see a thing without their spectacles, which sit low on the nose.',
    physical: { title: 'A tiny screw', desc: 'A tiny screw, the sort from the hinge of a pair of spectacles, glinting on the floor by the body.' },
    verbal: { title: 'A pair of glasses', desc: "{w} says: 'Someone stooped just outside {wroom}, patting the floor and muttering that they could not see without their glasses.'" },
  },
  {
    id: 'flask',
    bio: 'Carries a silver hip flask and offers it to everybody.',
    physical: { title: 'Spilled rye', desc: 'A splash of spilled rye whiskey on the floor at the scene, and the sweet smell of it hanging in the air.' },
    verbal: { title: 'A nip of whiskey', desc: "{w} says: 'Someone hurried past {wroom} smelling strongly of rye whiskey, with a flask still in hand.'" },
  },
  {
    id: 'watch',
    bio: 'Checks a pocket watch every few minutes.',
    physical: { title: 'A broken watch chain', desc: 'A broken link of watch chain lying on the floor at the scene, its tiny clasp bent open.' },
    verbal: { title: 'Ticking', desc: "{w} says: 'I heard someone pause outside {wroom} and snap a pocket watch shut. Then they hurried on, muttering about being late.'" },
  },
  {
    id: 'gloves',
    bio: 'Wears gloves indoors and out.',
    physical: { title: 'No fingerprints', desc: 'A clean, careful absence of fingerprints on everything that mattered at the scene: whoever handled it wore gloves.' },
    verbal: { title: 'Gloved hands', desc: "{w} says: 'Somebody passed the open door of {wroom}, and I noticed because it was so odd: gloves, on a warm evening, indoors.'" },
  },
];

// --------------------------------------------------------------------------- alibis

/** {others} = the companions, {room}, {t1}, {t2}. */
export const ALIBI_GROUP = [
  'From {t1} until the scream, you were in {room} with {others}, losing badly at cards. You can all vouch for one another.',
  'You spent {t1} to {t2} in {room} with {others}, arguing about the seating plan. Every one of you will confirm every heated word.',
  'You and {others} were together in {room} from {t1}, hunting for the good candles. You found them, eventually, and can swear to it.',
  'Between {t1} and {t2} you were sharing a bottle of something suspicious with {others} in {room}. It cost you dearly, and gave you an excellent alibi.',
  'You were in {room} with {others} at {t1}, gossiping about the guest list. None of you left until the scream, and all of you will say so.',
  'From {t1}, you and {others} were in {room}, rehearsing a toast that never quite worked. Any of the group can swear to it.',
  'You spent the crucial hour in {room} with {others}, fixing a jammed door, badly. Between you there are splinters enough for proof.',
  'You were with {others} in {room} from {t1}, pretending to admire the decor and quietly hating it. Everyone in the group can vouch for the rest.',
];

export const ALIBI_LONER = [
  'From {t1} until the scream, you were alone in {room}, reading. Nobody saw you there, but it is the truth.',
  'You spent {t1} to {t2} writing letters in {room}, entirely on your own. There is no one to confirm it, but it is true.',
  'You took a walk to clear your head and ended up alone in {room} at {t1}. Nobody saw you, and you cannot prove it.',
  'You had a headache from {t1} and lay down in {room}, alone in the dark. Nobody can vouch for you, but it is what happened.',
  'You were alone in {room} from {t1} to {t2}, polishing your shoes. It is dull, and it is true, and no one saw it.',
  'You were in {room} at {t1}, alone, staring out of the window and contemplating your life choices. It is the honest truth.',
];

export const ALIBI_KILLER = [
  'You claim to have spent {t1} to {t2} alone in {room}, reading. Nobody can confirm it.',
  'You say you were writing letters in {room} from {t1}, entirely on your own. There is no one to vouch for you.',
  'You insist you took a walk to clear your head and were sitting alone in {room} at {t1}. Nobody saw you there.',
  'You claim a headache kept you lying alone in {room} from {t1}. No one can confirm it.',
  'You say you were polishing your shoes alone in {room} between {t1} and {t2}. The room was quiet, and empty of company.',
  'You insist you were staring out of the window in {room} at {t1}, alone and lost in thought. Nobody can say otherwise, you hope.',
];

/** The witness briefly leaves the group; the group mentions it too. {tw} {kroom} {w}. */
export const EXCURSION_SELF = 'Around {tw} you slipped out for a few minutes and cut through {kroom} on your way, then went straight back.';
export const EXCURSION_OTHERS = '{w} slipped out for a few minutes around {tw}, then came straight back.';

// --------------------------------------------------------------------------- relationships

export const REL_PUBLIC = [
  'business partner of', 'bitter rival of', 'former colleague of', 'neighbour of', 'godparent to', 'old school friend of',
  'distant cousin of', 'sometime travelling companion of', 'dinner-party nemesis of', 'regular sparring partner of',
];
export const REL_PRIVATE = [
  'owes a large debt to', 'is quietly blackmailing', 'shares a guilty secret with', 'witnessed something shameful involving',
  'is secretly spying on', 'has been lying to', 'secretly admires', 'is planning a surprise for', 'once covered for',
];

/** Setting-specific public relationship labels. */
export const SETTING_RELS: Record<string, string[]> = {
  manor: ['regular bridge opponent of', 'fellow committee member with', 'shooting-party rival of', 'dance partner of'],
  liner: ['cabin neighbour of', 'dinner-table companion of', 'deck-chair neighbour of', 'shuffleboard rival of'],
  lodge: ['ski-lift companion of', 'chalet roommate of', 'après-ski drinking partner of', 'slope rival of'],
  studio: ['former co-star of', 'ex-director of', 'trailer neighbour of', 'screen-test rival of'],
  restaurant: ['line-cook mentor to', 'supplier to', 'former apprentice of', 'station neighbour of'],
  train: ['compartment neighbour of', 'card-game partner of', 'fellow traveller with', 'dining-car table companion of'],
  club: ['regular at the bar with', 'dance partner of', 'poker-table rival of', 'old bootlegging partner of'],
  theatre: ['duet partner of', 'understudy to', 'stage-door rival of', 'dressing-room neighbour of'],
  fete: ['tombola rival of', 'fellow committee member with', 'jam-contest rival of', 'neighbour across the hedge from'],
  gallery: ['former gallery-mate of', 'auction rival of', 'studio neighbour of', 'patron of'],
  station: ['bunkmate of', 'fellow overwinterer with', 'lab partner of', 'chess opponent of'],
  riverboat: ['poker rival of', 'deckhand mate of', 'fellow passenger with', 'old river partner of'],
};

// --------------------------------------------------------------------------- red-herring stories

export interface StoryDef {
  /** Second-person secret on the suspect's own sheet. */
  secret: string;
  tellTitle: string;
  /** {c} {other} {v} {place} {room} */
  tell: string;
  tellKind: 'physical' | 'verbal';
  whyPlausible: string;
  debunkTitle: string;
  debunkDesc: string;
  debunkKind: 'physical' | 'verbal';
  note: string;
  /** Needs {other}: only assigned to suspects who have alibi companions. */
  group: boolean;
  /** Mentions blood or violence: skipped when the victim was poisoned. */
  violent?: boolean;
  /** Private relationship label toward {other} implied by the story. */
  rel?: string;
}

export const GENERIC_STORIES: StoryDef[] = [
  { group: true, rel: 'is secretly taking dance lessons from', secret: 'You have been secretly taking dance lessons from {other}, and you burn every note about them.', tellTitle: 'Burnt-edge note', tell: "A half-burned note in {c}'s handwriting: 'Same place, after everyone is asleep. Burn this.'", tellKind: 'physical', whyPlausible: 'It reads like a conspiracy, and it is dated the day before {v} died.', debunkTitle: 'The reply, unburned', debunkDesc: "The other half of the exchange, from {other}: 'Bring your dancing shoes. I still cannot waltz without a teacher.' The midnight meetings were dance lessons.", debunkKind: 'physical', note: '{c} and {other} were secretly rehearsing a surprise dance for the party. Embarrassment, not murder.' },
  { group: false, secret: "You have been quietly selling {v}'s belongings to pay off a debt.", tellTitle: 'Pawn ticket', tell: "A pawn ticket for a silver candlestick stamped with {v}'s crest, found in {c}'s coat pocket.", tellKind: 'physical', whyPlausible: 'Where there is theft, there is often murder: {v} could easily have found out.', debunkTitle: 'A forgiving letter', debunkDesc: "A letter in {v}'s own hand, found at the bottom of a drawer: 'I know about the pawn tickets and I do not mind. Do not tell anyone I am soft.'", debunkKind: 'physical', note: '{v} knew about the pawning all along and forgave {c}. The theft is a motive that never was.' },
  { group: false, secret: 'You are secretly writing a tell-all memoir about everyone here.', tellTitle: 'The manuscript', tell: "A half-typed manuscript titled 'They All Deserved It', with {v}'s name in the very first chapter.", tellKind: 'physical', whyPlausible: 'The title alone is damning, and the first chapter is a very unflattering portrait of {v}.', debunkTitle: 'The dedication page', debunkDesc: "The final page of the manuscript: 'For {v}, the only honest one among us, without whom this book would not exist.' The book is a tribute.", debunkKind: 'physical', note: 'The memoir is an affectionate tribute. {c} was hiding it as a surprise for {v}.' },
  { group: false, secret: 'You are travelling under a borrowed name.', tellTitle: 'A second passport', tell: "A passport bearing {c}'s photograph and a completely different name, tucked inside a hollowed-out book.", tellKind: 'physical', whyPlausible: 'Someone using a false name plainly has something to hide.', debunkTitle: "Solicitor's letter", debunkDesc: "A solicitor's letter confirming that {c} legally took a new name in order to claim an eccentric aunt's estate. Absurd, legal, and entirely unrelated to {v}.", debunkKind: 'physical', note: "{c}'s alias is a legal, ridiculous inheritance condition with nothing to do with the murder." },
  { group: false, violent: true, secret: 'You have been secretly hiding a stray dog in {place}.', tellTitle: 'Muddy paw prints', tell: "A trail of muddy prints and drops of blood leading from {place} straight to {c}'s door.", tellKind: 'physical', whyPlausible: 'Blood, a trail and a door: it does not look good.', debunkTitle: 'Veterinary receipt', debunkDesc: "A veterinary bill made out to {c}: 'One stray dog, cut paw, three stitches.' The blood is the dog's, and the dog, it turns out, is called Biscuit.", debunkKind: 'physical', note: "The blood was the stray dog's. {c} was smuggling a wounded animal upstairs." },
  { group: false, secret: 'You are buried in gambling debts and hope nobody notices.', tellTitle: 'Threatening letter', tell: "A threatening letter from a bookmaker to {c}: 'Pay what you owe by midnight, or we call on you personally.'", tellKind: 'physical', whyPlausible: 'A desperate, indebted person could do desperate things.', debunkTitle: 'Paid in full', debunkDesc: 'A receipt stamped PAID IN FULL and dated before {v} died: {c} won the money back at cards the week before.', debunkKind: 'physical', note: 'The debt was cleared before the murder, so the desperation is gone.' },
  { group: true, secret: 'You had a bitter argument with {v} earlier that evening and told nobody.', tellTitle: 'The earlier argument', tell: "{other} says: 'Before dinner I saw {c} arguing quietly with {v} on the stairs. {c} stormed off looking furious.'", tellKind: 'verbal', whyPlausible: 'The last person known to quarrel with the victim is always a suspect.', debunkTitle: 'The end of the argument', debunkDesc: "{other} adds: 'I stayed to the end of it. {v} said, \"Thank you, dear, I feel so much better,\" and hugged {c} before {c} left.'", debunkKind: 'verbal', note: "The 'argument' ended in a hug. {c} was apologising, and {v} accepted." },
  { group: false, secret: 'You are being paid, in cash, to watch the grounds and report back.', tellTitle: 'Envelope of cash', tell: "A thick envelope of banknotes in {c}'s luggage, with a note: 'For services rendered. Keep watching.'", tellKind: 'physical', whyPlausible: 'Paid to watch, and the victim was watched. It ties together too neatly.', debunkTitle: 'The owl society', debunkDesc: "A membership card and letter from the Rare Owl Society: {c} is paid to count the owls nesting nearby. 'Keep watching' means the owls.", debunkKind: 'physical', note: '{c} is a paid bird-watcher. The owls are the only ones being watched.' },
  { group: false, secret: 'You forged a signature last month.', tellTitle: 'The suspicious signature', tell: "A document bearing {v}'s signature, the ink still suspiciously fresh, and in a handwriting expert's opinion not written by {v}.", tellKind: 'physical', whyPlausible: 'Forgery for profit, and {v} may have discovered it.', debunkTitle: 'Donation cheque', debunkDesc: "The forgery is a hospital donation cheque: {c} paid the donation from their own pocket and signed {v}'s name so that {v} would look generous.", debunkKind: 'physical', note: 'The forgery was a generous, slightly bonkers act of charity.' },
  { group: true, rel: 'secretly in love with', secret: 'You are secretly in love with {other}, and have been drafting a confession.', tellTitle: 'Torn love letter', tell: "A torn half of a letter in {c}'s handwriting: 'You will never know what I would do for you.'", tellKind: 'physical', whyPlausible: 'Obsession looks a lot like motive, especially when the letter is torn and scribbled over.', debunkTitle: 'The other half of the letter', debunkDesc: "The torn half found in the grate: '...and that is why I have decided to simply ask {other} to dinner. Wish me luck.'", debunkKind: 'physical', note: 'It was a nervous love letter to {other}, nothing to do with {v}.' },
  { group: false, secret: 'You have been fiddling the household accounts by small amounts.', tellTitle: 'The altered ledger', tell: "An account ledger with {c}'s handwriting altering figures on the day {v} asked to see the books.", tellKind: 'physical', whyPlausible: 'Embezzlement gives {c} a strong reason to silence {v}.', debunkTitle: "Jeweller's receipt", debunkDesc: "A jeweller's receipt for an engraved pocket watch ordered for {v}, paid for in small, oddly precise sums. {c} was saving for a birthday present.", debunkKind: 'physical', note: "{c}'s 'embezzlement' was a saved-up surprise gift for {v}." },
  { group: true, rel: 'secretly in love with', secret: 'You planned to propose to {other} tonight.', tellTitle: 'The empty ring box', tell: "An empty velvet ring box bearing {c}'s initials, found beside a poured glass of champagne near {place}.", tellKind: 'physical', whyPlausible: 'An empty box, a poured drink and a secret plan look a lot like a plot.', debunkTitle: 'A ring in the dessert', debunkDesc: "{other} announces that the ring turned up in a pudding, and adds, glowing: 'I said yes. That box was never sinister, just nerves.'", debunkKind: 'verbal', note: '{c} was about to propose. The ring, the box and the champagne were all for {other}.' },
  { group: false, secret: "You have been reading other people's post.", tellTitle: 'Steamed-open letters', tell: "A stack of letters addressed to {v}, all recently steamed open and resealed, in a drawer in {c}'s room.", tellKind: 'physical', whyPlausible: 'A snoop knows too much, and {v} may have caught {c} at it.', debunkTitle: "The postmaster's note", debunkDesc: "A note from the village postmaster: 'Dear {c}, thank you for taking the mis-delivered mail off my hands and steaming the envelopes flat again before returning them.'", debunkKind: 'physical', note: 'The letters were misdelivered mail that {c} was quietly straightening out.' },
  { group: true, secret: 'You went out into the garden after tea and tracked mud through the house.', tellTitle: 'Muddy footprints', tell: "Muddy footprints, matching {c}'s boots exactly, running from {place} across the floor to a locked door.", tellKind: 'physical', whyPlausible: 'The footprints put {c} near the scene at the wrong moment.', debunkTitle: 'Rescue at the rain tank', debunkDesc: "{other} says: 'Those footprints are {c}'s, but they are from this afternoon. {c} helped rescue a kitten from the rainwater tank and tracked mud everywhere.'", debunkKind: 'verbal', note: 'The footprints pre-date the murder by hours. A kitten rescue, not a killing.' },
];

/** Stories tied to a particular setting (two-ish each). */
export const SETTING_STORIES: Record<string, StoryDef[]> = {
  manor: [
    { group: false, secret: 'You took the wine-cellar key to smuggle out a bottle for a surprise toast.', tellTitle: 'Missing cellar key', tell: "The wine-cellar key, still cold, found in {c}'s coat pocket beside a cobwebbed cork.", tellKind: 'physical', whyPlausible: 'The key was missing from its hook all evening, and cellars are where secrets get buried.', debunkTitle: 'A birthday label', debunkDesc: "A gift tag tied to a dusty bottle of vintage port: 'For {v}'s birthday, with love, from {c}.'", debunkKind: 'physical', note: 'The cellar key was for a birthday surprise, not a crime.' },
    { group: true, secret: "You use the servants' staircase to dodge {v}'s long lectures.", tellTitle: 'The hidden stair', tell: "Fresh scuff marks on the hidden servants' door, and {c}'s handkerchief caught in the latch.", tellKind: 'physical', whyPlausible: 'A secret way in and out of the house is exactly what a killer would use.', debunkTitle: 'Everyone uses the back stairs', debunkDesc: "{other} says: 'Everybody knows {c} slips down the back stairs to dodge {v}'s lectures. I have seen the whole household do it at one time or another.'", debunkKind: 'verbal', note: 'The back stairs are a well-known dodge, not an escape route.' },
  ],
  liner: [
    { group: false, secret: 'You have been sleeping in a lifeboat to escape a very noisy neighbour.', tellTitle: 'The lifeboat blanket', tell: "A blanket, a flask and a paperback tucked under a lifeboat's canvas cover, with {c}'s initials stitched on the blanket.", tellKind: 'physical', whyPlausible: 'Somebody has been hiding on the deck where the victim was last seen.', debunkTitle: 'A steward\'s complaint slip', debunkDesc: "A steward's slip: 'Passenger {c} reports noisy neighbours and requests a quieter berth. Request declined.'", debunkKind: 'physical', note: '{c} was just escaping a noisy neighbour.' },
    { group: false, secret: 'You sent a radiogram to a rival shipping line.', tellTitle: 'A carbon radiogram', tell: "A carbon copy of a radiogram to a rival shipping line: 'Situation favourable. Expect changes soon. {c}'", tellKind: 'physical', whyPlausible: 'Selling secrets to a rival is a fine reason for {v} to want silence, or for someone to want {v} gone.', debunkTitle: 'The rival line replies', debunkDesc: "The rival line's reply, tucked in a book: 'Thank you for your application. We regret to inform you that we have no vacancies for a cabin steward at this time.'", debunkKind: 'physical', note: '{c} was job-hunting, not spying.' },
  ],
  lodge: [
    { group: false, secret: 'You took the lodge snowmobile out at dusk without asking.', tellTitle: 'Snowmobile tracks', tell: "Fresh snowmobile tracks and a set of boot prints leading from the shed to {c}'s window.", tellKind: 'physical', whyPlausible: 'Fresh tracks in the snow mean somebody came and went in secret.', debunkTitle: 'The rental slip', debunkDesc: "A rental slip signed by {v}: 'Snowmobile to {c}, two hours, fee waived for a friend.'", debunkKind: 'physical', note: 'The ride was permitted, and even free.' },
    { group: false, secret: 'You have been using the hot tub after hours.', tellTitle: 'Wet towel and slipper', tell: "A wet towel, a used glass and a sodden slipper by the sauna door; the slipper matches {c}'s pair.", tellKind: 'physical', whyPlausible: 'Someone was near the sauna at the wrong time.', debunkTitle: 'The night log', debunkDesc: "The lodge incident log: 'After-hours hot tub use by {c}, approved by the night manager as therapeutic for a sore back.'", debunkKind: 'physical', note: 'A perfectly innocent soak.' },
  ],
  studio: [
    { group: false, secret: 'You did a secret screen test for a rival studio.', tellTitle: 'A rival call sheet', tell: "A crumpled call sheet from a rival lot with {c}'s name circled and '9 AM sharp' scrawled in the margin.", tellKind: 'physical', whyPlausible: 'Betrayal by a contract player is a classic studio motive.', debunkTitle: 'The telegram', debunkDesc: "A telegram from the rival lot: 'Your screen test was dreadful. Please do not call us.'", debunkKind: 'physical', note: '{c} tried and failed to defect.' },
    { group: false, violent: true, secret: 'You borrowed a prop revolver to scare an old rival.', tellTitle: 'The prop revolver', tell: "A revolver in {c}'s costume trunk, a fresh smear of black powder on the barrel.", tellKind: 'physical', whyPlausible: 'A gun and a grudge make a persuasive pair.', debunkTitle: "The prop master's ledger", debunkDesc: "The prop master's checkout ledger: 'Revolver number 4 to {c}, for scene rehearsal. Blanks only.'", debunkKind: 'physical', note: 'The gun was a prop that fires blanks.' },
  ],
  restaurant: [
    { group: false, secret: 'You have been photographing the secret recipe book.', tellTitle: 'A hidden camera', tell: "A tiny camera hidden in a flour tin, half its film used, with {c}'s fingerprints on it.", tellKind: 'physical', whyPlausible: 'Stealing recipes is a betrayal worth killing over in this trade.', debunkTitle: 'The photographs', debunkDesc: "The developed pictures: {c}'s grandmother's handwritten recipes, gathered for a tribute cookbook.", debunkKind: 'physical', note: '{c} was photographing family recipes, not stealing secrets.' },
    { group: false, secret: 'You have been quietly moonlighting at a rival restaurant.', tellTitle: "A rival's chef jacket", tell: "A chef's jacket embroidered with a rival restaurant's name, hidden in {c}'s locker.", tellKind: 'physical', whyPlausible: 'Double-crossing the owner gives {c} a reason to fear discovery.', debunkTitle: 'Charity flyer', debunkDesc: "A charity flyer: 'Pop-up soup kitchen every Tuesday at St. Brendan's, guest chef {c}.' The rival kitchen lends the jackets.", debunkKind: 'physical', note: 'Moonlighting turned out to be volunteering.' },
  ],
  train: [
    { group: false, secret: 'You let an unticketed nephew sleep in your compartment.', tellTitle: 'A second toothbrush', tell: "A second toothbrush, a crumpled ticket for the wrong destination and somebody else's coat in {c}'s compartment.", tellKind: 'physical', whyPlausible: 'Somebody is hiding somebody on the train.', debunkTitle: "The porter's note", debunkDesc: "A porter's note: 'Passenger {c}'s nephew, unticketed, permission granted by the conductor. Fare waived.'", debunkKind: 'physical', note: 'A stowaway nephew, allowed on with permission.' },
    { group: false, secret: "You looked at the victim's diamond case out of pure curiosity.", tellTitle: 'Scratches on the case lock', tell: "Fine scratches around the lock of the diamond case, and a bent hairpin found in {c}'s hat.", tellKind: 'physical', whyPlausible: 'Someone tried to force the case open.', debunkTitle: 'The sticking lock', debunkDesc: "A note in {v}'s hand: 'The lock sticks. Half the carriage has tried it with pins. Must have it mended.'", debunkKind: 'physical', note: 'Half the carriage fiddled with that lock.' },
  ],
  club: [
    { group: false, secret: 'You run a small card game in the coat-check.', tellTitle: 'The marked deck', tell: "A stack of chips and a deck behind the coat rack, with {c}'s cufflinks tangled in the ribbon.", tellKind: 'physical', whyPlausible: 'A side game skims money from the owner.', debunkTitle: 'The tournament sheet', debunkDesc: "A sign-up sheet in {c}'s handwriting: 'Thursday bridge, penny stakes, tea and biscuits. All welcome.'", debunkKind: 'physical', note: 'The game was a very sedate bridge night.' },
    { group: false, secret: 'You write admiring notes to the bandleader.', tellTitle: 'A perfumed note', tell: "A perfumed note to the bandleader: 'I would do anything to stay close to you. Anything.' Signed with {c}'s initial.", tellKind: 'physical', whyPlausible: 'Obsession plus a jealous owner is trouble.', debunkTitle: "The bandleader's reply", debunkDesc: "The bandleader's reply pinned to the noticeboard: 'Of course you can have the trombone solo on Friday!'", debunkKind: 'physical', note: '{c} was begging for a solo.' },
  ],
  theatre: [
    { group: false, secret: 'You have been rewriting your lines in the prompt book.', tellTitle: 'The scribbled prompt book', tell: "The prompt book with {v}'s lines scribbled over and a furious note in {c}'s hand: 'Not on my watch.'", tellKind: 'physical', whyPlausible: 'A furious note about the victim is a hard thing to explain.', debunkTitle: "The director's margin note", debunkDesc: "The director's note in the margin: 'Yes to all of {c}'s cuts. Much better.'", debunkKind: 'physical', note: 'The fury was about a line, not a life.' },
    { group: true, secret: 'You sneak down the trapdoor stairs to dodge the autograph hunters.', tellTitle: 'The trapdoor stair', tell: "Fresh sawdust and lamp oil on the trapdoor steps, and {c}'s scarf snagged on the rail.", tellKind: 'physical', whyPlausible: 'A hidden route under the stage is perfect for a killer.', debunkTitle: 'A regular shortcut', debunkDesc: "{other} says: '{c} always sneaks down the trapdoor stairs to dodge the autograph hunters. The whole company knows.'", debunkKind: 'verbal', note: 'Everybody knows about the trapdoor shortcut.' },
  ],
  fete: [
    { group: false, secret: 'You have been feeding jam from the winning entries to your prize pig.', tellTitle: 'Jam-smeared trotter prints', tell: "Sticky, jam-smeared prints leading from the produce marquee to {c}'s van.", tellKind: 'physical', whyPlausible: 'Tampering with the prize entries is the sort of scandal worth a threat.', debunkTitle: 'A pig-club receipt', debunkDesc: "A receipt from the Pig Fanciers' Club: 'Surplus jam, kindly donated by {c}, £3.'", debunkKind: 'physical', note: 'Only surplus jam went to the pig.' },
    { group: false, secret: 'You swapped the tombola tickets so a friend could win the teddy.', tellTitle: 'The doctored tombola drum', tell: "A handful of tombola tickets bearing {c}'s handwriting, tucked inside the drum's false bottom.", tellKind: 'physical', whyPlausible: 'Rigging the raffle is petty crime, and {v} ran the raffle.', debunkTitle: 'Friend\'s thank-you card', debunkDesc: "A thank-you card: 'Dearest {c}, the teddy is adorable, but next year please let me win fair and square!'", debunkKind: 'physical', note: 'A harmless raffle fix that everyone will forgive.' },
  ],
  gallery: [
    { group: false, secret: 'You have been sneaking into the vault to admire a painting nobody knows you own.', tellTitle: 'Vault swipe log', tell: "The vault log shows {c}'s swipe card used twice this evening, once with a small smudge of oil paint.", tellKind: 'physical', whyPlausible: 'Somebody entered the vault just before the murder.', debunkTitle: 'Deed of ownership', debunkDesc: "A framed deed of loan: the small painting belongs to {c}, who is allowed to visit it whenever they like.", debunkKind: 'physical', note: '{c} was visiting their own painting.' },
    { group: false, secret: 'You have secretly been signing your own name on a forger\'s canvases.', tellTitle: 'The inked signature', tell: "A canvas in the restoration studio with {c}'s signature freshly inked beneath a famous name.", tellKind: 'physical', whyPlausible: 'Forgery is the ultimate motive in an art gallery.', debunkTitle: 'The pastiche label', debunkDesc: "A card in the studio: 'Homage in the style of the master, by {c}. Not for sale, not for authentication.'", debunkKind: 'physical', note: 'An affectionate pastiche, clearly labelled.' },
  ],
  station: [
    { group: false, secret: 'You have been hoarding chocolate in the generator shed.', tellTitle: 'The secret stash', tell: "A tin of contraband chocolate wrappers in the generator shed, and {c}'s hat forgotten on a hook.", tellKind: 'physical', whyPlausible: 'Hoarding rations in a station like this is a serious breach.', debunkTitle: 'The birthday list', debunkDesc: "A hand-lettered list: 'Chocolate for the winter birthday party. Do not tell {v}. Signed, the party committee (that is {c}).'", debunkKind: 'physical', note: 'It was birthday chocolate.' },
    { group: false, secret: 'You have been talking to someone outside the station on the radio.', tellTitle: 'The unlogged call', tell: "The radio logbook shows a twenty-minute call from {c} to an unlisted frequency, unlogged and unexplained.", tellKind: 'physical', whyPlausible: 'Secret contacts smell like sabotage.', debunkTitle: 'A ham-radio card', debunkDesc: "A ham-radio operator's card in {c}'s bunk: 'Thanks for the chat, Kevin, from your friend at the bottom of the world.'", debunkKind: 'physical', note: '{c} chats to a radio hobbyist about football.' },
  ],
  riverboat: [
    { group: false, secret: 'You keep a marked deck as a good-luck charm and never play with it.', tellTitle: 'The marked deck', tell: "A deck of cards with tiny pinpricks on the aces, found in {c}'s coat.", tellKind: 'physical', whyPlausible: 'A card cheat has a motive when the owner spots the trick.', debunkTitle: 'A sentimental note', debunkDesc: "A note pinned to the deck's box: 'Grandfather's lucky deck, for looking at only. Never, ever to be played.'", debunkKind: 'physical', note: 'A sentimental keepsake, never played.' },
    { group: false, secret: 'You have been paying the boiler crew to look the other way about a lantern.', tellTitle: 'A lantern by the boilers', tell: "A lantern and a bundle of unpaid wage slips by the boiler deck, with {c}'s initials on the tag.", tellKind: 'physical', whyPlausible: 'Bribing the crew suggests a plot on the lower deck.', debunkTitle: 'The wage-slip receipt', debunkDesc: "A receipt: 'Wages advanced to the boiler crew by {c}, with thanks, and no questions asked.'", debunkKind: 'physical', note: '{c} was quietly lending money to the crew.' },
  ],
};
