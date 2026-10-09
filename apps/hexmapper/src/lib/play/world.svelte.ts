import { formatCoord, parseKey, type HexKey } from '@open-tabletop/hex'
import { calendarOf, localize } from '@open-tabletop/session'
import { memberNamer, translator } from '@open-tabletop/travel-ui'
import { availableActions, nightAction } from '@open-tabletop/travel-engine'
import { type Calendar, type DataCalendar } from '@open-tabletop/time'
import { confirmAction, showToast } from '@open-tabletop/ui-kit'
import {
  createWorld,
  initialWorld,
  type Until,
  type WorldAction,
  type WorldEvent,
  type WorldState,
  worldFacts,
  factId,
} from '@open-tabletop/world-engine'
import { applyFactionEffects, dueTurns, factionFactsNow, takeWorldTurn } from './factions'
import { getLocale, t } from '../i18n/index.svelte'
import { editor } from '../store/editor.svelte'
import { sessionOf, step } from './play'
import { activeSystem, getSystem, mapSystemId } from './systems'
import { nextWeather, type WeatherModel } from '@open-tabletop/weather-engine'
import { mathRandom } from '@open-tabletop/random'

/**
 * The map's world clock: the campaign's time, events scheduled on it and progress
 * clocks. It names time with the calendar of the system the map plays (or the default
 * one). It and a rules trip share one time: travelling moves it, and moving it waits in the
 * trip (`advanceWorld`). Play state: saved
 * with the map, outside the undo history.
 */

/** The calendar the world uses: the system's own (the trip's, or the map's), or the default one. */
export function worldCalendar(): Calendar {
  return calendarOf(activeSystem())
}

const world = () => createWorld({ calendar: worldCalendar() })

/**
 * What tables and conditions read of the world: the world clock's (its clocks, today's
 * events), if running, and the factions' (`factions.<id>.*`), if the map has them.
 */
export function worldFactsNow(): Record<string, unknown> | undefined {
  const state = editor.map.world
  const factions = factionFactsNow()
  if (!state && !factions) return undefined
  // Without a trip, today's weather is the world clock's own (`weather`, as a trip's).
  const play = editor.map.play
  const weather = !(play && sessionOf(play)) ? editor.map.worldWeather?.weather : undefined
  return {
    ...(state && worldFacts(state, worldCalendar())),
    ...factions,
    ...(weather && { weather }),
  }
}

/** When the clock starts unless another date is chosen: the trip's time, else dawn of day 1. */
export function defaultStart(): number {
  const play = editor.map.play
  const session = play ? sessionOf(play) : null
  return session?.travel.time ?? worldCalendar().at(1, '06:00')
}

/**
 * Starts the clock at a date (by default `defaultStart`). With a trip going on, the world
 * and the trip share one time, so it starts at the trip's.
 */
export function startWorld(time = defaultStart()): void {
  const play = editor.map.play
  const trip = play ? sessionOf(play) : null
  editor.setWorld(initialWorld(trip ? trip.travel.time : time))
  editor.setWorldWeather(undefined)
  rollWorldWeather()
}

/**
 * The weather model the world clock's own weather is rolled on: the one the map system's
 * weather check uses (its bindings' `weather:`), else the first it names.
 */
function worldWeatherModel(): WeatherModel | undefined {
  const system = getSystem(mapSystemId())
  const bound = Object.values(system.bindings?.on ?? {}).find((b) => b.weather)?.weather
  return (bound ? system.weather?.[bound] : undefined) ?? Object.values(system.weather ?? {})[0]
}

/**
 * The world clock's own weather, day by day up to today, while no trip is going on (a
 * trip's weather is the world's then): each day follows the day before's, on the map
 * system's weather model, in that day's season.
 */
export function rollWorldWeather(): void {
  const state = editor.map.world
  const model = worldWeatherModel()
  const play = editor.map.play
  if (!state || !model || (play && sessionOf(play))) return
  const calendar = worldCalendar()
  const today = calendar.describe(state.time).day
  let weather = editor.map.worldWeather
  if (weather && weather.day >= today) return
  // A long jump: only the last days matter.
  const from = Math.max(weather ? weather.day + 1 : today, today - 30)
  const random = mathRandom()
  for (let day = from; day <= today; day++) {
    const next = nextWeather(model, {
      season: calendar.describe(calendar.at(day, '12:00')).season,
      previous: weather?.weather,
      at: weather?.at,
      random,
    })
    weather = { weather: next.weather, day, ...(next.at && { at: next.at }) }
  }
  editor.setWorldWeather(weather)
}

