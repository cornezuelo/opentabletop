import { PackLibrary } from '@open-tabletop/pack-ui'
import { showToast } from '@open-tabletop/ui-kit'
import { t } from '../i18n'
import { bundledPacks } from './bundled'

/** Bundled packs plus the user's, with the editing operations on user packs. */
export const workspace = new PackLibrary(bundledPacks, {
  onStorageFull: () => showToast(t('storage.full'), 'error', 8000),
})
