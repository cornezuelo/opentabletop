import { HexEditBatch } from '../commands/hexes'
import { cellLine, cellsInRadius, floodFill, keyOf, type HexKey } from '../hex/grid'
import type { Offset } from '../hex/offset'
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

const tools: Record<ToolId, Tool> = {
  select: selectTool,
  terrain: new TerrainTool(),
}

export function getTool(id: ToolId): Tool {
  return tools[id]
}
