/**
 * Character sheets as data. A system's pack declares a sheet (`kind: sheet`): the values a
 * character has (with the bounds the system gives them, or none), how each is shown, the conditions a character may have (and what they block), and the kinds of
 * relation it may hold. This engine creates characters from a sheet, changes them within
 * their bounds and says what conditions and tables read of them. It knows no game.
 *
 * Some parts hold by themselves: a value made of others (`from:`) and a condition that
 * holds while its `when` does. Neither is written by hand or by effects; the engine settles
 * them after every change (`settleCharacter`), so whoever reads a character sees them.
 *
 * Pure functions: `(sheet, state, action) → { state, events }`; nothing here touches storage
 * or the UI, and rolls come from the roller the caller gives.
 */
import {
  changeValue,
  evaluate,
  lookupIn,
  namesIn,
  resolveChange,
  rollsIn,
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
/**
 * A bound: a number, or the sheet's own values in `{{…}}` (`'{{self.values.maxHealth}}'`,
 * `'{{self.values.might * 2}}'`).
 */
const bound = z.union([z.number(), z.string().min(1)])

/**
 * How a number is shown: as itself (`number`, the default), with its max (`of`: `3 / 5`),
 * as a bar filled to its max, as boxes (stress, a vow's progress), rating dots (`pips`), a
 * round segmented clock (`dial`) or the name of one of the sheet's `levels`.
 */
export const DISPLAYS = ['number', 'of', 'bar', 'boxes', 'pips', 'dial', 'levels'] as const
export type Display = (typeof DISPLAYS)[number]
/** The displays drawn up to a max, which the value must have. */
export const DISPLAYS_WITH_MAX: readonly Display[] = ['of', 'bar', 'boxes', 'pips', 'dial']
/** The theme's tones a value may take (never free colours, so they read in every theme). */
export const TONES = ['good', 'warning', 'danger', 'accent'] as const
export type Tone = (typeof TONES)[number]

/** A named level: an id (its name made readable, `d8`), or one with a name and a description. */
const level = z.union([
  z.string().min(1),
  z.object({ id: z.string().min(1), name: text.optional(), description: text.optional() }).strict(),
])
/** How a number looks: its display, its levels and its tones from a value up (`{ 0: danger, 50%: good }`). */
const looks = {
  display: z.enum(DISPLAYS).optional(),
  /** With `display: levels`, the names the value picks, from its min (or 0) up. */
  levels: z.array(level).min(1).optional(),
  /**
   * A tone from each value up: `{ 0: danger, 2: warning, 4: good }`, or from a share of its
   * max (`{ 0: danger, 50%: warning, 75%: good }`), which follows a max that changes.
   */
  tones: z
    .record(
      z.string().regex(/^-?\d+%?$/, 'a whole number, or a share of its max (50%)'),
      z.enum(TONES),
    )
    .optional(),
}

const value = z
  .object({
    name: text.optional(),
    description: text.optional(),
    default: z.number().optional(),
    /**
     * Made of the sheet's other values, never set (`'{{self.values.might * 2 + 4}}'`): kept
     * up to date after every change, within its bounds.
     */
    from: z.string().min(1).optional(),
    min: bound.optional(),
    max: bound.optional(),
    ...looks,
    /** Shown as boxes, `max` of them: the older form of `display: boxes`. */
    track: z.boolean().optional(),
    /** A heading the value is shown under (attributes, meters…); nothing else. */
    group: z.string().optional(),
  })
  .strict()

const condition = z
  .object({
    name: text.optional(),
    description: text.optional(),
    /** What it stops while a character has it: `actions.<id>`, `travel.move`, `modes.<id>`… */
    blocks: z.array(z.string().min(1)).optional(),
    /**
     * Holds by itself while this is true, never set by hand or by effects: the character as
     * `self.*` (`self.values.dread: { gte: 6 }`), and the world where there is one.
     */
    when: z
      .custom<Condition>((v) => typeof v === 'object' && v !== null && !Array.isArray(v), {
        message: 'a condition',
      })
      .optional(),
  })
  .strict()

const relation = z
  .object({
    name: text.optional(),
    description: text.optional(),
    /** A relation of this kind carries a number (Hx, strings, a bond's progress), with bounds. */
    value: z
      .object({ min: z.number().optional(), max: z.number().optional(), ...looks })
      .strict()
      .optional(),
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
      if (typeof b === 'string')
        errors.push(
          ...ownErrors(sheet, b, `values.${id}.${key}`, "a number or '{{self.values.<id>}}'"),
        )
    }
    if (v.from !== undefined) {
      errors.push(
        ...ownErrors(
          sheet,
          v.from,
          `values.${id}.from`,
          "the sheet's values in '{{…}}' ('{{self.values.might * 2}}')",
        ),
      )
      if (v.default !== undefined)
        errors.push(`values.${id}.default: not with from (it is made of other values)`)
    }
    errors.push(...looksErrors(v, `values.${id}`))
  }
  const loop = fromCycle(sheet)
  if (loop) errors.push(`values.${loop[0]}.from: made of itself (${loop.join(' → ')})`)
  for (const [id, r] of Object.entries(sheet.relations))
    if (r.value) errors.push(...looksErrors(r.value, `relations.${id}.value`))
  for (const [id, v] of Object.entries(sheet.values))
    if (sheet.groups && v.group !== undefined && !(v.group in sheet.groups))
      errors.push(`values.${id}.group: no group "${v.group}" in groups`)
  for (const [id, c] of Object.entries(sheet.conditions)) {
    if (c.blocks?.some((b) => !b.trim())) errors.push(`conditions.${id}.blocks: empty entry`)
    if (c.when !== undefined) errors.push(...validateCondition(c.when, `conditions.${id}.when`))
  }
  return errors.length ? { errors } : { sheet, errors }
}

