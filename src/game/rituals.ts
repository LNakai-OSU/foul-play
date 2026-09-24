/**
 * Setting signature interactions: a short (15-40 s), optional, clue-producing verb that belongs to the place. Each one is a small
 * game of timing, tuning or searching, always skippable, and always producing a headcount you could also get from the staff
 * (so nobody is ever stuck behind a mini-game).
 */
import type { EnvId } from './art/skins';

/**
 * Eight distinct control schemes so the 13 signature interactions play as different minigames, not one game in different clothes:
 *  - rhythm: a single repeating window; press SPACE while it is open (classic timing).
 *  - chain: three DIFFERENT-length windows back to back, each its own short cycle, instead of one loop repeated three times.
 *  - hold: hold SPACE to charge (a value rises and falls); release inside the marked band.
 *  - scrub: LEFT/RIGHT approach a fixed target, SPACE locks once you are close enough.
 *  - reverse: the target itself drifts; LEFT/RIGHT track it and hold SPACE steady on it for a moment to lock.
 *  - track: freely move a lamp/cursor, but the three marks must be found IN ORDER, not in any order.
 *  - scan: no free movement; LEFT/RIGHT cycle a cursor between a handful of fixed, discrete candidates, SPACE checks one (some are decoys).
 *  - reveal: freely sweep a lamp/cursor; SPACE marks any of the three spots, in any order.
 */
export type Mech = 'rhythm' | 'chain' | 'hold' | 'scrub' | 'reverse' | 'track' | 'scan' | 'reveal';

export interface RitualDef {
  /** the prop that is placed in one room and that you examine */
  prop: string;
  mech: Mech;
  /** drawing skin for the mechanic */
  skin: 'paddle' | 'door' | 'ropes' | 'porthole' | 'hatch' | 'radio' | 'film' | 'window' | 'uv' | 'dust' | 'snow';
  /** shown in the prompt over the prop, e.g. "PEER" -> "SPACE PEER" */
  verb: string;
  title: string;
  intro: string;
  /** the goal in one line, shown while playing */
  goal: string;
  win: string;
  skip: string;
  /** how the clue is worded */
  clueTitle: string;
  clueLead: string;
  color: string;
}

