import {
  Application,
  BitmapFont,
  BitmapText,
  Container,
  Graphics,
  GraphicsContext,
  Rectangle,
  Sprite,
  Text,
} from 'pixi.js'
import type { MapChange } from '../commands/command'
import { hasMetadata, nodeFlags } from '../model/hex'
import type { MapPath, PathKind } from '../model/types'
import { iconImage } from '../icons/registry'
import { catmullRom, dashes } from './curves'
import { pathRuns, type PathVertex } from './pathGeometry'
import { IconTextures } from './IconTextures'
import { setLabelHitTest } from './hitTest'
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
const PATH_STYLES: Record<PathKind, { color: number; width: number; dash?: [number, number] }> = {
  river: { color: 0x3f78a8, width: 0.2 },
  road: { color: 0x6e4f2c, width: 0.13 },
  trail: { color: 0x6e4f2c, width: 0.09, dash: [0.25, 0.18] },
}
/** Rivers under roads under trails. */
const PATH_ORDER: PathKind[] = ['river', 'road', 'trail']
const DRAFT_COLOR = 0xffffff
const HANDLE_COLOR = 0xffffff
const HANDLE_OUTLINE = 0x1b1a17
/** Screen pixels within which a click grabs a path handle. */
const PICK_RADIUS_PX = 12
/**
 * Our own crosshair with the hotspot exactly at its center: some system cursor themes
 * place the crosshair hotspot off-center, which makes picking small handles feel off.
 */
const CROSSHAIR = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g stroke-linecap="square"><path d="M12 2v7M12 15v7M2 12h7M15 12h7" stroke="#000" stroke-width="3"/><path d="M12 2v7M12 15v7M2 12h7M15 12h7" stroke="#fff" stroke-width="1"/></g><circle cx="12" cy="12" r="1" fill="#fff" stroke="#000" stroke-width="0.5"/></svg>',
)}") 12 12, crosshair`
/** Bundled icons are tinted: dark ink on painted hexes, light on empty ones. */
const ICON_INK = 0x1b1a17
const ICON_INK_EMPTY = 0xe8e2d4
const ICON_HALO = 0xf4eedd
/** Icon size as a fraction of the hex size, nudged down to leave room for the coordinate. */
const ICON_SIZE = 1.25
const ICON_OFFSET_Y = 0.1
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
  private iconTextures = new IconTextures(() => this.drawIcons())
  private labelLayer = new Container()
  private labelTexts = new Map<string, Text>()
  private markers = new Graphics()
  private overlay = new Graphics()

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
      this.gridLines,
      this.pathsLayer,
      this.iconLayer,
      this.coordLayer,
      this.labelLayer,
      this.markers,
      this.overlay,
    )
    app.stage.addChild(this.world)
    this.disposers.push(editor.onChange((change) => this.handleChange(change)))
    this.bindInput()
    setLabelHitTest((world) => this.labelAt(world))
    this.rebuild()
    this.fit()
    // Web fonts may arrive after the first draw; redraw labels with them.
    loadLabelFonts().then(() => this.drawLabels())
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
      this.drawMarkers()
      this.drawIcons()
      if (editor.map.paths.length > 0) this.drawPaths()
    } else if (change.kind === 'paths') {
      this.drawPaths()
    } else if (change.kind === 'assets') {
      this.drawIcons()
    } else if (change.kind === 'labels') {
      this.drawLabels()
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
    this.drawPaths()
    this.drawIcons()
    this.drawLabels()
    this.onViewChanged()
  }

  private drawPaths(): void {
    const g = this.pathsLayer.clear()
    const { hexSize } = editor.map.grid
    for (const kind of PATH_ORDER) {
      const style = PATH_STYLES[kind]
      for (const path of editor.map.paths) {
        if (path.kind !== kind) continue
        for (const run of pathRuns(this.pathVertices(path))) {
          const line = path.straight ? run : catmullRom(run)
          const pieces = style.dash
            ? dashes(line, style.dash[0] * hexSize, style.dash[1] * hexSize)
            : [line]
          for (const piece of pieces) this.strokePolyline(g, piece)
        }
        g.stroke({ width: style.width * hexSize, color: style.color, cap: 'round', join: 'round' })
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
            stroke: { color: 0xf4eedd, width: fontSize * 0.18, join: 'round' as const },
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

  /** Re-rasterize text for the current zoom so labels stay sharp. */
  private updateLabelResolution(): void {
    const resolution = Math.min(
      4,
      Math.max(1, Math.ceil(this.world.scale.x * devicePixelRatio * 2) / 2),
    )
    for (const text of this.labelTexts.values())
      if (text.resolution !== resolution) text.resolution = resolution
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

  private pathVertices(path: MapPath): PathVertex[] {
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
        water: !!terrain && water.has(terrain),
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
      const { x, y } = this.centerOf(cell)
      const cy = y + grid.hexSize * ICON_OFFSET_Y
      if (icon.halo) halos.circle(x, cy, size * 0.48).fill({ color: ICON_HALO, alpha: 0.75 })
      const sprite = new Sprite(texture)
      sprite.anchor.set(0.5)
      sprite.setSize(size, size)
      if (icon.flip) sprite.scale.x *= -1
      sprite.angle = icon.rotation ?? 0
      sprite.position.set(x, cy)
      if (image.tintable)
        sprite.tint = icon.color ?? (hex.terrain || icon.halo ? ICON_INK : ICON_INK_EMPTY)
      this.iconLayer.addChild(sprite)
    }
  }

  private strokePolyline(g: Graphics, points: Point[]): void {
    if (points.length < 2) return
    g.moveTo(points[0].x, points[0].y)
    for (const p of points.slice(1)) g.lineTo(p.x, p.y)
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
    this.gridLines.visible = layers.grid.visible
    this.pathsLayer.visible = layers.paths.visible
    this.iconLayer.visible = layers.icons.visible
    this.labelLayer.visible = layers.labels.visible
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
    const onHandle = editor.tool === 'path' && editor.hoveredHandle
    this.canvas.style.cursor =
      this.panFrom || (onHandle && this.activeTool)
        ? 'grabbing'
        : this.spaceHeld || onHandle
          ? 'grab'
          : CROSSHAIR
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
      const cell = this.cellAt(e)
      this.setHovered(cell)
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
    on(canvas, 'pointerleave', () => this.setHovered(null))
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

function clampZoom(scale: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale))
}

export function isTyping(e: KeyboardEvent): boolean {
  const target = e.target as HTMLElement | null
  return !!target?.closest('input, textarea, select, [contenteditable="true"]')
}
