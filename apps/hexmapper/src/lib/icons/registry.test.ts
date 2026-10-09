import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_GLYPHS } from '../model/defaults'
import { setLocale } from '../i18n/index.svelte'
import { BUILTIN_ICONS, getBuiltinIcon, iconLabel, iconMatches } from './registry'

describe('bundled icons', () => {
  it('lists each icon once (pickers key them by id)', () => {
    const ids = BUILTIN_ICONS.map((icon) => icon.id)
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([])
  })

  it('has every default terrain glyph', () => {
    for (const glyph of Object.values(DEFAULT_GLYPHS)) expect(getBuiltinIcon(glyph)).toBeDefined()
  })
})

describe('icon names', () => {
  it('are shown in the UI’s language and found in it or in English', () => {
    // The language is set on the page too: a bare one is enough here.
    vi.stubGlobal('document', { documentElement: {} })
    const bridge = getBuiltinIcon('game:stone-bridge')!
    setLocale('es')
    expect(iconLabel(bridge)).toBe('puente de piedra')
    expect(iconMatches(bridge, 'Puente')).toBe(true)
    expect(iconMatches(bridge, 'bridge')).toBe(true)
    expect(iconMatches(bridge, 'castillo')).toBe(false)
    // Every bundled icon has a Spanish name of its own.
    for (const icon of BUILTIN_ICONS) expect(iconLabel(icon), icon.id).not.toContain('-')
    setLocale('en')
    expect(iconLabel(bridge)).toBe('stone bridge')
    expect(iconLabel(getBuiltinIcon('game:snowflake-1')!)).toBe('snowflake')
    vi.unstubAllGlobals()
  })
})
