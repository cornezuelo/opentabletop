import { describe, expect, it } from 'vitest'
import { regionCells } from '@open-tabletop/map'
import { applyResult, partyOf, placeCharacters } from '@open-tabletop/session'
import { tripTab } from '@open-tabletop/travel-ui'
import { exampleMaps } from '../io/examples'
import { parseMapFile } from '../io/otd'
import { setTokenHitTest } from '../render/hitTest'
import { editor } from '../store/editor.svelte'
import { currentTool } from '../tools/tools'
import { clickHex, editSession, sessionOf, setMode, step, updatePlay } from './play'
import { copyTokens, drawnTokens, isCopy, tokenFromBestiary } from './present'
import { activeSystem } from './systems'

/**
 * Those present on the map: the copies the Grey Marches' trip makes, drawn on the hexes
 * where they were made from the play state (never the map's tokens), a crowd grouped by
 * template (×N) past six on a hex, and tokens placed from the bestiary in Edit.
 */
const example = (id: string) => parseMapFile(exampleMaps().find((m) => m.id === id)!.json)
const greyMarches = () => example('greymarches1')

describe('those present on the map', () => {
  it('draws the trip’s copies where they were made, grouped past six, never in the map', () => {
    editor.open(greyMarches())
    clickHex('7,7')
    const tokens = editor.map.tokens.length
    const rules = partyOf(activeSystem())
    // The wolves and their leader come where the party stands (as the encounter makes them).
    editSession((s) =>
      applyResult(s, { effects: { 'present.grey-wolf': 3, 'present.pack-leader': 1 } }, {}, rules),
    )
    const here = sessionOf(editor.map.play!)!.travel.location
    let drawn = copyTokens()
    expect(drawn).toHaveLength(4)
    expect(drawn.every((t) => t.hex === here && t.kind === 'enemy')).toBe(true)
    expect(drawn[0]).toMatchObject({ iconId: 'game:wolf-head', group: 'grey-wolf' })
    // Drawn, not kept: the map's tokens are as they were, and the roster sees the copies.
    expect(editor.map.tokens).toHaveLength(tokens)
    expect(placeCharacters(sessionOf(editor.map.play!)!).map((c) => c.id)).toContain('grey-wolf')
    // With the party, five on the hex: each drawn apart.
    expect(drawnTokens().filter((p) => p.hex === here)).toHaveLength(5)

    // Four more wolves (seven in all): the seven are one token, ×7.
    editSession((s) => applyResult(s, { effects: { 'present.grey-wolf': '=7' } }, {}, rules))
    drawn = copyTokens()
    expect(drawn).toHaveLength(8)
    const onHex = drawnTokens().filter((p) => p.hex === here)
    const wolves = onHex.find((p) => p.token.id === 'present:grey-wolf')!
    expect(wolves.group).toHaveLength(7)
    expect(onHex.map((p) => (isCopy(p.token) ? p.token.copy.character.id : p.token.kind))).toEqual([
      'party',
      'grey-wolf',
      'pack-leader',
    ])
    // Drawn apart when the play settings say so.
    updatePlay((p) => ({ ...p, copiesApart: true }))
    expect(drawnTokens().filter((p) => p.hex === here)).toHaveLength(9)
    updatePlay((p) => ({ ...p, copiesApart: undefined }))

    // The party marches on: the pack (`behind: leave`) is gone from the map too.
    step({ type: 'action', id: 'march' })
    expect(sessionOf(editor.map.play!)!.travel.location).not.toBe(here)
    expect(copyTokens()).toEqual([])
  })

  it('places a token from the bestiary: the template’s look and a sheet of its own', () => {
    editor.open(greyMarches())
    // The example map's Wyrm in its lair: a token placed from the bestiary, with its sheet.
    expect(editor.map.tokens.find((t) => t.id === 'greywoodwyrm')?.character).toMatchObject({
      sheet: 'grey-marches/foe',
      values: { health: 30, harm: 4, morale: 12 },
      tags: ['beast', 'wyrm'],
      template: { id: 'wyrm', from: 'grey-marches/marches' },
    })
    const wolf = tokenFromBestiary('grey-wolf', '3,3', 'Grey wolf', 'w1')!
    expect(wolf).toMatchObject({
      id: 'w1',
      name: 'Grey wolf',
      kind: 'enemy',
      hex: '3,3',
      iconId: 'game:wolf-head',
      character: { sheet: 'grey-marches/foe', template: { id: 'grey-wolf' } },
    })
    expect(wolf.character!.values.health).toBeGreaterThan(0)
    // A second of the same name is numbered; an unknown template makes none.
    editor.map.tokens = [...editor.map.tokens, wolf]
    expect(tokenFromBestiary('grey-wolf', '3,3', 'Grey wolf', 'w2')!.name).toBe('Grey wolf 2')
    expect(tokenFromBestiary('basilisk', '3,3', 'Basilisk')).toBeUndefined()
  })

  it('in Play, a click on one shows its sheet, and a drag moves it in the trip', () => {
    editor.open(greyMarches())
    clickHex('7,7')
    const rules = partyOf(activeSystem())
    // A wolf and its pack leader (wolves without one are routed).
    editSession((s) =>
      applyResult(s, { effects: { 'present.grey-wolf': 1, 'present.pack-leader': 1 } }, {}, rules),
    )
    const here = sessionOf(editor.map.play!)!.travel.location
    editor.tool = 'play'
    // The renderer's hit test: the first wolf's token where the pointer presses (x = 1).
    setTokenHitTest((world, copies) => (copies && world.x === 1 ? 'present:grey-wolf' : null))
    const info = { button: 0, alt: false, ctrl: false, shift: false, pickRadius: 1 }
    const tool = currentTool()
    tripTab.choose('journal')
    const heading = sessionOf(editor.map.play!)!.travel.destination
    tool.down({ col: 7, row: 7 }, { ...info, world: { x: 1, y: 0 } })
    tool.up()
    expect(tripTab.chosen).toBe('party')
    expect(tripTab.shown?.id).toBe('grey-wolf')
    // No destination was chosen by the click.
    expect(sessionOf(editor.map.play!)!.travel.destination).toBe(heading)

    // Dragged two cells away: drawn there while dragged, then moved in the trip.
    tool.down({ col: 7, row: 7 }, { ...info, world: { x: 1, y: 0 } })
    tool.move({ col: 9, row: 7 }, { ...info, world: { x: 50, y: 0 } })
    expect(copyTokens().find((t) => t.copy.character.id === 'grey-wolf')?.hex).toBe('9,7')
    expect(sessionOf(editor.map.play!)!.present![0].at).toBe(here)
    tool.up()
    const session = sessionOf(editor.map.play!)!
    expect(session.present!.map((p) => p.at)).toEqual(['9,7', here])
    expect(session.journal.at(-1)).toMatchObject({
      code: 'PRESENT_MOVED',
      source: 'user',
      data: { id: 'grey-wolf', at: '9,7' },
    })
    setTokenHitTest(() => null)
  })

  it('draws a copy in a room on the party’s cell, or the room’s', () => {
    editor.open(example('barrowhalls1'))
    const room = 'longbarrow1'
    const cells = regionCells(editor.map, room)
    // The party placed in the long barrow, then a trip with the rules (Core's: the
    // sub-map opened by itself has no campaign), and a foe comes.
    clickHex(cells[1])
    setMode('rules')
    const s = sessionOf(editor.map.play!)!
    expect(s.travel.location).toBe(`area:${room}`)
    editSession((s) =>
      applyResult(s, { effects: { 'present.foe': 1 } }, {}, partyOf(activeSystem())),
    )
    expect(copyTokens()[0].hex).toBe(cells[1])
    // Elsewhere than the party, in a room: drawn on the room's first cell.
    editSession((s) => ({
      ...s,
      present: s.present!.map((p) => ({ ...p, at: 'area:chieftomb1' })),
    }))
    expect(copyTokens()[0].hex).toBe(regionCells(editor.map, 'chieftomb1')[0])
  })
})
