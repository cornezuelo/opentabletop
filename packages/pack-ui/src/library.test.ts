import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PackLibrary } from './library.svelte'

const pack = (root: string) => ({
  root,
  origin: 'user' as const,
  files: [{ path: 'pack.yaml', content: `id: ${root}\nversion: 0.1.0\nlocale: en\n` }],
})

describe('undo and redo of pack edits', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    const data = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('steps back and forth through changes', () => {
    const library = new PackLibrary([])
    library.addPack(pack('mine'))
    library.writeFile('mine', 't.yaml', 'a')
    vi.advanceTimersByTime(2000)
    library.writeFile('mine', 't.yaml', 'b')
    expect(library.canUndo).toBe(true)
    library.undo()
    expect(library.readFile('mine', 't.yaml')).toBe('a')
    library.undo()
    expect(library.readFile('mine', 't.yaml')).toBeUndefined()
    library.undo()
    expect(library.pack('mine')).toBeUndefined()
    expect(library.canUndo).toBe(false)
    library.redo()
    library.redo()
    expect(library.readFile('mine', 't.yaml')).toBe('a')
    // A new change drops what could be redone.
    library.writeFile('mine', 'u.yaml', 'x')
    expect(library.canRedo).toBe(false)
  })

  it('joins quick changes to one file (typing), and batches', () => {
    const library = new PackLibrary([])
    library.addPack(pack('mine'))
    vi.advanceTimersByTime(2000)
    for (const text of ['k', 'ki', 'kin', 'kind']) {
      library.writeFile('mine', 't.yaml', text, true)
      vi.advanceTimersByTime(200)
    }
    library.undo()
    expect(library.readFile('mine', 't.yaml')).toBeUndefined()
    library.redo()
    library.batch(() => {
      library.writeFile('mine', 'a.yaml', '1')
      library.writeFile('mine', 'b.yaml', '2')
    })
    library.undo()
    expect(library.readFile('mine', 'a.yaml')).toBeUndefined()
    expect(library.readFile('mine', 't.yaml')).toBe('kind')
  })
})

describe('updates of the bundled pack under a user copy', () => {
  beforeEach(() => {
    const data = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  const bundled = (files: Record<string, string>) => ({
    root: 'marches',
    origin: 'bundled' as const,
    files: Object.entries(files).map(([path, content]) => ({ path, content })),
  })
  const v1 = { 'pack.yaml': 'id: marches', 'a.yaml': 'a1', 'b.yaml': 'b1', 'c.yaml': 'c1' }

  it('tells what changed since the copy, and whether the copy changed it too', () => {
    const library = new PackLibrary([bundled(v1)])
    library.editCopy('marches')
    expect(library.bundledChanges('marches')).toEqual([])
    library.writeFile('marches', 'b.yaml', 'b mine')
    // A new version of the app (same browser storage): a, b changed, c removed, d added.
    const next = new PackLibrary([
      bundled({ 'pack.yaml': 'id: marches', 'a.yaml': 'a2', 'b.yaml': 'b2', 'd.yaml': 'd1' }),
    ])
    expect(next.bundledChanges('marches')).toEqual([
      { path: 'a.yaml', bundled: 'changed', mine: false },
      { path: 'b.yaml', bundled: 'changed', mine: true },
      { path: 'c.yaml', bundled: 'removed', mine: false },
      { path: 'd.yaml', bundled: 'added', mine: false },
    ])
    // Take what wasn't touched, keep my b: nothing left to report, and undoable.
    next.updateFromBundled('marches', { take: ['a.yaml', 'c.yaml', 'd.yaml'], keep: ['b.yaml'] })
    expect(next.bundledChanges('marches')).toEqual([])
    expect(next.readFile('marches', 'a.yaml')).toBe('a2')
    expect(next.readFile('marches', 'b.yaml')).toBe('b mine')
    expect(next.readFile('marches', 'c.yaml')).toBeUndefined()
    expect(next.readFile('marches', 'd.yaml')).toBe('d1')
    next.undo()
    expect(next.bundledChanges('marches')).toHaveLength(4)
  })

  it('copies made before tracking report the files that differ, as touched', () => {
    const old = { ...bundled(v1), origin: 'user' as const }
    old.files = old.files.map((f) => (f.path === 'a.yaml' ? { ...f, content: 'a old' } : f))
    const library = new PackLibrary([bundled(v1)])
    library.addPack(old)
    expect(library.bundledChanges('marches')).toEqual([
      { path: 'a.yaml', bundled: 'changed', mine: true },
    ])
    library.updateFromBundled('marches', { keep: ['a.yaml'] })
    expect(library.bundledChanges('marches')).toEqual([])
    expect(library.readFile('marches', 'a.yaml')).toBe('a old')
  })
})
