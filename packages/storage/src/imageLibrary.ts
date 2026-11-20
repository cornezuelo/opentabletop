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
