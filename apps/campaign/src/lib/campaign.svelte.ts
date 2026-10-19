import {
  bringClocks,
  bringFactions,
  createCampaign,
  serializeCampaign,
  missingClocks,
  splitFactions,
  startWorld,
  worldAct,
  worldTurnNow,
  type Campaign,
  type CampaignFactions,
  type WorldDone,
  type WorldHost,
} from '@open-tabletop/campaign'
import {
  campaignTexts,
  clockFilledText,
  worldWords,
  type WorldControls,
} from '@open-tabletop/campaign-ui'
import { deserializeMap, newId, serializeMap, type HexMap } from '@open-tabletop/map'
import { mathRandom } from '@open-tabletop/random'
import { calendarOf, localize, type TravelSystem } from '@open-tabletop/session'
import {
  allLibraryMaps,
  deleteCampaign,
  listCampaigns,
  onCampaignChange,
  onLibraryChange,
  putCampaign,
  putLibraryMap,
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

/** Where the map each campaign plays its factions' land on here is remembered (per viewer). */
const LAND_MAP_KEY = 'opentabletop.campaign.landMap'

function readLandMaps(): Record<string, string> {
  try {
    const stored = JSON.parse(localStorage.getItem(LAND_MAP_KEY) ?? '{}') as unknown
    return stored && typeof stored === 'object' ? (stored as Record<string, string>) : {}
  } catch {
    return {}
  }
}

/** The maps of the library in a campaign (a map saved before campaigns is in its own). */
async function mapsIn(campaign: string): Promise<HexMap[]> {
  const maps: HexMap[] = []
  for (const entry of await allLibraryMaps().catch(() => [])) {
    try {
      const map = deserializeMap(entry.json)
      if ((map.meta.campaign ?? map.meta.id) === campaign) maps.push(map)
    } catch {
      // A map that can't be read is in no campaign (the Hexmapper says what's wrong).
    }
  }
  return maps.sort((a, b) => a.meta.name.localeCompare(b.meta.name))
}

/** Writes a map of the library back (its land changed here); the Hexmapper hears it. */
async function keepMap(map: HexMap): Promise<void> {
  const next = { ...map, meta: { ...map.meta, modified: new Date().toISOString() } }
  await putLibraryMap({
    id: next.meta.id,
    name: next.meta.name,
    modified: next.meta.modified,
    json: serializeMap(next),
  })
}

const sameLand = (a: HexMap['territories'], b: HexMap['territories']) =>
  JSON.stringify(a ?? {}) === JSON.stringify(b ?? {})

/**
 * The example map of a loaded pack a map is (opened from a system's `maps:`, it keeps the
 * bundle's id), if any: the factions' starting hexes go only on the map they're for.
 */
function exampleOf(map: HexMap): { pack: string; path: string } | undefined {
  for (const system of systems.list) {
    const root = system.pack ? library.rootOf(system.pack) : undefined
    if (root === undefined) continue
    for (const path of system.maps ?? []) {
      try {
        const json = library.readFile(root, path)
        const ids = (JSON.parse(json ?? '{}') as { maps?: { id?: string }[] }).maps
        if (ids?.[0]?.id === map.meta.id) return { pack: system.pack!, path }
      } catch {
        // Not a map: the system's page in Systems says what's wrong with it.
      }
    }
  }
  return undefined
}

/** The campaign open in the app. */
class OpenCampaign {
  private readonly keeper = new CampaignKeeper()
  /** The id asked for, and whether it's kept here (false: not in this browser). */
  id = $state('')
  found = $state<boolean | undefined>(undefined)
  /** The campaign's maps (read from the library, again when it changes). */
  maps = $state.raw<HexMap[]>([])
  private landMaps = $state<Record<string, string>>(readLandMaps())

  constructor() {
    onLibraryChange(() => void this.readMaps())
  }

  private async readMaps(): Promise<void> {
    const id = this.id
    if (!id) return
    const maps = await mapsIn(id)
    if (this.id === id) this.maps = maps
  }

  /**
   * The map the factions' land changes on here (world turns, by hand or as time moves on):
   * the one chosen, else the map of the trip going on, else the first. None without maps.
   */
  get landMap(): HexMap | undefined {
    const campaign = this.campaign
    if (!campaign) return undefined
    const by = (id: string | undefined) => this.maps.find((m) => m.meta.id === id)
    const playing = campaign.playing?.app === 'hexmapper' ? campaign.playing.id : undefined
    return by(this.landMaps[campaign.id]) ?? by(playing) ?? this.maps[0]
  }

  /** Chooses the map the land changes on (remembered in this browser). */
  chooseLandMap(id: string): void {
    if (!this.campaign) return
    this.landMaps = { ...this.landMaps, [this.campaign.id]: id }
    try {
      localStorage.setItem(LAND_MAP_KEY, JSON.stringify(this.landMaps))
    } catch {
      // Not remembered: the default map next time.
    }
  }

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
    this.maps = []
    await this.readMaps()
  }

  /** Changes the open campaign (its name, notes…) and keeps it. */
  set(next: Campaign): void {
    this.keeper.set(next)
    void campaigns.refresh()
  }

  host(): WorldHost | undefined {
    return this.campaign && worldHost(this.campaign, this.system)
  }

  /** Where the world plays here: the campaign, and the map its factions' land is on. */
  private place(): { campaign: Campaign; map?: HexMap } | undefined {
    const campaign = this.campaign
    return campaign && { campaign, map: this.landMap }
  }

  /**
   * Keeps what the world did (the campaign, and the map if its land changed), and tells the
   * clocks that filled on the way.
   */
  private take(done: WorldDone, before?: HexMap): void {
    this.set(done.campaign)
    if (done.map && before && !sameLand(before.territories, done.map.territories))
      this.putMap(done.map)
    for (const { clock, text } of done.filled)
      showToast(clockFilledText(getLocale(), clock, text), 'info', 8000)
  }

  private putMap(map: HexMap): void {
    this.maps = this.maps.map((m) => (m.meta.id === map.meta.id ? map : m))
    keepMap(map).catch(() => showToast(t('storage.full'), 'error', 8000))
  }

  private act(action: Parameters<typeof worldAct>[1]): void {
    const place = this.place()
    const host = this.host()
    if (place && host) this.take(worldAct(place, action, host), place.map)
  }

  /** What the world clock's UI does here: the campaign alone, without a map or a trip. */
  readonly controls: WorldControls = {
    start: (time) => {
      const place = this.place()
      const host = this.host()
      if (place && host) this.take(startWorld(place, time, host), place.map)
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
      const place = this.place()
      const host = this.host()
      if (place && host) this.take(bringClocks(place, host), place.map)
    },
  }

  /**
   * Brings the system's factions to the campaign: their sheets, and the land each starts
   * with on the map chosen (none without maps; another map gets its own with `bringLand`).
   */
  bringFactions(): void {
    const campaign = this.campaign
    const system = this.system
    if (!campaign || !system.factions) return
    this.bringOn(campaign, undefined, this.landMap)
  }

  /** Gives the factions the land the system starts them with on a map that has none of theirs. */
  bringLand(map: HexMap): void {
    const campaign = this.campaign
    if (campaign?.factions) this.bringOn(campaign, campaign.factions.system, map)
  }

  private bringOn(campaign: Campaign, systemId: string | undefined, map?: HexMap): void {
    const system = systems.get(systemId ?? campaign.system)
    if (!system.factions) return
    const time = campaign.world?.time ?? 0
    const split = splitFactions(
      bringFactions(campaign, map, system.factions, system.id, time, map && exampleOf(map)),
    )
    this.set({ ...campaign, factions: split.factions })
    if (map && !sameLand(map.territories, split.territories))
      this.putMap({ ...map, territories: split.territories })
  }

  /** The factions' sheets or whether turns come by themselves, changed by hand. */
  setFactions(factions: CampaignFactions): void {
    const campaign = this.campaign
    if (campaign) this.set({ ...campaign, factions })
  }

  /** A world turn now, the land changing on the map chosen. */
  worldTurn(): void {
    const place = this.place()
    const host = this.host()
    if (place && host) this.take(worldTurnNow(place, host), place.map)
  }

  /**
   * Takes the factions out of the campaign: their sheets are forgotten, and their land on
   * every map of it. Asks first. True if taken.
   */
  async removeFactions(): Promise<boolean> {
    const campaign = this.campaign
    if (!campaign?.factions || !(await confirmAction(t('factions.confirmRemove')))) return false
    const next = { ...campaign }
    delete next.factions
    this.set(next)
    for (const map of this.maps)
      if (map.territories && Object.keys(map.territories).length) {
        const bare = { ...map }
        delete bare.territories
        this.putMap(bare)
      }
    return true
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