/** Today's weather of the world: the trip's while one goes on, else the world clock's own. */
export function worldWeatherNow(): { id: string; name: string } | undefined {
  const play = editor.map.play
  const trip = play ? sessionOf(play) : null
  const id = trip ? trip.travel.weather : editor.map.worldWeather?.weather
  if (!id) return undefined
  const state = worldWeatherModel()?.states[id]
  return { id, name: localize(state?.name, getLocale(), 'en') ?? id.replaceAll('-', ' ') }
}

/**
 * Sets the world's date. Forward it's moving time on (the trip, if any, travels or waits
 * until then, asking before days pass); back it asks first, and is only possible without a
 * trip going on (a trip's time never goes back). Nothing that happened is undone.
 */
export async function setWorldDate(time: number): Promise<void> {
  const state = editor.map.world
  if (!state || time === state.time) return
  if (time > state.time) return advanceWorld({ minutes: time - state.time })
  const play = editor.map.play
  if (play && sessionOf(play)) return void showToast(t('world.noRewindTrip'), 'error')
  if (await confirmAction(t('world.confirmRewind'))) worldAct({ type: 'rewind', time })
}

/** Stops it (forgets its events, clocks and timeline). */
export function stopWorld(): void {
  editor.setWorld(undefined)
}

/** Applies an action to the world clock; returns what happened. */
export function worldAct(action: WorldAction): WorldEvent[] {
  const state = editor.map.world
  if (!state) return []
  const { state: next, events } = world().apply(state, action)
  editor.setWorld(next)
  // The world's own weather, day by day, while no trip has a weather of its own.
  if (next.time > state.time) rollWorldWeather()
  // The factions take the turns that came due on the way (every so many days).
  if (next.time > state.time)
    for (const at of dueTurns(next.time, worldCalendar().minutesPerDay)) worldTurnNow(at)
  return events
}

/**
 * What a trip's results do to the world: progress clocks they tick (`world.clocks.<name>: 1`,
 * by name as an id) and the factions they change (`factions.<id>.…`).
 */
export function applyWorldEffects(effects: Record<string, unknown>): void {
  for (const [path, change] of Object.entries(effects)) {
    const [, clock] = /^world\.clocks\.(.+)$/.exec(path) ?? []
    const n = Number(change)
    if (!clock || !Number.isFinite(n) || !n) continue
    const found = editor.map.world?.clocks.find((c) => factId(c.name) === clock || c.id === clock)
    if (found) worldAct({ type: 'tick', id: found.id, segments: n })
  }
  applyFactionEffects(effects)
}

/**
 * A world turn: every faction of the map takes its turn (at `time`, the world clock's by
 * default); what they did goes to the timeline, and the progress clocks they tick move.
 */
export function worldTurnNow(time = editor.map.world?.time): void {
  takeWorldTurn(
    {
      facts: worldFactsNow(),
      log: (text, data, at) => void worldAct({ type: 'log', text, data, time: at }),
      tick: (clock, segments) => {
        const found = editor.map.world?.clocks.find(
          (c) => factId(c.name) === clock || c.id === clock,
        )
        if (found) worldAct({ type: 'tick', id: found.id, segments })
      },
    },
    time,
  )
}

/**
 * Moves time on from the World panel. With a trip going on there is one time for both, and
 * the world follows the trip: with a route planned the party travels on along it (marching
 * by day, what the system does at night, waiting where the route ends), without one it
 * waits where it is; every moment is lived (dawn's checks, nights, the end of each day).
 * Time passing into another day asks first; the trip stopping early for something that
 * needs the player (a paused check, a blocked way, a value that blocks travel, a place
 * found) says so at the bottom, and so does arriving.
 */
