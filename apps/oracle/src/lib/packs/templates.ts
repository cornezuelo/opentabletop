import type { Compiled } from '@open-tabletop/oracle-engine'

/** Starting point for each kind of definition, valid as soon as it's created. */
export const TEMPLATES: Record<Compiled['kind'], (id: string) => Record<string, unknown>> = {
  table: (id) => ({
    kind: 'table',
    id,
    name: id,
    roll: '1d6',
    entries: [
      { id: 'r1', range: '1-2', result: 'First result' },
      { id: 'r2', range: '3-4', result: 'Second result' },
      { id: 'r3', range: '5-6', result: 'Third result' },
    ],
  }),
  // A neutral input: rename it and its options (odds, attitude, distance…) in the form.
  oracle: (id) => ({
    kind: 'oracle',
    id,
    name: id,
    inputs: { choice: { options: ['first', 'second'] } },
    roll: '1d6',
    variants: {
      first: {
        entries: [
          { id: 'a', range: '1-3', result: 'First result' },
          { id: 'b', range: '4-6', result: 'Second result' },
        ],
      },
      second: {
        entries: [
          { id: 'a', range: '1-2', result: 'First result' },
          { id: 'b', range: '3-6', result: 'Second result' },
        ],
      },
    },
  }),
  generator: (id) => ({
    kind: 'generator',
    id,
    name: id,
    fields: { count: { roll: '1d6' } },
    template: '{{count}} …',
  }),
  deck: (id) => ({
    kind: 'deck',
    id,
    name: id,
    cards: [
      { id: 'a', result: 'First card' },
      { id: 'b', result: 'Second card' },
    ],
  }),
}

/** Rules of a system a pack can hold (one of each): its roll modes, travel rules, bindings. */
export const SYSTEM_KINDS = ['roll-modes', 'travel-rules', 'bindings'] as const
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
    resources: { food: { perDay: 1 } },
    weather: { storm: { speed: 0 } },
    checks: [{ event: 'WEATHER', at: 'day-start' }],
  }),
  bindings: (id) => ({
    kind: 'bindings',
    id,
    on: {},
    stats: {},
  }),
}
