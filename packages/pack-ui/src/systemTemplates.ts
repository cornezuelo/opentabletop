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
] as const
export type SystemKind = (typeof SYSTEM_KINDS)[number]

/**
 * Starting points for a travel system: rules like the generic ones with one weather
 * check, and bindings to fill in (which table answers each check).
 */
export const SYSTEM_TEMPLATES: Record<SystemKind, (id: string) => Record<string, unknown>> = {
  // The usual pair; rename, add (e.g. 3 rolls keeping the middle one) or remove modes.
  'roll-modes': (id) => ({
    kind: 'roll-modes',
    id,
    modes: {
      advantage: { name: 'Advantage', repeat: 2, keep: 'highest', cancels: 'disadvantage' },
      disadvantage: { name: 'Disadvantage', repeat: 2, keep: 'lowest' },
    },
  }),
  'travel-rules': (id) => ({
    kind: 'travel-rules',
    id,
    day: { start: '06:00', nightfall: '20:00' },
    travel: { hoursPerDay: 8 },
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
    // Food never goes below 0; the party eats a day of it as each day ends.
    resources: { food: { min: 0 } },
    actions: {
      camp: { do: [{ time: 'dawn' }] },
      rest: { do: [{ time: 60 }] },
      eat: { on: 'day-end', do: [{ effects: { 'party.resources.food': -1 } }] },
    },
    weather: { storm: { speed: 0 } },
    checks: [{ event: 'WEATHER', at: 'day-start' }],
  }),
  bindings: (id) => ({
    kind: 'bindings',
    id,
    on: {},
    stats: {},
  }),
  // A small year to rename and extend: four months, a week, a moon and a feast.
  calendar: (id) => ({
    kind: 'calendar',
    id,
    name: 'The reckoning',
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
}
