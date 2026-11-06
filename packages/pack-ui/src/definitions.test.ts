import { describe, expect, it } from 'vitest'
import {
  createSystemDefinition,
  deletePart,
  duplicatePart,
  qualifyRefs,
  slugify,
} from './definitions'
import { PackLibrary } from './library.svelte'
import { PART_KINDS } from './systemTemplates'

describe('definition helpers', () => {
  it('turns names into ids', () => {
    expect(slugify('Encuentros nocturnos!')).toBe('encuentros-nocturnos')
    expect(slugify('  ')).toBe('new')
  })

  it('makes local references absolute, leaving qualified ones alone', () => {
    expect(
      qualifyRefs(
        {
          id: 'x',
          entries: [{ table: 'table.weather-{{season}}' }, { generator: 'core/generator.prompt' }],
          fields: { npc: { table: 'table.npc-role' } },
          cards: [{ id: 'a', generator: 'generator.camp' }],
        },
        'kal-arath',
      ),
    ).toEqual({
      id: 'x',
      entries: [
        { table: 'kal-arath/table.weather-{{season}}' },
        { generator: 'core/generator.prompt' },
      ],
      fields: { npc: { table: 'kal-arath/table.npc-role' } },
      cards: [{ id: 'a', generator: 'kal-arath/generator.camp' }],
    })
  })
})

describe('parts of a pack', () => {
  const place = { root: 'mine', path: 'land.yaml', kind: 'land', id: 'default' }
  function library() {
    const lib = new PackLibrary([], {})
    lib.addPack({
      root: 'mine',
      origin: 'user',
      files: [
        { path: 'pack.yaml', content: 'id: mine\nversion: 0.1.0\nformat: 15\nlocale: en\n' },
        {
          path: 'land.yaml',
          content: 'kind: land\nid: default\nname: Plains\nnext: { plains: { plains: 1 } }\n',
        },
        { path: 'locales/es/land.yaml', content: 'land/default:\n  name: Llanos\n' },
      ],
    })
    return lib
  }

  it('duplicates one beside it, with its translations', () => {
    const lib = library()
    const id = duplicatePart(lib, place)
    expect(id).toBe('default-copy')
    expect(lib.readFile('mine', 'land.yaml')).toContain('id: default-copy')
    expect(lib.readFile('mine', 'land.yaml')).toContain('Plains (copy)')
    expect(lib.readFile('mine', 'locales/es/land.yaml')).toContain('land/default-copy')
  })

  it('deletes one and what translates it', () => {
    const lib = library()
    deletePart(lib, place)
    expect(lib.readFile('mine', 'land.yaml')).not.toContain('id: default')
    expect(lib.readFile('mine', 'locales/es/land.yaml')).not.toContain('Llanos')
  })

  it('makes any part from its template under a free id, a sheet beside factions', () => {
    const lib = library()
    expect(createSystemDefinition(lib, 'mine', 'land')).toEqual({
      path: 'land.yaml',
      id: 'default-2',
    })
    expect(createSystemDefinition(lib, 'mine', 'factions')?.path).toBe('factions.yaml')
    expect(lib.readFile('mine', 'factions.yaml')).toContain('kind: sheet')
    for (const kind of PART_KINDS) expect(createSystemDefinition(lib, 'mine', kind)).not.toBeNull()
    expect(lib.diagnostics('mine').filter((d) => d.severity === 'error')).toEqual([])
  })
})
