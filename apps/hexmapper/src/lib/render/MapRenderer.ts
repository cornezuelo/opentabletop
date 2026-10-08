import {
  Application,
  BitmapFont,
  BitmapText,
  ColorMatrixFilter,
  Container,
  Graphics,
  GraphicsContext,
  Rectangle,
  Sprite,
  Text,
} from 'pixi.js'
import type { MapChange } from '../commands/command'
import { hasMetadata, hexesWithTag, ICON_DEFAULTS, nodeFlags } from '../model/hex'
import type { CaptionKind, CaptionOverride, MapPath, PathKind } from '../model/types'
import { TRAVEL_PATH_KINDS } from '../model/types'
import { iconImage } from '../icons/registry'
import { layoutTokens, partyToken, tokenColor } from '../model/tokens'
import { catmullRom, catmullRomClosed, dashes, offsetPolyline } from './curves'
import { pathRuns, routePoints, type FollowedPath, type PathVertex } from './pathGeometry'
import { IconTextures } from './IconTextures'
import { glyphShade } from './glyphs'
import { setLabelHitTest, setTokenHitTest } from './hitTest'
import { FONT_FAMILIES, loadLabelFonts } from '../labels/fonts'
import {
  allCells,
  cellsInRadius,
  cornerOffsets,
  formatCoord,
  type HexKey,
  hexToPixel,
  inBounds,
  keyOf,
  type Offset,
  parseKey,
  pixelToHex,
  type Point,
  toAxial,
  toOffset,
} from '@open-tabletop/hex'
import { editor } from '../store/editor.svelte'
import { getTool, pathVertexPoint, type PointerInfo, type Tool } from '../tools/tools'

const EMPTY_FILL = 0x2a2823
const GRID_COLOR = 0x000000
const GRID_ALPHA = 0.35
const HOVER_COLOR = 0xffffff
const SELECT_COLOR = 0xc8a24a
const COORD_COLOR = 0x1b1a17
/** Coordinates on unpainted hexes need a light color to stay legible. */
const COORD_COLOR_EMPTY = 0xe8e2d4
/** Path styles; widths and dashes are fractions of the hex size. */
interface PathStyle {
  color: number
  width: number
  dash?: [number, number]
  /** A second stroke on top (a wall's stones). */
  inner?: { color: number; width: number; dash?: [number, number] }
  /** Drawn across lakes and seas instead of stopping at the shore. */
  crossesWater?: boolean
}

const PATH_STYLES: Record<PathKind, PathStyle> = {
  river: { color: 0x3f78a8, width: 0.2 },
  road: { color: 0x6e4f2c, width: 0.13 },
  trail: { color: 0x6e4f2c, width: 0.09, dash: [0.25, 0.18] },
  wall: {
    color: 0x3a3631,
    width: 0.17,
    inner: { color: 0x9c9480, width: 0.07, dash: [0.1, 0.1] },
    crossesWater: true,
  },
  border: { color: 0x8b1e1e, width: 0.09, dash: [0.3, 0.1], crossesWater: true },
}
/** Rivers under roads under trails; walls and borders on top. */
const PATH_ORDER: PathKind[] = ['river', 'road', 'trail', 'wall', 'border']
const DRAFT_COLOR = 0xffffff
const HANDLE_COLOR = 0xffffff
const HANDLE_OUTLINE = 0x1b1a17
/** Screen pixels within which a click grabs a path handle. */
const PICK_RADIUS_PX = 12
/** Crosshair arm length and gap around the center, in screen pixels. */
const CROSSHAIR_ARM = 9
const CROSSHAIR_GAP = 3
/** Bundled icons are tinted: dark ink on painted hexes, light on empty ones. */
const ICON_INK = 0x1b1a17
const ICON_INK_EMPTY = 0xe8e2d4
/** Icon size as a fraction of the hex size, nudged down to leave room for the coordinate. */
const ICON_SIZE = 1.25
const ICON_OFFSET_Y = 0.1
/** Captions (icon labels, hex and token names), in hex sizes. */
const CAPTION_SIZE = 0.22
/** Terrain glyph size (fraction of the hex size) and offset below the center. */
const GLYPH_SIZE = 0.72
const GLYPH_OFFSET_Y = 0.1
const MARKER_COLOR = 0xc8a24a
const MARKER_OUTLINE = 0x1b1a17
const COORD_FONT = 'hexmapper-coords'
/** Coordinates are hidden when a hex is smaller than this on screen (px). */
const COORD_MIN_SCREEN_SIZE = 24
const MIN_ZOOM = 0.05
const MAX_ZOOM = 8

export interface ExportResult {
  canvas: HTMLCanvasElement
  /** Exported region in world units. */
  bounds: Rectangle
  /** Safety padding (world units) included on each side of `bounds`. */
  padding: number
  pixelsPerUnit: number
}

let fontInstalled = false

function installCoordFont(): void {
  if (fontInstalled) return
  BitmapFont.install({
    name: COORD_FONT,
    style: { fontFamily: 'sans-serif', fontSize: 48, fill: '#ffffff' },
    chars: [['0', '9'], ',', '-'],
    resolution: 2,
  })
  fontInstalled = true
}

/** Renders the editor's map with PixiJS and turns pointer input into tool actions. */
export class MapRenderer {
  private world = new Container()
  private terrainLayer = new Container()
  private gridLines = new Graphics()
  private coordLayer = new Container()
  /** Small dots on hexes that have notes, POIs, tags or fields. */
  private pathsLayer = new Graphics()
  private iconLayer = new Container()
  private iconTextures = new IconTextures(() => {
    this.drawGlyphs()
    this.drawIcons()
    this.drawTokens()
  })
  /** Regions: tint, inner border along the outline, and the name. */
  private regionLayer = new Container()
  private regionShapes = new Graphics()
  /** Terrain glyphs: one tinted sprite per painted hex. */
  private glyphLayer = new Container()
  private glyphSprites = new Map<HexKey, Sprite>()
  private labelLayer = new Container()
  /** Hex names under their hexes. */
  private nameLayer = new Container()
  /** Party trail and route (play mode). */
  private partyLayer = new Container()
  private partyLines = new Graphics()
  private tokenLayer = new Container()
  private labelTexts = new Map<string, Text>()
  private markers = new Graphics()
  private overlay = new Graphics()
  /** Hexes with the highlighted tag (and the dimmed rest). */
  private highlight = new Graphics()
  /**
   * Crosshair drawn by us in screen space at the exact point used for hit testing.
   * The system cursor is hidden over the map: with fractional display scaling some
   * browsers scale the cursor image but not its hotspot, so it points off-target.
   */
  private cursorMark = new Graphics()
  private cursorOnHandle = false
  private pointer: Point | null = null

