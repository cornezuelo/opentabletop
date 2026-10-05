import { HexEditBatch } from '../commands/hexes'
import { ReplaceLabelCommand, ReplacePathCommand, rerouteVertex } from '../commands/paths'
import { hitTestLabel } from '../render/hitTest'
import { nodeFlags, normalizePath } from '../model/hex'
import type { MapPath } from '../model/types'
import { placeInHex } from '../render/pathGeometry'
import { newId } from '../model/id'
import {
  hexToPixel,
  pixelToHex,
  toOffset,
  type Point,
  toAxial,
  inBounds,
  parseKey,
  cellLine,
  cellsInRadius,
  floodFill,
  type HexKey,
  keyOf,
  type Offset,
} from '@open-tabletop/hex'
import { t, type MessageKey } from '../i18n/index.svelte'
import type { HexIcon, LayerId } from '../model/types'
import { editor, type ToolId } from '../store/editor.svelte'
import { showToast } from '../store/toasts.svelte'

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

const selectTool: Tool = {
  down(cell) {
    editor.selected = keyOf(cell)
  },
  move() {},
  up() {},
}

class TerrainTool implements Tool {
  private batch: HexEditBatch | null = null
  private last: Offset | null = null
  private erasing = false

  down(cell: Offset, info: PointerInfo): void {
    if (info.alt || info.ctrl) return this.pick(cell)
    if (blockedByLock('terrain')) return
    const erase = editor.terrainMode === 'erase' || info.button === 2
    if (editor.terrainMode === 'fill') return this.fill(cell, erase)
    this.erasing = erase
    this.batch = new HexEditBatch(editor.map)
    this.last = cell
    this.paint([cell])
  }

  move(cell: Offset): void {
    if (!this.batch || !this.last) return
    if (cell.col === this.last.col && cell.row === this.last.row) return
    this.paint(cellLine(this.last, cell, editor.map.grid.orientation).slice(1))
    this.last = cell
  }

  up(): void {
    const command = this.batch?.finish()
    if (command) editor.record(command)
    this.batch = null
    this.last = null
  }

  private paint(centers: Offset[]): void {
    const batch = this.batch!
    const terrain = this.erasing ? undefined : editor.terrainId
    const changed: HexKey[] = []
    for (const center of centers)
      for (const cell of cellsInRadius(center, editor.brushRadius, editor.map.grid)) {
        const key = keyOf(cell)
        if (batch.edit(key, (hex) => ({ ...hex, terrain }))) changed.push(key)
      }
    if (changed.length > 0) editor.notify({ kind: 'hexes', keys: changed })
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
    const added = cellLine(last, cell, grid.orientation)
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
    const target = toOffset(pixelToHex(world, grid.orientation, grid.hexSize), grid.orientation)
    const original = parseKey(drag.before.hexes[drag.index])
    let { hexes } = drag.before
    let offsets = drag.before.hexes.map((_, i) => drag.before.offsets?.[i] ?? null)
    let nodes = drag.before.nodes
    let index = drag.index
    if (inBounds(target, grid) && keyOf(target) !== keyOf(original)) {
      ;({ hexes, offsets, nodes, index } = rerouteVertex(
        drag.before,
        drag.index,
        target,
        grid.orientation,
      ))
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
  const { orientation, hexSize } = editor.map.grid
  const center = hexToPixel(toAxial(parseKey(path.hexes[index]), orientation), orientation, hexSize)
  const offset = path.offsets?.[index]
  return offset ? { x: center.x + offset[0] * hexSize, y: center.y + offset[1] * hexSize } : center
}

/** Offset (hex-size units) of the pointer inside `cell`, snapped unless Ctrl is held. */
function offsetInHex(cell: Offset, info: PointerInfo): [number, number] | null {
  const { orientation, hexSize } = editor.map.grid
  const center = hexToPixel(toAxial(cell, orientation), orientation, hexSize)
  const local = { x: info.world.x - center.x, y: info.world.y - center.y }
  const placed = placeInHex(local, orientation, hexSize, !info.ctrl)
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
      editor.selectedIcon = key
      this.pressed = { key, at: info.world, threshold: info.pickRadius / 3 }
      return
    }
    editor.editHex(key, (hex) => ({ ...hex, icon: { ...editor.iconStyle, id: editor.iconId } }))
    editor.selectedIcon = key
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
    editor.selectedIcon = drag.target
  }

  /** Moves the dragged icon live: offset inside a hex, or into another empty hex. */
  private moveIcon(info: PointerInfo): void {
    const drag = this.drag!
    const { grid, hexes } = editor.map
    const world = { x: info.world.x + drag.grab.x, y: info.world.y + drag.grab.y }
    let cell = toOffset(pixelToHex(world, grid.orientation, grid.hexSize), grid.orientation)
    let key = keyOf(cell)
    // Only empty hexes (or its own) can receive the icon.
    if (!inBounds(cell, grid) || (key !== drag.source && hexes[key]?.icon && key !== drag.target)) {
      key = drag.target
      cell = parseKey(key)
    }
    const center = cellCenter(cell)
    const local = { x: (world.x - center.x) / grid.hexSize, y: (world.y - center.y) / grid.hexSize }
    // Snap back to the center when close to it.
    const offset: [number, number] | undefined =
      Math.hypot(local.x, local.y) < 0.12 ? undefined : [local.x, local.y]
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
    editor.selectedIcon = key
    editor.notify({ kind: 'hexes', keys: [...new Set(changed)] })
  }
}

function cellCenter(cell: Offset): Point {
  const { orientation, hexSize } = editor.map.grid
  return hexToPixel(toAxial(cell, orientation), orientation, hexSize)
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

export function deleteSelectedLabel(): void {
  const id = editor.selectedLabel
  const label = id && editor.getLabel(id)
  if (!label) return
  editor.commitLabel(label.id)
  editor.execute(new ReplaceLabelCommand(editor.getLabel(label.id)!, null))
  editor.selectedLabel = null
}

const tools: Record<ToolId, Tool> = {
  text: new TextTool(),
  icon: new IconTool(),
  select: selectTool,
  terrain: new TerrainTool(),
  path: new PathTool(),
}

export function getTool(id: ToolId): Tool {
  return tools[id]
}
