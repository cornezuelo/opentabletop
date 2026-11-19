import { PARTY_ID, type JournalEntry, type RolledNode } from '@open-tabletop/session'
import type { TooltipText } from '@open-tabletop/ui-kit'
import type { Dice } from './beats'
import { entryText, eventName, type JournalContext } from './journal'

/** A row of a table a roll can fall on: its range and what it says, short. */
export interface RollRow {
  /** The row's id (the journal's `entry`). */
  key: string
  /** Its range as written: `1–3`, `6`. */
  range: string
  text: string
}

/** A table's row as its pack wrote it: its range, its condition if it has one, its text. */
export interface TableRow {
  key: string
  min?: number
  max?: number
  when?: unknown
  text?: string
}

/** A roll of a turn: what it's for, its dice, and, for a short table, what it could give. */
export interface TurnRoll {
  /** The definition rolled (full id). */
  source: string
  /** Its name (_A blow_). */
  label: string
  dice: Dice
  /** The table's rows, when they're few and each has its range. */
  rows?: RollRow[]
  /** The row it fell on (one of `rows`). */
  hit?: string
}

/**
 * A turn of a fight told in one piece (docs/fight-turn.md): everything from the moment it began
 * to the next one's, whichever moments of the journal it fell in.
 */
export interface FightTurn {
  /** Its first line's id: a new turn is a new id. */
  id: string
  round: number
  /** Who acts, by id and by name ('' when it can't be said). */
  whoId: string
  who: string
  side: 'party' | 'foes'
  /**
   * Where it is: `choosing` (the party's, nothing taken yet), `rolling` (something taken, the
   * trip waiting for the player: a roll, a question), `told` (done: what it did).
   */
  stage: 'choosing' | 'rolling' | 'told'
  /** What they did: the action's own words (`told:`), else its name; a foe's, its table's result. */
  what: string
  /** Whom it went for or was done to, by id ('' for nobody): their card is marked. */
  onId: string
  /** On whom: the foe chosen, or the one a foe went for (`encounter.target`); '' for none. */
  on: string
  /**
   * What it left, large: what the turn's own roll said, each fighter's main value changed,
   * conditions gained and lost, who went. Empty: nothing changed.
   */
  outcome: string[]
  /** Everything else the turn did or set off (other values, spoils, what was said), each once. */
  more: string[]
  /** The turn's own rolls, each with what it's for. */
  rolls: TurnRoll[]
  /** What the round's start did before this turn (a condition wearing off), its first turn only. */
  before: string[]
}

/** How a fight ended, for its closing card. */
export interface FightEnd {
  rounds: number
  /** Those who went during it (fell, fled), each in words. */
  gone: string[]
  /** What it left of those still here: each main value from the fight's start to its end. */
  left: string[]
  /** What its end did (a moment's actions: renown, armour worn), each once. */
  lines: string[]
}

/** One who took part in a fight, kept in their place to its end (docs/fight-look.md, B). */
export interface FightSeat {
  id: string
  /** Their name ('' for the party played as a whole). */
  name: string
  side: 'party' | 'foes'
  /** How they went, once they have, in few words (the condition's name); '' when unsaid. */
  went?: string
}

/** A fight told: what started it, each turn, and how it ended once it has. */
export interface FightTold {
  /** Everyone who had a turn or went, in the order they were first told. */
  roster: FightSeat[]
  opening: string[]
  turns: FightTurn[]
  ended?: FightEnd
}

/** What tells a fight needs besides the journal's words. */
export interface FightContext {
  /** A fighter's name by id. */
  whoName: (id: string) => string | undefined
  /** Whether a path is a fighter's main value (its sheet's `main`); absent: every value is. */
  isMain?: (path: string) => boolean
  /** A table's rows with their ranges, when it's short enough to show (full id). */
  rowsOf?: (source: string) => RollRow[] | undefined
  /** Whether the trip waits for the player now (a roll of theirs, a question). */
  waiting?: boolean
}

/** An action taken on a foe, on its card (a turn of the party's): a click takes it on that one. */
export interface CardAction {
  id: string
  name: string
  /** What it does, for its tooltip. */
  tip?: TooltipText
  /** Why it can't be taken now, in words ('' or absent: it can). */
  disabled?: string
  /** The foes it can be taken on, by id. */
  foes: readonly string[]
}

