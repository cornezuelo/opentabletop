import { Texture } from 'pixi.js'

/** Rasterization size; icons are drawn at most ~1 hex wide, so 256px stays crisp when zoomed. */
const RASTER_SIZE = 256

/**
 * Loads icon images into Pixi textures once and caches them by key. `get` returns
 * null while loading and calls `onLoad` when a texture becomes available.
 */
export class IconTextures {
  private textures = new Map<string, Texture>()
  private loading = new Set<string>()

  constructor(private onLoad: () => void) {}

  get(key: string, url: string): Texture | null {
    const texture = this.textures.get(key)
    if (texture) return texture
    if (!this.loading.has(key)) {
      this.loading.add(key)
      rasterize(url)
        .then((t) => {
          this.textures.set(key, t)
          this.onLoad()
        })
        .catch((error) => console.warn('Icon failed to load', key, error))
        .finally(() => this.loading.delete(key))
    }
    return null
  }

  destroy(): void {
    for (const texture of this.textures.values()) texture.destroy(true)
    this.textures.clear()
  }
}

async function rasterize(url: string): Promise<Texture> {
  const image = new Image()
  image.src = url
  await image.decode()
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = RASTER_SIZE
  const ctx = canvas.getContext('2d')!
  // Contain: keep aspect ratio, centered.
  const ratio = Math.min(
    RASTER_SIZE / (image.naturalWidth || 1),
    RASTER_SIZE / (image.naturalHeight || 1),
  )
  const w = (image.naturalWidth || RASTER_SIZE) * ratio
  const h = (image.naturalHeight || RASTER_SIZE) * ratio
  ctx.drawImage(image, (RASTER_SIZE - w) / 2, (RASTER_SIZE - h) / 2, w, h)
  return Texture.from(canvas)
}