  private hexes = new Map<HexKey, Graphics>()
  private coordLabels = new Map<HexKey, BitmapText>()
  private contexts = new Map<string, GraphicsContext>()
  private emptyContext = new GraphicsContext()
  private corners: number[] = []

  private shapeSignature = ''
  private hovered: Offset | null = null
  private activeTool: Tool | null = null
  private panFrom: Point | null = null
  private spaceHeld = false
  private disposers: (() => void)[] = []

  constructor(
    private app: Application,
    private canvas: HTMLCanvasElement,
  ) {
    installCoordFont()
    this.world.addChild(
      this.terrainLayer,
      this.glyphLayer,
      this.gridLines,
      this.regionLayer,
      this.pathsLayer,
      this.iconLayer,
      this.nameLayer,
      this.coordLayer,
      this.labelLayer,
      this.partyLayer,
      this.tokenLayer,
      this.markers,
      this.highlight,
      this.overlay,
    )
    this.partyLayer.addChild(this.partyLines)
    this.regionLayer.addChild(this.regionShapes)
    app.stage.addChild(this.world, this.cursorMark)
    this.drawCursorMark()
    this.disposers.push(editor.onChange((change) => this.handleChange(change)))
    this.bindInput()
    setLabelHitTest((world) => this.labelAt(world))
    setTokenHitTest((world) => this.tokenAt(world))
    this.rebuild()
    this.fit()
    // Web fonts may arrive after the first draw; redraw labels with them.
    loadLabelFonts().then(() => {
      this.drawLabels()
      this.drawRegions()
      this.drawIcons()
      this.drawTokens()
    })
  }

  destroy(): void {
    for (const dispose of this.disposers) dispose()
    this.world.destroy({ children: true })
    this.destroyContexts()
    this.iconTextures.destroy()
  }

  /** Centers the whole map in the view. */
  fit(): void {
    const bounds = this.terrainLayer.getLocalBounds()
    const { width, height } = this.app.screen
    if (bounds.width === 0 || width === 0) return
    const scale = clampZoom(Math.min(width / bounds.width, height / bounds.height) * 0.92)
    this.world.scale.set(scale)
    this.world.position.set(
      (width - bounds.width * scale) / 2 - bounds.minX * scale,
      (height - bounds.height * scale) / 2 - bounds.minY * scale,
    )
    this.onViewChanged()
  }

  /**
   * Renders the visible map layers (no hover/selection overlays) to a canvas at
   * `pixelsPerUnit` pixels per world unit. Large exports are scaled down to fit the
   * GPU texture limit; the returned `pixelsPerUnit` is the one actually used.
   */
  exportCanvas(options: { pixelsPerUnit: number; background: number | null }): ExportResult {
    const { layers, grid } = editor.map
    this.overlay.visible = false
    // Coordinates follow the layer setting, not the on-screen zoom threshold.
    this.coordLayer.visible = layers.coords.visible && grid.showCoords
    const local = this.world.getLocalBounds()
    const pad = grid.hexSize * 0.1
    const bounds = new Rectangle(
      local.minX - pad,
      local.minY - pad,
      local.width + pad * 2,
      local.height + pad * 2,
    )
    const gl = (this.app.renderer as { gl?: WebGLRenderingContext }).gl
    const maxSide = Math.min(8192, gl?.getParameter(gl.MAX_TEXTURE_SIZE) ?? 8192)
    const pixelsPerUnit = Math.min(
      options.pixelsPerUnit,
      maxSide / Math.max(bounds.width, bounds.height),
    )
    for (const text of this.labelTexts.values())
      text.resolution = Math.min(8, Math.max(1, pixelsPerUnit))
    try {
      const texture = this.app.renderer.generateTexture({
        target: this.world,
        frame: bounds,
        resolution: pixelsPerUnit,
        clearColor: options.background ?? [0, 0, 0, 0],
      })
      const canvas = this.app.renderer.extract.canvas(texture) as HTMLCanvasElement
      texture.destroy(true)
      return { canvas, bounds, padding: pad, pixelsPerUnit }
    } finally {
      this.overlay.visible = true
      this.applyLayers()
      this.updateLabelResolution()
    }
  }

  /** World point → canvas pixel coordinates (used by tests and future UI overlays). */
  worldToScreen(p: Point): Point {
    const scale = this.world.scale.x
    return { x: p.x * scale + this.world.x, y: p.y * scale + this.world.y }
  }

  /** Centers a hex in the view, zooming in if hexes are too small to see. */
  centerOn(cell: Offset): void {
    const { hexSize } = editor.map.grid
    const scale = Math.max(this.world.scale.x, clampZoom(70 / (hexSize * 2)))
    const center = this.centerOf(cell)
    const { width, height } = this.app.screen
    this.world.scale.set(scale)
    this.world.position.set(width / 2 - center.x * scale, height / 2 - center.y * scale)
    this.onViewChanged()
  }

