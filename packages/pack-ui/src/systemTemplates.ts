import { samplesIn } from './samples'

/** The ids of a new calendar's days of the week (their names are the pack's language's). */
const WEEKDAYS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh']

/** Rules of a system a pack can hold (one of each): its roll modes, travel rules, bindings. */
export const SYSTEM_KINDS = [
  'roll-modes',
  'travel-rules',
  'bindings',
  'calendar',
  'weather',
  'sheet',
] as const
export type SystemKind = (typeof SYSTEM_KINDS)[number]

/** Parts of a system a pack may hold as many of as it wants. */
export const PART_KINDS = [
  'land',
  'items',
  'bestiary',
  'places',
  'pieces',
  'factions',
  'clocks',
  'world',
] as const
export type PartKind = (typeof PART_KINDS)[number]

/**
 * Each kind's starting point, valid as soon as it's created: the Oracle's New definition and
 * the Packs app use them (`factions` only from the Packs app, which writes their sheet too).
 * Their texts are in `locale`, the pack's base language (English by default).
 */
export const SYSTEM_TEMPLATES: Record<
  | SystemKind
  | 'factions'
  | 'clocks'
  | 'world'
  | 'items'
  | 'bestiary'
  | 'places'
  | 'pieces'
  | 'land',
  (id: string, locale?: string) => Record<string, unknown>
