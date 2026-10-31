import { HexEditBatch } from '../commands/hexes'
import { ReplaceLabelCommand, ReplacePathCommand, rerouteVertex } from '../commands/paths'
import { hitTestLabel, hitTestToken } from '../render/hitTest'
import { AddTokenCommand, RemoveTokenCommand, ReplaceTokenCommand } from '../commands/tokens'
import { AddConnectionCommand, RemoveConnectionCommand } from '../commands/connections'
import { ReplaceWallsCommand } from '../commands/walls'
import {
  type HexData,
  type HexIcon,
  type LayerId,
  type MapConnection,
  type MapPath,
  type MapToken,
  newId,
  nextTokenName,
  nodeFlags,
  normalizePath,
} from '@open-tabletop/map'
import { clickHex, partyMoved } from '../play/play'
import { paintTerritory } from '../play/factions'
import { copyOf, dragCopy, drawnTokens, isCopy, moveCopy, tokenFromBestiary } from '../play/present'
import { showPresent } from '@open-tabletop/travel-ui'
import { placeInHex } from '../render/pathGeometry'
import {
  cellAt,
  cellCenter as centerOn,
  type Point,
  inBounds,
  parseKey,
  cellLine,
  cellSides,
  cellsInRadius,
  cellsInRect,
  floodFill,
  type HexKey,
  keyOf,
  type Offset,
} from '@open-tabletop/hex'
import { t, type MessageKey } from '../i18n/index.svelte'
import { editor, type ToolId } from '../store/editor.svelte'
import { showToast } from '@open-tabletop/ui-kit'

/** Tells the user why nothing happened when a tool targets a locked layer. */
function blockedByLock(layer: LayerId): boolean {
  if (!editor.isLocked(layer)) return false
  showToast(t('layers.lockedToast', { layer: t(`layers.names.${layer}` as MessageKey) }))
  return true
}

export interface PointerInfo {
  /** 0 = primary, 2 = secondary (right click). */
  button: number
  alt: boolean
  /** Ctrl (or Cmd). Preferred over Alt, which Firefox and many Linux WMs intercept. */
  ctrl: boolean
  shift: boolean
  /** Pointer position in world units. */
  world: Point
  /** World-space distance that counts as "on" a handle (a few screen pixels). */
  pickRadius: number
}

/** A map editing tool driven by pointer events on hex cells. */
export interface Tool {
  down(cell: Offset, info: PointerInfo): void
  move(cell: Offset, info: PointerInfo): void
  up(): void
  /** Pointer moving with no button pressed (hover feedback). */
  hover?(cell: Offset, info: PointerInfo): void
}

/**
 * Paints hexes with the brush (drag), or a rectangle of them (Shift+drag, from where the
 * press was to where it's let go), as one step of the history.
 */
abstract class PaintTool implements Tool {
  private batch: HexEditBatch | null = null
  private last: Offset | null = null
  /** The corner a rectangle reaches (where the pointer is). */
  private to: Offset | null = null
  protected erasing = false

  /** The hex painted (or, `erasing`, cleared). */
  protected abstract paintHex(hex: HexData): HexData

  abstract down(cell: Offset, info: PointerInfo): void

  protected start(cell: Offset, info: PointerInfo, erasing: boolean): void {
    this.erasing = erasing
    this.batch = new HexEditBatch(editor.map)
    if (info.shift) {
      editor.paintFrom = this.to = cell
      return
    }
    this.last = cell
    this.paint([cell], editor.brushRadius)
  }

  move(cell: Offset): void {
    if (editor.paintFrom) this.to = cell
    if (!this.batch || !this.last) return
    if (cell.col === this.last.col && cell.row === this.last.row) return
    this.paint(cellLine(this.last, cell, editor.map.grid).slice(1), editor.brushRadius)
    this.last = cell
  }

  up(): void {
    const from = editor.paintFrom
    if (from && this.batch && this.to) this.paint(cellsInRect(from, this.to, editor.map.grid), 0)
    editor.paintFrom = null
    const command = this.batch?.finish()
    if (command) editor.record(command)
    this.batch = null
    this.last = null
  }

  private paint(centers: Offset[], radius: number): void {
    const batch = this.batch!
    const changed: HexKey[] = []
    for (const center of centers)
      for (const cell of cellsInRadius(center, radius, editor.map.grid)) {
        const key = keyOf(cell)
        if (batch.edit(key, (hex) => this.paintHex(hex))) changed.push(key)
      }
    if (changed.length > 0) editor.notify({ kind: 'hexes', keys: changed })
  }
}

/**
 * Regions: paint hexes into the active region with the brush (left), take them out
 * (right click), Ctrl+click picks the region under the cursor.
 */
class RegionTool extends PaintTool {
  down(cell: Offset, info: PointerInfo): void {
    if (info.alt || info.ctrl) {
      const region = editor.map.hexes[keyOf(cell)]?.region
      if (region) editor.regionId = region
      return
    }
    if (blockedByLock('regions')) return
    const erasing = info.button === 2
    if (!erasing && !editor.regionId) {
      showToast(t('regions.pickFirst'))
      return
    }
    this.start(cell, info, erasing)
  }

