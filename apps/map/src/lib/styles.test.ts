import { connectionLook, DEFAULT_TERRAINS, mapStyles, styleOf } from '@open-tabletop/map'
import { loadPacks } from '@open-tabletop/oracle-engine'
import { copyStyle, styleSource } from '@open-tabletop/pack-ui'
import { setIn } from '@open-tabletop/pack-ui/yaml'
import { describe, expect, it, vi } from 'vitest'
import { corePack } from '../../../../packages/session/src/core.testing'
import { exampleMaps } from './io/examples'
import { parseMapFile } from './io/otd'
import { paint, seedOf } from './render/painters'

describe('the bundled map styles', () => {
  const { styles, problems } = mapStyles(loadPacks(corePack()).registry)
  const style = (ref: string) => styles.find((s) => s.ref === ref)!.style

  it('Core brings Schematic, Parchment, Painted, Classic dungeon and Cave, with no problem', () => {
    expect(problems).toEqual([])
    expect(styles.map((s) => s.ref)).toEqual([
      'core/schematic',
      'core/parchment',
      'core/painted',
      'core/classic-dungeon',
      'core/cave',
    ])
  })

  it.each(['core/classic-dungeon', 'core/cave'])(
    '%s draws floor in its own colour with a grid, and something outside its walls',
    (ref) => {
      const s = style(ref)
      expect(s.floors.wash).toBeGreaterThan(0.5)
      expect(s.floors.grid).toBeGreaterThan(0)
      expect(s.walls.outside).not.toBe('none')
      expect(s.walls.band).toBeGreaterThan(0)
      // The dungeon palette's rubble and pools have art.
      expect(s.art.terrains.rubble).toBeDefined()
      expect(s.art.terrains.pool).toBeDefined()
    },
  )

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

  it('the Barrow-halls are a Classic dungeon, the old mine a Cave, as they were chosen', () => {
    const at = (file: string) =>
      parseMapFile(exampleMaps().find((m) => m.path.endsWith(file))!.json).map
    const halls = at('barrow-halls.otd.json')
    expect(styleOf(halls, styles)).toBe(style('core/classic-dungeon'))
    expect(halls.grid.showCoords).toBe(false)
    expect(halls.captions.regionNames.haloColor).toBe('#ffffff')
    const mine = at('old-mine.otd.json')
    expect(styleOf(mine, styles)).toBe(style('core/cave'))
    expect(mine.regionStyle.dashed).toBe(true)
  })

  it("draws the examples' connections and ways as what they are, by their kinds", () => {
    const at = (file: string) =>
      parseMapFile(exampleMaps().find((m) => m.path.endsWith(file))!.json).map
    const halls = at('barrow-halls.otd.json')
    const dungeon = styleOf(halls, styles)
    // The bronze door and the sealed slab: doors in their walls.
    for (const c of halls.connections)
      expect(connectionLook(dungeon, c.kind)).toEqual({ symbol: 'door', line: 'none' })
    // The way down arrives on a stair.
    expect(connectionLook(dungeon, halls.meta.parent!.ways[0].kind, true).symbol).toBe('stair')
    // The old mine: its mouths a cave's, the Windhole's shaft a ladder.
    const mine = at('old-mine.otd.json')
    const cave = styleOf(mine, styles)
    expect(
      mine.meta.parent!.ways.map((w) => connectionLook(cave, w.kind, true).symbol).sort(),
    ).toEqual(['ladder', 'mouth', 'mouth'])
    // Stonewater Ford, on the Hollow Hills: stepping stones where it crosses; the Barrow-road
    // (a kind no style names) keeps the dashed line with a diamond.
    const hills = at('hollow-hills.otd.json')
    const painted = styleOf(hills, styles)
    const look = (kind: string) =>
      connectionLook(painted, hills.connections.find((c) => c.kind === kind)!.kind)
    expect(look('ford').symbol).toBe('ford')
    expect(look('hidden-path')).toEqual({ symbol: 'diamond', line: 'dashed' })
  })
})

describe('a style of the user’s, edited while a map is drawn in it', () => {
  it('copies the frontier’s Parchment, draws the map in the copy, and draws each change to it', async () => {
    const data = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
    })
    try {
      const { library } = await import('./play/packs')
      const { editor } = await import('./store/editor.svelte')
      const { mapStyle } = await import('./styles')
      const { SetStyleCommand } = await import('./commands/settings')
      editor.load(parseMapFile(exampleMaps().find((m) => m.id === 'greymarches1')!.json).map)
      expect(mapStyle().paper).toBe('#efe3c4')

      // Map settings → Style → Make a copy: a style of the user's, the map drawn in it.
      const ref = copyStyle(library, 'core/parchment', 'en')!
      expect(ref).toBe('my-styles/parchment-copy')
      const copy = mapStyles(library.registry).styles.find((s) => s.ref === ref)!
      expect(copy.style.name).toBe('Parchment (copy)')
      editor.execute(new SetStyleCommand(ref, copy.style))
      expect(editor.meta.style).toBe(ref)
      expect(mapStyle()).toEqual(copy.style)

      // Edit: the form writes the style's file, and the map is drawn in what it says now.
      const source = styleSource(library, ref)!
      const edit = (at: (string | number)[], value: unknown) =>
        library.writeFile(
          source.root,
          source.path,
          setIn(library.readFile(source.root, source.path)!, '@style/parchment-copy', at, value),
        )
      edit(['paper'], '#203040')
      edit(['ground', 'wash'], 0)
      edit(['art', 'terrains', 'forest'], { painter: 'broadleaf', density: 2 })
      expect(mapStyle().paper).toBe('#203040')
      expect(mapStyle().ground.wash).toBe(0)
      expect(mapStyle().art.terrains.forest).toEqual({ painter: 'broadleaf', density: 2, size: 1 })
      // The bundled one never changed.
      expect(
        styleOf({ meta: { style: 'core/parchment' } } as never, mapStyles(library.registry).styles)
          .paper,
      ).toBe('#efe3c4')
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