/**
 * What's wrong with a text that reads the sheet's own values (a bound, a `from`): a whole
 * `{{…}}`, no dice, and only `self.values.<id>` of this sheet.
 */
function ownErrors(sheet: Sheet, written: string, at: string, expected: string): string[] {
  const expression = variableOf(written)
  if (expression === undefined) return [`${at}: ${expected}`]
  if (rollsIn(expression)) return [`${at}: no dice (it would change each time it's read)`]
  const errors: string[] = []
  for (const name of namesIn(expression)) {
    const own = name.match(/^self\.values\.(.+)$/)?.[1]
    if (own === undefined)
      errors.push(
        `${at}: another value of this sheet is '{{self.values.<id>}}'${name in sheet.values ? ` (did you mean '{{self.values.${name}}}'?)` : ''}`,
      )
    else if (!(own in sheet.values)) errors.push(`${at}: no value "${own}" on this sheet`)
  }
  return errors
}

/** The values a value is made of (`from`), by id. */
function fromNames(def: SheetValue): string[] {
  const expression = def.from === undefined ? undefined : variableOf(def.from)
  if (expression === undefined) return []
  return namesIn(expression).flatMap((n) => n.match(/^self\.values\.(.+)$/)?.[1] ?? [])
}

/** A value made of itself, through others (`a → b → a`), if any. */
function fromCycle(sheet: Sheet): string[] | undefined {
  const state: Record<string, 'open' | 'done'> = {}
  const visit = (id: string, path: string[]): string[] | undefined => {
    if (state[id] === 'done') return undefined
    if (state[id] === 'open') return [...path.slice(path.indexOf(id)), id]
    state[id] = 'open'
    const def = sheet.values[id]
    for (const next of def ? fromNames(def) : []) {
      const loop = visit(next, [...path, id])
      if (loop) return loop
    }
    state[id] = 'done'
    return undefined
  }
  for (const id of Object.keys(sheet.values)) {
    const loop = visit(id, [])
    if (loop) return loop
  }
  return undefined
}

/** The values made of others, each after the ones it's made of. */
function fromOrder(sheet: Sheet): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  const visit = (id: string, depth: number) => {
    if (seen.has(id) || depth > Object.keys(sheet.values).length) return
    seen.add(id)
    const def = sheet.values[id]
    if (!def?.from) return
    for (const next of fromNames(def)) visit(next, depth + 1)
    out.push(id)
  }
  for (const id of Object.keys(sheet.values)) visit(id, 0)
  return out
}

/** A text of the sheet's own values as it reads now (a bound, a `from`), if a number. */
function readOwn(written: string, values: Record<string, number>): number | undefined {
  const n = evaluate(written, lookupIn({ self: { values } }))
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined
}

