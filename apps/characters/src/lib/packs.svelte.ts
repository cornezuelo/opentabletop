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

/** The systems that have a sheet for their characters: characters are made with theirs. */
class Systems {
  list: (TravelSystem & { sheet: NonNullable<TravelSystem['sheet']> })[] = $derived(
    travelSystems(library.registry).systems.filter(
      (s): s is TravelSystem & { sheet: NonNullable<TravelSystem['sheet']> } => !!s.sheet,
    ),
  )

  /** The first system whose characters are made with a sheet (`pack/id`). */
  ofSheet(sheet: string) {
    return this.list.find((s) => s.sheet.id === sheet)
  }
}

export const systems = new Systems()
