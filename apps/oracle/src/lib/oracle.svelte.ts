import { emptyState } from '@open-tabletop/oracle-engine'
import { createOracleUi, localRollerStore, type RollerStore } from '@open-tabletop/oracle-ui'
import { CampaignKeeper } from '@open-tabletop/ui-kit'
import { getLocale } from './i18n'
import { workspace } from './packs/workspace.svelte'

/** The campaign the Oracle rolls in, remembered by this browser ('' = none, its own state). */
const CHOICE = 'opentabletop.oracle.campaign'

function readChoice(): string {
  try {
    return localStorage.getItem(CHOICE) ?? ''
  } catch {
    return ''
  }
}

export const campaignChoice = $state({ id: readChoice() })

/** Its own state and history, kept in this browser: rolls without a campaign. */
const own = localRollerStore('opentabletop.oracle')

/** The chosen campaign, read from where campaigns are kept; read again when changed elsewhere. */
export const keeper = new CampaignKeeper(() => oracleUi.roller.reload())

/** The chosen campaign once it's read (undefined without one, or while it's read). */
const chosen = () => {
  const c = keeper.campaign
  return campaignChoice.id && c?.id === campaignChoice.id ? c : undefined
}

/**
 * Rolls keep their decks, once-only entries and history in the chosen campaign (shared with
 * its maps and trips), or in the Oracle's own state without one. The seeded sequence is
 * always this browser's own.
 */
const store: RollerStore = {
  load() {
    const campaign = chosen()
    if (!campaign) return own.load()
    return {
      state: campaign.oracle?.state ?? emptyState(),
      history: campaign.oracle?.history ?? [],
      random: own.load()?.random,
    }
  },
  save(data) {
    const campaign = chosen()
    if (!campaign) return own.save(data)
    keeper.set({ ...campaign, oracle: { state: data.state, history: data.history } })
    const mine = own.load()
    own.save({
      state: mine?.state ?? emptyState(),
      history: mine?.history ?? [],
      random: data.random,
    })
  },
}

export const oracleUi = createOracleUi({
  library: workspace,
  locale: getLocale,
  storageKey: 'opentabletop.oracle',
  store,
})

/** Rolls from now on in a campaign (its id), or in the Oracle's own state (''). */
export function chooseCampaign(id: string): void {
  campaignChoice.id = id
  try {
    localStorage.setItem(CHOICE, id)
  } catch {
    // Not remembered; it still applies now.
  }
  if (id) void keeper.open(id, '')
  oracleUi.roller.reload()
}

if (campaignChoice.id) void keeper.open(campaignChoice.id, '')
