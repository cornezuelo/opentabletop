import { describe, expect, it } from 'vitest'
import {
  DEFINITION_PICTURES_KEY,
  definitionPicture,
  definitionRef,
  readDefinitionPictures,
  setDefinitionPicture,
} from './definitionPictures.svelte'

function memory() {
  const kept = new Map<string, string>()
  return {
    getItem: (k: string) => kept.get(k) ?? null,
    setItem: (k: string, v: string) => void kept.set(k, v),
  }
}

describe('definition pictures', () => {
  it('are kept under opentabletop., so backups keep them', () => {
    expect(DEFINITION_PICTURES_KEY.startsWith('opentabletop.')).toBe(true)
  })

  it('chooses a definition’s picture, reads it back and forgets it', () => {
    const storage = memory()
    const rope = definitionRef('items', 'core/gear', 'rope')
    expect(rope).toBe('items:core/gear#rope')
    setDefinitionPicture(rope, 'img1', storage)
    expect(definitionPicture(rope)).toBe('img1')
    expect(readDefinitionPictures(storage)).toEqual({ [rope]: 'img1' })
    setDefinitionPicture(rope, undefined, storage)
    expect(definitionPicture(rope)).toBeUndefined()
    expect(readDefinitionPictures(storage)).toEqual({})
  })

  it('reads nothing from what isn’t a list of pictures', () => {
    const storage = memory()
    storage.setItem(DEFINITION_PICTURES_KEY, '[1,2]')
    expect(readDefinitionPictures(storage)).toEqual({})
    storage.setItem(DEFINITION_PICTURES_KEY, '{"a":"x","b":3}')
    expect(readDefinitionPictures(storage)).toEqual({ a: 'x' })
    storage.setItem(DEFINITION_PICTURES_KEY, 'nope')
    expect(readDefinitionPictures(storage)).toEqual({})
  })
})
