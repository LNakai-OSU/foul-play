import type { Tone } from '../models';
import { EXTRA_SETTINGS } from './settings-extra';

export interface RoleDef {
  label: string;
  honorific?: string;
  /** Short hidden identity / agenda shown on the character's own sheet. */
  secret: string;
  /** Public bio. {c} = name. */
  bio: string;
  /** Private second-person backstory. {v} = victim, {venue} = venue noun. */
  back: string;
  costume: string;
}

export interface MethodDef {
  cause: string;
  place: string;
  weaponTitle: string;
  weaponDesc: string;
  /** Something only the killer could know. */
  knew: string;
}

export interface SettingDef {
  id: string;
  names: string[];
  era: string;
  /** "the manor" */
  noun: string;
  blurb: Record<Tone, string>;
  victim: { label: string; honorific?: string; bio: string };
  rooms: string[];
  methods: MethodDef[];
  props: string[];
  dress: string[];
  accents: string[];
  startHour: number;
  roles: RoleDef[];
}

/** Roles that fit anywhere. */
export const UNIVERSAL_ROLES: RoleDef[] = [
  { label: 'the family physician', honorific: 'Dr.', secret: 'The Discreet Physician', bio: "{c} has patched up half of {venue} over the years and gossips only in Latin. Professionally trustworthy, socially unreadable.", back: "You have treated {v} for years and know precisely how many pills were prescribed, and how many were actually taken. Doctor-patient confidentiality has been very convenient for you.", costume: "Three-piece suit, a battered leather medical bag, half-moon spectacles" },
  { label: 'the old friend', secret: 'The Friend With a Grudge', bio: "{c} has known {v} since long before any of this money existed, and is fond of reminding everyone of it.", back: "You and {v} started out with nothing together. Somewhere along the way {v} kept all the credit. You still smile in the photographs.", costume: "Slightly outdated but well-loved evening wear, one flamboyant accessory" },
  { label: 'the undercover journalist', secret: 'The Reporter Who Is Not Here for the Party', bio: "{c} claims to be a distant acquaintance of the guest list, and asks a great many questions for someone who is just here for the canapes.", back: "You came to {venue} chasing a story about {v} that would finish a career, yours or theirs. You carry a tiny notebook and a smaller conscience.", costume: "Rumpled trench coat over formalwear, a notebook always in hand" },
  { label: 'the personal assistant', secret: 'The Keeper of the Calendar', bio: "{c} knows where everybody is supposed to be, and has a spreadsheet for where they actually were.", back: "You have managed {v}'s diary, phone calls and apologies for years. Nobody thanks you, but everybody needs you, and you have started to notice how much that is worth.", costume: "Sensible blazer, clipboard, a pencil behind the ear" },
  { label: 'the business partner', secret: 'The Silent Partner', bio: "{c} co-owns half of everything {v} does and takes credit for approximately none of it.", back: "You and {v} built this together, on paper. In practice you did the paperwork and {v} took the bows. The partnership agreement has a very interesting clause about what happens if one partner dies.", costume: "Sharp suit, pocket watch, a folder of contracts" },
  { label: 'the estranged sibling', secret: 'The Black Sheep Returns', bio: "{c} has not been seen at a family gathering in years, and returns tonight without explanation and with a suspiciously good tan.", back: "You left after the last argument with {v} and swore never to return. Then a letter arrived that made you change your mind. You have told nobody what was in it.", costume: "Travel-worn coat, mismatched luggage tag, one very good watch" },
  { label: 'the charming stranger', secret: 'The Uninvited Guest', bio: "{c} appeared at the door with a bottle of wine and a great story, and nobody remembers inviting them.", back: "You were not on the guest list. You talked your way in because {v} has something that belongs to you, and tonight is your one chance to get it back.", costume: "A dashing coat with too many pockets, a smile that arrives first" },
  { label: 'the family lawyer', secret: 'The Keeper of the Will', bio: "{c} drafts, files, and speaks in sentences with at least three subordinate clauses. Rumoured to have never once been surprised.", back: "You wrote {v}'s will and every codicil since, and you know who was written in and who was quietly written out. One of those changes was made only last week.", costume: "Dark three-piece suit, briefcase, reading glasses on a chain" },
  { label: 'the retired detective', secret: 'The Detective Who Is Not Retired', bio: "{c} spent thirty years on the force and cannot resist reading a room like a case file, whether anyone asked or not.", back: "You are far too experienced to be a suspect, which is exactly why you must be careful. Your last big case ended with a wrong arrest, and {v} was the only person who knew.", costume: "Well-worn overcoat, magnifying glass, a hat you refuse to take off indoors" },
  { label: 'the young protege', secret: 'The Understudy', bio: "{c} is the bright new thing everyone is pretending to be nice to, and dutifully agrees with anything anyone says, at first.", back: "{v} promised to make your career. You have given up years of your life waiting for the promise to arrive. Tonight, patience looks a lot like a mistake.", costume: "Freshly pressed clothes a size too formal, a nervous smile" },
];

