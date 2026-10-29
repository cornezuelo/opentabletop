import { mathRandom, type RandomSource } from '@open-tabletop/random'
import { nextWeather, type WeatherModel } from '@open-tabletop/weather-engine'
import { matches, type Condition } from '@open-tabletop/conditions'
import {
  emptyState,
  mergeEffects,
  OracleError,
  type OracleEngine,
  type OracleState,
} from '@open-tabletop/oracle-engine'
import {
  characterFacts,
  validatePartyFrom,
  type CharacterEvent,
  type CharacterState,
  type PartyFrom,
} from '@open-tabletop/character-engine'
import {
  applyEffects,
  effectsOf,
  type AppliedEffect,
  type Effects,
  type LimitReached,
} from './effects'
import { rolledNodes } from './journal'
import { settlePresent, type Present, type PresentEvent } from './present'
import { definitionId } from './refs'
import { pullFromRoster, type Roster, type RosterPlace } from './roster'
import {
  applyMemberEffects,
  isMemberPath,
  memberFacts,
  PARTY_ID,
  partyBlocks,
  picksWho,
  partyItems,
  refreshParty,
  settleStates,
  answerSharing,
  waitingForRoom,
  type PartyRules,
  type Sharing,
} from './party'
import {
  parseDiscover,
  type DiscoverBindings,
  type Discovery,
  type DiscoveryState,
} from './discovery'
import {
  declaredValues,
  hexIdOf,
  momentRolls,
  qualify,
  reactionsOf,
  resolveChange,
  movingActions,
  upgradeTravelState,
  type CheckOutcome,
  type DayValue,
  type Reaction,
  type TravelAction,
  type TravelEngine,
  type TravelEvent,
  type TravelRules,
  type TravelState,
} from '@open-tabletop/travel-engine'

/** Text in one or several languages: "Presence" or { en: Presence, es: Presencia }. */
export type LocalizedText = string | Record<string, string>

/** A party stat the system's tables use (e.g. Kal-Arath's PRE in reaction rolls). */
export interface StatDefinition {
  name?: LocalizedText
  description?: LocalizedText
  default?: number
  /** Effects never take it below / above these. */
  min?: number
  max?: number
  /**
   * Made of the members' values while the party has members (`{ max: survival }`, `{ count:
   * true }`); kept like any other stat while it has none.
   */
  from?: PartyFrom
}

/**
 * `kind: bindings` in a pack: which Oracle definition resolves each travel check, and
 * which party stats the tables read from the context.
 */
export interface Bindings {
  /**
   * Per check event: the table or generator that resolves it (`resolve`), or a weather
   * model that does (`weather`: today's weather follows yesterday's), with extra context.
   */
  on: Record<string, { resolve?: string; weather?: string; context?: Record<string, unknown> }>
  stats?: Record<string, StatDefinition>
  /**
   * Journey roles (lead the way, keep watch…): jobs the player gives the characters, read
   * as `roles.<id>.*` (the holder's values and conditions), each with a name for players.
   */
  roles?: Record<string, { name?: LocalizedText; description?: LocalizedText }>
  /** Tables that decide empty hexes as the party travels (the host may turn it off). */
  discover?: DiscoverBindings
}

/** Picks the requested language, then the fallback, then any available text. */
export function localize(
  text: LocalizedText | undefined,
  locale: string,
  fallback?: string,
): string | undefined {
  if (text === undefined || typeof text === 'string') return text
  return text[locale] ?? (fallback ? text[fallback] : undefined) ?? Object.values(text)[0]
}

export function parseBindings(
  raw: unknown,
  pack?: string,
): { bindings?: Bindings; errors: string[] } {
  const on = (raw as { on?: unknown })?.on
  if (typeof on !== 'object' || on === null) return { errors: ['bindings: missing "on"'] }
  const out: Bindings = { on: {} }
  const errors: string[] = []
  for (const [event, value] of Object.entries(on)) {
    const target = (value as { resolve?: unknown })?.resolve
    const weather = (value as { weather?: unknown })?.weather
    const ok = (v: unknown): v is string => typeof v === 'string' && !!v
    if (ok(target) === ok(weather)) {
      errors.push(
        `bindings.on.${event}: needs "resolve" (a table: table.<id>) or "weather" (a model: weather.<id>)`,
      )
      continue
    }
    // References are resolved in the pack that declares the bindings.
    const context = (value as { context?: unknown }).context
    out.on[event] = {
      ...(ok(target)
        ? { resolve: definitionId(target, pack) }
        : { weather: definitionId(weather as string, pack) }),
      ...(typeof context === 'object' &&
        context !== null && { context: context as Record<string, unknown> }),
    }
  }
  const discover = parseDiscover((raw as { discover?: unknown })?.discover, pack, errors)
  if (discover) out.discover = discover
  const stats = (raw as { stats?: unknown })?.stats
  if (typeof stats === 'object' && stats !== null) {
    out.stats = {}
    for (const [key, value] of Object.entries(stats)) {
      const v = (typeof value === 'object' && value !== null ? value : {}) as Record<
        string,
        unknown
      >
      const text = (t: unknown) =>
        typeof t === 'string' || (typeof t === 'object' && t !== null)
          ? (t as LocalizedText)
          : undefined
      out.stats[key] = {
        name: text(v.name),
        description: text(v.description),
        // A stat made of a party sheet's value starts as that value does (unless it says).
        ...((typeof v.default === 'number' ||
          !(typeof v.from === 'object' && v.from !== null && 'party' in v.from)) && {
          default: typeof v.default === 'number' ? v.default : 0,
        }),
        ...(typeof v.min === 'number' && { min: v.min }),
        ...(typeof v.max === 'number' && { max: v.max }),
      }
      if (v.from !== undefined) {
        const problems = validatePartyFrom(v.from, `bindings.stats.${key}.from`)
        if (problems.length) errors.push(...problems)
        else out.stats[key].from = v.from as PartyFrom
      }
    }
  }
  const roles = (raw as { roles?: unknown })?.roles
  if (roles !== undefined) {
    if (typeof roles !== 'object' || roles === null || Array.isArray(roles))
      errors.push('bindings.roles: expected roles by id')
    else
      for (const [key, value] of Object.entries(roles)) {
        const v = (typeof value === 'object' && value !== null ? value : {}) as Record<
          string,
          unknown
        >
        for (const k of Object.keys(v))
          if (k !== 'name' && k !== 'description')
            errors.push(`bindings.roles.${key}: unknown key "${k}"`)
        const text = (t: unknown) =>
          typeof t === 'string' || (typeof t === 'object' && t !== null)
            ? (t as LocalizedText)
            : undefined
        ;(out.roles ??= {})[key] = {
          ...(text(v.name) && { name: text(v.name) }),
          ...(text(v.description) && { description: text(v.description) }),
        }
      }
  }
  return errors.length ? { errors } : { bindings: out, errors: [] }
}

