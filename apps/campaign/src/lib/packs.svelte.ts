import { groupBundled, PackLibrary } from '@open-tabletop/pack-ui'
import { missingSystem, systemIdOf, travelSystems, type TravelSystem } from '@open-tabletop/session'
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