/** Whether a value is made of others (`from`), so nothing writes it. */
export const isMadeOf = (sheet: Sheet, id: string): boolean => sheet.values[id]?.from !== undefined

/** Whether a condition holds by itself (`when`), so nothing sets or clears it. */
export const holdsByItself = (sheet: Sheet, id: string): boolean =>
  sheet.conditions[id]?.when !== undefined

/**
 * Whether a condition that holds by itself reads the world (anything but `self.*`): it's
 * settled only where there's a world, and stays as last seen elsewhere.
 */
export function readsWorld(sheet: Sheet, id: string): boolean {
  const when = sheet.conditions[id]?.when
  return when !== undefined && conditionNames(when).some((n) => !/^self(\.|$)/.test(n))
}

/** Every name a condition reads: its keys and the `{{…}}` it compares with. */
function conditionNames(condition: unknown): string[] {
  if (typeof condition !== 'object' || condition === null) return []
  const out: string[] = []
  const texts = (v: unknown): void => {
    if (typeof v === 'string') {
      for (const m of v.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)) out.push(...namesIn(m[1]))
    } else if (Array.isArray(v)) v.forEach(texts)
    else if (typeof v === 'object' && v !== null) Object.values(v).forEach(texts)
  }
  for (const [key, value] of Object.entries(condition)) {
    if ((key === 'all' || key === 'any') && Array.isArray(value))
      value.forEach((c) => out.push(...conditionNames(c)))
    else if (key === 'not' && typeof value === 'object' && value !== null && !isComparison(value))
      out.push(...conditionNames(value))
    else {
      out.push(key)
      texts(value)
    }
  }
  return out
}

const COMPARISONS = ['eq', 'not', 'in', 'gt', 'gte', 'lt', 'lte', 'exists']
const isComparison = (v: object): boolean =>
  !Array.isArray(v) && Object.keys(v).some((k) => COMPARISONS.includes(k))

/** How a value of a sheet (or a relation's number) is shown; `track: true` is `boxes`. */
export function displayOf(def: { display?: Display; track?: boolean }): Display {
  return def.display ?? (def.track ? 'boxes' : 'number')
}

/**
 * The tone of a value from the `tones` it declares (the one of the highest threshold at or
 * under it), or none. A threshold written as a share (`50%`) is that share of its `max`
 * now; without a max it counts for nothing.
 */
export function toneOf(
  tones: Record<string, Tone> | undefined,
  value: number,
  max?: number,
): Tone | undefined {
  let best: { at: number; tone: Tone } | undefined
  for (const [key, tone] of Object.entries(tones ?? {})) {
    const at = key.endsWith('%')
      ? max === undefined
        ? undefined
        : (Number(key.slice(0, -1)) / 100) * max
      : Number(key)
    if (at !== undefined && at <= value && (!best || at > best.at)) best = { at, tone }
  }
  return best?.tone
}

/** The id of a named level, written alone or with its name. */
export const levelId = (level: string | { id: string }): string =>
  typeof level === 'string' ? level : level.id

