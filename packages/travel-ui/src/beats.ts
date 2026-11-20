import {
  beatsOf,
  entryLevel,
  JOURNAL_LEVELS,
  lastStepEntries,
  notableLines,
  PARTY_ID,
  type Beat,
  type JournalEntry,
  type JournalLevel,
  type RolledNode,
  type SessionState,
} from '@open-tabletop/session'
import { idText } from './i18n'
import {
  changeParts,
  durationText,
  entryText,
  eventName,
  filterJournal,
  type JournalContext,
  type JournalFilter,
} from './journal'

export type { Beat }

/** A moment of play told: its title, its lines, what it changed and why, and whether it matters. */
export interface BeatTold {
  id: string
  /** What was done or what happened: _March · 8 h_, _The wolf's turn_. */
  title: string
  /** The lines under the title the level shows (the story first: results, finds, what was said). */
  lines: {
    id: string
    text: string
    notable: boolean
    level: JournalLevel
    /** The dice a result was rolled with (each table it went through), to draw them. */
    dice?: Dice
    /** The cards it drew, to draw them. */
    cards?: Cards
  }[]
  /** What it changed, a short text each: _Ration −1_, _Kael: Wounded_. */
  changes: string[]
  /** The rules behind it (checks that didn't come up, limits, why a march stopped), folded. */
  why: string[]
  /** Whether it's an important moment (a pause, a fight, a place found…). */
  notable: boolean
  /** Its first line, for its day and time. */
  first: JournalEntry
}

/**
 * The rolls of a result, each die kept (older journals only kept them as text); `inside` those
 * rolled inside the row another roll came to (a row's harm), drawn after it.
 */
export type Dice = (NonNullable<RolledNode['results']>[number] & { inside?: boolean })[]

/**
 * A node's dice, those its row rolled inside it marked so; every one of them when the node is
 * itself inside another's result (`inside`: a table a row led to).
 */
export function nodeDice(n: RolledNode, inside = false): Dice {
  const results = n.results ?? []
  const at = inside ? 0 : results.length - (n.inside ?? 0)
  return results.map((r, i) => (i < at ? r : { ...r, inside: true }))
}

/**
 * The dice each result of a moment was rolled with: the roll's line (`ROLLED`, what happened
 * behind) comes just before its result's, for the same check.
 */
export function diceOf(entries: readonly JournalEntry[]): Map<string, Dice> {
  const out = new Map<string, Dice>()
  let rolled: { check: unknown; dice: Dice } | undefined
  for (const e of entries) {
    if (e.code === 'ROLLED') {
      const nodes = Array.isArray(e.data?.rolls) ? (e.data.rolls as RolledNode[]) : []
      // What the check rolled first; what its row rolled, and the tables it led to, after.
      rolled = { check: e.data?.check, dice: nodes.flatMap((n) => nodeDice(n, n.depth > 0)) }
    } else if (e.code === 'ORACLE_RESULT' && rolled && rolled.check === e.data?.event) {
      if (rolled.dice.length) out.set(e.id, rolled.dice)
      rolled = undefined
    }
  }
  return out
}

/** The faces of the cards a result drew, in order. */
export type Cards = NonNullable<RolledNode['face']>[]

/** The cards each result of a moment drew, found as its dice are (`diceOf`). */
export function cardsOf(entries: readonly JournalEntry[]): Map<string, Cards> {
  const out = new Map<string, Cards>()
  let drawn: { check: unknown; cards: Cards } | undefined
  for (const e of entries) {
    if (e.code === 'ROLLED') {
      const nodes = Array.isArray(e.data?.rolls) ? (e.data.rolls as RolledNode[]) : []
      drawn = { check: e.data?.check, cards: nodes.flatMap((n) => (n.face ? [n.face] : [])) }
    } else if (e.code === 'ORACLE_RESULT' && drawn && drawn.check === e.data?.event) {
      if (drawn.cards.length) out.set(e.id, drawn.cards)
      drawn = undefined
    }
  }
  return out
}

/** The lines that make a moment's title: what was done, or a fight's round and turn. */
const TITLE_CODES = new Set(['ACTION_TAKEN', 'ENCOUNTER_ROUND', 'ENCOUNTER_TURN'])