  protected paintHex(hex: HexData): HexData {
    return { ...hex, region: this.erasing ? undefined : (editor.regionId ?? undefined) }
  }
}

/**
 * Tokens: click a token to select it, drag it to another hex (it snaps to the center),
 * right-click removes it. With `place`, a click on an empty hex puts the selected
 * off-map token there, or a new token from the template.
 */
class TokenTool implements Tool {
  private pressed: { id: string; at: Point; threshold: number } | null = null
  private drag: { before: MapToken; id: string } | null = null

  /**
   * @param place a click on an empty hex places a token (token tool)
   * @param wholeHex a press anywhere on a hex grabs its token (token tool, play)
   */
  constructor(
    private place: boolean,
    private wholeHex = place,
  ) {}

  /** Handles the press if it hits a token (or places one); false lets others handle it. */
  down(cell: Offset, info: PointerInfo): boolean {
    // Shift+click with the token tool always adds a token, even over another one.
    const adding = this.place && info.shift && info.button === 0
    // On the token or, with the token tool and play, anywhere on its hex.
    const id = adding
      ? null
      : (hitTestToken(info.world) ??
        (!this.wholeHex || info.shift || !inBounds(cell, editor.map.grid)
          ? null
          : nearestTokenIn(cell, info.world)))
    if (info.button === 2) {
      if (!id || blockedByLock('tokens')) return !!id
      const token = editor.getToken(id)!
      editor.execute(new RemoveTokenCommand(structuredClone(token)))
      if (token.kind === 'party') partyMoved(undefined)
      return true
    }
    if (info.button !== 0) return false
    if (id) {
      editor.selectedToken = id
      this.pressed = { id, at: info.world, threshold: info.pickRadius / 3 }
      return true
    }
    if (!this.place || !inBounds(cell, editor.map.grid) || blockedByLock('tokens')) return false
    const hex = keyOf(cell)
    const selected = editor.selectedToken ? editor.getToken(editor.selectedToken) : undefined
    if (selected && !selected.hex) {
      editor.updateToken(selected.id, (t) => ({ ...t, hex }))
      if (selected.kind === 'party') partyMoved(hex)
      return true
    }
    const { kind, iconId, color, from } = editor.tokenTemplate
    const token: MapToken = (from && tokenFromBestiary(from.id, hex, from.name)) || {
      id: newId(),
      name: nextTokenName(editor.map.tokens, kind, t(`tokens.kinds.${kind}` as MessageKey)),
      kind,
      hex,
      iconId,
      ...(color && { color }),
    }
    editor.execute(new AddTokenCommand(token))
    editor.selectedToken = token.id
    return true
  }

  move(cell: Offset, info: PointerInfo): void {
    const pressed = this.pressed
    if (!pressed) return
    if (!this.drag) {
      if (Math.hypot(info.world.x - pressed.at.x, info.world.y - pressed.at.y) < pressed.threshold)
        return
      const token = editor.getToken(pressed.id)
      if (!token || blockedByLock('tokens')) return
      this.drag = { before: structuredClone(token), id: token.id }
    }
    if (!inBounds(cell, editor.map.grid)) return
    const hex = keyOf(cell)
    const token = editor.getToken(this.drag.id)
    if (!token || token.hex === hex) return
    editor.map.tokens = editor.map.tokens.map((t) => (t.id === token.id ? { ...t, hex } : t))
    editor.notify({ kind: 'tokens' })
  }

  /** Ends a press; returns the token pressed without dragging it (a click on it), if any. */
  up(): string | null {
    const pressed = this.pressed
    const drag = this.drag
    this.pressed = null
    this.drag = null
    if (!drag) return pressed?.id ?? null
    const after = editor.getToken(drag.id)
    if (!after || after.hex === drag.before.hex) return null
    editor.record(new ReplaceTokenCommand(drag.before, structuredClone(after)))
    if (after.kind === 'party') partyMoved(after.hex as HexKey)
    return null
  }
}

/** The token of a hex closest to a point (several tokens share a hex). */
function nearestTokenIn(cell: Offset, world: Point): string | null {
  const hex = keyOf(cell)
  const center = cellCenter(cell)
  const hs = editor.map.grid.hexSize
  let best: { id: string; d: number } | null = null
  for (const p of drawnTokens()) {
    if (p.hex !== hex || p.more || isCopy(p.token)) continue
    const d = Math.hypot(world.x - (center.x + p.dx * hs), world.y - (center.y + p.dy * hs))
    if (!best || d < best.d) best = { id: p.token.id, d }
  }
  return best?.id ?? null
}

const tokenTool = new TokenTool(true)
const tokenDragger = new TokenTool(false)
const playDragger = new TokenTool(false, true)