  /** Redraws hover, brush preview and selection outlines. */
  drawOverlay(): void {
    this.updateCursor()
    const g = this.overlay.clear()
    const { grid } = editor.map
    const scale = this.world.scale.x

    if (this.hovered && inBounds(this.hovered, grid)) {
      const brush = editor.tool === 'terrain' && editor.terrainMode !== 'fill'
      const cells = brush ? cellsInRadius(this.hovered, editor.brushRadius, grid) : [this.hovered]
      for (const cell of cells) g.poly(this.cornersAt(cell))
      g.stroke({ width: 2 / scale, color: HOVER_COLOR, alpha: 0.8 })
    }

    const draft = editor.pathDraft
    if (draft) {
      const { hexSize } = grid
      const points = draft.hexes.flatMap((key, i) => {
        if (!draft.nodes[i] && i !== draft.hexes.length - 1) return []
        const c = this.centerOf(parseKey(key))
        const o = draft.offsets[i]
        return [o ? { x: c.x + o[0] * hexSize, y: c.y + o[1] * hexSize } : c]
      })
      for (const key of draft.hexes) g.poly(this.cornersAt(parseKey(key)))
      g.stroke({ width: 1.5 / scale, color: DRAFT_COLOR, alpha: 0.5 })
      if (points.length > 1) {
        this.strokePolyline(g, editor.pathStraight ? points : catmullRom(points))
        g.stroke({ width: 3 / scale, color: DRAFT_COLOR, alpha: 0.9, cap: 'round', join: 'round' })
      }
      const end = points.at(-1)!
      g.circle(end.x, end.y, 5 / scale).fill(DRAFT_COLOR)
    } else if (editor.tool === 'path') {
      // Vertex handles for editing existing paths.
      for (const path of editor.map.paths) {
        const nodes = nodeFlags(path)
        path.hexes.forEach((key, i) => {
          if (!nodes[i] || !inBounds(parseKey(key), grid)) return
          const p = pathVertexPoint(path, i)
          g.circle(p.x, p.y, 4 / scale)
        })
      }
      g.fill({ color: HANDLE_COLOR, alpha: 0.9 }).stroke({
        width: 1.5 / scale,
        color: HANDLE_OUTLINE,
      })
    }

    const label = editor.selectedLabel ? this.labelTexts.get(editor.selectedLabel) : undefined
    if (label && editor.tool === 'text') {
      const b = label.getLocalBounds()
      const pad = 4 / scale
      const angle = (label.angle * Math.PI) / 180
      const corners = [
        [b.minX - pad, b.minY - pad],
        [b.maxX + pad, b.minY - pad],
        [b.maxX + pad, b.maxY + pad],
        [b.minX - pad, b.maxY + pad],
      ].flatMap(([x, y]) => [
        label.x + x * Math.cos(angle) - y * Math.sin(angle),
        label.y + x * Math.sin(angle) + y * Math.cos(angle),
      ])
      g.poly(corners).stroke({ width: 1.5 / scale, color: SELECT_COLOR })
    }

    if (editor.selected) {
      const cell = parseKey(editor.selected)
      if (inBounds(cell, grid)) {
        g.poly(this.cornersAt(cell))
        g.stroke({ width: 3 / scale, color: SELECT_COLOR })
      }
    }
  }

  private handleChange(change: MapChange): void {
    if (change.kind === 'hexes') {
      for (const key of change.keys) {
        const hex = this.hexes.get(key)
        if (hex) hex.context = this.contextFor(key)
        const label = this.coordLabels.get(key)
        if (label) this.styleCoord(label, key)
      }
      for (const key of change.keys) this.updateGlyph(key)
      if (editor.map.regions.length > 0) this.drawRegions()
      this.drawMarkers()
      if (editor.highlightTag) this.drawHighlight()
      this.drawIcons()
      if (editor.map.paths.length > 0) this.drawPaths()
    } else if (change.kind === 'paths') {
      this.drawPaths()
    } else if (change.kind === 'assets') {
      this.drawGlyphs()
      this.drawIcons()
      this.drawTokens()
    } else if (change.kind === 'play') {
      this.drawParty()
    } else if (change.kind === 'regions') {
      this.drawRegions()
    } else if (change.kind === 'style') {
      this.drawGlyphs()
      this.drawNames()
      this.drawRegions()
      this.drawTokens()
      this.applyLayers()
    } else if (change.kind === 'tokens') {
      this.drawTokens()
      this.drawParty()
    } else if (change.kind === 'labels') {
      this.drawLabels()
      // The selection box follows the label in the same frame (e.g. while dragging it).
      if (editor.selectedLabel) this.drawOverlay()
    } else if (change.kind === 'layers') {
      this.applyLayers()
    } else if (change.kind !== 'meta') {
      const before = this.shapeSignature
      this.rebuild()
      if (change.kind === 'all' || this.shapeSignature !== before) this.fit()
    }
  }

  private rebuild(): void {
    const { grid, terrains } = editor.map
    this.corners = cornerOffsets(grid.orientation, grid.hexSize)
    this.shapeSignature = `${grid.orientation}:${grid.width}x${grid.height}:${grid.hexSize}`

    for (const child of this.terrainLayer.removeChildren()) child.destroy()
    for (const child of this.coordLayer.removeChildren()) child.destroy()
    this.hexes.clear()
    this.coordLabels.clear()
    this.destroyContexts()

    this.emptyContext = new GraphicsContext().poly(this.corners).fill(EMPTY_FILL)
    for (const terrain of terrains)
      this.contexts.set(terrain.id, new GraphicsContext().poly(this.corners).fill(terrain.color))

    this.gridLines.clear()
    const coordSize = grid.hexSize * 0.3
    const coordOffset = grid.hexSize * (grid.orientation === 'flat' ? 0.8 : 0.72)

    for (const cell of allCells(grid)) {
      const key = keyOf(cell)
      const center = this.centerOf(cell)

      const hex = new Graphics(this.contextFor(key))
      hex.position.set(center.x, center.y)
      this.terrainLayer.addChild(hex)
      this.hexes.set(key, hex)

      this.gridLines.poly(this.cornersAt(cell))

      if (grid.showCoords) {
        const label = new BitmapText({
          text: formatCoord(cell, grid.coordFormat, grid),
          style: { fontFamily: COORD_FONT, fontSize: coordSize },
        })
        this.styleCoord(label, key)
        label.anchor.set(0.5, 0)
        this.coordLabels.set(key, label)
        label.position.set(center.x, center.y - coordOffset)
        this.coordLayer.addChild(label)
      }
    }
    this.gridLines.stroke({ width: 1, color: GRID_COLOR, alpha: GRID_ALPHA, pixelLine: true })
    this.drawGlyphs()
    this.drawRegions()
    this.drawPaths()
    this.drawIcons()
    this.drawLabels()
    this.drawParty()
    this.drawTokens()
    this.drawHighlight()
    this.onViewChanged()
  }

