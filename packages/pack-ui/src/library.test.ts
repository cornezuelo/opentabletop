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
