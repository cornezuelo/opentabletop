import { cellCenter, keyOf, neighborCells, parseKey, type HexKey } from '@open-tabletop/hex'
import { loadLinks, makeLaidWays, placeLabel } from '../io/submaps'
import {
  askTimePassed,
  highlightText,
  journalContext,
  timeBehind,
  translator,
  whyText,
} from '@open-tabletop/travel-ui'
import {
  addEntry,
  calendarOf,
  SEASON_START_DAYS,
  seasonStart,
  startTrip,
  stepTrip,
  settleTrip,
  shareTrip,
  type Season,
  moveTrip,
  type SessionState,
  type TravelSystem,
  travels,
  tripAvailability,
} from '@open-tabletop/session'
import { movingActions, type TravelAction } from '@open-tabletop/travel-engine'
import { getLocale, t } from '../i18n/index.svelte'
import {
  cellOfPlace,
  DEFAULT_TOKEN_ICONS,
  mapWalls,
  newId,
  parseAreaPlace,
  partyToken,
  placeOfCell,
  type PlayState,
} from '@open-tabletop/map'
import { editor } from '../store/editor.svelte'
import { confirmAction, showToast } from '@open-tabletop/ui-kit'
import {
  keepMapSheet,
  MAX_HEARD,
  otherTrip,
  playTrip,
  takeMoments,
  tripOnMap,
  type CampaignTrip,
} from '@open-tabletop/campaign'
import { chooseSystem, keepOpenMap, openLibraryMap } from '../io/actions.svelte'
import { ARROWS } from '../tools/keyboardDraw'
import { getSystem, mapSystemId, oracle } from './systems'
import { mapWorld, parsePlaceOn } from '@open-tabletop/map'
import { tripHighlights, tripStepped, worldBlocked, worldFactsNow } from './world.svelte'

export { SEASON_START_DAYS, type Season }

/**
 * The map as the trip sees it with the system's scale: its places, and the ways into its
 * sub-maps and out of it (the maps the library keeps).
 */
export function playWorld(system: TravelSystem) {
  return mapWorld(editor.map, system.rules.travel.cellKm, editor.linked)
}

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

/** Whether the party stands at this cell's place: on it, or anywhere in its room. */
export function partyAt(key: HexKey): boolean {
  const location = partyLocation()
  return !!location && placeOfCell(editor.map, location) === placeOfCell(editor.map, key)
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
  const travel = { ...session.travel, location: placeOfCell(editor.map, hex), progress: 0 }
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
  // A system without travel rules plays no trips (Play says so).
  if (!travels(getSystem(system)))
    return {
      ...play,
      rules: { system, startDay: seasonStart(getSystem(system), season), session: null },
    }
  // Keep stats the user already set with this system; its declared defaults fill the rest.
  const { startDay, session } = startTrip({
    system: getSystem(system),
    // A cell of a room starts the trip in the room.
    location: placeOfCell(editor.map, location),
    season,
    stats: play.rules?.system === system ? sessionOf(play)?.stats : undefined,
    // …and its characters: the same party goes on to the next trip.
    members:
      play.rules?.system === system ? (sessionOf(play)?.members ?? play.rules.members) : undefined,
    // …and its party, the roster's if it was.
    ...(play.rules?.system === system && {
      party: sessionOf(play)?.party,
      partyRef: sessionOf(play)?.partyRef,
    }),
    // With the world clock running, trips start at the world's time.
    ...(editor.campaign.world && { time: editor.campaign.world.time }),
    // What the trip's rolls in conditions are seeded with: each trip its own.
    seed: Math.random().toString(36).slice(2, 10),
  })
  // The map's own sheet: the one the campaign keeps for it.
  const here = tripOnMap(editor.campaign, session, getSystem(system), editor.map.meta.id)
  return { ...play, rules: { system, startDay, session: here } }
}

