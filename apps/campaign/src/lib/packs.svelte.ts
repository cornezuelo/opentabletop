import { PackLibrary } from '@open-tabletop/pack-ui'
import { bundledPacks } from '@open-tabletop/pack-ui/bundled'
import { missingSystem, systemIdOf, travelSystems, type TravelSystem } from '@open-tabletop/session'
import { showToast } from '@open-tabletop/ui-kit'
import { t } from './i18n'

/** Bundled packs plus the user's (shared with the other apps on the same site). */
export const library = new PackLibrary(bundledPacks, {
  onStorageFull: () => showToast(t('storage.full'), 'error', 8000),
  extraDiagnostics: (registry) => travelSystems(registry).problems,
})

/** The systems of the loaded packs (Core's, the default, first). */
class Systems {
  list: TravelSystem[] = $derived(travelSystems(library.registry).systems)

  /** A system by id (`generic` is Core's); one that doesn't travel if its pack isn't loaded. */
  get(id: string | undefined): TravelSystem {
    const wanted = systemIdOf(id)
    return this.list.find((s) => s.id === wanted) ?? missingSystem(wanted)
  }
}

export const systems = new Systems()
