import type { Compiled } from '@open-tabletop/oracle-engine'
import { translator, type Translate } from './i18n'
import type { PackLibrary } from '@open-tabletop/pack-ui'
import { packTexts, type PackTexts } from './names'
import { localRollerStore, Roller, type HistoryItem, type RollerStore } from './roller.svelte'

/** Everything the Oracle components need, created once by the host app. */
export interface OracleUi extends PackTexts {
  library: PackLibrary
  roller: Roller
  locale: () => string
  t: Translate
  /** Whether the host shows this pack's definitions (e.g. a map that works with some packs). */
  showsPack: (packId: string) => boolean
}

export function createOracleUi(options: {
  library: PackLibrary
  /** The host's UI language (reactive getter); also the language of pack texts. */
  locale: () => string
  /** localStorage prefix for the roll state and history (`<key>.state`, `<key>.history`). */
  storageKey: string
  /** Somewhere else to keep them instead (e.g. the Hexmapper's open map). */
  store?: RollerStore
  /** Called after every roll, e.g. to log it in a journal. */
  onResult?: (item: HistoryItem, def: Compiled | undefined) => void
  /** The packs to show, by id (reactive getter); undefined shows them all. */
  packs?: () => readonly string[] | undefined
}): OracleUi {
  const t = translator(options.locale)
  const roller = new Roller({
    ...options,
    store: options.store ?? localRollerStore(options.storageKey),
    t,
  })
  return {
    ...packTexts(() => options.library.registry, options.locale),
    library: options.library,
    roller,
    locale: options.locale,
    t,
    showsPack: (packId) => {
      const shown = options.packs?.()
      return !shown || shown.includes(packId)
    },
  }
}
