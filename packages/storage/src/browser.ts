import {
  backupFileName,
  createBackup,
  KEY_PREFIXES,
  planRestore,
  type Backup,
  type RestoreMode,
} from './backup'
import { allLibraryMaps, listLibrary, updateLibrary } from './mapLibrary'

type Hook = () => void | Promise<void>
/** May return what to do if the restore fails (e.g. start saving again). */
type RestoreHook = () => void | (() => void) | Promise<void | (() => void)>

const beforeBackup = new Set<Hook>()
const beforeRestore = new Set<RestoreHook>()

/** An app with state still in memory (e.g. the open map) writes it out before a backup. */
export function onBeforeBackup(hook: Hook): () => void {
  beforeBackup.add(hook)
  return () => beforeBackup.delete(hook)
}

/**
 * An app that saves by itself (e.g. autosave when the page hides) stops before a restore,
 * so it can't write its old state over the restored one while the page reloads.
 */
export function onBeforeRestore(hook: RestoreHook): () => void {
  beforeRestore.add(hook)
  return () => beforeRestore.delete(hook)
}

/** The apps' localStorage entries. */
function readStorage(): Record<string, string> {
  const out: Record<string, string> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && KEY_PREFIXES.some((p) => key.startsWith(p)))
      out[key] = localStorage.getItem(key) ?? ''
  }
  return out
}

/** Everything the apps keep in this browser, as a backup. */
export async function makeBackup(): Promise<Backup> {
  for (const hook of beforeBackup) await hook()
  return createBackup(readStorage(), await allLibraryMaps())
}

export function downloadBackup(backup: Backup): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup)], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = backupFileName(backup.created)
  link.click()
  URL.revokeObjectURL(url)
}

/** Opens a file picker; resolves with the file's text, or null if cancelled. */
export function pickBackupFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.onchange = () => {
      const file = input.files?.[0]
      if (file) file.text().then(resolve, () => resolve(null))
      else resolve(null)
    }
    input.oncancel = () => resolve(null)
    input.click()
  })
}

/** Writes a backup into this browser. The page should reload afterwards. */
export async function restoreBackup(backup: Backup, mode: RestoreMode): Promise<void> {
  const undo: (() => void)[] = []
  try {
    for (const hook of beforeRestore) {
      const after = await hook()
      if (after) undo.push(after)
    }
    const plan = planRestore({ storage: readStorage(), maps: await listLibrary() }, backup, mode)
    await updateLibrary(plan.putMaps, plan.removeMaps)
    for (const [key, value] of Object.entries(plan.storage))
      if (value === null) localStorage.removeItem(key)
      else localStorage.setItem(key, value)
  } catch (error) {
    for (const after of undo) after()
    throw error
  }
}
