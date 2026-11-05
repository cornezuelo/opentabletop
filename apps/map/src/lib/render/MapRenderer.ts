import type { CharacterState } from '@open-tabletop/character-engine'
import {
  Application,
  BitmapFont,
  BitmapText,
  BlurFilter,
  ColorMatrixFilter,
  Container,
  Graphics,
  GraphicsContext,
  Rectangle,
  Sprite,
  Text,
  Texture,
  TilingSprite,
} from 'pixi.js'
import type { MapChange } from '../commands/command'
import {
  type CaptionKind,
  type CaptionOverride,
  hasMetadata,
  cellOfPlace,
  connectionLook,
  type ConnectionSymbol,
  hexesWithTag,
  isInside,
  regionCells,
  regionChain,
  regionTree,
  ICON_DEFAULTS,
  mapWalls,
  type MapPath,
  nodeFlags,
  partyToken,
  type PathKind,
  tokenColor,
  TRAVEL_PATH_KINDS,
} from '@open-tabletop/map'
import { iconImage } from '../icons/registry'
import { catmullRom, catmullRomClosed, dashes, densify, offsetPolyline, wobble } from './curves'
import { colorOf, mix, paint, seedOf, shade } from './painters'
import { displace, noiseCanvas, raggedPolygon } from './noise'
import { hatchStrokes, shadowStrips, stippleDots, type WallSide } from './dungeon'
import { placeBetween, placeOnCell, symbolShapes, type Placement } from './symbols'
import { pathRuns, routePoints, type FollowedPath, type PathVertex } from './pathGeometry'
import { connectionsNow } from '../play/connections'
import { IconTextures } from './IconTextures'
import { glyphShade } from './glyphs'
import { mapStyle } from '../styles'
import { mapFocus } from './focus'
import { setLabelHitTest, setTokenHitTest } from './hitTest'
import { FONT_FAMILIES, loadLabelFonts } from '../labels/fonts'
import {
  allCells,
  cellAt,
  cellCenter,
  cellCorners,
  cellSides,
  cellsInRadius,
  cellsInRect,
  formatCoord,
  hatchSegments,
  type HexKey,
  inBounds,
  keyOf,
  type Offset,
  parseKey,
  type Point,
} from '@open-tabletop/hex'
import { editor } from '../store/editor.svelte'
import { getSystem } from '../play/systems'
import { drawnTokens, isCopy } from '../play/present'
import { currentTool, pathVertexPoint, type PointerInfo, type Tool } from '../tools/tools'

/** Each side of a ragged cell is cut in this many pieces (walls follow the same points). */
const RAGGED_STEPS = 5
/** Empty hexes on paper, when exporting to print. */
const PAPER_FILL = 0xffffff
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
/** Connections drawn between places: a dashed line with a diamond at its middle. */
const CONNECTION_COLOR = 0x5b3a8c
/** One the trip going on can't cross now: greyed, its diamond crossed out. */
const SHUT_COLOR = 0x8a8478
const CONNECTION_OUTLINE = 0xf4efe2
/**
 * Ways between maps, drawn as a badge with an arrow, in colours no terrain or connection
 * has: down into a sub-map, up out to the parent map.
 */
