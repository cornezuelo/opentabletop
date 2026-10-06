import {
  SEASON_START_DAYS,
  startTrip,
  stepTrip,
  type Season,
  type SessionState,
} from '@open-tabletop/session'
import type { TravelAction } from '@open-tabletop/travel-engine'
import { showToast } from '@open-tabletop/ui-kit'
import { getLocale } from './i18n'
import { library, systems } from './packs.svelte'
import { wayWorld, type WayHex } from './way'

const KEY = 'opentabletop.travel.trip'

/** A trip being played in this browser: its system, its way and the session. */
interface Saved {
  system: string
  season: Season
  hexKm: number
  way: WayHex[]
  startDay: number
  session: SessionState | null
}

const blank = (system = 'generic'): Saved => ({
  system,
  season: 'spring',
  hexKm: 10,
  way: [{ terrain: 'plains', tags: [], edges: [] }],
  startDay: SEASON_START_DAYS.spring,
  session: null,
})

function read(): Saved {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Saved | null
    return raw && Array.isArray(raw.way) && raw.way.length ? raw : blank()
  } catch {
    return blank()
  }
}

class Trip {
  saved = $state.raw<Saved>(read())

  get system() {
    return systems.get(this.saved.system) ?? systems.list[0]
  }

  private save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.saved))
    } catch {
      // Not kept for the next visit; the trip still goes on.
    }
  }

  private options() {
    return {
      system: this.system,
      world: wayWorld(this.saved.way, this.saved.hexKm),
      oracle: library.engine,
      locale: getLocale(),
    }
  }

  /** A new trip with a system and season, at the first hex of the way. */
  start(system = this.saved.system, season = this.saved.season): void {
    const s = systems.get(system) ?? systems.list[0]
    const { startDay, session } = startTrip({
      system: s,
      location: '0',
      season,
      stats: this.saved.system === system ? this.saved.session?.stats : undefined,
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
      this.saved = { ...this.saved, session: stepTrip(this.options(), session, action).state }
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

export const trip = new Trip()