/** What a line changed (a result's effects, an action's), in a moment's changes rather than its line. */
function effectsOf(e: JournalEntry): Record<string, unknown> | undefined {
  const d = e.data ?? {}
  if (e.code === 'ORACLE_RESULT' && typeof d.value === 'object' && d.value !== null)
    return d.value as Record<string, unknown>
  if ((e.code === 'ACTION_TAKEN' || e.code === 'CHECK_EFFECTS') && d.effects)
    return { effects: d.effects }
  return undefined
}

/** Effects on whoever acts (`acting.…`) as effects on that one (`characters.<id>.…`), when known. */
function asActing(value: Record<string, unknown>, who: string | undefined) {
  const effects = value.effects
  if (who === undefined || typeof effects !== 'object' || effects === null) return value
  return {
    ...value,
    effects: Object.fromEntries(
      Object.entries(effects).map(([path, change]) => [
        path.startsWith('acting.') ? `characters.${who}.${path.slice(7)}` : path,
        change,
      ]),
    ),
  }
}

/**
 * Who an action's `acting.…` effects reached when nothing said who acts (an action taken for
 * each member, `for:`): the character its first such change was written on, in the lines
 * after it up to the next action.
 */
function changedActing(
  value: Record<string, unknown>,
  after: readonly JournalEntry[],
): string | undefined {
  const effects = value.effects
  if (typeof effects !== 'object' || effects === null) return undefined
  const own = Object.keys(effects).filter((p) => p.startsWith('acting.'))
  if (!own.length) return undefined
  for (const e of after) {
    if (e.code === 'ACTION_TAKEN') return undefined
    const path = e.code === 'CHANGED' ? String(e.data?.path ?? '') : ''
    const m = /^characters\.([^.]+)\.(.+)$/.exec(path)
    if (m && own.includes(`acting.${m[2]}`)) return m[1]
  }
  return undefined
}

/** A line of a moment, its changes left to the moment's (a result's text, a check that did something). */
function lineText(e: JournalEntry, context: JournalContext): string {
  const d = e.data ?? {}
  if (e.code === 'ORACLE_RESULT')
    return `${eventName(context.t, d.event, context.checkName, d.named)}: ${e.text ?? '—'}`
  return entryText(e, context).replace(/\s*\n\s*/g, ' ')
}

/**
 * The line a moment without an action or a turn is named by: its first that isn't only what
 * happened behind (checks that didn't come up before the one that did), a roll included.
 */
const headLine = (entries: readonly JournalEntry[]): JournalEntry =>
  entries.find((e) => e.code === 'ROLLED' || entryLevel(e) !== 'detail') ?? entries[0]!

/** A moment's title: the action taken (and how long it took), its round and turn, else its first line. */
function titleOf(entries: readonly JournalEntry[], context: JournalContext): string {
  const taken = entries.find((e) => e.code === 'ACTION_TAKEN')
  if (taken) {
    const id = String(taken.data?.action)
    const name = context.actionName?.(id) ?? idText(context.t, `actions.${id}`, id)
    const minutes = Number(taken.data?.minutes) || 0
    return minutes ? `${name} · ${durationText(minutes)}` : name
  }
  const turn = entries.filter((e) => e.code === 'ENCOUNTER_ROUND' || e.code === 'ENCOUNTER_TURN')
  if (turn.length) return turn.map((e) => entryText(e, context)).join(' · ')
  // A moment that begins with a roll (one the player gave): named by what was rolled, its
  // dice and result in its lines.
  const first = headLine(entries)
  if (first.code === 'ROLLED')
    return eventName(context.t, first.data?.check, context.checkName, first.data?.named)
  return lineText(first, context)
}

/**
 * A moment told at a level: its title, the lines that level shows (and every important one),
 * what it changed, and, below the rules' level, the rules behind it folded apart.
 */
