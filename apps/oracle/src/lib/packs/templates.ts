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

// Starting points for the definitions of a system, shared with the Systems app.
export { SYSTEM_KINDS, SYSTEM_TEMPLATES, type SystemKind } from '@open-tabletop/pack-ui'
