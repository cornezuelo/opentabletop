import { describe, expect, it } from 'vitest'
import { ROSTER_KEY } from './backup'
import { renameOldKeys } from './renamed'

function memory(entries: Record<string, string>) {
  const data = new Map(Object.entries(entries))
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  }
}

describe('data kept under the Hexmapper’s name', () => {
  it('moves to the Map app’s keys, the old ones winning', () => {
    const storage = memory({
      'hexmapper.currentMap': 'south1',
      'hexmapper.pending': '{"map":1}',
      'opentabletop.hexmapper.oracle': '{"pack":"core"}',
      'opentabletop.map.examples': '["old"]',
      'opentabletop.hexmapper.examples': '["grey-marches"]',
      'hexmapper.preferences': '{"provider":"obsidian"}',
    })
    renameOldKeys(storage)
    expect(Object.fromEntries(storage.data)).toEqual({
      'opentabletop.map.currentMap': 'south1',
      'opentabletop.map.pending': '{"map":1}',
      'opentabletop.map.oracle': '{"pack":"core"}',
      'opentabletop.map.examples': '["grey-marches"]',
      // Read by its own legacy reader (notes preferences).
      'hexmapper.preferences': '{"provider":"obsidian"}',
    })
  })

  it('moves the roster’s characters playing on a map to the app `map`', () => {
    const roster = {
      version: 1,
      characters: [
        { character: { id: 'kael' }, playing: { app: 'hexmapper', id: 'm1', name: 'North' } },
        { character: { id: 'mira' }, playing: { app: 'travel', id: 't1', name: 'Coast' } },
        { character: { id: 'oren' } },
      ],
    }
    const storage = memory({ [ROSTER_KEY]: JSON.stringify(roster) })
    renameOldKeys(storage)
    const after = JSON.parse(storage.getItem(ROSTER_KEY)!)
    expect(after.characters.map((e: { playing?: { app: string } }) => e.playing?.app)).toEqual([
      'map',
      'travel',
      undefined,
    ])
    expect(after.version).toBe(1)
    // Done once: nothing left to change.
    const again = storage.getItem(ROSTER_KEY)
    renameOldKeys(storage)
    expect(storage.getItem(ROSTER_KEY)).toBe(again)
  })

  it('leaves a broken roster as it is', () => {
    const storage = memory({ [ROSTER_KEY]: '{"hexmapper"' })
    renameOldKeys(storage)
    expect(storage.getItem(ROSTER_KEY)).toBe('{"hexmapper"')
  })
})
