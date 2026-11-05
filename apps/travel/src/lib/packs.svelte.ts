import { PackLibrary } from '@open-tabletop/pack-ui'
import { bundledPacks } from '@open-tabletop/pack-ui/bundled'
import { systemIdOf, travels, travelSystems, type TravelSystem } from '@open-tabletop/session'
import { showToast } from '@open-tabletop/ui-kit'
import { t } from './i18n'

/** Bundled packs plus the user's (shared with the other apps on the same site). */
export const library = new PackLibrary(bundledPacks, {
  onStorageFull: () => showToast(t('storage.full'), 'error', 8000),
  extraDiagnostics: (registry) => travelSystems(registry).problems,
})

/**
 * Travel systems of the loaded packs (Core's Generic rules first), only those with travel
 * rules: a trip without a map is all travel. Recomputed when packs change.
 */
class Systems {
  list: TravelSystem[] = $derived(travelSystems(library.registry).systems.filter(travels))

  /** A system by id (`generic`, from older links, is Core's). */
  get(id: string): TravelSystem | undefined {
    const wanted = systemIdOf(id)
    return this.list.find((s) => s.id === wanted)
  }
}

export const systems = new Systems()