/** What's wrong with how a value says it's shown. */
function looksErrors(
  v: {
    display?: Display
    track?: boolean
    max?: unknown
    tones?: Record<string, Tone>
    levels?: (string | { id: string })[]
  },
  at: string,
): string[] {
  const errors: string[] = []
  const display = displayOf(v)
  if (v.track && v.display && v.display !== 'boxes')
    errors.push(`${at}: track: true is display: boxes, not ${v.display}`)
  if (DISPLAYS_WITH_MAX.includes(display) && v.max === undefined)
    errors.push(`${at}: display: ${display} needs a max`)
  if (v.max === undefined && Object.keys(v.tones ?? {}).some((k) => k.endsWith('%')))
    errors.push(`${at}.tones: a share (50%) needs a max`)
  if (display === 'levels' && !v.levels) errors.push(`${at}: display: levels needs its levels`)
  if (v.levels && display !== 'levels') errors.push(`${at}.levels: only with display: levels`)
  const ids = (v.levels ?? []).map(levelId)
  const twice = ids.find((id, i) => ids.indexOf(id) !== i)
  if (twice) errors.push(`${at}.levels: "${twice}" twice`)
  return errors
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
  const made: CharacterState = {
    sheet: sheetId,
    conditions: {},
    tags: [],
    cards: [],
    relations: [],
    ...init,
    values: { ...values, ...init.values },
  }
  settle(sheet, made, [], {})
  return made
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
  /** An effect on a value made of others or a condition that holds by itself: not done. */
  | { type: 'NOT_WRITABLE'; character: string; path: string }

export interface ApplyOptions {
  /** Rolls the dice an effect names (`'-{{1d3}}'`); none: a roll changes nothing. */
  roller?: Roller
  /** More values variables may name, besides the character's own facts. */
  context?: Record<string, unknown>
  /**
   * The world conditions that hold by themselves may read (`time.season`, `trip.mode`…);
   * none: those that read it stay as they were, and only the character's own are settled.
   */
  world?: Record<string, unknown>
}

/** The value of the same sheet a bound names (`'{{self.values.maxHealth}}'` → `maxHealth`). */
export function ownValue(bound: unknown): string | undefined {
  return variableOf(bound)?.match(/^self\.values\.(.+)$/)?.[1]
}

/** The bounds of a value now: its numbers, or the values its variables name. */
export function boundsOf(sheet: Sheet, state: CharacterState, id: string): Bounds {
  const def = sheet.values[id]
  if (!def) return {}
  const read = (b: number | string | undefined): number | undefined =>
    typeof b === 'number' ? b : b === undefined ? undefined : readOwn(b, state.values)
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
        if (
          (scope === 'conditions' && holdsByItself(sheet, id)) ||
          (scope === 'values' && isMadeOf(sheet, id))
        ) {
          events.push({ type: 'NOT_WRITABLE', character: who, path })
          continue
        }
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
  settle(sheet, state, events, {
    world: options.world,
    time: action.type === 'change' ? action.time : undefined,
  })
  return { state, events }
}

/**
 * The character with what holds by itself up to date: values made of others (`from`), each
 * value within bounds that may have moved, and conditions that hold while their `when`
 * does (read with the character as `self` and the `world`, if given; without one, those
 * that read the world stay as they were). `time` is when a condition set now began.
 */
export function settleCharacter(
  sheet: Sheet,
  input: CharacterState,
  options: { world?: Record<string, unknown>; time?: number } = {},
): { state: CharacterState; events: CharacterEvent[] } {
  const state = structuredClone(input)
  const events: CharacterEvent[] = []
  settle(sheet, state, events, options)
  return { state, events }
}

/** `settleCharacter` in place. */
function settle(
  sheet: Sheet,
  state: CharacterState,
  events: CharacterEvent[],
  options: { world?: Record<string, unknown>; time?: number },
): void {
  const who = state.id
  const write = (id: string, to: number) => {
    const from = state.values[id] ?? 0
    if (to === from) return
    state.values[id] = to
    events.push({ type: 'VALUE_CHANGED', character: who, value: id, from, to })
  }
  const bounded = () => {
    // A value whose bound is another value (momentum under its max) stays within it.
    for (const id of Object.keys(sheet.values))
      write(id, changeValue(state.values[id] ?? 0, 0, boundsOf(sheet, state, id)).to)
  }
  bounded()
  for (const id of fromOrder(sheet)) {
    const made = readOwn(sheet.values[id].from!, state.values)
    if (made !== undefined) write(id, changeValue(made, 0, boundsOf(sheet, state, id)).to)
  }
  // And what's bounded by a value made of others.
  bounded()
  // Conditions that hold by themselves, again while one of them changes another's say.
  const own = Object.keys(sheet.conditions).filter(
    (id) => holdsByItself(sheet, id) && (options.world !== undefined || !readsWorld(sheet, id)),
  )
  for (let pass = 0; pass <= own.length; pass++) {
    const seen = { ...options.world, self: characterFacts(state) }
    let moved = false
    for (const id of own) {
      const holds = matches(sheet.conditions[id].when, seen)
      if (holds && !state.conditions[id]) {
        state.conditions[id] = options.time !== undefined ? { since: options.time } : {}
        events.push({ type: 'CONDITION_SET', character: who, condition: id })
        moved = true
      } else if (!holds && state.conditions[id]) {
        delete state.conditions[id]
        events.push({ type: 'CONDITION_CLEARED', character: who, condition: id })
        moved = true
      }
    }
    if (!moved) break
  }
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
 * `none` is what it is when no member counts (0 unless the system says otherwise). Or one
 * value of the party's own sheet (`party`), kept in step with it by the integration layer.
 */
export interface PartyFrom {
  /** A value of the party sheet: the stat is that value (`from: { party: morale }`). */
  party?: string
  /**
   * One character's value, the one the player chooses (who rolls); nobody chosen: the best
   * (as `max`). The choice is the integration layer's: `partyValue` takes it as `chosen`.
   */
  pick?: string
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
    return [`${at}: expected { max | min | sum | party: <value> } or { count: true }`]
  const from = raw as Record<string, unknown>
  const errors: string[] = []
  const ways = (['max', 'min', 'sum', 'count', 'party', 'pick'] as const).filter(
    (k) => from[k] !== undefined,
  )
  if (ways.length !== 1)
    errors.push(
      `${at}: one of max, min, sum, pick (a value of the members), count: true, or party (a value of the party sheet)`,
    )
  for (const k of ['max', 'min', 'sum', 'pick'] as const)
    if (from[k] !== undefined && (typeof from[k] !== 'string' || !from[k]))
      errors.push(`${at}.${k}: the id of a value of the members' sheet`)
  if (from.party !== undefined && (typeof from.party !== 'string' || !from.party))
    errors.push(`${at}.party: the id of a value of the party sheet`)
  if (from.party !== undefined)
    for (const k of ['when', 'unless', 'none'] as const)
      if (from[k] !== undefined) errors.push(`${at}.${k}: not with party (it is one value)`)
  if (from.count !== undefined && from.count !== true) errors.push(`${at}.count: true`)
  if (from.none !== undefined && typeof from.none !== 'number') errors.push(`${at}.none: a number`)
  for (const k of ['when', 'unless'] as const)
    if (from[k] !== undefined) errors.push(...validateCondition(from[k], `${at}.${k}`))
  for (const k of Object.keys(from))
    if (!['max', 'min', 'sum', 'count', 'party', 'pick', 'when', 'unless', 'none'].includes(k))
      errors.push(`${at}: unknown key "${k}"`)
  return errors
}

/** The party value `from` makes of these members. */
export function partyValue(
  members: CharacterState[],
  from: PartyFrom,
  /** For `pick`: the member the player chose (absent, or not among them: the best). */
  chosen?: string,
): number {
  return partySource(members, from, chosen).value
}

/**
 * Where a party value comes from, so it can be shown: the value, and the members it was
 * made of. `max`, `min` and `pick` name the member whose value it is (the first of equals);
 * `sum` and `count` every member counted; none when nobody counts (`none`'s value). `chosen`
 * is set when it's the chosen member's (`pick`).
 */
export function partySource(
  members: CharacterState[],
  from: PartyFrom,
  chosen?: string,
): { value: number; members: string[]; chosen?: true } {
  const counted = members.filter((m) => {
    const seen = characterFacts(m)
    return matches(from.when, seen) && !(from.unless && matches(from.unless, seen))
  })
  if (from.count) return { value: counted.length, members: counted.map((m) => m.id) }
  if (from.pick !== undefined) {
    const one = members.find((m) => m.id === chosen)
    if (one) return { value: one.values[from.pick] ?? 0, members: [one.id], chosen: true }
  }
  const id = from.max ?? from.min ?? from.sum ?? from.pick
  if (id === undefined || !counted.length) return { value: from.none ?? 0, members: [] }
  const numbers = counted.map((m) => m.values[id] ?? 0)
  if (from.sum !== undefined)
    return { value: numbers.reduce((a, b) => a + b, 0), members: counted.map((m) => m.id) }
  const value =
    from.max !== undefined || from.pick !== undefined ? Math.max(...numbers) : Math.min(...numbers)
  return { value, members: [counted[numbers.indexOf(value)].id] }
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
  const out = members.map((m) => ({
    ...m,
    values: { ...m.values },
    conditions: { ...m.conditions },
  }))
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
    if (to === from) return
    events.push({ type: 'VALUE_CHANGED', character: m.id, value, from, to })
    // What's made of it, or holds by itself on it, follows.
    const sheet = sheets(m)
    if (sheet) settle(sheet, m, events, {})
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