/** Select: picks a hex; tokens can be selected and dragged here too. */
const selectTool: Tool = {
  down(cell, info) {
    if (tokenDragger.down(cell, info)) return
    editor.selected = keyOf(cell)
  },
  move(cell, info) {
    tokenDragger.move(cell, info)
  },
  up() {
    tokenDragger.up()
  },
}

class TerrainTool extends PaintTool {
  down(cell: Offset, info: PointerInfo): void {
    if (info.alt || info.ctrl) return this.pick(cell)
    if (blockedByLock('terrain')) return
    const erase = editor.terrainMode === 'erase' || info.button === 2
    if (editor.terrainMode === 'fill') return this.fill(cell, erase)
    this.start(cell, info, erase)
  }

  protected paintHex(hex: HexData): HexData {
    return { ...hex, terrain: this.erasing ? undefined : editor.terrainId }
  }

  private fill(start: Offset, erase: boolean): void {
    const { hexes, grid } = editor.map
    const target = hexes[keyOf(start)]?.terrain
    const terrain = erase ? undefined : editor.terrainId
    if (target === terrain) return
    const batch = new HexEditBatch(editor.map)
    const region = floodFill(start, grid, (c) => hexes[keyOf(c)]?.terrain === target)
    const keys = region.map(keyOf)
    for (const key of keys) batch.edit(key, (hex) => ({ ...hex, terrain }))
    const command = batch.finish()
    if (!command) return
    editor.notify({ kind: 'hexes', keys })
    editor.record(command)
  }

  /** Eyedropper: Ctrl+click (or Alt+click) takes the terrain under the cursor. */
  private pick(cell: Offset): void {
    const terrain = editor.map.hexes[keyOf(cell)]?.terrain
    if (terrain) editor.terrainId = terrain
  }
}

/**
 * Draws and edits roads, trails and rivers.
 * - Click or drag across hexes to add them; gaps are filled with a straight hex line.
 *   Shift+click places the point where you click (snapped; Ctrl for free placement).
 * - Finish by clicking the last hex again, right-clicking or pressing Enter.
 * - With no path in progress, drag a vertex handle to move it inside its hex;
 *   right-click a handle to re-center it.
 */
class PathTool implements Tool {
  private pressed = false
  /** `grab` = vertex position minus pointer at press time, so the vertex doesn't jump. */
  private drag: { before: MapPath; index: number; grab: Point } | null = null
  /** Node pressed but not yet moved: a click continues/branches, a drag moves it. */
  private pressedNode: { path: MapPath; index: number; at: Point; threshold: number } | null = null

  hover(_cell: Offset, info: PointerInfo): void {
    const hit = editor.pathDraft ? null : findPathVertex(info.world, info.pickRadius)
    const current = editor.hoveredHandle
    if (hit?.path.id === current?.pathId && hit?.index === current?.index) return
    editor.hoveredHandle = hit ? { pathId: hit.path.id, index: hit.index } : null
  }

  down(cell: Offset, info: PointerInfo): void {
    if (blockedByLock('paths')) return
    const draft = editor.pathDraft
    if (!draft) {
      const hit = findPathVertex(info.world, info.pickRadius)
      if (hit) {
        if (info.button === 2) recenterVertex(hit.path, hit.index)
        else
          this.pressedNode = {
            path: hit.path,
            index: hit.index,
            at: info.world,
            threshold: info.pickRadius / 3,
          }
        return
      }
      if (info.button === 2) return
    } else {
      if (info.button === 2) return finishPath()
      if (draft.hexes.at(-1) === keyOf(cell) && !info.shift) return finishPath()
    }
    this.pressed = true
    this.extend(cell, info)
  }

  move(cell: Offset, info: PointerInfo): void {
    const pressed = this.pressedNode
    if (pressed) {
      const moved = Math.hypot(info.world.x - pressed.at.x, info.world.y - pressed.at.y)
      if (moved < pressed.threshold) return
      const point = pathVertexPoint(pressed.path, pressed.index)
      this.drag = {
        before: structuredClone(pressed.path),
        index: pressed.index,
        grab: { x: point.x - pressed.at.x, y: point.y - pressed.at.y },
      }
      this.pressedNode = null
    }
    if (this.drag) return this.moveVertex(info)
    // Dragging while drawing is freehand: every hex crossed becomes a vertex.
    if (this.pressed) this.extend(cell, { ...info, shift: false }, true)
  }

  up(): void {
    this.pressed = false
    if (this.pressedNode) {
      const { path, index } = this.pressedNode
      this.pressedNode = null
      return continueFrom(path, index)
    }
    const drag = this.drag
    this.drag = null
    if (!drag) return
    const current = editor.map.paths.find((p) => p.id === drag.before.id)
    if (!current) return
    const after = normalizePath(current)
    // Put the original back and apply the edit as one undoable command.
    Object.assign(current, structuredClone(drag.before))
    if (!drag.before.offsets) delete current.offsets
    if (JSON.stringify(normalizePath(drag.before)) !== JSON.stringify(after))
      editor.execute(new ReplacePathCommand(drag.before, after))
    else editor.notify({ kind: 'paths' })
  }

