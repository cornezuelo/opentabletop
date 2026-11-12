import { matches, validateCondition, type Condition } from '@open-tabletop/conditions'
import {
  actionsWhere,
  momentRolls,
  qualify,
  refId,
  type TravelAction,
  type TravelRules,
  type Unavailable,
} from '@open-tabletop/travel-engine'
import { resolveChange } from '@open-tabletop/variables'
import { PARTY_ID } from './party'
import { presentHere } from './present'
import type { JournalEntry, SessionState } from './index'

/** The two sides of an encounter: the party's (its members, or the party itself) and the foes'. */
export type Side = 'party' | 'foes'

/**
 * How a system's fights go (`encounter:` in `kind: system`, docs/conflicts.md): who acts
 * first, what the party may do on its turns, how long a round takes and when it ends by
 * itself. A system without it plays fights as a whole.
 */
export interface EncounterRules {
  /**
   * Who acts first: by side (`first`, unless an effect of `encounter.start` said otherwise,
   * `encounter.first`), or each participant by a value read once (highest first).
   */
  order:
    | { by: 'side'; first?: Side }
    /** The value each one rolls: one for all, or one for each side (`{ party, foes }`). */
    | { by: 'participant'; value: string | Record<Side, string> }
  /** The system's actions a member takes on its turn (ids): the only ones open in a fight. */
  actions: string[]
  /**
   * What a foe does on its turn when its template says nothing (`table.foe-turn`): rolled
   * acting as that foe (its template's `actions` first).
   */
  foes?: string
  /** Minutes a round takes (absent: none pass). */
  minutes?: number
  /** When it ends by itself: read after the encounter starts and after every turn. */
  ends?: Condition
}

/**
 * Where an encounter is: `start` (asked for, not begun), `begun` (its start's actions done,
 * the order to read), `round` (a round to begin), `turn` (a turn to begin), `acting` (a
 * member's turn: the player chooses what to do), `acted` (the turn is done), `end` (to end).
 */
export type EncounterStage = 'start' | 'begun' | 'round' | 'turn' | 'acting' | 'acted' | 'end'

/** An encounter going on in a trip (play state, saved with it). */
export interface Encounter {
  stage: EncounterStage
  /** The round (1 the first), 0 before it begins. */
  round: number
  /** Who acts, in order: members' ids (or the party's), and those present. */
  order: string[]
  /** Whose turn it is in `order`. */
  turn: number
  /** The side an effect said goes first (`encounter.first`), over the system's. */
  first?: Side
  /** Who was acting before the encounter, given back when it ends. */
  acting?: string
}

/**
 * An effect on the encounter: `encounter: start` / `encounter: end`, and `encounter.first:
 * party` / `foes` (which side goes first, for an order by side).
 */
export const ENCOUNTER_EFFECT = /^encounter(?:\.(first))?$/

/** The keys `encounter:` may have. */
const KEYS = new Set(['order', 'actions', 'foes', 'minutes', 'ends'])

