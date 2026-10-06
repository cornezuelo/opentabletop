import { describe, expect, it } from 'vitest'
import { createMap } from './defaults'
import { hexesWithTag } from './hex'

describe('highlighting a tag', () => {
  it('finds the hexes inside the map that carry it', () => {
    const map = createMap()
    map.hexes['1,1'] = { tags: ['landmark', 'haunted'] }
    map.hexes['2,2'] = { tags: ['haunted'] }
    map.hexes['999,999'] = { tags: ['haunted'] }
    expect(hexesWithTag(map, 'haunted').sort()).toEqual(['1,1', '2,2'])
    expect(hexesWithTag(map, ' landmark ')).toEqual(['1,1'])
    expect(hexesWithTag(map, '')).toEqual([])
  })
})