/** Play tool click: place the party, move it (simple) or set the destination (rules). */
export function clickHex(key: HexKey): void {
  const play = current()
  // The trip went on into another map: this one waits for it, untouched.
  if (play.away) return void showToast(t('submap.awayHere'), 'info', 6000)
  // A campaign has one party: placing it here (Simple) or a trip starting here pauses the one
  // going on elsewhere first, else the party would be put where it isn't drawn.
  const other = otherTrip(editor.campaign, mapTrip())
  if (other && (play.mode === 'simple' || !sessionOf(play)))
    return void claimThen(other, () => clickHex(key))
  const location = partyLocation()
  // The party is placed and a system chosen, but the trip hasn't started: it starts
  // where the party is, heading for the hex clicked.
  if (play.mode === 'rules' && location && !sessionOf(play)) {
    // A system without travel rules plays no trips (Play says so).
    if (!travels(getSystem(mapSystemId()))) return
    save(newSession(play, location, mapSystemId()))
    layFirstPiece()
    const to = placeOfCell(editor.map, key)
    if (placeOfCell(editor.map, location) !== to) step({ type: 'setDestination', place: to })
    return
  }
  if (play.mode === 'simple' || !location || !sessionOf(play)) {
    if (location === key && (play.mode === 'simple' || sessionOf(play))) return
    placeParty(key)
    if (play.trail.at(-1) !== key) play.trail = [...play.trail, key]
    if (play.mode !== 'rules') return save(play)
    save(newSession(play, key, mapSystemId()))
    return layFirstPiece()
  }
  headFor(key)
}

/**
 * The cell of a room the party was sent to: the trip heads for the room (one place to the
 * rules), and the party stands on that cell once it's there.
 */
let aimed: HexKey | undefined

/**
 * The trip heads for a cell's place (a cell of a room is the room), and the party will stand
 * on that cell. Already in its room, it steps across to it at once: no time passes.
 */
function headFor(cell: HexKey): void {
  const place = placeOfCell(editor.map, cell)
  aimed = parseAreaPlace(place) ? cell : undefined
  step({ type: 'setDestination', place })
}

/** The party stands on another cell of its room: only its token and trail move. */
function standAt(cell: HexKey): void {
  const play = current()
  if (play.trail.at(-1) !== cell) play.trail = [...play.trail, cell]
  save(play)
  placeParty(cell)
}

/** Where the party is drawn in a place it stepped to: the cell it was sent to, if it's there. */
function cellThere(
  { location, destination }: { location: string; destination?: string },
  near: string | undefined,
): HexKey | undefined {
  const there = aimed && placeOfCell(editor.map, aimed) === location
  return there && (!destination || destination === location)
    ? aimed
    : cellOfPlace(editor.map, location, near)
}

/** A map laid piece by piece starts under the party's feet, as soon as a trip stands on it. */
function layFirstPiece(): void {
  const session = sessionOf(current())
  if (!session || current().discover?.on !== true || current().discover?.reveal !== 'pieces') return
  if (session.travel.destination) return
  step({ type: 'setDestination', place: session.travel.location })
  editSession((s) => {
    const travel = { ...s.travel }
    delete travel.destination
    return { ...s, travel }
  })
}

/** Whether a map has nothing drawn yet: what a trip finds is all it will have. */
export const blankMap = (): boolean =>
  !Object.values(editor.map.hexes).some((hex) => hex.terrain) &&
  !editor.map.tokens.some((token) => token.kind === 'party')

/**
 * Starts playing a blank map: the party at the way that leads here, or in the middle of the
 * map, on a trip of the map's system.
 */
export function startOnBlankMap(): void {
  const { width, height } = editor.map.grid
  const start = editor.map.meta.parent?.ways[0]?.entrance
  editor.tool = 'play'
  setMode('rules')
  clickHex((start ?? keyOf({ col: Math.floor(width / 2), row: Math.floor(height / 2) })) as HexKey)
}

