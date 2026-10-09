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
    | ((options: {
        pixelsPerUnit: number
        background: number | null
        emptyWhite?: boolean
        frame?: { x: number; y: number; width: number; height: number }
      }) => ExportResult)
    | null,
  /** What an export covers, in world units (the whole map with a little padding). */
  exportBounds: null as (() => { x: number; y: number; width: number; height: number }) | null,
}
