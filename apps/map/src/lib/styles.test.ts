import { DEFAULT_TERRAINS, mapStyles, styleOf } from '@open-tabletop/map'
import { loadPacks } from '@open-tabletop/oracle-engine'
import { describe, expect, it } from 'vitest'
import { corePack } from '../../../../packages/session/src/core.testing'
import { exampleMaps } from './io/examples'
import { parseMapFile } from './io/otd'
import { paint, seedOf } from './render/painters'

describe('the bundled map styles', () => {
  const { styles, problems } = mapStyles(loadPacks(corePack()).registry)
  const style = (ref: string) => styles.find((s) => s.ref === ref)!.style

  it('Core brings Schematic, Parchment and Painted, with no problem', () => {
    expect(problems).toEqual([])
    expect(styles.map((s) => s.ref)).toEqual(['core/schematic', 'core/parchment', 'core/painted'])
  })

  it.each(['core/parchment', 'core/painted'])(
    '%s draws every terrain of the natural palette but snow, and hides coordinates and glyphs',
    (ref) => {
      const s = style(ref)
      const drawn = DEFAULT_TERRAINS.map((t) => t.id).filter((id) => s.art.terrains[id])
      expect(drawn).toEqual(DEFAULT_TERRAINS.map((t) => t.id).filter((id) => id !== 'snow'))
      expect(s.grid.coords).toBe(false)
      expect(s.glyphs).toBe(0)
      // Every painter it names draws something on a cell.
      for (const [id, art] of Object.entries(s.art.terrains))
        expect(
          paint(art.painter, {
            x: 0,
            y: 0,
            r: 40,
            seed: seedOf(id),
            mode: s.art.mode,
            ink: 0,
            base: 0x808080,
            density: art.density,
            size: art.size,
          }).length,
          id,
        ).toBeGreaterThan(0)
    },
  )

  it("the Grey Marches' frontier is drawn in Parchment, the Hollow Hills in Painted, as they were chosen", () => {
    const open = (id: string) => parseMapFile(exampleMaps().find((m) => m.id === id)!.json).map
    const marches = open('greymarches1')
    expect(marches.meta.style).toBe('core/parchment')
    expect(styleOf(marches, styles)).toBe(style('core/parchment'))
    // Choosing it copied its settings into the map.
    expect(marches.grid.showCoords).toBe(false)
    expect(marches.grid.glyphs).toBe(0)
    expect(marches.captions.hexNames.haloColor).toBe('#efe3c4')
    const hills = exampleMaps().find((m) => m.path.endsWith('hollow-hills.otd.json'))!
    expect(styleOf(parseMapFile(hills.json).map, styles)).toBe(style('core/painted'))
  })
})