/**
 * The party walks to a place: the route planned as for a click, and the system's way of going
 * on taken at once. A place no route reaches stays out of reach: nothing moves, and it says so.
 */
export function walkTo(place: string, cell?: HexKey): void {
  const session = sessionOf(current())
  if (!session) return
  if (place === session.travel.location) {
    if (cell && parseAreaPlace(place)) standAt(cell)
    return
  }
  const rules = getSystem(mapSystemId()).rules
  const onward = rules.travel.onward
  const id = onward ? onward.do.replace(/^actions\./, '') : movingActions(rules)[0]
  // Lost for the day, a check waiting, a rule of the system: nothing moves, and it says why.
  const why = walkBlocked(id)
  if (why) return void showToast(why, 'info', 6000)
  aimed = cell && placeOfCell(editor.map, cell) === place ? cell : undefined
  step({ type: 'setDestination', place })
  const travel = sessionOf(current())?.travel
  if (!travel?.route || travel.route.length < 2)
    return void showToast(t('play.noWayThere'), 'info', 5000)
  if (id) step({ type: 'action', id, ...(onward?.with && { with: onward.with }) })
}

/** Why the party can't walk now (the trip held, or its way of going on), in words; '' if it can. */
function walkBlocked(action: string | undefined): string {
  const play = current()
  const session = sessionOf(play)
  if (!session || !play.rules) return ''
  const system = getSystem(play.rules.system)
  const blocked = tripAvailability(
    { system, world: playWorld(system), facts: worldFactsNow() },
    session,
  )
  const because = blocked.travel ?? (action ? blocked[action] : undefined)
  if (!because) return ''
  const context = journalContext({
    system,
    session,
    locale: getLocale(),
    t: translator(getLocale),
    startDay: play.rules.startDay,
    facts: worldFactsNow(),
  })
  return whyText(because, context) || t('play.noWayThere')
}

/** What to do next, in words: where to head (`again`: having arrived), or which exit to open. */
export function destinationHelp(again = false): string {
  if (current().discover?.on && current().discover?.reveal === 'pieces') return t('play.exitsHelp')
  return t(again ? 'play.newDestination' : 'play.destinationHelp')
}

/** Whether the trip's panel is in sight: Play's view of the side panel, not hidden. */
export const playPanelShown = (): boolean =>
  !editor.panelHidden && editor.panelView === 'tool' && editor.tool === 'play'

/** Brings the trip's panel into sight. */
export function showPlayPanel(): void {
  editor.tool = 'play'
  editor.panelView = 'tool'
  editor.panelHidden = false
}

/** Whether a trip goes on here: what the party does then follows its rules. */
export const onTrip = (): boolean =>
  current().mode === 'rules' && !current().away && !!sessionOf(current())

/** W A S D, as the arrows in Play. */
const WASD: Record<string, string> = {
  w: 'arrowup',
  a: 'arrowleft',
  s: 'arrowdown',
  d: 'arrowright',
}

/**
 * Playing with the keyboard: an arrow (or W A S D) walks the party one place that way; in a
 * room, one cell (`stepInRoom`). True if it was for it.
 */
export function walkByKey(key: string): boolean {
  const direction = ARROWS[WASD[key] ?? key]
  if (!direction || editor.mode !== 'play' || !onTrip()) return false
  if (parseAreaPlace(sessionOf(current())?.travel.location ?? '')) {
    stepInRoom(direction)
    return true
  }
  const place = placeToward(direction)
  if (place) walkTo(place)
  else showToast(t('play.noWayThere'), 'info', 5000)
  return true
}

/**
 * In a room (a region played as one place), a key steps one cell: within the room only where
 * the party stands changes (no time passes, as the room is one place to the rules); onto a
 * cell of another place, through a door or an opening, it's a step of the trip there. A wall
 * stops it.
 */
