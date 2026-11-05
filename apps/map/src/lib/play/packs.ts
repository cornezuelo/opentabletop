import { PackLibrary } from '@open-tabletop/pack-ui'
import { bundledPacks } from '@open-tabletop/pack-ui/bundled'

/**
 * Bundled packs plus the user packs made in the Oracle app (shared browser storage when
 * both apps are served from the same origin).
 */
export const library = new PackLibrary(bundledPacks)
