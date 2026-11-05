import { IMAGE_FILE } from './loader/load'

/**
 * Images in packs (docs/manual technical File formats): a pack file whose name ends in
 * `.svg`, `.png`, `.webp`, `.jpg` or `.jpeg`. An SVG is kept as its text; the others as a
 * `data:` URL of their bytes, so a pack stays a list of texts (browser storage, undo,
 * fingerprints) and is written back as bytes in a .zip or a folder.
 */
export const isImageFile = (path: string): boolean => IMAGE_FILE.test(path)

/** Whether a pack file is kept as a `data:` URL (an image that isn't an SVG). */
export const isRasterFile = (path: string): boolean => isImageFile(path) && !/\.svg$/i.test(path)

const TYPES: Record<string, string> = {
  png: 'image/png',
  webp: 'image/webp',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
}

/** The media type of a raster image by its name. */
export const imageType = (path: string): string =>
  TYPES[path.split('.').pop()?.toLowerCase() ?? ''] ?? 'application/octet-stream'

/** A raster image's bytes as the `data:` URL a pack keeps. */
export function bytesToDataUrl(bytes: Uint8Array, path: string): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return `data:${imageType(path)};base64,${btoa(binary)}`
}

/** The bytes of a `data:` URL a pack keeps. */
export function dataUrlToBytes(url: string): Uint8Array {
  const binary = atob(url.slice(url.indexOf(',') + 1))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}
