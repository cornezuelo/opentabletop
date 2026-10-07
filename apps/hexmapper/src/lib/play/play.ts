import type { HexKey } from '@open-tabletop/hex'
import {
  addEntry,
  SEASON_START_DAYS,
  seasonStart,
  startTrip,
  stepTrip,
  type Season,
  type SessionState,
  type TravelSystem,
} from '@open-tabletop/session'
import type { TravelAction } from '@open-tabletop/travel-engine'
import { getLocale } from '../i18n/index.svelte'
import { newId } from '../model/id'
import { DEFAULT_TOKEN_ICONS, partyToken } from '../model/tokens'
import type { PlayState } from '../model/types'
import { editor } from '../store/editor.svelte'
import { showToast } from '@open-tabletop/ui-kit'
import { getSystem, oracle } from './systems'
import { mapWorld } from './world'
import { followTrip } from './world.svelte'

export { SEASON_START_DAYS, type Season }

function current(): PlayState {
  return (
    structuredClone(editor.map.play) ?? {
      mode: 'simple',
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

/** Where the party stands (its token's hex). */
export function partyLocation(): HexKey | undefined {
  return partyToken(editor.map)?.hex
}

/**
 * Moves the party token (creating it the first time). Like the rest of play, outside
 * the editor's undo history.
 */
function placeParty(hex: HexKey | undefined): void {
  const token = partyToken(editor.map)
  if (token?.hex === hex) return
  if (token) editor.map.tokens = editor.map.tokens.map((t) => (t === token ? { ...t, hex } : t))
  else if (hex) {
    const id = newId()
    editor.map.tokens = [
      ...editor.map.tokens,
      { id, name: '', kind: 'party', hex, iconId: DEFAULT_TOKEN_ICONS.party },
    ]
    if (editor.tool === 'play') editor.selectedToken = id
  }
  editor.notify({ kind: 'tokens' })
}

/**
 * The party token was dragged by hand (token tool): extend the trail and, during a trip,
 * put the party there (a jump, not travel: no time passes and the route is dropped).
 */
export function partyMoved(hex: HexKey | undefined): void {
  const play = current()
  if (!hex) return save({ ...play, trail: [], rules: undefined })
  if (play.trail.at(-1) !== hex) play.trail = [...play.trail, hex]
  save(jump(play, hex))
}

/** The trip's party is now at `hex` without travelling: the route is dropped. */
function jump(play: PlayState, hex: HexKey): PlayState {
  const session = sessionOf(play)
  if (!session || !play.rules) return play
  const travel = { ...session.travel, location: hex, progress: 0 }
  delete travel.destination
  delete travel.route
  return { ...play, rules: { ...play.rules, session: { ...session, travel } } }
}

/**
 * Another token became the party (or none is): the trip, its journal and time go on
 * with it, from where it stands; its trail starts there.
 */
export function partyChanged(): void {
  const hex = partyLocation()
  const play = current()
  play.trail = hex ? [hex] : []
  save(hex ? jump(play, hex) : play)
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
  // Keep stats the user already set with this system; its declared defaults fill the rest.
  const { startDay, session } = startTrip({
    system: getSystem(system),
    location,
    season,
    stats: play.rules?.system === system ? sessionOf(play)?.stats : undefined,
    // With the world clock running, trips start at the world's time.
    ...(editor.map.world && { time: editor.map.world.time }),
  })
  return { ...play, rules: { system, startDay, session } }
}

/** Play tool click: place the party, move it (simple) or set the destination (rules). */
export function clickHex(key: HexKey): void {
  const play = current()
  const location = partyLocation()
  // The party is placed and a system chosen, but the trip hasn't started: it starts
  // where the party is, heading for the hex clicked.
  if (play.mode === 'rules' && location && !sessionOf(play)) {
    save(newSession(play, location, play.rules?.system ?? 'generic'))
    if (location !== key) step({ type: 'setDestination', hex: key })
    return
  }
  if (play.mode === 'simple' || !location || !sessionOf(play)) {
    if (location === key && (play.mode === 'simple' || sessionOf(play))) return
    placeParty(key)
    if (play.trail.at(-1) !== key) play.trail = [...play.trail, key]
    if (play.mode === 'rules') return save(newSession(play, key, play.rules?.system ?? 'generic'))
    return save(play)
  }
  step({ type: 'setDestination', hex: key })
}

export function setMode(mode: PlayState['mode']): void {
  const play = current()
  play.mode = mode
  const location = partyLocation()
  if (mode === 'rules' && location && !sessionOf(play))
    return save(newSession(play, location, play.rules?.system ?? 'generic'))
  save(play)
}

/** Starts a new trip with another system (or season); the party stays where it is. */
export function restartRules(system: string, season: Season): void {
  const play = current()
  const location = partyLocation()
  if (!location)
    return save({
      ...play,
      rules: { system, startDay: seasonStart(getSystem(system), season), session: null },
    })
  save(newSession(play, location, system, season))
}

/** Runs a travel action through the session (Oracle resolves bound checks). */
export function step(action: TravelAction): void {
  const play = current()
  const session = sessionOf(play)
  if (!session || !play.rules) return
  const system = getSystem(play.rules.system)
  const options = {
    system,
    world: mapWorld(editor.map),
    oracle: oracle(),
    locale: getLocale(),
    discover: discoverMode(play, system),
  }
  // Checks roll with the map's Oracle state, the same one hand rolls use.
  const shared = editor.map.oracle
  let result
  try {
    result = stepTrip(options, shared ? { ...session, oracle: shared.state } : session, action)
  } catch (error) {
    // A broken pack shouldn't silently stop play: say what failed.
    showToast(error instanceof Error ? error.message : String(error), 'error', 8000)
    return
  }
  const { state, entries, discovered } = result
  editor.applyDiscovery(discovered)
  const entered = entries.flatMap((e) => (e.code === 'HEX_ENTERED' ? [e.data?.hex as HexKey] : []))
  placeParty(state.travel.location as HexKey)
  editor.setOracle({ state: state.oracle, history: shared?.history ?? [] })
  // The world clock follows the trip; what came due on the way goes to the journal.
  let journaled = state
  for (const line of followTrip(state.travel.time))
    journaled = addEntry(journaled, { source: 'travel', code: line.code, text: line.text })
  save({
    ...play,
    trail: [...play.trail, ...entered],
    rules: { ...play.rules, session: journaled },
  })
}

/** How this trip discovers the map: off, or revealing neighbours or the entered hex only. */
export function discoverMode(
  play: PlayState,
  system: TravelSystem,
): 'neighbors' | 'entered' | undefined {
  const bindings = system.bindings?.discover
  if (!bindings || !play.discover?.on) return undefined
  return play.discover.reveal ?? bindings.reveal
}

export function setDiscover(discover: PlayState['discover']): void {
  updatePlay((play) => ({ ...play, discover }))
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
  const location = partyLocation()
  updatePlay((play) => ({ ...play, trail: location ? [location] : [] }))
}

/** Takes the party off the map (its token keeps its look) and ends the trip. */
export function resetParty(): void {
  placeParty(undefined)
  updatePlay((play) => ({ ...play, trail: [], rules: undefined }))
}
