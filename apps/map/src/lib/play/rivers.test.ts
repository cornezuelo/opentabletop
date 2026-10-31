import type { HexKey } from '@open-tabletop/hex'
import { mapWorld } from '@open-tabletop/map'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { exampleMaps } from '../io/examples'
import { parseMapFile } from '../io/otd'
import { editor } from '../store/editor.svelte'
import { clickHex, partyMoved, sessionOf, step } from './play'

/**
 * Rivers crossed on the Grey Marches' example map: the river down column 8 is crossed by
 * the road at Keld Bridge (8,8) and the trail at the ford (8,6); anywhere else it's waded,
 * half a day more and a roll on the ford's oracle in deep water.
 */
describe('rivers crossed on the Grey Marches’ map', () => {
  const grey = () =>
    editor.open(parseMapFile(exampleMaps().find((m) => m.id === 'greymarches1')!.json))
  const trip = () => sessionOf(editor.map.play!)!
  beforeEach(() => {
    let seed = 7
    vi.spyOn(Math, 'random').mockImplementation(() => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return seed / 2147483648
    })
  })
  afterEach(() => vi.restoreAllMocks())

  it('a route across goes by the bridge or the ford, never wading', () => {
    grey()
    clickHex('10,5')
    const route = trip().travel.route!
    expect(route.at(-1)).toBe('10,5')
    expect(route.some((c) => c.startsWith('8,'))).toBe(true)
    const world = mapWorld(editor.map)
    const waded = route.slice(1).filter((c, i) => world.crossings?.(route[i], c).length)
    expect(waded).toEqual([])
  })

  it('a step into the river from its bank wades it: half a day more, and the Wading check', () => {
    grey()
    clickHex('5,7')
    const party = editor.map.tokens.find((t) => t.kind === 'party')!
    editor.map.tokens = editor.map.tokens.map((t) => (t === party ? { ...t, hex: '7,3' } : t))
    partyMoved('7,3' as HexKey)
    const before = trip().travel.time
    clickHex('8,3')
    expect(trip().travel.route).toEqual(['7,3', '8,3'])
    for (let i = 0; i < 10 && trip().travel.location !== '8,3'; i++) {
      step({ type: 'action', id: 'march' })
      for (const c of trip().travel.pendingChecks) step({ type: 'resolveCheck', id: c.id })
    }
    expect(trip().travel.location).toBe('8,3')
    // Ten km a step at 25 km a day of 8 hours, slowed by the land, plus four hours.
    expect(trip().travel.time - before).toBeGreaterThanOrEqual(240)
    expect(JSON.stringify(trip().journal)).toContain('WADE_CHECK_REQUIRED')
  })
})
