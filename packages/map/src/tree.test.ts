import { describe, expect, it } from 'vitest'
import { treeAround, treeOrder } from './tree'

const items = [
  { id: 'hall', parent: 'hills' },
  { id: 'hills', parent: 'land' },
  { id: 'land' },
  { id: 'isle' },
  { id: 'town', parent: 'land' },
  { id: 'cave', parent: 'gone' },
]
const ids = (list: { item: { id: string }; depth: number }[]) =>
  list.map((o) => `${o.depth} ${o.item.id}`)

describe('trees', () => {
  it('puts each item after the one it hangs from', () => {
    expect(ids(treeOrder(items))).toEqual([
      '0 land',
      '1 hills',
      '2 hall',
      '1 town',
      '0 isle',
      '0 cave',
    ])
  })

  it('keeps items caught in a loop of parents', () => {
    const loop = [
      { id: 'a', parent: 'b' },
      { id: 'b', parent: 'a' },
    ]
    expect(ids(treeOrder(loop))).toEqual(['0 a', '1 b'])
  })

  it('finds the whole tree from any of its items', () => {
    const land = ['0 land', '1 hills', '2 hall', '1 town']
    expect(ids(treeAround(items, 'hall'))).toEqual(land)
    expect(ids(treeAround(items, 'land'))).toEqual(land)
    expect(ids(treeAround(items, 'isle'))).toEqual(['0 isle'])
    expect(treeAround(items, 'nowhere')).toEqual([])
  })
})