  private extend(cell: Offset, info: PointerInfo, freehand = false): void {
    const { grid } = editor.map
    const key = keyOf(cell)
    const offset = info.shift ? offsetInHex(cell, info) : null
    const draft = editor.pathDraft
    if (!draft) {
      editor.pathDraft = { hexes: [key], offsets: [offset], nodes: [true] }
      return
    }
    if (draft.hexes.at(-1) === key) {
      if (info.shift)
        editor.pathDraft = { ...draft, offsets: [...draft.offsets.slice(0, -1), offset] }
      return
    }
    const last = parseKey(draft.hexes.at(-1)!)
    const added = cellLine(last, cell, grid)
      .slice(1)
      .filter((c) => inBounds(c, grid))
      .map(keyOf)
    if (added.length === 0) return
    editor.pathDraft = {
      ...draft,
      hexes: [...draft.hexes, ...added],
      offsets: [...draft.offsets, ...added.map((k) => (k === key ? offset : null))],
      nodes: [...draft.nodes, ...added.map((k) => freehand || k === key)],
    }
  }

  /**
   * Drags a vertex. Inside its own hex only the offset changes; over another hex the
   * vertex moves there and the path is re-routed through the hexes in between. Always
   * computed from the path as it was when the drag started, so it's reversible live.
   */
  private moveVertex(info: PointerInfo): void {
    const drag = this.drag!
    const path = editor.map.paths.find((p) => p.id === drag.before.id)
    if (!path) return
    const { grid } = editor.map
    const world = { x: info.world.x + drag.grab.x, y: info.world.y + drag.grab.y }
    const target = cellAt(world, grid, grid.hexSize)
    const original = parseKey(drag.before.hexes[drag.index])
    let { hexes } = drag.before
    let offsets = drag.before.hexes.map((_, i) => drag.before.offsets?.[i] ?? null)
    let nodes = drag.before.nodes
    let index = drag.index
    if (inBounds(target, grid) && keyOf(target) !== keyOf(original)) {
      ;({ hexes, offsets, nodes, index } = rerouteVertex(drag.before, drag.index, target, grid))
    }
    offsets[index] = offsetInHex(parseKey(hexes[index]), { ...info, world })
    path.hexes = hexes
    path.offsets = offsets
    if (nodes) path.nodes = nodes
    else delete path.nodes
    editor.hoveredHandle = { pathId: path.id, index }
    editor.notify({ kind: 'paths' })
  }
}

/**
 * Starts drawing from an existing node: from an endpoint the path itself is extended;
 * from a middle node a new branch of the same kind starts there.
 */
function continueFrom(path: MapPath, index: number): void {
  const last = path.hexes.length - 1
  const atStart = index === 0
  const isEndpoint = atStart || index === last
  editor.pathKind = path.kind
  editor.pathStraight = !!path.straight
  editor.pathClosed = !!path.closed
  editor.hoveredHandle = null
  editor.pathDraft = {
    hexes: [path.hexes[index]],
    offsets: [path.offsets?.[index] ?? null],
    nodes: [true],
    ...(isEndpoint && { extend: { pathId: path.id, atStart } }),
  }
}

/** World position of a path vertex (hex center plus its offset). */
export function pathVertexPoint(path: MapPath, index: number): Point {
  const { hexSize } = editor.map.grid
  const center = cellCenter(parseKey(path.hexes[index]))
  const offset = path.offsets?.[index]
  return offset ? { x: center.x + offset[0] * hexSize, y: center.y + offset[1] * hexSize } : center
}

/** Offset (hex-size units) of the pointer inside `cell`, snapped unless Ctrl is held. */
function offsetInHex(cell: Offset, info: PointerInfo): [number, number] | null {
  const { grid } = editor.map
  const { hexSize } = grid
  const center = cellCenter(cell)
  const local = { x: info.world.x - center.x, y: info.world.y - center.y }
  const placed = placeInHex(local, grid, hexSize, !info.ctrl)
  if (placed.x === 0 && placed.y === 0) return null
  return [placed.x / hexSize, placed.y / hexSize]
}

/** Nearest path vertex within `radius` of `world`. */
function findPathVertex(world: Point, radius: number): { path: MapPath; index: number } | null {
  const { grid, paths } = editor.map
  let best: { path: MapPath; index: number } | null = null
  let bestDistance = radius
  for (const path of paths) {
    const nodes = nodeFlags(path)
    for (let i = 0; i < path.hexes.length; i++) {
      if (!nodes[i] || !inBounds(parseKey(path.hexes[i]), grid)) continue
      const point = pathVertexPoint(path, i)
      const d = Math.hypot(point.x - world.x, point.y - world.y)
      if (d <= bestDistance) {
        best = { path, index: i }
        bestDistance = d
      }
    }
  }
  return best
}

