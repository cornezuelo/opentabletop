import type { SettingsPatch } from '../commands/settings'
import { MAX_MAP_SIZE } from '../model/defaults'
import type { GridSettings, HexMap, PrintSettings } from '../model/types'
import { fitGrid, paperSize, type Size } from './paper'

/** Cols × rows that fit on the configured paper, or null when sized by hex count. */
export function sizeForPaper(
  orientation: GridSettings['orientation'],
  print: PrintSettings,
): Size | null {
  if (!print.paper) return null
  const paper = paperSize(print.paper, print.landscape, print.customPaper)
  const area = {
    width: paper.width - 2 * print.marginMm,
    height: paper.height - 2 * print.marginMm,
  }
  if (area.width <= 0 || area.height <= 0) return { width: 1, height: 1 }
  const fit = fitGrid(area, orientation, print.hexMm)
  return { width: Math.min(fit.width, MAX_MAP_SIZE), height: Math.min(fit.height, MAX_MAP_SIZE) }
}

/**
 * Completes a settings patch: in paper mode the grid size follows the paper, and a
 * manual width/height edit switches back to hex-count mode. Returns null if nothing changes.
 */
export function resolveSettingsPatch(map: HexMap, patch: SettingsPatch): SettingsPatch | null {
  const grid: Partial<GridSettings> = { ...patch.grid }
  const print: Partial<PrintSettings> = { ...patch.print }
  if ((grid.width !== undefined || grid.height !== undefined) && patch.print?.paper === undefined)
    print.paper = null

  const nextPrint = { ...map.print, ...print }
  const fit = sizeForPaper(grid.orientation ?? map.grid.orientation, nextPrint)
  if (fit) Object.assign(grid, fit)

  const changedGrid = pickChanged(map.grid, grid)
  const changedPrint = pickChanged(map.print, print)
  if (!changedGrid && !changedPrint) return null
  return { ...(changedGrid && { grid: changedGrid }), ...(changedPrint && { print: changedPrint }) }
}

function pickChanged<T extends object>(current: T, patch: Partial<T>): Partial<T> | null {
  const out: Partial<T> = {}
  let any = false
  for (const key of Object.keys(patch) as (keyof T)[]) {
    if (JSON.stringify(current[key]) === JSON.stringify(patch[key])) continue
    out[key] = patch[key]
    any = true
  }
  return any ? out : null
}