function stepInRoom(direction: { x: number; y: number }): void {
  const here = partyLocation()
  if (!here) return
  const { grid } = editor.map
  const next = towards(
    here,
    direction,
    neighborCells(parseKey(here), grid).map((cell) => [keyOf(cell), keyOf(cell)]),
  )
  if (!next || mapWalls(editor.map).between(here, next))
    return void showToast(t('play.noWayThere'), 'info', 5000)
  const place = placeOfCell(editor.map, next)
  if (place !== placeOfCell(editor.map, here)) return walkTo(place)
  standAt(next)
}

/**
 * Of some things drawn on cells (`[thing, cell]`), the one that lies most nearly in a direction
 * on the screen from a cell, if any lies that way at all.
 */
function towards<T>(
  from: HexKey,
  direction: { x: number; y: number },
  candidates: [T, HexKey][],
): T | undefined {
  const { grid } = editor.map
  const start = cellCenter(parseKey(from), grid, 1)
  let best: { thing: T; fit: number } | undefined
  for (const [thing, cell] of candidates) {
    const to = cellCenter(parseKey(cell), grid, 1)
    const [x, y] = [to.x - start.x, to.y - start.y]
    const fit = (x * direction.x + y * direction.y) / (Math.hypot(x, y) || 1)
    if (fit > 0.4 && fit > (best?.fit ?? 0)) best = { thing, fit }
  }
  return best?.thing
}

/**
 * The place next to the party's that lies in a direction on the screen, of those a step can
 * reach: through a door, out of a room, along a connection. Walls and the map's edge have none.
 */
export function placeToward(direction: { x: number; y: number }): string | undefined {
  const session = sessionOf(current())
  const here = partyLocation()
  if (!session || !here) return undefined
  const places = playWorld(getSystem(mapSystemId())).neighbors(session.travel.location)
  return towards(
    here,
    direction,
    places.flatMap((place): [string, HexKey][] => {
      const cell = cellOfPlace(editor.map, place, here)
      return cell ? [[place, cell]] : []
    }),
  )
}

export function setMode(mode: PlayState['mode']): void {
  const play = current()
  play.mode = mode
  const location = partyLocation()
  if (mode !== 'rules' || !location || sessionOf(play)) return save(play)
  // A trip starting here pauses the one going on elsewhere in the campaign first.
  const other = otherTrip(editor.campaign, mapTrip())
  if (other) {
    save(play)
    return void claimThen(other, () => save(newSession(current(), location, mapSystemId())))
  }
  save(newSession(play, location, mapSystemId()))
}

/**
 * Starts a new trip (with another system, which becomes the campaign's, asking first if
 * other maps or trips are in it, or season); the party stays where it is. False if not.
 */
export async function restartRules(system: string, season: Season): Promise<boolean> {
  if (!(await chooseSystem(system))) return false
  newTrip(system, season)
  return true
}

function newTrip(system: string, season: Season): void {
  // A new trip here: the one gone to another map stays there, and this map plays again.
  const play = { ...current() }
  delete play.away
  const location = partyLocation()
  if (!location) {
    // Nothing shows yet: say what starts it.
    showToast(t('play.placeFirst'), 'info', 6000)
    return save({
      ...play,
      rules: { system, startDay: seasonStart(getSystem(system), season), session: null },
    })
  }
  save(newSession(play, location, system, season))
}

/** The map's trip, as the trip going on in its campaign. */
const mapTrip = (): CampaignTrip => ({
  app: 'map',
  id: editor.map.meta.id,
  name: editor.map.meta.name,
})

/**
 * Makes the map's trip the one going on in its campaign: if another trip played there last
 * (one of Travel's, another map's), asks to pause it; then goes on with `then`.
 */
async function claimThen(other: CampaignTrip, then: () => void): Promise<void> {
  if (!(await confirmAction(t('play.pauseOther', { trip: other.name })))) return
  editor.setPlaying(mapTrip())
  editor.notify({ kind: 'tokens' })
  then()
}

