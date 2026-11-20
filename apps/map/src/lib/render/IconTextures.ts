import { Texture } from 'pixi.js'

/** Rasterization size; icons are drawn at most ~1 hex wide, so 256px stays crisp when zoomed. */
const RASTER_SIZE = 256

/**
 * How an image is laid in its texture: `contain`, fitted whole in a square (icons and art);
 * `natural`, at its own size (up to 1024 px a side) and repeatable (an image laid over the map
 * as a texture); `disc`, filling a square and clipped round (a token's picture).
 */
export type TextureFit = 'contain' | 'natural' | 'disc'

/** The square of an image a disc shows (a picture's face), in the image's pixels. */
export interface Crop {
  x: number
  y: number
  side: number
}

/**
 * Loads icon images into Pixi textures once and caches them by key. `get` returns
 * null while loading and calls `onLoad` once the textures asked for are available: once
 * for all those loading together (each redraws the map, so not once for each).
 */
export class IconTextures {
  private textures = new Map<string, Texture>()
  private loading = new Set<string>()
  /** Some texture came since `onLoad` was last called. */
  private loaded = false

  constructor(private onLoad: () => void) {}

  get(key: string, url: string, fit: TextureFit = 'contain', crop?: Crop): Texture | null {
    const texture = this.textures.get(key)
    if (texture) return texture
    if (!this.loading.has(key)) {
      this.loading.add(key)
      rasterize(url, fit, crop)
        .then((t) => {
          this.textures.set(key, t)
          this.loaded = true
        })
        .catch((error) => console.warn('Icon failed to load', key, error))
        .finally(() => {
          this.loading.delete(key)
          if (this.loading.size || !this.loaded) return
          this.loaded = false
          this.onLoad()
        })
    }
    return null
  }

  /** Drops a texture, so the next `get` loads it again (its image changed). */
  forget(key: string): void {
    this.textures.get(key)?.destroy(true)
    this.textures.delete(key)
  }

  destroy(): void {
    for (const texture of this.textures.values()) texture.destroy(true)
    this.textures.clear()
  }
}

async function rasterize(url: string, fit: TextureFit, crop?: Crop): Promise<Texture> {
  const image = new Image()
  image.src = url
  await image.decode()
  const canvas = document.createElement('canvas')
  if (fit === 'natural') {
    const fit = Math.min(1, 1024 / Math.max(image.naturalWidth || 1, image.naturalHeight || 1))
    canvas.width = Math.max(1, Math.round((image.naturalWidth || RASTER_SIZE) * fit))
    canvas.height = Math.max(1, Math.round((image.naturalHeight || RASTER_SIZE) * fit))
    canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height)
    const texture = Texture.from(canvas)
    texture.source.addressMode = 'repeat'
    return texture
  }
  canvas.width = canvas.height = RASTER_SIZE
  const ctx = canvas.getContext('2d')!
  if (fit === 'disc') {
    ctx.beginPath()
    ctx.arc(RASTER_SIZE / 2, RASTER_SIZE / 2, RASTER_SIZE / 2, 0, Math.PI * 2)
    ctx.clip()
    if (crop) {
      ctx.drawImage(image, crop.x, crop.y, crop.side, crop.side, 0, 0, RASTER_SIZE, RASTER_SIZE)
      return Texture.from(canvas)
    }
  }
  // Contain: keep aspect ratio, centered; a disc is covered, cropping the longer side.
  const ratio = (fit === 'disc' ? Math.max : Math.min)(
    RASTER_SIZE / (image.naturalWidth || 1),
    RASTER_SIZE / (image.naturalHeight || 1),
  )
  const w = (image.naturalWidth || RASTER_SIZE) * ratio
  const h = (image.naturalHeight || RASTER_SIZE) * ratio
  ctx.drawImage(image, (RASTER_SIZE - w) / 2, (RASTER_SIZE - h) / 2, w, h)
  return Texture.from(canvas)
}
