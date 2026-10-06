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
  oracle: (id) => ({
    kind: 'oracle',
    id,
    name: id,
    inputs: { odds: { options: ['unlikely', 'even', 'likely'], default: 'even' } },
    roll: '1d6',
    variants: {
      unlikely: {
        entries: [
          { id: 'yes', range: '1-2', result: 'Yes' },
          { id: 'no', range: '3-6', result: 'No' },
        ],
      },
      even: {
        entries: [
          { id: 'yes', range: '1-3', result: 'Yes' },
          { id: 'no', range: '4-6', result: 'No' },
        ],
      },
      likely: {
        entries: [
          { id: 'yes', range: '1-4', result: 'Yes' },
          { id: 'no', range: '5-6', result: 'No' },
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
