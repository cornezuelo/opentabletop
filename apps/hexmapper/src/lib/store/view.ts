import type { ExportResult } from '../render/MapRenderer'

/** Viewport actions, wired up by the map canvas once the renderer exists. */
export const view = {
  fit: () => {},
  exportCanvas: null as
    ((options: { pixelsPerUnit: number; background: number | null }) => ExportResult) | null,
}
