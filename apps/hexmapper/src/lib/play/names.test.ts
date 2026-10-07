import { describe, expect, it } from 'vitest'
import { createMap } from '../model/defaults'
import { editor } from '../store/editor.svelte'
import { rollContext } from './oracle'
import { mapWorld } from './world'

describe('values named like what the map already says', () => {
  it('never hide the built-in facts: the hex, its icon and the token keep theirs', () => {
    const map = createMap()
    map.regions = [
      { id: 'r', name: 'The Vale', color: '#888888', fields: [{ key: 'danger', value: '1' }] },
    ]
    map.hexes['1,1'] = {
      terrain: 'forest',
      region: 'r',
      tags: ['ford'],
      fields: [
        // A hex's own value wins over its region's…
        { key: 'danger', value: '3' },
        // …but not over what the map itself says.
        { key: 'terrain', value: 'lava' },
        { key: 'region', value: 'Elsewhere' },
        { key: 'tags', value: 'nothing' },
      ],
      icon: {
        id: 'game:castle',
        fields: [
          { key: 'id', value: 'fake' },
          { key: 'guards', value: '4' },
        ],
      },
    }
    const cell = mapWorld(map).cell('1,1')!
    expect(cell).toMatchObject({
      danger: 3,
      terrain: 'forest',
      region: 'The Vale',
      tags: ['ford'],
      icon: { id: 'game:castle', guards: 4 },
    })

    editor.load(map)
    editor.tool = 'token'
    editor.map.tokens = [
      {
        id: 't',
        name: 'Brenna',
        kind: 'npc',
        hex: '1,1',
        iconId: 'game:person',
        fields: [
          { key: 'name', value: 'Not Brenna' },
          { key: 'kind', value: 'dragon' },
          { key: 'fare', value: '2' },
        ],
      },
    ]
    editor.selected = '1,1'
    editor.selectedToken = 't'
    expect(rollContext().token).toEqual({ name: 'Brenna', kind: 'npc', fare: 2 })
  })
})
