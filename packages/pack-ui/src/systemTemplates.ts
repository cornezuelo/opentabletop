/**
 * Starting points for the definitions of a system, valid as soon as they are created: the
 * Oracle's New definition and the Systems app use them.
 */
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

/**
 * Starting points for a travel system: rules like the generic ones with one weather
 * check, and bindings to fill in (which table answers each check).
 */
/** Each kind's starting point; `factions` only from the Systems app, which writes their sheet too. */
export const SYSTEM_TEMPLATES: Record<
  SystemKind | 'factions' | 'clocks' | 'world' | 'items' | 'bestiary' | 'land',
  (id: string) => Record<string, unknown>
> = {
  // The usual pair; rename, add (e.g. 3 rolls keeping the middle one) or remove modes.
  'roll-modes': (id) => ({
    kind: 'roll-modes',
    id,
    modes: {
      advantage: {
        name: 'Advantage',
        repeat: 2,
        keep: 'highest',
        cancels: 'roll-modes.disadvantage',
      },
      disadvantage: { name: 'Disadvantage', repeat: 2, keep: 'lowest' },
    },
  }),
  'travel-rules': (id) => ({
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
    edges: { road: { multiplier: 1.5 }, trail: { multiplier: 1.2 } },
    modes: { foot: { kmPerDay: 30 }, horse: { kmPerDay: 50 } },
    actions: {
      // Marching by day (06:00–20:00) for 8 hours, to the destination or one hex; camp
      // sleeps until 06:00.
      march: {
        params: { until: { choices: ['destination', 'hex'] } },
        when: { 'time.hour': { gte: 6, lt: 20 }, 'trip.marched': { lt: '{{system.hoursPerDay}}' } },
        do: [{ 'travel.move': '{{params.until}}' }],
      },
      camp: { do: [{ time: '06:00' }] },
      rest: { do: [{ time: 60 }] },
    },
    weather: { storm: { speed: 0 } },
    checks: [{ event: 'WEATHER', at: '06:00' }],
  }),
  bindings: (id) => ({
    kind: 'bindings',
    id,
    on: {},
    stats: {},
  }),
  // A small year to rename and extend: four months, a week, a moon and a feast, and a day
  // in four parts, the night tagged `dark` (the parts a copy of the Generic rules names).
  calendar: (id) => ({
    kind: 'calendar',
    id,
    name: 'The reckoning',
    divisions: {
      part: {
        name: 'Part of the day',
        parts: [
          { id: 'morning', name: 'morning', from: '06:00' },
          { id: 'afternoon', name: 'afternoon', from: '12:00' },
          { id: 'evening', name: 'evening', from: '17:00' },
          { id: 'night', name: 'night', from: '20:00', tags: ['dark'] },
        ],
      },
    },
    startYear: 1,
    months: [
      { id: 'thaw', name: 'Thaw', days: 30, season: 'spring' },
      { id: 'sun', name: 'Sun', days: 30, season: 'summer' },
      { id: 'leaf', name: 'Leaf', days: 30, season: 'autumn' },
      { id: 'frost', name: 'Frost', days: 30, season: 'winter' },
    ],
    weekdays: ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh'].map((day) => ({
      id: day,
      name: day,
    })),
    moons: [{ id: 'moon', name: 'The moon', cycle: 28 }],
    holidays: [{ id: 'midsummer', name: 'Midsummer', month: 'sun', day: 15 }],
  }),
  // Terrain with memory: each terrain tends to go on as itself; change the terrains and weights.
  land: (id) => ({
    kind: 'land',
    id,
    name: 'The land',
    next: {
      plains: { plains: 5, forest: 2, hills: 1 },
      forest: { forest: 5, plains: 2 },
      hills: { hills: 4, mountains: 2, plains: 1 },
      mountains: { mountains: 4, hills: 2 },
    },
    start: { plains: 2, forest: 1 },
  }),
  // Weather with memory, the same in every season: change the weights per season.
  weather: (id) => {
    const next = {
      clear: { clear: 3, rain: 1 },
      rain: { rain: 2, clear: 1, storm: 1 },
      storm: { rain: 2, clear: 1 },
    }
    const season = { start: 'clear', next }
    return {
      kind: 'weather',
      id,
      name: 'Weather',
      states: {
        clear: { name: 'Clear skies' },
        rain: { name: 'Rain' },
        storm: { name: 'Storm' },
      },
      seasons: { spring: season, summer: season, autumn: season, winter: season },
    }
  },
  // A sheet for the party's members with one made-up value and condition to rename: what
  // a character has is the system's to say.
  sheet: (id) => ({
    kind: 'sheet',
    id,
    name: 'Character',
    values: { 'value-1': { name: 'Value 1', default: 0, min: 0, max: 5 } },
    conditions: { 'condition-1': { name: 'Condition 1' } },
  }),
  // Two factions on Core's generic turn table, with a sheet of their own for their values
  // (written with them when the pack has none called `faction`).
  factions: (id) => ({
    kind: 'factions',
    id,
    sheet: 'sheet.faction',
    turn: 'core/table.faction-turn',
    every: 7,
    factions: {
      'the-crown': { name: 'The Crown', color: '#c9a227', values: { strength: 3 } },
      'the-rebels': { name: 'The Rebels', color: '#8b1e1e', values: { strength: 2 } },
    },
  }),
  // Two items to rename: what a system's characters may pick (their fields are the sheet's).
  items: (id) => ({
    kind: 'items',
    id,
    name: 'Gear',
    items: {
      rope: { name: 'Rope', description: 'Fifty feet of hemp.', tags: ['climbing'] },
      torch: { name: 'Torch', tags: ['light'] },
    },
  }),
  // Two templates to rename, on Core's character sheet (the Systems app puts the system's own):
  // rolls in braces are rolled for each copy.
  bestiary: (id) => ({
    kind: 'bestiary',
    id,
    name: 'Creatures',
    sheet: 'core/sheet.character',
    templates: {
      wolf: { name: 'Wolf', tags: ['beast'] },
      'wolf-leader': { name: 'Wolf leader', like: 'wolf', tags: ['leader'] },
    },
  }),
  // One clock that starts over once full: what a system's world clock starts with (what
  // happens when it fills is the world's rules').
  clocks: (id) => ({
    kind: 'clocks',
    id,
    clocks: {
      'the-threat-grows': { name: 'The threat grows', segments: 6, then: 'reset' },
    },
  }),
  // One reaction of the world to rename: after every world turn, one of Core's twists.
  world: (id) => ({
    kind: 'world',
    id,
    name: 'How the world moves',
    reactions: {
      news: {
        name: 'News of the world',
        on: 'world.turn',
        do: [{ say: 'News travels.' }, { roll: 'core/table.twists' }],
      },
    },
  }),
}

/**
 * A sheet for the party itself (a system's `partySheet`): one made-up value and condition
 * to rename (what the party has is the system's to say).
 */
export const PARTY_SHEET = (id: string): Record<string, unknown> => ({
  kind: 'sheet',
  id,
  name: 'The party',
  values: { 'value-1': { name: 'Value 1', default: 0, min: 0, max: 5 } },
  conditions: { 'condition-1': { name: 'Condition 1' } },
})

/** The sheet a new factions definition names, when its pack has none (`faction`). */
export const FACTION_SHEET = (): Record<string, unknown> => ({
  kind: 'sheet',
  id: 'faction',
  name: 'Faction',
  values: { strength: { name: 'Strength', default: 3, min: 0, max: 6 } },
  conditions: { 'at-war': { name: 'At war' } },
})
