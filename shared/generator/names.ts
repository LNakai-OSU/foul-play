import type { Tone } from '../models';
import type { Rng } from './rng';

export const FIRST_NAMES = [
  'Adelaide', 'Barnaby', 'Cordelia', 'Desmond', 'Evangeline', 'Fitzgerald', 'Gwendolyn', 'Horace', 'Imogen', 'Julius',
  'Katarina', 'Leopold', 'Marguerite', 'Nigel', 'Ophelia', 'Percival', 'Quentin', 'Rosalind', 'Sebastian', 'Tabitha',
  'Ulysses', 'Vivienne', 'Wilhelmina', 'Xavier', 'Yvette', 'Zebediah', 'Agatha', 'Bertram', 'Clementine', 'Dashiell',
  'Eleanor', 'Frederick', 'Genevieve', 'Hugo', 'Isadora', 'Jasper', 'Lucille', 'Montgomery', 'Nadia', 'Otis',
  'Penelope', 'Rupert', 'Serafina', 'Theodore', 'Una', 'Victor', 'Winifred', 'Arabella', 'Cecil', 'Dorothea',
  'Edmund', 'Fiona', 'Gideon', 'Harriet', 'Ignatius', 'Josephine', 'Kit', 'Lorelei', 'Miles', 'Nora',
  'Orson', 'Philippa', 'Reginald', 'Sylvia', 'Tobias', 'Ursula', 'Valentina', 'Walter', 'Beatrix', 'Conrad',
  'Delphine', 'Ezra', 'Florence', 'Gus', 'Hester', 'Ivor', 'Juno', 'Klaus', 'Lavinia', 'Maxwell',
  'Noelle', 'Oscar', 'Petra', 'Rafferty', 'Stella', 'Thaddeus', 'Vera', 'Wallace', 'Anouk', 'Bram',
];

export const SERIOUS_SURNAMES = [
  'Ashcroft', 'Blackwood', 'Carrington', 'Delacroix', 'Ellsworth', 'Fairweather', 'Gallagher', 'Hargrove', 'Ivanov', 'Jardine',
  'Kingsley', 'Lockhart', 'Montague', 'Nightingale', 'Oakes', 'Pemberton', 'Quill', 'Radcliffe', 'Sinclair', 'Thornbury',
  'Underhill', 'Vandermeer', 'Whitlock', 'Yardley', 'Abernathy', 'Beaumont', 'Crawford', 'Drummond', 'Everhart', 'Fontaine',
  'Grimsby', 'Holloway', 'Ingram', 'Kensington', 'Lavelle', 'Marlowe', 'Novak', 'Ostrander', 'Prescott', 'Rutherford',
  'Stanhope', 'Tremaine', 'Vance', 'Whitaker', 'Ainsley', 'Bellamy', 'Cavendish', 'Devereux', 'Fenwick', 'Godfrey',
  'Halloran', 'Iverson', 'Jessop', 'Kavanagh', 'Lindqvist', 'Moreau', 'Nakamura', 'Okafor', 'Petrov', 'Quintero',
  'Reyes', 'Santangelo', 'Takahashi', 'Villanueva', 'Wexler', 'Achebe', 'Brandt', 'Castellano', 'Dubois', 'Eriksen',
];

export const COMEDIC_SURNAMES = [
  'Bumblesnatch', 'Cabbagepatch', 'Dribblesworth', 'Fizzlewick', 'Gigglesnort', 'Humperdink', 'Jellybottom', 'Kettlewhistle', 'Lumpkin-Fudge', 'McMuffin',
  'Noodlebrook', 'Puddlethwaite', 'Quibblesworth', 'Rumblebuck', 'Snodgrass', 'Twiddlethumb', 'Wobblesby', 'Crumpetsworth', 'Buttersnipe', 'Pettifog',
  'Fumblethorpe', 'Higginbottom', 'Pepperpot', 'Plumtree', 'Sprocket', 'Bogglethorpe', 'Tumbledown', 'Muddlecombe', 'Cluttergrass', 'Fiddlesticks',
  'Windbag', 'Snickerdoodle', 'Pipsqueak', 'Hootenanny', 'Whiffletree', 'Gadabout', 'Nettlebed', 'Toadflax', 'Applewhistle', 'Blunderbuss',
  'Crabapple', 'Dimplebottom', 'Lollygag', 'Mudgeon', 'Ninnyhammer', 'Poppycock', 'Quackenbush', 'Tiddlywink', 'Zigzag', 'Gooseberry',
];

export const NOIR_NICKNAMES = [
  'Lucky', 'Dice', 'Velvet', 'Slim', 'Knuckles', 'Sugar', 'Smoke', 'Whisper', 'Ace', 'Dutch',
  'Fingers', 'Doc', 'Blackjack', 'Honey', 'Icepick', 'Ghost', 'Mack', 'Sparrow', 'Cricket', 'Nickels',
  'Silk', 'Rags', 'Tiny', 'Bishop', 'Duke',
];

export interface NamePools {
  usedFirst: Set<string>;
  usedLast: Set<string>;
}

export function newNamePools(): NamePools {
  return { usedFirst: new Set(), usedLast: new Set() };
}

function takeUnique(rng: Rng, pool: readonly string[], used: Set<string>): string {
  const free = pool.filter((n) => !used.has(n));
  const name = rng.pick(free.length ? free : pool);
  used.add(name);
  return name;
}

/** Generate a unique, tone-appropriate full name (first and last names never repeat within a case). */
export function makeName(rng: Rng, tone: Tone, pools: NamePools, honorific?: string): string {
  const first = takeUnique(rng, FIRST_NAMES, pools.usedFirst);
  const last = takeUnique(rng, tone === 'comedic' ? COMEDIC_SURNAMES : SERIOUS_SURNAMES, pools.usedLast);
  if (honorific) return `${honorific} ${first} ${last}`;
  if (tone === 'noir' && rng.chance(0.4)) return `${first} "${rng.pick(NOIR_NICKNAMES)}" ${last}`;
  return `${first} ${last}`;
}

export function initials(name: string): string {
  const parts = name
    .replace(/"[^"]*"/g, '')
    .split(/\s+/)
    .filter((p) => p && !/^(Dr\.|Professor|Colonel|Captain|Judge|Reverend|Chef|Maestro|Conductor|Countess)$/.test(p));
  const a = parts[0]?.[0] ?? 'X';
  const b = parts[parts.length - 1]?.[0] ?? a;
  return `${a}.${b}.`;
}