export interface JournalEntry {
  id: string
  /** Game time (minutes). */
  time: number
  /** Real-world ISO timestamp. */
  at: string
  source: 'travel' | 'oracle' | 'user'
  /** Language-neutral code; the UI translates it (DAY_STARTED, HEX_ENTERED, ORACLE_RESULT…). */
  code: string
  /** Free text (e.g. a rendered table result, already in the pack's language). */
  text?: string
  data?: Record<string, unknown>
}

export interface SessionState {
  travel: TravelState
  oracle: OracleState
  /** Party stats available to tables (e.g. pre for Kal-Arath reactions). */
  stats: Record<string, number>
  /** Values from today's results that later checks use (weather modifiers…). */
  dayVars: Record<string, unknown>
  /** The day before's values, read by tables as `yesterday.*` (absent: none). */
  yesterday?: Record<string, unknown>
  journal: JournalEntry[]
  nextEntry: number
  /** The number of the last step's first journal entry: what it did is from `j<lastStep>` on. */
  lastStep?: number
  /** Discovery: hexes revealed whose contents are still to be rolled. */
  discovery?: DiscoveryState
  /** The party itself, a character of the system's party sheet (none without one). */
  party?: CharacterState
  /** The party's characters, in order (none: the party is played as a whole). */
  members?: CharacterState[]
  /**
   * Those present: the copies of templates the trip made, each where it was made; those at
   * the party's place are what tables see (`present.*`, docs/bestiary.md). Absent: none.
   */
  present?: Present[]
  /** The member acting now (`acting.*`), chosen by the player. */
  acting?: string
  /** Who holds each of the system's journey roles (`roles.<id>.*`), chosen by the player. */
  roles?: Record<string, string>
  /** Who rolls for the stats made of one character (`from: { pick }`); absent: the best. */
  rolls?: string
  /** Each check rolled on a table waits for the player to choose who rolls (**Ask at every roll**). */
  askRolls?: boolean
  /** The checks waiting for that choice: rolled when the player goes on. */
  asking?: string[]
  /** What the party spends or gains of its items waits for the player to say who (**Ask who gives**). */
  askShare?: boolean
  /** What was shared out by the system's rule and waits for that answer: no step until then. */
  sharing?: Sharing[]
  /**
   * The player's choice to play everything by itself (**Skip pauses**): a pause (a check's, a
   * result's, a step's) is written in the journal and the trip goes on. Questions still ask.
   */
  skipPauses?: boolean
  /** On a weather model's hex flower, the cell today's weather is on (`q,r`). */
  weatherAt?: string
  /**
   * The reactions (moments written as conditions) that held when last looked at, by key
   * (`key|<member>` for one checked for each member): one comes when it holds and isn't
   * here. Absent in trips saved before reactions: they take what holds when next played.
   */
  reactions?: string[]
}

export function initialSessionState(
  travel: TravelState,
  stats: Record<string, number> = {},
): SessionState {
  return {
    travel,
    oracle: emptyState(),
    stats,
    dayVars: {},
    journal: [],
    nextEntry: 1,
    reactions: [],
  }
}

/**
 * The party as tables read it: `party.stats.survival`, `party.values.food`, its items with
 * its members' (`party.items.ration.count`)…, and its members' ids (`party.members`) when
 * it has them.
 */
