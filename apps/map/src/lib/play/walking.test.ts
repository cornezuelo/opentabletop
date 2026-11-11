import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cellCenter, parseKey } from '@open-tabletop/hex'
import { toasts } from '@open-tabletop/ui-kit'
import { createMap, partyToken, type HexKey } from '@open-tabletop/map'
import { exampleMaps } from '../io/examples'
import { parseMapFile } from '../io/otd'
import { editor } from '../store/editor.svelte'
import { getTool } from '../tools/tools'
import * as play from './play'
import { partyElsewhere } from './present'
import { t } from '../i18n/index.svelte'

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

/** A room of 3 × 2 cells (3,3–5,4), played as one place, with a door to a corridor at 6,3. */
function room() {
  const map = createMap('The vault')
  map.grid = { ...map.grid, kind: 'square', width: 12, height: 12 }
  map.terrains = [
    ...map.terrains.filter((t) => t.id !== 'floor'),
    { id: 'floor', name: 'Floor', color: '#cccccc', floor: true },
  ]
  map.regions = [{ id: 'hall', name: 'The hall', color: '#888888', onePlace: true }]
  for (const cell of ['3,3', '4,3', '5,3', '3,4', '4,4', '5,4'])
    map.hexes[cell as HexKey] = { terrain: 'floor', region: 'hall' }
  map.hexes['6,3' as HexKey] = { terrain: 'floor' }
  map.hexes['7,3' as HexKey] = { terrain: 'floor' }
  map.connections = [{ id: 'd', between: ['5,3', '6,3'], kind: 'door' }]
  editor.load(map)
  editor.mode = 'play'
  editor.tool = 'play'
  play.setMode('rules')
  play.clickHex('3,4' as HexKey)
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

  it('on a map laid piece by piece, the unknown is rock: no way across it', () => {
    corridor()
    play.updatePlay((p) => ({ ...p, discover: { on: true, reveal: 'pieces' } }))
    // Beyond the rooms, in the blank: no route reaches it, through no wall and no exit.
    play.walkTo('5,8')
    expect(at()).toBe('3,3')
  })

  it('a campaign has one party: not drawn while another trip goes on', () => {
    corridor()
    expect(partyElsewhere()).toBe(false)
    editor.setPlaying({ app: 'map', id: 'another', name: 'Elsewhere' })
    expect(partyElsewhere()).toBe(true)
  })

  it('in a room a key steps one cell, with no time; out by its door it is a step of the trip', () => {
    room()
    const time = () => play.sessionOf(editor.map.play!)!.travel.time
    const before = time()
    expect(location()).toBe('area:hall')
    // W A S D walk as the arrows do.
    play.walkByKey('d')
    expect(at()).toBe('4,4')
    play.walkByKey('w')
    expect(at()).toBe('4,3')
    expect(location()).toBe('area:hall')
    expect(time()).toBe(before)
    expect(editor.map.play!.trail.slice(-2)).toEqual(['4,4', '4,3'])
    // The room's wall holds, and says so.
    toasts.length = 0
    play.walkByKey('arrowup')
    expect(at()).toBe('4,3')
    expect(toasts.some((x) => x.message === t('play.noWayThere'))).toBe(true)
    // No door at 5,4: the wall holds there too.
    play.walkByKey('s')
    play.walkByKey('d')
    play.walkByKey('d')
    expect(at()).toBe('5,4')
    play.walkByKey('w')
    play.walkByKey('d')
    expect(location()).toBe('6,3')
    expect(at()).toBe('6,3')
    expect(time()).toBeGreaterThan(before)
    // Out of the room, a key walks place by place again.
    play.walkByKey('arrowright')
    expect(location()).toBe('7,3')
  })

  it("a trip that can't move on says why (lost for the day)", () => {
    editor.open(parseMapFile(exampleMaps().find((m) => m.id === 'greymarches1')!.json))
    editor.mode = 'play'
    editor.tool = 'play'
    play.setMode('rules')
    play.clickHex('7,7' as HexKey)
    const start = location()
    play.updatePlay((p) => {
      const session = play.sessionOf(p)!
      const travel = { ...session.travel, today: { ...session.travel.today, lost: true } }
      return { ...p, rules: { ...p.rules!, session: { ...session, travel } } }
    })
    toasts.length = 0
    play.walkByKey('arrowright')
    expect(location()).toBe(start)
    expect(toasts.map((x) => x.message)).toEqual([
      expect.stringMatching(/^Lost: not possible for the rest of the day/),
    ])
  })

  it('in Ashford nobody gets lost, by day or in the dark', () => {
    const json = exampleMaps().find((m) => m.id === 'ashford1')!.json
    // Before Ashford was a village (`place.settled`), about one dawn in three got the party lost.
    for (let i = 0; i < 20; i++) {
      editor.open(parseMapFile(json))
      editor.mode = 'play'
      editor.tool = 'play'
      play.setMode('rules')
      play.clickHex('15,6' as HexKey)
      play.walkTo('area:reeve1')
      expect(location()).toBe('area:reeve1')
      const skipped = play
        .sessionOf(editor.map.play!)!
        .journal.filter((e) => e.code === 'CHECK_SKIPPED')
        .map((e) => e.data?.check)
      expect(skipped).toContain('NAVIGATION_CHECK_REQUIRED')
      expect(skipped).toContain('NIGHT_NAVIGATION_CHECK_REQUIRED')
    }
  })
})
