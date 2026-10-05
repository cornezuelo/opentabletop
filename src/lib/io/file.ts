import { FILE_EXTENSION } from '../model/serialize'

export function downloadMap(json: string, mapName: string): void {
  const slug =
    mapName
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'map'
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = slug + FILE_EXTENSION
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
