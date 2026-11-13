import { diceText } from '@open-tabletop/dice'
import type { Resolution } from '@open-tabletop/oracle-engine'
import { MEMBER_PATH } from './party'

/**
 * How much of what happened a journal line tells, each level holding the ones before it:
 * `story` what happened in the game (results, discoveries, arrivals, what the system says,
 * notes); `mechanics` what the rules did (hexes, actions, checks, changes, bounds); `detail`
 * what happened behind (each roll's dice, the rows chosen, checks that didn't come up and
 * why, moments reached, each value before and after). Nothing is dropped: a filter chooses
 * what's shown and exported.
 */
export type JournalLevel = 'story' | 'mechanics' | 'detail'

export const JOURNAL_LEVELS: readonly JournalLevel[] = ['story', 'mechanics', 'detail']

/** What a journal line is about, for a filter. */
export type JournalTopic = 'travel' | 'oracle' | 'world' | 'characters' | 'notes'

export const JOURNAL_TOPICS: readonly JournalTopic[] = [
  'travel',
  'oracle',
  'world',
  'characters',
  'notes',
]

/** The fields of a journal entry that say what it is. */
interface Line {
  source: string
  code: string
  data?: Record<string, unknown>
}

const STORY = new Set([
  'NOTE',
  'ORACLE_RESULT',
  'ORACLE_ROLL',
  'HEX_DISCOVERED',
  'PIECE_LAID',
  'PIECE_NOT_LAID',
  'SAID',
  'HELD',
  'RESUMED',
  'PAUSE_SKIPPED',
  'DESTINATION_REACHED',
  'MEMBER_LEFT',
  'PRESENT_CAME',
  'PRESENT_LEFT',
  'PLACE_MADE',
  'WAY_MADE',
  'MAP_ENTERED',
  'ENCOUNTER_STARTED',
  'ENCOUNTER_ROUND',
  'ENCOUNTER_TURN',
  'ENCOUNTER_ROLLS',
  'ENCOUNTER_SKIPPED',
  'ENCOUNTER_ENDED',
  'WORLD_EVENT',
  'HOLIDAY',
  'CLOCK_FILLED',
  'WORLD_TURN',
])

const DETAIL = new Set([
  'ROLLED',
  'WORLD_DO',
  'WEATHER_ROLLED',
  'CHANGED',
  'CHECK_SKIPPED',
  'MOMENT_REACHED',
  'ROUTE_PLANNED',
])

/** Lines about the world: what came due in it, a clock that filled, a world turn. */
const WORLD_CODES = new Set(['WORLD_EVENT', 'HOLIDAY', 'CLOCK_FILLED', 'WORLD_TURN', 'WORLD_DO'])

/** A journal line's level (older journals' lines have theirs too: it's read from the code). */
export function entryLevel(e: Line): JournalLevel {
  if (STORY.has(e.code)) return 'story'
  // A healing that finds nothing to heal, and the stop whose reason the line before it told.
  if (e.code === 'LIMIT_REACHED' && e.data?.limit === 'max') return 'detail'
  if (e.code === 'TRAVEL_STOPPED' && e.data?.reason === 'blocked') return 'detail'
  return DETAIL.has(e.code) ? 'detail' : 'mechanics'
}

/** What a journal line is about. */
export function entryTopic(e: Line): JournalTopic {
  if (e.source === 'user' && e.code === 'NOTE') return 'notes'
  if (e.source === 'oracle' || e.code === 'ORACLE_ROLL') return 'oracle'
  if (WORLD_CODES.has(e.code)) return 'world'
  if (
    e.code === 'ROSTER_UPDATED' ||
    e.code === 'NOBODY_ACTING' ||
    e.code === 'NOT_WRITABLE' ||
    e.code === 'REACTED' ||
    e.code === 'MEMBER_LEFT' ||
    e.code === 'PRESENT_CAME' ||
    e.code === 'PRESENT_LEFT' ||
    e.code === 'UNKNOWN_TEMPLATE'
  )
    return 'characters'
  // A change to a character (the party's own sheet is the trip's).
  const path = e.data?.path
  if (
    typeof path === 'string' &&
    MEMBER_PATH.test(path) &&
    !/^party\.(values|conditions)\./.test(path)
  )
    return 'characters'
  return 'travel'
}

/** Whether a line passes a filter: up to a level, of some topics, with some text in it. */
export function shownAt(
  e: Line,
  filter: { level: JournalLevel; topics?: readonly JournalTopic[] },
): boolean {
  return (
    JOURNAL_LEVELS.indexOf(entryLevel(e)) <= JOURNAL_LEVELS.indexOf(filter.level) &&
    (!filter.topics || filter.topics.includes(entryTopic(e)))
  )
}

/** One node of a roll on the Oracle: what was rolled, the row or card chosen, the dice. */
export interface RolledNode {
  /** The definition (`pack/id`). */
  source: string
  entry?: string
  /** The roll mode it was rolled with (full id). */
  mode?: string
  /** Each roll as one line (`2d6 → 7  [3, 4]`). */
  dice: string[]
  /** Whether its roll was the player's, the total given by hand (a foe's turn rolled by hand). */
  byHand?: true
  /** How deep in the roll (0: the one the check named). */
  depth: number
}

