import type { MotiveCategory, Tone, Trigger } from '../models';

export type ToneText = Record<Tone, string[]>;

// ----------------------------------------------------------------------------- motives

export interface MotiveDef {
  desc: ToneText;
  clueTitle: string;
  /** {c} {v} {vi} {venue} {amount} {other} */
  clueDesc: string;
  clueKind: 'physical' | 'verbal';
}

export const AMOUNTS = ['$2,500', '$4,800', '$7,200', '$12,000', '$18,500', '$25,000', '$40,000', '$65,000'];

export const MOTIVES: Record<MotiveCategory, MotiveDef> = {
  money: {
    desc: {
      comedic: ["{c} owes {v} more money than {c} could earn in three lifetimes, and {v} was cheerfully calling the loan in.", "{c} was counting on {v}'s cheque to pay off a debt collector who does not accept 'no' as an answer."],
      serious: ["{c} owed {v} a large sum and faced financial ruin when the debt was called in.", "{c} stood to lose everything if {v} demanded repayment before the end of the month."],
      noir: ["{c} was into {v} for more than a dead man could ever forgive, and the collectors were already circling.", "{c} had a debt with {v} that no honest job could pay off. Money makes people do funny things, and none of them are polite."],
    },
    clueTitle: 'Final demand notice',
    clueDesc: "A final-demand letter addressed to {c}: {amount} owed to {v}, payable by the end of the month. A sticky note in {other}'s handwriting reads: 'Do not lend {c} another penny.'",
    clueKind: 'physical',
  },
  love: {
    desc: {
      comedic: ["{c} and {v} shared a passionate, doomed and thoroughly embarrassing romance, and {c} was not taking the ending well.", "{c} loved {v} deeply, foolishly and mostly in secret, right up until {v} announced an engagement to somebody else."],
      serious: ["{c} was in love with {v}, and was devastated when {v} ended the relationship.", "{c} discovered that {v} had been unfaithful, and could not forgive the betrayal."],
      noir: ["{c} loved {v} the way you love a bad habit: hard, and knowing it would be the end of you.", "{v} broke {c}'s heart in the kind of way that leaves fingerprints."],
    },
    clueTitle: 'Bundle of love letters',
    clueDesc: "A ribbon-tied bundle of passionate letters between {v} and {c}. Pinned to the top, in {other}'s handwriting: 'Burn these before anyone finds them.'",
    clueKind: 'physical',
  },
  revenge: {
    desc: {
      comedic: ["{c} had been plotting revenge on {v} for years, mostly in the bath, and finally ran out of patience.", "{v} once ruined {c}'s reputation with a single unfortunate rumour, and {c} has never quite got over it (or the rumour)."],
      serious: ["{v} destroyed {c}'s career years ago, and {c} has never forgiven it.", "{c} blamed {v} for a family tragedy and swore to put things right."],
      noir: ["{v} took something from {c} that could not be replaced, and {c} spent years working out the price.", "Revenge is a dish best served cold, and {c} had kept this one on ice for a long, long time."],
    },
    clueTitle: 'Circled newspaper clipping',
    clueDesc: "A yellowed newspaper clipping about the ruin of {c}'s family, with {v}'s name circled three times in red ink. Beside it, in {other}'s hand: 'Let it go, {c}. Please.'",
    clueKind: 'physical',
  },
  jealousy: {
    desc: {
      comedic: ["{c} has never forgiven {v} for the year {v} won everything: the trophy, the promotion and the last slice of cake.", "{c} was consumed with envy of {v}'s success, {v}'s admirers and {v}'s, frankly, excellent hair."],
      serious: ["{c} watched {v} take the credit, the praise and the promotion that should have been theirs.", "{c} was consumed by jealousy over {v}'s standing and reputation."],
      noir: ["{c} watched {v} collect every prize in town and figured somebody ought to even the score.", "Envy is a slow burn, and {c} had been stewing over {v}'s success for years."],
    },
    clueTitle: 'Defaced photograph',
    clueDesc: "A framed group photograph in which {c}'s face has been savagely scratched out with a pin. {v} and {other} stand smiling in the middle.",
    clueKind: 'physical',
  },
  power: {
    desc: {
      comedic: ["{c} wanted to run the show and {v} kept, rudely, staying in charge.", "{v} planned to sell {venue} out from under {c}, which is an unforgivable way to treat someone who has already chosen the curtains."],
      serious: ["{c} coveted control of {venue}, and {v} stood squarely in the way.", "{v} was about to remove {c} from a position of power and influence."],
      noir: ["{c} wanted the keys to the kingdom and {v} was sitting on the throne.", "In this town power changes hands one way only, and {c} was tired of waiting for the handover."],
    },
    clueTitle: 'Draft transfer of control',
    clueDesc: "An unsigned draft handing control of {venue} from {v} to {c}, with a note in the margin: 'Once {vi} is out of the way.' A second copy, witnessed by {other}, lies underneath.",
    clueKind: 'physical',
  },
  secrecy: {
    desc: {
      comedic: ["{v} knew a truly awful secret about {c}, the kind involving a llama, a vicar and an unpaid parking fine, and threatened to tell the whole party.", "{c} had a secret so mortifying that {v}'s threat to reveal it before dessert was, frankly, worth killing over."],
      serious: ["{v} discovered a secret that would destroy {c}'s life and threatened to expose it.", "{c} was being blackmailed by {v}, and the payments had become unbearable."],
      noir: ["{v} knew where the bodies were buried, and {c} was standing on top of one.", "A secret is a lit fuse, and {v} had just handed the matches to {c}."],
    },
    clueTitle: 'Blackmail note',
    clueDesc: "A note found in {v}'s desk: 'I know what you did. Pay up, or everyone hears about it.' Beneath it is a short list of names: {c} and {other}, both underlined twice.",
    clueKind: 'physical',
  },
  inheritance: {
    desc: {
      comedic: ["{c} was named in {v}'s will and stood to inherit a fortune, plus an alarming collection of ceramic cats, if {v} died soon.", "{v} was about to rewrite the will, cutting {c} out, and {c} had precisely one evening to make sure that never happened."],
      serious: ["{c} stood to inherit a significant fortune on {v}'s death, and {v} had been changing the will.", "{c} learned that {v}'s new will would leave everything to somebody else."],
      noir: ["{c} was in the will, right up until Thursday. After Thursday, {c} was in the way.", "The will named {c} as the heir and {v} as the obstacle. Simple arithmetic."],
    },
    clueTitle: 'Copy of the will',
    clueDesc: "A copy of {v}'s current will, in which {c} and {other} each inherit a fortune, clipped to a note: 'To be revised first thing tomorrow.'",
    clueKind: 'physical',
  },
  ambition: {
    desc: {
      comedic: ["{c} had been passed over for promotion for the fourth year running and {v}, cheerfully, sat on the panel.", "{c} dreamed of fame and fortune, and {v} was the only person standing between {c} and both (and the buffet)."],
      serious: ["{c}'s career depended on {v}'s approval, and {v} was about to withdraw it.", "{c} had staked everything on a proposal that {v} planned to reject."],
      noir: ["{c} had a rung to climb and {v} was standing on it.", "Ambition is a hungry thing, and {v} was the last meal between {c} and the top."],
    },
    clueTitle: 'Rejection letter',
    clueDesc: "A curt letter from {v} to {c}, copied to {other}: 'Your proposal is rejected and your services are no longer required.' Across it, scrawled in pencil: 'We'll see about that.'",
    clueKind: 'physical',
  },
};

