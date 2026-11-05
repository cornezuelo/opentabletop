import { describe, expect, it } from 'vitest'
import { boxAt, overlap, placeNames } from './names'

describe('placeNames', () => {
  it('keeps a name on its first spot when nothing is there', () => {
    const taken = [boxAt({ x: 100, y: 100 }, 10, 10)]
    const [at] = placeNames(
      [
        {
          w: 20,
          h: 6,
          spots: [
            { x: 0, y: 0 },
            { x: 0, y: 50 },
          ],
        },
      ],
      taken,
    )
    expect(at).toEqual({ x: 0, y: 0 })
    expect(taken).toHaveLength(2)
  })

  it('moves a name off an icon to its next free spot', () => {
    const icon = boxAt({ x: 0, y: 0 }, 10, 10)
    const [at] = placeNames(
      [
        {
          w: 20,
          h: 6,
          spots: [
            { x: 0, y: 2 },
            { x: 0, y: -20 },
            { x: 0, y: 20 },
          ],
        },
      ],
      [icon],
    )
    expect(at).toEqual({ x: 0, y: -20 })
  })

  it('keeps names placed before clear of each other', () => {
    const name = {
      w: 30,
      h: 6,
      spots: [
        { x: 0, y: 0 },
        { x: 0, y: 10 },
      ],
    }
    const [a, b] = placeNames([name, name], [])
    expect(a).toEqual({ x: 0, y: 0 })
    expect(b).toEqual({ x: 0, y: 10 })
    expect(overlap(boxAt(a, 30, 6), boxAt(b, 30, 6))).toBe(0)
  })

  it('takes the spot that overlaps least when none is free', () => {
    const [at] = placeNames(
      [
        {
          w: 10,
          h: 10,
          spots: [
            { x: 0, y: 0 },
            { x: 8, y: 0 },
          ],
        },
      ],
      [boxAt({ x: 0, y: 0 }, 10, 10)],
    )
    expect(at).toEqual({ x: 8, y: 0 })
  })

  it('weighs what a spot costs besides overlapping', () => {
    const [at] = placeNames(
      [
        {
          w: 4,
          h: 4,
          spots: [
            { x: 0, y: 0 },
            { x: 50, y: 0 },
          ],
          off: (p) => (p.x === 0 ? 1 : 0),
        },
      ],
      [],
    )
    expect(at).toEqual({ x: 50, y: 0 })
  })

  it('moves a name in from the edge of the map', () => {
    const [at] = placeNames([{ w: 20, h: 4, spots: [{ x: 2, y: 50 }] }], [], {
      x: 0,
      y: 0,
      w: 100,
      h: 100,
    })
    expect(at).toEqual({ x: 10, y: 50 })
  })
})