function recenterVertex(path: MapPath, index: number): void {
  if (!path.offsets?.[index]) return
  const offsets = path.offsets.map((o, i) => (i === index ? null : o))
  editor.execute(new ReplacePathCommand(path, normalizePath({ ...path, offsets })))
}

/** Commits the path being drawn (if it spans at least two hexes). */
export function finishPath(): void {
  const draft = editor.pathDraft
  editor.pathDraft = null
  if (!draft) return
  const hexes: HexKey[] = []
  const offsets: ([number, number] | null)[] = []
  const flags: boolean[] = []
  draft.hexes.forEach((key, i) => {
    if (hexes.at(-1) === key) {
      offsets[offsets.length - 1] = draft.offsets[i] ?? offsets.at(-1)!
      flags[flags.length - 1] ||= draft.nodes[i]
    } else {
      hexes.push(key)
      offsets.push(draft.offsets[i])
      flags.push(draft.nodes[i])
    }
  })
  if (hexes.length < 2) return
  const target = draft.extend && editor.map.paths.find((p) => p.id === draft.extend!.pathId)
  if (target && draft.extend) {
    // Append the new hexes after the endpoint (or before it, reversed, at the start).
    const add = <T>(existing: T[], drawn: T[]) =>
      draft.extend!.atStart
        ? [...drawn.slice(1).reverse(), ...existing]
        : [...existing, ...drawn.slice(1)]
    const existingFlags = nodeFlags(target)
    const existingOffsets = target.hexes.map((_, i) => target.offsets?.[i] ?? null)
    const merged = add(existingFlags, flags)
    const extended = normalizePath({
      ...target,
      hexes: add(target.hexes, hexes),
      offsets: add(existingOffsets, offsets),
      nodes: merged.flatMap((f, i) => (f ? [i] : [])),
    })
    editor.execute(new ReplacePathCommand(target, extended))
    return
  }
  const path = normalizePath({
    id: newId(),
    kind: editor.pathKind,
    hexes,
    offsets,
    nodes: flags.flatMap((f, i) => (f ? [i] : [])),
    straight: editor.pathStraight,
    closed: editor.pathClosed,
  })
  editor.execute(new ReplacePathCommand(null, path))
}

export function cancelPath(): void {
  editor.pathDraft = null
}

export function popPathPoint(): void {
  const draft = editor.pathDraft
  if (!draft) return
  editor.pathDraft =
    draft.hexes.length > 1
      ? {
          hexes: draft.hexes.slice(0, -1),
          offsets: draft.offsets.slice(0, -1),
          nodes: draft.nodes.slice(0, -1),
        }
      : null
}

/**
 * Icons: click an empty hex to place the current icon (and select it); click a hex
 * with an icon to select it, then the palette and style controls edit it live. Drag
 * an icon to move it inside its hex or to another empty hex. Right-click removes,
 * Ctrl+click copies its icon and style.
 */
class IconTool implements Tool {
  private pressed: { key: HexKey; at: Point; threshold: number } | null = null
  private drag: {
    batch: HexEditBatch
    source: HexKey
    icon: HexIcon
    grab: Point
    target: HexKey
  } | null = null

  down(cell: Offset, info: PointerInfo): void {
    const key = keyOf(cell)
    const icon = editor.map.hexes[key]?.icon
    if (info.alt || info.ctrl) {
      if (icon) {
        const { id, ...style } = icon
        editor.iconId = id
        editor.iconStyle = { ...style, offset: undefined }
      }
      return
    }
    if (blockedByLock('icons')) return
    if (info.button === 2) {
      if (icon) editor.editHex(key, (hex) => ({ ...hex, icon: undefined }))
      if (editor.selectedIcon === key) editor.selectedIcon = null
      return
    }
    if (icon) {
      selectIconHex(key)
      this.pressed = { key, at: info.world, threshold: info.pickRadius / 3 }
      return
    }
    editor.editHex(key, (hex) => ({ ...hex, icon: { ...editor.iconStyle, id: editor.iconId } }))
    selectIconHex(key)
  }

  move(_cell: Offset, info: PointerInfo): void {
    const pressed = this.pressed
    if (pressed && !this.drag) {
      if (Math.hypot(info.world.x - pressed.at.x, info.world.y - pressed.at.y) < pressed.threshold)
        return
      const icon = editor.map.hexes[pressed.key]?.icon
      if (!icon) return
      const center = cellCenter(parseKey(pressed.key))
      const { hexSize } = editor.map.grid
      const point = {
        x: center.x + (icon.offset?.[0] ?? 0) * hexSize,
        y: center.y + (icon.offset?.[1] ?? 0) * hexSize,
      }
      this.drag = {
        batch: new HexEditBatch(editor.map),
        source: pressed.key,
        icon: structuredClone(icon),
        grab: { x: point.x - pressed.at.x, y: point.y - pressed.at.y },
        target: pressed.key,
      }
    }
    if (this.drag) this.moveIcon(info)
  }

