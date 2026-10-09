/**
 * Character sheets as data. A system's pack declares a sheet (`kind: sheet`): the values a
 * character has (with the bounds the system gives them, or none), which of them are shown
 * as tracks, the conditions a character may have (and what they block), and the kinds of
 * relation it may hold. This engine creates characters from a sheet, changes them within
 * their bounds and says what conditions and tables read of them. It knows no game.
 *
 * Pure functions: `(sheet, state, action) → { state, events }`; nothing here touches storage
 * or the UI, and rolls come from the roller the caller gives.
 */
import {
  changeValue,
  resolveChange,
  variableOf,
  type Bounds,
  type Roller,
} from '@open-tabletop/variables'
import { matches, validateCondition, type Condition } from '@open-tabletop/conditions'
import { z } from 'zod'

/** A text a player reads, or the same in several languages (translations fold in as these). */
const text = z.union([z.string(), z.record(z.string(), z.string())])
/** Text in one or several languages: "Wits" or { en: Wits, es: Ingenio }. */
export type SheetText = z.infer<typeof text>
/** A bound: a number, or a variable naming another value (`'{{maxHealth}}'`). */
const bound = z.union([z.number(), z.string().min(1)])

const value = z
  .object({
    name: text.optional(),
    description: text.optional(),
    default: z.number().optional(),
    min: bound.optional(),
    max: bound.optional(),
    /** Shown as boxes, `max` of them (stress, a vow's progress, xp). */
    track: z.boolean().optional(),
    /** A heading the value is shown under (attributes, meters…); nothing else. */
    group: z.string().optional(),
  })
  .strict()

const condition = z
  .object({
    name: text.optional(),
    description: text.optional(),
    /** What it stops while a character has it: an action's id, `travel`, `mode.<id>`… */
    blocks: z.array(z.string().min(1)).optional(),
  })
  .strict()

const relation = z
  .object({
    name: text.optional(),
    description: text.optional(),
    /** A relation of this kind carries a number (Hx, strings, a bond's progress), with bounds. */
    value: z.object({ min: z.number().optional(), max: z.number().optional() }).strict().optional(),
  })
  .strict()

export const sheetSchema = z
  .object({
    kind: z.literal('sheet'),
    id: z.string().min(1),
    name: text.optional(),
    description: text.optional(),
    values: z.record(z.string().min(1), value).default({}),
    conditions: z.record(z.string().min(1), condition).default({}),
    relations: z.record(z.string().min(1), relation).default({}),
    /** The headings values are shown under (`group:`), with their names; in this order. */
    groups: z
      .record(
        z.string().min(1),
        z.object({ name: text.optional(), description: text.optional() }).strict(),
      )
      .optional(),
  })
  .strict()

export type Sheet = z.infer<typeof sheetSchema>
export type SheetValue = z.infer<typeof value>

/** Reads a `kind: sheet` definition: the sheet, or the problems found (`path: message`). */
export function parseSheet(raw: unknown): { sheet?: Sheet; errors: string[] } {
  const parsed = sheetSchema.safeParse(raw)
  if (!parsed.success)
    return {
      errors: parsed.error.issues.map((i) => `${i.path.join('.') || 'sheet'}: ${i.message}`),
    }
  const sheet = parsed.data
  const errors: string[] = []
  for (const [id, v] of Object.entries(sheet.values)) {
    for (const key of ['min', 'max'] as const) {
      const b = v[key]
      if (typeof b !== 'string') continue
      const name = variableOf(b)
      if (name === undefined) errors.push(`values.${id}.${key}: a number or '{{a value}}'`)
      else if (!(name.replace(/^values\./, '') in sheet.values))
        errors.push(`values.${id}.${key}: no value "${name}" on this sheet`)
    }
    if (v.track && typeof v.max !== 'number')
      errors.push(`values.${id}: a track needs a number as its max (its boxes)`)
  }
  for (const [id, v] of Object.entries(sheet.values))
    if (sheet.groups && v.group !== undefined && !(v.group in sheet.groups))
      errors.push(`values.${id}.group: no group "${v.group}" in groups`)
  for (const [id, c] of Object.entries(sheet.conditions))
    if (c.blocks?.some((b) => !b.trim())) errors.push(`conditions.${id}.blocks: empty entry`)
  return errors.length ? { errors } : { sheet, errors }
}

/** A relation from a character to anything with a reference (`character:id`, `poi:id`…). */
export interface Relation {
  to: string
  kind: string
  value?: number
}

export interface CharacterState {
  id: string
  /** The sheet's full id (`pack/id`). */
  sheet: string
  name?: string
  values: Record<string, number>
  /** The conditions the character has, each with when it began (game time), if known. */
  conditions: Record<string, { since?: number }>
  tags: string[]
  /** Abilities, moves, talents… by their definitions' full ids. */
  cards: string[]
  relations: Relation[]
}