export function partyValues(s: SessionState, rules: PartyRules = {}): Record<string, unknown> {
  // Its own sheet's: `party.values.morale`, `party.conditions`, `party.tags`.
  const own = s.party && characterFacts(s.party)
  return {
    ...(own && { values: own.values, conditions: own.conditions, tags: own.tags }),
    items: partyItems(s, rules),
    stats: { ...s.stats },
    mode: s.travel.mode,
    ...(s.members?.length && { members: s.members.map((m) => m.id) }),
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/** The hex and moment a context is about (for its rolls). */
const hexOf = (seen: Record<string, unknown>) => hexIdOf(seen)
/** Where a check came up (`hex`: the hex it's about), for its journal lines. */
const whereOf = (check: { context: Record<string, unknown> }): { hex?: string } => {
  const hex = hexIdOf(check.context)
  return hex ? { hex } : {}
}
const momentOf = (seen: Record<string, unknown>) =>
  typeof seen.moment === 'string' ? seen.moment : undefined

/**
 * What a table rolled during a trip sees, later sources winning: the party stats by
 * name (`{{survival}}`) and today's values, then the facts of the map and the trip
 * (`terrain`, `weather`… so a stat can't hide them), then `party` and `yesterday` (the
 * day before's values and whether the party ended it lost), then `extra` (a binding's
 * context). `party.stats.x` always reaches a stat, whatever its name.
 */
export function tripContext(
  s: SessionState,
  facts: Record<string, unknown>,
  extra: Record<string, unknown> = {},
  /** The system's sheets, so members' items are read with their places. */
  party: PartyRules = {},
): Record<string, unknown> {
  // The day before's values: the session's, then the ones the system declares (lost…).
  const yesterday = { ...s.yesterday, ...upgradeTravelState(s.travel).yesterday }
  // Today's values: the session's (weather, modifiers…), then the ones the system declares.
  const today = { ...s.dayVars, ...upgradeTravelState(s.travel).today }
  // What the host says of the party (what its members block) goes with the party.
  const host = isRecord(facts.party) ? facts.party : {}
  return qualify({
    ...s.stats,
    ...s.dayVars,
    ...facts,
    ...memberFacts(s, party),
    party: { ...host, ...partyValues(s, party) },
    today,
    yesterday,
    ...extra,
  })
}

/**
 * What a result would change in a trip, as `[path, change]` pairs: its effects
 * (`['party.items.ration', -1]`, `['party.stats.fatigue', '=0']`) and the weather.
 */
export function tripChanges(value: Record<string, unknown>): [string, number | string][] {
  const changes: [string, number | string][] = Object.entries(effectsOf(value))
  if (typeof value.weather === 'string') changes.push(['weather', value.weather])
  return changes
}

/**
 * Applies a result rolled by hand to the trip, as a check's would be: its effects, and
 * `weather` becomes today's. `stats` are the system's, for their bounds.
 */
export function applyResult(
  input: SessionState,
  value: Record<string, unknown>,
  stats: Record<string, StatDefinition> = {},
  /** The party's members' sheet and bindings, when the system has them. */
  party: PartyRules = {},
): SessionState {
  const s = structuredClone(input)
  refreshParty(s, party)
  const effects = effectsOf(value)
  const context = { ...tripContext(s, {}, {}, party), ...value }
  applyEffects(s, effects, stats, context)
  applyMemberEffects(s, effects, party, context, s.travel.time)
  refreshParty(s, party)
  if (typeof value.weather === 'string') s.travel.weather = value.weather
  return s
}

export interface Session {
  /** Applies a travel action, resolving checks with the Oracle when bound; returns new entries. */
  step(state: SessionState, action: TravelAction): { state: SessionState; entries: JournalEntry[] }
  /** Adds a user note to the journal. */
  note(state: SessionState, text: string): SessionState
  /**
   * Settles what holds by itself in the world as it is now (after a change by hand): the
   * party's and its members' conditions that read the world, with their journal lines.
   */
  settle(state: SessionState): { state: SessionState; entries: JournalEntry[] }
  /**
   * Answers the first share waiting (**Ask who gives**): `moved`, what each member gives
   * (negative) or takes instead of the rule's share (absent: the rule's stands), then
   * settles as after a change by hand. The same state when it can't be done.
   */
  share(
    state: SessionState,
    moved?: Record<string, number>,
  ): { state: SessionState; entries: JournalEntry[] }
}

const QUIET_STOPS = new Set(['check', 'destination', 'hex', 'waited', 'held'])
/** The journal line of an action, which its steps' effects are added to. */
const isActionLine = (e: JournalEntry, action: string) =>
  e.code === 'ACTION_TAKEN' && e.data?.action === action
const JOURNALED: TravelEvent['type'][] = [
  'DAY_STARTED',
  'HEX_ENTERED',
  'ACTION_TAKEN',
  'LIMIT_REACHED',
  'HALT_WITHOUT',
  'DESTINATION_REACHED',
  'ROUTE_BLOCKED',
  'NO_ROUTE',
  'TRAVEL_STOPPED',
  'SAID',
  'WORLD_DO',
  'HELD',
  'RESUMED',
  'MODE_CHANGED',
  // What happened behind (the journal's detail).
  'MOMENT_REACHED',
  'CHECK_SKIPPED',
  'ROUTE_PLANNED',
]

export function createSession(options: {
  travel: TravelEngine
  oracle?: OracleEngine
  bindings?: Bindings
  /**
   * The pack the travel rules are written in: what their steps roll (`roll: table.ruins`) is
   * found from there.
   */
  pack?: string
  /** Locale for oracle texts. */
  locale?: string
  now?: () => string
  /** Safety limit for automatic continue-after-check loops. */
  maxAutoSteps?: number
  /**
   * Discovery for this step (its world must be the one the travel engine uses): travel
   * goes hex by hex, deciding empty hexes on the way and re-planning the route.
   */
  discovery?: Discovery
  /** Weather models bindings may name (`weather: pack/id`). */
  weather?: Record<string, WeatherModel>
  /** For the weather (tables use the Oracle's own). */
  random?: RandomSource
  /** The system's travel rules: the values it declares (lost…), set by results. */
  rules?: TravelRules
  /**
   * What the host knows besides the trip, for conditions and tables: the world clock's
   * `clocks` and today's `events` (`worldFacts` of the world engine).
   */
  facts?: Record<string, unknown>
  /** The sheet the party's members are made with (the system's), if it has one. */
  sheet?: PartyRules['sheet']
  /** The party's own sheet (the system's `partySheet`), if it has one. */
  partySheet?: PartyRules['partySheet']
  /** The system's item catalogues, for effects that give an item. */
  items?: PartyRules['items']
  /** The system's templates (its bestiaries), for effects that make copies of them. */
  templates?: Pick<
    PartyRules,
    'bestiary' | 'templateIds' | 'templateSheet' | 'templateNames' | 'sheets'
  >
}): Session {
  const random = options.random ?? mathRandom()
  const host = options.facts ?? {}
  const now = options.now ?? (() => new Date().toISOString())
  const discovery = options.discovery
  const declared = options.rules ? declaredValues(options.rules) : undefined
  /** The system's actions that move the party: taking one is setting off. */
  const movers = new Set(options.rules ? movingActions(options.rules) : [])
  const stats = options.bindings?.stats
  const party: PartyRules = {
    sheet: options.sheet,
    partySheet: options.partySheet,
    bindings: options.bindings,
    items: options.items,
    ...(options.templates?.bestiary && {
      bestiary: options.templates.bestiary,
      templateIds: options.templates.templateIds,
      templateSheet: options.templates.templateSheet,
      templateNames: options.templates.templateNames,
      sheets: options.templates.sheets,
      ...(options.locale && { locale: options.locale }),
      // A copy's name rolled on what its template's `names` says (nothing kept of the roll).
      ...(options.oracle && {
        nameFrom: (ref: string, context: Record<string, unknown>) => {
          try {
            return options.oracle!.resolve(ref, context, undefined, { locale: options.locale })
              .resolution.text
          } catch (error) {
            if (error instanceof OracleError) return undefined
            throw error
          }
        },
      }),
    }),
  }
  /** The host's facts, with what the members' conditions block (for the travel engine). */
  const hostOf = (s: SessionState, more: Record<string, unknown> = {}) => {
    const blocked = partyBlocks(s, party)
    return Object.keys(blocked).length
      ? {
          ...host,
          ...more,
          party: { ...(isRecord(host.party) ? host.party : {}), blocked },
        }
      : { ...host, ...more }
  }
  // Hex by hex, a long trip takes many steps.
  const maxAuto = options.maxAutoSteps ?? (discovery ? 500 : 20)

  const add = (
    s: SessionState,
    entries: JournalEntry[],
    entry: Omit<JournalEntry, 'id' | 'at' | 'time'> & { time?: JournalEntry['time'] },
  ) => {
    const full: JournalEntry = { id: `j${s.nextEntry++}`, time: s.travel.time, at: now(), ...entry }
    s.journal.push(full)
    entries.push(full)
  }

  const journalEvent = (s: SessionState, entries: JournalEntry[], e: TravelEvent) => {
    if (!JOURNALED.includes(e.type)) return
    if (e.type === 'TRAVEL_STOPPED' && QUIET_STOPS.has(e.reason)) return
    const { type, ...data } = e
    // Events carry the moment they happened (a whole day of travel is one step).
    const time = 'time' in e ? e.time : undefined
    add(s, entries, {
      source: 'travel',
      code: type,
      // A route by where it goes and how long it is (re-planned at each hex, discovering);
      // the detail without its time twice (there may be many of them), and naming its check
      // `check` (the lines of the check itself name it `event`).
      data:
        e.type === 'ROUTE_PLANNED'
          ? { to: e.route.at(-1), hexes: e.route.length - 1, strategy: e.strategy }
          : e.type === 'CHECK_SKIPPED'
            ? { check: e.event, at: e.at, condition: e.condition, failed: e.failed }
            : e.type === 'MOMENT_REACHED'
              ? { at: e.at }
              : (data as Record<string, unknown>),
      ...(time !== undefined && { time }),
    })
  }

  /** Each value a change moved, before and after (the journal's detail). */
  const changed = (
    s: SessionState,
    entries: JournalEntry[],
    applied: readonly AppliedEffect[],
    time?: number,
  ) => {
    for (const { path, from, to } of applied)
      add(s, entries, {
        source: 'travel',
        code: 'CHANGED',
        ...(time !== undefined && { time }),
        data: { path, from, to },
      })
  }

  /** What changed on whom, before and after; what holds by itself, left as it was. */
  const told = (
    s: SessionState,
    entries: JournalEntry[],
    events: CharacterEvent[],
    time?: number,
  ) => {
    const whose = (id: string) => (id === PARTY_ID ? 'party' : `characters.${id}`)
    for (const e of events)
      if (e.type === 'NOT_WRITABLE')
        add(s, entries, {
          source: 'travel',
          code: 'NOT_WRITABLE',
          ...(time !== undefined && { time }),
          data: { path: `${whose(e.character)}.${e.path}` },
        })
      else if (e.type === 'ITEM_SPENT' || e.type === 'UNKNOWN_ITEM')
        add(s, entries, {
          source: 'travel',
          code: e.type,
          ...(time !== undefined && { time }),
          data: { path: `${whose(e.character)}.items.${e.item}` },
        })
      else if (e.type === 'ITEM_LEFT' || e.type === 'ITEM_LOOSE')
        add(s, entries, {
          source: 'travel',
          code: e.type,
          ...(time !== undefined && { time }),
          data: { path: `${whose(e.character)}.items.${e.item}`, count: e.count },
        })
    changed(
      s,
      entries,
      events.flatMap((e): AppliedEffect[] =>
        e.type === 'VALUE_CHANGED'
          ? [{ path: `${whose(e.character)}.values.${e.value}`, from: e.from, to: e.to }]
          : e.type === 'ITEM_ADDED' || e.type === 'ITEM_REMOVED'
            ? [
                {
                  path: `${whose(e.character)}.items.${e.item}`,
                  from: e.type === 'ITEM_ADDED' ? 0 : e.count,
                  to: e.type === 'ITEM_ADDED' ? e.count : 0,
                },
              ]
            : e.type === 'ITEM_CHANGED'
              ? [
                  {
                    path: `${whose(e.character)}.items.${e.item}${e.field === 'count' ? '' : `.${e.field}`}`,
                    from: e.from,
                    to: e.to,
                  },
                ]
              : e.type === 'CONDITION_SET' || e.type === 'CONDITION_CLEARED'
                ? [
                    {
                      path: `${whose(e.character)}.conditions.${e.condition}`,
                      from: e.type === 'CONDITION_SET' ? 0 : 1,
                      to: e.type === 'CONDITION_SET' ? 1 : 0,
                    },
                  ]
                : [],
      ),
      time,
    )
  }
  /** Who of those present came or left, as journal lines (`PRESENT_CAME`, `PRESENT_LEFT`). */
  const presentLines = (
    s: SessionState,
    entries: JournalEntry[],
    events: PresentEvent[],
    time?: number,
  ) => {
    for (const { type, ...data } of events)
      add(s, entries, { source: 'travel', code: type, ...(time !== undefined && { time }), data })
  }
  /**
   * What holds by itself in the world as it is now (a state while the party travels by
   * boat, in winter…), settled on the party and its members, with a line for each change;
   * then those present: what holds on each, who leaves by a condition and who's left behind.
   */
  const settleWorld = (s: SessionState, entries: JournalEntry[]) => {
    if (s.members?.length || s.party)
      told(s, entries, settleStates(s, party, worldOf(s), s.travel.time), s.travel.time)
    settleCopies(s, entries)
  }
  /** Those present settled: what holds on each, who leaves by a condition, who's left behind. */
  const settleCopies = (s: SessionState, entries: JournalEntry[]) => {
    if (!s.present?.length) return
    const done = settlePresent(s, party, worldOf(s), s.travel.time)
    told(s, entries, done.events, s.travel.time)
    presentLines(s, entries, done.present, s.travel.time)
  }
  /** The trip's world as conditions see it now (what tables see, by their full names). */
  const worldOf = (s: SessionState) =>
    qualify(options.travel.context(s.travel, tripContext(s, hostOf(s), {}, party)))
  /** The moments written as conditions in the system's rules (reactions). */
  const reactions = options.rules ? reactionsOf(options.rules) : []
  /**
   * The reactions that hold now, by key (`key|<member>` for one checked for each member,
   * read with that member acting).
   */
  const holding = (s: SessionState): string[] => {
    if (!reactions.length) return []
    const world = worldOf(s)
    const holds = (r: Reaction, seen: Record<string, unknown>) =>
      matches(r.when as Condition | undefined, seen) &&
      !(r.unless && matches(r.unless as Condition, seen))
    return reactions.flatMap(({ key, reaction }) =>
      reaction.for === 'party.members'
        ? (s.members ?? [])
            .filter((m) => holds(reaction, worldOf({ ...s, acting: m.id })))
            .map((m) => `${key}|${m.id}`)
        : holds(reaction, world)
          ? [key]
          : [],
    )
  }
  /**
   * The next reaction to come: one that holds now and didn't last time (what the trip has
   * no memory of counts as not holding). The memory keeps what still holds, plus the one
   * that comes; a trip saved before reactions takes what holds now, firing nothing.
   */
  const nextReaction = (s: SessionState): { key: string; who?: string } | undefined => {
    if (!reactions.length) return undefined
    const now = holding(s)
    if (!s.reactions) {
      s.reactions = now
      return undefined
    }
    const before = new Set(s.reactions)
    const rising = now.find((k) => !before.has(k))
    s.reactions = now.filter((k) => before.has(k) || k === rising)
    if (!rising) return undefined
    const [key, who] = rising.split('|')
    return { key, ...(who !== undefined && { who }) }
  }
  /** At most this many reactions in a row in one step: past it, they loop. */
  const MAX_REACTIONS = 10

  const run = (
    input: SessionState,
    action: TravelAction,
    /** Only settling after a change by hand: no action, only the reactions it sets off. */
    quiet = false,
  ): { state: SessionState; entries: JournalEntry[] } => {
    {
      // Something shared out waits for the player to say who gives it, or an item for room
      // to be made for it (`full: ask`): the trip waits too.
      if (!quiet && (input.sharing?.length || waitingForRoom(input).length))
        return { state: input, entries: [] }
      const s = structuredClone(input)
      const entries: JournalEntry[] = []
      s.lastStep = s.nextEntry
      // The members as they are now (the player may have changed them by hand).
      refreshParty(s, party)
      /**
       * Brings the party up to date, and settles what holds by itself in the world as it is
       * now (a state while the party travels by boat, in winter…), with a line for each change.
       */
      const settle = () => {
        refreshParty(s, party)
        settleWorld(s, entries)
      }
      // What the player changed by hand, or the world since the last step, is seen first.
      settle()
      /**
       * Effects on the members (`party.members.…`, `characters.<id>.…`, `acting.…`): applied,
       * with what hit a bound, and a line when nobody was acting.
       */
      const memberEffects = (
        effects: Effects,
        context: Record<string, unknown>,
        time: number,
        /** Whether what hits a bound is noted for the day (an action's steps: the engine did). */
        noteReached = true,
      ): LimitReached[] => {
        const done = applyMemberEffects(s, effects, party, context, time, noteReached)
        for (const path of done.nobody)
          add(s, entries, { source: 'travel', code: 'NOBODY_ACTING', time, data: { path } })
        told(s, entries, done.events, time)
        presentLines(s, entries, done.present, time)
        return done.limits
      }
      /** Discovers at the party's hex; true when it found something to stop for. */
      const arrive = (hex: string, from?: string, time?: number): boolean => {
        if (!discovery) return false
        let outcome: ReturnType<Discovery['arrive']>
        try {
          outcome = discovery.arrive(s, tripContext(s, hostOf(s), {}, party), hex, from)
        } catch (error) {
          if (!(error instanceof OracleError)) throw error
          add(s, entries, {
            source: 'travel',
            code: 'DISCOVERY_FAILED',
            ...(time !== undefined && { time }),
            text: error.message,
            data: { hex },
          })
          return false
        }
        const { text, discovered } = outcome
        if (!discovered) return false
        add(s, entries, {
          source: 'oracle',
          code: 'HEX_DISCOVERED',
          ...(time !== undefined && { time }),
          ...(text && { text }),
          data: { hex, ...discovered },
        })
        return !!discovered.poi
      }
      // Going on, an action that moves the party (march…), or going on from a step that
      // stopped the trip (what it stopped may move).
      const travelling =
        action.type === 'travel' ||
        (action.type === 'action' && movers.has(action.id)) ||
        (action.type === 'resume' && !!s.travel.moving)
      // Before setting off (or choosing where to go), see around the party.
      if (discovery && (travelling || action.type === 'setDestination'))
        if (arrive(s.travel.location) && travelling) return { state: s, entries }
      const by = action.type === 'travel' ? action.by : undefined
      /**
       * Going on with the move under way (or the trip by itself until a moment): discovering,
       * hex by hex.
       */
      const goOn: TravelAction = {
        type: 'travel',
        ...(discovery && { until: 'hex' as const }),
        ...(by !== undefined && { by }),
      }
      // Discovering, a move goes hex by hex, still under way at each.
      const first: TravelAction =
        discovery &&
        travelling &&
        (action.type === 'travel' || action.type === 'action' || action.type === 'resume')
          ? { ...action, until: 'hex' }
          : action
      let act = first
      // A wait goes on after each check it stops for, like a travel order.
      const waiting = action.type === 'wait'
      if (waiting && action.until > s.travel.time)
        add(s, entries, { source: 'travel', code: 'WAIT', data: { until: action.until } })
      // A long wait, or a trip going on by itself until a moment, stops for its checks every day.
      const long = waiting || by !== undefined
      const limit = long ? Math.max(maxAuto, 2000) : maxAuto
      // Going on from a check that waited for who rolls: it's rolled now, with the choice.
      let replay: TravelEvent[] | undefined
      if (action.type === 'resolveCheck' && s.asking?.includes(action.id)) {
        s.asking = s.asking.filter((id) => id !== action.id)
        if (!s.asking.length) delete s.asking
        const check = s.travel.pendingChecks.find((c) => c.id === action.id)
        if (check) replay = [{ type: 'CHECK_REQUIRED', check, time: s.travel.time }]
      }
      const replaying = !!replay
      /** The last step went on with an action its checks held. */
      let resumed = false
      /** Reactions played in this step (past `MAX_REACTIONS`, they loop). */
      let reacted = 0
      /** A reaction is being played: once it's done, the step goes on with `after`. */
      let reacting = false
      let after: TravelAction | undefined
      /** Who acted before a reaction played for a member made them act. */
      let actingBefore: { acting?: string } | undefined
      const restoreActing = () => {
        if (!actingBefore) return
        if (actingBefore.acting === undefined) delete s.acting
        else s.acting = actingBefore.acting
        actingBefore = undefined
      }
      /** A pause the player chose to skip: the journal says it, and the trip goes on. */
      const skipped = (time: number, data: Record<string, unknown>) =>
        add(s, entries, { source: 'travel', code: 'PAUSE_SKIPPED', time, data })
      /**
       * Resolves a check in the travel engine: the moment's next checks are decided then,
       * seeing what it set (today's weather, values…), and come after it in the same step.
       */
      const resolve = (id: string, outcome?: CheckOutcome): TravelEvent[] => {
        const next = options.travel.apply(
          s.travel,
          { type: 'resolveCheck', id, ...(outcome && { outcome }) },
          tripContext(s, hostOf(s), {}, party),
        )
        s.travel = next.state
        return next.events.filter((e) => e.type !== 'CHECK_RESOLVED')
      }
      for (let i = 0; i <= limit; i++) {
        const dayBefore = s.travel.day
        const from = s.travel.location
        // Conditions on actions and checks also see the party and today's values.
        const result = replay
          ? { state: s.travel, events: replay }
          : options.travel.apply(s.travel, act, tripContext(s, hostOf(s), {}, party))
        replay = undefined
        s.travel = result.state
        settle()
        if (s.travel.day !== dayBefore) {
          // Today's values become yesterday's (none if more than a day went by).
          s.yesterday = s.travel.day === dayBefore + 1 ? s.dayVars : {}
          s.dayVars = {}
        }
        let resolvedAll = true
        let found = false
        // What hit a bound that the engine already told (the numbers it keeps for steps).
        const engineLimits = new Set(
          result.events.flatMap((e) => (e.type === 'LIMIT_REACHED' ? [e.path] : [])),
        )
        for (const event of result.events) {
          journalEvent(s, entries, event)
          // An action's step changes the party (the engine saw it for its later steps, and
          // told what hit a bound of the party's): applied, and told on the action's line.
          if (event.type === 'EFFECTS') {
            const { applied } = applyEffects({ stats: s.stats, travel: {} }, event.effects, stats)
            changed(s, entries, applied, event.time)
            for (const limit of memberEffects(
              event.effects,
              tripContext(s, host, {}, party),
              event.time,
              false,
            ).filter((l) => !engineLimits.has(l.path)))
              add(s, entries, {
                source: 'travel',
                code: 'LIMIT_REACHED',
                time: event.time,
                data: { ...limit },
              })
            settle()
            const line = entries.findLast((e) => isActionLine(e, event.action))
            // A party without characters: what the system says of them didn't happen.
            const told = s.members?.length
              ? event.effects
              : Object.fromEntries(Object.entries(event.effects).filter(([p]) => !isMemberPath(p)))
            if (line && Object.keys(told).length)
              line.data = {
                ...line.data,
                effects: mergeEffects(
                  line.data?.effects as Record<string, number | string> | undefined,
                  told,
                ),
              }
            continue
          }
          if (event.type === 'HEX_ENTERED') found = arrive(event.hex, from, event.time) || found
          if (event.type !== 'CHECK_REQUIRED') continue
          // A step's roll of something the Oracle rolls (`roll: table.ruins`) has no binding:
          // it names what it rolls, found from the rules' pack.
          const rolls = event.check.resolve
          const binding =
            options.bindings?.on[event.check.event] ??
            (rolls ? { resolve: definitionId(rolls, options.pack) } : undefined)
          // Its journal lines name it by its definition's name.
          const named =
            rolls && binding?.resolve && options.oracle?.nameOf(binding.resolve, options.locale)
          const about = { event: event.check.event, ...(named && { named }) }
          // A check's own effects (the system's rules as data: hunger, a fed night's sleep…).
          // (A check rolled after waiting for who rolls had its own effects then.)
          if (event.check.effects && !replaying) {
            const seenNow = tripContext(s, { ...host, ...event.check.context }, {}, party)
            const { applied, limits } = applyEffects(s, event.check.effects, stats, seenNow)
            changed(s, entries, applied, event.time)
            limits.push(...memberEffects(event.check.effects, seenNow, event.time))
            settle()
            // A party without characters: only what happened to it is told (nothing, when
            // the check only changes characters).
            const told = s.members?.length
              ? event.check.effects
              : Object.fromEntries(
                  Object.entries(event.check.effects).filter(([p]) => !isMemberPath(p)),
                )
            if (Object.keys(told).length)
              add(s, entries, {
                source: 'travel',
                code: 'CHECK_EFFECTS',
                time: event.time,
                data: { ...about, effects: told },
              })
            for (const limit of limits)
              add(s, entries, {
                source: 'travel',
                code: 'LIMIT_REACHED',
                time: event.time,
                data: { ...limit },
              })
          }
          if (!binding) {
            // Nothing rolls it: the journal says it came up (its effects' line, if it has
            // any), and it only stops the trip when it says so (`pause: true`).
            if (!event.check.effects)
              add(s, entries, {
                source: 'travel',
                code: 'CHECK_NOTED',
                time: event.time,
                data: about,
              })
            if (!event.check.pause || s.skipPauses) {
              if (event.check.pause) skipped(event.time, about)
              result.events.push(...resolve(event.check.id))
              continue
            }
          }
          if (!binding || !options.oracle) {
            resolvedAll = false
            add(s, entries, {
              source: 'travel',
              code: 'CHECK_PENDING',
              time: event.time,
              data: { ...about, id: event.check.id, ...whereOf(event.check) },
            })
            continue
          }
          // The player asked to choose who rolls each time: the check waits for it.
          if (
            s.askRolls &&
            !replaying &&
            !binding.weather &&
            picksWho(party) &&
            (s.members?.length ?? 0) > 1
          ) {
            s.asking = [...(s.asking ?? []), event.check.id]
            resolvedAll = false
            add(s, entries, {
              source: 'travel',
              code: 'CHECK_ASKS',
              time: event.time,
              data: { ...about, id: event.check.id, ...whereOf(event.check) },
            })
            continue
          }
          const context = tripContext(
            s,
            { ...host, ...event.check.context },
            binding.context,
            party,
          )
          let value: Record<string, unknown>
          let text: string | undefined
          try {
            if (binding.weather) {
              const model = options.weather?.[binding.weather]
              if (!model) throw new OracleError(`Unknown weather model "${binding.weather}"`)
              // Today's weather follows yesterday's (the trip's until now).
              const day = nextWeather(model, {
                season: typeof context.season === 'string' ? context.season : undefined,
                previous: s.travel.weather,
                at: s.weatherAt,
                random,
              })
              // On a hex flower, where the day is: tomorrow moves on from there.
              if (day.at) s.weatherAt = day.at
              else delete s.weatherAt
              add(s, entries, {
                source: 'oracle',
                code: 'WEATHER_ROLLED',
                time: event.time,
                data: {
                  check: event.check.event,
                  model: binding.weather,
                  weather: day.weather,
                  ...day.how,
                  ...(day.at && { at: day.at }),
                },
              })
              value = day.value
              text = localize(day.name, options.locale ?? 'en', 'en') ?? day.weather
            } else {
              const out = options.oracle.resolve(binding.resolve!, context, s.oracle, {
                locale: options.locale,
              })
              s.oracle = out.state
              // Behind the result: each roll's dice, and the rows or cards chosen.
              add(s, entries, {
                source: 'oracle',
                code: 'ROLLED',
                time: event.time,
                data: {
                  check: event.check.event,
                  ...(named && { named }),
                  rolls: rolledNodes(out.resolution),
                },
              })
              value = out.resolution.value
              text = out.resolution.text
            }
          } catch (error) {
            // A broken pack (unknown table, a roll that needs a missing number…) must not
            // lose the trip: the check stays pending and the journal says why.
            if (!(error instanceof OracleError)) throw error
            resolvedAll = false
            add(s, entries, {
              source: 'travel',
              code: 'CHECK_FAILED',
              time: event.time,
              text: error.message,
              data: {
                ...about,
                id: event.check.id,
                table: binding.resolve ?? binding.weather,
              },
            })
            continue
          }
          // Its effects with the variables they name read now (`'-{{party.stats.mouths}}'`;
          // the Oracle reads its own entries' first): the journal says what they did.
          const seen = {
            ...tripContext(s, { ...host, ...event.check.context }, {}, party),
            ...value,
          }
          const written = effectsOf(value)
          const effects = Object.fromEntries(
            Object.entries(written).map(([p, c]) => [
              p,
              resolveChange(c, seen, momentRolls(s.travel, hexOf(seen), momentOf(seen))),
            ]),
          )
          // Written with variables (the Oracle renders its own: '-{{loss}}' comes as '-2'),
          // the journal keeps them as numbers.
          const withVariables = Object.values(
            (value.effects ?? {}) as Record<string, unknown>,
          ).some((c) => typeof c === 'string' && !c.trim().startsWith('='))
          add(s, entries, {
            source: 'oracle',
            code: 'ORACLE_RESULT',
            // When the check came up (e.g. a night encounter belongs to the camp, not dawn).
            time: event.time,
            text,
            data: {
              ...about,
              ...(binding.weather ? { weather: binding.weather } : { table: binding.resolve }),
              value: withVariables ? { ...value, effects } : value,
            },
          })
          s.dayVars = { ...s.dayVars, ...dayVariables(value, declared) }
          const done = applyEffects(s, effects, stats)
          changed(s, entries, done.applied, event.time)
          const limits = [...done.limits, ...memberEffects(effects, seen, event.time)]
          settle()
          for (const limit of limits)
            add(s, entries, {
              source: 'travel',
              code: 'LIMIT_REACHED',
              time: event.time,
              data: { ...limit },
            })
          // A pause (the check's, or an entry's that came up) stops the trip after the roll:
          // the check waits, rolled, until the player presses Continue.
          const pauses = event.check.pause || value.pause === true
          if (pauses && s.skipPauses) skipped(event.time, { ...about, ...whereOf(event.check) })
          else if (pauses) {
            const pending = s.travel.pendingChecks.find((c) => c.id === event.check.id)
            if (pending) pending.rolled = toOutcome(value, declared)
            resolvedAll = false
            add(s, entries, {
              source: 'travel',
              code: 'CHECK_PAUSED',
              time: event.time,
              data: { ...about, id: event.check.id, ...whereOf(event.check) },
            })
            continue
          }
          result.events.push(...resolve(event.check.id, toOutcome(value, declared)))
        }
        const stopped = result.events.findLast((e) => e.type === 'TRAVEL_STOPPED')
        const reason = stopped?.type === 'TRAVEL_STOPPED' ? stopped.reason : undefined
        const clear =
          (travelling || waiting) &&
          resolvedAll &&
          s.travel.pendingChecks.length === 0 &&
          !s.travel.waiting &&
          !found
        // A travel order keeps going once its checks are resolved…
        let keepGoing = clear && reason === 'check'
        // …and, discovering, from hex to hex while the move is under way, with the route
        // re-planned over what was found (a wait goes on waiting where the party is).
        if (
          travelling &&
          discovery &&
          clear &&
          (reason === 'hex' || reason === 'check') &&
          (s.travel.moving || by !== undefined)
        ) {
          const destination = s.travel.destination
          if (!destination) break
          const planned = options.travel.apply(s.travel, {
            type: 'setDestination',
            hex: destination,
          })
          s.travel = planned.state
          for (const event of planned.events) journalEvent(s, entries, event)
          keepGoing = !!s.travel.route
        }
        // An action held by its checks (the camp's night encounter) goes on with the rest of
        // its steps once they're resolved; then a wait or a trip going on until a moment
        // goes on too.
        // Skipping pauses, a step that paused goes on at once (one that asks still waits).
        const waits = s.travel.waiting
        const settled = resolvedAll && !s.travel.pendingChecks.length && !s.travel.waiting && !found
        /**
         * What comes up once all is settled: a reaction that just turned true is played now,
         * in the same minute (its events as the next round's), and then the step goes on as
         * it would have. Played for a member, it's taken with them acting.
         */
        const react = (): boolean => {
          // Not while something waits for the player, nor in the middle of a held action.
          if (!settled || s.travel.moving?.held) return false
          // After a reaction, the step goes on as it was going to.
          if (reacting) {
            next ??= after
            reacting = false
          }
          restoreActing()
          const r = nextReaction(s)
          if (!r) return false
          if (++reacted > MAX_REACTIONS) {
            s.reactions = holding(s)
            add(s, entries, { source: 'travel', code: 'REACTIONS_LOOP', time: s.travel.time })
            return false
          }
          if (r.who) {
            actingBefore = { acting: s.acting }
            s.acting = r.who
            add(s, entries, {
              source: 'travel',
              code: 'REACTED',
              time: s.travel.time,
              data: { who: r.who },
            })
          }
          const moment = options.travel.apply(
            s.travel,
            { type: 'moment', at: r.key },
            tripContext(s, hostOf(s), {}, party),
          )
          s.travel = moment.state
          after = next
          reacting = true
          replay = moment.events
          return true
        }
        let next: TravelAction | undefined
        if (quiet && !reacting) next = undefined
        else if (
          s.skipPauses &&
          waits &&
          !waits.ask &&
          resolvedAll &&
          !s.travel.pendingChecks.length
        ) {
          resumed = true
          next = { type: 'resume' }
        } else if (settled && s.travel.moving?.held) {
          resumed = true
          next = { type: 'resume' }
        } else if (resumed && settled && long) {
          resumed = false
          next = travelling && s.travel.moving ? goOn : first
        }
        if (next || quiet || !keepGoing) {
          if (react()) continue
          if (!next) break
          act = next
          continue
        }
        // A wait waits on; a move goes on from where it stopped (not taken again), and an
        // action that waited for a check before setting off is taken now.
        next = travelling && (s.travel.moving || action.type === 'travel') ? goOn : first
        if (react()) continue
        if (!next) break
        act = next
      }
      restoreActing()
      // Where the step left the party: those it left behind that go are gone.
      settleCopies(s, entries)
      return { state: s, entries }
    }
  }

  return {
    step: (input, action) => run(input, action),
    settle(input) {
      const done = run(input, { type: 'moment', at: '' }, true)
      // A change by hand that set nothing off isn't a step.
      if (!done.entries.length && input.lastStep !== undefined) done.state.lastStep = input.lastStep
      else if (!done.entries.length) delete done.state.lastStep
      return done
    },
    share(input, moved) {
      const s = structuredClone(input)
      const entries: JournalEntry[] = []
      const done = answerSharing(s, party, moved, s.travel.time)
      if (!done) return { state: input, entries }
      add(s, entries, {
        source: 'travel',
        code: 'SHARED',
        data: { path: `party.items.${done.sharing.item}`, moved: done.moved },
      })
      // The line above says who gave what; what else it changed (a load) is said too.
      const counts = (e: CharacterEvent) =>
        e.type === 'ITEM_ADDED' ||
        e.type === 'ITEM_REMOVED' ||
        (e.type === 'ITEM_CHANGED' && e.field === 'count')
      told(
        s,
        entries,
        done.events.filter((e) => !counts(e)),
        s.travel.time,
      )
      const settled = this.settle(s)
      return { state: settled.state, entries: [...entries, ...settled.entries] }
    },
    note(input, text) {
      return addEntry(input, { source: 'user', code: 'NOTE', text }, now())
    },
  }
}

/**
 * A trip's members brought up to date from the roster (the Characters app changed them, or
 * another tab): the party follows them, and the journal says who (`ROSTER_UPDATED`). The
 * same state when nothing changed.
 */
export function pullMembers(
  s: SessionState,
  roster: Roster,
  place: RosterPlace,
  party: PartyRules,
  at: string = new Date().toISOString(),
): SessionState {
  const { characters, updated } = pullFromRoster(roster, s.members ?? [], place)
  // Copies kept in the roster (those present) follow it too.
  const copies = pullFromRoster(
    roster,
    (s.present ?? []).map((p) => p.character),
    place,
  )
  updated.push(...copies.updated)
  if (!updated.length) return s
  const named = [...characters, ...copies.characters]
  const next = addEntry(
    s,
    {
      source: 'user',
      code: 'ROSTER_UPDATED',
      data: { names: updated.map((id) => named.find((c) => c.id === id)?.name || id) },
    },
    at,
  )
  if (s.members) next.members = structuredClone(characters)
  if (copies.updated.length)
    next.present = (s.present ?? []).map((p, i) => ({
      ...p,
      character: structuredClone(copies.characters[i]),
    }))
  refreshParty(next, party)
  return next
}

/**
 * The trip's characters as a place of the roster: its members, then those present (a copy
 * kept in the roster plays in the trip until it leaves).
 */
export const placeCharacters = (s: SessionState): CharacterState[] => [
  ...(s.members ?? []),
  ...(s.present ?? []).map((p) => p.character),
]

/**
 * What the last step did: its journal entries, and those added after it (a table rolled
 * by hand); none before the trip's first step.
 */
export function lastStepEntries(s: SessionState): JournalEntry[] {
  const from = s.lastStep
  if (from === undefined) return []
  return s.journal.filter((e) => Number(e.id.slice(1)) >= from)
}

/**
 * Adds an entry to the journal at the current game time, outside a travel step: user
 * notes, or tables rolled by hand (`source: 'oracle'`, `code: 'ORACLE_ROLL'`).
 */
export function addEntry(
  input: SessionState,
  entry: Omit<JournalEntry, 'id' | 'at' | 'time'>,
  at: string = new Date().toISOString(),
): SessionState {
  const s = structuredClone(input)
  s.journal.push({ id: `j${s.nextEntry++}`, time: s.travel.time, at, ...entry })
  return s
}

/**
 * Table values that the travel engine understands as a check outcome (its effects on the
 * party are applied by the session: `effectsOf`).
 */
export function toOutcome(
  value: Record<string, unknown>,
  /** The system's declared values. */
  declared: Record<string, DayValue> = {},
): CheckOutcome {
  const outcome: CheckOutcome = {}
  const values = Object.fromEntries(
    Object.keys(declared).flatMap((id) => (id in value ? [[id, value[id]]] : [])),
  )
  if (Object.keys(values).length) outcome.values = values
  if (typeof value.weather === 'string') outcome.weather = value.weather
  return outcome
}

/**
 * Values later checks of the same day see: the values the system declares (lost, a
 * modifier…) and the day's weather. Nothing else lasts past its roll, whatever its name.
 */
export function dayVariables(
  value: Record<string, unknown>,
  declared: Record<string, DayValue> = {},
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, v] of Object.entries(value))
    if (key === 'weather' || key in declared) out[key] = v
  return out
}
export * from './effects'
export * from './journal'
export * from './trip'
export * from './discovery'
export * from './suggestions'
// The full names of facts (`hex.terrain`, `trip.day`…), for hosts that build contexts.
export { FACT_GROUPS, FACT_PATHS, hexIdOf, qualify } from '@open-tabletop/travel-engine'
export * from './party'
export * from './present'
export * from './factions'
export * from './clocks'
export * from './world'
export * from './roster'
export * from './usage'
export * from './refs'