  up(): void {
    this.pressed = null
    const drag = this.drag
    this.drag = null
    if (!drag) return
    const command = drag.batch.finish()
    if (command) editor.record(command)
    selectIconHex(drag.target)
  }

  /**
   * Moves the dragged icon live into the hex under the pointer, centered. With Shift it
   * keeps a free position inside the hex (where the grabbed point is).
   */
  private moveIcon(info: PointerInfo): void {
    const drag = this.drag!
    const { grid, hexes } = editor.map
    let cell = cellAt(info.world, grid, grid.hexSize)
    let key = keyOf(cell)
    // Only empty hexes (or its own) can receive the icon.
    if (!inBounds(cell, grid) || (key !== drag.source && hexes[key]?.icon && key !== drag.target)) {
      key = drag.target
      cell = parseKey(key)
    }
    const offset = info.shift
      ? freeOffset(cell, { x: info.world.x + drag.grab.x, y: info.world.y + drag.grab.y })
      : undefined
    const changed: HexKey[] = []
    if (key !== drag.target && drag.target !== drag.source) {
      drag.batch.edit(drag.target, (hex) => ({ ...hex, icon: undefined }))
      changed.push(drag.target)
    }
    if (key !== drag.source) {
      if (drag.batch.edit(drag.source, (hex) => ({ ...hex, icon: undefined })))
        changed.push(drag.source)
    }
    drag.batch.edit(key, (hex) => ({ ...hex, icon: { ...drag.icon, offset } }))
    if (key === drag.source && drag.target !== drag.source) {
      changed.push(drag.source)
    }
    changed.push(key)
    drag.target = key
    selectIconHex(key)
    editor.notify({ kind: 'hexes', keys: [...new Set(changed)] })
  }
}

/** Position of `world` inside a hex, in hex sizes from its center (undefined near the center). */
function freeOffset(cell: Offset, world: Point): [number, number] | undefined {
  const { hexSize } = editor.map.grid
  const center = cellCenter(cell)
  const local = { x: (world.x - center.x) / hexSize, y: (world.y - center.y) / hexSize }
  // Snap back to the center when close to it; never leave the hex.
  const length = Math.hypot(local.x, local.y)
  if (length < 0.12) return undefined
  const scale = Math.min(1, 0.8 / length)
  return [local.x * scale, local.y * scale]
}

/** Selecting an icon selects its hex too: one selection outline, and the hex panel follows. */
function selectIconHex(key: HexKey): void {
  editor.selectedIcon = key
  editor.selected = key
}

function cellCenter(cell: Offset): Point {
  const { grid } = editor.map
  return centerOn(cell, grid, grid.hexSize)
}

export function deleteSelectedIcon(): void {
  const key = editor.selectedIcon
  if (!key) return
  editor.editHex(key, (hex) => ({ ...hex, icon: undefined }))
  editor.selectedIcon = null
}

/**
 * Free text labels: click empty space to add one, click a label to select it, drag
 * to move, right-click (or Delete) to remove. Text and style are edited in the panel.
 */
class TextTool implements Tool {
  private drag: { id: string; grab: Point; moved: boolean } | null = null

  down(_cell: Offset, info: PointerInfo): void {
    if (blockedByLock('labels')) return
    const { hexSize } = editor.map.grid
    const hit = hitTestLabel(info.world)
    if (hit) {
      editor.selectedLabel = hit
      if (info.button === 2) return deleteSelectedLabel()
      const label = editor.getLabel(hit)!
      editor.labelStyle = { ...label.style }
      this.drag = {
        id: hit,
        grab: { x: label.x * hexSize - info.world.x, y: label.y * hexSize - info.world.y },
        moved: false,
      }
      return
    }
    if (info.button !== 0) return
    // First click on empty space only deselects, so it's easy to stop editing a label.
    if (editor.selectedLabel) {
      editor.selectedLabel = null
      return
    }
    const label = {
      id: newId(),
      text: t('labels.default'),
      x: info.world.x / hexSize,
      y: info.world.y / hexSize,
      style: { ...editor.labelStyle },
    }
    editor.execute(new ReplaceLabelCommand(null, label))
    editor.selectedLabel = label.id
    editor.focusLabelText++
  }

  move(_cell: Offset, info: PointerInfo): void {
    const drag = this.drag
    if (!drag) return
    const { hexSize } = editor.map.grid
    drag.moved = true
    editor.previewLabel(drag.id, (label) => ({
      ...label,
      x: (info.world.x + drag.grab.x) / hexSize,
      y: (info.world.y + drag.grab.y) / hexSize,
    }))
  }

  up(): void {
    if (this.drag?.moved) editor.commitLabel(this.drag.id)
    this.drag = null
  }
}

export function deleteSelectedToken(): void {
  const token = editor.selectedToken ? editor.getToken(editor.selectedToken) : undefined
  if (!token || blockedByLock('tokens')) return
  editor.execute(new RemoveTokenCommand(structuredClone(token)))
  if (token.kind === 'party') partyMoved(undefined)
  editor.selectedToken = null
}

