import { describe, expect, it } from 'vitest'
import { pickLocale } from './locale.mjs'

const available = ['en', 'es'] as const

describe('pickLocale', () => {
  it('keeps the language the user chose', () => {
    expect(pickLocale('es', ['en-GB'], available, 'en')).toBe('es')
    expect(pickLocale('en', ['es-ES'], available, 'en')).toBe('en')
  })

  it('follows the browser when nothing was chosen', () => {
    expect(pickLocale(null, ['es-ES', 'en'], available, 'en')).toBe('es')
    expect(pickLocale(null, ['es-MX'], available, 'en')).toBe('es')
    expect(pickLocale(null, ['ES'], available, 'en')).toBe('es')
  })

  it('takes the first browser language it has', () => {
    expect(pickLocale(null, ['fr-FR', 'es', 'en'], available, 'en')).toBe('es')
    expect(pickLocale(null, ['en-US', 'es'], available, 'en')).toBe('en')
  })

  it('falls back to the default', () => {
    expect(pickLocale(null, ['fr-FR', 'de'], available, 'en')).toBe('en')
    expect(pickLocale(null, [], available, 'en')).toBe('en')
    expect(pickLocale(null, undefined, available, 'en')).toBe('en')
  })

  it('ignores a stored value it does not have', () => {
    expect(pickLocale('fr', ['es-ES'], available, 'en')).toBe('es')
    expect(pickLocale('', [], available, 'en')).toBe('en')
  })
})
