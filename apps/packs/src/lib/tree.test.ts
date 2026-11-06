import { beforeAll, describe, expect, it, vi } from 'vitest'

/** A pack's branch of the left column: every kind it holds, its systems and its files. */
describe('the tree of a pack', () => {
  let open: typeof import('./tree')
  let packs: typeof import('./packs.svelte')

  beforeAll(async () => {
    vi.stubGlobal('location', { hash: '' })
    packs = await import('./packs.svelte')
    open = await import('./tree')
  })

  const marches = () =>
    open.packTree(packs.library, 'grey-marches', {
      locale: 'en',
      systems: packs.systems.list,
      displayName: packs.texts.displayName,
    })

  it('lists its systems apart, and each kind once, in order', () => {
    const tree = marches()
    expect(tree.systems.map((s) => s.id)).toContain('grey-marches')
    const kinds = tree.groups.map((g) => g.kind)
    expect(kinds).not.toContain('system')
    expect(new Set(kinds).size).toBe(kinds.length)
    expect(kinds[0]).toBe('table')
    expect(kinds.at(-1)).toBe('files')
    for (const kind of ['oracle', 'travel-rules', 'land', 'weather', 'style'])
      expect(kinds).toContain(kind)
  })

  it('opens a map style by its id, and starts its files with the manifest', () => {
    const tree = marches()
    const style = tree.groups.find((g) => g.kind === 'style')!.items[0]
    expect(style.view).toMatchObject({ name: 'style' })
    expect(tree.groups.at(-1)!.items[0].id).toBe('pack.yaml')
    expect(tree.images).toBeGreaterThan(0)
  })

  it('finds by name, id or tag, and drops what holds nothing found', () => {
    const found = open.findInTree(marches(), 'next-terrain')
    expect(found.groups.map((g) => g.kind)).toEqual(['table'])
    expect(open.findInTree(marches(), 'nothing like this').groups).toEqual([])
    expect(open.findInTree(marches(), '  ').groups.length).toBe(marches().groups.length)
  })
})