export function tellBeat(
  beat: Beat<JournalEntry>,
  context: JournalContext,
  level: JournalLevel,
): BeatTold {
  const notable = new Set(notableLines(beat.entries).map((e) => e.id))
  const title = titleOf(beat.entries, context)
  // The title's own lines are in it; the line it's named by too when it says nothing more.
  const titled = beat.entries.find((e) => TITLE_CODES.has(e.code))
  const head = headLine(beat.entries)
  const rest = beat.entries.filter((e) => !TITLE_CODES.has(e.code) && (titled || e !== head))
  const at = JOURNAL_LEVELS.indexOf(level)
  const dice = diceOf(beat.entries)
  const cards = cardsOf(beat.entries)
  const lines: BeatTold['lines'] = []
  const why: string[] = []
  for (const e of rest) {
    const own = entryLevel(e)
    // What it changed is said once, among its changes, but in the whole detail.
    if (e.code === 'CHANGED' && level !== 'detail' && !notable.has(e.id)) continue
    if (notable.has(e.id) || JOURNAL_LEVELS.indexOf(own) <= at)
      lines.push({
        id: e.id,
        text: lineText(e, context),
        notable: notable.has(e.id),
        level: own,
        ...(dice.has(e.id) && { dice: dice.get(e.id) }),
        ...(cards.has(e.id) && { cards: cards.get(e.id) }),
      })
    else if (level === 'story' && own === 'mechanics') why.push(lineText(e, context))
  }
  // Whoever acts as each line comes (the one a reaction is played for, whose turn it is in a
  // fight): what an action changes of `acting` is said of them by name.
  let acting: string | undefined
  const changes = beat.entries.flatMap((e, i) => {
    if (e.code === 'REACTED' && typeof e.data?.who === 'string') acting = e.data.who
    if (e.code === 'ENCOUNTER_TURN' && typeof e.data?.id === 'string')
      acting = e.data.id === PARTY_ID ? undefined : e.data.id
    const value = effectsOf(e)
    return value
      ? changeParts(
          asActing(value, acting ?? changedActing(value, beat.entries.slice(i + 1))),
          context,
        )
      : []
  })
  return {
    id: beat.id,
    title,
    lines,
    changes,
    why,
    notable: notable.size > 0,
    first: beat.entries[0]!,
  }
}

/**
 * The journal's moments a filter lets through, newest first: a step's moment when any of its
 * lines is of the topics and words asked for (its title says what was done at any level),
 * a line of its own (a note, older journals) when it passes the whole filter.
 */
export function journalBeats(
  journal: readonly JournalEntry[],
  filter: JournalFilter,
  context: JournalContext,
): Beat<JournalEntry>[] {
  const passes = new Set(filterJournal(journal, { ...filter, level: 'detail' }, context))
  const shown = new Set(filterJournal(journal, filter, context))
  return beatsOf(journal)
    .filter((b) =>
      b.entries[0]!.beat !== undefined
        ? b.entries.some((e) => passes.has(e))
        : shown.has(b.entries[0]!),
    )
    .reverse()
}

/** The moments of the last step (and what was rolled by hand after it), oldest first. */
export const lastStepBeats = (session: SessionState): Beat<JournalEntry>[] =>
  beatsOf(lastStepEntries(session))

/**
 * The important moment the last step ended on, if any: the newest of its moments that has an
 * important line. A table rolled by hand afterwards isn't one.
 */
export function lastNotableBeat(session: SessionState): Beat<JournalEntry> | undefined {
  return lastStepBeats(session).findLast(
    (b) => b.entries[0]!.beat !== undefined && notableLines(b.entries).length > 0,
  )
}

/** How long ago a moment may have happened for its roll to be thrown: just now, not reopened. */
const FRESH_MS = 10_000

/**
 * The computer's roll behind an important moment, to throw on the table and watch before it's
 * told (docs/dice.md): the dice of its first important line, when they're all the computer's
 * (the player threw their own) and it happened just now (`now`, not a trip reopened); what a
 * row rolled inside another's result stays in the card.
 */
export function rollToWatch(told: BeatTold, now: number): Dice | undefined {
  if (!told.notable || !(now - Date.parse(told.first.at) < FRESH_MS)) return undefined
  const dice = told.lines.find((l) => l.notable && l.dice?.length)?.dice?.filter((d) => !d.inside)
  if (!dice?.length || dice.some((d) => d.byHand || !d.terms.length)) return undefined
  return dice
}