export const RITUALS: Record<EnvId, RitualDef> = {
  generic: { prop: 'globe', mech: 'reveal', skin: 'dust', verb: 'DUST', title: 'DUST FOR PRINTS', intro: 'Somebody has handled this recently.', goal: 'Sweep the brush. SPACE marks a print.', win: 'Fresh prints, and enough to place a few people.', skip: 'You leave the surface alone for now.', clueTitle: 'Prints and smudges', clueLead: 'You lift the prints and work out who was where at the shot.', color: '#c8b070' },
  fete: { prop: 'tea_urn', mech: 'reveal', skin: 'dust', verb: 'DUST', title: 'DUST THE TEA URN', intro: 'The urn was polished this morning. Whoever touched it since left a print.', goal: 'Sweep the brush. SPACE marks a print.', win: 'Three clean prints on the urn. Someone made tea at the shot; you can tell who.', skip: 'You put the brush away. The urn keeps its secrets.', clueTitle: 'Prints on the urn', clueLead: 'From the prints and the tea leaves you work out who was where at the shot.', color: '#c8a870' },
  manor: { prop: 'globe', mech: 'reveal', skin: 'dust', verb: 'DUST', title: 'DUST THE GLOBE', intro: 'Everyone spins the globe when they think nobody is looking.', goal: 'Sweep the brush. SPACE marks a print.', win: 'A whorl and a smear. The servants confirm the rest.', skip: 'The globe stays as it is.', clueTitle: 'Prints on the globe', clueLead: 'The prints and the servants together tell you who was where at the shot.', color: '#a89060' },
  gallery: { prop: 'glass_case', mech: 'scan', skin: 'uv', verb: 'SCAN', title: 'UV LAMP ON THE CASE', intro: 'Under the black light, oils and residues glow. A few smears mean nothing at all.', goal: 'LEFT / RIGHT the lamp between glows. SPACE checks one.', win: 'Handprints on the glass, and a trail of them leading away from one door.', skip: 'You switch the lamp off.', clueTitle: 'The UV survey', clueLead: 'The glow tells you which rooms were in use at the shot.', color: '#a070ff' },
  station: { prop: 'radio', mech: 'reverse', skin: 'radio', verb: 'TUNE', title: 'TUNE THE RADIO', intro: 'The signal drifts on the wind. Chase it and hold the dial steady to lock it in.', goal: 'LEFT / RIGHT track the drift. Hold SPACE steady to lock.', win: 'The automated log reads out who badged into which module at the shot.', skip: 'You leave the radio hissing.', clueTitle: 'The station log', clueLead: 'The automated log gives the headcount of each module at the shot.', color: '#7ad8ff' },
  riverboat: { prop: 'porthole', mech: 'rhythm', skin: 'paddle', verb: 'PEER', title: 'THE PADDLE WHEEL', intro: 'Through the porthole the lamps only show when the wheel is at the top of its turn.', goal: 'Press SPACE as the lamp flashes.', win: 'Three flashes, three glimpses: enough to count who was where at the shot.', skip: 'You close the porthole.', clueTitle: 'Through the porthole', clueLead: 'Timed with the paddle wheel you count heads through the windows.', color: '#ffd070' },
  liner: { prop: 'porthole', mech: 'chain', skin: 'porthole', verb: 'PEER', title: 'THE PORTHOLE', intro: 'The swell lifts the ship in a different rhythm each time. Time each one as it peaks.', goal: 'Press SPACE as each swell peaks: three swells, three lengths.', win: 'Three glimpses along the lit portholes.', skip: 'You step back from the glass.', clueTitle: 'Along the portholes', clueLead: 'Timed with the swell you count who was where at the shot.', color: '#8ad8ff' },
  lodge: { prop: 'boots', mech: 'track', skin: 'snow', verb: 'TRACK', title: 'TRACKS IN THE SNOW', intro: 'Fresh snow keeps every footprint. Follow the trail from where it starts.', goal: 'Sweep the lantern. SPACE marks the next print in line.', win: 'Three sets of tracks, all going to one place each.', skip: 'The snow keeps falling on it.', clueTitle: 'The tracks', clueLead: 'The tracks tell you which rooms had people in them at the shot.', color: '#e8f4ff' },
  studio: { prop: 'projector', mech: 'scrub', skin: 'film', verb: 'SCRUB', title: 'RUN THE PROJECTOR', intro: 'The backlot camera was left running. Somewhere on the reel is the shot.', goal: 'LEFT / RIGHT scrubs the film. SPACE stops on the frame.', win: 'The frame at the shot shows the lit windows of the lot, and who is at each.', skip: 'You stop the reel.', clueTitle: 'The reel', clueLead: 'The frame at the shot shows who was at which window.', color: '#ffe8a0' },
  restaurant: { prop: 'fridge_door', mech: 'hold', skin: 'hatch', verb: 'LISTEN', title: 'THE KITCHEN PASS', intro: 'Between orders the pass goes quiet and you can hear the dining rooms.', goal: 'Hold SPACE through the lull. Let go the instant it ends.', win: 'Two long lulls, two rooms: you count voices.', skip: 'You go back to your notes.', clueTitle: 'The lull', clueLead: 'In the lulls you count the voices in each room at the shot.', color: '#ffb090' },
  train: { prop: 'seats', mech: 'scrub', skin: 'window', verb: 'WATCH', title: 'THE WINDOW', intro: 'The timetable puts the bridge at the shot. Find it, and the corridor lights will tell you the rest.', goal: 'LEFT / RIGHT winds the view. SPACE stops on the bridge.', win: 'The bridge, at the shot. The lit compartments along the corridor are countable.', skip: 'You sit back.', clueTitle: 'The view from the window', clueLead: 'With the landmark you fix the moment and count the lit compartments.', color: '#ffd070' },
  club: { prop: 'coat_rack', mech: 'chain', skin: 'door', verb: 'LISTEN', title: 'LISTEN AT THE DOOR', intro: 'The band covers everything but the rests, and no two rests last as long.', goal: 'Press SPACE in each rest: three rests, three lengths.', win: 'Three rests, three rooms: voices you can count.', skip: 'You step away from the door.', clueTitle: 'Behind the door', clueLead: "In the band's rests you count the voices in each room.", color: '#ff9ac0' },
  theatre: { prop: 'winch', mech: 'hold', skin: 'ropes', verb: 'HAUL', title: 'WORK THE FLY ROPES', intro: 'From the fly loft the whole house is laid out beneath you. Haul away, and let go level with the mark.', goal: 'Hold SPACE to haul. Let go level with the mark.', win: 'From up here you can see every lit door in the house.', skip: 'You tie off the rope.', clueTitle: 'From the flies', clueLead: 'From the fly loft you count heads behind the lit doors.', color: '#ffb0a0' },
};