  private drawRegions(): void {
    for (const child of this.regionLayer.removeChildren())
      if (child !== this.regionShapes) child.destroy()
    this.regionLayer.addChild(this.regionShapes)
    const g = this.regionShapes.clear()
    const { grid, hexes, regions } = editor.map
    if (!regions.length) return
    const hs = grid.hexSize
    const members = new Map<string, Offset[]>()
    for (const [key, hex] of Object.entries(hexes) as [HexKey, (typeof hexes)[HexKey]][]) {
      if (!hex.region) continue
      const cell = parseKey(key)
      if (!inBounds(cell, grid)) continue
      const list = members.get(hex.region) ?? []
      list.push(cell)
      members.set(hex.region, list)
    }
    for (const region of regions) {
      const cells = members.get(region.id)
      if (!cells?.length) continue
      const style = { ...editor.map.regionStyle, ...region.style }
      if (style.fill > 0) {
        for (const cell of cells) g.poly(this.cornersAt(cell))
        g.fill({ color: region.color, alpha: style.fill })
      }
      // Border on the inner side of the outline, so neighboring regions don't overlap.
      if (style.border > 0 && style.borderOpacity > 0)
        for (const cell of cells) {
          const c = this.centerOf(cell)
          const corners = this.cornersAt(cell)
          for (let i = 0; i < 6; i++) {
            const a = { x: corners[i * 2], y: corners[i * 2 + 1] }
            const b = { x: corners[((i + 1) % 6) * 2], y: corners[((i + 1) % 6) * 2 + 1] }
            const across = {
              x: c.x + ((a.x + b.x) / 2 - c.x) * 2,
              y: c.y + ((a.y + b.y) / 2 - c.y) * 2,
            }
            const { orientation } = grid
            const neighbor = toOffset(pixelToHex(across, orientation, hs), orientation)
            const inside = inBounds(neighbor, grid) && hexes[keyOf(neighbor)]?.region === region.id
            if (inside) continue
            // Inset by half the border, so it stays inside the region.
            const k = 1 - Math.min(0.4, style.border / 2 + 0.055)
            const inset = (p: Point) => ({ x: c.x + (p.x - c.x) * k, y: c.y + (p.y - c.y) * k })
            const [p, q] = [inset(a), inset(b)]
            const runs = style.dashed ? dashes([p, q], hs * 0.22, hs * 0.14) : [[p, q]]
            for (const run of runs) {
              if (run.length < 2) continue
              g.moveTo(run[0].x, run[0].y)
              for (const point of run.slice(1)) g.lineTo(point.x, point.y)
            }
          }
        }
      if (style.border > 0 && style.borderOpacity > 0)
        g.stroke({
          width: hs * style.border,
          color: region.color,
          alpha: style.borderOpacity,
          cap: style.dashed ? 'butt' : 'round',
        })
      if (region.showName === false || !region.name || !editor.map.captions.regionNames.show)
        continue
      const center = cells
        .map((cell) => this.centerOf(cell))
        .reduce((sum, p) => ({ x: sum.x + p.x / cells.length, y: sum.y + p.y / cells.length }), {
          x: 0,
          y: 0,
        })
      const size = hs * Math.min(1.1, 0.4 + Math.sqrt(cells.length) * 0.08)
      const text = this.caption(
        'regionNames',
        region.name.toUpperCase(),
        center.x,
        center.y,
        { color: region.color, size },
        region.nameStyle,
      )
      text.alpha = 0.9
      this.regionLayer.addChild(text)
    }
  }

  private drawGlyphs(): void {
    for (const child of this.glyphLayer.removeChildren()) child.destroy()
    this.glyphSprites.clear()
    for (const key of Object.keys(editor.map.hexes) as HexKey[]) this.updateGlyph(key)
  }

  /**
   * The glyph of one hex: its terrain's symbol in a lighter or darker shade of the terrain
   * color, faded by the map's glyph opacity. Hexes with an icon show the icon instead.
   */
  private updateGlyph(key: HexKey): void {
    const old = this.glyphSprites.get(key)
    if (old) {
      this.glyphSprites.delete(key)
      old.destroy()
    }
    const { grid, hexes, terrains, assets } = editor.map
    const hex = hexes[key]
    if (grid.glyphs <= 0 || !hex?.terrain || hex.icon) return
    const terrain = terrains.find((t) => t.id === hex.terrain)
    if (!terrain?.glyph || !inBounds(parseKey(key), grid)) return
    const image = iconImage(terrain.glyph, assets)
    const texture = image && this.iconTextures.get(terrain.glyph, image.url)
    if (!texture) return
    const hs = grid.hexSize
    const sprite = new Sprite(texture)
    sprite.anchor.set(0.5)
    sprite.setSize(hs * GLYPH_SIZE, hs * GLYPH_SIZE)
    const center = this.centerOf(parseKey(key))
    sprite.position.set(center.x, center.y + hs * GLYPH_OFFSET_Y)
    if (image.tintable) sprite.tint = glyphShade(terrain.color)
    sprite.alpha = grid.glyphs
    this.glyphLayer.addChild(sprite)
    this.glyphSprites.set(key, sprite)
  }

  private drawPaths(): void {
    const g = this.pathsLayer.clear()
    const { hexSize } = editor.map.grid
    for (const kind of PATH_ORDER) {
      const style = PATH_STYLES[kind]
      for (const path of editor.map.paths) {
        if (path.kind !== kind) continue
        const runs = pathRuns(this.pathVertices(path, style.crossesWater))
        // A closed loop stays closed unless water cut it into pieces.
        const loop = path.closed && runs.length === 1 && runs[0].length >= 3
        const lines = runs.map((run) =>
          loop
            ? path.straight
              ? [...run, run[0]]
              : catmullRomClosed(run)
            : path.straight
              ? run
              : catmullRom(run),
        )
        const stroke = (s: { color: number; width: number; dash?: [number, number] }) => {
          for (const line of lines) {
            const pieces = s.dash ? dashes(line, s.dash[0] * hexSize, s.dash[1] * hexSize) : [line]
            for (const piece of pieces) this.strokePolyline(g, piece)
          }
          g.stroke({ width: s.width * hexSize, color: s.color, cap: 'round', join: 'round' })
        }
        stroke(style)
        if (style.inner) stroke(style.inner)
      }
    }
    if (editor.tool === 'path') this.drawOverlay()
  }

