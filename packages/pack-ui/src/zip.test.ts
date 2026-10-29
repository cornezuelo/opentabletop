import { strToU8, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { packsToZip, planImport, zipToPacks } from './zip'

const manifest = (id: string) => `id: ${id}\nversion: 0.1.0\nlocale: en\n`

describe('packs in a .zip', () => {
  it('reads every pack folder of a zip made by hand, each file in its closest pack', () => {
    const zip = zipSync({
      'download/system/pack.yaml': strToU8(manifest('game')),
      'download/system/tables/omens.yaml': strToU8('kind: table\n'),
      'download/system/notes.txt': strToU8('not read'),
      'download/system/vendor/base-folder/pack.yaml': strToU8(manifest('base')),
      'download/system/vendor/base-folder/sky.yaml': strToU8('kind: weather\n'),
    })
    const packs = zipToPacks(zip)
    // In the zip's order; folders named by their manifest id.
    expect(packs.map((p) => p.root)).toEqual(['game', 'base'])
    expect(packs[0].files.map((f) => f.path)).toEqual(['pack.yaml', 'tables/omens.yaml'])
    expect(packs[1].files.map((f) => f.path)).toEqual(['pack.yaml', 'sky.yaml'])
  })

  it('a pack exported alone reads back as itself; a zip without pack.yaml has none', () => {
    const pack = {
      root: 'solo',
      origin: 'user' as const,
      files: [{ path: 'pack.yaml', content: manifest('solo') }],
    }
    expect(zipToPacks(packsToZip([pack]))).toEqual([pack])
    expect(zipToPacks(zipSync({ 'a.yaml': strToU8('x: 1') }))).toEqual([])
  })

  it('tells new packs from replaced ones and from those already there unchanged', () => {
    const p = (root: string, content: string) => ({
      root,
      origin: 'user' as const,
      files: [{ path: 'pack.yaml', content }],
    })
    const plan = planImport(
      [p('same', manifest('same')), { ...p('old', manifest('old')), origin: 'bundled' }],
      [p('same', manifest('same')), p('old', `${manifest('old')}# edited\n`), p('new', '')],
    )
    expect(plan.same.map((x) => x.root)).toEqual(['same'])
    expect(plan.replaced.map((x) => x.root)).toEqual(['old'])
    expect(plan.added.map((x) => x.root)).toEqual(['new'])
  })

  it('reads the packs of an export of everything, and nothing else of it', () => {
    const zip = zipSync({
      'opentabletop-export.json': strToU8('{"format":"opentabletop-export","version":1}'),
      'packs/lore/pack.yaml': strToU8(manifest('lore')),
      'packs/lore/tables.yaml': strToU8('kind: table\n'),
      'maps/greymarches1.json': strToU8('{}'),
      'trips/t1.json': strToU8('{}'),
    })
    const packs = zipToPacks(zip)
    expect(packs.map((p) => [p.root, p.files.map((f) => f.path).sort()])).toEqual([
      ['lore', ['pack.yaml', 'tables.yaml']],
    ])
  })
})
