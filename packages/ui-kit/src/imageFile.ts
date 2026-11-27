/**
 * Pictures from the user's files into the image library (docs/character-pictures.md §2, §9):
 * a file read as a picture (SVG refused: it may hold scripts), and drawn framed at its
 * slot's shape, shrunk, as WebP (JPEG where the browser can't write WebP).
 */
import { IMAGE_FORMAT, putImage, type LibraryImage } from '@open-tabletop/storage'
import { FRAMED, framedDraw, imageName, ownAspect, type Framing } from './imageFrame'

/** Why a file isn't taken: not a picture, or one we refuse. */
export class ImageFileError extends Error {
  constructor(readonly code: 'notImage' | 'svg' | 'unreadable') {
    super(code)
  }
}

/**
 * A file read as a picture, ready to draw and to show while it's framed: its `src` lives until
 * `releaseImage` (an object URL of the file).
 */
export async function readImageFile(file: Blob): Promise<HTMLImageElement> {
  if (file.type === 'image/svg+xml') throw new ImageFileError('svg')
  if (!file.type.startsWith('image/')) throw new ImageFileError('notImage')
  const image = new Image()
  image.src = URL.createObjectURL(file)
  try {
    await image.decode()
    return image
  } catch {
    releaseImage(image)
    throw new ImageFileError('unreadable')
  }
}

/** A picture read from a file let go, once it's been framed (or not). */
export function releaseImage(image: HTMLImageElement | undefined): void {
  if (image?.src.startsWith('blob:')) URL.revokeObjectURL(image.src)
}

/** The first picture among what was dropped or pasted, if any. */
export function pictureIn(data: DataTransfer | null): File | undefined {
  return [...(data?.files ?? [])].find((f) => f.type.startsWith('image/'))
}

/** A picture drawn framed, as it's kept: a data URL and its size. */
export function drawFramed(
  image: HTMLImageElement,
  aspect: number,
  framing: Framing,
): { data: string; width: number; height: number } {
  const size = { width: image.naturalWidth, height: image.naturalHeight }
  const draw = framedDraw(size, aspect, framing)
  const canvas = document.createElement('canvas')
  canvas.width = draw.width
  canvas.height = draw.height
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.translate(draw.centerX, draw.centerY)
  if (draw.flip) ctx.scale(-1, 1)
  ctx.rotate(draw.rotation)
  ctx.scale(draw.scale, draw.scale)
  ctx.drawImage(image, -size.width / 2, -size.height / 2)
  let data = canvas.toDataURL('image/webp', 0.85)
  // A browser that can't write WebP gives PNG back: JPEG is far smaller.
  if (!data.startsWith('data:image/webp')) data = canvas.toDataURL('image/jpeg', 0.85)
  return { data, width: draw.width, height: draw.height }
}

/**
 * A picture dropped or pasted where it's shown whole (a page of Notes): kept in the image
 * library at once, as it is (shrunk, no framing asked), for `use`. Throws `ImageFileError`.
 */
export async function keepPictureFile(file: File, use: string): Promise<LibraryImage> {
  const source = await readImageFile(file)
  try {
    const drawn = drawFramed(source, ownAspect(drawnSize(source)), FRAMED)
    const image: LibraryImage = {
      id: crypto.randomUUID(),
      name: imageName(file.name),
      modified: new Date().toISOString(),
      format: IMAGE_FORMAT,
      ...drawn,
      tags: [],
      use,
    }
    await putImage(image)
    return image
  } finally {
    releaseImage(source)
  }
}

const drawnSize = (image: HTMLImageElement) => ({
  width: image.naturalWidth,
  height: image.naturalHeight,
})
