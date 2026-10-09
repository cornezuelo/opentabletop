import type { Offset } from '@open-tabletop/hex'
import type { ExportResult } from '../render/MapRenderer'

/** Viewport actions, wired up by the map canvas once the renderer exists. */
export const view = {
  fit: () => {},
  /** Centers a hex; before the renderer exists the request is kept in `pendingCenter`. */
  centerOn: (cell: Offset) => {
    view.pendingCenter = cell
  },
  pendingCenter: null as Offset | null,
  /** Centers a point of the map, in hexes (a label's `x` / `y`). Nothing before the renderer exists. */
  centerOnPoint: (() => {}) as (p: { x: number; y: number }) => void,
  exportCanvas: null as
    ((options: { pixelsPerUnit: number; background: number | null }) => ExportResult) | null,
}
