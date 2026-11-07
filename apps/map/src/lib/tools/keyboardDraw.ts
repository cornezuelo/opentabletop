import {
  cellCenter,
  cellNeighbors as neighborCells,
  cellsAround,
  inBounds,
  keyOf,
  parseKey,
} from '@open-tabletop/hex'
import { newId, type HexKey } from '@open-tabletop/map'
import { showToast } from '@open-tabletop/ui-kit'
import { AddConnectionCommand } from '../commands/connections'
import { HexEditBatch } from '../commands/hexes'
import { t } from '../i18n/index.svelte'
import { mapSystem } from '../play/systems'
import { editor } from '../store/editor.svelte'

/** Where each arrow heads, on the screen. */
const ARROWS: Record<string, { x: number; y: number }> = {
  arrowup: { x: 0, y: -1 },
  arrowdown: { x: 0, y: 1 },
  arrowleft: { x: -1, y: 0 },
  arrowright: { x: 1, y: 0 },
}

/** The cell the last arrow came from, for a door. */
let before: HexKey | null = null

/** Paints cells in the palette's terrain, one undo step. */
function paint(keys: HexKey[]): void {
  const batch = new HexEditBatch(editor.map)
  for (const key of keys) batch.edit(key, (hex) => ({ ...hex, terrain: editor.terrainId }))
  const command = batch.finish()
  if (command) editor.execute(command)
}

/** The neighbour of a cell nearest to a direction on the screen, on hexes as on squares. */
function towards(key: HexKey, { x, y }: { x: number; y: number }): HexKey | undefined {
  const { grid } = editor.map
  const cell = parseKey(key)
  const from = cellCenter(cell, grid, 1)
  const score = (next: typeof cell) => {
    const to = cellCenter(next, grid, 1)
    return (to.x - from.x) * x + (to.y - from.y) * y
  }
  const best = neighborCells(cell, { ...grid, diagonals: false })
    .filter((next) => inBounds(next, grid))
    .sort((a, b) => score(b) - score(a))[0]
  return best && score(best) > 0 ? keyOf(best) : undefined
}

/** The kind of a door drawn by key: the system's `door`, or the one chosen in Connections. */
function doorKind(): string {
  return mapSystem().rules.connections?.door ? 'door' : editor.connectionKind.trim()
}

/**
 * Drawing with the keyboard, in the Terrain tool: an arrow extends a corridor in the palette's
 * terrain from the selected cell, with Shift it only moves; R paints a room round the cell,
 * D a door to the cell it came from, Esc lets go. True if the key was for it.
 */
export function drawByKey(key: string, shift: boolean): boolean {
  if (editor.mode !== 'edit' || editor.tool !== 'terrain') return false
  const here = editor.selected
  const arrow = ARROWS[key]
  if (arrow) {
    const { width, height } = editor.map.grid
    const start = here ?? keyOf({ col: Math.floor(width / 2), row: Math.floor(height / 2) })
    const next = here ? towards(start, arrow) : start
    if (!next) return true
    if (!shift) paint(here ? [start, next] : [next])
    before = here ? start : null
    editor.selected = next
    return true
  }
  if (!here) return false
  if (key === 'escape') {
    editor.selected = null
    before = null
    return true
  }
  if (key === 'r') {
    paint(
      cellsAround(parseKey(here), 1, editor.map.grid)
        .filter((cell) => inBounds(cell, editor.map.grid))
        .map(keyOf),
    )
    return true
  }
  if (key === 'd') {
    const kind = doorKind()
    if (!kind) showToast(t('connection.noKind'))
    else if (before)
      editor.execute(new AddConnectionCommand({ id: newId(), between: [before, here], kind }))
    return true
  }
  return false
}
