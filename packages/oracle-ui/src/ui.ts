import type { Compiled } from '@open-tabletop/oracle-engine'
import { translator, type Translate } from './i18n'
import type { PackLibrary } from './library.svelte'
import { packTexts, type PackTexts } from './names'
import { Roller, type HistoryItem } from './roller.svelte'

/** Everything the Oracle components need, created once by the host app. */
export interface OracleUi extends PackTexts {
  library: PackLibrary
  roller: Roller
  locale: () => string
  t: Translate
}

export function createOracleUi(options: {
  library: PackLibrary
  /** The host's UI language (reactive getter); also the language of pack texts. */
  locale: () => string
  /** localStorage prefix for the roll state and history (`<key>.state`, `<key>.history`). */
  storageKey: string
  /** Called after every roll, e.g. to log it in a journal. */
  onResult?: (item: HistoryItem, def: Compiled | undefined) => void
}): OracleUi {
  const t = translator(options.locale)
  const roller = new Roller({ ...options, t })
  return {
    ...packTexts(() => options.library.registry, options.locale),
    library: options.library,
    roller,
    locale: options.locale,
    t,
  }
}