/** A new character with the sheet's defaults (a value without one starts at 0), then `init`. */
export function createCharacter(
  sheet: Sheet,
  sheetId: string,
  init: Partial<CharacterState> & { id: string },
): CharacterState {
  const values = Object.fromEntries(
    Object.entries(sheet.values).map(([id, v]) => [id, v.default ?? 0]),
  )
  return {
    sheet: sheetId,
    conditions: {},
    tags: [],
    cards: [],
    relations: [],
    ...init,
    values: { ...values, ...init.values },
  }
}

export type CharacterAction =
  /**
   * Changes, in the effects' syntax: `values.health: -1` (a number adds, `'=3'` sets,
   * `'-{{1d3}}'` a roll, `'+{{other}}'` a variable), `conditions.wounded: true` / `false`.
   */
  | { type: 'change'; effects: Record<string, number | string | boolean>; time?: number }
  | { type: 'tag' | 'untag'; tag: string }
  | { type: 'addCard' | 'removeCard'; card: string }
  /** Adds the relation, or changes its value if it's there (`value` adds, like an effect). */
  | { type: 'relate'; to: string; kind: string; value?: number | string }
  | { type: 'unrelate'; to: string; kind?: string }

export type CharacterEvent =
  | { type: 'VALUE_CHANGED'; character: string; value: string; from: number; to: number }
  | { type: 'LIMIT_REACHED'; character: string; value: string; limit: 'min' | 'max' }
  | { type: 'CONDITION_SET' | 'CONDITION_CLEARED'; character: string; condition: string }
  | { type: 'TAGGED' | 'UNTAGGED'; character: string; tag: string }
  | { type: 'CARD_ADDED' | 'CARD_REMOVED'; character: string; card: string }
  | { type: 'RELATION_ADDED' | 'RELATION_REMOVED'; character: string; to: string; kind: string }
  | {
      type: 'RELATION_CHANGED'
      character: string
      to: string
      kind: string
      from: number
      value: number
    }
  | { type: 'UNKNOWN_CONDITION'; character: string; condition: string }

export interface ApplyOptions {
  /** Rolls the dice an effect names (`'-{{1d3}}'`); none: a roll changes nothing. */
  roller?: Roller
  /** More values variables may name, besides the character's own facts. */
  context?: Record<string, unknown>
}

/** The bounds of a value now: its numbers, or the values its variables name. */
export function boundsOf(sheet: Sheet, state: CharacterState, id: string): Bounds {
  const def = sheet.values[id]
  if (!def) return {}
  const read = (b: number | string | undefined): number | undefined => {
    if (typeof b === 'number') return b
    const name = variableOf(b)
    if (name === undefined) return undefined
    const n = state.values[name.replace(/^values\./, '')]
    return typeof n === 'number' ? n : undefined
  }
  const min = read(def.min)
  const max = read(def.max)
  return { ...(min !== undefined && { min }), ...(max !== undefined && { max }) }
}