/** The lines of a turn that are told (the rest are the rules behind it). */
const TOLD = new Set([
  'CHANGED',
  'SAID',
  'ORACLE_RESULT',
  'PRESENT_CAME',
  'PRESENT_LEFT',
  'PRESENT_FOLLOWED',
  'MEMBER_LEFT',
  'CLOCK_FILLED',
  'PLACE_MADE',
  'WAY_MADE',
  'NOTE',
  'WORLD_EVENT',
])

/** A path of a fighter: a character's (`characters.<id>.…`), not the party's own nor the map's. */
const fighterPath = (path: unknown) =>
  typeof path === 'string' ? /^characters\.([^.]+)\.(values|conditions)\.(.+)$/.exec(path) : null

/** A told line in words: a result by its table's name, anything else as the journal says it. */
function lineOf(e: JournalEntry, context: JournalContext): string {
  if (e.code === 'ORACLE_RESULT')
    return `${eventName(context.t, e.data?.event, context.checkName, e.data?.named)}: ${e.text ?? '—'}`
  return entryText(e, context).replace(/\s*\n\s*/g, ' ')
}

/** Told lines, each once, in order. */
function linesOf(entries: readonly JournalEntry[], context: JournalContext): string[] {
  const out: string[] = []
  for (const e of entries) {
    if (!TOLD.has(e.code)) continue
    const text = lineOf(e, context)
    if (text && !out.includes(text)) out.push(text)
  }
  return out
}

/** Whether one who left is told already: the condition that made them go was gained in sight. */
const leftByTold = (e: JournalEntry, entries: readonly JournalEntry[]) =>
  e.code === 'PRESENT_LEFT' &&
  e.data?.because === 'condition' &&
  entries.some(
    (c) =>
      c.code === 'CHANGED' &&
      c.data?.path === `characters.${String(e.data?.id)}.conditions.${String(e.data?.condition)}` &&
      !!Number(c.data?.to),
  )

/** The rolls made for one check, each table's with its name (and its rows, when short). */
function rollsOf(
  entries: readonly JournalEntry[],
  check: unknown,
  context: JournalContext,
  o: FightContext,
): TurnRoll[] {
  return entries
    .filter((e) => e.code === 'ROLLED' && e.data?.check === check)
    .flatMap((e) => (Array.isArray(e.data?.rolls) ? (e.data.rolls as RolledNode[]) : []))
    .filter((n) => n.results?.length)
    .map((n) => {
      const rows = n.entry !== undefined ? o.rowsOf?.(n.source) : undefined
      return {
        source: n.source,
        label: context.nameOf(n.source),
        dice: n.results!,
        ...(rows && { rows, hit: n.entry }),
      }
    })
}

/** Whom a foe went for, by name: the party played as a whole is _the party_, never its id. */
function targetName(
  data: Record<string, unknown>,
  context: JournalContext,
  whoName: (id: string) => string | undefined,
): string {
  if (data.targetName) return String(data.targetName)
  const id = String(data.target)
  return id === PARTY_ID ? context.t('fight.thePartyInline') : (whoName(id) ?? id)
}

