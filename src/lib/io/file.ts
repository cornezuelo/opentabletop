import { FILE_EXTENSION } from '../model/serialize'

/** Saves the map as `<id>.hexmap.json`, so the file can be found from a map link. */
export function downloadMap(json: string, mapId: string): void {
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = mapId + FILE_EXTENSION
  link.click()
  URL.revokeObjectURL(url)
}

/** Opens a file picker and resolves with the file contents, or null if cancelled. */
export function pickMapFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = `${FILE_EXTENSION},.json,application/json`
    input.onchange = () => {
      const file = input.files?.[0]
      if (file) file.text().then(resolve, () => resolve(null))
      else resolve(null)
    }
    input.oncancel = () => resolve(null)
    input.click()
  })
}
