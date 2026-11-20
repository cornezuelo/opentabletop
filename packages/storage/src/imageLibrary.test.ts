import { describe, expect, it } from 'vitest'
import { IMAGE_FORMAT, imageEntry, readImage, type LibraryImage } from './imageLibrary'

const wolf: LibraryImage = {
  id: 'wolf',
  name: 'Grey wolf',
  modified: '2026-11-20T00:00:00.000Z',
  format: IMAGE_FORMAT,
  data: 'data:image/webp;base64,UklGR',
  width: 512,
  height: 384,
  tags: ['beast'],
  use: 'portrait',
}

describe('images in the library', () => {
  it('are kept as entries and read back as they were', () => {
    const entry = imageEntry(wolf)
    expect(entry).toMatchObject({ id: 'wolf', name: 'Grey wolf', modified: wolf.modified })
    expect(readImage(entry)).toEqual(wolf)
  })

  it('an entry that isn’t one (broken, of a newer format, not a picture) is none', () => {
    const entry = imageEntry(wolf)
    expect(readImage({ ...entry, json: '{oops' })).toBeUndefined()
    expect(readImage({ ...entry, json: JSON.stringify({ ...wolf, format: 2 }) })).toBeUndefined()
    expect(
      readImage({ ...entry, json: JSON.stringify({ ...wolf, data: 'javascript:alert(1)' }) }),
    ).toBeUndefined()
  })
})
