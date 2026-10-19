import { formatCoord, parseKey, type HexKey } from '@open-tabletop/hex'
import {
  bringClocks as bringClocksOn,
  tripStepped as tripSteppedOn,
  missingClocks as missingClocksOf,
  startWorld as startWorldOn,
  worldAct as worldActOn,
  worldEffects,
  worldFactsOf,
  worldTurnNow as worldTurnOn,
  type WorldDone,
  type WorldHost,
  type WorldLine,
} from '@open-tabletop/campaign'
import { calendarOf, localize, type StartingClock, type SystemClocks } from '@open-tabletop/session'
import { clockFilledText, worldWords } from '@open-tabletop/campaign-ui'
import { memberNamer, translator } from '@open-tabletop/travel-ui'
import { availableActions, refId } from '@open-tabletop/travel-engine'
import { type Calendar } from '@open-tabletop/time'
import { confirmAction, showToast } from '@open-tabletop/ui-kit'
import {
  createWorld,
  type Until,
  type WorldAction,
  type WorldEvent,
  type WorldState,
} from '@open-tabletop/world-engine'
import { factionsSystem } from './factions'
import { getLocale, t } from '../i18n/index.svelte'
import { editor } from '../store/editor.svelte'
import { sessionOf, step } from './play'
import { activeSystem, getSystem, mapSystem, mapSystemId, oracle } from './systems'
import type { WeatherModel } from '@open-tabletop/weather-engine'
import { mathRandom } from '@open-tabletop/random'

/**
 * The map's world clock: its campaign's time, events scheduled on it and progress clocks
 * (played by `@open-tabletop/campaign`, on this map). It names time with the calendar of
 * the system the map plays (or the default one). It and a rules trip share one time:
 * travelling moves it, and moving it waits in the trip (`advanceWorld`). Play state: saved
 * with the campaign, outside the undo history.
 */

/** The calendar the world uses: the system's own (the trip's, or the map's), or the default one. */
export function worldCalendar(): Calendar {
  return calendarOf(activeSystem())
}

const world = () => createWorld({ calendar: worldCalendar() })

/** The trip going on on the map, if any. */
function tripNow() {
  const play = editor.map.play
  return play ? sessionOf(play) : null
}

/** What the world plays with here: the map's system, its Oracle, the trip going on. */
function host(): WorldHost {
  const system = mapSystem()
  const trip = tripNow()
  return {
    calendar: worldCalendar(),
    clocks: system.clocks,
    fallback: system.locale,
    weather: worldWeatherModel(),
    factions: factionsSystem(),
    oracle: oracle(),
    random: mathRandom(),
    locale: getLocale(),
    ...(trip && { trip: { weather: trip.travel.weather } }),
    words: worldWords(getLocale),
  }
}

const place = () => ({ campaign: editor.campaign, map: editor.map })

/** Keeps what the world did, and tells the clocks that filled on the way. */
function take<T extends WorldDone>(done: T): T {
  editor.takeWorld(done)
  for (const { clock, text } of done.filled)
    showToast(clockFilledText(getLocale(), clock, text), 'info', 8000)
  return done
}

/**
 * What tables and conditions read of the world: the world clock's (its clocks, today's
 * events), if running, and the factions' (`factions.<id>.*`), if the map has them.
 */
export function worldFactsNow(): Record<string, unknown> | undefined {
  return worldFactsOf(place(), host())
}

/** When the clock starts unless another date is chosen: the trip's time, else 06:00 of day 1. */
export function defaultStart(): number {
  return tripNow()?.travel.time ?? worldCalendar().at(1, '06:00')
}

/**
 * Starts the clock at a date (by default `defaultStart`). With a trip going on, the world
 * and the trip share one time, so it starts at the trip's.
 */
export function startWorld(time = defaultStart()): void {
  take(startWorldOn(place(), tripNow()?.travel.time ?? time, host()))
}

/** The progress clocks the map's system declares (`kind: clocks`), if any. */
export const systemClocks = (): SystemClocks | undefined => mapSystem().clocks

/** The clocks the map's system declares that the world doesn't have (by their declared id). */
export function missingClocks(): StartingClock[] {
  return missingClocksOf(editor.campaign, host())
}

/** Adds the clocks the map's system declares that the world doesn't have yet. */
export function bringClocks(): void {
  take(bringClocksOn(place(), host()))
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
export function worldWeatherNow(): { id: string; name: string } | undefined {
  const play = editor.map.play
  const trip = play ? sessionOf(play) : null
  const id = trip ? trip.travel.weather : editor.campaign.worldWeather?.weather
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
  const state = editor.campaign.world
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
  return take(worldActOn(place(), action, host())).events
}

/**
 * What a trip's results do to the world: progress clocks they tick (`world.clocks.<name>: 1`,
 * by name as an id or by the id its system declares it with; `'=N'` fills it up to N) and the factions they change (`factions.<id>.…`).
 */
export function applyWorldEffects(effects: Record<string, unknown>): void {
  take(worldEffects(place(), effects, host()))
}

/**
 * A world turn: every faction of the map takes its turn (at `time`, the world clock's by
 * default); what they did goes to the timeline, and the progress clocks they tick move.
 */
export function worldTurnNow(time = editor.campaign.world?.time): void {
  take(worldTurnOn(place(), host(), time))
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
  const state = editor.campaign.world
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
  // With a route and a way the system goes on by itself (`travel.onward`), it travels on.
  const travelling = (trip.travel.route?.length ?? 0) > 1 && !!activeSystem().rules.travel.onward
  const days = calendar.describe(until).day - calendar.describe(trip.travel.time).day
  if (days > 0) {
    // What the party does when it can't march is the system's halt (camp, or nothing).
    const rules = play?.rules ? getSystem(play.rules.system).rules : undefined
    const night = refId('actions', rules?.travel.halt?.do)
    const nightName =
      night &&
      rules &&
      (localize(availableActions(rules).all[night]?.name, getLocale(), 'en') ?? night)
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
  // A step of an action waits for the player (a pause, a question).
  const waiting = after.travel.waiting
  if (waiting) {
    const action = localize(rules?.actions?.[waiting.action]?.name, getLocale(), 'en')
    return { text: t('world.stoppedHeld', { action: action ?? waiting.action }), kind: 'info' }
  }
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
 * The map's trip stepped: its checks rolled on the campaign's Oracle, what it did to the
 * world, and the world following its time; returns what came due on the way (events and
 * holidays), as journal lines.
 */
export function tripStepped(step: Parameters<typeof tripSteppedOn>[1]): WorldLine[] {
  return take(tripSteppedOn(place(), step, host())).lines
}
