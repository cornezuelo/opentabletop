import type { HexKey } from '@open-tabletop/hex'
import { describe, expect, it } from 'vitest'
import { FADED, mapFocus, type MapFocusInput } from './focus'

const base: MapFocusInput = {
  tool: 'terrain',
  panelView: 'tool',
  regionId: 'vale',
  factionBrush: null,
  regionsOf: (k) => (k === '1,1' || k === '1,2' ? ['vale'] : []),
  hexes: ['1,1', '1,2', '3,3'] as HexKey[],
  territories: { clans: ['3,3'] },
}

describe('what the map brings forward', () => {
  it('shows both layers in full when neither is worked on', () => {
    expect(mapFocus(base)).toEqual({ regionsAlpha: 1, factionsAlpha: 1, selected: [] })
  })

  it('with the Regions tool: the regions, and the region it paints', () => {
    expect(mapFocus({ ...base, tool: 'region' })).toEqual({
      regionsAlpha: 1,
      factionsAlpha: FADED,
      selected: ['1,1', '1,2'],
    })
    expect(mapFocus({ ...base, tool: 'region', regionId: null }).selected).toEqual([])
  })

  it('with the World panel: the factions, and the faction its brush paints', () => {
    const world = { ...base, tool: 'region', panelView: 'world' }
    expect(mapFocus(world)).toEqual({ regionsAlpha: FADED, factionsAlpha: 1, selected: [] })
    expect(mapFocus({ ...world, factionBrush: 'clans' }).selected).toEqual(['3,3'])
  })
})
