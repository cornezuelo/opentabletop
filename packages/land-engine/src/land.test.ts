import { seeded, sequence } from '@open-tabletop/random'
import { describe, expect, it } from 'vitest'
import {
  generateLand,
  landShares,
  landTerrains,
  landWeights,
  nextTerrain,
  validateLand,
  type LandModel,
} from './index'

const model: LandModel = {
  next: {
    forest: { forest: 6, hills: 2, plains: 2 },
    hills: { hills: 4, mountains: 2, forest: 2 },
    lake: { lake: 6, plains: 1 },
  },
  start: { plains: 3, forest: 1 },
}

describe('land models', () => {
  it('validates weights, rows and unknown keys', () => {
    expect(validateLand(model)).toEqual([])
    expect(validateLand({ ...model, weights: { from: 2 } })).toEqual([])
    expect(validateLand({ next: {} })).toEqual([
      'next: needs a row for at least one terrain (forest: { forest: 6, hills: 2 })',
    ])
    expect(validateLand({ next: { forest: { forest: -1 } }, colour: 'x' })).toEqual([
      'colour: unknown key in a land model',
      'next.forest.forest: a weight (0 or more)',
    ])
    expect(validateLand({ next: { forest: [] }, start: 3, weights: { to: 1 } })).toEqual([
      'next.forest: weights by terrain ({ forest: 6, hills: 2 })',
      'start: weights by terrain ({ forest: 6, hills: 2 })',
      'weights.to: expected from',
    ])
  })

  it('names every terrain it uses', () => {
    expect(landTerrains(model)).toEqual(['forest', 'hills', 'plains', 'mountains', 'lake'])
  })

  it("adds up the known neighbours' rows", () => {
    expect(landWeights(model, ['forest', 'forest', 'hills'])).toEqual({
      from: { forest: 2, hills: 1 },
      weights: { forest: 14, hills: 8, plains: 4, mountains: 2 },
    })
    // A terrain the model doesn't list adds nothing; with nothing known, `start`.
    expect(landWeights(model, ['sea'])).toEqual({ from: {}, weights: { plains: 3, forest: 1 } })
    expect(landWeights(model, [])).toEqual({ from: {}, weights: { plains: 3, forest: 1 } })
  })

  it('counts the hex it is seen from as the model says', () => {
    const heavy = { ...model, weights: { from: 3 } }
    expect(landWeights(heavy, ['forest', 'hills'], 'hills')).toEqual({
      from: { forest: 1, hills: 3 },
      weights: { forest: 12, hills: 14, plains: 2, mountains: 6 },
    })
    // Absent, it counts as any other.
    expect(landWeights(model, ['forest', 'hills'], 'hills').from).toEqual({ forest: 1, hills: 1 })
  })

  it('picks with the random source, and says nothing when every weight is 0', () => {
    // Weights forest 6, hills 2, plains 2: a roll of 0.65 lands on hills.
    expect(nextTerrain(model, ['forest'], sequence([0.65])).terrain).toBe('hills')
    expect(nextTerrain(model, ['forest'], sequence([0.1])).terrain).toBe('forest')
    expect(nextTerrain({ next: { forest: { forest: 0 } } }, ['forest'], sequence([0.5]))).toEqual({
      from: {},
      weights: {},
    })
  })

  it('grows the land outwards from what is painted, never changing it', () => {
    // A row of five hexes: a lake painted at one end.
    const hexes = ['a', 'b', 'c', 'd', 'e']
    const painted: Record<string, string> = { a: 'lake' }
    const neighbors = (h: string) => {
      const i = hexes.indexOf(h)
      return [hexes[i - 1], hexes[i + 1]].filter(Boolean)
    }
    const land = generateLand(model, {
      area: ['e', 'd', 'c', 'b', 'a'],
      terrain: (h) => painted[h],
      neighbors,
      random: seeded(7),
    })
    // Next to the lake first, then each next to the last one chosen.
    expect([...land.keys()]).toEqual(['b', 'c', 'd', 'e'])
    expect(land.has('a')).toBe(false)
    // The same seed draws the same land.
    const again = generateLand(model, {
      area: ['e', 'd', 'c', 'b', 'a'],
      terrain: (h) => painted[h],
      neighbors,
      random: seeded(7),
    })
    expect([...again]).toEqual([...land])
  })

  it('makes coherent land: a sticky model gathers its terrains', () => {
    const shares = landShares(model, seeded('marches'))
    expect(shares.reduce((a, s) => a + s.share, 0)).toBeCloseTo(1)
    // Forest stays forest more than anything else becomes it.
    expect(shares[0].terrain).toBe('forest')
  })
})
