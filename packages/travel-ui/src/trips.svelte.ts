import {
  migrateFatigue,
  migrateLost,
  migrateTotals,
  SEASON_START_DAYS,
  startTrip,
  stepTrip,
  type Season,
  type SessionState,
  type TravelSystem,
} from '@open-tabletop/session'
import type { TravelAction } from '@open-tabletop/travel-engine'
import { showToast } from '@open-tabletop/ui-kit'
import { wayWorld, type WayHex } from './way'

/**
 * v2: the party's fatigue is one of the system's stats; v3: being lost is a value the
 * system declares (`today.lost`); v4: the trip's totals (`travel.totals`), rebuilt from the
 * journal. All migrated on reading.
 */
const VERSION = 4

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
}

const newTripId = () => `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

const blank = (system = 'generic'): Saved => ({
  id: newTripId(),
  name: '',
  system,
  season: 'spring',
  hexKm: 10,
  way: [{ terrain: 'plains', tags: [], edges: [] }],
  startDay: SEASON_START_DAYS.spring,
  session: null,
})

const isTrip = (raw: unknown): raw is Omit<Saved, 'id' | 'name'> & Partial<Saved> =>
  typeof raw === 'object' &&
  raw !== null &&
  Array.isArray((raw as Saved).way) &&
  (raw as Saved).way.length > 0

/** Saved trips, migrating the single trip of older versions. */
export function readTrips(
  key: string,
  oldKey?: string,
  storage: Pick<Storage, 'getItem'> = localStorage,
): Stored {
  try {
    const raw = JSON.parse(storage.getItem(key) ?? 'null') as Partial<Stored> | null
    if (raw && Array.isArray(raw.trips)) {
      const trips = raw.trips.filter(isTrip).map((t) => ({
        ...t,
        id: t.id || newTripId(),
        name: t.name ?? '',
        session: t.session && migrateTotals(migrateLost(migrateFatigue(t.session))),
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
      const trip = { ...old, id: newTripId(), name: '' }
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

  constructor(private readonly options: TripStoreOptions) {
    this.stored = readTrips(options.key, options.oldKey)
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
    this.save()
  }

  /** A new trip (kept beside the others) with a system and season, and opens it. */
  create(system: string, season: Season): void {
    const trip = { ...blank(system), season }
    this.stored = { ...this.stored, current: trip.id, trips: [...this.stored.trips, trip] }
    this.start(system, season)
  }

  rename(name: string): void {
    this.saved = { ...this.saved, name: name.trim() }
    this.save()
  }

  /** Deletes the open trip (the last one left is emptied instead) and opens another. */
  remove(): void {
    const rest = this.stored.trips.filter((t) => t.id !== this.saved.id)
    const trips = rest.length ? rest : [blank(this.saved.system)]
    this.stored = { ...this.stored, current: trips.at(-1)!.id, trips }
    this.save()
  }

  /** The open trip's system as it is now: edits to its rules count from the next step. */
  get system(): TravelSystem {
    const list = this.options.systems()
    return list.find((s) => s.id === this.saved.system) ?? list[0]
  }

  private save() {
    try {
      localStorage.setItem(this.options.key, JSON.stringify(this.stored))
      if (this.options.oldKey) localStorage.removeItem(this.options.oldKey)
    } catch {
      // Not kept for the next visit; the trip still goes on.
    }
  }

  /** A new trip with a system and season, at the first hex of the way. */
  start(system = this.saved.system, season = this.saved.season): void {
    const list = this.options.systems()
    const s = list.find((x) => x.id === system) ?? list[0]
    const { startDay, session } = startTrip({
      system: s,
      location: '0',
      season,
      stats: this.saved.system === system ? this.saved.session?.stats : undefined,
      // What the trip's rolls in conditions are seeded with: each trip its own.
      seed: Math.random().toString(36).slice(2, 10),
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

  step(action: TravelAction): void {
    const session = this.saved.session
    if (!session) return
    try {
      const options = {
        system: this.system,
        world: wayWorld(this.saved.way, this.hexKm),
        oracle: this.options.oracle(),
        locale: this.options.locale(),
      }
      this.saved = { ...this.saved, session: stepTrip(options, session, action).state }
    } catch (error) {
      // A broken pack shouldn't silently stop play: say what failed.
      showToast(error instanceof Error ? error.message : String(error), 'error', 8000)
    }
    this.save()
  }

  edit(update: (session: SessionState) => SessionState): void {
    if (!this.saved.session) return
    this.saved = { ...this.saved, session: update(structuredClone(this.saved.session)) }
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