export function deleteSelectedLabel(): void {
  const id = editor.selectedLabel
  const label = id && editor.getLabel(id)
  if (!label) return
  editor.commitLabel(label.id)
  editor.execute(new ReplaceLabelCommand(editor.getLabel(label.id)!, null))
  editor.selectedLabel = null
}

/**
 * Those present in Play: a click on one shows its sheet in the trip's **Here**, a drag
 * moves it to another place in the trip (drawn there while it's dragged).
 */
class CopyDragger {
  private pressed: { id: string; at: Point; threshold: number; hex?: HexKey } | null = null

  /** Handles the press if it hits one of those present. */
  down(info: PointerInfo): boolean {
    const hit = hitTestToken(info.world, true)
    const id = hit && copyOf(hit)
    if (!id) return false
    this.pressed = { id, at: info.world, threshold: info.pickRadius / 3 }
    return true
  }

  move(cell: Offset, info: PointerInfo): void {
    const pressed = this.pressed
    if (!pressed) return
    if (!pressed.hex) {
      if (Math.hypot(info.world.x - pressed.at.x, info.world.y - pressed.at.y) < pressed.threshold)
        return
      if (blockedByLock('tokens')) return void (this.pressed = null)
    }
    if (!inBounds(cell, editor.map.grid) || pressed.hex === keyOf(cell)) return
    pressed.hex = keyOf(cell)
    dragCopy({ id: pressed.id, hex: pressed.hex })
  }

  /** Ends a press: moves the copy dragged, or shows the one clicked. */
  up(): void {
    const pressed = this.pressed
    this.pressed = null
    if (!pressed) return
    if (!pressed.hex) return showPresent(pressed.id)
    dragCopy(null)
    moveCopy(pressed.id, pressed.hex)
  }

  get busy(): boolean {
    return !!this.pressed
  }
}
const copyDragger = new CopyDragger()

/**
 * Play: place the party, then move it (simple mode) or pick its destination (rules mode).
 * Dragging the party (or any token) puts it somewhere else by hand; a click on a token
 * selects it and is a click on its hex too (travel to the dragon's lair). Those present
 * are clicked and dragged too (`CopyDragger`).
 */
const playTool: Tool = {
  down(cell, info) {
    if (info.button === 0 && copyDragger.down(info)) return
    if (info.button === 0 && playDragger.down(cell, info)) return
    if (info.button !== 0 || !inBounds(cell, editor.map.grid)) return
    clickHex(keyOf(cell))
  },
  move(cell, info) {
    if (copyDragger.busy) return copyDragger.move(cell, info)
    playDragger.move(cell, info)
  },
  up() {
    if (copyDragger.busy) return copyDragger.up()
    const clicked = playDragger.up()
    const hex = clicked && editor.getToken(clicked)?.hex
    if (hex) clickHex(hex as HexKey)
  },
}

/**
 * A faction's land, painted by hand (the World panel's **Paint its land**): a click or a
 * drag gives it hexes, a right click takes them away.
 */
class FactionTool implements Tool {
  private claiming = true
  private last: Offset | null = null

  down(cell: Offset, info: PointerInfo): void {
    if (!editor.factionBrush) return
    this.claiming = info.button !== 2
    this.last = cell
    paintTerritory(editor.factionBrush, [keyOf(cell)], this.claiming)
  }

  move(cell: Offset): void {
    if (!this.last || !editor.factionBrush) return
    if (cell.col === this.last.col && cell.row === this.last.row) return
    const line = cellLine(this.last, cell, editor.map.grid).slice(1)
    paintTerritory(editor.factionBrush, line.map(keyOf), this.claiming)
    this.last = cell
  }

  up(): void {
    this.last = null
  }
}
const factionTool = new FactionTool()

export function deleteSelectedConnection(): void {
  const connection = editor.map.connections.find((c) => c.id === editor.selectedConnection)
  if (!connection) return
  editor.execute(new RemoveConnectionCommand(connection))
  editor.selectedConnection = null
}

/** The connection drawn nearest to a point, within `radius` of its line (world units). */
export function connectionAt(world: Point, radius: number): MapConnection | null {
  const { grid } = editor.map
  let best: { connection: MapConnection; distance: number } | null = null
  for (const connection of editor.map.connections) {
    const [a, b] = connection.between.map((k) => cellCenter(parseKey(k)))
    const d = segmentDistance(world, a, b)
    if (
      d <= radius &&
      (!best || d < best.distance) &&
      connection.between.every((k) => inBounds(parseKey(k), grid))
    )
      best = { connection, distance: d }
  }
  return best?.connection ?? null
}

function segmentDistance(p: Point, a: Point, b: Point): number {
  const [dx, dy] = [b.x - a.x, b.y - a.y]
  const length = dx * dx + dy * dy
  const t = length ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length)) : 0
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

/**
 * Connections: a click on a place starts one, a click on another ends it (a new connection
 * of the chosen kind between them); a click on a connection selects it, a right click
 * deletes it (or drops the one being started).
 */
