const MAX_SVG_BYTES = 256 * 1024
const MAX_RASTER_SIDE = 256

export type ImportError = 'tooLarge' | 'unsupported' | 'unreadable'

/**
 * Reads an image file as a data URL suitable for embedding in the map. SVGs are kept
 * as-is (they render through <img>/textures, where scripts never run); raster images
 * are downscaled to keep map files small.
 */
export async function importImageFile(
  file: File,
): Promise<{ name: string; dataUrl: string } | { error: ImportError }> {
  const name = file.name.replace(/\.[^.]+$/, '')
  if (file.type === 'image/svg+xml') {
    if (file.size > MAX_SVG_BYTES) return { error: 'tooLarge' }
    const text = await file.text()
    return { name, dataUrl: `data:image/svg+xml;base64,${toBase64(text)}` }
  }
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type))
    return { error: 'unsupported' }
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_RASTER_SIDE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return { name, dataUrl: canvas.toDataURL('image/png') }
  } catch {
    return { error: 'unreadable' }
  }
}

/** Opens a file picker for images. Resolves with the files chosen (possibly none). */
export function pickImageFiles(): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = 'image/svg+xml,image/png,image/jpeg,image/webp'
    input.onchange = () => resolve([...(input.files ?? [])])
    input.oncancel = () => resolve([])
    input.click()
  })
}

/** UTF-8 safe base64, chunked so large files don't overflow the argument limit. */
function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}
