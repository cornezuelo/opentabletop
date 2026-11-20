import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getImage, IMAGE_FORMAT, putImage, type LibraryImage } from '@open-tabletop/storage'
import type { MapAsset } from '@open-tabletop/map'
import { assetToAdd, ICON_USE, iconChoices, keepMapIcons } from './mapIcons'

const tower: MapAsset = { id: 'tower', name: 'Tower', dataUrl: 'data:image/png;base64,iVBOR' }
const sigil: MapAsset = {
  id: 'sigil',
  name: 'Sigil',
  dataUrl: 'data:image/svg+xml;base64,PHN2Zy8+',
}
const well: LibraryImage = {
  id: 'well',
  name: 'Well',
  modified: '2026-11-20T00:00:00.000Z',
  format: IMAGE_FORMAT,
  data: 'data:image/webp;base64,UklGR',
  width: 64,
  height: 64,
  tags: [],
  use: ICON_USE,
}

describe('the pickers offer the map’s images and the library’s icons', () => {
  it('the map’s first, then those of the library it hasn’t got', () => {
    const library = [well, { ...well, id: 'tower', name: 'Tower (library)' }]
    expect(iconChoices([tower], library)).toEqual([
      { id: 'tower', name: 'Tower', url: tower.dataUrl },
      { id: 'well', name: 'Well', url: well.data },
    ])
    // The picture under the map is one of its images, not an icon.
    expect(iconChoices([tower], library, 'tower')).toEqual([
      { id: 'well', name: 'Well', url: well.data },
    ])
  })

  it('a library icon chosen becomes one of the map’s images; nothing else does', () => {
    expect(assetToAdd('asset:well', [tower], [well])).toEqual({
      id: 'well',
      name: 'Well',
      dataUrl: well.data,
    })
    expect(assetToAdd('asset:tower', [tower], [well])).toBeNull()
    expect(assetToAdd('game:castle', [tower], [well])).toBeNull()
    expect(assetToAdd('asset:gone', [tower], [well])).toBeNull()
    expect(assetToAdd(undefined, [tower], [well])).toBeNull()
  })
})

describe('a map’s images kept in the library', () => {
  // The browser's image and canvas, as far as drawing an SVG needs them.
  beforeEach(() => {
    vi.stubGlobal(
      'Image',
      class {
        src = ''
        naturalWidth = 512
        naturalHeight = 256
        decode = () => Promise.resolve()
      },
    )
    vi.stubGlobal('document', {
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => ({ drawImage: () => {} }),
        toDataURL: () => 'data:image/png;base64,drawn',
      }),
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('each by its id, for icons; an SVG drawn as a PNG, shrunk', async () => {
    expect(await keepMapIcons([tower, sigil], '2026-11-20T12:00:00.000Z')).toBe(2)
    expect(await getImage('tower')).toMatchObject({
      name: 'Tower',
      data: tower.dataUrl,
      width: 512,
      height: 256,
      use: ICON_USE,
    })
    expect(await getImage('sigil')).toMatchObject({
      data: 'data:image/png;base64,drawn',
      width: 256,
      height: 128,
      use: ICON_USE,
    })
  })

  it('one the library has already stays as its owner left it', async () => {
    await putImage({ ...well, id: 'kept', name: 'Renamed by me' })
    const asset = { id: 'kept', name: 'Kept', dataUrl: tower.dataUrl }
    expect(await keepMapIcons([asset])).toBe(0)
    expect((await getImage('kept'))?.name).toBe('Renamed by me')
  })
})