// ----------------------------------------------------------------------------- secrets / red herrings

export const MINOR_SECRETS = [
  "You once cheated at cards in this very place and were never caught.",
  "You are terrified of the dark and have been sleeping with the light on.",
  "You are wearing a wig, and have been for years.",
  "You secretly dislike the food and have been feeding it to the potted plants.",
  "You have read the ending of every book you have ever pretended to enjoy.",
  "You were once mistaken for someone famous and have never corrected the story.",
  "You did not actually attend the university you keep mentioning.",
  "You are the anonymous author of a fiercely critical letter to the local paper.",
  "You pocketed a small souvenir from every party you have ever attended.",
  "You cannot swim, and have been very careful never to say so.",
  "You are a lot poorer than you look.",
  "You once told a lie so big that you now have to keep track of it in a diary.",
  "You wrote a very rude poem about the host, and left it where they would find it.",
  "You are related to someone in this room and have not told them.",
];

// ----------------------------------------------------------------------------- flavour

export const QUIRKS: ToneText = {
  comedic: [
    "Is never seen without a tiny dog that is not, technically, theirs.",
    "Laughs at their own jokes a full second before delivering them.",
    "Believes every problem can be solved with tea, or failing that, a strongly worded letter.",
    "Has a nervous habit of narrating their own actions.",
    "Collects tiny spoons and grudges, in that order.",
    "Insists their cat is a tremendous judge of character.",
    "Speaks exclusively in exaggerations, and finds this a very good thing.",
    "Claims to have once been on television, briefly, in the background.",
  ],
  serious: [
    "Speaks carefully, as if every word were being recorded.",
    "Is unfailingly polite, especially when displeased.",
    "Never sits with their back to a door.",
    "Keeps a small notebook and consults it before answering questions.",
    "Has an unsettling habit of remembering everything anyone says.",
    "Rarely raises their voice, and rarely needs to.",
    "Is a fixture of local society, admired and slightly feared.",
    "Has lately been unusually quiet.",
  ],
  noir: [
    "Smokes like the world owes them a light.",
    "Has a scar nobody is allowed to ask about.",
    "Talks out of the side of the mouth, and only ever in half-truths.",
    "Has a smile that arrives a moment after the rest of the face.",
    "Never drinks alone: only in company, or in a crisis.",
    "Wears the past like an overcoat two sizes too big.",
    "Looks at every door as if it owed them money.",
    "Keeps company with the wrong sort of people, and the right sort of alibis.",
  ],
};

