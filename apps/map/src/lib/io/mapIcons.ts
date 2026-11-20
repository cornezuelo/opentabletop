/**
 * Map's imported icons and glyphs in the image library (docs/character-pictures.md §8): a map
 * keeps the images it uses in its `assets` (so its file opens anywhere), and each is kept in the
 * library too, by the same id, added for `icon`, so every other map offers it. An SVG is kept
 * there drawn as a PNG (the library takes no SVG: it may hold scripts).
 */
import { getImageEntry, IMAGE_FORMAT, putImage, type LibraryImage } from '@open-tabletop/storage'
import type { MapAsset } from '@open-tabletop/map'

/** What the library's pictures for icons were added for. */
export const ICON_USE = 'icon'

/** The longest side of an SVG drawn for the library, as raster imports are shrunk. */
const SVG_SIDE = 256

/** An image's data URL as the library keeps it: a picture's as it is, an SVG's drawn. */
async function asPicture(
  dataUrl: string,
): Promise<{ data: string; width: number; height: number }> {
  const image = new Image()
  image.src = dataUrl
  await image.decode()
  const width = image.naturalWidth || SVG_SIDE
  const height = image.naturalHeight || SVG_SIDE
  if (!dataUrl.startsWith('data:image/svg')) return { data: dataUrl, width, height }
  const scale = SVG_SIDE / Math.max(width, height)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))
  canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height)
  return { data: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height }
}

/**
 * Keeps a map's images in the library: those it hasn't got by that id (one it has stays as its
 * owner left it). Returns how many were added; one that can't be read is left out.
 */
export async function keepMapIcons(
  assets: readonly MapAsset[],
  modified = new Date().toISOString(),
): Promise<number> {
  let added = 0
  for (const asset of assets) {
    try {
      if (await getImageEntry(asset.id)) continue
      const picture = await asPicture(asset.dataUrl)
      await putImage({
        id: asset.id,
        name: asset.name || asset.id,
        modified,
        format: IMAGE_FORMAT,
        tags: [],
        use: ICON_USE,
        ...picture,
      })
      added++
    } catch {
      // No library here, or an image the browser can't draw: the map keeps it all the same.
    }
  }
  return added
}

/** A picture the pickers show: the map's own, or one of the library's it hasn't got. */
export interface IconChoice {
  id: string
  name: string
  url: string
}

/** The map's images, then the library's icons it hasn't got, each chosen as `asset:<id>`. */
export function iconChoices(
  assets: readonly MapAsset[],
  library: readonly LibraryImage[],
): IconChoice[] {
  const own = new Set(assets.map((a) => a.id))
  return [
    ...assets.map((a) => ({ id: a.id, name: a.name, url: a.dataUrl })),
    ...library.filter((i) => !own.has(i.id)).map((i) => ({ id: i.id, name: i.name, url: i.data })),
  ]
}

/**
 * The asset an icon chosen from the library becomes on this map (`asset:<id>` of a library
 * picture it hasn't got), or null when there's nothing to add (bundled, or the map's already).
 */
export function assetToAdd(
  iconId: string | undefined,
  assets: readonly MapAsset[],
  library: readonly LibraryImage[],
): MapAsset | null {
  if (!iconId?.startsWith('asset:')) return null
  const id = iconId.slice('asset:'.length)
  if (assets.some((a) => a.id === id)) return null
  const image = library.find((i) => i.id === id)
  return image ? { id, name: image.name, dataUrl: image.data } : null
}
