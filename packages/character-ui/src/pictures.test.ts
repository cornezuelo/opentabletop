import { describe, expect, it } from 'vitest'
import type { CharacterState, ItemState } from '@open-tabletop/character-engine'
import { setDefinitionPicture } from '@open-tabletop/ui-kit'
import { characterPicture, itemPicture, itemPictureRef, templatePictureRef } from './pictures'

const wolf = (picture?: string): CharacterState => ({
  id: 'grey-wolf-2',
  sheet: 'grey-marches/beast',
  values: {},
  conditions: {},
  tags: [],
  relations: [],
  template: { id: 'grey-wolf', from: 'grey-marches/marches' },
  ...(picture && { picture }),
})
const rope = (picture?: string): ItemState => ({
  key: 'rope',
  id: 'rope',
  from: 'core/gear',
  count: 1,
  fields: {},
  ...(picture && { picture }),
})
const nowhere = { getItem: () => null, setItem: () => {} }

describe('pictures of characters and items', () => {
  it('show a copy its template’s picture, unless it has a portrait of its own', () => {
    expect(characterPicture(wolf())).toBeUndefined()
    setDefinitionPicture(templatePictureRef(wolf().template!), 'wolf-face', nowhere)
    expect(characterPicture(wolf())).toBe('wolf-face')
    expect(characterPicture(wolf('scarred'))).toBe('scarred')
    setDefinitionPicture(templatePictureRef(wolf().template!), undefined, nowhere)
    expect(characterPicture(wolf())).toBeUndefined()
  })

  it('show an item its catalogue entry’s picture, unless it has one of its own', () => {
    expect(itemPictureRef({ id: 'compass' })).toBeUndefined()
    setDefinitionPicture(itemPictureRef(rope())!, 'coil', nowhere)
    expect(itemPicture(rope())).toBe('coil')
    expect(itemPicture(rope('frayed'))).toBe('frayed')
    // One made by hand has no catalogue entry: only its own.
    expect(itemPicture({ ...rope(), from: undefined })).toBeUndefined()
  })
})