/** A system's `encounter:` read, with what's wrong in it (paths from `encounter`). */
export function parseEncounter(
  data: unknown,
  /** The ids of the system's actions. */
  actionIds: string[],
): { rules?: EncounterRules; errors: string[] } {
  const errors: string[] = []
  if (typeof data !== 'object' || data === null || Array.isArray(data))
    return { errors: ['encounter: expected how its fights go (order, actions…)'] }
  const raw = data as Record<string, unknown>
  for (const key of Object.keys(raw))
    if (!KEYS.has(key)) errors.push(`encounter.${key}: unknown key`)
  let order: EncounterRules['order'] = { by: 'side' }
  const o = raw.order
  if (o !== undefined) {
    const by = typeof o === 'object' && o !== null ? (o as Record<string, unknown>).by : undefined
    const rest = (o ?? {}) as Record<string, unknown>
    if (by === 'side') {
      if (rest.first !== undefined && rest.first !== 'party' && rest.first !== 'foes')
        errors.push('encounter.order.first: expected party or foes')
      order = {
        by: 'side',
        ...((rest.first === 'party' || rest.first === 'foes') && { first: rest.first }),
      }
    } else if (by === 'participant') {
      const value = rest.value
      const written = (v: unknown) => typeof v === 'string' || typeof v === 'number'
      const sides =
        typeof value === 'object' && value !== null && !Array.isArray(value)
          ? (value as Record<string, unknown>)
          : undefined
      if (sides) {
        for (const key of Object.keys(sides))
          if (key !== 'party' && key !== 'foes')
            errors.push(`encounter.order.value.${key}: expected party or foes`)
        for (const side of ['party', 'foes'] as const)
          if (!written(sides[side]))
            errors.push(`encounter.order.value.${side}: expected what each one of this side rolls`)
        order = {
          by: 'participant',
          value: { party: String(sides.party ?? 0), foes: String(sides.foes ?? 0) },
        }
      } else {
        if (!written(value))
          errors.push(
            "encounter.order.value: expected what each one rolls ('{{acting.values.agility + 1d6}}'), or one for each side (party, foes)",
          )
        order = { by: 'participant', value: String(value ?? 0) }
      }
    } else errors.push('encounter.order.by: expected side or participant')
  }
  const actions: string[] = []
  if (raw.actions !== undefined && !Array.isArray(raw.actions))
    errors.push('encounter.actions: expected a list of the system’s actions (actions.attack)')
  ;((Array.isArray(raw.actions) ? raw.actions : []) as unknown[]).forEach((a, i) => {
    const id = refId('actions', a) ?? (typeof a === 'string' ? a : undefined)
    if (id === undefined || !actionIds.includes(id))
      errors.push(`encounter.actions.${i}: the system has no action "${String(a)}"`)
    else actions.push(id)
  })
  if (raw.foes !== undefined && (typeof raw.foes !== 'string' || !raw.foes))
    errors.push('encounter.foes: expected what a foe does on its turn (table.foe-turn)')
  if (raw.minutes !== undefined && (typeof raw.minutes !== 'number' || raw.minutes < 0))
    errors.push('encounter.minutes: expected the minutes a round takes')
  if (raw.ends !== undefined) errors.push(...validateCondition(raw.ends, 'encounter.ends'))
  if (errors.length) return { errors }
  return {
    rules: {
      order,
      actions,
      ...(typeof raw.foes === 'string' && raw.foes && { foes: raw.foes }),
      ...(typeof raw.minutes === 'number' && { minutes: raw.minutes }),
      ...(raw.ends !== undefined && { ends: raw.ends as Condition }),
    },
    errors,
  }
}

/**
 * The player's actions that start a fight (an effect `encounter: start` of theirs, or of an
 * action they take): with one, a host needs no button of its own to start one by hand.
 */
export const fightStarters = (rules: TravelRules): string[] =>
  actionsWhere(
    rules,
    (s) => (s.effects as Record<string, unknown> | undefined)?.encounter === 'start',
  ).filter((id) => !rules.actions?.[id]?.on)

/** The party's side: its members, or the party itself when it's played as a whole. */
const partySide = (s: SessionState): string[] =>
  s.members?.length ? s.members.map((m) => m.id) : [PARTY_ID]
/** Those of the foes' side here now. */
const foesSide = (s: SessionState): string[] => presentHere(s).map((p) => p.character.id)

/** The side of one taking part. */
export const sideOf = (s: SessionState, id: string): Side =>
  partySide(s).includes(id) ? 'party' : 'foes'

/** A participant's name: a member's or a copy's (its id if none); the party's ('' if none). */
export function participantName(s: SessionState, id: string): string {
  if (id === PARTY_ID) return s.party?.name ?? ''
  const c =
    s.members?.find((m) => m.id === id) ?? s.present?.find((p) => p.character.id === id)?.character
  return c?.name ?? id
}

/**
 * What conditions and tables read of an encounter (`encounter.*`): the round, whose turn it
 * is and that one's side, and the order; nothing before it begins.
 */
export function encounterFacts(s: SessionState): Record<string, unknown> | undefined {
  const e = s.encounter
  if (!e || e.stage === 'start') return undefined
  const turn = e.order[e.turn]
  return {
    round: e.round,
    order: [...e.order],
    ...(turn !== undefined && e.round > 0 && { turn, side: sideOf(s, turn) }),
  }
}

/** One taking part in an encounter, as a fight panel shows it. */
export interface Fighter {
  id: string
  name: string
  side: Side
  /** Whether it's this one's turn now. */
  acting: boolean
  /** Whether it has had its turn this round. */
  done: boolean
  /** Whether it's gone (fled, fallen, left the place): it leaves the order next round. */
  gone: boolean
}

/**
 * An encounter as a fight panel shows it: the round, who acts in order and whose turn it is,
 * and whether the player is to choose (a turn of the party's); nothing before it begins.
 */
export function encounterView(
  s: SessionState,
): { round: number; fighters: Fighter[]; choosing: boolean } | undefined {
  const e = s.encounter
  if (!e || e.round === 0) return undefined
  // A turn taken whose action waits for the player (whom to strike) is still going on.
  const busy = e.stage === 'acted' && waits(s)
  const now = e.stage === 'acting' || e.stage === 'turn' || busy
  return {
    round: e.round,
    choosing: e.stage === 'acting',
    fighters: e.order.map((id, i) => ({
      id,
      name: participantName(s, id),
      side: sideOf(s, id),
      acting: i === e.turn && now,
      done: i < e.turn || (i === e.turn && e.stage === 'acted' && !busy),
      gone: !stillHere(s, id),
    })),
  }
}

