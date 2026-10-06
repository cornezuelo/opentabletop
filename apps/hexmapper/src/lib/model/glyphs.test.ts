import { describe, expect, it } from 'vitest'
import { glyphShade } from '../render/glyphs'
import { DEFAULT_TERRAINS } from './defaults'
import { migrate } from './migrations'

describe('terrain glyphs', () => {
  it('gives built-in terrains of old maps their symbol (v2 → v3)', () => {
    const data = migrate({
      version: 2,
      grid: { width: 3 },
      terrains: [
        { id: 'forest', color: '#4f7a3a' },
        { id: 'custom-x', color: '#123456' },
      ],
    })
    expect(data.terrains).toEqual([
      { id: 'forest', color: '#4f7a3a', glyph: 'game:pine-tree' },
      { id: 'custom-x', color: '#123456' },
    ])
    expect(data.grid).toEqual({ width: 3, glyphs: 0.45 })
  })

  it('every default terrain has a glyph', () => {
    expect(DEFAULT_TERRAINS.filter((t) => !t.glyph)).toEqual([])
  })

  it('shades dark colors lighter and light colors darker', () => {
    expect(glyphShade('#000000')).toBeGreaterThan(0x000000)
    expect(glyphShade('#ffffff')).toBeLessThan(0xffffff)
  })
})
