import type { PrintSettings } from '../model/types'
import { mapSizeMm, paperSize, type Size } from '../print/paper'
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

export async function exportPng(pixelsPerHex: number, transparent: boolean): Promise<PngExport> {
  if (!view.exportCanvas) throw new Error('Renderer not ready')
  const flatToFlat = editor.map.grid.hexSize * SQRT3
  const result = view.exportCanvas({
    pixelsPerUnit: pixelsPerHex / flatToFlat,
    background: transparent ? null : WHITE,
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
}

export async function exportPdf(dpi: number): Promise<PdfExport> {
  if (!view.exportCanvas) throw new Error('Renderer not ready')
  const mm = mmPerUnit()
  const result = view.exportCanvas({ pixelsPerUnit: (dpi / 25.4) * mm, background: WHITE })
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
  pdf.setProperties({ title: editor.map.meta.name || editor.map.meta.id, creator: 'Hexmapper' })
  pdf.addImage(result.canvas, 'PNG', layout.x, layout.y, layout.image.width, layout.image.height)
  download(pdf.output('blob'), `${editor.map.meta.id}.pdf`)
  return { ...layout, dpi: Math.round((result.pixelsPerUnit / mm) * 25.4) }
}
