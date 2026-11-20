import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import {
  carriedImages,
  getImage,
  IMAGE_FORMAT,
  imageEntry,
  imagesToCarry,
  keepCarriedImages,
  picturesNamed,
  putImage,
  readImage,
  type LibraryImage,
} from './imageLibrary'

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

describe('images carried in a file', () => {
  it('are those its data names as a picture, anywhere, once each', () => {
    const bundle = {
      characters: [
        { id: 'kael', ext: { character: { picture: 'kael-face', items: [{ picture: 'rope' }] } } },
        { id: 'mara', ext: { character: { picture: 'kael-face' } } },
        { id: 'tobin', ext: { character: {} } },
      ],
      parties: [{ ext: { map: { party: { picture: 'banner' } } } }],
      maps: [{ name: 'picture' }],
    }
    expect(picturesNamed(bundle).sort()).toEqual(['banner', 'kael-face', 'rope'])
  })

  it('go out with their data and come back into the library, keeping what it has', async () => {
    await putImage({ ...wolf, id: 'carried-wolf' })
    const carried = await imagesToCarry(['carried-wolf', 'gone'])
    expect(carried).toEqual([
      {
        id: 'carried-wolf',
        name: 'Grey wolf',
        data: wolf.data,
        width: 512,
        height: 384,
        tags: ['beast'],
        use: 'portrait',
      },
    ])
    const file = JSON.parse(
      JSON.stringify({ images: [...carried, { ...carried[0], id: 'other' }] }),
    )
    const read = carriedImages(file)
    expect(read).toHaveLength(2)
    // The one kept already stays as its owner left it; the new one is added.
    await putImage({ ...wolf, id: 'carried-wolf', name: 'Renamed' })
    expect(await keepCarriedImages(read, wolf.modified)).toBe(1)
    expect((await getImage('carried-wolf'))?.name).toBe('Renamed')
    expect(await getImage('other')).toMatchObject({ name: 'Grey wolf', modified: wolf.modified })
  })

  it('leave out what isn’t a picture, or is an SVG', () => {
    const images = [
      { id: 'ok', data: 'data:image/png;base64,iVBOR' },
      { id: 'svg', data: 'data:image/svg+xml,<svg onload=alert(1)>' },
      { id: 'js', data: 'javascript:alert(1)' },
      { data: 'data:image/png;base64,iVBOR' },
      'nonsense',
    ]
    expect(carriedImages({ images }).map((i) => i.id)).toEqual(['ok'])
    expect(carriedImages({})).toEqual([])
  })
})
