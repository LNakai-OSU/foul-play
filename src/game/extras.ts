/** Background people who make each setting feel inhabited. They wander, they chat, they are not suspects. */
import type { EnvId } from './art/skins';

export interface ExtraKind {
  name: string;
  /** feeds the look picker (hats, coats) */
  hint: string;
  line: string;
}

export const EXTRAS: Record<EnvId, ExtraKind[]> = {
  generic: [
    { name: 'Passer-by', hint: 'stranger', line: 'Terrible business. I saw nothing, naturally.' },
    { name: 'Local', hint: 'stranger', line: 'The police are here. Everyone is being very calm about it.' },
    { name: 'Neighbour', hint: 'maid', line: 'I heard everything and understood none of it.' },
  ],
  fete: [
    { name: 'Villager', hint: 'baker', line: 'Best scones in the county, and now this. Ghastly.' },
    { name: 'Morris dancer', hint: 'stranger', line: 'We were mid-jig when the screaming started. We did finish the dance.' },
    { name: 'Child', hint: 'stranger', line: 'I won a goldfish! Is the dead lady still going to judge the marrow?' },
    { name: 'Stallholder', hint: 'maid', line: 'Everything is half price now. Somebody has to keep the fete alive.' },
  ],
  gallery: [
    { name: 'Critic', hint: 'artist', line: 'Bold. Confrontational. The body is the best installation here.' },
    { name: 'Collector', hint: 'baron', line: 'I bid on the sculpture, not the corpse. Please note that.' },
    { name: 'Waiter', hint: 'butler', line: 'Champagne, Detective? It is the only thing tonight that is not evidence.' },
  ],
  station: [
    { name: 'Technician', hint: 'doctor', line: 'Power is holding. Do not go outside. Whatever you do, do not go outside.' },
    { name: 'Cook', hint: 'chef', line: 'Soup again. Somebody has to keep morale up.' },
    { name: 'Field assistant', hint: 'stranger', line: 'It is minus forty out there, and somehow it is colder in here.' },
  ],
  riverboat: [
    { name: 'Deckhand', hint: 'sailor', line: 'River is high tonight. Anyone who went in would not come up.' },
    { name: 'Card sharp', hint: 'lawyer', line: 'I never cheat. I merely enjoy exceptional luck.' },
    { name: 'Dancing girl', hint: 'actress', line: 'The whole boat shook when it happened. Or maybe that was the paddle.' },
    { name: 'Stoker', hint: 'sailor', line: 'Coal never lies, Detective. People do.' },
  ],
  manor: [
    { name: 'Footman', hint: 'butler', line: 'I am not permitted an opinion on the household, Detective.' },
    { name: 'Housemaid', hint: 'maid', line: 'I dusted that room at nine. It was not a crime scene then. Not yet.' },
    { name: 'Gardener', hint: 'stranger', line: 'Someone trampled the roses. I would have rather they had trampled the guests.' },
  ],
  liner: [
    { name: 'Deck steward', hint: 'steward', line: 'The captain has asked us all to stay calm. So we are all being very quiet, and very frightened.' },
    { name: 'Sailor', hint: 'sailor', line: 'We are four days from land. Whoever it was is still aboard.' },
    { name: 'Passenger', hint: 'baron', line: 'First class and murder. My travel agent did not mention it.' },
  ],
  lodge: [
    { name: 'Ski instructor', hint: 'stranger', line: 'The pass is closed. Nobody in, nobody out. It is cosy, in a terrible way.' },
    { name: 'Guest', hint: 'stranger', line: 'I came here to relax. This is the opposite of relaxing.' },
    { name: 'Chalet maid', hint: 'maid', line: 'More snow tonight. It hides every footprint.' },
  ],
  studio: [
    { name: 'Grip', hint: 'sailor', line: 'Someone moved a light. On a set, that is worse than moving a body.' },
    { name: 'Extra', hint: 'actress', line: 'I have been an angry villager in six pictures. Now I really am one.' },
    { name: 'Gaffer', hint: 'stranger', line: 'Cut! No, wait, wrong kind of cut. Sorry.' },
    { name: 'Publicist', hint: 'lawyer', line: 'No comment. But if you do have a comment, use my name.' },
  ],
  restaurant: [
    { name: 'Waiter', hint: 'butler', line: 'The kitchen is in uproar, Detective. And there are no spare aprons.' },
    { name: 'Sommelier', hint: 'butler', line: 'A very good year for murder, the sixty-two.' },
    { name: 'Diner', hint: 'banker', line: 'I have not had my dessert. Will there be dessert? Or only questions?' },
  ],
  train: [
    { name: 'Porter', hint: 'sailor', line: 'No stops till morning. Whoever did this is still on the train, sir.' },
    { name: 'Conductor', hint: 'captain', line: 'Tickets, please. And alibis.' },
    { name: 'Passenger', hint: 'baron', line: 'I thought the sleeping car would be peaceful. Then, of course, screams.' },
  ],
  club: [
    { name: 'Hostess', hint: 'singer', line: 'The band played on. That is what they pay us for, even when someone dies.' },
    { name: 'Bouncer', hint: 'stranger', line: 'I did not let anyone in that should not have been in. Except him.' },
    { name: 'Regular', hint: 'stranger', line: 'One bourbon, one alibi. Make the alibi a double.' },
  ],
  theatre: [
    { name: 'Stagehand', hint: 'sailor', line: 'Someone was up in the flies tonight. I heard the ropes creak.' },
    { name: 'Usher', hint: 'butler', line: 'I showed the gentleman to Box Five myself. He did not look ill. He looked frightened.' },
    { name: 'Chorus girl', hint: 'actress', line: 'Everyone will say it was the ghost. I say it was a person with a very good alibi.' },
  ],
};
