import { describe, expect, it } from 'vitest'
import { loadPacks } from '@open-tabletop/oracle-engine'
import { travelSystems } from '@open-tabletop/session'
import {
  cleanFilePath,
  duplicatePack,
  engineFiles,
  manifestOf,
  newPack,
  overlayLocales,
} from './workspace'
import { workspace } from './workspace.svelte'

describe('workspace', () => {
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
