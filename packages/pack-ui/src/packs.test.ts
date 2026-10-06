import { describe, expect, it } from 'vitest'
import {
  effectivePacks,
  engineFiles,
  groupBundled,
  readUserPacks,
  USER_PACKS_KEY,
  writeUserPacks,
  type PackSource,
} from './packs'

const pack = (root: string, origin: PackSource['origin']): PackSource => ({
  root,
  origin,
  files: [{ path: 'pack.yaml', content: `id: ${root}` }],
})

describe('packs', () => {
  it('groups globbed files into packs, skipping folders without a manifest', () => {
    const packs = groupBundled(
      {
        '../../packs/core/pack.yaml': 'id: core',
        '../../packs/core/tables/a.yaml': 'tables: []',
        '../../packs/stray/notes.yaml': 'x: 1',
        '../../packs/README.yaml': 'x: 1',
      },
      'packs',
    )
    expect(packs).toEqual([
      {
        root: 'core',
        origin: 'bundled',
        personal: undefined,
        files: [
          { path: 'pack.yaml', content: 'id: core' },
          { path: 'tables/a.yaml', content: 'tables: []' },
        ],
      },
    ])
    expect(
      groupBundled({ '/x/packs-private/k/pack.yaml': '' }, 'packs-private', true)[0],
    ).toMatchObject({ root: 'k', personal: true })
  })

  it('lets user packs override bundled ones with the same folder', () => {
    const packs = effectivePacks(
      [pack('core', 'bundled'), pack('kal', 'bundled')],
      [pack('core', 'user'), pack('mine', 'user')],
    )
    expect(packs.map((p) => [p.root, p.origin, p.overrides ?? false])).toEqual([
      ['core', 'user', true],
      ['kal', 'bundled', false],
      ['mine', 'user', false],
    ])
    expect(engineFiles(packs).map((f) => f.path)).toContain('mine/pack.yaml')
  })

  it('reads and writes user packs, tolerating broken or full storage', () => {
    const data = new Map<string, string>()
    const storage = {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    }
    expect(readUserPacks(storage)).toEqual([])
    expect(writeUserPacks([{ ...pack('mine', 'bundled') }], storage)).toBe(true)
    expect(readUserPacks(storage)[0]).toMatchObject({ root: 'mine', origin: 'user' })
    data.set(USER_PACKS_KEY, '{oops')
    expect(readUserPacks(storage)).toEqual([])
    data.set(
      USER_PACKS_KEY,
      JSON.stringify([
        null,
        { root: 'x' },
        { root: 'ok', files: [{ path: 'pack.yaml', content: '' }] },
      ]),
    )
    expect(readUserPacks(storage).map((p) => p.root)).toEqual(['ok'])
    const full = {
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    }
    expect(writeUserPacks([], full)).toBe(false)
  })
})
