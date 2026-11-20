import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_GLYPHS, type MapToken } from '@open-tabletop/map'
import { templatePictureRef } from '@open-tabletop/character-ui'
import { setDefinitionPicture } from '@open-tabletop/ui-kit'
import { setLocale } from '../i18n/index.svelte'
import { BUILTIN_ICONS, getBuiltinIcon, iconLabel, iconMatches, tokenPicture } from './registry'

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

describe('a token’s picture', () => {
  const nowhere = { getItem: () => null, setItem: () => {} }
  const wolf = (own: Partial<MapToken> = {}): MapToken => ({
    id: 'wolf-1',
    name: 'Old Grey',
    kind: 'enemy',
    iconId: 'game:wolf-head',
    character: {
      sheet: 'grey-marches/beast',
      values: {},
      conditions: {},
      tags: [],
      relations: [],
      template: { id: 'grey-wolf', from: 'grey-marches/marches' },
    },
    ...own,
  })

  it('is drawn only when asked for, and only with a sheet that has one', () => {
    const scarred = { ...wolf().character!, picture: 'scarred' }
    expect(tokenPicture(wolf({ character: scarred }))).toBeUndefined()
    expect(tokenPicture(wolf({ character: scarred, showPicture: true }))).toBe('scarred')
    expect(tokenPicture(wolf({ showPicture: true }))).toBeUndefined()
    expect(tokenPicture(wolf({ showPicture: true, character: undefined }))).toBeUndefined()
  })

  it('is its template’s when its sheet has no portrait of its own', () => {
    const ref = templatePictureRef({ id: 'grey-wolf', from: 'grey-marches/marches' })
    setDefinitionPicture(ref, 'wolf-face', nowhere)
    expect(tokenPicture(wolf({ showPicture: true }))).toBe('wolf-face')
    setDefinitionPicture(ref, undefined, nowhere)
  })
})
