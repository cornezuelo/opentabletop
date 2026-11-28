import type { Compiled } from '@open-tabletop/oracle-engine'
import { samplesIn } from './samples'

/**
 * Starting point for each kind of definition, valid as soon as it's created, its sample texts
 * in `locale` (the pack's base language).
 */
export const TEMPLATES: Record<
  Compiled['kind'],
  (id: string, locale?: string) => Record<string, unknown>
> = {
  table: (id, locale) => {
    const w = samplesIn(locale)
    return {
      kind: 'table',
      id,
      name: id,
      roll: '1d6',
      entries: [
        { id: 'r1', range: '1-2', result: w('firstResult') },
        { id: 'r2', range: '3-4', result: w('secondResult') },
        { id: 'r3', range: '5-6', result: w('thirdResult') },
      ],
    }
  },
  // A neutral input: rename it and its options (odds, attitude, distance…) in the form.
  oracle: (id, locale) => {
    const w = samplesIn(locale)
    return {
      kind: 'oracle',
      id,
      name: id,
      inputs: { choice: { options: ['first', 'second'] } },
      roll: '1d6',
      variants: {
        first: {
          entries: [
            { id: 'a', range: '1-3', result: w('firstResult') },
            { id: 'b', range: '4-6', result: w('secondResult') },
          ],
        },
        second: {
          entries: [
            { id: 'a', range: '1-2', result: w('firstResult') },
            { id: 'b', range: '3-6', result: w('secondResult') },
          ],
        },
      },
    }
  },
  generator: (id) => ({
    kind: 'generator',
    id,
    name: id,
    fields: { count: { roll: '1d6' } },
    template: '{{count}} …',
  }),
  deck: (id, locale) => {
    const w = samplesIn(locale)
    return {
      kind: 'deck',
      id,
      name: id,
      cards: [
        { id: 'a', result: w('firstCard') },
        { id: 'b', result: w('secondCard') },
      ],
    }
  },
}