/** Plays `action`, hearing the world's moments before and after it. */
function stepHearing(action: TravelAction, heard = 0): void {
  if (heard === 0) hearWorld()
  stepOnly(action)
  hearWorld(heard)
}

/** The campaign's clock went on without the trip: the party lives that time or skips it. */
async function catchUpThen(until: number, action: TravelAction): Promise<void> {
  const play = current()
  const session = sessionOf(play)
  if (!session || !play.rules) return
  const system = getSystem(play.rules.system)
  const choice = await askTimePassed(getLocale(), session, until, calendarOf(system))
  if (!choice) return
  if (choice === 'live') stepHearing({ type: 'wait', until })
  else {
    // What the world had waiting for the party passed it by.
    editor.takeWorld({ campaign: takeMoments(editor.campaign, system.rules).campaign })
    stepOnly({ type: 'skip', until })
  }
  stepHearing(action)
}

/**
 * Runs a travel action through the session (Oracle resolves bound checks). The trip hears
 * the moments of the world first, those that came while it wasn't stepping (a clock filled
 * by hand, in another app), and then those its step made happen.
 */
export function step(action: TravelAction, heard = 0): void {
  const play = current()
  const session = sessionOf(play)
  if (!session || !play.rules) return
  // The campaign's world waits for the player: the trip doesn't move until it's answered.
  if (heard === 0 && worldBlocked()) return
  // One trip at a time in a campaign: another one that played there last is paused first.
  const other = otherTrip(editor.campaign, mapTrip())
  if (other) return void claimThen(other, () => step(action))
  if (playTrip(editor.campaign, mapTrip()) !== editor.campaign) editor.setPlaying(mapTrip())
  const time = editor.campaign.world?.time
  if (heard === 0 && timeBehind(session, time)) return void catchUpThen(time, action)
  stepHearing(action, heard)
}

/**
 * The moments the world has waiting for the map's trip, if it's the one going on in its
 * campaign: each told in its journal and played (an action's `on:`, a check's `at:`).
 */
export function hearWorld(heard = 0): void {
  const play = editor.map.play
  if (heard >= MAX_HEARD || !play?.rules || !sessionOf(play)) return
  if (!editor.campaign.playing || otherTrip(editor.campaign, mapTrip())) return
  const taken = takeMoments(editor.campaign, getSystem(play.rules.system).rules)
  if (taken.campaign === editor.campaign) return
  editor.takeWorld({ campaign: taken.campaign })
  for (const { at, clock, told } of taken.heard) {
    const now = current()
    const trip = sessionOf(now)
    if (!trip || !now.rules) return
    // A full clock is told; a world turn too if played elsewhere (here, as it was played).
    const line =
      clock !== undefined
        ? { code: 'CLOCK_FILLED', text: clock }
        : told && { code: 'WORLD_TURN', ...told }
    if (line) {
      const session = addEntry(trip, { source: 'travel', ...line })
      save({ ...now, rules: { ...now.rules, session } })
    }
    if (at !== undefined) step({ type: 'moment', at }, heard + 1)
  }
}

