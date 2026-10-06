import type { HexKey } from '@open-tabletop/hex'
import { createSession, initialSessionState, type SessionState } from '@open-tabletop/session'
import { defaultCalendar } from '@open-tabletop/time'
import {
  createTravelEngine,
  initialTravelState,
  type TravelAction,
} from '@open-tabletop/travel-engine'
import { getLocale } from '../i18n/index.svelte'
import type { PlayState } from '../model/types'
import { editor } from '../store/editor.svelte'
import { getSystem, oracle } from './systems'
import { mapWorld } from './world'

export const SEASON_START_DAYS = { spring: 1, summer: 91, autumn: 181, winter: 271 } as const
export type Season = keyof typeof SEASON_START_DAYS

function current(): PlayState {
  return (
    structuredClone(editor.map.play) ?? {
      mode: 'simple',
      token: { iconId: 'game:meeple' },
      trail: [],
      showTrail: true,
    }
  )
}

function save(play: PlayState | undefined): void {
  editor.setPlay(play)
}

export function updatePlay(update: (play: PlayState) => PlayState): void {
  save(update(current()))
}

/** The rules-mode session, recreated if missing or from an incompatible save. */
export function sessionOf(play: PlayState): SessionState | null {
  const session = play.rules?.session as SessionState | undefined
  return session && typeof session === 'object' && session.travel?.location ? session : null
}

function newSession(
  play: PlayState,
  location: HexKey,
  system: string,
  season: Season = 'spring',
): PlayState {
  const rules = getSystem(system).rules
  const startDay = SEASON_START_DAYS[season]
  const travel = initialTravelState({
    location,
    mode: Object.keys(rules.modes)[0],
    time: defaultCalendar.at(startDay, rules.day.start),
    resources: Object.fromEntries(Object.keys(rules.resources ?? {}).map((r) => [r, 6])),
  })
  const stats = (sessionOf(play)?.stats as Record<string, number> | undefined) ?? { pre: 0 }
  return { ...play, rules: { system, startDay, session: initialSessionState(travel, stats) } }
}

/** Play tool click: place the party, move it (simple) or set the destination (rules). */
export function clickHex(key: HexKey): void {
  const play = current()
  if (play.mode === 'simple' || !play.location) {
    if (play.location === key) return
    play.location = key
    if (play.trail.at(-1) !== key) play.trail = [...play.trail, key]
    if (play.mode === 'rules') return save(newSession(play, key, play.rules?.system ?? 'generic'))
    return save(play)
  }
  step({ type: 'setDestination', hex: key })
}

export function setMode(mode: PlayState['mode']): void {
  const play = current()
  play.mode = mode
  if (mode === 'rules' && play.location && !sessionOf(play))
    return save(newSession(play, play.location, play.rules?.system ?? 'generic'))
  save(play)
}

/** Starts a new trip with another system (or season); the party stays where it is. */
export function restartRules(system: string, season: Season): void {
  const play = current()
  if (!play.location)
    return save({ ...play, rules: { system, startDay: SEASON_START_DAYS[season], session: null } })
  save(newSession(play, play.location, system, season))
}

/** Runs a travel action through the session (Oracle resolves bound checks). */
export function step(action: TravelAction): void {
  const play = current()
  const session = sessionOf(play)
  if (!session || !play.rules) return
  const system = getSystem(play.rules.system)
  const runner = createSession({
    travel: createTravelEngine({ world: mapWorld(editor.map), rules: system.rules }),
    oracle: system.bindings ? oracle() : undefined,
    bindings: system.bindings,
    locale: getLocale(),
  })
  const { state, entries } = runner.step(session, action)
  const entered = entries.flatMap((e) => (e.code === 'HEX_ENTERED' ? [e.data?.hex as HexKey] : []))
  save({
    ...play,
    location: state.travel.location as HexKey,
    trail: [...play.trail, ...entered],
    rules: { ...play.rules, session: state },
  })
}

/** Edits the session directly (resources, stats, mode) without a travel step. */
export function editSession(update: (session: SessionState) => SessionState): void {
  const play = current()
  const session = sessionOf(play)
  if (!session || !play.rules) return
  save({ ...play, rules: { ...play.rules, session: update(structuredClone(session)) } })
}

export function resolvePending(id: string): void {
  step({ type: 'resolveCheck', id })
}

export function clearTrail(): void {
  updatePlay((play) => ({ ...play, trail: play.location ? [play.location] : [] }))
}

/** Removes the party from the map (keeps the token style). */
export function resetParty(): void {
  updatePlay((play) => ({ ...play, location: undefined, trail: [], rules: undefined }))
}
