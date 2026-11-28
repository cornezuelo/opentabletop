import { describe, expect, it } from 'vitest'
import { createOracleEngine, loadPacks } from '@open-tabletop/oracle-engine'
import { seeded } from '@open-tabletop/random'
import { travelSystems } from '@open-tabletop/session'
import {
  cleanFilePath,
  duplicatePack,
  engineFiles,
  manifestOf,
  createDefinition,
  newPack,
  overlayLocales,
  ownPack,
  PackLibrary,
} from '@open-tabletop/pack-ui'
import { bundledPacks } from '@open-tabletop/pack-ui/bundled'
import { KIND_ORDER } from '@open-tabletop/oracle-ui'
import { workspace } from './workspace.svelte'

describe('workspace', () => {
  it("makes a table, oracle, generator and deck from the Oracle's New, with no pack of yours yet, each rolled at once", () => {
    const library = new PackLibrary(bundledPacks, {})
    expect(library.packs.some((p) => p.origin === 'user')).toBe(false)
    const ids = KIND_ORDER.map((kind) =>
      createDefinition(library, ownPack(library, 'My tables', 'en'), kind, `My ${kind}`),
    )
    expect(ids).toEqual(KIND_ORDER.map((kind) => `my-tables/my-${kind}`))
    expect(library.packs.filter((p) => p.origin === 'user').map((p) => p.root)).toEqual([
      'my-tables',
    ])
    expect(library.diagnostics('my-tables').filter((d) => d.severity === 'error')).toEqual([])
    const oracle = createOracleEngine({ registry: library.registry, random: seeded('new') })
    for (const id of ids) {
      const def = library.registry.definitions.get(id!)!
      const { resolution } = def.kind === 'deck' ? oracle.draw(id!) : oracle.resolve(id!, {})
      expect(resolution.text, id!).toBeTruthy()
    }
  })

  it('duplicates Core as a new pack of yours, leaving the bundled one to the packs that need it', () => {
    const core = workspace.pack('core')!
    const mine = duplicatePack(core, 'core-mine', 'Core (mine)')
    expect(manifestOf(mine)).toMatchObject({ id: 'core-mine', name: 'Core (mine)' })
    expect(manifestOf(mine).license).toBe(manifestOf(core).license)
    expect(mine.files.map((f) => f.path)).toEqual(core.files.map((f) => f.path))
    // Both load side by side; the Grey Marches still find Core's faction turn.
    const { registry, diagnostics } = loadPacks(engineFiles([...workspace.packs, mine]))
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([])
    expect(registry.definitions.has('core-mine/faction-turn')).toBe(true)
    expect(travelSystems(registry).problems).toEqual([])
  })

  it('reads manifests and translation locales', () => {
    const pack = newPack('mine', 'My tables', 'es')
    expect(manifestOf(pack)).toMatchObject({
      id: 'mine',
      name: 'My tables',
      locale: 'es',
      version: '0.1.0',
    })
    pack.files.push({ path: 'locales/en/tables.yaml', content: '' })
    expect(overlayLocales(pack)).toEqual(['en'])
  })

  it('cleans file paths', () => {
    expect(cleanFilePath(' /tables\\weather ')).toBe('tables/weather.yaml')
    expect(cleanFilePath('../x.json')).toBe('x.json')
    expect(cleanFilePath('  ')).toBeNull()
  })
})