export const VICTIM_FLOURISH: ToneText = {
  comedic: [
    "Their last words were, allegedly, 'Who moved my cheese?'",
    "Was, by every account, tremendously talented at being disliked.",
    "Left a will as long as a grocery receipt and twice as insulting.",
    "Had been threatening to change the guest list all week.",
  ],
  serious: [
    "Was widely respected and privately feared.",
    "Had spent the evening visibly anxious, as though expecting something.",
    "Leaves behind a great many unanswered questions.",
    "Was last seen alive shortly before the lights went low.",
  ],
  noir: [
    "Had enemies the way other people have hats: several, and each for a reason.",
    "Never looked over their shoulder. That was the mistake.",
    "Died the way they lived: expensively, and in front of witnesses.",
    "Was the kind of person who made a room quieter just by leaving it.",
  ],
};

export const TITLE_PATTERNS: ToneText = {
  comedic: ['Murder Most Fowl at {S}', 'Dead Wrong at {S}', 'A Fatal Faux Pas at {S}', 'Death Takes a Buffet at {S}', 'To Die For: Trouble at {S}', 'Too Many Cooks, One Corpse', 'Killer Party at {S}', 'The Deceased Requests the Pleasure of Your Company'],
  serious: ['Death at {S}', 'The {B} Affair', 'Nobody Leaves {S}', 'Last Night at {S}', 'The Silence at {S}', 'A Fatal Evening at {S}', 'Shadows Over {S}'],
  noir: ["Dead Man's Hand at {S}", 'Rain on {S}', 'The Long Goodnight at {S}', 'A Dame, a Secret and {S}', 'Cold Cash, Colder Corpse', 'Bad Blood at {S}', 'Smoke and Mirrors at {S}', 'Nobody Sings at {S}'],
};

export const TONE_PROPS: Record<Tone, string[]> = {
  comedic: ['Kazoos for dramatic reveals', 'A rubber chicken (for accusations)', 'Fake moustaches for disguises'],
  serious: ['A visible clock for the countdown rounds', 'Sealed envelopes for each clue'],
  noir: ['A desk lamp for interrogation lighting', 'A moody jazz playlist', 'A fedora or two for atmosphere'],
};

export const COMMON_PROPS = ['Printed character sheets (one per player)', 'Cut-apart clue cards', 'Pens and slips of paper for accusations', 'Name tags'];

export const TONE_DRESS: Record<Tone, string> = {
  comedic: 'The sillier the better: exaggerate every costume until it nearly hurts.',
  serious: 'Dress as if the evening matters, because tonight, it does.',
  noir: 'Dark colours, hats and shadows: nobody looks entirely trustworthy.',
};

export interface MiniGameDef {
  title: string;
  description: string;
}

