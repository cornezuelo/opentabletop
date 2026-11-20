/**
 * The user's images in IndexedDB (docs/character-pictures.md §8): one library every app
 * shares, keyed by image id, for portraits, banners, icons and whatever names an image. Each
 * entry's `json` is an `ImageData` (the picture shrunk already, as a data URL, and what it
 * was made for); backups copy them as they are. Every write is announced on
 * `opentabletop.images`, so an app showing one reads it again.
 */
import { createLibrary, type LibraryEntry } from './library'

/** The channel the images' changes go out on. */
export const IMAGES_CHANNEL = 'opentabletop.images'

/** v1: a data URL, its size, its tags and what it was made for. */
export const IMAGE_FORMAT = 1

/** An image as the library keeps it. */
export interface ImageData {
  format: typeof IMAGE_FORMAT
  /** The picture itself, shrunk as it was added (`data:image/webp;base64,…`). */
  data: string
  width: number
  height: number
  /** Words to find it by (`wolf`, `portrait`). */
  tags: string[]
  /** What it was added for (`portrait`, `icon`, `banner`…), to offer it there first. */
  use?: string
}

/** An image of the library: its entry's id, name and date, and its data. */
export interface LibraryImage extends ImageData {
  id: string
  name: string
  modified: string
}

/** An image as a library entry. */
export function imageEntry(image: LibraryImage): LibraryEntry {
  const { id, name, modified, ...data } = image
  return { id, name, modified, json: JSON.stringify(data) }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** An entry read back as an image; undefined if it isn't one (or is of a newer format). */
export function readImage(entry: LibraryEntry): LibraryImage | undefined {
  let raw: unknown
  try {
    raw = JSON.parse(entry.json)
  } catch {
    return undefined
  }
  if (!isRecord(raw) || raw.format !== IMAGE_FORMAT) return undefined
  if (typeof raw.data !== 'string' || !raw.data.startsWith('data:image/')) return undefined
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
  return {
    id: entry.id,
    name: entry.name,
    modified: entry.modified,
    format: IMAGE_FORMAT,
    data: raw.data,
    width: n(raw.width),
    height: n(raw.height),
    tags: Array.isArray(raw.tags) ? raw.tags.filter((t): t is string => typeof t === 'string') : [],
    ...(typeof raw.use === 'string' && { use: raw.use }),
  }
}

const images = createLibrary('images', IMAGES_CHANNEL)

export const putImageEntry = images.put
export const getImageEntry = images.get
export const deleteImage = images.delete
/** All images, newest first, without their data (for listing). */
export const listImages = images.list
/** Every image with its data (for backups). */
export const allImages = images.all
/** Writes several images and deletes others in one transaction (restoring a backup). */
export const updateImages = images.update
/** Calls `listener` whenever another window or app changes an image. */
export const onImageChange = images.onChange
/** Like `onImageChange`, and for this page's own writes too (what shows a picture by id). */
export const onAnyImageChange: typeof images.onAnyChange = (listener) =>
  images.onAnyChange(listener)

/** Keeps an image in the library. */
export const putImage = (image: LibraryImage) => images.put(imageEntry(image))

/** An image of the library, or null if there's none by that id (or it isn't readable). */
export async function getImage(id: string): Promise<LibraryImage | null> {
  const entry = await images.get(id)
  return (entry && readImage(entry)) ?? null
}

/**
 * An image carried inside a file (an OTD bundle's `images`), so a map or a character sent to
 * someone else shows its pictures: the library's image without its date.
 */
export type CarriedImage = Omit<LibraryImage, 'format' | 'modified'>

/**
 * The library images a file's data names: every string under a key `picture` (a character's
 * portrait, a party's banner, an item's picture), wherever it is, once each.
 */
export function picturesNamed(value: unknown, found = new Set<string>()): string[] {
  if (Array.isArray(value)) for (const v of value) picturesNamed(v, found)
  else if (isRecord(value))
    for (const [key, v] of Object.entries(value))
      if (key === 'picture' && typeof v === 'string' && v) found.add(v)
      else picturesNamed(v, found)
  return [...found]
}

/** The library's images by id, to carry in a file; those it doesn't have are left out. */
export async function imagesToCarry(ids: readonly string[]): Promise<CarriedImage[]> {
  const read = await Promise.all(ids.map((id) => getImage(id).catch(() => null)))
  return read.flatMap((image) => {
    if (!image) return []
    const carried: Partial<LibraryImage> = { ...image }
    delete carried.format
    delete carried.modified
    return [carried as CarriedImage]
  })
}

/**
 * A file's images (`images` of an OTD bundle), those that are pictures: a data URL of an image
 * other than SVG (it may hold scripts), with an id. Anything else is left out.
 */
export function carriedImages(raw: unknown): CarriedImage[] {
  const list = isRecord(raw) && Array.isArray(raw.images) ? raw.images : []
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
  return list.flatMap((image) => {
    if (!isRecord(image) || typeof image.id !== 'string' || !image.id) return []
    const data = image.data
    if (typeof data !== 'string' || !data.startsWith('data:image/')) return []
    if (data.startsWith('data:image/svg')) return []
    return [
      {
        id: image.id,
        name: typeof image.name === 'string' ? image.name : image.id,
        data,
        width: n(image.width),
        height: n(image.height),
        tags: Array.isArray(image.tags)
          ? image.tags.filter((t): t is string => typeof t === 'string')
          : [],
        ...(typeof image.use === 'string' && { use: image.use }),
      },
    ]
  })
}

/**
 * Keeps a file's images in the library: those it hasn't got by that id (one it has stays as
 * it is, renamed or tagged by its owner). Returns how many were added.
 */
export async function keepCarriedImages(
  images: readonly CarriedImage[],
  modified = new Date().toISOString(),
): Promise<number> {
  let added = 0
  for (const image of images) {
    if (await getImageEntry(image.id)) continue
    await putImage({ ...image, format: IMAGE_FORMAT, modified })
    added++
  }
  return added
}

/** A file's data with the library images it names carried in its `images` (none: as it was). */
export async function withCarriedImages<T extends object>(
  data: T,
): Promise<T & { images?: CarriedImage[] }> {
  const images = await imagesToCarry(picturesNamed(data))
  return images.length ? { ...data, images } : data
}