> = {
  // The usual pair; rename, add (e.g. 3 rolls keeping the middle one) or remove modes.
  'roll-modes': (id, locale) => {
    const w = samplesIn(locale)
    return {
      kind: 'roll-modes',
      id,
      modes: {
        advantage: {
          name: w('advantage'),
          repeat: 2,
          keep: 'highest',
          cancels: 'roll-modes.disadvantage',
        },
        disadvantage: { name: w('disadvantage'), repeat: 2, keep: 'lowest' },
      },
    }
  },
  'travel-rules': (id) => {
    return {
      kind: 'travel-rules',
      id,
      // Trips start at 06:00; going on by itself the party marches to its destination, and a
      // party that can't march camps from 20:00.
      travel: {
        hoursPerDay: 8,
        start: '06:00',
        onward: { do: 'actions.march', with: { until: 'destination' } },
        halt: { at: '20:00', do: 'actions.camp' },
      },
      terrains: {
        plains: { multiplier: 1 },
        forest: { multiplier: 0.5 },
        hills: { multiplier: 0.5 },
        mountains: { multiplier: 0.33 },
        swamp: { multiplier: 0.33 },
        lake: { passable: false },
        sea: { passable: false },
      },
      connections: { road: { multiplier: 1.5 }, trail: { multiplier: 1.2 } },
      modes: { foot: { kmPerDay: 30 }, horse: { kmPerDay: 50 } },
      actions: {
        // Marching by day (06:00–20:00) for 8 hours, to the destination or one hex; camp
        // sleeps until 06:00.
        march: {
          params: { until: { choices: ['destination', 'place'] } },
          when: {
            'time.hour': { gte: 6, lt: 20 },
            'trip.marched': { lt: '{{system.hoursPerDay}}' },
          },
          do: [{ 'travel.move': '{{params.until}}' }],
        },
        camp: { do: [{ time: '06:00' }] },
        rest: { do: [{ time: 60 }] },
      },
      weather: { storm: { speed: 0 } },
      checks: [{ event: 'WEATHER', at: '06:00' }],
    }
  },
  bindings: (id) => {
    return {
      kind: 'bindings',
      id,
      on: {},
      stats: {},
    }
  },
  // A small year to rename and extend: four months, a week, a moon and a feast, and a day
  // in four parts, the night tagged `dark` (the parts a copy of the Generic rules names).
  calendar: (id, locale) => {
    const w = samplesIn(locale)
    return {
      kind: 'calendar',
      id,
      name: w('calendar'),
      divisions: {
        part: {
          name: w('partOfDay'),
          parts: [
            { id: 'morning', name: w('morning'), from: '06:00' },
            { id: 'afternoon', name: w('afternoon'), from: '12:00' },
            { id: 'evening', name: w('evening'), from: '17:00' },
            { id: 'night', name: w('night'), from: '20:00', tags: ['dark'] },
          ],
        },
      },
      startYear: 1,
      months: [
        { id: 'thaw', name: w('thaw'), days: 30, season: 'spring' },
        { id: 'sun', name: w('sun'), days: 30, season: 'summer' },
        { id: 'leaf', name: w('leaf'), days: 30, season: 'autumn' },
        { id: 'frost', name: w('frost'), days: 30, season: 'winter' },
      ],
      weekdays: w('weekdays')
        .split(',')
        .map((name, i) => ({ id: WEEKDAYS[i], name })),
      moons: [{ id: 'moon', name: w('moon'), cycle: 28 }],
      holidays: [{ id: 'midsummer', name: w('midsummer'), month: 'sun', day: 15 }],
    }
  },
  // Terrain with memory: each terrain tends to go on as itself; change the terrains and weights.
  land: (id, locale) => {
    const w = samplesIn(locale)
    return {
      kind: 'land',
      id,
      name: w('land'),
      next: {
        plains: { plains: 5, forest: 2, hills: 1 },
        forest: { forest: 5, plains: 2 },
        hills: { hills: 4, mountains: 2, plains: 1 },
        mountains: { mountains: 4, hills: 2 },
      },
      start: { plains: 2, forest: 1 },
    }
  },
  // Weather with memory, the same in every season: change the weights per season.
  weather: (id, locale) => {
    const w = samplesIn(locale)
    const next = {
      clear: { clear: 3, rain: 1 },
      rain: { rain: 2, clear: 1, storm: 1 },
      storm: { rain: 2, clear: 1 },
    }
    const season = { start: 'clear', next }
    return {
      kind: 'weather',
      id,
      name: w('weather'),
      states: {
        clear: { name: w('clear') },
        rain: { name: w('rain') },
        storm: { name: w('storm') },
      },
      seasons: { spring: season, summer: season, autumn: season, winter: season },
    }
  },
  // A sheet for the party's members with one made-up value and condition to rename: what
  // a character has is the system's to say.
  sheet: (id, locale) => {
    const w = samplesIn(locale)
    return {
      kind: 'sheet',
      id,
      name: w('character'),
      values: { 'value-1': { name: w('value', { n: 1 }), default: 0, min: 0, max: 5 } },
      conditions: { 'condition-1': { name: w('condition', { n: 1 }) } },
    }
  },
  // Two factions on Core's generic turn table, with a sheet of their own for their values
  // (written with them when the pack has none called `faction`).
  factions: (id, locale) => {
    const w = samplesIn(locale)
    return {
      kind: 'factions',
      id,
      sheet: 'sheet.faction',
      turn: 'core/table.faction-turn',
      every: 7,
      factions: {
        'the-crown': { name: w('crown'), color: '#c9a227', values: { strength: 3 } },
        'the-rebels': { name: w('rebels'), color: '#8b1e1e', values: { strength: 2 } },
      },
    }
  },
  // Two items to rename: what a system's characters may pick (their fields are the sheet's).
  items: (id, locale) => {
    const w = samplesIn(locale)
    return {
      kind: 'items',
      id,
      name: w('gear'),
      items: {
        rope: { name: w('rope'), description: w('ropeDescription'), tags: ['climbing'] },
        torch: { name: w('torch'), tags: ['light'] },
      },
    }
  },
  // Two templates to rename, on Core's character sheet (the Packs app puts the system's own):
  // rolls in braces are rolled for each copy.
  bestiary: (id, locale) => {
    const w = samplesIn(locale)
    return {
      kind: 'bestiary',
      id,
      name: w('creatures'),
      sheet: 'core/sheet.character',
      templates: {
        wolf: { name: w('wolf'), tags: ['beast'] },
        'wolf-leader': { name: w('wolfLeader'), like: 'wolf', tags: ['leader'] },
      },
    }
  },
  // One place to rename: what a result makes on the party's hex (`place.pois.camp: 1`).
  places: (id, locale) => {
    const w = samplesIn(locale)
    return {
      kind: 'places',
      id,
      name: w('places'),
      places: {
        camp: {
          name: w('camp'),
          description: w('campDescription'),
          icon: 'game:campfire',
          tags: ['camp'],
        },
      },
    }
  },
  // Two pieces to rename: a passage and a room, to lay a map through its exits with.
  pieces: (id, locale) => {
    const w = samplesIn(locale)
    return {
      kind: 'pieces',
      id,
      name: w('pieces'),
      marks: { '.': 'stone-floor' },
      pieces: {
        passage: {
          name: w('passage'),
          cells: 'A\n.\n.\nB\n',
          exits: { A: { kind: 'door' }, B: { kind: 'door' } },
        },
        'dead-end': { name: w('deadEnd'), cells: 'A\n.\n', exits: { A: { kind: 'door' } } },
      },
    }
  },
  // One clock that starts over once full: what a system's world clock starts with (what
  // happens when it fills is the world's rules').
  clocks: (id, locale) => {
    const w = samplesIn(locale)
    return {
      kind: 'clocks',
      id,
      clocks: {
        'the-threat-grows': { name: w('threat'), segments: 6, then: 'reset' },
      },
    }
  },
  // One reaction of the world to rename: after every world turn, one of Core's twists.
  world: (id, locale) => {
    const w = samplesIn(locale)
    return {
      kind: 'world',
      id,
      name: w('world'),
      reactions: {
        news: {
          name: w('news'),
          on: 'world.turn',
          do: [{ say: w('newsTravels') }, { roll: 'core/table.twists' }],
        },
      },
    }
  },
}