/** Effects on the encounter (in place): started, ended, a side said to go first. */
export function changeEncounter(
  s: Pick<SessionState, 'encounter' | 'acting'>,
  path: string,
  change: unknown,
): void {
  const part = ENCOUNTER_EFFECT.exec(path)?.[1]
  if (part === 'first') {
    if ((change === 'party' || change === 'foes') && s.encounter) s.encounter.first = change
    return
  }
  if (change === 'start' && !s.encounter)
    s.encounter = {
      stage: 'start',
      round: 0,
      order: [],
      turn: 0,
      ...(s.acting !== undefined && { acting: s.acting }),
    }
  else if (change === 'end' && s.encounter && s.encounter.stage !== 'start')
    s.encounter.stage = 'end'
  else if (change === 'end') delete s.encounter
}

/**
 * Who acts and in which order: by side (the one said first, then the other), or each one by
 * the value it rolls (highest first; on a tie, the party's side first, then as listed).
 */
function orderOf(
  s: SessionState,
  rules: EncounterRules,
  context: Record<string, unknown>,
): string[] {
  const party = partySide(s)
  const foes = foesSide(s)
  if (rules.order.by === 'side') {
    const first = s.encounter?.first ?? rules.order.first ?? 'party'
    return first === 'party' ? [...party, ...foes] : [...foes, ...party]
  }
  const { value } = rules.order
  const characters = (context.characters ?? {}) as Record<string, unknown>
  const rolled = [...party, ...foes].map((id, i) => {
    const roller = momentRolls(s.travel, s.travel.location, `encounter|${s.nextEntry}|${id}`)
    const read = { ...context, acting: characters[id] ?? {} }
    const written = typeof value === 'string' ? value : value[i < party.length ? 'party' : 'foes']
    const n = Number(String(resolveChange(`=${written}`, read, roller)).slice(1))
    return { id, n: Number.isFinite(n) ? n : 0, party: i < party.length, i }
  })
  rolled.sort((a, b) => b.n - a.n || Number(b.party) - Number(a.party) || a.i - b.i)
  return rolled.map((r) => r.id)
}

/** Whether the trip waits for the player before an encounter can go on. */
const waits = (s: SessionState): boolean =>
  !!s.travel.pendingChecks.length || !!s.travel.waiting || !!s.sharing?.length || !!s.asking?.length

/** Whether one taking part is still here: a member, the party, or a copy at the party's place. */
const stillHere = (s: SessionState, id: string): boolean =>
  partySide(s).includes(id) || foesSide(s).includes(id)

/**
 * Plays an encounter on as far as it goes by itself (docs/conflicts.md): its moments
 * (`encounter.start`, `.round`, `.turn`, `.end`, said to the trip by `step`), its order,
 * each turn (`acting` is whoever's turn it is), the rounds (with their minutes) and its end.
 * It stops at a member's turn (the player chooses), or when the trip waits for the player.
 */