  private drawLabels(): void {
    for (const child of this.labelLayer.removeChildren()) child.destroy()
    this.labelTexts.clear()
    const { hexSize } = editor.map.grid
    for (const label of editor.map.labels) {
      const { style } = label
      const fontSize = style.size * hexSize
      const text = new Text({
        text: label.text || ' ',
        style: {
          fontFamily: FONT_FAMILIES[style.font].family,
          fontSize,
          fontStyle: style.italic ? 'italic' : 'normal',
          fill: style.color,
          align: 'center',
          ...(style.halo && {
            stroke: {
              color: style.haloColor,
              width: fontSize * style.haloWidth,
              join: 'round' as const,
            },
          }),
        },
      })
      text.anchor.set(0.5)
      text.position.set(label.x * hexSize, label.y * hexSize)
      text.angle = style.rotation
      this.labelLayer.addChild(text)
      this.labelTexts.set(label.id, text)
    }
    this.updateLabelResolution()
  }

  /** Trail and route of the party (play mode); the party itself is a token. */
  private drawParty(): void {
    const lines = this.partyLines.clear()
    const play = editor.map.play
    const { grid } = editor.map
    if (!play) return
    const center = (key: string) => this.centerOf(parseKey(key as HexKey))
    const hs = grid.hexSize
    const party = partyToken(editor.map)

    // Along a road, trail or river they follow, the trail and route take its drawn points
    // (bending where it bends); they curve like the map's lines unless the play settings ask
    // for straight ones, and run beside them (the trail on the left of its way, the route on
    // the right) so they never sit on a road or river, nor on each other.
    const followed: FollowedPath[] = TRAVEL_PATH_KINDS.flatMap((kind) =>
      editor.map.paths
        .filter((path) => path.kind === kind)
        .map((path) => {
          const nodes = nodeFlags(path)
          return {
            hexes: path.hexes,
            point: (i: number) => pathVertexPoint(path, i),
            node: (i: number) => nodes[i],
          }
        }),
    )
    const line = (keys: string[], side: number) => {
      const points = routePoints(keys, center, followed)
      return offsetPolyline(
        play.straightTrail ? points : catmullRom(points),
        side * hs * 0.2,
        hs * 0.6,
      )
    }
    if (party?.hex && play.showTrail && play.trail.length > 1) {
      const points = line(
        play.trail.filter((k) => inBounds(parseKey(k), grid)),
        -1,
      )
      for (const piece of dashes(points, hs * 0.12, hs * 0.14)) this.strokePolyline(lines, piece)
      lines.stroke({
        width: hs * 0.07,
        color: tokenColor(party, editor.map.tokens),
        alpha: 0.85,
        cap: 'round',
      })
    }

    const session =
      play.mode === 'rules'
        ? (play.rules?.session as { travel?: { route?: string[]; destination?: string } } | null)
        : null
    const route = session?.travel?.route
    if (route && route.length > 1) {
      const points = line(route, 1)
      for (const piece of dashes(points, hs * 0.3, hs * 0.18)) this.strokePolyline(lines, piece)
      lines.stroke({ width: hs * 0.06, color: 0xffffff, alpha: 0.9, cap: 'round' })
      const end = points.at(-1)!
      lines.circle(end.x, end.y, hs * 0.35).stroke({ width: hs * 0.07, color: SELECT_COLOR })
    }
  }

  /** Tokens (party, characters, enemies…): a ringed disc with the icon, several per hex. */
  drawTokens(): void {
    for (const child of this.tokenLayer.removeChildren()) child.destroy()
    const { assets, grid } = editor.map
    const hs = grid.hexSize
    const g = new Graphics()
    this.tokenLayer.addChild(g)
    for (const placed of layoutTokens(editor.map.tokens)) {
      const { token } = placed
      if (!inBounds(parseKey(placed.hex), grid)) continue
      const c = this.centerOf(parseKey(placed.hex))
      const at = { x: c.x + placed.dx * hs, y: c.y + placed.dy * hs }
      const r = placed.radius * hs
      const color = tokenColor(token, editor.map.tokens)
      if (token.halo !== false)
        g.circle(at.x, at.y, r)
          .fill({ color: 0xf4eedd, alpha: 0.92 })
          .stroke({ width: Math.max(1, r * 0.1), color })
      if (token.id === editor.selectedToken)
        g.circle(at.x, at.y, r * 1.18).stroke({
          width: Math.max(1.5, r * 0.1),
          color: SELECT_COLOR,
        })
      const image = iconImage(token.iconId, assets)
      const texture = image && this.iconTextures.get(token.iconId, image.url)
      if (!texture) continue
      const sprite = new Sprite(texture)
      sprite.anchor.set(0.5)
      const size = r * (token.halo !== false ? 1.55 : 2)
      sprite.setSize(size, size)
      sprite.position.set(at.x, at.y)
      if (image.tintable) sprite.tint = color
      this.tokenLayer.addChild(sprite)
    }
    for (const placed of layoutTokens(editor.map.tokens)) {
      if (!placed.token.showName || !placed.token.name || !editor.map.captions.tokenNames.show)
        continue
      const c = this.centerOf(parseKey(placed.hex))
      const at = { x: c.x + placed.dx * hs, y: c.y + (placed.dy + placed.radius) * hs + 1 }
      this.tokenLayer.addChild(
        this.caption('tokenNames', placed.token.name, at.x, at.y, {}, placed.token.nameStyle),
      )
    }
  }

