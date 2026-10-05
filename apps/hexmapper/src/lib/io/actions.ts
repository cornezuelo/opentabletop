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
  downloadMap(serializeMap(editor.map), editor.map.meta.id)
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

const PENDING_KEY = 'hexmapper.autosave.pending'

/**
 * Restores the last session, then keeps IndexedDB in sync with every change.
 * IndexedDB writes are async and can be cut off when the tab closes, so on page hide
 * a synchronous copy also goes to localStorage; on start the newest of both wins.
 */
export async function startAutosave(): Promise<() => void> {
  try {
    const candidates = [await loadAutosave(), readPending()]
      .filter((json): json is string => !!json)
      .map((json) => deserializeMap(json))
    const newest = candidates.sort((a, b) => b.meta.modified.localeCompare(a.meta.modified))[0]
    if (newest) editor.load(newest)
  } catch {
    showToast(t('file.errorAutosave'), 'error')
  }

  let timer: ReturnType<typeof setTimeout> | undefined
  let dirty = false
  const save = () => {
    clearTimeout(timer)
    if (!dirty) return
    dirty = false
    saveAutosave(serializeMap(editor.map))
      .then(clearPending)
      .catch(console.error)
  }
  const saveNow = () => {
    if (!dirty) return
    writePending(serializeMap(editor.map))
    save()
  }
  const stop = editor.onChange(() => {
    dirty = true
    clearTimeout(timer)
    timer = setTimeout(save, 500)
  })
  const onVisibility = () => document.visibilityState === 'hidden' && saveNow()
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pagehide', saveNow)
  return () => {
    save()
    stop()
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('pagehide', saveNow)
  }
}

function readPending(): string | null {
  try {
    return localStorage.getItem(PENDING_KEY)
  } catch {
    return null
  }
}

function writePending(json: string): void {
  try {
    localStorage.setItem(PENDING_KEY, json)
  } catch {
    // Quota exceeded (large embedded assets) or storage disabled: IndexedDB still tries.
  }
}

function clearPending(): void {
  try {
    localStorage.removeItem(PENDING_KEY)
  } catch {
    // Ignore.
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof MapFormatError && error.code === 'newerVersion') return t('file.errorNewer')
  return t('file.errorInvalid')
}