export const MINI_GAMES: MiniGameDef[] = [
  { title: 'Alibi Bingo', description: 'Give each player a bingo card of alibi details. The first player to spot five matching statements in the room stands up, shouts "Objection!", and wins a bonus question.' },
  { title: 'The Line-Up', description: 'Three players stand behind a blanket and read a scripted line in disguised voices. The rest guess who said what.' },
  { title: 'Cipher Note', description: 'Hide a short note in a simple Caesar cipher (shift by 3). The first pair to crack it earns the right to ask the GM any one yes/no question.' },
  { title: 'Truth or Bluff', description: 'Each player reads one statement about their character. The table votes on whether it is true or a bluff. Bluffers score points for every table member they fool.' },
  { title: 'The Scavenger Sweep', description: 'Hide five small objects around the room. Teams race to find them all while staying in character.' },
  { title: 'Two Truths and a Motive', description: 'Each player states two true facts about themselves and one invented motive. The table guesses which is the lie.' },
  { title: 'The Blindfold Taste Test', description: 'Volunteers taste unlabelled harmless snacks blindfolded and must identify them. (Nobody dies, we promise.)' },
  { title: 'The Whisper Chain', description: 'Start a short, ridiculous rumour at one end of the room and let it travel from ear to ear. The last player says it aloud, and the GM reveals how far it drifted from the original.' },
  { title: 'Guess the Prop', description: 'Put five household objects in a bag. One at a time, players feel inside and describe an object without naming it. The table guesses, and the best in-character description wins a point.' },
  { title: 'Sworn Statement', description: 'Each player writes one sentence about where they were during the alibi window on a slip of paper. The GM reads them aloud, and the table votes on which one sounds least true.' },
  { title: 'The Mugshot Round', description: 'Everyone strikes a dramatic mugshot pose in character. The table votes for the most guilty-looking face, and that player must answer one question honestly.' },
  { title: 'Fingerprint Match', description: 'Ink a few thumbprints in advance and hide the originals. Teams compare and match each print to its owner using nothing but eyes and suspicion.' },
];

// ----------------------------------------------------------------------------- timeline

export interface BeatDef {
  key: string;
  title: Record<Tone, string>;
  desc: Record<Tone, string>;
  round: number;
  trigger: Trigger;
  timerMin?: number;
  /** minutes after the previous beat in game time */
  gap: number;
  notes: string;
  optional?: boolean;
}