export const SETTINGS: SettingDef[] = [
  ...EXTRA_SETTINGS,
  // ---------------------------------------------------------------------------
  {
    id: 'manor',
    names: ['Blackthorn Hall', 'Hollowmere Manor', 'Thistlewood Abbey'],
    era: '1920s country house weekend',
    noun: 'the manor',
    blurb: {
      comedic: "{setting} is a crumbling country pile with forty-seven rooms, three working radiators and a butler with opinions. The house party was going splendidly right up until the corpse.",
      serious: "{setting} stands miles from anywhere, and tonight the only bridge is under water. Eleven guests, one host, and a long night ahead.",
      noir: "Rain hammered {setting} like it owed the place money. Old money, bad blood, and a library that had seen too much.",
    },
    victim: { label: 'the wealthy host', bio: "{name} is master of the house: a collector of rare books, rarer wines and, most rarely of all, friends." },
    rooms: ['the library', 'the conservatory', 'the wine cellar', 'the drawing room', 'the greenhouse', 'the billiard room', 'the rose garden', 'the servants\' stairs'],
    methods: [
      { cause: 'poisoned with arsenic in the after-dinner brandy', place: 'the library', weaponTitle: 'Empty poison vial', weaponDesc: 'A tiny stoppered vial with its label scraped off, wedged behind a row of leather-bound sermons.', knew: 'that the brandy had been tampered with, before the doctor said a word about poison' },
      { cause: 'struck from behind with a bronze bust', place: 'the study', weaponTitle: 'Dented bronze bust', weaponDesc: 'A bronze bust of a Roman senator, slightly dented and wiped a little too carefully, lying behind the settee.', knew: 'that the blow came from behind, though nobody had turned the body over' },
    ],
    props: ['Candelabra or LED tea lights', 'A silver serving tray', 'Vintage playing cards', 'A brass hand bell for the GM', 'A leather-bound guest book'],
    dress: ['Black tie and evening gowns', 'Tweed and pearls', 'Flapper fringe and feathered headbands', 'Servants: black-and-white livery'],
    accents: ['Clipped upper-class English', 'Gentle Scottish burr', 'Breathless Mayfair drawl', 'Stern, formal Yorkshire', 'Transatlantic society lilt'],
    startHour: 19,
    roles: [
      { label: 'the butler', secret: 'The Loyal Servant Who Knows Too Much', bio: "{c} has run the household with white gloves and a straight face for twenty years. Nothing happens at the manor without {c} knowing.", back: "You have served {v} for two decades and heard everything through doors. You keep a private ledger of the household's secrets. Insurance, you call it.", costume: "Black tailcoat, white gloves, impeccable posture" },
      { label: 'the cook', secret: 'The Recipe Thief', bio: "{c} rules the kitchen and nobody dares enter without invitation. Every dish has a story and none of them are nice ones.", back: "Your signature soup made someone else famous. {v} took the recipe, the credit and the cookbook deal. You still stir every pot as if it were a grudge.", costume: "Stained apron, rolled sleeves, a wooden spoon tucked in a belt" },
      { label: 'the retired colonel', honorific: 'Colonel', secret: 'The Decorated Fraud', bio: "{c} has a chestful of medals, an opinion on everything and a moustache that has survived three wars and two divorces.", back: "The medals are real. The stories that go with them are mostly not. {v} once found the paperwork that proves it.", costume: "Regimental blazer, medals, magnificent moustache (real or otherwise)" },
      { label: 'the mystery novelist', secret: 'The Plagiarist', bio: "{c} writes bestselling whodunnits and studies every guest as potential material. Everyone is a little afraid of being put in the next book.", back: "Your last three bestsellers came from an unpublished manuscript that {v} once lent you. There is exactly one other copy, and it is in this house.", costume: "Velvet smoking jacket, a fountain pen, ink-stained cuffs" },
      { label: 'the head gardener', secret: 'The Green-Fingered Blackmailer', bio: "{c} knows every plant in the grounds by its Latin name and every guest by their worst habit.", back: "You see everything from the greenhouse: who meets whom in the rose garden, who buries what beside the hedge. It has been a profitable hobby.", costume: "Tweed cap, muddy boots, a sprig of something in the lapel" },
      { label: 'the widowed neighbour', secret: 'The Old Flame', bio: "{c} lives on the next estate, wears black with tremendous style, and has never once been early or late for a funeral.", back: "You and {v} were more than neighbours, once. You have never forgiven what {v} did with the letters you wrote.", costume: "Elegant black dress, long gloves, a veil pushed back like a dare" },
    ],
  },
  // ---------------------------------------------------------------------------
  {
    id: 'liner',
    names: ['the SS Meridian Star', 'the RMS Calliope', 'the MV Golden Heron'],
    era: '1930s transatlantic ocean liner',
    noun: 'the ship',
    blurb: {
      comedic: "{setting} promised 'five-star luxury on the high seas'. It failed to mention the five-star murder. The buffet, at least, is still open.",
      serious: "Four days into the crossing, {setting} is beyond the reach of any coastguard. Whoever did this is still aboard.",
      noir: "The fog off Newfoundland swallowed {setting} whole. Somewhere below decks a man was dying. Somewhere above, a band played on.",
    },
    victim: { label: 'the shipping magnate', bio: "{name} owns the shipping line, the ship and, everybody suspects, at least one of the officers." },
    rooms: ['the first-class lounge', 'the promenade deck', 'the ballroom', 'the engine room gallery', 'the captain\'s cabin', 'the radio room', 'the ship\'s library', 'the wine steward\'s pantry'],
    methods: [
      { cause: 'pushed overboard from the promenade deck', place: 'the promenade deck', weaponTitle: 'Torn scrap of fabric', weaponDesc: 'A scrap of expensive fabric snagged on the promenade railing at exactly the spot where the deck chair was overturned.', knew: 'that the victim went over the rail, when the official story is a heart attack in the cabin' },
      { cause: 'poisoned in a glass of champagne', place: 'the ballroom', weaponTitle: 'Champagne flute with residue', weaponDesc: 'A single champagne flute, hidden inside the grand piano, still bearing a bitter almond smell.', knew: 'that the poison was in the champagne, not the caviar everyone blames' },
    ],
    props: ['Life-preserver ring as decoration', 'A ship\'s bell', 'A deck of steamship postcards', 'Boarding passes for every guest', 'Nautical flags for a wall banner'],
    dress: ['Black tie for the captain\'s table', 'Travelling suits and cloche hats', 'Crew uniforms with brass buttons', 'Deck-chair cardigans and sunglasses'],
    accents: ['Crisp Cunard-style English', 'Broad New York', 'Gruff Cornish seafarer', 'Continental European elegance', 'Irish lilt'],
    startHour: 20,
    roles: [
      { label: 'the ship\'s captain', honorific: 'Captain', secret: 'The Captain Who Hides a Course Change', bio: "{c} has never lost a ship and never lets anyone forget it. Trusted absolutely by the passengers, and only partially by the crew.", back: "You altered the ship's route last night on {v}'s orders, and you have never once explained why to the crew. The logbook now disagrees with reality.", costume: "Navy officer's uniform, braided cap, gold epaulettes" },
      { label: 'the purser', secret: 'The Person With Two Ledgers', bio: "{c} handles all the ship's money, tickets and complaints, and has a smile prepared for each. Rumoured to know every passenger's true net worth.", back: "You keep two sets of books: the honest one for the shipping line and the accurate one for yourself. {v} asked to see the second.", costume: "Crisp white uniform, ledger under one arm, tiny pencil" },
      { label: 'the lounge singer', secret: 'The Voice Behind the Veil', bio: "{c} sings every evening in the first-class lounge, and every note somehow sounds like a farewell.", back: "You were promised a Broadway contract by {v} in exchange for a favour you would rather not describe. The contract never came.", costume: "Sequined gown, long gloves, a microphone from another era" },
      { label: 'the cabin steward', secret: 'The Person Who Sees Behind Every Door', bio: "{c} carries every secret through the corridors on a silver tray and delivers them, unopened, to the right cabin.", back: "You dust the cabins, change the sheets and read the letters left on desks. Yours is the only key that opens every door aboard. You suspect somebody has been copying it.", costume: "White jacket, black bow tie, a tray balanced on one hand" },
      { label: 'the ship\'s magician', secret: 'The Escape Artist', bio: "{c} performs each night in the ballroom and claims never to have failed a trick, only to have been misunderstood by the audience.", back: "Your act includes a trick cabinet with a hidden compartment. {v} found out what you smuggle in it, and what you smuggle out.", costume: "Top hat, cape with a flashy red lining, a pack of cards up every sleeve" },
      { label: 'the first-class dowager', secret: 'The Widow With a Fortune to Guard', bio: "{c} travels with fourteen trunks, two lapdogs and a permanent expression of mild disappointment.", back: "Your late husband's fortune is tangled up with {v}'s shipping line, and you would like it untangled, immediately, and in your favour.", costume: "Furs, pearls, a lorgnette, and an outrageously large hat" },
    ],
  },
  // ---------------------------------------------------------------------------
  {
    id: 'lodge',
    names: ['Frostpine Lodge', 'the Wolfsbane Chalet', 'Silverpeak Lodge'],
    era: 'Modern-day alpine ski lodge, snowed in',
    noun: 'the lodge',
    blurb: {
      comedic: "{setting} advertised 'a cosy weekend away'. Then the blizzard arrived, the Wi-Fi died, and the host followed shortly after.",
      serious: "A blizzard has closed the only road to {setting}. The phones are down. Someone in this lodge is a killer, and the snow is not going anywhere.",
      noir: "Snow fell on {setting} like a shroud. Nobody was going up the mountain tonight, and nobody was going down.",
    },
    victim: { label: 'the lodge owner', bio: "{name} built this lodge from a ruined barn and a bank loan, and never stops reminding the staff which of the two they owe." },
    rooms: ['the great hall', 'the hot tub deck', 'the ski room', 'the sauna', 'the trophy room', 'the kitchen', 'the boiler room', 'the upstairs balcony'],
    methods: [
      { cause: 'locked in the sauna and left to overheat', place: 'the sauna', weaponTitle: 'Jammed sauna door', weaponDesc: 'The sauna door was wedged shut from the outside with a ski pole, whose grip bears a deep set of fingerprints.', knew: 'that the door had been wedged shut from outside, though everybody assumed it had simply stuck' },
      { cause: 'struck with a trophy ice axe', place: 'the trophy room', weaponTitle: 'Missing ice axe', weaponDesc: 'The ceremonial ice axe is gone from its wall mount, leaving one clean rectangle on the dusty wood.', knew: 'that the murder weapon came from the wall, before anyone had noticed the empty mount' },
    ],
    props: ['Fake snow or cotton wool', 'Mulled-cider mugs', 'A mountain-rescue whistle', 'Thick wool blankets', 'A box of firewood for atmosphere'],
    dress: ['Chunky knit sweaters', 'Ski jackets and moon boots', 'Après-ski fur-trimmed everything', 'Staff: lodge fleece with name badges'],
    accents: ['Swiss-German chirpiness', 'Cheerful Canadian', 'Californian ski-bum drawl', 'Austrian precision', 'Weary Scottish highlander'],
    startHour: 18,
    roles: [
      { label: 'the ski instructor', secret: 'The Pro Who Wipes Out', bio: "{c} has the tan, the teeth and the certified charm. Somehow everyone has taken lessons and nobody has improved.", back: "You have been pocketing lesson fees, and quietly promising the same private slot to six students. {v} checked the bookings last week.", costume: "Bright ski suit, mirrored goggles pushed up on the head" },
      { label: 'the resident chef', secret: 'The Chef Who Cooks the Books', bio: "{c} produces fondue that has broken hearts and a temper that has broken plates.", back: "You bought supplies with the lodge's card for a second, secret restaurant. {v} calls it theft. You call it 'diversifying'.", costume: "Chef whites with a smear of something dubious, a fondue fork on a belt loop" },
      { label: 'the travel influencer', secret: 'The Follower Count Faker', bio: "{c} has 900,000 followers, a ring light, and a firm belief that murder would be excellent content.", back: "Your engagement numbers are purchased. {v} found out before the sponsors did. You have every intention of keeping it that way.", costume: "Matching designer snowsuit, phone on a stick, ring light around the neck" },
      { label: 'the mountain guide', secret: 'The Guide Who Lost a Client', bio: "{c} has climbed everything, been rescued from most of it, and never talks about the last expedition.", back: "One client did not come down from the last expedition, and the report you filed was only half the truth. {v} was the client's sponsor.", costume: "Weathered parka, coiled rope, an ice axe worn like a fashion statement" },
      { label: 'the night manager', secret: 'The Person Who Signs Every Key', bio: "{c} runs the front desk with the enthusiasm of someone who has answered the same question four thousand times.", back: "You control the master key and the guest register. You let a certain someone in, after hours, more than once. {v} caught the log.", costume: "Lodge fleece, name badge, a big ring of keys" },
      { label: 'the spa therapist', secret: 'The Healer With a Side Business', bio: "{c} spends the day rubbing tension out of strangers' shoulders and the evenings hearing precisely why it was there.", back: "You hear confessions on the massage table, and some of them are worth money. {v} knew, and wanted a cut.", costume: "Soft white tunic, an aromatherapy oil in every pocket" },
    ],
  },
  // ---------------------------------------------------------------------------
  {
    id: 'studio',
    names: ['Golden Age Pictures', 'Paragon Studios', 'Silverscreen Pictures'],
    era: '1940s Hollywood movie studio',
    noun: 'the studio',
    blurb: {
      comedic: "{setting} was in the middle of shooting its biggest picture ever when the studio boss took an unscripted final bow. The show, sadly, must go on.",
      serious: "Between takes on the set of the year's biggest picture, {setting}'s founder was found dead. Everybody on the lot has something to lose.",
      noir: "Klieg lights, cigarette smoke and a dead studio boss on Soundstage Nine. Hollywood was a dream factory, and nightmares were its best-selling line.",
    },
    victim: { label: 'the studio boss', bio: "{name} founded the studio, owns the stars, and has made and broken more careers than the front-office phone has lines." },
    rooms: ['Soundstage Nine', 'the costume department', 'the projection booth', 'the commissary', 'the backlot street', 'the executive suite', 'the prop warehouse', 'the sound booth'],
    methods: [
      { cause: 'struck by a falling stage light', place: 'Soundstage Nine', weaponTitle: 'Loosened rigging clamp', weaponDesc: 'A rigging clamp on the overhead lighting bar, deliberately unscrewed. The wrench that did it is missing from the tool crib.', knew: 'that the light was sabotaged, when the studio insists it was an accident' },
      { cause: 'poisoned in a cup of studio-lot coffee', place: 'the executive suite', weaponTitle: 'Cold cup of coffee', weaponDesc: 'A half-drunk cup of coffee, the saucer marked with a smear of bright red lipstick that does not match the victim.', knew: 'that the coffee was the cause, well before any lab results' },
    ],
    props: ['Clapperboard', 'Director\'s megaphone', 'Film reels or DVDs as props', 'A bell for "cut!"', 'Movie posters as decoration'],
    dress: ['Golden-age glamour', 'Director\'s beret and riding boots', 'Studio crew in overalls', 'Starlet gowns and slicked-back hair'],
    accents: ['Mid-Atlantic movie-star lilt', 'Brooklyn wisecracker', 'Continental European director', 'Southern belle', 'Fast-talking press agent patter'],
    startHour: 19,
    roles: [
      { label: 'the leading star', secret: 'The Star Who Cannot Act Without a Cue Card', bio: "{c} is the face on every poster. Off camera, {c} is exactly as dazzling and considerably more dangerous.", back: "Your last three performances were saved in the edit by {v}, who then quietly kept the negative as leverage. You are one bad review from a very quiet life.", costume: "Movie-star glamour: sunglasses indoors, an entrance for every doorway" },
      { label: 'the gossip columnist', secret: 'The Pen Behind the Rumours', bio: "{c} decides who is up and who is out with a single paragraph, and has been kept out of more parties than anybody living.", back: "You print what {v} wants printed, in return for what {v} lets you learn. Lately {v} has been asking for a lot more than you wanted to give.", costume: "Wide-brimmed hat, notepad, pearls and a knowing look" },
      { label: 'the stunt double', secret: 'The Stand-In Who Wants the Spotlight', bio: "{c} takes every hit and never gets a credit, and grins about it in a way that makes people nervous.", back: "You were injured on a picture {v} refused to pay for. You have been saving the paperwork and the anger in equal parts.", costume: "Leather jacket, fake bruises, a very authentic limp" },
      { label: 'the costume designer', secret: 'The Seamstress of Secrets', bio: "{c} knows everybody's measurements, which is to say everybody's secrets, and has stitched a great many of both into the seams.", back: "You sewed hidden pockets into the star's costumes for a smuggling scheme {v} was profiting from. {v} now wants out, and you want more.", costume: "A tape measure round the neck, pins in the lapel, remarkable dress sense" },
      { label: 'the screenwriter', secret: 'The Ghost Behind the Script', bio: "{c} wrote half the great lines in Hollywood and is credited for none of them, and quotes the rest from memory at parties.", back: "The studio's most beloved picture was your script, printed under {v}'s name. You want the credit, and the cheque that went with it.", costume: "Rumpled tweed jacket, ink-stained fingers, a script under one arm" },
      { label: 'the publicist', secret: 'The Fixer', bio: "{c} makes scandals disappear and reputations shine. Rumour says some people disappeared along with the scandals.", back: "You buried a scandal for {v} and kept the receipts. When {v} started to talk about cleaning house, you took it personally.", costume: "Sharp pinstripe, a telephone always at the ear, a very nervous smile" },
    ],
  },
  // ---------------------------------------------------------------------------
  {
    id: 'restaurant',
    names: ['Le Corbeau Rouge', 'Maison Verbena', 'The Gilded Spoon'],
    era: 'Modern fine-dining restaurant on its final night',
    noun: 'the restaurant',
    blurb: {
      comedic: "{setting} is famous for its tasting menu, its impossible reservation list and, as of tonight, an unscheduled main course: the owner.",
      serious: "On the last night of service at {setting}, the owner is found dead in the kitchen. The doors are locked, the guests are seated, and every dish is accounted for. Almost.",
      noir: "The kitchen of {setting} never sleeps, and tonight neither does the kid who found the body in the walk-in. Some meals leave a bitter aftertaste.",
    },
    victim: { label: 'the restaurateur', bio: "{name} owns {setting}, the fifteen-course tasting menu, and a reputation for reducing sous-chefs to sauce." },
    rooms: ['the kitchen', 'the walk-in fridge', 'the wine cellar', 'the private dining room', 'the pastry section', 'the loading dock', 'the bar', 'the manager\'s office'],
    methods: [
      { cause: 'poisoned by a tampered tasting-menu course', place: 'the private dining room', weaponTitle: 'Untouched amuse-bouche', weaponDesc: 'A single amuse-bouche plate, left untouched, garnished with something that was definitely not on the approved menu.', knew: 'that it was the second course, not the first, that was poisoned' },
      { cause: 'stabbed with a missing chef\'s knife', place: 'the kitchen', weaponTitle: 'Missing chef\'s knife', weaponDesc: 'The knife block holds nine blades. There should be ten. The empty slot still bears a fine dusting of flour.', knew: 'that a knife from the block was used, before the police had said what kind of weapon it was' },
    ],
    props: ['Menus printed for each course', 'Chef\'s hat and apron', 'A small brass service bell', 'Cloth napkins', 'A wine bottle as a centrepiece'],
    dress: ['Smart-casual restaurant chic', 'Chef whites and toques', 'Waiters in black waistcoats', 'Critic in sunglasses and a fake moustache'],
    accents: ['Dramatic French', 'Sardonic New Yorker', 'Italian nonna energy', 'Precise Scandinavian', 'Loud Australian'],
    startHour: 19,
    roles: [
      { label: 'the sous-chef', secret: 'The Second-in-Command Who Wants the Whole Kitchen', bio: "{c} has been one bad soufflé away from the top job for six years and has been perfectly patient about it. Mostly.", back: "You've been running the kitchen while {v} takes the bows. Tonight was supposed to be the night {v} signed it over to you.", costume: "Chef whites with a stack of tasting spoons in the pocket" },
      { label: 'the sommelier', secret: 'The Palate Who Swapped the Bottles', bio: "{c} can name a vintage from the smell of the cork and a person's income from the way they hold the glass.", back: "You have been swapping rare bottles for cheap ones and pocketing the difference. {v} suspected something was off with the 1961.", costume: "Black waistcoat, a silver tasting cup on a chain, an air of quiet judgement" },
      { label: 'the pastry chef', secret: 'The Sweet Tooth With a Bitter Past', bio: "{c} creates desserts that make grown critics weep, and refuses to say why the sugar work is always so sharp.", back: "The dessert that made this restaurant famous was your recipe. {v} put a different name on the menu. You have been dreaming about that name ever since.", costume: "Flour-dusted apron, a piping bag holstered like a pistol" },
      { label: 'the maitre d\'', secret: 'The Person Who Overbooks', bio: "{c} decides who gets a table and who gets a polite lie. Every regular is greeted by name; every enemy is seated by the swing door.", back: "You have been selling the impossible reservations on the side. {v} found the second reservation book, and the envelope that went with it.", costume: "Immaculate tuxedo, a reservation book, an unshakeable smile" },
      { label: 'the food critic', secret: 'The Critic Who Was Paid', bio: "{c} writes the reviews everyone fears, from a corner table under a name nobody believes.", back: "You gave {v} a glowing review and were paid handsomely for it. Tonight you came to end the arrangement, and you would prefer nobody knew about it.", costume: "Dark glasses, a battered notebook and a fake moustache that fools nobody" },
      { label: 'the dishwasher', secret: 'The Witness in the Back', bio: "{c} sees the whole restaurant from the sink and has been underestimated by everyone for four years.", back: "You have washed every plate and overheard every argument, and you know things about {v} that could end the restaurant. Nobody has thought to ask you.", costume: "Rubber gloves, soggy apron, a very tired grin" },
    ],
  },
  // ---------------------------------------------------------------------------
  {
    id: 'train',
    names: ['the Midnight Aurora', 'the Orient Meridian', 'the Silver Cormorant Express'],
    era: '1920s luxury transcontinental express',
    noun: 'the train',
    blurb: {
      comedic: "{setting} was the most luxurious train in Europe until it stopped, in a snowdrift, with a body. The dining car is still doing brisk business.",
      serious: "A landslide has stopped {setting} in the middle of the mountains. Every carriage is locked from inside, and one passenger will not see morning.",
      noir: "{setting} slid through the dark like a whisper through a keyhole. By midnight, one passenger had stopped breathing.",
    },
    victim: { label: 'the jewel dealer', bio: "{name} carries the most valuable cargo aboard: a briefcase of diamonds, a briefcase of secrets and a tremendous number of enemies." },
    rooms: ['the dining car', 'the observation car', 'the sleeping carriage', 'the baggage car', 'the smoking lounge', 'the galley', 'the corridor', 'the engine cab'],
    methods: [
      { cause: 'stabbed in a locked sleeping compartment', place: 'the sleeping carriage', weaponTitle: 'Bloodied letter opener', weaponDesc: 'An ornate letter opener, tucked under a seat cushion. The blood has been wiped, but the monogram on its handle has not.', knew: 'that the compartment was locked from inside, though the porter said the door was merely stuck' },
      { cause: 'poisoned in a cup of late-night cocoa', place: 'the dining car', weaponTitle: 'Half-finished cocoa', weaponDesc: 'A cocoa cup with a chipped rim on the dining-car table, and beside it a small paper twist that once held white powder.', knew: 'that it was the cocoa, though nobody had mentioned the cup' },
    ],
    props: ['Luggage tags', 'A suitcase for the diamonds', 'A conductor\'s whistle', 'Vintage travel posters', 'Tickets printed for each guest'],
    dress: ['Travelling furs and monocles', 'Conductor and porter uniforms', 'Art deco evening wear', 'Exotic hats from far-off countries'],
    accents: ['Elegant French', 'Baltic aristocratic', 'Cockney porter', 'Vienna coffeehouse lilt', 'Dry British diplomat'],
    startHour: 21,
    roles: [
      { label: 'the conductor', honorific: 'Conductor', secret: 'The Conductor Who Punches Fake Tickets', bio: "{c} knows every passenger by ticket and every ticket by forgery, and punches both with the same disapproving stare.", back: "You have been selling tickets that do not exist. {v} boarded with one of them, and grew very interested in your books.", costume: "Uniform with brass buttons, ticket punch and pocket watch" },
      { label: 'the dining-car chef', secret: 'The Chef With the Poison Shelf', bio: "{c} cooks in a moving kitchen with a very sharp knife collection, and an unnervingly steady hand.", back: "You have been slipping a strange herb into the soup for a private reason. {v} tasted it last week and asked what it was.", costume: "Tall white toque, apron and a small notebook of recipes" },
      { label: 'the exiled aristocrat', secret: 'The Bankrupt Aristocrat', bio: "{c} is impossibly grand, impeccably poised, and travelling under a title that is technically still valid.", back: "The estate has been sold, the jewels are paste and the servants have been dismissed. {v} holds the letters that prove it.", costume: "Furs, pearls and a bejewelled cigarette holder" },
      { label: 'the telegraph operator', secret: 'The Voice on the Wire', bio: "{c} sits in the last carriage, transmitting other people's secrets to the world and forgetting all of them, professionally.", back: "You have been copying telegrams before they were sent. {v} sent one you should not have read.", costume: "Green eyeshade, sleeve garters, headphones from another age" },
      { label: 'the diplomat', secret: 'The Person With Two Passports', bio: "{c} represents a country nobody can quite name and carries papers nobody has been allowed to read.", back: "You are carrying stolen documents in a diplomatic pouch. {v} knew what was in the pouch, and where it was headed.", costume: "Sash, medals, an official-looking briefcase handcuffed to the wrist" },
      { label: 'the porter', secret: 'The Porter Who Carries More Than Bags', bio: "{c} carries the luggage, the gossip and the occasional very suspicious parcel, all with exactly the same discreet nod.", back: "You have been carrying packages for a stranger in exchange for cash. {v} peeked inside one of them.", costume: "Red-piped uniform, a luggage trolley, a suspiciously heavy suitcase" },
    ],
  },
  // ---------------------------------------------------------------------------
  {
    id: 'club',
    names: ['the Blue Lantern Club', 'the Velvet Sparrow', 'the Copper Moon Lounge'],
    era: '1930s prohibition-era jazz club',
    noun: 'the club',
    blurb: {
      comedic: "{setting} serves the finest 'tea' in town, in very small cups, out of very large bottles. Tonight the owner was served something different.",
      serious: "After midnight, {setting} is the most dangerous room in the city. When the owner is found dead behind the bar, every patron is a suspect.",
      noir: "The band played 'Stormy Weather' and the town's worst people drank it in. Smoke in the rafters, trouble at the door, and a body by the piano.",
    },
    victim: { label: 'the club owner', bio: "{name} owns the club, the liquor licence, and a great many debts, some of them to people who don't accept payment plans." },
    rooms: ['the main floor', 'the bar', 'the backroom card table', 'the coat-check', 'the band stage', 'the alley door', 'the owner\'s office', 'the cellar speakeasy'],
    methods: [
      { cause: 'shot in the back office during the last set', place: 'the owner\'s office', weaponTitle: 'Missing revolver', weaponDesc: 'The owner\'s revolver is missing from the desk drawer. A single spent shell casing lies under the rug, and the smell of gunpowder clings to the curtains.', knew: 'that the shot was fired during the drum solo, when nobody could hear it' },
      { cause: 'poisoned in a spiked cocktail', place: 'the bar', weaponTitle: 'A single cocktail glass', weaponDesc: 'A lone cocktail glass with a cherry that does not belong, left behind the bar and wiped clean of everything but a smear of lip rouge.', knew: 'that the drink was made behind the bar, not at the table' },
    ],
    props: ['Fedoras', 'Poker chips', 'Vintage cocktail glasses', 'A jazz playlist', 'A small string of fairy lights for the bar'],
    dress: ['Pinstripe suits and fedoras', 'Flapper dresses with long pearls', 'Bartender in sleeve garters', 'Gangster spats and two-tone shoes'],
    accents: ['Gravelly Chicago mobster', 'Slick Harlem cool', 'New Orleans drawl', 'Irish cop', 'Femme-fatale purr'],
    startHour: 22,
    roles: [
      { label: 'the bartender', secret: 'The Person Who Waters the Whiskey', bio: "{c} pours the drinks, keeps the secrets and has a talent for pretending to be deaf.", back: "You have been skimming from the till and watering the liquor for months. {v} started counting the bottles yesterday.", costume: "Sleeve garters, a white apron and a bar towel over one shoulder" },
      { label: 'the jazz singer', secret: 'The Voice With a Price', bio: "{c} sings like tomorrow was never promised, and every man in the room is sure the song is for him alone.", back: "You owe {v} your career and a great deal more. Tonight you intend to be paid in kind, or to get out from under the debt, one way or another.", costume: "Sequined slip dress, feather boa, a single long cigarette holder" },
      { label: 'the bouncer', secret: 'The Doorman With a Second Boss', bio: "{c} decides who comes in and who comes out. It's rumoured that the door is the only thing in the club that really fears {c}.", back: "You have been letting people in the back door for a rival. {v} spotted a face at the alley door that should not have been there.", costume: "Tight suit, broken nose, arms folded" },
      { label: 'the gambler', secret: 'The Person Who Always Wins', bio: "{c} always seems to win at the backroom table, and always seems to leave a little while before the questions start.", back: "Your winning streak is not luck. {v} suspected as much and was about to tell the other players.", costume: "Green visor, cufflinks, a poker face you have practised for years" },
      { label: 'the cigarette vendor', secret: 'The Vendor Who Hears Everything', bio: "{c} strolls the club with a tray of cigarettes, cigars and gossip, and forgets every word of the last one.", back: "You have been passing messages for the police. {v} might have found out, and you know what {v} does to informants.", costume: "Little pillbox hat, tray of cigarettes on a neck strap" },
      { label: 'the city councilman', secret: 'The Public Servant Who Drinks in Private', bio: "{c} votes for prohibition by day and is a regular at the Blue Lantern by night, and thinks no one has noticed.", back: "You have been taking payments to look the other way. {v} kept a record of every one and threatened to publish it.", costume: "Respectable three-piece suit, an oversized hat pulled low" },
    ],
  },
  // ---------------------------------------------------------------------------
  {
    id: 'theatre',
    names: ['the Gilded Lyre Opera House', 'the Royal Marigold Theatre', 'the Crimson Curtain Playhouse'],
    era: 'Victorian opera house on opening night',
    noun: 'the theatre',
    blurb: {
      comedic: "{setting} was ready for opening night: sets built, costumes stitched, and one impresario deceased. The understudy has, of course, been waiting for this moment all their life.",
      serious: "On the opening night of its grandest production, the impresario of {setting} is found dead in the wings. The curtain will rise at nine, and the truth cannot wait.",
      noir: "Gaslight, greasepaint and a corpse in Box Five. {setting} loved a tragedy, and tonight it got a real one.",
    },
    victim: { label: 'the impresario', bio: "{name} owns the theatre, the production and, if the company are to be believed, the very air inside the auditorium." },
    rooms: ['the stage', 'the orchestra pit', 'the green room', 'the prop room', 'Box Five', 'the fly loft', 'the dressing rooms', 'the wardrobe'],
    methods: [
      { cause: 'dropped from the fly loft with a sandbag', place: 'the stage', weaponTitle: 'Cut sandbag rope', weaponDesc: 'The rope holding a stage sandbag was cut, cleanly, with a blade. A fresh rosin footprint waits under the rigging.', knew: 'that the rope had been cut, not frayed, though the house crew said it was wear and tear' },
      { cause: 'poisoned with a prop goblet', place: 'the green room', weaponTitle: 'The prop goblet', weaponDesc: 'The prop goblet from the final scene, unnaturally clean inside and sticky with something that is certainly not stage wine.', knew: 'that the prop goblet was swapped for the real thing before the last rehearsal' },
    ],
    props: ['Theatre masks', 'Opera glasses', 'A velvet curtain backdrop', 'Programmes for the fictional production', 'A small handbell for the interval'],
    dress: ['Victorian evening dress', 'Theatre costumes and greasepaint', 'Stagehands in black', 'Opera-goers with lorgnettes and fans'],
    accents: ['Grand theatrical baritone', 'Sing-song Italian maestro', 'Cockney stagehand', 'Breathless soprano', 'Pompous Shakespearean'],
    startHour: 19,
    roles: [
      { label: 'the prima donna', secret: 'The Diva Who Has Lost Her Voice', bio: "{c} has performed the lead for twenty years and has been retiring for nineteen of them.", back: "Your voice cracked three weeks ago. {v} arranged for a hidden singer in the wings to cover, and holds it over you.", costume: "Enormous gown, a dramatic wrap, a sensational hat and a lorgnette" },
      { label: 'the stage manager', secret: 'The Keeper of the Cues', bio: "{c} calls every light, curtain and entrance, and would tell you precisely where everybody was at 8:52 if you'd only ask nicely.", back: "You control who is where, and when. You also let someone up into the fly loft during the sandbag rehearsal. {v} asked why.", costume: "All black, headset, clipboard covered in coloured tabs" },
      { label: 'the conductor', honorific: 'Maestro', secret: 'The Maestro of Debts', bio: "{c} waves a baton with tremendous authority and has been accused, once or twice, of stabbing rather than conducting.", back: "You pawned the orchestra's instruments to cover your debts. {v} discovered the empty cases and gave you one week to replace them.", costume: "Tailcoat, a baton, wild hair that has not seen a brush this decade" },
      { label: 'the understudy', secret: 'The Ambitious Second Choice', bio: "{c} knows the lead role backwards, forwards and sideways and has never, in six years, been called on stage.", back: "You have been waiting for the lead to fall ill, or worse. {v} promised you the role, then told you it was not going to happen.", costume: "Half-finished costume, a script filled with margin notes" },
      { label: 'the theatre critic', secret: 'The Pen That Can Close a Show', bio: "{c} attends every opening night and writes every review in a single, devastating adjective.", back: "You have been paid for reviews by {v}, and tonight came to pretend otherwise. The receipts are somewhere in your coat.", costume: "Opera cape, monocle, a notebook and a look of unstoppable disappointment" },
      { label: 'the prop master', secret: 'The Person Who Makes Everything Look Real', bio: "{c} can build a working guillotine from cardboard and a working alibi from sawdust.", back: "You have been replacing real props with cheap copies and selling the originals. {v} spotted the swapped goblet.", costume: "Leather apron, tool belt, and a wooden dagger through the hat band" },
    ],
  },
];

export function getSetting(id: string): SettingDef | undefined {
  return SETTINGS.find((s) => s.id === id);
}