/** One turn: its lines from `ENCOUNTER_TURN` on, told. */
function tellTurn(
  entries: readonly JournalEntry[],
  before: string[],
  last: boolean,
  context: JournalContext,
  o: FightContext,
): FightTurn {
  const turn = entries[0]!
  const d = turn.data ?? {}
  const side = d.side === 'foes' ? 'foes' : 'party'
  const textOf = context.textOf ?? ((v: unknown) => String(v ?? ''))
  const skipped = entries.find((e) => e.code === 'ENCOUNTER_SKIPPED')
  // The party's: the action taken on it (not one a moment took). A foe's: what its table said.
  const taken =
    side === 'party' ? entries.find((e) => e.code === 'ACTION_TAKEN' && !e.data?.on) : undefined
  const from = taken ? entries.indexOf(taken) : 0
  const own =
    (side === 'foes' || taken) && entries.slice(from).find((e) => e.code === 'ORACLE_RESULT')
  const action = taken ? String(taken.data?.action) : undefined
  const told = action
    ? entries.find((e) => e.code === 'ACTION_TOLD' && e.data?.action === action)
    : undefined
  let what = ''
  let on = ''
  let onId = ''
  let said: JournalEntry | undefined
  if (skipped) what = entryText(skipped, context)
  else if (taken) {
    const given = Object.values((taken.data?.params ?? {}) as Record<string, unknown>)
    const chosen = entries.find((e) => e.code === 'RESUMED' && e.data?.action === action)?.data
      ?.choice
    what = told ? textOf(told.data?.text) : (context.actionName?.(action!) ?? action!)
    // The system's own words say whom already.
    onId =
      [chosen, ...given].find(
        (v): v is string => typeof v === 'string' && o.whoName(v) !== undefined,
      ) ?? ''
    on = told || !onId ? '' : (o.whoName(onId) ?? '')
  } else if (side === 'foes') {
    // Its table's words and whom it went for; without them (a moment took its turn: its
    // nerve broke), what the system said of it, and nobody gone for.
    said = own ? undefined : entries.find((e) => e.code === 'SAID')
    what = own ? (own.text ?? '') : said ? entryText(said, context) : ''
    on = own && d.target !== undefined ? targetName(d, context, o.whoName) : ''
    onId = on ? String(d.target) : ''
  }
  const stage: FightTurn['stage'] =
    side === 'party' && !taken && !skipped ? 'choosing' : last && o.waiting ? 'rolling' : 'told'
  // What it left, large: the turn's own result (the party's), then what became of the fighters.
  const outcome: string[] = []
  const large = new Set<JournalEntry>()
  if (taken && own && own.text) {
    outcome.push(own.text)
    large.add(own)
  }
  for (const e of entries) {
    const path = e.code === 'CHANGED' ? fighterPath(e.data?.path) : null
    const told =
      (path && (path[2] === 'conditions' || (o.isMain?.(String(e.data?.path)) ?? true))) ||
      ((e.code === 'PRESENT_LEFT' || e.code === 'MEMBER_LEFT') && !leftByTold(e, entries))
    if (!told) continue
    const text = lineOf(e, context)
    if (!outcome.includes(text)) outcome.push(text)
    large.add(e)
  }
  const headline = new Set([own, skipped, said].filter((e): e is JournalEntry => !!e))
  const more = linesOf(
    entries.filter((e) => !large.has(e) && !headline.has(e) && !leftByTold(e, entries)),
    context,
  ).filter((line) => !outcome.includes(line) && line !== what)
  return {
    id: turn.id,
    round: Number(d.round) || 0,
    whoId: String(d.id ?? ''),
    who: String(d.name || ''),
    side,
    stage,
    // A foe's turn that left nothing and said nothing: said so.
    what:
      what ||
      (side === 'foes' && stage === 'told' && !outcome.length ? context.t('fight.nothing') : ''),
    on,
    onId,
    outcome,
    more,
    rolls: own ? rollsOf(entries, own.data?.event, context, o) : [],
    before,
  }
}

/**
 * One who went, as it was said while it happened: the words of the condition that made them
 * go (_The bandit falls_), else the journal's line.
 */
function wentText(e: JournalEntry, context: JournalContext): string {
  const d = e.data ?? {}
  const told =
    e.code === 'PRESENT_LEFT' && d.because === 'condition'
      ? context.conditionTold?.(
          `characters.${String(d.id)}.conditions.${String(d.condition)}`,
          true,
        )
      : undefined
  return told ?? entryText(e, context)
}

