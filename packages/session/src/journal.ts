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
  'SAID',
  'HELD',
  'RESUMED',
  'DESTINATION_REACHED',
  'WORLD_EVENT',
  'HOLIDAY',
  'CLOCK_FILLED',
])

const DETAIL = new Set([
  'ROLLED',
  'WEATHER_ROLLED',
  'CHANGED',
  'CHECK_SKIPPED',
  'MOMENT_REACHED',
  'ROUTE_PLANNED',
])

/** A journal line's level (older journals' lines have theirs too: it's read from the code). */
export function entryLevel(e: Line): JournalLevel {
  return STORY.has(e.code) ? 'story' : DETAIL.has(e.code) ? 'detail' : 'mechanics'
}

/** What a journal line is about. */
export function entryTopic(e: Line): JournalTopic {
  if (e.source === 'user' && e.code === 'NOTE') return 'notes'
  if (e.source === 'oracle' || e.code === 'ORACLE_ROLL') return 'oracle'
  if (e.code === 'WORLD_EVENT' || e.code === 'HOLIDAY' || e.code === 'CLOCK_FILLED') return 'world'
  if (e.code === 'ROSTER_UPDATED' || e.code === 'NOBODY_ACTING') return 'characters'
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
            depth,
          },
        ]
      : []
  return [...own, ...r.children.flatMap((c) => rolledNodes(c, depth + 1))]
}
