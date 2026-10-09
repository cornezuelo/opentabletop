import { seeded, sequence } from '@open-tabletop/random'
import { describe, expect, it } from 'vitest'
import {
  nextWeather,
  validateWeather,
  weatherShares,
  type HexFlower,
  type WeatherModel,
} from './index'

const model: WeatherModel = {
  states: {
    clear: { name: { en: 'Clear', es: 'Despejado' } },
    rain: { name: 'Rain', set: { fordModifier: -1 } },
    storm: { set: { fordImpossible: true } },
  },
  seasons: {
    spring: {
      start: 'clear',
      next: {
        clear: { clear: 3, rain: 1 },
        rain: { rain: 3, clear: 1, storm: 1 },
        storm: { rain: 1 },
      },
    },
    winter: { start: { storm: 1, rain: 1 }, next: { storm: { storm: 1 } } },
  },
}

describe('weather with inertia', () => {
  it('validates models', () => {
    expect(validateWeather(model)).toEqual([])
    expect(
      validateWeather({
        states: { sun: {} },
        seasons: { dry: { start: 'fog', next: { sun: { hail: 1, sun: -1 } } } },
      }),
    ).toEqual([
      'seasons.dry.start: no such weather "fog"',
      'seasons.dry.next.sun.hail: no such weather',
      'seasons.dry.next.sun.sun: a weight (0 or more)',
    ])
  })

  it('starts from the season, then follows yesterday', () => {
    expect(nextWeather(model, { season: 'spring', random: sequence([0.5]) })).toEqual({
      weather: 'clear',
      name: { en: 'Clear', es: 'Despejado' },
      value: { weather: 'clear' },
    })
    // From rain (weights 3/1/1): 0.9 lands on storm, which gives its values.
    expect(
      nextWeather(model, { season: 'spring', previous: 'rain', random: sequence([0.9]) }),
    ).toEqual({
      weather: 'storm',
      value: { weather: 'storm', fordImpossible: true },
    })
    // Winter has no row for clear: it starts over from its own start weights.
    expect(
      nextWeather(model, { season: 'winter', previous: 'clear', random: sequence([0.1]) }).weather,
    ).toBe('storm')
    // An unknown season uses the first one.
    expect(nextWeather(model, { season: 'monsoon', random: sequence([0.5]) }).weather).toBe('clear')
  })

  it('has inertia: rain lasts, and the shares follow the chain', () => {
    const shares = weatherShares(model, 'spring', 4000, seeded('sky'))
    // The spring chain settles at clear 0.4, rain 0.5, storm 0.1: rain lasts.
    expect(shares.clear).toBeCloseTo(0.4, 1)
    expect(shares.rain).toBeCloseTo(0.5, 1)
    expect(shares.storm).toBeCloseTo(0.1, 1)
  })
})

describe('a hex flower', () => {
  const model: WeatherModel = {
    states: { clear: {}, grey: {}, snow: { set: { snowbound: true } }, storm: {} },
    seasons: {
      winter: {
        flower: {
          rows: [
            ['storm', 'storm', 'snow'],
            ['snow', 'snow', 'snow', 'grey'],
            ['snow', 'grey', 'grey', 'grey', 'clear'],
            ['grey', 'grey', 'clear', 'clear'],
            ['clear', 'clear', 'clear'],
          ],
          start: 'grey',
        },
      },
    },
  }
  /** Two d6 that make this total (first die, second die). */
  const roll = (total: number) =>
    sequence([(Math.min(6, total - 1) - 1) / 6, (total - Math.min(6, total - 1) - 1) / 6])

  it('starts in the middle-most cell of its start weather', () => {
    expect(nextWeather(model, { season: 'winter', random: roll(7) })).toMatchObject({
      weather: 'grey',
      at: '0,0',
    })
  })

  it('moves one cell a day by 2d6, as its moves say (the default ones here)', () => {
    // 7: south-east, from the middle to (0,1).
    expect(nextWeather(model, { season: 'winter', at: '0,0', random: roll(7) })).toMatchObject({
      at: '0,1',
      weather: 'clear',
    })
    // 12: north-west, to (0,-1): snow, with its values for the day.
    expect(nextWeather(model, { season: 'winter', at: '0,0', random: roll(12) })).toMatchObject({
      at: '0,-1',
      value: { weather: 'snow', snowbound: true },
    })
  })

  it('comes back in on the far side, or stays, at the edge', () => {
    // From the top-left storm (0,-2) going north-west: the far side along that line.
    const wrapped = nextWeather(model, { season: 'winter', at: '0,-2', random: roll(12) })
    expect(wrapped.at).toBe('0,2')
    const stay = {
      ...model,
      seasons: {
        winter: {
          flower: {
            ...(model.seasons.winter as { flower: HexFlower }).flower,
            edge: 'stay' as const,
          },
        },
      },
    }
    expect(nextWeather(stay, { season: 'winter', at: '0,-2', random: roll(12) }).at).toBe('0,-2')
  })

  it('says what is wrong with a flower', () => {
    expect(validateWeather(model)).toEqual([])
    const bad = {
      states: { clear: {} },
      seasons: { winter: { flower: { rows: [['clear'], [], [], [], []], moves: { up: '2' } } } },
    }
    expect(validateWeather(bad)[0]).toMatch(/five rows of 3, 4, 5, 4 and 3/)
    const wrong = {
      ...model,
      seasons: {
        winter: {
          flower: {
            ...(model.seasons.winter as { flower: HexFlower }).flower,
            moves: { up: '2-3' },
          },
        },
      },
    }
    expect(validateWeather(wrong)).toEqual([
      'seasons.winter.flower.moves.up: e, w, ne, nw, se, sw or stay',
    ])
  })

  it('drifts, so over many days every weather on it comes up', () => {
    const shares = weatherShares(model, 'winter', 2000, seeded('flower'))
    expect(Object.keys(shares).sort()).toEqual(['clear', 'grey', 'snow', 'storm'])
  })
})