/** Runs a travel action through the session, and what it did in the world. */
function stepOnly(action: TravelAction): void {
  const play = current()
  const session = sessionOf(play)
  if (!session || !play.rules) return
  const system = getSystem(play.rules.system)
  const options = {
    system,
    world: playWorld(system),
    oracle: oracle(),
    locale: getLocale(),
    discover: discoverMode(play, system),
    facts: worldFactsNow(),
  }
  // Checks roll with the map's Oracle state, the same one hand rolls use; the map's own
  // sheet is the one the campaign keeps for this map.
  const shared = editor.campaign.oracle
  const here = tripOnMap(editor.campaign, session, system, editor.map.meta.id)
  let result
  try {
    result = stepTrip(options, shared ? { ...here, oracle: shared.state } : here, action)
  } catch (error) {
    // A broken pack shouldn't silently stop play: say what failed.
    showToast(error instanceof Error ? error.message : String(error), 'error', 8000)
    return
  }
  const { state, entries, discovered, laid } = result
  editor.takeWorld({ campaign: keepMapSheet(editor.campaign, state.map) })
  editor.applyDiscovery(discovered)
  editor.applyLaid(laid)
  // Ways into maps of their own (a piece's exit, a result's `place.ways.<kind>`): each new map
  // made and kept, hanging from its cell (the party's, for a result).
  const ways = [
    ...laid.flatMap((piece) => piece.ways ?? []),
    ...entries.flatMap((e) => {
      const place = String(e.data?.place ?? '')
      if (e.code !== 'WAY_MADE' || !place || parsePlaceOn(place)) return []
      const at = cellOfPlace(editor.map, place, partyLocation())
      return at ? [{ at, kind: String(e.data?.kind) }] : []
    }),
  ]
  void makeLaidWays(ways).catch((error) =>
    showToast(error instanceof Error ? error.message : String(error), 'error', 8000),
  )
  // Places of another map (a way in or out) are that map's trail, not this one's; a room is
  // drawn on its cell where the party came in.
  let near: string | undefined = partyLocation()
  const entered = entries.flatMap((e) => {
    const place = String(e.data?.place)
    if (e.code !== 'PLACE_ENTERED' || parsePlaceOn(place)) return []
    const at = cellOfPlace(editor.map, place, near)
    near = at ?? near
    return at ? [at] : []
  })
  const into = parsePlaceOn(state.travel.location)
  // In the room it was sent to, the party stands on the cell chosen.
  const stands = !into ? cellThere(state.travel, near) : undefined
  if (stands && stands === aimed) {
    if (stands !== entered.at(-1)) entered.push(stands)
    aimed = undefined
  }
  if (!into) placeParty(stands)
  // The checks rolled on the campaign's Oracle, what the step did to the world (its clocks,
  // its factions) and the world clock following the trip; what came due goes to the journal.
  let journaled = state
  // Its highlights (arrivals, places found, pauses) go to the campaign's timeline too.
  const highlights = highlightsOf(entries, system)
  for (const line of tripStepped({
    oracle: state.oracle,
    entries,
    time: state.travel.time,
    highlights,
  }))
    journaled = addEntry(journaled, { source: 'travel', code: line.code, text: line.text })
  save({
    ...play,
    trail: [...play.trail, ...entered],
    rules: { ...play.rules, session: journaled },
  })
  // The party went through a way into another map: the trip goes on there.
  if (into) void goOnIn(into.map)
}

/**
 * The trip reached a place of another map of its tree (into a sub-map, or out of it): it
 * goes on there, the same trip (members, journal, time), and that map opens. This map keeps
 * the party where it left from, and says where the trip went (`away`).
 */