  /** Topmost token under a world point. */
  private tokenAt(world: Point): string | null {
    const hs = editor.map.grid.hexSize
    const placed = layoutTokens(editor.map.tokens)
    for (let i = placed.length - 1; i >= 0; i--) {
      const p = placed[i]
      const c = this.centerOf(parseKey(p.hex))
      const d = Math.hypot(world.x - (c.x + p.dx * hs), world.y - (c.y + p.dy * hs))
      if (d <= p.radius * hs) return p.token.id
    }
    return null
  }

  /** Re-rasterize text for the current zoom so labels stay sharp. */
  private textResolution(): number {
    return Math.min(4, Math.max(1, Math.ceil(this.world.scale.x * devicePixelRatio * 2) / 2))
  }

  private updateLabelResolution(): void {
    const resolution = this.textResolution()
    for (const text of this.labelTexts.values())
      if (text.resolution !== resolution) text.resolution = resolution
    for (const layer of [this.iconLayer, this.nameLayer, this.tokenLayer, this.regionLayer])
      for (const child of layer.children)
        if (child instanceof Text && child.resolution !== resolution) child.resolution = resolution
  }

  /** Topmost label whose (rotated) box contains the world point. */
  private labelAt(world: Point): string | null {
    const labels = editor.map.labels
    for (let i = labels.length - 1; i >= 0; i--) {
      const text = this.labelTexts.get(labels[i].id)
      if (!text) continue
      const angle = (-text.angle * Math.PI) / 180
      const dx = world.x - text.x
      const dy = world.y - text.y
      const lx = dx * Math.cos(angle) - dy * Math.sin(angle)
      const ly = dx * Math.sin(angle) + dy * Math.cos(angle)
      const bounds = text.getLocalBounds()
      if (lx >= bounds.minX && lx <= bounds.maxX && ly >= bounds.minY && ly <= bounds.maxY)
        return labels[i].id
    }
    return null
  }

  private pathVertices(path: MapPath, crossesWater = false): PathVertex[] {
    const { grid, hexes, terrains } = editor.map
    const water = new Set(terrains.filter((t) => t.water).map((t) => t.id))
    const nodes = nodeFlags(path)
    const vertices: PathVertex[] = []
    path.hexes.forEach((key, i) => {
      const cell = parseKey(key)
      if (!inBounds(cell, grid)) return
      const terrain = hexes[key]?.terrain
      vertices.push({
        center: this.centerOf(cell),
        point: pathVertexPoint(path, i),
        water: !crossesWater && !!terrain && water.has(terrain),
        node: nodes[i],
      })
    })
    return vertices
  }