const WAY_IN = 0xc4561c
const WAY_OUT = 0x1f7a8c
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
const COORD_FONT = 'map-coords'
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
  /** Where water meets land: the style's lines along the shore, not blurred with the ground. */
  private shoreLines = new Graphics()
  /** …and its shallows, in the terrain layer, so they blend into the water. */
  private shallows = new Graphics()
  /** The paper under a map whose borders wander or blend, so its edge melts into paper, not the dark. */
  private sheet = new Graphics()
  /** The paper's grain over the ground (the style's `ground.grain`). */
  private grainLayer = new Container()
  /** What the style draws on each terrain's cells (mountains, trees…), the lower over the higher. */
  private artLayer = new Container({ sortableChildren: true })
  private artCells = new Map<HexKey, Graphics>()
  /** The blur the terrains' borders blend by (the style's `ground.blend`). */
  private groundBlur: BlurFilter | null = null
  private gridLines = new Graphics()
  /** Walls, drawn by themselves where floor meets what isn't floor. */
  private wallLines = new Graphics()
  private coordLayer = new Container()
  /** Small dots on hexes that have notes, POIs, tags or fields. */
  private pathsLayer = new Graphics()
  /** Connections drawn between places (bridges, gates, tunnels…). */
  private connectionLayer = new Graphics()
  private iconLayer = new Container()
  /** The ways into sub-maps and out to the parent map, above the places' icons. */
  private wayLayer = new Graphics()
  private iconTextures = new IconTextures(() => {
    this.drawGlyphs()
    this.drawIcons()
    this.drawTokens()
  })
  /** Regions: tint, inner border along the outline, and the name. */
  private regionLayer = new Container()
  private regionShapes = new Graphics()
  /**
   * Regions' names, above connections and ways, each placed where it overlaps no other
   * name (`placeRegionNames`).
   */
  private regionNameLayer = new Container()
  /** Each region name and the points it may stand on, the best first. */
  private regionNames: { text: Text; spots: Point[]; cells: Set<HexKey> }[] = []
  /** What region names keep clear of besides other names: connections' diamonds, ways. */
  private marks: { x: number; y: number; w: number; h: number }[] = []
  /** …and the places' icons. */
  private iconMarks: { x: number; y: number; w: number; h: number }[] = []
  /** The factions' territory: hatching in each one's colour, and a dashed frontier. */
  private factionShapes = new Graphics()
  /** The land of the region or faction being worked on, outlined, and the rest dimmed. */
  private selection = new Graphics()
  /** Terrain glyphs: one tinted sprite per painted hex. */
  private glyphLayer = new Container()
  private glyphSprites = new Map<HexKey, Sprite>()
  private labelLayer = new Container()
  /** Hex names under their hexes. */
  private nameLayer = new Container()
  /** Party trail and route (play mode). */
  private partyLayer = new Container()
  private partyLines = new Graphics()
  /** Threads from the party to what its characters are tied to (play mode, its own layer). */
  private relationLines = new Graphics()
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
  /** Exporting with empty hexes as paper: white, with dark ink on them (`exportCanvas`). */
  private paper = false
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
      this.sheet,
      this.terrainLayer,
      this.shoreLines,
      this.grainLayer,
      this.glyphLayer,
      this.gridLines,
      this.artLayer,
      this.wallLines,
      this.regionLayer,
      this.factionShapes,
      this.selection,
      this.pathsLayer,
      this.connectionLayer,
      this.iconLayer,
      this.wayLayer,
      this.nameLayer,
      this.regionNameLayer,
      this.coordLayer,
      this.labelLayer,
      this.partyLayer,
      this.relationLines,
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
    setTokenHitTest((world, copies) => this.tokenAt(world, copies))
    this.rebuild()
    this.fit()
    // Web fonts may arrive after the first draw; redraw labels with them.
    loadLabelFonts().then(() => {
      this.drawLabels()
      this.drawRegions()
      this.drawFactions()
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
  exportCanvas(options: {
    pixelsPerUnit: number
    background: number | null
    /** Empty hexes white, with dark coordinates and icons on them (saves ink). */
    emptyWhite?: boolean
    /** Only this part of the map (world units), e.g. one page of a tiled print. */
    frame?: { x: number; y: number; width: number; height: number }
  }): ExportResult {
    const { layers, grid } = editor.map
    if (options.emptyWhite) this.setPaper(true)
    this.overlay.visible = false
    // Coordinates follow the layer setting, not the on-screen zoom threshold.
    this.coordLayer.visible = layers.coords.visible && grid.showCoords
    const pad = grid.hexSize * 0.1
    const whole = this.exportBounds()
    const f = options.frame
    const bounds = f ? new Rectangle(f.x, f.y, f.width, f.height) : whole
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
      if (options.emptyWhite) this.setPaper(false)
      this.overlay.visible = true
      this.applyLayers()
      this.updateLabelResolution()
    }
  }

  /** What an export covers: everything drawn, plus a little padding (world units). */
  exportBounds(): Rectangle {
    const overlay = this.overlay.visible
    this.overlay.visible = false
    const local = this.world.getLocalBounds()
    this.overlay.visible = overlay
    const pad = editor.map.grid.hexSize * 0.1
    return new Rectangle(
      local.minX - pad,
      local.minY - pad,
      local.width + pad * 2,
      local.height + pad * 2,
    )
  }

  /** Empty hexes as paper (white, dark ink on them) or as the editor shows them. */
  private setPaper(on: boolean): void {
    this.paper = on
    this.emptyContext
      .clear()
      .poly(this.corners)
      .fill(on ? PAPER_FILL : this.emptyFill())
    for (const [key, label] of this.coordLabels) this.styleCoord(label, key)
    this.drawIcons()
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

  /** Centers a point of the map (in hexes, like labels' `x` / `y`), zooming in like `centerOn`. */
  centerOnPoint(p: Point): void {
    const { hexSize } = editor.map.grid
    const scale = Math.max(this.world.scale.x, clampZoom(70 / (hexSize * 2)))
    const { width, height } = this.app.screen
    this.world.scale.set(scale)
    this.world.position.set(width / 2 - p.x * hexSize * scale, height / 2 - p.y * hexSize * scale)
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
      // A rectangle being painted (Shift+drag), or the brush under the pointer.
      const cells = editor.paintFrom
        ? cellsInRect(editor.paintFrom, this.hovered, grid)
        : brush
          ? cellsInRadius(this.hovered, editor.brushRadius, grid)
          : [this.hovered]
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
        if (hex && this.ragged()) this.raggedCell(hex, parseKey(key))
        else if (hex) hex.context = this.contextFor(key)
        const label = this.coordLabels.get(key)
        if (label) this.styleCoord(label, key)
      }
      for (const key of change.keys) this.updateGlyph(key)
      for (const key of change.keys) this.updateArt(key)
      this.drawShores()
      this.drawWalls()
      if (editor.map.regions.length > 0) this.drawRegions()
      this.drawMarkers()
      if (editor.highlightTag) this.drawHighlight()
      this.drawIcons()
      if (editor.map.paths.length > 0) this.drawPaths()
    } else if (change.kind === 'paths') {
      this.drawPaths()
    } else if (change.kind === 'walls') {
      this.drawWalls()
    } else if (change.kind === 'connections') {
      this.drawConnections()
      // A connection across a wall opens it (a door).
      this.drawWalls()
    } else if (change.kind === 'assets') {
      this.drawGlyphs()
      this.drawIcons()
      this.drawTokens()
    } else if (change.kind === 'play') {
      this.drawParty()
      // What the trip changed of the connections (a gate opened, a path found).
      if (editor.map.connections.length) this.drawConnections()
      // Those present are drawn from the play state.
      this.drawTokens()
    } else if (change.kind === 'regions') {
      this.drawRegions()
    } else if (change.kind === 'factions') {
      this.drawFactions()
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
    this.corners = cellCorners(grid, grid.hexSize)
    this.shapeSignature = `${grid.kind ?? 'hex'}:${grid.orientation}:${grid.width}x${grid.height}:${grid.hexSize}`

    for (const child of this.terrainLayer.removeChildren()) child.destroy()
    for (const child of this.coordLayer.removeChildren()) child.destroy()
    this.hexes.clear()
    this.coordLabels.clear()
    this.destroyContexts()

    this.emptyContext = new GraphicsContext()
      .poly(this.corners)
      .fill(this.paper ? PAPER_FILL : this.emptyFill())
    for (const terrain of terrains)
      this.contexts.set(
        terrain.id,
        new GraphicsContext().poly(this.corners).fill(this.terrainFill(terrain)),
      )

    this.gridLines.clear()
    const coordSize = grid.hexSize * 0.3
    const coordOffset =
      grid.hexSize * (grid.kind === 'square' ? 0.78 : grid.orientation === 'flat' ? 0.8 : 0.72)

    for (const cell of allCells(grid)) {
      const key = keyOf(cell)
      const center = this.centerOf(cell)

      const hex = this.ragged()
        ? this.raggedCell(new Graphics(), cell)
        : new Graphics(this.contextFor(key))
      if (!this.ragged()) hex.position.set(center.x, center.y)
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
    // The grid's line is the style's (Map settings → Style).
    const line = mapStyle().grid
    this.gridLines.stroke({ width: 1, color: line.color, alpha: line.opacity, pixelLine: true })
    this.shallows = new Graphics()
    this.terrainLayer.addChild(this.shallows)
    this.drawShores()
    this.applyGround()
    this.drawArt()
    this.drawWalls()
    this.drawGlyphs()
    this.drawRegions()
    // The map's factions (none on a new map: the last map's land mustn't stay drawn).
    this.drawFactions()
    this.drawPaths()
    this.drawConnections()
    this.drawIcons()
    this.drawLabels()
    this.drawParty()
    this.drawTokens()
    this.drawHighlight()
    this.onViewChanged()
  }

  /**
   * The walls: every side of a floor cell facing a cell that isn't floor (or the map's edge),
   * and every side a wall is drawn on by hand, but where a connection is drawn across it (a
   * door, an arch), as a thick line in the style's colour (`walls`), following the ground's
   * ragged borders. Rooms painted side by side merge; a corridor painted into a room opens
   * it. Outside a wall, on the side away from the floor, the style's band (hatching, a
   * shadow, a cave's stipple); on the floor, its grid (`floors.grid`).
   */
  private drawWalls(): void {
    const g = this.wallLines.clear()
    const style = mapStyle()
    const { grid } = editor.map
    const hs = grid.hexSize
    const walls = mapWalls(editor.map)
    const drawn = new Set<string>(editor.map.walls.flat())
    // The cells a wall may stand beside: floor, and the ends of walls drawn by hand.
    const beside = (key: string) => walls.floor(key) || drawn.has(key)
    // Where the band may not go: floor (the next room), and off the map.
    const onFloor = (p: Point) => {
      const cell = cellAt(p, grid, hs)
      return !inBounds(cell, grid) || walls.floor(keyOf(cell))
    }
    const lines: Point[][] = []
    const outside: WallSide[] = []
    const floorGrid: Point[][] = []
    for (const cell of allCells(grid)) {
      const key = keyOf(cell)
      if (!beside(key)) continue
      const center = this.centerOf(cell)
      cellSides(cell, grid, hs).forEach(({ a, b, across }, i) => {
        const there = keyOf(across)
        const off = !inBounds(across, grid)
        if (off) {
          if (!walls.floor(key)) return
        } else if (!walls.between(key, there)) {
          // An open side between two floor cells: the floor's grid, once.
          if (walls.floor(key) && walls.floor(there) && key < there) floorGrid.push([a, b])
          return
        } else if (beside(there) && there < key) return
        // A side between two such cells is drawn once, from the first.
        lines.push([a, b])
        // Which side is out: away from the floor; a wall between two floors has no outside.
        const inside = walls.floor(key)
        if (inside === (!off && walls.floor(there))) return
        const mx = (a.x + b.x) / 2 - center.x
        const my = (a.y + b.y) / 2 - center.y
        const len = Math.hypot(mx, my) || 1
        const sign = inside ? 1 : -1
        outside.push({
          a,
          b,
          out: { x: (mx / len) * sign, y: (my / len) * sign },
          seed: seedOf(`${key}#${i}`),
        })
      })
    }
    // Each side follows the ground's ragged border (the same noise, the same points).
    const { amplitude, scale } = this.raggedness()
    // (A side as a closed polygon of two corners: its first half is the side, from a to b.)
    const follow = ([a, b]: Point[]): number[] =>
      this.ragged()
        ? raggedPolygon([a.x, a.y, b.x, b.y], RAGGED_STEPS, amplitude, scale).slice(
            0,
            (RAGGED_STEPS + 1) * 2,
          )
        : [a.x, a.y, b.x, b.y]

    const band = style.walls.band * hs
    const ink = colorOf(style.walls.color)
    if (style.walls.outside === 'hatch') {
      for (const side of outside)
        for (const [p, q] of hatchStrokes(side, band, onFloor)) g.moveTo(p.x, p.y).lineTo(q.x, q.y)
      g.stroke({ width: hs * 0.022, color: ink, alpha: 0.85, cap: 'round' })
    } else if (style.walls.outside === 'shadow') {
      for (const side of outside)
        for (const strip of shadowStrips(side, band))
          g.poly(strip.points).fill({ color: ink, alpha: strip.alpha })
    } else if (style.walls.outside === 'stipple') {
      for (const side of outside)
        for (const dot of stippleDots(side, band, hs * 0.018, onFloor))
          g.circle(dot.x, dot.y, dot.r).fill({ color: ink, alpha: dot.alpha })
    }

    if (style.floors.grid > 0 && floorGrid.length) {
      for (const side of floorGrid) {
        const pts = follow(side)
        g.moveTo(pts[0], pts[1])
        for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1])
      }
      g.stroke({
        width: 1,
        color: colorOf(style.grid.color),
        alpha: style.floors.grid,
        pixelLine: true,
      })
    }

    if (lines.length) {
      for (const side of lines) {
        const pts = follow(side)
        g.moveTo(pts[0], pts[1])
        for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1])
      }
      g.stroke({ width: hs * style.walls.width, color: ink, cap: 'round', join: 'round' })
    }
  }

  /**
   * Each faction's hexes in its colour, as a political map draws them over the land:
   * diagonal hatching, and a dashed frontier where its land ends (regions, the geography,
   * are a flat tint with a solid border).
   */
  private drawFactions(): void {
    const g = this.factionShapes.clear()
    const own = editor.factionsOnMap
    this.drawSelection()
    if (!own) return
    const { grid } = editor.map
    const hs = grid.hexSize
    const system = getSystem(own.system).factions
    for (const [id, hexes] of Object.entries(own.territories)) {
      const color = system?.def.factions[id]?.color ?? '#8a7f6e'
      const cells = hexes.map((k) => parseKey(k as HexKey)).filter((c) => inBounds(c, grid))
      if (!cells.length) continue
      for (const cell of cells)
        for (const [p, q] of hatchSegments(this.cornersAt(cell), hs * 0.32))
          g.moveTo(p.x, p.y).lineTo(q.x, q.y)
      g.stroke({ width: hs * 0.045, color, alpha: 0.5, cap: 'butt' })
      const held = new Set(hexes)
      for (const cell of cells) {
        const c = this.centerOf(cell)
        for (const { a, b, across } of cellSides(cell, grid, hs)) {
          if (held.has(keyOf(across))) continue
          // On the inner side, so two factions side by side both show.
          const inset = (p: { x: number; y: number }) => ({
            x: p.x + (c.x - p.x) * 0.08,
            y: p.y + (c.y - p.y) * 0.08,
          })
          const [p, q] = [inset(a), inset(b)]
          for (const run of dashes([p, q], hs * 0.2, hs * 0.12)) {
            if (run.length < 2) continue
            g.moveTo(run[0].x, run[0].y)
            for (const point of run.slice(1)) g.lineTo(point.x, point.y)
          }
        }
      }
      g.stroke({ width: hs * 0.07, color, alpha: 0.9, cap: 'butt' })
    }
  }

  /**
   * What the map brings forward (`mapFocus`): the layer being worked on in full and the
   * other faded, and the land of the region or faction chosen outlined (light, with a dark
   * halo that shows on any terrain) while the rest of the map is dimmed.
   */
  drawSelection(): void {
    const g = this.selection.clear()
    const { grid, hexes, layers } = editor.map
    const own = editor.factionsOnMap
    const focus = mapFocus({
      tool: editor.tool,
      panelView: editor.panelView,
      regionId: editor.regionId,
      factionBrush: editor.factionBrush,
      regionsOf: (key) => regionChain(editor.map.regions, hexes[key]?.region).map((r) => r.id),
      hexes: [...allCells(grid)].map(keyOf),
      territories: own?.territories ?? {},
    })
    this.regionLayer.alpha = focus.regionsAlpha
    this.regionNameLayer.alpha = focus.regionsAlpha
    this.factionShapes.alpha = focus.factionsAlpha
    // A hidden layer (Layers) shows nothing chosen on it either.
    const hidden =
      (editor.panelView === 'world' && layers.factions?.visible === false) ||
      (editor.panelView !== 'world' && !layers.regions.visible)
    const cells = focus.selected.map(parseKey).filter((c) => inBounds(c, grid))
    if (!cells.length || hidden) return
    const chosen = new Set(cells.map(keyOf))
    for (const cell of allCells(grid)) if (!chosen.has(keyOf(cell))) g.poly(this.cornersAt(cell))
    g.fill({ color: 0x000000, alpha: 0.3 })
    // Its outline: the edges of its hexes that face a hex outside it.
    const hs = grid.hexSize
    const edges: [Point, Point][] = []
    for (const cell of cells)
      for (const { a, b, across } of cellSides(cell, grid, hs))
        if (!chosen.has(keyOf(across))) edges.push([a, b])
    const minimum = 1 / this.world.scale.x
    for (const [width, color, alpha] of [
      [Math.max(hs * 0.2, 6 * minimum), 0x000000, 0.55],
      [Math.max(hs * 0.09, 2.5 * minimum), 0xffffff, 1],
    ] as const) {
      for (const [a, b] of edges) g.moveTo(a.x, a.y).lineTo(b.x, b.y)
      g.stroke({ width, color, alpha, cap: 'round', join: 'round' })
    }
  }

  private drawRegions(): void {
    for (const child of this.regionLayer.removeChildren())
      if (child !== this.regionShapes) child.destroy()
    this.regionLayer.addChild(this.regionShapes)
    for (const child of this.regionNameLayer.removeChildren()) child.destroy()
    this.regionNames = []
    const g = this.regionShapes.clear()
    const { grid, hexes, regions } = editor.map
    this.drawSelection()
    if (!regions.length) return
    const hs = grid.hexSize
    const members = new Map<string, Offset[]>()
    // A cell is in its region and in every region that one lies inside.
    for (const [key, hex] of Object.entries(hexes) as [HexKey, (typeof hexes)[HexKey]][]) {
      if (!hex.region) continue
      const cell = parseKey(key)
      if (!inBounds(cell, grid)) continue
      for (const { id } of regionChain(regions, hex.region)) {
        const list = members.get(id) ?? []
        list.push(cell)
        members.set(id, list)
      }
    }
    // Outer regions first, so those inside them are drawn over.
    for (const { region } of regionTree(regions)) {
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
          for (const { a, b, across } of cellSides(cell, grid, hs)) {
            const inside =
              inBounds(across, grid) && isInside(regions, hexes[keyOf(across)]?.region, region.id)
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
      // A room's name is a room's, not a kingdom's: small, whatever its size.
      const size = region.onePlace
        ? hs * 0.32
        : hs * Math.min(1.1, 0.4 + Math.sqrt(cells.length) * 0.08)
      const text = this.caption(
        'regionNames',
        region.name.toUpperCase(),
        center.x,
        center.y,
        { color: region.color, size },
        region.nameStyle,
      )
      text.alpha = 0.9
      // Never wider than the region (and a cell): a long name in a small room shrinks.
      const xs = cells.map((cell) => this.centerOf(cell).x)
      const room = Math.max(...xs) - Math.min(...xs) + this.cellWidth(cells[0])
      if (text.width > room) text.scale.set(Math.max(0.55, room / text.width))
      // Where it may stand: its middle, then its own cells (not those of regions inside it)
      // from the nearest to the middle.
      const own = cells.filter((cell) => hexes[keyOf(cell)]?.region === region.id)
      const spots = [center, ...(own.length ? own : cells).map((cell) => this.centerOf(cell))]
      const far = (p: Point) => Math.hypot(p.x - center.x, p.y - center.y)
      spots.sort((a, b) => far(a) - far(b))
      this.regionNames.push({ text, spots, cells: new Set(cells.map(keyOf)) })
      this.regionNameLayer.addChild(text)
    }
    this.placeRegionNames()
  }

  /** A cell's width on screen, from its corners. */
  private cellWidth(cell: Offset): number {
    const xs = this.cornersAt(cell).filter((_, i) => i % 2 === 0)
    return Math.max(...xs) - Math.min(...xs)
  }

  /**
   * Places the regions' names, the smallest regions' first (they have the fewest spots): each
   * on the first of its spots (moved inside the map) where it overlaps no name placed before,
   * no cell's name, free label, icon, connection's diamond or way, and lies over its own region;
   * where none
   * is, the one that overlaps least and lies most over the region.
   */
  private placeRegionNames(): void {
    const rect = (x: number, y: number, w: number, h: number) => ({ x, y, w, h })
    type Rect = ReturnType<typeof rect>
    const overlap = (a: Rect, b: Rect) =>
      Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
      Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))
    // Cells' names and free labels, each where its anchor puts it.
    const placed = (c: Text) =>
      rect(c.x - c.width * c.anchor.x, c.y - c.height * c.anchor.y, c.width, c.height)
    const taken: Rect[] = [
      ...(this.nameLayer.children as Text[]).map(placed),
      ...(this.labelLayer.children as Text[]).filter((c) => c instanceof Text).map(placed),
      ...this.marks,
      ...this.iconMarks,
    ]
    // A name near the map's edge is moved in, so none is cut off by it.
    const map = this.gridLines.getLocalBounds()
    const within = (v: number, half: number, from: number, size: number) =>
      size <= 2 * half ? from + size / 2 : Math.min(Math.max(v, from + half), from + size - half)
    const names = [...this.regionNames].sort((a, b) => a.spots.length - b.spots.length)
    const { grid } = editor.map
    /** How much of a name standing at a point lies over its region's cells, from 0 to 1. */
    const over = (at: Point, w: number, cells: Set<HexKey>) => {
      let n = 0
      for (let i = 0; i <= 8; i++) {
        const p = { x: at.x - w / 2 + (w * i) / 8, y: at.y }
        if (cells.has(keyOf(cellAt(p, grid, grid.hexSize)))) n++
      }
      return n / 9
    }
    for (const { text, spots, cells } of names) {
      const { width: w, height: h } = text
      let best: { at: Point; cost: number } | null = null
      // Then each spot a line above or below, for a room too small to hold it elsewhere.
      const shifted = [-1, 1].flatMap((d) => spots.map((p) => ({ x: p.x, y: p.y + d * h })))
      for (const spot of [...spots, ...shifted]) {
        const at =
          map.width > 0
            ? {
                x: within(spot.x, w / 2, map.x, map.width),
                y: within(spot.y, h / 2, map.y, map.height),
              }
            : spot
        const r = rect(at.x - w / 2, at.y - h / 2, w, h)
        // Overlapping something costs most; standing off its region, less.
        const cost =
          taken.reduce((sum, t) => sum + overlap(r, t), 0) + ((1 - over(at, w, cells)) * w * h) / 3
        if (!best || cost < best.cost) best = { at, cost }
        if (cost === 0) break
      }
      if (!best) continue
      text.position.set(best.at.x, best.at.y)
      taken.push(rect(best.at.x - w / 2, best.at.y - h / 2, w, h))
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
    const look = mapStyle().paths
    for (const kind of PATH_ORDER) {
      const own = look.kinds[kind as keyof typeof look.kinds]
      const style: PathStyle = {
        ...PATH_STYLES[kind],
        ...(own?.color && { color: colorOf(own.color) }),
        ...(own?.width !== undefined && { width: own.width }),
      }
      for (const path of editor.map.paths) {
        if (path.kind !== kind) continue
        const runs = pathRuns(this.pathVertices(path, style.crossesWater))
        // A closed loop stays closed unless water cut it into pieces.
        const loop = path.closed && runs.length === 1 && runs[0].length >= 3
        const lines = runs
          .map((run) =>
            loop
              ? path.straight
                ? [...run, run[0]]
                : catmullRomClosed(run)
              : path.straight
                ? run
                : catmullRom(run),
          )
          // A hand's wobble (the style's), the same for a path every time.
          .map((line) =>
            look.wobble > 0 && !path.straight
              ? wobble(
                  densify(line, hexSize * 0.1),
                  look.wobble * hexSize * 0.12,
                  hexSize * 1.3,
                  seedOf(path.id),
                )
              : line,
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

  /**
   * Each connection, as the style draws its kind (`connectionLook`): by default a dashed line
   * from one place's centre to the other's, outlined so it shows on any terrain, and a diamond
   * at its middle; or a symbol (a door in its wall, a bridge, a ford) on the side the two
   * cells share, with a line or none. The selected one in the selection's colour, one the trip
   * going on can't cross now greyed (a diamond crossed out, a symbol barred), and the place a
   * connection being drawn starts at.
   */
  drawConnections(): void {
    const g = this.connectionLayer.clear()
    const { grid } = editor.map
    const { hexSize } = grid
    const style = mapStyle()
    const now = connectionsNow()
    this.marks = []
    for (const connection of editor.map.connections) {
      const [a, b] = connection.between.map(parseKey)
      if (!inBounds(a, grid) || !inBounds(b, grid)) continue
      const [from, to] = [this.centerOf(a), this.centerOf(b)]
      const look = connectionLook(style, connection.kind)
      const shut = now.get(connection.id)?.open === false
      const color =
        connection.id === editor.selectedConnection
          ? SELECT_COLOR
          : shut
            ? SHUT_COLOR
            : look.color
              ? colorOf(look.color)
              : look.symbol === 'diamond'
                ? CONNECTION_COLOR
                : colorOf(style.art.ink)
      if (look.line !== 'none') {
        const line = [from, to]
        const pieces = look.line === 'dashed' ? dashes(line, 0.3 * hexSize, 0.16 * hexSize) : [line]
        for (const piece of pieces) this.strokePolyline(g, piece)
        g.stroke({ width: 0.22 * hexSize, color: CONNECTION_OUTLINE, cap: 'round', alpha: 0.85 })
        for (const piece of pieces) this.strokePolyline(g, piece)
        g.stroke({ width: 0.13 * hexSize, color, cap: 'round' })
      }
      if (look.symbol === 'diamond') {
        const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }
        const r = 0.26 * hexSize
        this.marks.push({ x: mid.x - r, y: mid.y - r, w: 2 * r, h: 2 * r })
        g.poly([mid.x, mid.y - r, mid.x + r, mid.y, mid.x, mid.y + r, mid.x - r, mid.y])
        g.fill({ color })
        g.stroke({ width: 0.04 * hexSize, color: CONNECTION_OUTLINE })
        if (shut) {
          const x = r * 0.45
          g.moveTo(mid.x - x, mid.y - x).lineTo(mid.x + x, mid.y + x)
          g.moveTo(mid.x + x, mid.y - x).lineTo(mid.x - x, mid.y + x)
          g.stroke({ width: 0.06 * hexSize, color: CONNECTION_OUTLINE, cap: 'round' })
        }
        continue
      }
      const shared = cellSides(a, grid, hexSize).find((side) => keyOf(side.across) === keyOf(b))
      const place = placeBetween(from, to, shared, hexSize)
      if (look.symbol === 'badge') this.drawBadge(g, place.at, 'in')
      else this.drawSymbol(g, look.symbol, place, color)
      if (shut && look.symbol !== 'none') {
        // Barred: a line across the symbol, from one place towards the other.
        const { at, across } = place
        const h = 0.3 * hexSize
        g.moveTo(at.x - across.x * h, at.y - across.y * h)
        g.lineTo(at.x + across.x * h, at.y + across.y * h)
        g.stroke({ width: 0.07 * hexSize, color, cap: 'round' })
      }
    }
    this.drawWays()
    this.placeRegionNames()
    const start = editor.connectionStart
    if (start && inBounds(parseKey(start), grid)) {
      g.poly(this.cornersAt(parseKey(start)))
      g.stroke({ width: 0.08 * hexSize, color: CONNECTION_COLOR })
    }
  }

  /**
   * A connection's or a way's symbol (`symbolShapes`): its light parts in the floor's colour
   * (on floor) or the paper's, its lines and outlines in `color`.
   */
  private drawSymbol(g: Graphics, symbol: ConnectionSymbol, place: Placement, color: number) {
    const { hexSize } = editor.map.grid
    const style = mapStyle()
    const onFloor = mapWalls(editor.map).floor(keyOf(cellAt(place.at, editor.map.grid, hexSize)))
    const light = colorOf(onFloor ? style.floors.color : style.paper)
    const fills = { light, ink: color, dark: shade(color, 0.35) }
    const width = 0.045 * hexSize
    const r = 0.4 * hexSize
    this.marks.push({ x: place.at.x - r, y: place.at.y - r, w: 2 * r, h: 2 * r })
    for (const shape of symbolShapes(symbol, place, hexSize)) {
      if ('line' in shape) {
        const [p, q] = shape.line
        g.moveTo(p.x, p.y).lineTo(q.x, q.y)
        g.stroke({ width, color, cap: 'round' })
        continue
      }
      if ('poly' in shape) g.poly(shape.poly)
      else g.circle(shape.circle.x, shape.circle.y, shape.r)
      g.fill({ color: fills[shape.fill] })
      if (shape.outline) g.stroke({ width, color, join: 'round' })
    }
  }

  /** A way's badge: a disc with an arrow down (in, to a sub-map) or up (out, to the parent). */
  private drawBadge(g: Graphics, at: Point, way: 'in' | 'out'): void {
    const { hexSize } = editor.map.grid
    const r = 0.25 * hexSize
    this.marks.push({ x: at.x - r, y: at.y - r, w: 2 * r, h: 2 * r })
    g.circle(at.x, at.y, r)
    g.fill({ color: way === 'in' ? WAY_IN : WAY_OUT })
    g.stroke({ width: 0.05 * hexSize, color: CONNECTION_OUTLINE })
    // The arrow: a shaft and its head, pointing down (in) or up (out).
    const d = way === 'in' ? 1 : -1
    const len = r * 0.55
    const head = r * 0.4
    g.moveTo(at.x, at.y - d * len).lineTo(at.x, at.y + d * len)
    g.moveTo(at.x - head, at.y + d * (len - head)).lineTo(at.x, at.y + d * len)
    g.lineTo(at.x + head, at.y + d * (len - head))
    g.stroke({ width: 0.06 * hexSize, color: CONNECTION_OUTLINE, cap: 'round', join: 'round' })
  }

  /**
   * The ways into sub-maps and, on a sub-map, out of it, drawn above the places' icons as the
   * style draws their kind: by default a badge in the cell's lower left, an arrow down into
   * the sub-map or up out to its parent; or a symbol (a stair, a ladder, a cave's mouth) on
   * the cell.
   */
  private drawWays(): void {
    const g = this.wayLayer.clear()
    const { grid } = editor.map
    const { hexSize } = grid
    const style = mapStyle()
    const ways: [HexKey, 'in' | 'out', string | undefined][] = [
      ...(editor.linked.children ?? []).flatMap((c) =>
        (c.meta.parent?.ways ?? []).map((w): [HexKey, 'in', string | undefined] => [
          w.place,
          'in',
          w.kind,
        ]),
      ),
      ...(editor.map.meta.parent?.ways ?? []).map((w): [HexKey, 'out', string | undefined] => [
        w.entrance,
        'out',
        w.kind,
      ]),
    ]
    for (const [key, way, kind] of ways) {
      const cell = parseKey(key)
      if (!inBounds(cell, grid)) continue
      const c = this.centerOf(cell)
      const look = connectionLook(style, kind, true)
      if (look.symbol === 'badge' || look.symbol === 'diamond')
        this.drawBadge(g, { x: c.x - 0.42 * hexSize, y: c.y + 0.36 * hexSize }, way)
      else if (look.symbol !== 'none')
        this.drawSymbol(
          g,
          look.symbol,
          placeOnCell(c, hexSize),
          look.color ? colorOf(look.color) : colorOf(style.art.ink),
        )
    }
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
    this.placeRegionNames()
  }

  /** Trail and route of the party (play mode); the party itself is a token. */
  private drawParty(): void {
    const lines = this.partyLines.clear()
    const threads = this.relationLines.clear()
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

    // Threads from the party to what its characters are tied to: a hex, a place in one, a
    // region (its middle). Their own layer (Layers → Relations), hidden by default.
    if (party?.hex && play.mode === 'rules') {
      const from = center(party.hex)
      for (const to of relationTargets(play)) {
        const end = to.length === 1 ? center(to[0]) : middleOf(to.map(center))
        if (Math.hypot(end.x - from.x, end.y - from.y) < hs * 0.5) continue
        for (const piece of dashes([from, end], hs * 0.14, hs * 0.1))
          this.strokePolyline(threads, piece)
        threads.stroke({
          width: hs * 0.05,
          color: tokenColor(party, editor.map.tokens),
          alpha: 0.85,
        })
        threads.circle(end.x, end.y, hs * 0.18).stroke({
          width: hs * 0.04,
          color: tokenColor(party, editor.map.tokens),
          alpha: 0.7,
        })
      }
    }

    const session =
      play.mode === 'rules'
        ? (play.rules?.session as { travel?: { route?: string[]; destination?: string } } | null)
        : null
    // A room on the route is drawn on its cell next to the step before.
    let near: string | undefined = party?.hex
    const route = session?.travel?.route?.flatMap((place) => {
      const at = cellOfPlace(editor.map, place, near)
      near = at ?? near
      return at ? [at] : []
    })
    if (route && route.length > 1) {
      const points = line(route, 1)
      for (const piece of dashes(points, hs * 0.3, hs * 0.18)) this.strokePolyline(lines, piece)
      lines.stroke({ width: hs * 0.06, color: 0xffffff, alpha: 0.9, cap: 'round' })
      const end = points.at(-1)!
      lines.circle(end.x, end.y, hs * 0.35).stroke({ width: hs * 0.07, color: SELECT_COLOR })
    }
  }

  /**
   * Tokens (party, characters, enemies…): a ringed disc with the icon, several per hex; in
   * Play, those present too, a group of copies as one with ×N, and +N for what didn't fit.
   */
  drawTokens(): void {
    for (const child of this.tokenLayer.removeChildren()) child.destroy()
    const { assets, grid } = editor.map
    const hs = grid.hexSize
    const g = new Graphics()
    this.tokenLayer.addChild(g)
    const drawn = drawnTokens()
    const all = drawn.map((p) => p.token)
    /** A small count on a token's lower right (×N) or in a chip (+N). */
    const badge = (text: string, x: number, y: number, size: number) => {
      const label = new Text({
        text,
        style: {
          fontFamily: FONT_FAMILIES.sans.family,
          fontSize: size,
          fontWeight: '700',
          fill: '#1b1a17',
          stroke: { color: 0xf4eedd, width: size * 0.3, join: 'round' },
        },
      })
      label.anchor.set(0.5)
      label.position.set(x, y)
      label.resolution = this.textResolution()
      return label
    }
    const labels: Text[] = []
    for (const placed of drawn) {
      const { token } = placed
      if (!inBounds(parseKey(placed.hex), grid)) continue
      const c = this.centerOf(parseKey(placed.hex))
      const at = { x: c.x + placed.dx * hs, y: c.y + placed.dy * hs }
      const r = placed.radius * hs
      if (placed.more) {
        g.circle(at.x, at.y, r)
          .fill({ color: 0xf4eedd, alpha: 0.92 })
          .stroke({ width: Math.max(1, r * 0.1), color: 0x6b6458 })
        labels.push(badge(`+${placed.more.length}`, at.x, at.y, r * 0.9))
        continue
      }
      const color = tokenColor(token, all)
      if (placed.group)
        labels.push(badge(`×${placed.group.length}`, at.x + r * 0.75, at.y + r * 0.75, r * 0.7))
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
    for (const label of labels) this.tokenLayer.addChild(label)
    for (const placed of drawn) {
      if (placed.more || !placed.token.showName || !placed.token.name) continue
      if (!editor.map.captions.tokenNames.show) continue
      const c = this.centerOf(parseKey(placed.hex))
      const at = { x: c.x + placed.dx * hs, y: c.y + (placed.dy + placed.radius) * hs + 1 }
      this.tokenLayer.addChild(
        this.caption('tokenNames', placed.token.name, at.x, at.y, {}, placed.token.nameStyle),
      )
    }
  }

  /**
   * Topmost token under a world point: the map's, and with `copies` those present (Play);
   * chips (+N) aren't picked.
   */
  private tokenAt(world: Point, copies = false): string | null {
    const hs = editor.map.grid.hexSize
    const placed = drawnTokens()
    for (let i = placed.length - 1; i >= 0; i--) {
      const p = placed[i]
      if (p.more || (!copies && isCopy(p.token))) continue
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
    this.iconMarks = []
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
      this.iconMarks.push({ x: x - size / 2, y: cy - size / 2, w: size, h: size })
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
        sprite.tint =
          icon.color ?? (hex.terrain || icon.halo || this.paper ? ICON_INK : ICON_INK_EMPTY)
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
    this.placeRegionNames()
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
    const painted = !!editor.map.hexes[key]?.terrain || this.paper
    label.tint = painted ? COORD_COLOR : COORD_COLOR_EMPTY
    label.alpha = painted ? 0.7 : 0.35
  }

  /** The colour of cells nothing is painted on: the style's paper. */
  private emptyFill(): number {
    return colorOf(mapStyle().paper)
  }

  /** A terrain's colour as the ground shows it: washed towards the paper by the style. */
  private groundColor(color: string): number {
    const style = mapStyle()
    return mix(colorOf(color), colorOf(style.paper), style.ground.wash)
  }

  /**
   * A terrain as its cells are filled: its ground colour, and on floor (not water) given way
   * to the style's floor colour (`floors.wash`): a dungeon's white flagstones.
   */
  private terrainFill(terrain: { color: string; floor?: boolean; water?: boolean }): number {
    const ground = this.groundColor(terrain.color)
    const { floors } = mapStyle()
    if (!terrain.floor || terrain.water || floors.wash <= 0) return ground
    return mix(ground, colorOf(floors.color), floors.wash)
  }

  /**
   * Where water meets land, on the water's side: the coast's ink line (in ink), lines along
   * the shore, fainter further out, and a shallow band (painted), as the style says.
   */
  private drawShores(): void {
    const g = this.shoreLines.clear()
    const shallows = this.shallows.clear()
    const style = mapStyle()
    const { lines, band, color } = style.shores
    if (!lines && !band) return
    const { grid, hexes, terrains } = editor.map
    const water = new Set(terrains.filter((t) => t.water).map((t) => t.id))
    const r = grid.hexSize
    const ink = colorOf(color)
    for (const [key, hex] of Object.entries(hexes)) {
      if (!hex.terrain || !water.has(hex.terrain)) continue
      const cell = parseKey(key as HexKey)
      if (!inBounds(cell, grid)) continue
      const c = this.centerOf(cell)
      const own = terrains.find((t) => t.id === hex.terrain)
      for (const { a, b, across } of cellSides(cell, grid, r)) {
        const other = inBounds(across, grid) ? hexes[keyOf(across)]?.terrain : undefined
        if (!other || water.has(other)) continue
        const mx = (a.x + b.x) / 2
        const my = (a.y + b.y) / 2
        const len = Math.hypot(c.x - mx, c.y - my) || 1
        const nx = (c.x - mx) / len
        const ny = (c.y - my) / len
        const at = (d: number, cut: number) => [
          a.x + nx * d + (b.x - a.x) * cut,
          a.y + ny * d + (b.y - a.y) * cut,
          b.x + nx * d - (b.x - a.x) * cut,
          b.y + ny * d - (b.y - a.y) * cut,
        ]
        // Each line follows the ground's ragged border (the same noise).
        const { amplitude, scale } = this.raggedness()
        const stroke = (x1: number, y1: number, x2: number, y2: number, on = g) => {
          const pts = raggedPolygon([x1, y1, x2, y2], 5, this.ragged() ? amplitude : 0, scale)
          // A polygon of two points is its side there and back: keep the way there.
          const way = this.ragged()
            ? pts.slice(0, 12).concat(displace(x2, y2, amplitude, scale))
            : pts
          on.moveTo(way[0], way[1])
          for (let i = 2; i < way.length; i += 2) on.lineTo(way[i], way[i + 1])
        }
        if (band > 0 && own) {
          const [x1, y1, x2, y2] = at(r * band * 0.12, 0)
          stroke(x1, y1, x2, y2, shallows)
          shallows.stroke({
            width: r * band * 0.24,
            color: shade(this.groundColor(own.color), 0.35),
            alpha: 0.7,
            cap: 'butt',
          })
        }
        if (style.art.mode === 'ink' && lines > 0) {
          stroke(a.x, a.y, b.x, b.y)
          g.stroke({ width: r * 0.035, color: ink, alpha: 0.9, cap: 'round' })
        }
        for (let k = 1; k <= lines; k++) {
          const [x1, y1, x2, y2] = at(r * 0.11 * k, 0.06 * k)
          stroke(x1, y1, x2, y2)
          g.stroke({ width: r * 0.018, color: ink, alpha: 0.6 - k * 0.1, cap: 'round' })
        }
      }
    }
  }

  /** Whether the style's terrains' borders wander off the cells' edges. */
  private ragged(): boolean {
    return mapStyle().ground.ragged > 0
  }

  /** How far the ground's borders wander (world units), and the noise's size. */
  private raggedness(): { amplitude: number; scale: number } {
    const hs = editor.map.grid.hexSize
    return { amplitude: mapStyle().ground.ragged * hs * 0.45, scale: hs * 1.4 }
  }

  /** A cell drawn with its border wandering (the style's `ground.ragged`), in its ground colour. */
  private raggedCell(g: Graphics, cell: Offset): Graphics {
    const { amplitude, scale } = this.raggedness()
    const id = editor.map.hexes[keyOf(cell)]?.terrain
    const terrain = editor.map.terrains.find((t) => t.id === id)
    g.clear()
      .poly(raggedPolygon(this.cornersAt(cell), RAGGED_STEPS, amplitude, scale))
      .fill(
        this.paper && !terrain
          ? PAPER_FILL
          : terrain
            ? this.terrainFill(terrain)
            : this.emptyFill(),
      )
    return g
  }

  /**
   * The ground's look besides ragged borders: borders blending into each other (a blur,
   * sized to the zoom), a sheet of paper under it, and the paper's grain over it.
   */
  private applyGround(): void {
    const { ground } = mapStyle()
    this.groundBlur = ground.blend > 0 ? new BlurFilter({ strength: 0, quality: 3 }) : null
    this.terrainLayer.filters = this.groundBlur ? [this.groundBlur] : null
    this.sizeGroundFilters()

    const sheet = this.sheet.clear()
    if (ground.ragged > 0 || ground.blend > 0) {
      const b = this.gridLines.getLocalBounds()
      const pad = editor.map.grid.hexSize * 0.8
      sheet
        .rect(b.minX - pad, b.minY - pad, b.width + pad * 2, b.height + pad * 2)
        .fill(this.emptyFill())
    }

    for (const child of this.grainLayer.removeChildren()) child.destroy()
    if (ground.grain > 0) {
      const b = this.gridLines.getLocalBounds()
      const pad = editor.map.grid.hexSize * 0.8
      const texture = Texture.from(noiseCanvas('grain'))
      texture.source.addressMode = 'repeat'
      const grain = new TilingSprite({
        texture,
        width: b.width + pad * 2,
        height: b.height + pad * 2,
      })
      grain.position.set(b.minX - pad, b.minY - pad)
      grain.tileScale.set(editor.map.grid.hexSize / 128)
      grain.alpha = ground.grain
      grain.blendMode = 'multiply'
      this.grainLayer.addChild(grain)
    }
  }

  /** The blur works in screen pixels: sized to the zoom so a cell looks the same. */
  private sizeGroundFilters(): void {
    if (!this.groundBlur) return
    const px = editor.map.grid.hexSize * this.world.scale.x
    this.groundBlur.strength = mapStyle().ground.blend * px * 0.15
  }

  private drawArt(): void {
    for (const child of this.artLayer.removeChildren()) child.destroy()
    this.artCells.clear()
    for (const key of Object.keys(editor.map.hexes) as HexKey[]) this.updateArt(key)
  }

  /**
   * The style's art on one cell: its terrain's painter (mountains, trees…), drawn in the
   * order of the cells' heights so lower cells overlap higher ones. Cells with an icon show
   * the icon instead, as glyphs do.
   */
  private updateArt(key: HexKey): void {
    const old = this.artCells.get(key)
    if (old) {
      this.artCells.delete(key)
      old.destroy()
    }
    const style = mapStyle()
    const { grid, hexes, terrains } = editor.map
    const hex = hexes[key]
    const art = hex?.terrain ? style.art.terrains[hex.terrain] : undefined
    if (!art || hex?.icon) return
    const cell = parseKey(key)
    const terrain = terrains.find((t) => t.id === hex?.terrain)
    if (!terrain || !inBounds(cell, grid)) return
    const center = this.centerOf(cell)
    const g = new Graphics()
    const shapes = paint(art.painter, {
      x: center.x,
      y: center.y,
      r: grid.hexSize,
      seed: seedOf(key),
      mode: style.art.mode,
      ink: colorOf(style.art.ink),
      base: art.color ? colorOf(art.color) : this.terrainFill(terrain),
      density: art.density,
      size: art.size,
    })
    for (const shape of shapes) {
      if (shape.closed) g.poly(shape.points)
      else {
        g.moveTo(shape.points[0], shape.points[1])
        for (let i = 2; i < shape.points.length; i += 2)
          g.lineTo(shape.points[i], shape.points[i + 1])
      }
      if (shape.fill !== undefined) g.fill({ color: shape.fill, alpha: shape.fillAlpha ?? 1 })
      if (shape.stroke !== undefined)
        g.stroke({
          width: shape.width ?? 1,
          color: shape.stroke,
          alpha: shape.strokeAlpha ?? 1,
          cap: 'round',
          join: 'round',
        })
    }
    g.zIndex = center.y
    this.artLayer.addChild(g)
    this.artCells.set(key, g)
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
    const { grid } = editor.map
    return cellCenter(cell, grid, grid.hexSize)
  }

  private cornersAt(cell: Offset): number[] {
    const { x, y } = this.centerOf(cell)
    return this.corners.map((v, i) => v + (i % 2 === 0 ? x : y))
  }

  /** Layer visibility; coordinates also hide when hexes are too small to read them. */
  private applyLayers(): void {
    const { layers, grid } = editor.map
    this.terrainLayer.visible = layers.terrain.visible
    this.grainLayer.visible = layers.terrain.visible
    this.shoreLines.visible = layers.terrain.visible
    this.sheet.visible = layers.terrain.visible
    this.artLayer.visible = layers.terrain.visible
    this.glyphLayer.visible = layers.terrain.visible
    this.regionLayer.visible = layers.regions.visible
    this.regionNameLayer.visible = layers.regions.visible
    this.factionShapes.visible = layers.factions?.visible ?? true
    this.drawSelection()
    this.gridLines.visible = layers.grid.visible
    this.wallLines.visible = layers.walls?.visible ?? true
    this.pathsLayer.visible = layers.paths.visible
    this.connectionLayer.visible = layers.connections?.visible ?? true
    this.wayLayer.visible = this.connectionLayer.visible
    this.iconLayer.visible = layers.icons.visible
    this.labelLayer.visible = layers.labels.visible
    this.nameLayer.visible = editor.map.captions.hexNames.show
    this.partyLayer.visible = layers.party.visible
    this.relationLines.visible = layers.relations?.visible ?? false
    this.tokenLayer.visible = layers.tokens.visible
    this.markers.visible = layers.markers.visible
    this.coordLayer.visible =
      layers.coords.visible &&
      grid.showCoords &&
      grid.hexSize * this.world.scale.x >= COORD_MIN_SCREEN_SIZE
  }

  private onViewChanged(): void {
    this.sizeGroundFilters()
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
    const { grid } = editor.map
    return cellAt(world, grid, grid.hexSize)
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
    editor.hoveredHex = cell && inBounds(cell, editor.map.grid) ? keyOf(cell) : null
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
      this.activeTool = currentTool()
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
      else currentTool().hover?.(cell, this.pointerInfo(e))
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

/** The middle of some points. */
function middleOf(points: { x: number; y: number }[]): { x: number; y: number } {
  const n = points.length || 1
  return {
    x: points.reduce((a, p) => a + p.x, 0) / n,
    y: points.reduce((a, p) => a + p.y, 0) / n,
  }
}

/**
 * The hexes each relation of the party's characters points at on this map, one list per
 * target: `hex:<key>` its hex, `poi:<id>` the hex the place is in, `region:<name>` the
 * region's hexes. Others (another character, a note) aren't on the map.
 */
function relationTargets(play: NonNullable<typeof editor.map.play>): HexKey[][] {
  const session = play.rules?.session as { members?: CharacterState[] } | null | undefined
  const members = session?.members ?? play.rules?.members ?? []
  const refs = [...new Set(members.flatMap((m) => m.relations.map((r) => r.to)))]
  const { hexes, regions } = editor.map
  return refs.flatMap((ref): HexKey[][] => {
    const [kind, ...rest] = ref.split(':')
    const id = rest.join(':')
    if (kind === 'hex')
      return hexes[id as HexKey] !== undefined || /^\d+,\d+$/.test(id) ? [[id as HexKey]] : []
    if (kind === 'poi') {
      const at = (Object.keys(hexes) as HexKey[]).find((k) =>
        hexes[k]?.pois?.some((p) => p.id === id),
      )
      return at ? [[at]] : []
    }
    if (kind === 'region') {
      const region = regions.find((r) => r.name === id)
      const keys = region ? regionCells(editor.map, region.id) : []
      return keys.length ? [keys] : []
    }
    return []
  })
}
