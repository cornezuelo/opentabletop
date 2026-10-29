import { createBackup, makeBackup, restoreBackup } from '@open-tabletop/storage'
import { readKept, type Kept } from './kept'
import { planImport } from './plan'
import { exportFileName, writeExport } from './zip'

/**
 * What this browser keeps, after every app wrote out what it holds in memory (as for a
 * backup), with its storage entries as they are.
 */
export async function keptHere(): Promise<{ kept: Kept; storage: Record<string, string> }> {
  const backup = await makeBackup()
  return { kept: readKept(backup.storage, backup.maps, backup.campaigns), storage: backup.storage }
}

/** Saves the chosen things as an export's .zip. */
export function downloadExport(kept: Kept, chosen: ReadonlySet<string>): void {
  const created = new Date().toISOString()
  const url = URL.createObjectURL(
    new Blob([writeExport(kept, chosen, created) as BlobPart], { type: 'application/zip' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = exportFileName(created)
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Opens a file picker for an export; resolves with its bytes, or null if cancelled. */
export function pickExportFile(): Promise<Uint8Array | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.zip,application/zip'
    input.onchange = () => {
      const file = input.files?.[0]
      if (file)
        file.arrayBuffer().then(
          (buffer) => resolve(new Uint8Array(buffer)),
          () => resolve(null),
        )
      else resolve(null)
    }
    input.oncancel = () => resolve(null)
    input.click()
  })
}

/**
 * Imports the chosen things of an export into this browser, beside what it has (replacing
 * what has the same id). Apps that save by themselves stop first, as for a restore; the
 * page should reload afterwards.
 */
export async function importChosen(incoming: Kept, chosen: ReadonlySet<string>): Promise<void> {
  const { storage } = await keptHere()
  const plan = planImport(storage, incoming, chosen)
  // A backup of only what changes, added to what's here: each entry already holds the
  // joined list, and the library entries are newer than what they replace.
  await restoreBackup(createBackup(plan.storage, plan.putMaps, plan.putCampaigns), 'merge')
}
