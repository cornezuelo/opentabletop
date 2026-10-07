import { seeded, sequence } from '@open-tabletop/random'
import { describe, expect, it } from 'vitest'
import { nextWeather, validateWeather, weatherShares, type WeatherModel } from './index'

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
