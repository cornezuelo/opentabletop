import type { PrintSettings } from '../model/types'
import { mapSizeMm, paperSize, type PaperId, type Size } from '../print/paper'
import { editor } from '../store/editor.svelte'
import { view } from '../store/view'

const SQRT3 = Math.sqrt(3)
const WHITE = 0xffffff

/** PNG presets in pixels per hex (flat-to-flat), matching common VTT grid sizes. */
export const PNG_PIXELS_PER_HEX = [50, 70, 100, 140, 200] as const
export const PDF_DPI = [150, 300] as const

function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export interface PngExport {
  width: number
  height: number
  /** Pixels per hex actually used (lower than requested if the GPU limit was hit). */
  pixelsPerHex: number
}

export async function exportPng(
  pixelsPerHex: number,
  transparent: boolean,
  emptyWhite = false,
): Promise<PngExport> {
  if (!view.exportCanvas) throw new Error('Renderer not ready')
  const flatToFlat = editor.map.grid.hexSize * SQRT3
  const result = view.exportCanvas({
    pixelsPerUnit: pixelsPerHex / flatToFlat,
    background: transparent ? null : WHITE,
    emptyWhite,
  })
  const blob = await new Promise<Blob | null>((resolve) =>
    result.canvas.toBlob(resolve, 'image/png'),
  )
  if (!blob) throw new Error('PNG encoding failed')
  download(blob, `${editor.map.meta.id}.png`)
  return {
    width: result.canvas.width,
    height: result.canvas.height,
    pixelsPerHex: Math.round(result.pixelsPerUnit * flatToFlat),
  }
}

export interface PdfLayout {
  page: Size
  /** Exported region size on paper. */
  image: Size
  /** Top-left of the image on the page. */
  x: number
  y: number
  /** True if the content is larger than the page's printable area. */
  overflows: boolean
}

/**
 * Page layout at real scale: the hex measures `hexMm` flat-to-flat on paper. Uses the
 * configured paper (paper mode) or a page sized to the map plus margins.
 */
export function pdfLayout(contentMm: Size, print: PrintSettings, paddingMm = 0): PdfLayout {
  const margin = print.marginMm
  // The safety padding around the content is blank; it may spill into the margins.
  const slack = paddingMm * 2 + 0.5
  const page = print.paper
    ? paperSize(print.paper, print.landscape, print.customPaper)
    : { width: contentMm.width + margin * 2, height: contentMm.height + margin * 2 }
  return {
    page,
    image: contentMm,
    x: (page.width - contentMm.width) / 2,
    y: (page.height - contentMm.height) / 2,
    overflows:
      contentMm.width > page.width - margin * 2 + slack ||
      contentMm.height > page.height - margin * 2 + slack,
  }
}

/** Millimetres per world unit for the map's print settings. */
function mmPerUnit(): number {
  const { grid, print } = editor.map
  return print.hexMm / (grid.hexSize * SQRT3)
}

/** Approximate printed size of the grid alone, for the UI before exporting. */
export function gridSizeMm(): Size {
  const { grid, print } = editor.map
  return mapSizeMm(grid.width, grid.height, grid.orientation, print.hexMm)
}

export interface PdfExport extends PdfLayout {
  dpi: number
  /** Pages across and down (1 × 1 without tiling). */
  tiles: { columns: number; rows: number }
}

/** How much neighbouring pages of a tiled map repeat each other, to trim and glue them. */
export const TILE_OVERLAP_MM = 10

/** One page of a tiled map: the part of the map it prints, in mm from the map's top-left. */
export interface Tile {
  column: number
  row: number
  x: number
  y: number
  width: number
  height: number
}

/**
 * The pages a map of `content` mm takes on pages of `page` mm with `margin` mm margins,
 * neighbours overlapping by `overlap` mm. Left to right, then top to bottom.
 */
export function tiles(
  content: Size,
  page: Size,
  margin: number,
  overlap = TILE_OVERLAP_MM,
): Tile[] {
  const printable = { width: page.width - margin * 2, height: page.height - margin * 2 }
  const steps = (total: number, room: number) => {
    if (room <= overlap) return [{ at: 0, size: Math.min(total, room) }]
    const out: { at: number; size: number }[] = []
    for (let at = 0; ; at += room - overlap) {
      out.push({ at, size: Math.min(room, total - at) })
      if (at + room >= total) break
    }
    return out
  }
  const xs = steps(content.width, printable.width)
  const ys = steps(content.height, printable.height)
  return ys.flatMap((y, row) =>
    xs.map((x, column) => ({ column, row, x: x.at, y: y.at, width: x.size, height: y.size })),
  )
}

