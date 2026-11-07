import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cellCenter, parseKey } from '@open-tabletop/hex'
import { createMap, partyToken, type HexKey } from '@open-tabletop/map'
import { editor } from '../store/editor.svelte'
import { getTool } from '../tools/tools'
import * as play from './play'
import { partyElsewhere } from './present'

/** Two floor rooms side by side with a wall between, joined by nothing but a door at `door`. */
function corridor(door = true) {
  const map = createMap('The vault')
  map.grid = { ...map.grid, kind: 'square', width: 12, height: 12 }
  map.terrains = [
    ...map.terrains.filter((t) => t.id !== 'floor'),
    { id: 'floor', name: 'Floor', color: '#cccccc', floor: true },
  ]
  for (const cell of ['3,3', '4,3', '6,3', '7,3']) map.hexes[cell as HexKey] = { terrain: 'floor' }
  map.connections = door ? [{ id: 'd', between: ['4,3', '6,3'], kind: 'door' }] : []
  editor.load(map)
  editor.mode = 'play'
  editor.tool = 'play'
  play.setMode('rules')
  play.clickHex('3,3' as HexKey)
}

const at = () => partyToken(editor.map)?.hex
const location = () => play.sessionOf(editor.map.play!)!.travel.location

describe('walking', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('an arrow walks one place that way, and a wall stops it', () => {
    corridor(false)
    expect(play.walkByKey('arrowright')).toBe(true)
    expect(at()).toBe('4,3')
    // The next cell is rock: nothing moves.
    play.walkByKey('arrowright')
    expect(at()).toBe('4,3')
    play.walkByKey('arrowup')
    expect(at()).toBe('4,3')
  })

  it('an arrow goes through a door, and arrow keys do nothing off a trip', () => {
    corridor()
    play.walkByKey('arrowright')
    play.walkByKey('arrowright')
    expect(location()).toBe('6,3')
    editor.mode = 'edit'
    expect(play.walkByKey('arrowright')).toBe(false)
  })

  it('a place out of reach stays out of reach', () => {
    corridor(false)
    play.walkTo('7,3')
    expect(at()).toBe('3,3')
  })

  it('at the end of the way there is nowhere to go on to', () => {
    corridor()
    play.walkTo('4,3')
    const lines = play.sessionOf(editor.map.play!)!.journal.length
    play.walkTo('4,3')
    expect(play.sessionOf(editor.map.play!)!.journal).toHaveLength(lines)
  })

  it('a dragged party walks: through a door, never through a wall', () => {
    const drag = (to: string) => {
      const tool = getTool('play')
      const cell = (key: string) => parseKey(key as HexKey)
      const info = (key: string) => {
        const { x, y } = cellCenter(cell(key), editor.map.grid, editor.map.grid.hexSize)
        return { button: 0, shift: false, world: { x, y }, pickRadius: 1 } as never
      }
      const from = at()!
      tool.down(cell(from), info(from))
      tool.move(cell(to), info(to))
      tool.up?.()
    }
    corridor(false)
    drag('7,3')
    expect(at()).toBe('3,3')
    drag('4,3')
    expect(at()).toBe('4,3')
    corridor()
    drag('7,3')
    // Past the door, where the march stops or the place it was heading for.
    expect(['6,3', '7,3']).toContain(location())
  })

  it('a campaign has one party: not drawn while another trip goes on', () => {
    corridor()
    expect(partyElsewhere()).toBe(false)
    editor.setPlaying({ app: 'map', id: 'another', name: 'Elsewhere' })
    expect(partyElsewhere()).toBe(true)
  })
})
