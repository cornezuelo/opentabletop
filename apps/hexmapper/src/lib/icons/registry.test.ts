import { describe, expect, it } from 'vitest'
import { DEFAULT_GLYPHS } from '../model/defaults'
import { BUILTIN_ICONS, getBuiltinIcon } from './registry'

describe('bundled icons', () => {
  it('lists each icon once (pickers key them by id)', () => {
    const ids = BUILTIN_ICONS.map((icon) => icon.id)
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([])
  })

  it('has every default terrain glyph', () => {
    for (const glyph of Object.values(DEFAULT_GLYPHS)) expect(getBuiltinIcon(glyph)).toBeDefined()
  })
})
