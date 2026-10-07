import { loadPacks } from '@open-tabletop/oracle-engine'
import { describe, expect, it } from 'vitest'
import { translator, type OracleUiKey } from './i18n'
import { valueNames } from './valueNames'

const { registry } = loadPacks([
  { path: 'sys/pack.yaml', content: 'id: sys\nversion: 0.1.0\nlocale: en\n' },
  {
    path: 'sys/travel.yaml',
    content: `kind: travel-rules
id: default
day: { start: '06:00', nightfall: '20:00' }
travel: { hoursPerDay: 8 }
terrains: {}
modes: { foot: { kmPerDay: 25 } }
resources: { food: { name: Rations, perDay: 1 } }
---
kind: bindings
id: default
on: {}
stats: { survival: { name: Survival, description: Added to foraging. } }
reads:
  icon.guards: { name: Guards, description: How many guards watch the gates. }
`,
  },
  {
    path: 'sys/locales/es/travel.yaml',
    content: `bindings/default:
  reads: { icon.guards: { name: Guardias } }
`,
  },
])

describe('names of the values tables read', () => {
  const names = (locale: string) => {
    const t = translator(() => locale)
    return valueNames(
      () => registry,
      () => locale,
      (key) => {
        const text = t(key as OracleUiKey)
        return text === key ? undefined : text
      },
    )
  }

  it('come from the app for its facts and from the pack for its own', () => {
    const en = names('en')
    expect(en('holidays')).toMatchObject({ name: 'Holidays', description: expect.any(String) })
    expect(en('survival')).toEqual({ name: 'Survival', description: 'Added to foraging.' })
    expect(en('party.stats.survival').name).toBe('Survival')
    expect(en('party.resources.food').name).toBe('Rations')
    expect(en('icon.guards')).toEqual({
      name: 'Guards',
      description: 'How many guards watch the gates.',
    })
    expect(en('moons.pale').name).toBe('Moon: pale')
    expect(en('yesterday.lost').name).toBe('Lost yesterday')
    expect(en('mystery')).toEqual({})
  })

  it('in the UI language, with the pack’s translations', () => {
    const es = names('es')
    expect(es('holidays').name).toBe('Fiestas')
    expect(es('icon.guards').name).toBe('Guardias')
    // Not translated: the pack's base text.
    expect(es('survival').name).toBe('Survival')
  })
})