/**
 * A sheet for the party itself (a system's `partySheet`): one made-up value and condition
 * to rename (what the party has is the system's to say).
 */
export const PARTY_SHEET = (id: string, locale?: string): Record<string, unknown> => {
  const w = samplesIn(locale)
  return {
    kind: 'sheet',
    id,
    name: w('party'),
    values: { 'value-1': { name: w('value', { n: 1 }), default: 0, min: 0, max: 5 } },
    conditions: { 'condition-1': { name: w('condition', { n: 1 }) } },
  }
}

/**
 * A sheet for each map (a system's `mapSheet`): one made-up value to rename (what a map keeps
 * of its own, a dungeon's alarm or a domain's dice, is the system's to say).
 */
export const MAP_SHEET = (id: string, locale?: string): Record<string, unknown> => {
  const w = samplesIn(locale)
  return {
    kind: 'sheet',
    id,
    name: w('map'),
    values: { 'value-1': { name: w('value', { n: 1 }), default: 0, min: 0 } },
  }
}

/**
 * A sheet for each place (a system's `placeSheet`): one made-up value and condition to rename
 * (what a place remembers, a room searched or a trap set, is the system's to say).
 */
export const PLACE_SHEET = (id: string, locale?: string): Record<string, unknown> => {
  const w = samplesIn(locale)
  return {
    kind: 'sheet',
    id,
    name: w('place'),
    values: { 'value-1': { name: w('value', { n: 1 }), default: 0, min: 0 } },
    conditions: { 'condition-1': { name: w('condition', { n: 1 }) } },
  }
}

/** The sheet a new factions definition names, when its pack has none (`faction`). */
export const FACTION_SHEET = (locale?: string): Record<string, unknown> => {
  const w = samplesIn(locale)
  return {
    kind: 'sheet',
    id: 'faction',
    name: w('faction'),
    values: { strength: { name: w('strength'), default: 3, min: 0, max: 6 } },
    conditions: { 'at-war': { name: w('atWar') } },
  }
}

/** What a new land model starts from: open land (`SYSTEM_TEMPLATES.land`), caves, a town. */
export const LAND_STARTS = {
  open: SYSTEM_TEMPLATES.land,
  caves: (id: string, locale?: string) => {
    const w = samplesIn(locale)
    return {
      kind: 'land',
      id,
      name: w('caves'),
      next: {
        rock: { rock: 6, 'cave-floor': 2 },
        'cave-floor': { 'cave-floor': 5, rock: 2, rubble: 1, pool: 1 },
        rubble: { 'cave-floor': 3, rock: 2 },
        pool: { pool: 3, 'cave-floor': 2 },
      },
      start: { rock: 3, 'cave-floor': 1 },
    }
  },
  town: (id: string, locale?: string) => {
    const w = samplesIn(locale)
    return {
      kind: 'land',
      id,
      name: w('town'),
      next: {
        cobbles: { cobbles: 5, yard: 2, 'wood-floor': 2 },
        yard: { yard: 3, cobbles: 2, garden: 2 },
        garden: { garden: 4, yard: 2 },
        'wood-floor': { 'wood-floor': 6, cobbles: 1 },
      },
      start: { cobbles: 3, yard: 1 },
    }
  },
}
export type LandStart = keyof typeof LAND_STARTS