export async function advanceWorld(how: { minutes: number } | { until: Until }): Promise<void> {
  const state = editor.map.world
  if (!state) return
  const play = editor.map.play
  const trip = play ? sessionOf(play) : null
  if (!trip)
    return void worldAct(
      'minutes' in how
        ? { type: 'advance', minutes: how.minutes }
        : { type: 'advanceUntil', until: how.until },
    )
  const until =
    'minutes' in how ? state.time + Math.max(0, how.minutes) : world().target(state, how.until)
  if (until === undefined || until <= trip.travel.time) {
    if (until !== undefined) worldAct({ type: 'setTime', time: until })
    return
  }
  const calendar = worldCalendar()
  const travelling = (trip.travel.route?.length ?? 0) > 1
  const days = calendar.describe(until).day - calendar.describe(trip.travel.time).day
  if (days > 0) {
    // What the party does each night is the system's (camp, or nothing).
    const rules = play?.rules ? getSystem(play.rules.system).rules : undefined
    const night = rules && nightAction(rules)
    const nightName =
      night && (localize(availableActions(rules).all[night]?.name, getLocale(), 'en') ?? night)
    const hex = (key: string | undefined) =>
      key ? formatCoord(parseKey(key as HexKey), editor.grid.coordFormat, editor.grid) : ''
    const question = travelling
      ? t(nightName ? 'world.confirmTravel' : 'world.confirmTravelNoNight', {
          days,
          action: nightName ?? '',
          hex: hex(trip.travel.destination),
        })
      : t(nightName ? 'world.confirmWait' : 'world.confirmWaitNoNight', {
          days,
          action: nightName ?? '',
        })
    if (!(await confirmAction(question))) return
  }
  const before = trip.journal.length
  step(travelling ? { type: 'travel', by: until } : { type: 'wait', until })
  const after = editor.map.play ? sessionOf(editor.map.play) : null
  if (!after) return
  const said = stopMessage(after, before, until)
  if (said) showToast(said.text, said.kind, 8000)
}

/** Why a trip moved on by the world clock stopped before its moment, or that it arrived. */
export function stopMessage(
  after: NonNullable<ReturnType<typeof sessionOf>>,
  before: number,
  until: number,
): { text: string; kind: 'info' | 'error' } | undefined {
  const added = after.journal.slice(before)
  const rules = editor.map.play?.rules ? getSystem(editor.map.play.rules.system).rules : undefined
  const checkName = (event: string) =>
    localize(rules?.checks?.find((c) => c.event === event)?.name, getLocale(), 'en') ?? event
  const arrived = added.some((e) => e.code === 'DESTINATION_REACHED')
  if (after.travel.time >= until)
    return arrived ? { text: t('world.arrived'), kind: 'info' } : undefined
  const pending = after.travel.pendingChecks[0]
  if (pending)
    return { text: t('world.stoppedCheck', { check: checkName(pending.event) }), kind: 'info' }
  if (added.some((e) => e.code === 'HEX_DISCOVERED' && e.data?.poi))
    return { text: t('world.stoppedFound'), kind: 'info' }
  const stopped = added.findLast((e) => e.code === 'TRAVEL_STOPPED')
  const reason = String(stopped?.data?.reason ?? '')
  // A character's condition that blocks travel: whose.
  if (reason === 'value' && typeof stopped?.data?.who === 'string') {
    const id = String(stopped.data.value)
    const play = editor.map.play
    const name =
      play?.rules &&
      memberNamer(
        getSystem(play.rules.system),
        sessionOf(play)?.members,
        getLocale(),
        translator(getLocale),
      )(`characters.${stopped.data.who}.conditions.${id}`)
    return { text: t('world.stoppedValue', { name: name || id }), kind: 'info' }
  }
  if (reason === 'value') {
    const id = String(stopped?.data?.value)
    const name = localize(rules?.values?.[id]?.name, getLocale(), 'en') ?? id
    return { text: t('world.stoppedValue', { name }), kind: 'info' }
  }
  if (reason === 'blocked' || added.some((e) => e.code === 'ROUTE_BLOCKED'))
    return { text: t('world.stoppedBlocked'), kind: 'info' }
  if (arrived) return { text: t('world.arrived'), kind: 'info' }
  return { text: t('world.waitStopped'), kind: 'info' }
}

/** Events still to come. */
export const upcoming = (state: WorldState, limit = 12) => world().upcoming(state, limit)

/**
 * A trip moved time on: the world follows, and what came due on the way is told
 * (events and holidays), as journal lines.
 */
export function followTrip(time: number): { code: string; text: string; time: number }[] {
  if (!editor.map.world || time <= editor.map.world.time) return []
  const calendar = worldCalendar() as Partial<DataCalendar>
  const holidayName = (id: string) => {
    const h = calendar.def?.holidays?.find((x) => x.id === id)
    return localize(h?.name, getLocale(), 'en') ?? id
  }
  return worldAct({ type: 'setTime', time }).flatMap((e) =>
    e.type === 'EVENT_DUE'
      ? [{ code: 'WORLD_EVENT', text: e.event.name, time: e.time }]
      : e.type === 'HOLIDAY'
        ? [{ code: 'HOLIDAY', text: holidayName(e.id), time: e.time }]
        : [],
  )
}