/** Everyone who had a turn or went, each once, in the order they were first told. */
function rosterOf(entries: readonly JournalEntry[]): FightSeat[] {
  const seats = new Map<string, FightSeat>()
  for (const e of entries) {
    const d = e.data ?? {}
    const id = String(d.id ?? '')
    if (e.code === 'ENCOUNTER_TURN' && !seats.has(id))
      seats.set(id, {
        id,
        name: String(d.name || ''),
        side: d.side === 'foes' ? 'foes' : 'party',
      })
    else if (e.code === 'PRESENT_LEFT' || e.code === 'MEMBER_LEFT') {
      const seat = seats.get(id) ?? {
        id,
        name: String(d.name ?? ''),
        side: e.code === 'MEMBER_LEFT' ? ('party' as const) : ('foes' as const),
      }
      seats.set(id, {
        ...seat,
        went: String(d.conditionName ?? d.condition ?? '').replaceAll('-', ' '),
      })
    }
  }
  return [...seats.values()]
}

/** How a fight ended: who went, what it left of those still here, what its end did. */
function tellEnd(
  all: readonly JournalEntry[],
  after: readonly JournalEntry[],
  context: JournalContext,
  o: FightContext,
): FightEnd {
  const went = all.filter((e) => e.code === 'PRESENT_LEFT' || e.code === 'MEMBER_LEFT')
  const goneIds = new Set(went.map((e) => String(e.data?.id ?? '')))
  // Each fighter's main value, from what it was at the fight's first change to its last.
  const mains = new Map<string, { from: number; to: number }>()
  for (const e of all) {
    const path = e.code === 'CHANGED' ? fighterPath(e.data?.path) : null
    if (!path || path[2] !== 'values' || goneIds.has(path[1]!)) continue
    if (!(o.isMain?.(String(e.data?.path)) ?? true)) continue
    const key = String(e.data?.path)
    mains.set(key, { from: mains.get(key)?.from ?? Number(e.data?.from), to: Number(e.data?.to) })
  }
  return {
    rounds: Number(after[0]?.data?.rounds) || 0,
    gone: went.map((e) => wentText(e, context)),
    left: [...mains]
      .filter(([, v]) => v.from !== v.to)
      .map(([path, v]) =>
        context.t('journal.changed', {
          name: context.memberName?.(path) ?? path,
          from: v.from,
          to: v.to,
        }),
      ),
    lines: linesOf(after.slice(1), context),
  }
}

/**
 * A fight told from the journal's lines since it began (the moment that started it first):
 * what started it, each turn in one piece, and how it ended once it has.
 */
export function tellFight(
  entries: readonly JournalEntry[],
  context: JournalContext,
  o: FightContext,
): FightTold {
  const opening: JournalEntry[] = []
  const turns: { entries: JournalEntry[]; before: JournalEntry[] }[] = []
  let round: JournalEntry[] | undefined
  let end: JournalEntry[] | undefined
  for (const e of entries) {
    if (e.code === 'ENCOUNTER_ENDED') end = [e]
    else if (end) end.push(e)
    else if (e.code === 'ENCOUNTER_ROUND') round = []
    else if (e.code === 'ENCOUNTER_TURN') {
      turns.push({ entries: [e], before: round ?? [] })
      round = undefined
    } else if (round) round.push(e)
    else if (turns.length) turns.at(-1)!.entries.push(e)
    else opening.push(e)
  }
  return {
    roster: rosterOf(entries),
    opening: linesOf(opening, context),
    turns: turns.map((t, i) =>
      tellTurn(t.entries, linesOf(t.before, context), i === turns.length - 1 && !end, context, o),
    ),
    ...(end && { ended: tellEnd(entries, end, context, o) }),
  }
}

/**
 * The rows of a table as a roll's ladder, when it's short enough to read at a glance: at most
 * `most` rows, each with its range, none of them chosen by a condition (the row can't be known
 * before the roll then). `text` says a row in few words: what it's written with read by the
 * table (`{{acting.name}} swings`) is left out.
 */
export function ladderOf(rows: readonly TableRow[] | undefined, most = 6): RollRow[] | undefined {
  if (!rows?.length || rows.length > most) return undefined
  if (rows.some((r) => r.min === undefined || r.max === undefined || r.when !== undefined))
    return undefined
  return rows.map((r) => ({
    key: r.key,
    range: r.min === r.max ? String(r.min) : `${r.min}–${r.max}`,
    text: (r.text ?? '')
      .replace(/^\s*\{\{[^}]*\}\}\s*/, '')
      .replace(/\{\{[^}]*\}\}/g, '…')
      .trim(),
  }))
}