/** What a character's change does: a new state and what happened, in order. */
export function applyCharacter(
  sheet: Sheet,
  input: CharacterState,
  action: CharacterAction,
  options: ApplyOptions = {},
): { state: CharacterState; events: CharacterEvent[] } {
  const state = structuredClone(input)
  const events: CharacterEvent[] = []
  const who = state.id
  switch (action.type) {
    case 'change': {
      // Variables are read before anything changes, as travel effects do.
      const seen = { ...options.context, ...characterFacts(state) }
      for (const [path, written] of Object.entries(action.effects)) {
        const [scope, ...rest] = path.split('.')
        const id = rest.join('.')
        if (scope === 'conditions') {
          if (!sheet.conditions[id])
            events.push({ type: 'UNKNOWN_CONDITION', character: who, condition: id })
          const on = written === true || written === 'true' || written === 1
          if (on && !state.conditions[id]) {
            state.conditions[id] = action.time !== undefined ? { since: action.time } : {}
            events.push({ type: 'CONDITION_SET', character: who, condition: id })
          } else if (!on && state.conditions[id]) {
            delete state.conditions[id]
            events.push({ type: 'CONDITION_CLEARED', character: who, condition: id })
          }
          continue
        }
        if (scope !== 'values' || !id || typeof written === 'boolean') continue
        const change = resolveChange(written, seen, options.roller)
        const from = state.values[id] ?? 0
        const { to, limit } = changeValue(from, change, boundsOf(sheet, state, id))
        state.values[id] = to
        if (to !== from) events.push({ type: 'VALUE_CHANGED', character: who, value: id, from, to })
        if (limit) events.push({ type: 'LIMIT_REACHED', character: who, value: id, limit })
      }
      // A value whose bound is another value (momentum under its max) stays within it.
      for (const id of Object.keys(sheet.values)) {
        const from = state.values[id] ?? 0
        const { to } = changeValue(from, 0, boundsOf(sheet, state, id))
        if (to !== from) {
          state.values[id] = to
          events.push({ type: 'VALUE_CHANGED', character: who, value: id, from, to })
        }
      }
      break
    }
    case 'tag':
    case 'untag': {
      const has = state.tags.includes(action.tag)
      if (action.type === 'tag' && !has) {
        state.tags.push(action.tag)
        events.push({ type: 'TAGGED', character: who, tag: action.tag })
      } else if (action.type === 'untag' && has) {
        state.tags = state.tags.filter((t) => t !== action.tag)
        events.push({ type: 'UNTAGGED', character: who, tag: action.tag })
      }
      break
    }
    case 'addCard':
    case 'removeCard': {
      const has = state.cards.includes(action.card)
      if (action.type === 'addCard' && !has) {
        state.cards.push(action.card)
        events.push({ type: 'CARD_ADDED', character: who, card: action.card })
      } else if (action.type === 'removeCard' && has) {
        state.cards = state.cards.filter((c) => c !== action.card)
        events.push({ type: 'CARD_REMOVED', character: who, card: action.card })
      }
      break
    }
    case 'relate': {
      const kind = sheet.relations[action.kind]
      const bounds = kind?.value ?? {}
      const existing = state.relations.find((r) => r.to === action.to && r.kind === action.kind)
      if (!existing) {
        const start =
          action.value === undefined
            ? undefined
            : changeValue(
                0,
                resolveChange(action.value, characterFacts(state), options.roller),
                bounds,
              ).to
        state.relations.push({
          to: action.to,
          kind: action.kind,
          ...(start !== undefined && { value: start }),
        })
        events.push({ type: 'RELATION_ADDED', character: who, to: action.to, kind: action.kind })
      } else if (action.value !== undefined) {
        const from = existing.value ?? 0
        const change = resolveChange(action.value, characterFacts(state), options.roller)
        const { to } = changeValue(from, change, bounds)
        existing.value = to
        if (to !== from)
          events.push({
            type: 'RELATION_CHANGED',
            character: who,
            to: action.to,
            kind: action.kind,
            from,
            value: to,
          })
      }
      break
    }
    case 'unrelate': {
      const gone = state.relations.filter(
        (r) => r.to === action.to && (action.kind === undefined || r.kind === action.kind),
      )
      state.relations = state.relations.filter((r) => !gone.includes(r))
      for (const r of gone)
        events.push({ type: 'RELATION_REMOVED', character: who, to: r.to, kind: r.kind })
      break
    }
  }
  return { state, events }
}

/**
 * What conditions and tables read of a character: `values.<id>` (and each value by its
 * own name), `conditions` (a list of the ones it has), `tags`, `cards`, and `relations`
 * by kind (`relations.bond: [character:kael, poi:ashford]`), with each one's number as
 * `bonds.<kind>.<to>`.
 */
export function characterFacts(state: CharacterState): Record<string, unknown> {
  const byKind: Record<string, string[]> = {}
  const numbers: Record<string, Record<string, number>> = {}
  for (const r of state.relations) {
    ;(byKind[r.kind] ??= []).push(r.to)
    if (r.value !== undefined) (numbers[r.kind] ??= {})[r.to] = r.value
  }
  return {
    ...state.values,
    id: state.id,
    ...(state.name !== undefined && { name: state.name }),
    values: { ...state.values },
    conditions: Object.keys(state.conditions),
    tags: [...state.tags],
    cards: [...state.cards],
    relations: byKind,
    bonds: numbers,
  }
}

/** The condition a character has that blocks `what` (an action, `travel`…), if any. */
export function blockedBy(sheet: Sheet, state: CharacterState, what: string): string | undefined {
  return Object.keys(state.conditions).find((id) => sheet.conditions[id]?.blocks?.includes(what))
}

/**
 * A party value made of its members' (`from` in a system's party stats): the best (`max`),
 * the worst (`min`) or the `sum` of one of their values, or how many they are (`count`),
 * among the members its `when` / `unless` let in (each read with the member's facts).
 * `none` is what it is when no member counts (0 unless the system says otherwise).
 */
export interface PartyFrom {
  max?: string
  min?: string
  sum?: string
  count?: boolean
  when?: Condition
  unless?: Condition
  none?: number
}

