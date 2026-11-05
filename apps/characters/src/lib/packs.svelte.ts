import type { Sheet } from '@open-tabletop/character-engine'
import { PackLibrary } from '@open-tabletop/pack-ui'
import { bundledPacks } from '@open-tabletop/pack-ui/bundled'
import { systemSheets, travelSystems, type TravelSystem } from '@open-tabletop/session'
import { showToast } from '@open-tabletop/ui-kit'
import { t } from './i18n'

/** Bundled packs plus the user's (shared with the other apps on the same site). */
export const library = new PackLibrary(bundledPacks, {
  onStorageFull: () => showToast(t('storage.full'), 'error', 8000),
  extraDiagnostics: (registry) => travelSystems(registry).problems,
})

/** A system that has a sheet for its characters. */
export type CharacterSystem = TravelSystem & { sheet: NonNullable<TravelSystem['sheet']> }

/** The systems that have a sheet for their characters: characters are made with theirs. */
class Systems {
  list: CharacterSystem[] = $derived(
    travelSystems(library.registry).systems.filter((s): s is CharacterSystem => !!s.sheet),
  )

  /**
   * The system a sheet (`pack/id`) belongs to, and the sheet: any of its sheets (its
   * characters', its party's, its factions', its templates'), so a copy of a template on a
   * sheet of its own (a beast's) is found too. Systems whose characters use it come first.
   */
  sheetOf(sheet: string): { system: CharacterSystem; def: Sheet } | undefined {
    const own = this.list.find((s) => s.sheet.id === sheet)
    if (own) return { system: own, def: own.sheet.def }
    for (const system of this.list) {
      const def = systemSheets(system)[sheet]
      if (def) return { system, def }
    }
    return undefined
  }

  /** The system a sheet (`pack/id`) belongs to. */
  ofSheet(sheet: string) {
    return this.sheetOf(sheet)?.system
  }
}

export const systems = new Systems()
