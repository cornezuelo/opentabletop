import {
  bringClocks,
  createCampaign,
  serializeCampaign,
  missingClocks,
  startWorld,
  worldAct,
  type Campaign,
  type WorldDone,
  type WorldHost,
} from '@open-tabletop/campaign'
import {
  campaignTexts,
  clockFilledText,
  worldWords,
  type WorldControls,
} from '@open-tabletop/campaign-ui'
import { newId } from '@open-tabletop/map'
import { mathRandom } from '@open-tabletop/random'
import { calendarOf, localize, type TravelSystem } from '@open-tabletop/session'
import {
  deleteCampaign,
  listCampaigns,
  onCampaignChange,
  putCampaign,
} from '@open-tabletop/storage'
import { campaignPlaces, type CampaignPlace } from '@open-tabletop/travel-ui'
import { CampaignKeeper, confirmAction, showToast } from '@open-tabletop/ui-kit'
import type { WeatherModel } from '@open-tabletop/weather-engine'
import { getLocale, t } from './i18n'
import { library, systems } from './packs.svelte'

/**
 * The campaigns this browser keeps (`@open-tabletop/storage`), and the one open: its world
 * clock played here without a map (`@open-tabletop/campaign`), kept as it changes and read
 * again when another app changes it (the Hexmapper, Travel, the Oracle).
 */

export interface CampaignItem {
  id: string
  name: string
  modified: string
}

class Campaigns {
  /** Every campaign kept in this browser, newest first. */
  list = $state<CampaignItem[]>([])
  loaded = $state(false)

  constructor() {
    onCampaignChange(() => void this.refresh())
    void this.refresh()
  }

  async refresh(): Promise<void> {
    this.list = (await listCampaigns().catch(() => [])).map(({ id, name, modified }) => ({
      id,
      name,
      modified,
    }))
    this.loaded = true
  }
}

export const campaigns = new Campaigns()

/** What the campaign's world plays with here: its system, every loaded pack's Oracle. */
export function worldHost(campaign: Campaign, system: TravelSystem): WorldHost {
  const factions = campaign.factions
  return {
    calendar: calendarOf(system),
    clocks: system.clocks,
    fallback: system.locale,
    weather: weatherModel(system),
    factions: factions ? systems.get(factions.system).factions : undefined,
    oracle: library.engine,
    random: mathRandom(),
    locale: getLocale(),
    // A trip going on elsewhere: the world's weather is its own then (not rolled here).
    ...(campaign.playing && { trip: {} }),
    words: worldWords(getLocale),
  }
}

/**
 * The weather model the world clock's own weather is rolled on: the one the system's
 * weather check uses (its bindings' `weather:`), else the first it names.
 */
function weatherModel(system: TravelSystem): WeatherModel | undefined {
  const bound = Object.values(system.bindings?.on ?? {}).find((b) => b.weather)?.weather
  return (bound ? system.weather?.[bound] : undefined) ?? Object.values(system.weather ?? {})[0]
}

/** The campaign open in the app. */
class OpenCampaign {
  private readonly keeper = new CampaignKeeper()
  /** The id asked for, and whether it's kept here (false: not in this browser). */
  id = $state('')
  found = $state<boolean | undefined>(undefined)

  get campaign(): Campaign | undefined {
    const c = this.keeper.campaign
    return c?.id === this.id ? c : undefined
  }

  /** The system its maps and trips play (one that doesn't travel if its pack isn't loaded). */
  get system(): TravelSystem {
    return systems.get(this.campaign?.system)
  }

  /** Opens a campaign kept in this browser. */
  async open(id: string): Promise<void> {
    if (this.id === id && this.found) return
    this.id = id
    this.found = undefined
    const kept = await this.keeper.read(id)
    if (this.id !== id) return
    if (!kept) {
      this.found = false
      return
    }
    await this.keeper.open(id, kept.name)
    if (this.id === id) this.found = true
  }