/** Problems of a `from` (empty: fine), each `<path>: message`. */
export function validatePartyFrom(raw: unknown, at = 'from'): string[] {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw))
    return [`${at}: expected { max | min | sum: <value> } or { count: true }`]
  const from = raw as Record<string, unknown>
  const errors: string[] = []
  const ways = (['max', 'min', 'sum', 'count'] as const).filter((k) => from[k] !== undefined)
  if (ways.length !== 1)
    errors.push(`${at}: one of max, min, sum (a value of the members) or count: true`)
  for (const k of ['max', 'min', 'sum'] as const)
    if (from[k] !== undefined && (typeof from[k] !== 'string' || !from[k]))
      errors.push(`${at}.${k}: the id of a value of the members' sheet`)
  if (from.count !== undefined && from.count !== true) errors.push(`${at}.count: true`)
  if (from.none !== undefined && typeof from.none !== 'number') errors.push(`${at}.none: a number`)
  for (const k of ['when', 'unless'] as const)
    if (from[k] !== undefined) errors.push(...validateCondition(from[k], `${at}.${k}`))
  for (const k of Object.keys(from))
    if (!['max', 'min', 'sum', 'count', 'when', 'unless', 'none'].includes(k))
      errors.push(`${at}: unknown key "${k}"`)
  return errors
}

/** The party value `from` makes of these members. */
export function partyValue(members: CharacterState[], from: PartyFrom): number {
  const counted = members.filter((m) => {
    const seen = characterFacts(m)
    return matches(from.when, seen) && !(from.unless && matches(from.unless, seen))
  })
  if (from.count) return counted.length
  const id = from.max ?? from.min ?? from.sum
  if (id === undefined || !counted.length) return from.none ?? 0
  const numbers = counted.map((m) => m.values[id] ?? 0)
  if (from.sum !== undefined) return numbers.reduce((a, b) => a + b, 0)
  return from.max !== undefined ? Math.max(...numbers) : Math.min(...numbers)
}

/**
 * How a change to something the members carry between them is shared out: `even` takes
 * from whoever has most and gives to whoever has least, a unit at a time; `order` takes
 * from (and gives to) the first member first, as far as its bounds let it.
 */
export type Share = 'even' | 'order'

/**
 * The members after the party's `value` changed by `delta` (what they carry between them),
 * each within its own bounds; what no member can take stays undone (`left`).
 */
export function shareChange(
  sheets: (state: CharacterState) => Sheet | undefined,
  members: CharacterState[],
  value: string,
  delta: number,
  share: Share = 'even',
): { members: CharacterState[]; events: CharacterEvent[]; left: number } {
  const out = members.map((m) => ({ ...m, values: { ...m.values } }))
  const room = (m: CharacterState, up: boolean): number => {
    const sheet = sheets(m)
    const bounds = sheet ? boundsOf(sheet, m, value) : {}
    const now = m.values[value] ?? 0
    const limit = up ? bounds.max : bounds.min
    return limit === undefined ? Infinity : Math.max(0, up ? limit - now : now - limit)
  }
  const up = delta > 0
  let left = Math.abs(delta)
  if (share === 'order') {
    for (const m of out) {
      if (left <= 0) break
      const moved = Math.min(left, room(m, up))
      m.values[value] = (m.values[value] ?? 0) + (up ? moved : -moved)
      left -= moved
    }
  } else {
    while (left > 0) {
      const open = out.filter((m) => room(m, up) > 0)
      if (!open.length) break
      // Taking: whoever has most; giving: whoever has least (the first of equals).
      const pick = open.reduce((best, m) =>
        up
          ? (m.values[value] ?? 0) < (best.values[value] ?? 0)
            ? m
            : best
          : (m.values[value] ?? 0) > (best.values[value] ?? 0)
            ? m
            : best,
      )
      const moved = Math.min(left, 1, room(pick, up))
      pick.values[value] = (pick.values[value] ?? 0) + (up ? moved : -moved)
      left -= moved
    }
  }
  const events: CharacterEvent[] = []
  out.forEach((m, i) => {
    const from = members[i].values[value] ?? 0
    const to = m.values[value] ?? 0
    if (to !== from) events.push({ type: 'VALUE_CHANGED', character: m.id, value, from, to })
  })
  return { members: out, events, left }
}

/**
 * What the members' conditions block for the party (`blocks` on the sheet): each thing
 * blocked (an action's id, `travel`, `mode.<id>`) with the first member's condition that
 * blocks it.
 */
export function membersBlock(
  sheets: (state: CharacterState) => Sheet | undefined,
  members: CharacterState[],
): Record<string, { value: string; who: string }> {
  const out: Record<string, { value: string; who: string }> = {}
  for (const m of members) {
    const sheet = sheets(m)
    if (!sheet) continue
    for (const id of Object.keys(m.conditions))
      for (const what of sheet.conditions[id]?.blocks ?? []) out[what] ??= { value: id, who: m.id }
  }
  return out
}
