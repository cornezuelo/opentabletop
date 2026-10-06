import { getLocale, t } from '../i18n/index.svelte'
import { newId } from '../model/id'
import { createMap } from '../model/defaults'
import { MapFormatError } from '../model/migrations'
import { deserializeMap, serializeMap } from '../model/serialize'
import type { HexMap } from '../model/types'
import { editor } from '../store/editor.svelte'
import { ask, showToast } from '@open-tabletop/ui-kit'
import type { ExampleMap } from './examples'
import {
  deleteLibraryMap,
  getLibraryMap,
  listLibrary,
  onBeforeBackup,
  onBeforeRestore,
  putLibraryMap,
} from '@open-tabletop/storage'
import { parseDeepLink } from './deepLink'
import { downloadMap, pickMapFile } from './file'
import { mapToBundle, parseMapFile } from './otd'

const CURRENT_KEY = 'hexmapper.currentMap'
const PENDING_KEY = 'hexmapper.pending'

/** Bumped whenever the library changes, so lists can refresh. */
export const library = $state({ version: 0 })

let dirty = false
let timer: ReturnType<typeof setTimeout> | undefined
/** A backup is being restored: nothing may be saved over it before the page reloads. */
let frozen = false

/** Writes the current map to the library now (if it has unsaved changes). */
async function saveCurrent(): Promise<void> {
  clearTimeout(timer)
  if (!dirty || frozen) return
  dirty = false
  const { map } = editor
  try {
    await putLibraryMap({
      id: map.meta.id,
      name: map.meta.name,
      modified: map.meta.modified,
      json: serializeMap(map),
    })
  } catch (error) {
    // Not saved: try again with the next change or when the tab hides.
    dirty = true
    throw error
  }
  clearPending()
  library.version++
}

/** Replaces the open map, saving the previous one to the library first. */
async function switchTo(map: HexMap): Promise<void> {
  await saveCurrent().catch(console.error)
  editor.load(map)
  rememberCurrent(map.meta.id)
  // A loaded map isn't in the library yet if it came from a file.
  dirty = true
  await saveCurrent().catch(console.error)
}

/** Asks first: save the current map to a file, just create, or cancel. */
export async function newMap(): Promise<void> {
  const choice = await ask(t('newMap.title'), t('newMap.message'), [
    { value: 'cancel', label: t('newMap.cancel') },
    { value: 'create', label: t('newMap.create') },
    { value: 'save', label: t('newMap.saveAndCreate'), kind: 'primary' },
  ])
  if (choice !== 'create' && choice !== 'save') return
  if (choice === 'save') saveMap()
  await switchTo(createMap())
}

/** Saves an OTD bundle (`<id>.otd.json`) that other OpenTabletop tools can read. */
export function saveMap(): void {
  downloadMap(JSON.stringify(mapToBundle(editor.map)), editor.map.meta.id)
}

/**
 * Opens a map file into the library; returns the id of the map loaded (null if none).
 * If the library already has a different version of that map, asks before replacing it.
 */
export async function openMapFile(): Promise<string | null> {
  const json = await pickMapFile()
  if (json === null) return null
  try {
    const map = parseMapFile(json)
    if (!(await keepOrCopy(map))) return null
    await switchTo(map)
    showToast(t('file.loaded'))
    return map.meta.id
  } catch (error) {
    showToast(errorMessage(error), 'error')
    return null
  }
}

/**
 * Opens a bundled example. If this browser already has it (with your play and changes),
 * asks whether to go on with that copy or start the example fresh.
 */
export async function openExampleMap(example: ExampleMap): Promise<void> {
  if (await getLibraryMap(example.id)) {
    const choice = await ask(t('library.exampleTitle'), t('library.exampleExists'), [
      { value: 'cancel', label: t('newMap.cancel') },
      { value: 'fresh', label: t('library.exampleFresh'), kind: 'danger' },
      { value: 'open', label: t('library.exampleOpen'), kind: 'primary' },
    ])
    if (choice === 'open') {
      await openLibraryMap(example.id)
      return
    }
    if (choice !== 'fresh') return
  }
  try {
    await switchTo(parseMapFile(example.json))
    showToast(t('file.loaded'))
  } catch (error) {
    showToast(errorMessage(error), 'error')
  }
}

/**
 * A file of a map this browser already has (maybe an older backup): replace the
 * library's copy, keep both (the file gets a new id) or cancel. False on cancel.
 */