export interface PdfOptions {
  /** Empty hexes white (saves ink). */
  emptyWhite?: boolean
  /** Splits the map into pages of this paper, overlapping a little, when it doesn't fit one. */
  tile?: { paper: PaperId; landscape: boolean }
}

export async function exportPdf(dpi: number, options: PdfOptions = {}): Promise<PdfExport> {
  if (!view.exportCanvas || !view.exportBounds) throw new Error('Renderer not ready')
  const mm = mmPerUnit()
  const pixelsPerUnit = (dpi / 25.4) * mm
  const title = editor.map.meta.name || editor.map.meta.id
  if (options.tile) {
    const { print } = editor.map
    const page = paperSize(options.tile.paper, options.tile.landscape, print.customPaper)
    const whole = view.exportBounds()
    const content = { width: whole.width * mm, height: whole.height * mm }
    const pages = tiles(content, page, print.marginMm)
    const { jsPDF } = await import('jspdf')
    const pdf = new jsPDF({
      unit: 'mm',
      format: [page.width, page.height],
      orientation: page.width > page.height ? 'landscape' : 'portrait',
      compress: true,
    })
    pdf.setProperties({ title, creator: 'Hexmapper' })
    const columns = Math.max(...pages.map((p) => p.column)) + 1
    const rows = Math.max(...pages.map((p) => p.row)) + 1
    let usedDpi = dpi
    pages.forEach((tile, i) => {
      if (i > 0) pdf.addPage([page.width, page.height], page.width > page.height ? 'l' : 'p')
      // Each page is rendered on its own, at the resolution asked for.
      const piece = view.exportCanvas!({
        pixelsPerUnit,
        background: WHITE,
        emptyWhite: options.emptyWhite,
        frame: {
          x: whole.x + tile.x / mm,
          y: whole.y + tile.y / mm,
          width: tile.width / mm,
          height: tile.height / mm,
        },
      })
      usedDpi = Math.min(usedDpi, Math.round((piece.pixelsPerUnit / mm) * 25.4))
      const margin = print.marginMm
      pdf.addImage(piece.canvas, 'PNG', margin, margin, tile.width, tile.height)
      // Where the page goes: its row as a letter and its column as a number (B3), as on maps.
      pdf.setFontSize(7)
      pdf.setTextColor(120)
      pdf.text(
        `${String.fromCharCode(65 + (tile.row % 26))}${tile.column + 1}  (${tile.row + 1}/${rows} · ${tile.column + 1}/${columns})  ${title}`,
        margin,
        Math.max(3, margin - 1.5),
      )
    })
    download(pdf.output('blob'), `${editor.map.meta.id}.pdf`)
    return {
      page,
      image: content,
      x: print.marginMm,
      y: print.marginMm,
      overflows: false,
      dpi: usedDpi,
      tiles: { columns, rows },
    }
  }
  const result = view.exportCanvas({
    pixelsPerUnit,
    background: WHITE,
    emptyWhite: options.emptyWhite,
  })
  const usedDpi = Math.round((result.pixelsPerUnit / mm) * 25.4)
  const layout = pdfLayout(
    { width: result.bounds.width * mm, height: result.bounds.height * mm },
    editor.map.print,
    result.padding * mm,
  )
  const { jsPDF } = await import('jspdf')
  const { page } = layout
  const pdf = new jsPDF({
    unit: 'mm',
    format: [page.width, page.height],
    orientation: page.width > page.height ? 'landscape' : 'portrait',
    compress: true,
  })
  pdf.setProperties({ title, creator: 'Hexmapper' })
  pdf.addImage(result.canvas, 'PNG', layout.x, layout.y, layout.image.width, layout.image.height)
  download(pdf.output('blob'), `${editor.map.meta.id}.pdf`)
  return { ...layout, dpi: usedDpi, tiles: { columns: 1, rows: 1 } }
}
