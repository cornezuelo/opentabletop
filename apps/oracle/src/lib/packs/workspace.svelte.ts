import { PackLibrary } from '@open-tabletop/pack-ui'
import { travelSystems } from '@open-tabletop/session'
import { showToast } from '@open-tabletop/ui-kit'
import { t } from '../i18n'
import { bundledPacks } from './bundled'

/** Bundled packs plus the user's, with the editing operations on user packs. */
export const workspace = new PackLibrary(bundledPacks, {
  onStorageFull: () => showToast(t('storage.full'), 'error', 8000),
  // Travel rules and bindings are checked too, so their problems show like the rest.
  extraDiagnostics: (registry) => travelSystems(registry).problems,
})
