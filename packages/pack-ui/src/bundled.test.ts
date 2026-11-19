import { loadPackFiles } from '@open-tabletop/oracle-engine'
import { getBuiltinIcon } from '@open-tabletop/ui-kit/icons'
import { describe, expect, it } from 'vitest'
import { bundledPacks } from './bundled'
import { engineFiles } from './packs'

/**
 * The bundled packs only name icons that are bundled: a template's token, a map's icon or
 * glyph, a style's art. One that isn't is drawn as nothing (or a default) wherever it's used.
 */
describe('bundled packs', () => {
  it('name only bundled icons', () => {
    const missing = bundledPacks.flatMap((pack) =>
      pack.files.flatMap((file) =>
        [...file.content.matchAll(/game:[a-z0-9-]+/g)]
          .map(([id]) => id)
          .filter((id) => !getBuiltinIcon(id))
          .map((id) => `${pack.root}/${file.path}: ${id}`),
      ),
    )
    expect(missing).toEqual([])
  })

  it('load as their YAML reads, though it was read at build time', () => {
    const files = engineFiles(bundledPacks)
    const ahead = loadPackFiles(files)
    // Another text than the one read ahead (a newline more) is read from its YAML.
    const read = loadPackFiles(
      files.map((f) => (/\.ya?ml$/.test(f.path) ? { ...f, content: `${f.content}\n` } : f)),
    )
    expect(ahead.diagnostics).toEqual(read.diagnostics)
    expect(ahead.packs).toEqual(read.packs)
    expect(ahead.packs.length).toBeGreaterThan(3)
  })
})
