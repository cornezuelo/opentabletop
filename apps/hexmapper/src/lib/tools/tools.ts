import { HexEditBatch } from '../commands/hexes'
import { dedupeConsecutive, ReplacePathCommand } from '../commands/paths'
import { newId } from '../model/id'
import {
  inBounds,
  parseKey,
  cellLine,
  cellsInRadius,
  floodFill,
  type HexKey,
  keyOf,
  type Offset,
} from '@open-tabletop/hex'
import { editor, type ToolId } from '../store/editor.svelte'

export interface PointerInfo {
  /** 0 = primary, 2 = secondary (right click). */
  button: number
  alt: boolean
}

/** A map editing tool driven by pointer events on hex cells. */
export interface Tool {
  down(cell: Offset, info: PointerInfo): void
  move(cell: Offset): void
  up(): void
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
    if (info.alt) return this.pick(cell)
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

  /** Eyedropper: alt+click takes the terrain under the cursor. */
  private pick(cell: Offset): void {
    const terrain = editor.map.hexes[keyOf(cell)]?.terrain
    if (terrain) editor.terrainId = terrain
  }
}

/**
 * Draws a road/trail/river: click (or drag across) hexes to add them, gaps are
 * filled with a straight hex line. Click the last hex again, right-click or press
 * Enter to finish; Esc cancels; Backspace removes the last hex.
 */
class PathTool implements Tool {
  private pressed = false

  down(cell: Offset, info: PointerInfo): void {
    if (info.button === 2) return finishPath()
    const draft = editor.pathDraft
    if (draft && draft.at(-1) === keyOf(cell)) return finishPath()
    this.pressed = true
    this.extend(cell)
  }

  move(cell: Offset): void {
    if (this.pressed) this.extend(cell)
  }

  up(): void {
    this.pressed = false
  }

  private extend(cell: Offset): void {
    const { grid } = editor.map
    const draft = editor.pathDraft
    if (!draft) {
      editor.pathDraft = [keyOf(cell)]
      return
    }
    const last = parseKey(draft.at(-1)!)
    const added = cellLine(last, cell, grid.orientation)
      .slice(1)
      .filter((c) => inBounds(c, grid))
      .map(keyOf)
    if (added.length > 0) editor.pathDraft = dedupeConsecutive([...draft, ...added])
  }
}

/** Commits the path being drawn (if it spans at least two hexes). */
export function finishPath(): void {
  const draft = editor.pathDraft
  editor.pathDraft = null
  if (!draft) return
  const hexes = dedupeConsecutive(draft)
  if (hexes.length < 2) return
  editor.execute(new ReplacePathCommand(null, { id: newId(), kind: editor.pathKind, hexes }))
}

export function cancelPath(): void {
  editor.pathDraft = null
}

export function popPathPoint(): void {
  const draft = editor.pathDraft
  if (!draft) return
  editor.pathDraft = draft.length > 1 ? draft.slice(0, -1) : null
}

const tools: Record<ToolId, Tool> = {
  select: selectTool,
  terrain: new TerrainTool(),
  path: new PathTool(),
}

export function getTool(id: ToolId): Tool {
  return tools[id]
}