export const BEAT_DEFS: BeatDef[] = [
  {
    key: 'arrive', round: 0, trigger: 'manual', gap: 0,
    title: { comedic: 'Arrivals and Awkward Small Talk', serious: 'Arrivals and Introductions', noir: 'Everybody Comes in Out of the Rain' },
    desc: {
      comedic: "Guests arrive, hand over their coats and immediately start sizing each other up. Nobody is dead yet. Enjoy it.",
      serious: "The guests gather at {venue}. Introduce yourselves in character and settle in for the evening.",
      noir: "They came in one at a time, each with a smile that did not quite reach the eyes. {Setting} had never looked so friendly, or so doomed.",
    },
    notes: "Hand out character sheets 15 minutes early and remind everyone to read only their own. Play period music and greet each guest in character.",
  },
  {
    key: 'discover', round: 1, trigger: 'manual', gap: 15,
    title: { comedic: 'A Scream, a Thud, a Corpse', serious: 'The Body Is Found', noir: 'A Body in the Wrong Place' },
    desc: {
      comedic: "A scream! Then a thud. Then, unfortunately, the discovery of {v} in {place}. The canapes will have to wait.",
      serious: "{v} is found dead in {place}. Nobody may leave until the truth comes out.",
      noir: "It was {v}. It was always going to be {v}, sooner or later. {Place} was cold as a banker's heart.",
    },
    notes: "Read the scene aloud, then reveal the scene clue. Ask everyone to stay put and stay in character. Nobody may leave.",
  },
  {
    key: 'questions', round: 1, trigger: 'timer', timerMin: 8, gap: 10,
    title: { comedic: 'Everyone Interrogates Everyone', serious: 'First Questions', noir: 'Smoke, Cross-Talk and Lies' },
    desc: {
      comedic: "Everyone interrogates everyone else, mostly out of habit and partly out of terror.",
      serious: "Question one another about your movements and your relationships with {v}.",
      noir: "Cigarette smoke and cross-talk. Everybody had a story. Nobody had the truth.",
    },
    notes: "Circulate, nudge quiet players and make sure everyone shares their public bio. Do not answer questions about the solution.",
  },
  {
    key: 'intermission', round: 1, trigger: 'manual', gap: 10, optional: true,
    title: { comedic: 'Intermission: Refreshments and Regrets', serious: 'A Pause for Refreshments', noir: 'A Drink and a Long Look' },
    desc: {
      comedic: "A short break for snacks, gossip and reconsidering every life choice that led to this party.",
      serious: "A short intermission. Refresh your drinks, and watch who talks to whom.",
      noir: "Someone pours a drink. Somebody else watches to see who takes it.",
    },
    notes: "A natural moment for snacks and to catch up any players who are confused about their role.",
  },
  {
    key: 'whispers', round: 2, trigger: 'timer', timerMin: 8, gap: 15,
    title: { comedic: 'Secrets Whispered in Corners', serious: 'Secrets and Suspicion', noir: 'Whispers in the Back Rooms' },
    desc: {
      comedic: "Time to trade secrets in corners and pretend not to be eavesdropping.",
      serious: "Players confer privately. Confront a rival, form an alliance or hide something. Whatever you do, do not be seen.",
      noir: "Whispers in the back rooms, a hand on a shoulder, a deal struck in the dark.",
    },
    notes: "Encourage players to reveal one of their secrets in exchange for information. Watch out for any argument that goes too far.",
  },
  {
    key: 'challenge', round: 2, trigger: 'player-action', gap: 15,
    title: { comedic: 'The Challenge', serious: 'A Test of Nerve', noir: 'A Game of Chance' },
    desc: {
      comedic: "Time for a game! Winners get bragging rights. Losers get a very stern look from the GM.",
      serious: "The tension needs somewhere to go. The GM proposes a challenge to draw out the truth.",
      noir: "The house always wins, but tonight the house is a corpse. Somebody suggests a game to pass the time.",
    },
    notes: "Run the mini-game and confirm in the GM view when a winner has emerged. Keep it short, ideally under 10 minutes.",
  },
  {
    key: 'testimony', round: 3, trigger: 'timer', timerMin: 7, gap: 15,
    title: { comedic: 'Fresh Testimony', serious: 'New Testimony', noir: 'A Witness Comes Forward' },
    desc: {
      comedic: "Someone remembers something. Someone else remembers something completely different. Both are very sure.",
      serious: "New testimony emerges. Compare stories and test each alibi.",
      noir: "A witness clears their throat. The room goes quiet. Everybody looks at somebody else.",
    },
    notes: "Read testimony clues aloud in the voice of the witness. Watch for anyone who starts sweating.",
  },
  {
    key: 'truth', round: 3, trigger: 'manual', gap: 15,
    title: { comedic: 'Confessions and Corrections', serious: 'A Story Comes Apart', noir: 'The Lie Behind the Lie' },
    desc: {
      comedic: "A few embarrassing truths come out. It is not the murder, but it is very awkward.",
      serious: "Something previously suspicious now has an innocent explanation. Somebody's story changes.",
      noir: "A lie gets peeled back and there is a smaller, sadder lie underneath.",
    },
    notes: "Let the debunked players tell their side. Reward them with a little applause: they've been suspected all evening.",
  },
  {
    key: 'locker', round: 4, trigger: 'timer', timerMin: 7, gap: 15,
    title: { comedic: 'The Evidence Locker Opens', serious: 'The Evidence Comes Together', noir: 'The Files Come Out' },
    desc: {
      comedic: "The evidence locker is unlocked, and it is a lot messier than anyone had hoped.",
      serious: "Documents and evidence come to light. Someone's motive is suddenly very clear.",
      noir: "Somebody opens a drawer and every eye in the room follows the sound.",
    },
    notes: "Hand out any remaining physical clues. Encourage players to link the clues together with the motives they have heard.",
  },
  {
    key: 'slip', round: 4, trigger: 'manual', gap: 10,
    title: { comedic: 'A Slip of the Tongue', serious: 'A Slip of the Tongue', noir: 'A Word Too Many' },
    desc: {
      comedic: "Somebody blurts out something they absolutely should not know. The room goes quiet. Somebody drops a canape. Nobody can agree who it was.",
      serious: "A careless remark reveals knowledge that only the culprit could have. Everyone heard it. Nobody is certain who said it.",
      noir: "It was a small mistake, the kind that puts you in a cell, or a coffin. Everyone heard it. Nobody saw who said it.",
    },
    notes: "Read this clue aloud with dramatic emphasis, then pause. Watch faces.",
  },
  {
    key: 'accuse', round: 5, trigger: 'timer', timerMin: 5, gap: 10,
    title: { comedic: 'Final Accusations', serious: 'The Final Accusations', noir: 'Point the Finger' },
    desc: {
      comedic: "Write down whom you accuse, how they did it, and why. Bonus points for a theatrical accusation.",
      serious: "It is time. Each player writes down who did it, how, and why.",
      noir: "Time to put your cards on the table, and a name on a slip of paper.",
    },
    notes: "Hand out slips of paper. Each player writes a name, a method and a motive. Collect them all before the timer ends.",
  },
  {
    key: 'reveal', round: 5, trigger: 'manual', gap: 10,
    title: { comedic: 'The Reveal', serious: 'The Solution', noir: 'The Truth, Such As It Is' },
    desc: {
      comedic: "Drumroll, please. Or a spoon on a glass. The murderer is unmasked, and someone is extremely cross.",
      serious: "The truth is finally told. The murderer is unmasked and the mystery resolved.",
      noir: "The truth came out like a bad tooth: painfully, and all at once.",
    },
    notes: "Read out the solution from the GM key: killer, method, motive and the key clues. Then announce who guessed correctly.",
  },
];
