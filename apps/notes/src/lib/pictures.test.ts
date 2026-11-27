import 'fake-indexeddb/auto'
import { strFromU8, unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { newPage } from '@open-tabletop/notes'
import { allImages, deleteImage, IMAGE_FORMAT, putImage, readImage } from '@open-tabletop/storage'
import { exportZip, notes, planImport, readChosen, writeImport } from './notes.svelte'

const NOW = '2026-11-27T10:00:00.000Z'
const MILL = 'data:image/webp;base64,UklGRhIAAABXRUJQVlA4TAYAAAAvAAAAAAA='

describe('pictures in pages, exported and imported', () => {
  it('carries the pages’ pictures in pictures/ and keeps them in the library again', async () => {
    await putImage({
      id: 'mill',
      name: 'The old mill',
      modified: NOW,
      format: IMAGE_FORMAT,
      data: MILL,
      width: 1,
      height: 1,
      tags: [],
      use: 'note',
    })
    notes.pages = [newPage('p1', 'places/Mill', undefined, NOW, 'See ![The mill](picture:mill).')]
    const zip = unzipSync(await exportZip())
    expect(strFromU8(zip['General/places/Mill.md'])).toBe(
      'See ![The mill](../../pictures/The%20old%20mill.webp).',
    )
    expect(zip['pictures/The old mill.webp']).toBeDefined()

    // In a library that has it, the same picture is the one it has.
    const file = new File([new Uint8Array(await exportZip())], 'notes.zip')
    const same = await planImport(await readChosen([file]), undefined)
    expect(same.pictures).toEqual([])
    expect(same.put[0].body).toBe('See ![The mill](picture:mill).')

    // In one that hasn't (another browser), it's kept as a new picture.
    await deleteImage('mill')
    const plan = await planImport(await readChosen([file]), undefined)
    expect(plan.pictures).toHaveLength(1)
    const kept = plan.pictures[0]
    expect(kept).toMatchObject({ name: 'The old mill', data: MILL, use: 'note' })
    expect(plan.put[0].body).toBe(`See ![The mill](picture:${kept.id}).`)
    await writeImport(plan.put, plan.pictures)
    const library = (await allImages()).flatMap((e) => readImage(e) ?? [])
    expect(library.map((i) => i.id)).toEqual([kept.id])
  })
})