export function driveEncounter(
  rules: EncounterRules | undefined,
  input: { state: SessionState; entries: JournalEntry[] },
  step: (s: SessionState, action: TravelAction) => { state: SessionState; entries: JournalEntry[] },
  /** What conditions read now (the trip's context), for the order and `ends`. */
  context: (s: SessionState) => Record<string, unknown>,
  /**
   * What a foe rolls on its turn (full id): its template's `actions`, else the rules'
   * `foes`; none, and its turn is only the moment.
   */
  foeTable: (s: SessionState, id: string) => string | undefined = () => undefined,
): { state: SessionState; entries: JournalEntry[] } {
  let { state } = input
  const entries = [...input.entries]
  const line = (code: string, data: Record<string, unknown> = {}) => {
    state = structuredClone(state)
    const entry: JournalEntry = {
      id: `j${state.nextEntry++}`,
      time: state.travel.time,
      at: new Date().toISOString(),
      source: 'travel',
      code,
      data,
    }
    state.journal.push(entry)
    entries.push(entry)
  }
  const say = (action: TravelAction) => {
    const done = step(state, action)
    state = done.state
    entries.push(...done.entries)
  }
  const edit = (change: (e: Encounter, s: SessionState) => void) => {
    state = structuredClone(state)
    change(state.encounter!, state)
  }
  const ends = () => {
    if (!rules?.ends) return false
    const read = context(state)
    const roller = momentRolls(
      state.travel,
      state.travel.location,
      `encounter.end|${state.nextEntry}`,
    )
    return matches(rules.ends, qualify(read), { roller })
  }
  // A system without fights in turns: an encounter asked for is none.
  if (!rules && state.encounter) {
    state = structuredClone(state)
    delete state.encounter
  }
  for (let guard = 0; guard < 500 && rules && state.encounter && !waits(state); guard++) {
    const e = state.encounter
    switch (e.stage) {
      case 'start':
        edit((e) => (e.stage = 'begun'))
        line('ENCOUNTER_STARTED')
        say({ type: 'moment', at: 'encounter.start' })
        break
      case 'begun': {
        const order = orderOf(state, rules, context(state))
        edit((e) => Object.assign(e, { order, round: 1, turn: 0, stage: 'round' }))
        if (ends()) edit((e) => (e.stage = 'end'))
        break
      }
      case 'round':
        edit((e) => (e.stage = 'turn'))
        line('ENCOUNTER_ROUND', { round: e.round })
        say({ type: 'moment', at: 'encounter.round' })
        break
      case 'turn': {
        const id = e.order[e.turn]
        if (id === undefined || !stillHere(state, id)) {
          edit((e) => (e.stage = 'acted'))
          break
        }
        const side = sideOf(state, id)
        // The party's turns wait for the player; the foes' go by themselves (for now).
        edit((e, s) => {
          e.stage = side === 'party' ? 'acting' : 'acted'
          if (id !== PARTY_ID) s.acting = id
        })
        line('ENCOUNTER_TURN', { id, name: participantName(state, id), side, round: e.round })
        say({ type: 'moment', at: 'encounter.turn' })
        // A foe still standing does what its table says, acting as itself.
        const table = side === 'foes' && stillHere(state, id) ? foeTable(state, id) : undefined
        if (table && !waits(state)) say({ type: 'roll', resolve: table })
        break
      }
      case 'acting':
        return { state, entries }
      case 'acted': {
        if (ends()) {
          edit((e) => (e.stage = 'end'))
          break
        }
        if (e.turn + 1 < e.order.length) {
          edit((e) => {
            e.turn++
            e.stage = 'turn'
          })
          break
        }
        // A new round: those gone leave the order, those come since join it at its end.
        const kept = e.order.filter((id) => stillHere(state, id))
        const come = [...partySide(state), ...foesSide(state)].filter((id) => !kept.includes(id))
        if (!kept.length && !come.length) {
          edit((e) => (e.stage = 'end'))
          break
        }
        edit((e) =>
          Object.assign(e, {
            order: [...kept, ...come],
            turn: 0,
            round: e.round + 1,
            stage: 'round',
          }),
        )
        if (rules.minutes) say({ type: 'advanceTime', minutes: rules.minutes })
        break
      }
      case 'end': {
        const rounds = e.round
        edit((e, s) => {
          if (e.acting !== undefined) s.acting = e.acting
          delete s.encounter
        })
        line('ENCOUNTER_ENDED', { rounds })
        say({ type: 'moment', at: 'encounter.end' })
        break
      }
    }
  }
  return { state, entries }
}

/**
 * Marks a member's turn taken (in place) when the action is one of the encounter's, taken on
 * that turn: once it's done, the turn passes.
 */
export function takingTurn(
  s: SessionState,
  rules: EncounterRules | undefined,
  action: TravelAction,
): void {
  if (
    rules &&
    s.encounter?.stage === 'acting' &&
    action.type === 'action' &&
    rules.actions.includes(action.id)
  )
    s.encounter.stage = 'acted'
}

/**
 * What an encounter closes (in place), while it goes on: travelling and the trip's other
 * actions; its own actions when it isn't a turn of the party's. Outside a fight it closes
 * nothing (a system that wants its fight's actions only in one says so in their `when`).
 */
export function encounterAvailability(
  s: SessionState,
  rules: EncounterRules | undefined,
  actionIds: string[],
  out: Record<string, Unavailable | EncounterUnavailable>,
): void {
  if (!rules || !s.encounter) return
  const turn = s.encounter.stage === 'acting'
  out.travel ??= { encounter: 'fight' }
  for (const id of actionIds) {
    if (out[id]) continue
    if (!rules.actions.includes(id)) out[id] = { encounter: 'fight' }
    else if (!turn) out[id] = { encounter: 'turn' }
  }
}

/**
 * Why an action can't be taken because of an encounter: `fight`, not during one; `turn`, not
 * now (it isn't a turn of the party's).
 */
export type EncounterUnavailable = { encounter: 'fight' | 'turn' }
