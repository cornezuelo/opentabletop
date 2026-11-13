import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cellCenter, parseKey } from '@open-tabletop/hex'
import { dialog, toasts } from '@open-tabletop/ui-kit'
import { createMap, mapWalls, partyToken, placeOfCell, type HexKey } from '@open-tabletop/map'
import { seeded } from '@open-tabletop/random'
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
  map.scale = { ...map.scale, cellKm: 0.005 }
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

  it('while the trip waits (a pause, a fight) the party keeps still, in its room too', () => {
    room()
    const hold = (travel: object) =>
      play.updatePlay((p) => {
        const session = play.sessionOf(p)!
        return {
          ...p,
          rules: { ...p.rules!, session: { ...session, travel: { ...session.travel, ...travel } } },
        }
      })
    hold({ waiting: { time: 0 } })
    toasts.length = 0
    // Neither a key nor a click moves it across the room, and it says why.
    play.walkByKey('d')
    play.clickHex('5,3' as HexKey)
    expect(at()).toBe('3,4')
    expect(toasts.length).toBeGreaterThan(0)
    hold({ waiting: undefined })
    play.walkByKey('d')
    expect(at()).toBe('4,4')
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

  it('placing the party while another trip of the campaign goes on asks to pause it first', async () => {
    const elsewhere = { app: 'map', id: 'another', name: 'Elsewhere' }
    // Simple: the party isn't put where it wouldn't be drawn.
    editor.open(parseMapFile(exampleMaps().find((m) => m.id === 'ashford1')!.json))
    editor.mode = 'play'
    editor.tool = 'play'
    editor.setPlaying(elsewhere)
    play.clickHex('15,6' as HexKey)
    await vi.waitFor(() => expect(dialog.current?.message).toMatch(/Elsewhere/))
    dialog.current!.resolve('cancel')
    await vi.waitFor(() => expect(dialog.current).toBeNull())
    expect(at()).toBeUndefined()
    play.clickHex('15,6' as HexKey)
    await vi.waitFor(() => expect(dialog.current).not.toBeNull())
    dialog.current!.resolve('ok')
    await vi.waitFor(() => expect(at()).toBe('15,6'))
    expect(partyElsewhere()).toBe(false)
    // With rules: the trip starts here only once the other one is paused.
    editor.setPlaying(elsewhere)
    play.setMode('rules')
    expect(play.sessionOf(editor.map.play!)).toBeNull()
    await vi.waitFor(() => expect(dialog.current).not.toBeNull())
    dialog.current!.resolve('ok')
    await vi.waitFor(() => expect(play.sessionOf(editor.map.play!)).not.toBeNull())
    expect(partyElsewhere()).toBe(false)
  })

  it('sent to a cell of a room, the party stands there, not at its door', () => {
    room()
    // From the corridor, dragged deep into the room: the trip heads for the room.
    play.walkTo('6,3')
    expect(location()).toBe('6,3')
    play.walkTo('area:hall', '3,4' as HexKey)
    expect(location()).toBe('area:hall')
    expect(at()).toBe('3,4')
    // Another cell of the same room: it steps across at once, no time passes.
    const time = play.sessionOf(editor.map.play!)!.travel.time
    play.clickHex('5,3' as HexKey)
    expect(at()).toBe('5,3')
    expect(play.sessionOf(editor.map.play!)!.travel.time).toBe(time)
    // A walk by the keys lands where the way in is, as before.
    play.walkByKey('d')
    expect(location()).toBe('6,3')
    play.walkByKey('a')
    expect(at()).toBe('5,3')
  })

  it("Core's Explore counts on the map's own sheet, which the campaign keeps for that map", () => {
    room()
    expect(play.sessionOf(editor.map.play!)!.map).toMatchObject({ values: { explored: 0 } })
    play.step({ type: 'action', id: 'explore' })
    expect(play.sessionOf(editor.map.play!)!.map?.values.explored).toBe(1)
    expect(editor.campaign.mapSheets?.[editor.map.meta.id]?.values.explored).toBe(1)
  })

  it.each(['deepbarrows1', 'barrowhalls1'])(
    'in %s every key steps onto the cell that way, or says why it does not',
    (id) => {
      const random = seeded(7)
      vi.spyOn(Math, 'random').mockImplementation(() => random.next())
      editor.open(parseMapFile(exampleMaps().find((m) => m.id === id)!.json))
      editor.mode = 'play'
      editor.tool = 'play'
      play.setMode('rules')
      play.clickHex((at() ?? editor.map.meta.parent!.ways[0].entrance) as HexKey)
      const { grid } = editor.map
      const keys = { w: [0, -1], a: [-1, 0], s: [0, 1], d: [1, 0] } as const
      let moves = 0
      for (let i = 0; i < 120; i++) {
        // What the trip waits for is answered, as a player would.
        const waiting = play.sessionOf(editor.map.play!)!.travel
        if (waiting.pendingChecks[0])
          play.step({ type: 'resolveCheck', id: waiting.pendingChecks[0].id })
        else if (waiting.waiting) play.step({ type: 'resume' })
        const key = 'wasd'[Math.floor(random.next() * 4)] as keyof typeof keys
        const [x, y] = keys[key]
        const from = at()!
        toasts.length = 0
        play.walkByKey(key)
        const to = at()!
        // The trip stands where its token does: a room laid on its cell takes it in.
        expect(placeOfCell(editor.map, to)).toBe(location())
        if (to === from) {
          expect(toasts.length).toBeGreaterThan(0)
          continue
        }
        moves++
        // Never round a corner, nor through a wall: the cell that way, or across a door.
        const a = cellCenter(parseKey(from), grid, 1)
        const b = cellCenter(parseKey(to), grid, 1)
        const fit = ((b.x - a.x) * x + (b.y - a.y) * y) / Math.hypot(b.x - a.x, b.y - a.y)
        expect(fit).toBeGreaterThan(0.99)
        const door = editor.map.connections.some(
          (c) => c.between.includes(from) && c.between.includes(to),
        )
        if (!door) expect(mapWalls(editor.map).between(from, to)).toBe(false)
      }
      expect(moves).toBeGreaterThan(40)
    },
  )
})