export async function goOnIn(map: string): Promise<boolean> {
  const play = current()
  const session = sessionOf(play)
  if (!session || !play.rules) return false
  const moved = moveTrip(session, editor.map.meta.id, map)
  const { rules, discover } = play
  save({ ...play, away: map, rules: { ...rules, session: null } })
  await keepOpenMap().catch(console.error)
  if (!(await openLibraryMap(map))) {
    // The other map isn't kept here: the trip stays where it was.
    save({ ...play, rules: { ...rules, session } })
    showToast(t('submap.missing'), 'error')
    return false
  }
  const here = current()
  delete here.away
  // An entrance in a room is the room, drawn on the entrance of the way taken.
  moved.travel = { ...moved.travel, location: placeOfCell(editor.map, moved.travel.location) }
  const entrance = editor.map.meta.parent?.ways
    .map((w) => w.entrance)
    .find((e) => placeOfCell(editor.map, e) === moved.travel.location)
  const location = cellOfPlace(editor.map, moved.travel.location, entrance)
  placeParty(location)
  // This map's own sheet now: the one the campaign keeps for it.
  const onMap = tripOnMap(editor.campaign, moved, getSystem(rules.system), editor.map.meta.id)
  save({
    ...here,
    mode: 'rules',
    trail: !location || here.trail.at(-1) === location ? here.trail : [...here.trail, location],
    rules: { system: rules.system, startDay: rules.startDay, session: onMap },
    // A map says how it's discovered; one that doesn't goes on as the trip was.
    ...((here.discover ?? discover) && { discover: here.discover ?? discover }),
  })
  editor.setPlaying(mapTrip())
  // A map laid piece by piece starts under the party's feet.
  if (current().discover?.on && current().discover?.reveal === 'pieces') {
    const heading = moved.travel.destination
    step({ type: 'setDestination', place: moved.travel.location })
    if (!heading)
      editSession((s) => {
        const travel = { ...s.travel }
        delete travel.destination
        return { ...s, travel }
      })
  }
  // Heading on beyond (out by another way of a tunnel): the route is planned again here, or
  // the destination given up if this map's ways don't reach it.
  const destination = moved.travel.destination
  if (destination && destination !== moved.travel.location) {
    await loadLinks()
    step({ type: 'setDestination', place: destination })
    if (!sessionOf(current())?.travel.route)
      editSession((s) => {
        const travel = { ...s.travel }
        delete travel.destination
        return { ...s, travel }
      })
  }
  return true
}

/** How this trip discovers the map: off, or revealing neighbours or the entered hex only. */
export function discoverMode(
  play: PlayState,
  system: TravelSystem,
): 'neighbors' | 'entered' | 'pieces' | undefined {
  const bindings = system.bindings?.discover
  if (!bindings || !play.discover?.on) return undefined
  return play.discover.reveal ?? bindings.reveal
}

export function setDiscover(discover: PlayState['discover']): void {
  updatePlay((play) => ({ ...play, discover }))
}

/** Edits the session directly (stats, mode, the party) without a travel step. */
export function editSession(update: (session: SessionState) => SessionState): void {
  const play = current()
  const session = sessionOf(play)
  if (!session || !play.rules) return
  const system = getSystem(play.rules.system)
  // What holds by itself in the trip's world follows the change at once.
  const next = settleTrip(
    {
      system,
      world: playWorld(system),
      locale: getLocale(),
      facts: worldFactsNow(),
    },
    update(structuredClone(session)),
  ).state
  save({ ...play, rules: { ...play.rules, session: next } })
  // The map's own sheet, changed by hand, is the campaign's for this map.
  if (next.map?.id === editor.map.meta.id)
    editor.takeWorld({ campaign: keepMapSheet(editor.campaign, next.map) })
  // What the edit told worth keeping (a character leaving) goes to the timeline too.
  const added = next.journal.slice(session.journal.length)
  tripHighlights(highlightsOf(added, system))
}

/**
 * Answers the first share waiting (**Ask who gives**): what each member gives or takes, or
 * nothing to keep the system's rule's share.
 */
export function shareSession(moved?: Record<string, number>): void {
  const play = current()
  const session = sessionOf(play)
  if (!session || !play.rules) return
  const system = getSystem(play.rules.system)
  const next = shareTrip(
    {
      system,
      world: playWorld(system),
      locale: getLocale(),
      facts: worldFactsNow(),
    },
    session,
    moved,
  ).state
  save({ ...play, rules: { ...play.rules, session: next } })
}

/** A trip's journal lines worth a line in the campaign's timeline, in the UI's words. */
function highlightsOf(
  entries: SessionState['journal'],
  system: ReturnType<typeof getSystem>,
): { time: number; text: string }[] {
  const hexLabel = placeLabel
  return entries.flatMap((e) => {
    const text = highlightText(e, { rules: system.rules, locale: getLocale(), hexLabel })
    return text ? [{ time: e.time, text }] : []
  })
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
