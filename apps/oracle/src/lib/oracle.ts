import { createOracleUi } from '@open-tabletop/oracle-ui'
import { getLocale } from './i18n'
import { workspace } from './packs/workspace.svelte'

export const oracleUi = createOracleUi({
  library: workspace,
  locale: getLocale,
  storageKey: 'opentabletop.oracle',
})