const connectionTool: Tool = {
  down(cell, info) {
    if (blockedByLock('connections')) return
    const hit = connectionAt(info.world, info.pickRadius / 2)
    if (info.button === 2) {
      if (editor.connectionStart) editor.connectionStart = null
      else if (hit) editor.execute(new RemoveConnectionCommand(hit))
      return
    }
    const key = keyOf(cell)
    const start = editor.connectionStart
    if (!start && hit) {
      editor.selectedConnection = hit.id
      return
    }
    if (!inBounds(cell, editor.map.grid)) return
    const kind = editor.connectionKind.trim()
    if (!kind) return void showToast(t('connection.noKind'))
    if (!start || start === key) {
      editor.connectionStart = start === key ? null : key
      editor.selectedConnection = null
      return
    }
    editor.connectionStart = null
    const same = editor.map.connections.find(
      (c) => c.kind === kind && c.between.includes(start) && c.between.includes(key),
    )
    if (same) {
      editor.selectedConnection = same.id
      return
    }
    const connection: MapConnection = { id: newId(), between: [start, key], kind }
    editor.execute(new AddConnectionCommand(connection))
    editor.selectedConnection = connection.id
  },
  move() {},
  up() {},
}

/** A wall on a side: the two cells it stands between, in a fixed order. */
const wallId = (a: string, b: string) => [a, b].sort().join('|')

/**
 * The side of a cell nearest a point, with the cell across it and how far the point is from
 * the side; none when it faces the map's edge.
 */
function nearestSide(cell: Offset, world: Point) {
  const { grid } = editor.map
  let best: { across: Offset; d: number } | null = null
  for (const { a, b, across } of cellSides(cell, grid, grid.hexSize)) {
    // Distance from the point to the side's segment.
    const [dx, dy] = [b.x - a.x, b.y - a.y]
    const k = Math.max(
      0,
      Math.min(1, ((world.x - a.x) * dx + (world.y - a.y) * dy) / (dx * dx + dy * dy)),
    )
    const d = Math.hypot(world.x - (a.x + k * dx), world.y - (a.y + k * dy))
    if (!best || d < best.d) best = { across, d }
  }
  return best && inBounds(best.across, grid) ? { across: keyOf(best.across), d: best.d } : null
}

/**
 * Walls: a click puts a wall on the side of the cell nearest the pointer, a drag one on each
 * side it runs along; a right click (or drag) takes them away. A stroke is one undo step.
 */
class WallTool implements Tool {
  private stroke: { before: [HexKey, HexKey][]; adding: boolean } | null = null

  down(cell: Offset, info: PointerInfo): void {
    if (info.button !== 0 && info.button !== 2) return
    if (!inBounds(cell, editor.map.grid) || blockedByLock('walls')) return
    this.stroke = { before: structuredClone(editor.map.walls), adding: info.button === 0 }
    this.mark(cell, info.world, true)
  }

  move(cell: Offset, info: PointerInfo): void {
    if (this.stroke && inBounds(cell, editor.map.grid)) this.mark(cell, info.world, false)
  }

  up(): void {
    const stroke = this.stroke
    this.stroke = null
    if (!stroke) return
    const ids = (walls: [HexKey, HexKey][]) => walls.map(([a, b]) => wallId(a, b)).join()
    if (ids(stroke.before) !== ids(editor.map.walls))
      editor.record(new ReplaceWallsCommand(stroke.before, structuredClone(editor.map.walls)))
  }

  /** The side nearest the pointer: always on a click, while dragging only close to it. */
  private mark(cell: Offset, world: Point, click: boolean): void {
    const side = nearestSide(cell, world)
    if (!side || (!click && side.d > editor.map.grid.hexSize * 0.25)) return
    const key = keyOf(cell)
    const id = wallId(key, side.across)
    const has = editor.map.walls.some(([a, b]) => wallId(a, b) === id)
    if (this.stroke!.adding === has) return
    editor.map.walls = this.stroke!.adding
      ? [...editor.map.walls, [key, side.across]]
      : editor.map.walls.filter(([a, b]) => wallId(a, b) !== id)
    editor.notify({ kind: 'walls' })
  }
}

const tools: Record<ToolId, Tool> = {
  play: playTool,
  region: new RegionTool(),
  token: {
    down: (cell, info) => void tokenTool.down(cell, info),
    move: (cell, info) => tokenTool.move(cell, info),
    up: () => tokenTool.up(),
  },
  text: new TextTool(),
  icon: new IconTool(),
  select: selectTool,
  terrain: new TerrainTool(),
  path: new PathTool(),
  connection: connectionTool,
  wall: new WallTool(),
}

export function getTool(id: ToolId): Tool {
  return tools[id]
}

/** What a click on the map does now: painting a faction's land while the World panel asks, else the tool's. */
export function currentTool(): Tool {
  return editor.factionBrush && editor.panelView === 'world' ? factionTool : tools[editor.tool]
}