  /** Changes the open campaign (its name, notes…) and keeps it. */
  set(next: Campaign): void {
    this.keeper.set(next)
    void campaigns.refresh()
  }

  host(): WorldHost | undefined {
    return this.campaign && worldHost(this.campaign, this.system)
  }

  /** Keeps what the world did, and tells the clocks that filled on the way. */
  private take(done: WorldDone): void {
    this.set(done.campaign)
    for (const { clock, text } of done.filled)
      showToast(clockFilledText(getLocale(), clock, text), 'info', 8000)
  }

  private act(action: Parameters<typeof worldAct>[1]): void {
    const campaign = this.campaign
    const host = this.host()
    if (campaign && host) this.take(worldAct({ campaign }, action, host))
  }

  /** What the world clock's UI does here: the campaign alone, without a map or a trip. */
  readonly controls: WorldControls = {
    start: (time) => {
      const campaign = this.campaign
      const host = this.host()
      if (campaign && host) this.take(startWorld({ campaign }, time, host))
    },
    stop: () => {
      const campaign = this.campaign
      if (!campaign) return
      const next = { ...campaign }
      delete next.world
      this.set(next)
    },
    act: (action) => this.act(action),
    advance: async (how) =>
      this.act(
        'minutes' in how
          ? { type: 'advance', minutes: how.minutes }
          : { type: 'advanceUntil', until: how.until },
      ),
    setDate: async (time) => {
      const world = this.campaign?.world
      if (!world || time === world.time) return
      if (time > world.time) return this.act({ type: 'advance', minutes: time - world.time })
      if (this.campaign?.playing) return void showToast(t('campaign.noRewindTrip'), 'error')
      const texts = campaignTexts[getLocale()] ?? campaignTexts.en
      if (await confirmAction(texts.world.confirmRewind)) this.act({ type: 'rewind', time })
    },
    bringClocks: () => {
      const campaign = this.campaign
      const host = this.host()
      if (campaign && host) this.take(bringClocks({ campaign }, host))
    },
  }

  /** How many clocks the system declares that the world doesn't have. */
  missing(): number {
    const campaign = this.campaign
    const host = this.host()
    return campaign && host ? missingClocks(campaign, host).length : 0
  }

  /** The world's own weather today (none while a trip goes on: it's the trip's then). */
  weather(): { name: string } | undefined {
    const campaign = this.campaign
    const id = campaign?.worldWeather?.weather
    if (!campaign || !id || campaign.playing) return undefined
    const state = weatherModel(this.system)?.states[id]
    return { name: localize(state?.name, getLocale(), 'en') ?? id.replaceAll('-', ' ') }
  }
}

export const open = new OpenCampaign()

/** Makes a new campaign, empty but for its name and system, and keeps it; returns its id. */
export async function newCampaign(name: string, system: string): Promise<string> {
  const campaign = { ...createCampaign(newId(), name.trim()), system }
  await putCampaign({
    id: campaign.id,
    name: campaign.name,
    modified: campaign.modified,
    json: serializeCampaign(campaign),
  })
  await campaigns.refresh()
  return campaign.id
}

/** The maps and trips in a campaign. */
export const placesIn = (id: string): Promise<CampaignPlace[]> => campaignPlaces(id).catch(() => [])

/**
 * Deletes a campaign, only when nothing is in it (its maps and trips would lose their
 * world); asks first. True if deleted.
 */
export async function removeCampaign(campaign: Campaign): Promise<boolean> {
  if ((await placesIn(campaign.id)).length) {
    showToast(t('campaign.cantDelete'), 'error', 8000)
    return false
  }
  const name = campaign.name || t('nav.untitled')
  if (!(await confirmAction(t('campaign.confirmDelete', { name })))) return false
  await deleteCampaign(campaign.id)
  await campaigns.refresh()
  showToast(t('campaign.deleted', { name }))
  return true
}
