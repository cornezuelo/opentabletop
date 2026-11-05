import { bytesToDataUrl } from '@open-tabletop/oracle-engine'

/** The largest image a pack takes from the user's files (browser storage is small). */
export const MAX_IMAGE_BYTES = 512 * 1024

/** A file the user chose, as a pack keeps it: an SVG's text, or the others' `data:` URL. */
export async function readImageFile(file: File): Promise<string> {
  if (/\.svg$/i.test(file.name)) return file.text()
  return bytesToDataUrl(new Uint8Array(await file.arrayBuffer()), file.name)
}
