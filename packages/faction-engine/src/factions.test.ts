import { sequence } from '@open-tabletop/random'
import { describe, expect, it } from 'vitest'
import {
  border,
  changeTerritory,
  claim,
  frontier,
  holderOf,
  parseFactions,
  release,
  turnsDue,
  type TerritoryWorld,
} from './index'

/** A row of hexes 0…9, the last one sea. */
const row: TerritoryWorld = {
  neighbors: (h) => [Number(h) - 1, Number(h) + 1].filter((i) => i >= 0 && i < 10).map(String),
  holdable: (h) => h !== '9',
}

describe('factions', () => {
  it('reads a pack’s factions, and says what is wrong', () => {
    const { factions, errors } = parseFactions({
      kind: 'factions',
      id: 'default',
      sheet: 'faction',
      turn: 'faction-turn',
      every: 7,
      factions: {
        'iron-clans': {
          name: { en: 'The Iron Clans', es: 'Los Clanes de Hierro' },
          color: '#8b1e1e',
          values: { strength: 4 },
          territory: { regions: ['The Hollow Hills'], hexes: ['15,9'] },
        },
      },
    })
    expect(errors).toEqual([])
    expect(factions?.factions['iron-clans'].territory?.regions).toEqual(['The Hollow Hills'])
    expect(
      parseFactions({ kind: 'factions', id: 'x', sheet: 's', factions: { a: {} } }).errors,
    ).toEqual(['factions.a.turn: nothing to roll on its turn'])
    expect(
      parseFactions({ kind: 'factions', id: 'x', sheet: 's', factions: { A: { color: 'red' } } })
        .errors.length,
    ).toBeGreaterThan(0)
  })

  it('claims, releases and knows who holds what', () => {
    let t = claim({}, 'clans', ['3', '4'])
    t = claim(t, 'vale', ['1', '2', '3'])
    expect(t).toEqual({ clans: ['4'], vale: ['1', '2', '3'] })
    expect(holderOf(t, '3')).toBe('vale')
    t = release(t, 'vale', ['1'])
    expect(holderOf(t, '1')).toBeUndefined()
    expect(frontier(t, 'vale', row)).toEqual(['1', '4'])
    expect(border(t, 'vale', row)).toEqual(['2', '3'])
  })

  it('grows from its border, nobody’s land first, then its neighbours’', () => {
    const t = { vale: ['2', '3'], clans: ['4'] }
    // Two hexes: 1 (free) first; then only the clans' 4 is left to take… or 0.
    const grown = changeTerritory(t, 'vale', 2, row, sequence([0, 0.99]))
    expect(grown.events[0]).toEqual({ type: 'TERRITORY_GAINED', faction: 'vale', hex: '1' })
    expect(grown.territories.vale).toContain('1')
    // Not into the sea.
    const sea = changeTerritory({ vale: ['8'] }, 'vale', 3, row, sequence([0.99, 0.99, 0.99]))
    expect(sea.territories.vale).not.toContain('9')
    // Taking another faction's hex when nothing else is free.
    const squeezed = changeTerritory(
      { vale: ['0', '1'], clans: ['2'] },
      'vale',
      1,
      row,
      sequence([0]),
    )
    expect(squeezed.events).toEqual([
      { type: 'TERRITORY_GAINED', faction: 'vale', hex: '2', from: 'clans' },
    ])
    expect(squeezed.territories.clans).toEqual([])
  })

  it('loses its border hexes first; with no land, it can’t grow', () => {
    const lost = changeTerritory({ vale: ['2', '3', '4'] }, 'vale', -1, row, sequence([0]))
    expect(lost.events).toEqual([{ type: 'TERRITORY_LOST', faction: 'vale', hex: '2' }])
    expect(changeTerritory({ vale: [] }, 'vale', 2, row, sequence([0])).events).toEqual([])
  })

  it('says when world turns come', () => {
    const day = 1440
    expect(turnsDue(0, 20 * day, 7)).toEqual([7 * day, 14 * day])
    expect(turnsDue(0, 20 * day, 0)).toEqual([])
    expect(turnsDue(0, 20 * day, undefined)).toEqual([])
    expect(turnsDue(14 * day, 20 * day, 7)).toEqual([])
  })
})
