import { groupBundled, PackLibrary } from '@open-tabletop/pack-ui'
import { travelSystems, type TravelSystem } from '@open-tabletop/session'
import { showToast } from '@open-tabletop/ui-kit'
import { t } from './i18n'

/**
 * Packs bundled at build time: open ones from packs/ and, locally, personal-use ones
 * from packs-private/ (git-ignored; the glob is simply empty when it's missing).
 */
const open = import.meta.glob('../../../../packs/**/*.{yaml,yml,json}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>
const personal = import.meta.glob('@personal-packs/**/*.{yaml,yml,json}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/** Bundled packs plus the user's (shared with the other apps on the same site). */
export const library = new PackLibrary(
  [...groupBundled(open, 'packs'), ...groupBundled(personal, 'packs-private', true)],
  {
    onStorageFull: () => showToast(t('storage.full'), 'error', 8000),
    extraDiagnostics: (registry) => travelSystems(registry).problems,
  },
)

/** Travel systems of the loaded packs (Generic first); recomputed when packs change. */
class Systems {
  list: TravelSystem[] = $derived(travelSystems(library.registry).systems)

  get(id: string): TravelSystem | undefined {
    return this.list.find((s) => s.id === id)
  }
}

export const systems = new Systems()
