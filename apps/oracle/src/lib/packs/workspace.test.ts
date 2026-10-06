import { describe, expect, it } from 'vitest'
import {
  cleanFilePath,
  effectivePacks,
  engineFiles,
  manifestOf,
  newPack,
  overlayLocales,
} from './workspace'

describe('workspace', () => {
  const bundled = [
    {
      root: 'core',
      origin: 'bundled' as const,
      files: [{ path: 'pack.yaml', content: 'id: core' }],
    },
    { root: 'kal', origin: 'bundled' as const, files: [] },
  ]
  it('lets user packs override bundled ones with the same folder', () => {
    const user = [{ ...newPack('core', 'Core', 'en') }, newPack('mine', 'Mine', 'es')]
    const packs = effectivePacks(bundled, user)
    expect(packs.map((p) => [p.root, p.origin, p.overrides ?? false])).toEqual([
      ['core', 'user', true],
      ['kal', 'bundled', false],
      ['mine', 'user', false],
    ])
    expect(engineFiles(packs).map((f) => f.path)).toContain('mine/pack.yaml')
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
