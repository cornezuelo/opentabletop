import { describe, expect, it } from 'vitest'
import { applyResult, partyOf, placeCharacters } from '@open-tabletop/session'
import { exampleMaps } from '../io/examples'
import { parseMapFile } from '../io/otd'
import { editor } from '../store/editor.svelte'
import { clickHex, editSession, sessionOf, step, updatePlay } from './play'
import { copyTokens, drawnTokens, isCopy, tokenFromBestiary } from './present'
import { activeSystem } from './systems'

/**
 * Those present on the map: the copies the Grey Marches' trip makes, drawn on the hexes
 * where they were made from the play state (never the map's tokens), a crowd grouped by
 * template (×N) past six on a hex, and tokens placed from the bestiary in Edit.
 */
const greyMarches = () => parseMapFile(exampleMaps().find((m) => m.id === 'greymarches1')!.json)

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
})
