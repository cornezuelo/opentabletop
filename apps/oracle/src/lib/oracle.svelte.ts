import { emptyState } from '@open-tabletop/oracle-engine'
import { createOracleUi, localRollerStore, type RollerStore } from '@open-tabletop/oracle-ui'
import { CampaignKeeper, onPlayingChange, playIn, playing } from '@open-tabletop/ui-kit'
import { getLocale } from './i18n'
import { workspace } from './packs/workspace.svelte'

/**
 * The campaign the Oracle rolls in: the one being played (the bar's **Playing**, shared by
 * every app); '' = none, its own state.
 */
export const campaignChoice = {
  get id(): string {
    return playing.id ?? ''
  },
}

// Before the bar's **Playing**, the Oracle remembered a campaign of its own: it becomes the
// one being played if none is.
const OLD_CHOICE = 'opentabletop.oracle.campaign'
try {
  const old = localStorage.getItem(OLD_CHOICE)
  if (old && !playing.id) playIn(old)
  localStorage.removeItem(OLD_CHOICE)
} catch {
  // Nothing to bring.
}

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
  playIn(id || undefined)
}

/** Reads the campaign rolled in (if any) and the roller's state from it. */
function follow(id: string): void {
  if (id) void keeper.open(id, '')
  oracleUi.roller.reload()
}

// The bar, another app or another tab chose another campaign: rolls go there from now on.
onPlayingChange((id) => follow(id ?? ''))
if (campaignChoice.id) void keeper.open(campaignChoice.id, '')
