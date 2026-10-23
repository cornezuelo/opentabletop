import {
  DEFAULT_SYSTEM,
  migrateFatigue,
  migrateGenericSheets,
  migrateLost,
  migrateTotals,
  missingSystem,
  leavePlace,
  partyOf,
  pullMembers,
  SEASON_START_DAYS,
  settlePlace,
  startTrip,
  systemName,
  systemIdOf,
  stepTrip,
  type RosterPlace,
  type Season,
  type SessionState,
  type TravelSystem,
  addEntry,
  calendarOf,
} from '@open-tabletop/session'
import type { TravelAction } from '@open-tabletop/travel-engine'
import {
  createCampaign,
  hasWorld,
  joinCampaign,
  leaveTrip,
  otherTrip,
  playTrip,
  MAX_HEARD,
  takeMoments,
  tripHighlights,
  tripStepped,
  worldFactsOf,
  type Campaign,
  type CampaignTrip,
  type WorldHost,
} from '@open-tabletop/campaign'
import { roster } from '@open-tabletop/character-ui'
import { mathRandom } from '@open-tabletop/random'
import { ask, confirmAction, freeCampaignName, showToast } from '@open-tabletop/ui-kit'
import { listCampaigns } from '@open-tabletop/storage'
import { campaignPlaces, type CampaignPlace } from './places'
import { CampaignKeeper } from '@open-tabletop/ui-kit'
import { translator } from './i18n'
import { wayWorld, type WayHex } from './way'
import { highlightText } from './journal'
import { terrainName } from './terrains'
import { clockFilledText, worldWords } from '@open-tabletop/campaign-ui'

/**
 * v2: the party's fatigue is one of the system's stats; v3: being lost is a value the
 * system declares (`today.lost`); v4: the trip's totals (`travel.totals`), rebuilt from the
 * journal; v5: the party's characters (`session.members`, `acting`), none in older trips;
 * v6: the party's own sheet (`session.party`), made when the trip next plays if its
 * system has one, and who rolls (`rolls`, `askRolls`; absent: the best); v7: the Generic
 * rules are Core's system (`generic` reads as `core`, and its sheets `generic/…` as
 * `core/…`); v8: where the last step's journal lines start (`session.lastStep`), none in
 * older trips until they next step; v9: the campaign it plays in (`campaign`), for older
 * trips one of its own (the trip's id). All migrated on reading.
 */
const VERSION = 9

/** A trip without a map: its system, its way and the session. */
export interface Saved {
  id: string
  /** Given by the user; empty until then (the list shows the system and day). */
  name: string
  system: string
  season: Season
  hexKm: number
  way: WayHex[]
  startDay: number
  session: SessionState | null
  /**
   * The campaign it plays in (its world clock, factions and Oracle): one of its own (with
   * the trip's id) unless it joined another.
   */
  campaign: string
}

interface Stored {
  version: number
  current: string
  trips: Saved[]
}

/** Where a host keeps its trips and what they play with. */
export interface TripStoreOptions {
  /** The browser storage key (starting with `opentabletop.`, so backups include it). */
  key: string
  /** Before several trips: the key of the only one, migrated on reading. */
  oldKey?: string
  systems: () => TravelSystem[]
  oracle: () => Parameters<typeof stepTrip>[0]['oracle']
  locale: () => string
  /**
   * The app whose trips take roster characters (`travel`): each trip is a place of the
   * roster, its linked members kept in step with it. Absent: trips don't use the roster
   * (Systems' Try it).
   */
  rosterApp?: string
  /**
   * The app whose trips play in campaigns (`travel`): each in one, its time the campaign's
   * world clock, with its factions and Oracle, one trip at a time. Absent: trips keep their
   * own Oracle and no world (Systems' Try it).
   */
  campaignApp?: string
}

/** The time of a change, for the roster (plain text, not reactive state). */
const now = (): string => new Date(Date.now()).toISOString()

