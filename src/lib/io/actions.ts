import { t } from '../i18n/index.svelte'
import { createMap } from '../model/defaults'
import { MapFormatError } from '../model/migrations'
import { deserializeMap, serializeMap } from '../model/serialize'
import { editor } from '../store/editor.svelte'
import { showToast } from '../store/toasts.svelte'
import { loadAutosave, saveAutosave } from './autosave'
import { downloadMap, pickMapFile } from './file'

export function newMap(): void {
  if (confirm(t('file.confirmNew'))) editor.load(createMap())
}

export function saveMap(): void {
  downloadMap(serializeMap(editor.map), editor.map.meta.name || t('map.untitled'))
}

export async function openMap(): Promise<void> {
  const json = await pickMapFile()
  if (json === null) return
  try {
    editor.load(deserializeMap(json))
    showToast(t('file.loaded'))
  } catch (error) {
    showToast(errorMessage(error), 'error')
  }
}

/** Restores the last session, then keeps IndexedDB in sync with every change. */
export async function startAutosave(): Promise<() => void> {
  try {
    const json = await loadAutosave()
    if (json) editor.load(deserializeMap(json))
  } catch {
    showToast(t('file.errorAutosave'), 'error')
  }

  let timer: ReturnType<typeof setTimeout> | undefined
  const stop = editor.onChange(() => {
    clearTimeout(timer)
    timer = setTimeout(() => saveAutosave(serializeMap(editor.map)).catch(console.error), 500)
  })
  return () => {
    clearTimeout(timer)
    stop()
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof MapFormatError && error.code === 'newerVersion') return t('file.errorNewer')
  return t('file.errorInvalid')
}
