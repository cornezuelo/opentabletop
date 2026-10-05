import { describe, expect, it } from 'vitest'
import { en } from './en'
import { es } from './es'
import { translate } from './translate'

function keysOf(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'string' ? [prefix + k] : keysOf(v, `${prefix}${k}.`),
  )
}

describe('i18n', () => {
  it('en and es define the same keys', () => {
    expect(keysOf(en).sort()).toEqual(keysOf(es).sort())
  })

  it('resolves nested keys', () => {
    expect(translate(es, 'tools.terrain')).toBe('Terreno')
    expect(translate(en, 'tools.terrain')).toBe('Terrain')
  })

  it('interpolates params and keeps unknown placeholders', () => {
    const messages = { ...es, app: { title: 'Día {day} de {missing}' } }
    expect(translate(messages, 'app.title', { day: 3 })).toBe('Día 3 de {missing}')
  })
})