async function keepOrCopy(map: HexMap): Promise<boolean> {
  if (map.meta.id === editor.map.meta.id) await saveCurrent().catch(console.error)
  const existing = await getLibraryMap(map.meta.id)
  if (!existing || existing.json === serializeMap(map)) return true
  const date = (iso: string) => new Date(iso).toLocaleString(getLocale())
  const choice = await ask(
    t('file.existsTitle'),
    t('file.exists', {
      name: existing.name || t('map.untitled'),
      mine: date(existing.modified),
      file: date(map.meta.modified),
    }),
    [
      { value: 'cancel', label: t('newMap.cancel') },
      { value: 'copy', label: t('file.keepBoth') },
      { value: 'replace', label: t('file.replace'), kind: 'danger' },
    ],
  )
  if (choice === 'copy') map.meta.id = newId()
  return choice === 'copy' || choice === 'replace'
}

export async function openLibraryMap(id: string): Promise<boolean> {
  if (id === editor.map.meta.id) return true
  const entry = await getLibraryMap(id)
  if (!entry) return false
  try {
    await switchTo(deserializeMap(entry.json))
    return true
  } catch (error) {
    showToast(errorMessage(error), 'error')
    return false
  }
}

export async function removeLibraryMap(id: string): Promise<void> {
  await deleteLibraryMap(id)
  library.version++
  if (id === editor.map.meta.id) {
    dirty = false
    await switchTo(createMap())
  }
}

export { listLibrary }

/**
 * Opens the initial map (deep link, last open map, or newest in the library) and
 * keeps the library in sync with every change. IndexedDB writes are async and can be
 * cut off when the tab closes, so on page hide a synchronous copy also goes to
 * localStorage; on start it wins if it's newer.
 */
export async function startPersistence(): Promise<() => void> {
  try {
    const initial = await initialMap()
    editor.load(initial)
    rememberCurrent(initial.meta.id)
  } catch {
    showToast(t('file.errorAutosave'), 'error')
  }

  const stop = editor.onChange(() => {
    dirty = true
    clearTimeout(timer)
    timer = setTimeout(() => saveCurrent().catch(console.error), 500)
  })
  const saveNow = () => {
    if (!dirty || frozen) return
    writePending(serializeMap(editor.map))
    saveCurrent().catch(console.error)
  }
  const onVisibility = () => document.visibilityState === 'hidden' && saveNow()
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pagehide', saveNow)
  // A backup includes the open map as it is now; a restore must not be overwritten by it.
  const stopBackup = onBeforeBackup(() => saveCurrent())
  const stopRestore = onBeforeRestore(async () => {
    // Saved first, so "add to mine" compares the map as it is now.
    await saveCurrent().catch(console.error)
    frozen = true
    return () => (frozen = false)
  })
  return () => {
    saveCurrent().catch(console.error)
    stop()
    stopBackup()
    stopRestore()
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('pagehide', saveNow)
  }
}

async function initialMap(): Promise<HexMap> {
  const pending = readPending()
  const pendingMap = pending ? safeDeserialize(pending) : null
  const linked = parseDeepLink(location.hash)?.mapId
  const ids = [linked, readCurrent(), (await listLibrary())[0]?.id].filter(
    (id): id is string => !!id,
  )
  for (const id of ids) {
    const entry = await getLibraryMap(id)
    const stored = entry ? safeDeserialize(entry.json) : null
    const fromPending = pendingMap?.meta.id === id ? pendingMap : null
    const newest = [stored, fromPending]
      .filter((m): m is HexMap => !!m)
      .sort((a, b) => b.meta.modified.localeCompare(a.meta.modified))[0]
    if (newest) {
      if (newest === fromPending) dirty = true
      return newest
    }
  }
  if (pendingMap) {
    dirty = true
    return pendingMap
  }
  return createMap()
}

function safeDeserialize(json: string): HexMap | null {
  try {
    return deserializeMap(json)
  } catch {
    return null
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof MapFormatError && error.code === 'newerVersion') return t('file.errorNewer')
  return t('file.errorInvalid')
}

function readCurrent(): string | null {
  try {
    return localStorage.getItem(CURRENT_KEY)
  } catch {
    return null
  }
}

function rememberCurrent(id: string): void {
  try {
    localStorage.setItem(CURRENT_KEY, id)
  } catch {
    // Not remembered; the newest map opens next time.
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