const newTripId = () => `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

const blank = (system = DEFAULT_SYSTEM, id = newTripId()): Saved => ({
  id,
  campaign: id,
  name: '',
  system,
  season: 'spring',
  hexKm: 10,
  way: [{ terrain: 'plains', tags: [], edges: [] }],
  startDay: SEASON_START_DAYS.spring,
  session: null,
})

const isTrip = (raw: unknown): raw is Omit<Saved, 'id' | 'name' | 'campaign'> & Partial<Saved> =>
  typeof raw === 'object' &&
  raw !== null &&
  Array.isArray((raw as Saved).way) &&
  (raw as Saved).way.length > 0

/** A trip saved before campaigns plays in one of its own, named by its id. */
function withCampaign<T extends Partial<Saved>>(t: T): T & { id: string; campaign: string } {
  const id = t.id || newTripId()
  return { ...t, id, campaign: t.campaign || id }
}

/** Saved trips, migrating the single trip of older versions. */
export function readTrips(
  key: string,
  oldKey?: string,
  storage: Pick<Storage, 'getItem'> = localStorage,
): Stored {
  try {
    const raw = JSON.parse(storage.getItem(key) ?? 'null') as Partial<Stored> | null
    if (raw && Array.isArray(raw.trips)) {
      const trips = raw.trips
        .filter(isTrip)
        .map(withCampaign)
        .map((t) => ({
          ...t,
          name: t.name ?? '',
          system: systemIdOf(t.system),
          session:
            t.session &&
            migrateGenericSheets(migrateTotals(migrateLost(migrateFatigue(t.session)))),
        }))
      if (trips.length)
        return {
          version: VERSION,
          current: trips.some((t) => t.id === raw.current) ? raw.current! : trips[0].id,
          trips,
        }
    }
    const old: unknown = oldKey ? JSON.parse(storage.getItem(oldKey) ?? 'null') : null
    if (isTrip(old)) {
      const id = newTripId()
      const trip = { ...old, id, name: '', campaign: id }
      return { version: VERSION, current: trip.id, trips: [trip] }
    }
  } catch {
    // Broken storage: start again.
  }
  const trip = blank()
  return { version: VERSION, current: trip.id, trips: [trip] }
}

/** Every trip a host keeps in this browser, and which one is open. */
export class TripStore {
  private stored: Stored = $state.raw({ version: VERSION, current: '', trips: [] })

  /** The open trip's campaign, kept where campaigns are (none when trips play without). */
  private readonly keeper?: CampaignKeeper

  constructor(private readonly options: TripStoreOptions) {
    this.stored = readTrips(options.key, options.oldKey)
    if (options.campaignApp) this.keeper = new CampaignKeeper()
    this.pullRoster()
    void this.openCampaign()
  }

  /** Whether trips play in campaigns here. */
  get inCampaigns(): boolean {
    return !!this.keeper
  }

  /**
   * The campaigns the open trip may play in, by name: those kept in this browser (a map's,
   * another trip's) and its own.
   */
  async campaigns(): Promise<{ id: string; name: string }[]> {
    if (!this.keeper) return []
    const kept = await listCampaigns().catch(() => [])
    return kept.map(({ id, name }) => ({ id, name: name || id }))
  }

  /** The open trip's campaign (undefined while it's read, or when trips play without). */
  get campaign(): Campaign | undefined {
    const c = this.keeper?.campaign
    return c?.id === this.saved.campaign ? c : undefined
  }

  /** The open trip as the trip going on in its campaign. */
  private get me(): CampaignTrip | undefined {
    const place = this.placeOf(this.saved, this.options.campaignApp)
    return place && { app: place.app, id: place.id, name: place.name }
  }

  /** Reads the open trip's campaign (a new one of its own if none is kept). */
  private openCampaign(): Promise<Campaign> | undefined {
    return this.keeper?.open(this.saved.campaign, this.me?.name ?? '')
  }

  /**
   * Moves the open trip to another campaign (`campaign`: its id; the trip's own id: one of
   * its own again). Its time becomes that campaign's when it next steps (§9.1 of the
   * campaigns design: it waits until the campaign's clock if that is ahead).
   */
  async joinCampaign(campaign: string): Promise<boolean> {
    const keeper = this.keeper
    const from = this.campaign
    const trip = this.saved.id
    if (!keeper || !from || campaign === this.saved.campaign) return true
    const t = translator(this.options.locale)
    const to =
      (await keeper.read(campaign)) ??
      createCampaign(
        campaign,
        campaign === trip ? await freeCampaignName(this.me?.name ?? '', campaign) : '',
      )
    // Its world (a clock, factions, Oracle rolls): which stays, as when a map moves.
    let stays: 'theirs' | 'mine' = 'theirs'
    if (hasWorld(from)) {
      const theirs = hasWorld(to)
      const name = to.name || to.id
      const choice = await ask(
        t('campaign.whatStaysTitle', { campaign: name }),
        t(theirs ? 'campaign.whatStays' : 'campaign.bringWorld', { campaign: name }),
        [
          { value: 'cancel', label: t('campaign.cancel') },
          {
            value: 'theirs',
            label: t(theirs ? 'campaign.keepTheirs' : 'campaign.leaveBehind'),
            ...(theirs && { kind: 'primary' as const }),
          },
          {
            value: 'mine',
            label: t('campaign.bringMine'),
            kind: theirs ? ('danger' as const) : ('primary' as const),
          },
        ],
      )
      if (choice !== 'theirs' && choice !== 'mine') return false
      stays = choice
    }
    if (this.saved.id !== trip || this.campaign !== from) return false
    const others = await this.othersIn(from.id)
    // The campaign it leaves: without this trip going on, or gone if nothing else is in it.
    if (others.length) keeper.write(this.me ? leaveTrip(from, this.me) : from)
    else keeper.remove(from.id)
    const joined = joinCampaign(from, to, stays)
    if (joined !== to) keeper.write({ ...joined, modified: now() })
    this.saved = { ...this.saved, campaign }
    this.save()
    await this.openCampaign()
    if (systemIdOf(joined.system) !== systemIdOf(from.system)) {
      const system = this.options.systems().find((s) => s.id === systemIdOf(joined.system))
      showToast(
        t('campaign.adopted', {
          system: system ? systemName(system, this.options.locale()) : systemIdOf(joined.system),
        }),
        'info',
        6000,
      )
    }
    return true
  }

  /** The maps and trips in a campaign besides the open trip. */
  private async othersIn(campaign: string, me = this.saved.id): Promise<CampaignPlace[]> {
    return (await campaignPlaces(campaign)).filter((p) => p.app !== 'travel' || p.id !== me)
  }

  /**
   * Makes `system` the open trip's campaign's (a trip started with it): if other maps or
   * trips are in the campaign, asks first, since it's theirs too. False if not changed.
   */
  async chooseSystem(system: string): Promise<boolean> {
    const keeper = this.keeper
    if (!keeper) return true
    const campaign = await this.openCampaign()
    const id = systemIdOf(system)
    if (!campaign || systemIdOf(campaign.system) === id) return true
    const others = await this.othersIn(campaign.id)
    if (others.length) {
      const t = translator(this.options.locale)
      const places = others
        .map((p) => `“${p.name || t(p.app === 'travel' ? 'campaign.trip' : 'campaign.map')}”`)
        .join(', ')
      if (!(await confirmAction(t('campaign.systemShared', { places }), { danger: false })))
        return false
    }
    const next = { ...(this.campaign ?? campaign) }
    if (id === DEFAULT_SYSTEM) delete next.system
    else next.system = id
    keeper.set(next)
    return true
  }

  /** The open trip as a place of the roster (none when this host doesn't use it). */
  get place(): RosterPlace | undefined {
    return this.placeOf(this.saved)
  }

  private placeOf(trip: Saved, app = this.options.rosterApp): RosterPlace | undefined {
    if (!app) return undefined
    const system = this.options.systems().find((s) => s.id === trip.system)
    const name = trip.name || (system ? systemName(system, this.options.locale()) : trip.system)
    return { app, id: trip.id, name }
  }

  /**
   * Brings the open trip's roster characters up to date (they changed in the Characters
   * app, or in another tab): on opening it, and whenever the roster changes.
   */
  pullRoster(): void {
    const place = this.place
    const session = this.saved?.session
    if (!place || !session) return
    const next = pullMembers(session, roster.roster, place, partyOf(this.system))
    if (next === session) return
    this.saved = { ...this.saved, session: next }
    this.save()
  }

  /** Every saved trip, oldest first. */
  get trips(): Saved[] {
    return this.stored.trips
  }

  /** The open trip. */
  get saved(): Saved {
    return this.stored.trips.find((t) => t.id === this.stored.current) ?? this.stored.trips[0]
  }

  set saved(trip: Saved) {
    this.stored = {
      ...this.stored,
      trips: this.stored.trips.map((t) => (t.id === trip.id ? trip : t)),
    }
  }

  /** Opens another saved trip. */
  open(id: string): void {
    if (!this.stored.trips.some((t) => t.id === id)) return
    this.stored = { ...this.stored, current: id }
    this.pullRoster()
    this.save()
    void this.openCampaign()
  }

  /**
   * A new trip (kept beside the others) with a system and season, and opens it: in a
   * campaign of its own, or in `campaign` (its time the campaign's world clock).
   */
  create(system: string, season: Season, campaign?: string): void | Promise<void> {
    const trip = { ...blank(system), season }
    if (campaign) trip.campaign = campaign
    this.stored = { ...this.stored, current: trip.id, trips: [...this.stored.trips, trip] }
    const opening = this.openCampaign()
    if (!opening) return this.start(system, season)
    // In a campaign of its own, its system is the trip's; in another, asked first.
    return opening.then(async () => {
      await this.chooseSystem(system)
      this.start(system, season)
    })
  }

  rename(name: string): void {
    this.saved = { ...this.saved, name: name.trim() }
    this.save()
  }

  /** Deletes the open trip (the last one left is emptied instead) and opens another. */
  remove(): void {
    // Its roster characters stay in the roster, playing nowhere.
    const place = this.place
    if (place) roster.set(leavePlace(roster.roster, place))
    // Its campaign no longer has it going on (or goes with it, if nothing else is in it).
    const campaign = this.campaign
    const me = this.me
    if (campaign && me)
      void this.othersIn(campaign.id, me.id).then((others) =>
        others.length
          ? this.keeper?.write(leaveTrip(campaign, me))
          : this.keeper?.remove(campaign.id),
      )
    const rest = this.stored.trips.filter((t) => t.id !== this.saved.id)
    const trips = rest.length ? rest : [blank(this.saved.system)]
    this.stored = { ...this.stored, current: trips.at(-1)!.id, trips }
    this.save()
    void this.openCampaign()
  }

  /** The open trip's system as it is now: edits to its rules count from the next step. */
  get system(): TravelSystem {
    const list = this.options.systems()
    return (
      list.find((s) => s.id === this.saved.system) ?? list[0] ?? missingSystem(this.saved.system)
    )
  }

  private save() {
    try {
      localStorage.setItem(this.options.key, JSON.stringify(this.stored))
      if (this.options.oldKey) localStorage.removeItem(this.options.oldKey)
    } catch {
      // Not kept for the next visit; the trip still goes on.
    }
    // Its roster characters, as the trip has them now.
    const place = this.place
    if (place)
      roster.set(settlePlace(roster.roster, this.saved.session?.members ?? [], place, now()))
  }

  /** A new trip with a system and season, at the first hex of the way. */
  start(system = this.saved.system, season = this.saved.season): void {
    const list = this.options.systems()
    const s = list.find((x) => x.id === system) ?? list[0] ?? missingSystem(system)
    const { startDay, session } = startTrip({
      system: s,
      location: '0',
      season,
      stats: this.saved.system === system ? this.saved.session?.stats : undefined,
      // The same party of characters goes on to the next trip with the same system.
      members: this.saved.system === system ? this.saved.session?.members : undefined,
      // What the trip's rolls in conditions are seeded with: each trip its own.
      seed: Math.random().toString(36).slice(2, 10),
      // With its campaign's world clock running, the trip starts at the world's time.
      ...(this.campaign?.world && { time: this.campaign.world.time }),
    })
    this.saved = { ...this.saved, system: s.id, season, startDay, session }
    this.aim()
  }

  /** Heads for the last hex of the way (a no-op if already there or no trip). */
  private aim(): void {
    const session = this.saved.session
    const last = String(this.saved.way.length - 1)
    if (!session || session.travel.location === last || session.travel.destination === last) {
      this.save()
      return
    }
    this.step({ type: 'setDestination', hex: last })
  }

  /**
   * Plays an action. In a campaign, the trip first takes its place as the one going on
   * (asking, if another trip played there last) and catches up with the campaign's clock.
   */
  step(action: TravelAction): void | Promise<void> {
    if (!this.keeper) return this.stepNow(action)
    return this.stepInCampaign(action)
  }

  private async stepInCampaign(action: TravelAction): Promise<void> {
    const trip = this.saved.id
    await this.openCampaign()
    if (trip !== this.saved.id || !(await this.claim())) return
    this.stepNow(action)
  }

  /**
   * Makes the open trip the one going on in its campaign: if another one played there last,
   * asks to pause it; if the campaign's clock went on meanwhile, the party waits until then.
   */
  private async claim(): Promise<boolean> {
    const campaign = this.campaign
    const me = this.me
    if (!campaign || !me) return true
    const other = otherTrip(campaign, me)
    const t = translator(this.options.locale)
    if (other && !(await confirmAction(t('campaign.pauseOther', { trip: other.name }))))
      return false
    if (this.campaign !== campaign) return false
    this.keeper!.set(playTrip(campaign, me))
    const time = campaign.world?.time
    const session = this.saved.session
    if (time !== undefined && session && session.travel.time < time) {
      this.stepNow({ type: 'wait', until: time })
      showToast(t('campaign.caughtUp'), 'info', 6000)
    }
    return true
  }

  /** What the campaign's world plays with on this trip: its system, its Oracle (if loaded). */
  private worldHost(session: SessionState): WorldHost | undefined {
    const oracle = this.options.oracle()
    if (!oracle) return undefined
    const system = this.system
    const factions = this.campaign?.factions
    const factionsSystem = factions
      ? this.options.systems().find((s) => s.id === factions.system)?.factions
      : undefined
    return {
      calendar: calendarOf(system),
      clocks: system.clocks,
      fallback: system.locale,
      factions: factionsSystem,
      oracle,
      random: mathRandom(),
      locale: this.options.locale(),
      trip: { weather: session.travel.weather },
      words: worldWords(this.options.locale),
    }
  }

  /**
   * Plays an action. The trip hears the moments of the world first, those that came while it
   * wasn't stepping (a clock filled by hand, in another app), and then those its step made
   * happen (a clock filling).
   */
  private stepNow(action: TravelAction, heard = 0): void {
    if (!this.saved.session) return
    if (heard === 0) this.hearWorld()
    this.stepOnly(action)
    this.hearWorld(heard)
  }

  /** The moments the campaign's world has waiting for the trip: each journaled and played. */
  private hearWorld(heard = 0): void {
    const campaign = this.campaign
    const me = this.me
    if (heard >= MAX_HEARD || !campaign || !me || !this.saved.session) return
    if (!campaign.playing || otherTrip(campaign, me)) return
    const taken = takeMoments(campaign, this.system.rules)
    if (taken.campaign === campaign) return
    this.keeper!.set(taken.campaign)
    for (const { at, clock } of taken.heard) {
      const session = this.saved.session
      if (!session) return
      this.saved = {
        ...this.saved,
        session: addEntry(session, { source: 'travel', code: 'CLOCK_FILLED', text: clock }),
      }
      this.stepNow({ type: 'moment', at }, heard + 1)
    }
    this.save()
  }

  /** A step's highlights for the campaign's timeline (arrivals, places found, pauses). */
  private highlights(entries: SessionState['journal']): { time: number; text: string }[] {
    const t = translator(this.options.locale)
    const hexLabel = (hex: string) => {
      const h = this.saved.way[Number(hex)]
      return `${t('play.hex', { n: Number(hex) + 1 })}${h ? ` (${terrainName(t, h.terrain)})` : ''}`
    }
    const context = { rules: this.system.rules, locale: this.options.locale(), hexLabel }
    return entries.flatMap((e) => {
      const text = highlightText(e, context)
      return text ? [{ time: e.time, text }] : []
    })
  }

  /** Plays an action, and what it did in the campaign's world. */
  private stepOnly(action: TravelAction): void {
    const session = this.saved.session
    if (!session) return
    const campaign = this.campaign
    const host = campaign && this.worldHost(session)
    try {
      const options = {
        system: this.system,
        world: wayWorld(this.saved.way, this.hexKm),
        oracle: this.options.oracle(),
        locale: this.options.locale(),
        ...(campaign && host && { facts: worldFactsOf({ campaign }, host) }),
      }
      // Checks roll with the campaign's Oracle state, shared with its maps and hand rolls.
      const input = campaign?.oracle ? { ...session, oracle: campaign.oracle.state } : session
      const { state, entries } = stepTrip(options, input, action)
      let next = state
      if (campaign && host) {
        const done = tripStepped(
          { campaign },
          {
            oracle: state.oracle,
            entries,
            time: state.travel.time,
            highlights: this.highlights(entries),
          },
          host,
        )
        for (const line of done.lines)
          next = addEntry(next, { source: 'travel', code: line.code, text: line.text })
        this.keeper!.set(done.campaign)
        for (const { clock, text } of done.filled)
          showToast(clockFilledText(this.options.locale(), clock, text), 'info', 8000)
      }
      this.saved = { ...this.saved, session: next }
    } catch (error) {
      // A broken pack shouldn't silently stop play: say what failed.
      showToast(error instanceof Error ? error.message : String(error), 'error', 8000)
    }
    this.save()
  }

  edit(update: (session: SessionState) => SessionState): void {
    const session = this.saved.session
    if (!session) return
    const next = update(structuredClone(session))
    this.saved = { ...this.saved, session: next }
    // What the edit told worth keeping (a character leaving) goes to the timeline too.
    const campaign = this.campaign
    const highlights = this.highlights(next.journal.slice(session.journal.length))
    const host = campaign && highlights.length ? this.worldHost(next) : undefined
    if (campaign && host) this.keeper!.set(tripHighlights({ campaign }, highlights, host).campaign)
    this.save()
  }

  /** The scale trips are played at: the system's, if it sets one; else the way's own. */
  get hexKm(): number {
    return this.system.rules.travel.hexKm ?? this.saved.hexKm
  }

  setHexKm(km: number): void {
    this.saved = { ...this.saved, hexKm: Math.max(0.1, km) }
    this.save()
  }

  // The way ahead: hexes can be added, changed and removed ahead of the party.

  addHex(
    hex: WayHex = { terrain: this.saved.way.at(-1)?.terrain ?? 'plains', tags: [], edges: [] },
  ): void {
    this.saved = { ...this.saved, way: [...this.saved.way, hex] }
    this.aim()
  }

  updateHex(index: number, change: (hex: WayHex) => WayHex): void {
    this.saved = {
      ...this.saved,
      way: this.saved.way.map((h, i) => (i === index ? change({ ...h }) : h)),
    }
    // The route is re-planned so new terrain or roads count.
    if (this.saved.session)
      this.step({ type: 'setDestination', hex: String(this.saved.way.length - 1) })
    else this.save()
  }

  /** Removes a hex the party hasn't reached yet. */
  removeHex(index: number): void {
    if (index <= this.location || this.saved.way.length <= 1) return
    this.saved = { ...this.saved, way: this.saved.way.filter((_, i) => i !== index) }
    if (this.saved.session)
      this.step({ type: 'setDestination', hex: String(this.saved.way.length - 1) })
    else this.save()
  }

  /** Index of the hex the party is on. */
  get location(): number {
    return Number(this.saved.session?.travel.location ?? 0)
  }
}
