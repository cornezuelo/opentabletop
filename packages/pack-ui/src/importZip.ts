import { confirmAction, showToast } from '@open-tabletop/ui-kit'
import { translator } from './i18n'
import type { PackLibrary } from './library.svelte'
import { manifestOf, type PackSource } from './packs'
import { planImport, zipToPacks } from './zip'

const names = (packs: PackSource[]) =>
  packs.map((p) => `“${manifestOf(p).name ?? p.root}”`).join(', ')

/**
 * Asks for a .zip and adds its packs (one pack, or a system with the packs it brings) to
 * the user's packs as one undo step: packs already here unchanged are left alone, and
 * replacing a different version of one is asked first. Returns the file's packs in its
 * order (or null when nothing was imported).
 */
export function importZip(library: PackLibrary, locale: string): Promise<PackSource[] | null> {
  const t = translator(() => locale)
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.zip,application/zip'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return resolve(null)
      try {
        const packs = zipToPacks(new Uint8Array(await file.arrayBuffer()))
        if (!packs.length) {
          showToast(t('import.noManifest'), 'error')
          return resolve(null)
        }
        const plan = planImport(library.packs, packs)
        if (
          plan.replaced.length &&
          !(await confirmAction(t('import.replace', { packs: names(plan.replaced) })))
        )
          return resolve(null)
        const changed = [...plan.added, ...plan.replaced]
        if (changed.length) library.addPacks(changed)
        showToast(
          [
            changed.length ? t('import.done', { packs: names(changed) }) : '',
            plan.same.length ? t('import.already', { packs: names(plan.same) }) : '',
          ]
            .filter(Boolean)
            .join(' '),
        )
        resolve(packs)
      } catch (error) {
        showToast(t('import.failed', { message: (error as Error).message }), 'error')
        resolve(null)
      }
    }
    input.click()
  })
}