  private drawIcons(): void {
    for (const child of this.iconLayer.removeChildren()) child.destroy()
    const { grid, hexes, assets } = editor.map
    const halos = new Graphics()
    this.iconLayer.addChild(halos)
    for (const [key, hex] of Object.entries(hexes) as [HexKey, (typeof hexes)[HexKey]][]) {
      const icon = hex.icon
      if (!icon) continue
      const cell = parseKey(key)
      if (!inBounds(cell, grid)) continue
      const image = iconImage(icon.id, assets)
      const texture = image && this.iconTextures.get(icon.id, image.url)
      if (!texture) continue
      const size = grid.hexSize * ICON_SIZE * (icon.scale ?? 1)
      const center = this.centerOf(cell)
      const x = center.x + (icon.offset?.[0] ?? 0) * grid.hexSize
      const cy = center.y + grid.hexSize * ((icon.offset?.[1] ?? 0) + ICON_OFFSET_Y)
      if (icon.halo)
        halos
          .circle(x, cy, size * (icon.haloSize ?? ICON_DEFAULTS.haloSize))
          .fill({ color: icon.haloColor ?? ICON_DEFAULTS.haloColor, alpha: 0.85 })
      const place = (sprite: Sprite, dx = 0, dy = 0) => {
        sprite.anchor.set(0.5)
        sprite.setSize(size, size)
        if (icon.flip) sprite.scale.x *= -1
        sprite.angle = icon.rotation ?? 0
        sprite.position.set(x + dx, cy + dy)
        this.iconLayer.addChild(sprite)
      }
      if (icon.outline) {
        // Outline: the silhouette drawn around the icon in 12 directions, behind it.
        const width = size * (icon.outlineWidth ?? ICON_DEFAULTS.outlineWidth)
        const color = icon.outlineColor ?? ICON_DEFAULTS.outlineColor
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2
          const copy = new Sprite(texture)
          if (image.tintable) copy.tint = color
          else copy.filters = [silhouette(color)]
          place(copy, Math.cos(angle) * width, Math.sin(angle) * width)
        }
      }
      const sprite = new Sprite(texture)
      if (image.tintable)
        sprite.tint = icon.color ?? (hex.terrain || icon.halo ? ICON_INK : ICON_INK_EMPTY)
      place(sprite)
    }
    this.drawNames()
  }

  /** Hex names, under the hex. */
  private drawNames(): void {
    for (const child of this.nameLayer.removeChildren()) child.destroy()
    const { grid, hexes } = editor.map
    const hs = grid.hexSize
    for (const [key, hex] of Object.entries(hexes) as [HexKey, (typeof hexes)[HexKey]][]) {
      if (!hex.name || hex.showName === false) continue
      const cell = parseKey(key)
      if (!inBounds(cell, grid)) continue
      const c = this.centerOf(cell)
      this.nameLayer.addChild(
        this.caption('hexNames', hex.name, c.x, c.y + hs * 0.5, {}, hex.nameStyle),
      )
    }
  }

  /**
   * A map text in its kind's style (Map settings → Map texts), centered under a point; region
   * names are centered on it and take `size` (their own, from the region's extent).
   */
  private caption(
    kind: CaptionKind,
    text: string,
    x: number,
    y: number,
    auto: { color?: string; size?: number } = {},
    /** The element's own style, replacing its kind's. */
    own?: CaptionOverride,
  ): Text {
    const style = own ? { ...editor.map.captions[kind], ...own } : editor.map.captions[kind]
    const fontSize = (auto.size ?? editor.map.grid.hexSize * CAPTION_SIZE) * style.size
    const caption = new Text({
      text,
      style: {
        fontFamily: FONT_FAMILIES[style.font].family,
        fontSize,
        fontStyle: style.italic ? 'italic' : 'normal',
        fill: style.color ?? auto.color ?? '#1b1a17',
        align: 'center',
        ...(kind === 'regionNames' && { letterSpacing: fontSize * 0.12 }),
        ...(style.halo && {
          stroke: { color: style.haloColor, width: fontSize * 0.25, join: 'round' as const },
        }),
      },
    })
    caption.anchor.set(0.5, kind === 'regionNames' ? 0.5 : 0)
    caption.position.set(x, y)
    caption.resolution = this.textResolution()
    return caption
  }

  private strokePolyline(g: Graphics, points: Point[]): void {
    if (points.length < 2) return
    g.moveTo(points[0].x, points[0].y)
    for (const p of points.slice(1)) g.lineTo(p.x, p.y)
  }

  /** Hexes with `editor.highlightTag`: outlined, and the rest dimmed if asked. */
  drawHighlight(): void {
    const g = this.highlight.clear()
    const { grid } = editor.map
    const keys = hexesWithTag(editor.map, editor.highlightTag)
    if (!editor.highlightTag.trim()) return
    if (editor.highlightDim) {
      const lit = new Set<string>(keys)
      for (const cell of allCells(grid)) if (!lit.has(keyOf(cell))) g.poly(this.cornersAt(cell))
      g.fill({ color: 0x000000, alpha: 0.55 })
    }
    if (!keys.length) return
    for (const key of keys) g.poly(this.cornersAt(parseKey(key)))
    g.fill({ color: SELECT_COLOR, alpha: 0.18 })
    for (const key of keys) g.poly(this.cornersAt(parseKey(key)))
    g.stroke({
      width: Math.max(grid.hexSize * 0.08, 2.5 / this.world.scale.x),
      color: SELECT_COLOR,
    })
  }

  private drawMarkers(): void {
    const g = this.markers.clear()
    const { grid, hexes } = editor.map
    // Never smaller than ~4px on screen, so markers stay visible when zoomed out.
    const radius = Math.max(grid.hexSize * 0.1, 4 / this.world.scale.x)
    const offset = grid.hexSize * 0.42
    for (const [key, hex] of Object.entries(hexes) as [HexKey, (typeof hexes)[HexKey]][]) {
      const cell = parseKey(key)
      if (!hasMetadata(hex) || !inBounds(cell, grid)) continue
      const { x, y } = this.centerOf(cell)
      g.circle(x + offset, y - offset, radius)
    }
    g.fill(MARKER_COLOR).stroke({ width: radius * 0.4, color: MARKER_OUTLINE })
  }

  private styleCoord(label: BitmapText, key: HexKey): void {
    const painted = !!editor.map.hexes[key]?.terrain
    label.tint = painted ? COORD_COLOR : COORD_COLOR_EMPTY
    label.alpha = painted ? 0.7 : 0.35
  }

  private contextFor(key: HexKey): GraphicsContext {
    const terrain = editor.map.hexes[key]?.terrain
    return (terrain && this.contexts.get(terrain)) || this.emptyContext
  }

  private destroyContexts(): void {
    for (const context of this.contexts.values()) context.destroy()
    this.contexts.clear()
    this.emptyContext.destroy()
  }

  private centerOf(cell: Offset): Point {
    const { orientation, hexSize } = editor.map.grid
    return hexToPixel(toAxial(cell, orientation), orientation, hexSize)
  }

  private cornersAt(cell: Offset): number[] {
    const { x, y } = this.centerOf(cell)
    return this.corners.map((v, i) => v + (i % 2 === 0 ? x : y))
  }

  /** Layer visibility; coordinates also hide when hexes are too small to read them. */
  private applyLayers(): void {
    const { layers, grid } = editor.map
    this.terrainLayer.visible = layers.terrain.visible
    this.glyphLayer.visible = layers.terrain.visible
    this.regionLayer.visible = layers.regions.visible
    this.gridLines.visible = layers.grid.visible
    this.pathsLayer.visible = layers.paths.visible
    this.iconLayer.visible = layers.icons.visible
    this.labelLayer.visible = layers.labels.visible
    this.nameLayer.visible = editor.map.captions.hexNames.show
    this.partyLayer.visible = layers.party.visible
    this.tokenLayer.visible = layers.tokens.visible
    this.markers.visible = layers.markers.visible
    this.coordLayer.visible =
      layers.coords.visible &&
      grid.showCoords &&
      grid.hexSize * this.world.scale.x >= COORD_MIN_SCREEN_SIZE
  }

  private onViewChanged(): void {
    this.applyLayers()
    this.updateLabelResolution()
    this.drawMarkers()
    this.drawOverlay()
  }

  // --- Input -------------------------------------------------------------

  private screenPoint(e: MouseEvent): Point {
    const rect = this.canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  private pointerInfo(e: PointerEvent): PointerInfo {
    const scale = this.world.scale.x
    const { x, y } = this.screenPoint(e)
    return {
      button: e.button,
      alt: e.altKey,
      ctrl: e.ctrlKey || e.metaKey,
      shift: e.shiftKey,
      world: { x: (x - this.world.x) / scale, y: (y - this.world.y) / scale },
      pickRadius: PICK_RADIUS_PX / scale,
    }
  }

  private cellAt(e: MouseEvent): Offset {
    const { x, y } = this.screenPoint(e)
    const scale = this.world.scale.x
    const world = { x: (x - this.world.x) / scale, y: (y - this.world.y) / scale }
    const { orientation, hexSize } = editor.map.grid
    return toOffset(pixelToHex(world, orientation, hexSize), orientation)
  }

  private zoomAt(screen: Point, factor: number): void {
    const oldScale = this.world.scale.x
    const scale = clampZoom(oldScale * factor)
    this.world.position.set(
      screen.x - ((screen.x - this.world.x) * scale) / oldScale,
      screen.y - ((screen.y - this.world.y) * scale) / oldScale,
    )
    this.world.scale.set(scale)
    this.onViewChanged()
  }

  private setHovered(cell: Offset | null): void {
    const same =
      cell === this.hovered ||
      (cell && this.hovered && cell.col === this.hovered.col && cell.row === this.hovered.row)
    if (same) return
    this.hovered = cell
    this.drawOverlay()
  }

  private updateCursor(): void {
    const panning = this.panFrom || this.spaceHeld
    // Panning keeps the system hand; otherwise our own crosshair replaces the cursor.
    this.canvas.style.cursor = this.panFrom ? 'grabbing' : panning ? 'grab' : 'none'
    const onHandle = editor.tool === 'path' && !!editor.hoveredHandle
    this.cursorMark.visible = !panning && this.pointer !== null
    if (this.cursorMark.visible) this.cursorMark.position.set(this.pointer!.x, this.pointer!.y)
    // Over a handle the crosshair inverts (white on black), back to black when leaving.
    if (onHandle !== this.cursorOnHandle) {
      this.cursorOnHandle = onHandle
      this.drawCursorMark()
    }
  }

  private drawCursorMark(): void {
    const g = this.cursorMark.clear()
    const arm = (x1: number, y1: number, x2: number, y2: number) => g.moveTo(x1, y1).lineTo(x2, y2)
    const lines = () => {
      arm(0, -CROSSHAIR_GAP, 0, -CROSSHAIR_GAP - CROSSHAIR_ARM)
      arm(0, CROSSHAIR_GAP, 0, CROSSHAIR_GAP + CROSSHAIR_ARM)
      arm(-CROSSHAIR_GAP, 0, -CROSSHAIR_GAP - CROSSHAIR_ARM, 0)
      arm(CROSSHAIR_GAP, 0, CROSSHAIR_GAP + CROSSHAIR_ARM, 0)
    }
    const [outer, inner] = this.cursorOnHandle ? [0x000000, 0xffffff] : [0xffffff, 0x000000]
    lines()
    g.stroke({ width: 3.5, color: outer, cap: 'round' })
    lines()
    g.stroke({ width: 1.5, color: inner, cap: 'round' })
    g.circle(0, 0, 1.2).fill(inner)
    this.cursorMark.eventMode = 'none'
  }

  private bindInput(): void {
    const canvas = this.canvas
    const on = <K extends keyof HTMLElementEventMap>(
      target: HTMLElement | Window,
      type: K,
      handler: (e: HTMLElementEventMap[K]) => void,
      options?: AddEventListenerOptions,
    ) => {
      target.addEventListener(type, handler as EventListener, options)
      this.disposers.push(() => target.removeEventListener(type, handler as EventListener))
    }

    on(canvas, 'pointerdown', (e) => {
      // Commit any half-edited panel field (its change event fires on blur) before
      // a tool can change the selection out from under it.
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
      // Suppress the compatibility mousedown so its default action doesn't steal focus
      // from fields a tool focuses (e.g. a new label's text).
      e.preventDefault()
      canvas.setPointerCapture(e.pointerId)
      if (e.button === 1 || (e.button === 0 && this.spaceHeld)) {
        this.panFrom = this.screenPoint(e)
        this.updateCursor()
        return
      }
      if (e.button !== 0 && e.button !== 2) return
      const cell = this.cellAt(e)
      // Labels may sit outside the grid (titles, margins); other tools edit hexes.
      if (!inBounds(cell, editor.map.grid) && editor.tool !== 'text') return
      this.activeTool = getTool(editor.tool)
      this.activeTool.down(cell, this.pointerInfo(e))
    })

    on(canvas, 'pointermove', (e) => {
      if (this.panFrom) {
        const p = this.screenPoint(e)
        this.world.position.set(
          this.world.x + p.x - this.panFrom.x,
          this.world.y + p.y - this.panFrom.y,
        )
        this.panFrom = p
        return
      }
      this.pointer = this.screenPoint(e)
      const cell = this.cellAt(e)
      this.setHovered(cell)
      this.updateCursor()
      if (this.activeTool) this.activeTool.move(cell, this.pointerInfo(e))
      else getTool(editor.tool).hover?.(cell, this.pointerInfo(e))
    })

    const release = () => {
      this.panFrom = null
      this.activeTool?.up()
      this.activeTool = null
      this.updateCursor()
    }
    on(canvas, 'pointerup', release)
    on(canvas, 'pointercancel', release)
    on(canvas, 'pointerleave', () => {
      this.pointer = null
      this.setHovered(null)
      this.updateCursor()
    })
    on(canvas, 'contextmenu', (e) => e.preventDefault())
    on(
      canvas,
      'wheel',
      (e) => {
        e.preventDefault()
        this.zoomAt(this.screenPoint(e), Math.pow(1.0015, -e.deltaY))
      },
      { passive: false },
    )

    on(window, 'keydown', (e) => {
      if (e.code === 'Space' && !isTyping(e)) {
        e.preventDefault()
        this.spaceHeld = true
        this.updateCursor()
      }
    })
    on(window, 'keyup', (e) => {
      if (e.code === 'Space') {
        this.spaceHeld = false
        this.updateCursor()
      }
    })
    this.updateCursor()
  }
}

const silhouettes = new Map<string, ColorMatrixFilter>()

/** Filter turning any image into a flat silhouette of `color` (keeps alpha). Cached per color. */
function silhouette(color: string): ColorMatrixFilter {
  const cached = silhouettes.get(color)
  if (cached) return cached
  const n = parseInt(color.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255)
  const filter = new ColorMatrixFilter()
  filter.matrix = [0, 0, 0, 0, r, 0, 0, 0, 0, g, 0, 0, 0, 0, b, 0, 0, 0, 1, 0]
  silhouettes.set(color, filter)
  return filter
}

function clampZoom(scale: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale))
}

const TEXT_INPUT_TYPES = new Set(['text', 'search', 'number', 'email', 'url', 'password', 'tel'])

/**
 * True when keys go to a text field. Sliders, checkboxes, color pickers and buttons
 * don't count, so shortcuts like Ctrl+Z still work right after using them.
 */
export function isTyping(e: KeyboardEvent): boolean {
  const target = e.target
  // Keys sent to the window or the document itself aren't typing.
  if (!(target instanceof Element)) return false
  if (target instanceof HTMLInputElement) return TEXT_INPUT_TYPES.has(target.type)
  return !!target.closest('textarea, select, [contenteditable="true"]')
}
