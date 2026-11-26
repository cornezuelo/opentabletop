/** A file name made of a title (`The Grey Company` → `the-grey-company.md`). */
export const fileNameOf = (title: string, extension: string): string =>
  `${title.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}.${extension}`

/** Gives the browser a text to save as a file (a journal's Markdown). */
export function downloadText(fileName: string, text: string, type = 'text/markdown'): void {
  downloadBlob(fileName, new Blob([text], { type }))
}

/** Gives the browser bytes to save as a file (a .zip of pages). */
export function downloadBytes(fileName: string, bytes: Uint8Array, type = 'application/zip'): void {
  downloadBlob(fileName, new Blob([bytes as BlobPart], { type }))
}

function downloadBlob(fileName: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}
