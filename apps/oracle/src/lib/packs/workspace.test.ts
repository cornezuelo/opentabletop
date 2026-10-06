import { describe, expect, it } from 'vitest'
import { cleanFilePath, manifestOf, newPack, overlayLocales } from './workspace'

describe('workspace', () => {
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