/** A roll on the Oracle, depth-first, as the journal keeps it (nodes that rolled or chose). */
export function rolledNodes(r: Resolution, depth = 0): RolledNode[] {
  const own: RolledNode[] =
    r.rolls.length || r.entry !== undefined
      ? [
          {
            source: r.source,
            ...(r.entry !== undefined && { entry: r.entry }),
            ...(r.mode && { mode: r.mode }),
            dice: r.rolls.map(diceText),
            ...(r.rolls.some((d) => d.byHand) && { byHand: true as const }),
            depth,
          },
        ]
      : []
  return [...own, ...r.children.flatMap((c) => rolledNodes(c, depth + 1))]
}

/** The lines that say a check waits for the player (to roll, to go on, to choose who rolls). */
const WAITING_CODES = ['CHECK_PENDING', 'CHECK_PAUSED', 'CHECK_ASKS']

/**
 * The journal line of a check waiting for the player, by its id: when it came up. An action
 * that goes on past it (a camp until dawn) leaves it in an earlier day than the trip's.
 */
export function pendingLine<E extends { code: string; data?: Record<string, unknown> }>(
  journal: readonly E[],
  id: string,
): E | undefined {
  return journal.findLast((e) => WAITING_CODES.includes(e.code) && e.data?.id === id)
}

/**
 * A journal line as beats read it: its number (`j12`), and the moment (beat) it belongs to,
 * the number of that moment's first line; absent in lines written outside a step (a note, a
 * table rolled by hand) and in older journals: each is a moment of its own.
 */
interface BeatLine extends Line {
  id: string
  beat?: number
}

/** The number of a journal line (`j12` → 12). */
const lineNumber = (e: { id: string }) => Number(e.id.slice(1))

/** Lines that start a moment of their own within a step: a fight's round, and each turn. */
const TURN_CODES = new Set(['ENCOUNTER_ROUND', 'ENCOUNTER_TURN'])

/**
 * Marks the lines a step wrote (numbered `from` on) with the moment each belongs to (`beat`):
 * the step is one moment, and each turn of a fight played on in it (a foe's) another.
 */
export function markBeats(journal: BeatLine[], from: number): void {
  // The step's lines are the journal's last: from the first numbered `from` on.
  let start = journal.length
  while (start > 0 && lineNumber(journal[start - 1]!) >= from) start--
  let beat = from
  for (let i = start; i < journal.length; i++) {
    const e = journal[i]!
    // A round begins a moment, and so does a turn but the round's first.
    const after = i > start ? journal[i - 1] : undefined
    if (
      after &&
      TURN_CODES.has(e.code) &&
      !(e.code === 'ENCOUNTER_TURN' && after.code === 'ENCOUNTER_ROUND')
    )
      beat = lineNumber(e)
    e.beat = beat
  }
}

/** One moment of play (a beat): the journal lines one step (or one turn of a fight) wrote. */
export interface Beat<E> {
  /** Its first line's id. */
  id: string
  entries: E[]
}

/** A journal's lines as moments, in the order they were written. */
export function beatsOf<E extends BeatLine>(journal: readonly E[]): Beat<E>[] {
  const beats: Beat<E>[] = []
  let last: number | undefined
  for (const e of journal) {
    if (e.beat !== undefined && e.beat === last) beats.at(-1)!.entries.push(e)
    else beats.push({ id: e.id, entries: [e] })
    last = e.beat
  }
  return beats
}

/**
 * Lines that make a moment important, shown up front: a pause, a fight starting or ending,
 * someone leaving, a place made, going into another map, what came due in the world.
 */
const NOTABLE_CODES = new Set([
  'CHECK_PAUSED',
  'HELD',
  'ENCOUNTER_STARTED',
  'ENCOUNTER_ENDED',
  'MEMBER_LEFT',
  'PLACE_MADE',
  'WAY_MADE',
  'MAP_ENTERED',
  'CLOCK_FILLED',
  'WORLD_EVENT',
  'WORLD_TURN',
  'HOLIDAY',
])

/** A result of the Oracle (a table rolled, a card drawn) and its word on being important. */
function resultNotable(e: Line): boolean | undefined {
  if (e.code !== 'ORACLE_RESULT' && e.code !== 'ORACLE_ROLL') return undefined
  const value = e.data?.value
  const notable =
    typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>).notable
      : undefined
  return typeof notable === 'boolean' ? notable : undefined
}

/**
 * The lines of a moment that make it important, in its order: those of the kinds above, a
 * condition someone gains (falling, a wound), and a result that says `notable: true`. A result
 * that says `notable: false` isn't, nor is what it sets off (the lines after it up to the next
 * result: its pause, the fight it starts, the place it makes).
 */
export function notableLines<E extends BeatLine>(entries: readonly E[]): E[] {
  const out: E[] = []
  let quiet = false
  for (const e of entries) {
    const said = resultNotable(e)
    if (e.code === 'ORACLE_RESULT' || e.code === 'ORACLE_ROLL') quiet = said === false
    if (quiet) continue
    if (said === true || NOTABLE_CODES.has(e.code) || conditionGained(e)) out.push(e)
  }
  return out
}

/** A line of a condition someone gains (a change from not holding to holding). */
function conditionGained(e: Line): boolean {
  const path = e.data?.path
  return (
    e.code === 'CHANGED' &&
    typeof path === 'string' &&
    /\.conditions\./.test(path) &&
    !Number(e.data?.from) &&
    !!Number(e.data?.to)
  )
}
