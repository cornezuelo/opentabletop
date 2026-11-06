import { mapStyles } from '@open-tabletop/map'
import { PackLibrary } from '@open-tabletop/pack-ui'
import { bundledPacks } from '@open-tabletop/pack-ui/bundled'
import { travelSystems, type TravelSystem } from '@open-tabletop/session'
import { showToast } from '@open-tabletop/ui-kit'
import { t } from './i18n'

/** Bundled packs plus the user's (shared with the other apps on the same site). */
export const library = new PackLibrary(bundledPacks, {
  onStorageFull: () => showToast(t('storage.full'), 'error', 8000),
  extraDiagnostics: (registry) => [
    ...travelSystems(registry).problems,
    ...mapStyles(registry).problems,
  ],
})

/** Travel systems of the loaded packs (Generic first); recomputed when packs change. */
class Packs {
  list: TravelSystem[] = $derived(travelSystems(library.registry).systems)

  get(id: string): TravelSystem | undefined {
    return this.list.find((s) => s.id === id)
  }
}

export const systems = new Packs()
