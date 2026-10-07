import type { Compiled, Registry } from '@open-tabletop/oracle-engine'
import { availableActions, declaredValues, genericTravelRules } from '@open-tabletop/travel-engine'
import { travelSystems } from './trip'

const CONDITION_OPERATORS = new Set(['all', 'any', 'not'])
const COMPARISONS = new Set(['eq', 'not', 'in', 'gt', 'gte', 'lt', 'lte', 'exists'])

/**
 * Every name a table or a travel check can read, with the values it's known to take, for
 * suggestions while typing conditions, values and context. It gathers what the map and
 * trips provide (terrains, seasons, weather, modes, roads, the party) and what the loaded
 * packs use in their conditions, `set` values and bindings. `extra` adds the host's own
 * (a map's field keys and values, its tags…).
 */
export function contextSuggestions(
  registry: Registry,
  extra: Record<string, readonly string[]> = {},
  /** Leave out what entries set (only what tables read). */
  { reads = false }: { reads?: boolean } = {},
): Record<string, string[]> {
  const out = new Map<string, Set<string>>()
  const add = (key: string, ...values: unknown[]) => {
    if (!key) return
    if (!out.has(key)) out.set(key, new Set())
    for (const v of values)
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')
        out.get(key)!.add(String(v))
  }

  // What the map and a trip always give.
  add('hex')
  add('name')
  add('region')
  add('icon.id')
  add('token.name')
  add('token.kind', 'pc', 'npc', 'enemy', 'party')
  add('water', true, false)
  add('season', 'spring', 'summer', 'autumn', 'winter')
  add('day')
  // What hit its minimum or maximum today (its id), and whether the day ended in camp.
  add('below')
  add('above')
  add('camping', true, false)
  add('edges', 'road', 'trail', 'river')
  add('terrain', ...Object.keys(genericTravelRules.terrains))
  add('tags')
  add('weather')
  add('mode')

  add('party.mode')

  const { systems } = travelSystems(registry)
  for (const { rules, bindings, calendar } of systems) {
    if (calendar) {
      const def = calendar.def
      add('month', ...def.months.map((m) => m.id))
      add('year')
      add('weekday', ...(def.weekdays ?? []).map((w) => w.id))
      for (const moon of def.moons ?? []) add(`moons.${moon.id}`, 'new', 'waxing', 'full', 'waning')
      add('holidays', ...(def.holidays ?? []).map((h) => h.id))
      add('season', ...def.months.flatMap((m) => (m.season ? [m.season] : [])))
    }
    add('terrain', ...Object.keys(rules.terrains))
    add('weather', ...Object.keys(rules.weather ?? {}))
    add('mode', ...Object.keys(rules.modes))
    add('party.mode', ...Object.keys(rules.modes))
    add('edges', ...Object.keys(rules.edges ?? {}))
    for (const resource of Object.keys(rules.resources ?? {})) {
      add(`party.resources.${resource}`)
      add('below', resource)
      add('above', resource)
    }
    for (const stat of Object.keys(bindings?.stats ?? {})) {
      add('below', stat)
      add('above', stat)
    }
    for (const check of rules.checks ?? []) {
      condition(check.when, add)
      condition(check.unless, add)
    }
    // The values of the day it declares (lost…), today and the day after.
    for (const value of Object.keys(declaredValues(rules))) {
      add(value, true, false)
      add(`yesterday.${value}`, true, false)
    }
    for (const action of Object.values(availableActions(rules).all)) {
      condition(action.when, add)
      condition(action.unless, add)
    }
    for (const stat of Object.keys(bindings?.stats ?? {})) {
      add(stat)
      add(`party.stats.${stat}`)
    }
    for (const binding of Object.values(bindings?.on ?? {}))
      for (const [key, value] of Object.entries(binding.context ?? {})) add(key, value)
  }

  for (const def of registry.definitions.values()) definition(def, add, reads ? () => {} : add)
  for (const [key, values] of Object.entries(extra)) add(key, ...values)
  return Object.fromEntries([...out].map(([key, values]) => [key, [...values].sort()]))
}

type Add = (key: string, ...values: unknown[]) => void

const TEMPLATE = /\{\{\s*([\w.]+)\s*\}\}/g
const DICE = /^\d*d(\d+|%|f)(k[hl]\d*)?$/i

/** Names read in `{{…}}` templates (dice, and `result`: what was rolled next, left out). */
function templates(text: string | undefined, add: Add): void {
  for (const m of (text ?? '').matchAll(TEMPLATE))
    if (!DICE.test(m[1]) && m[1] !== 'result' && !m[1].startsWith('result.')) add(m[1])
}

/** What a definition reads (conditions, templates) and, through `set`, what it gives. */
function definition(def: Compiled, add: Add, addSet: Add): void {
  const lists =
    def.kind === 'table' ? [def] : def.kind === 'oracle' ? Object.values(def.variants) : []
  for (const list of lists) {
    templates(list.roll, add)
    for (const entry of list.entries) {
      condition(entry.when, add)
      templates(entry.result, add)
      values(entry.set, addSet)
    }
  }
  if (def.kind === 'oracle')
    for (const [input, spec] of Object.entries(def.inputs)) addSet(input, ...spec.options)
  if (def.kind === 'generator')
    for (const field of def.fields) {
      condition(field.when, add)
      templates(field.roll, add)
      if (typeof field.value === 'string') templates(field.value, add)
      values(field.context, addSet)
    }
  if (def.kind === 'deck') for (const card of def.cards) values(card.set, addSet)
}

/** Keys and plain values of a condition, through all / any / not and comparisons. */
function condition(cond: unknown, add: Add): void {
  if (typeof cond !== 'object' || cond === null) return
  for (const [key, matcher] of Object.entries(cond as Record<string, unknown>)) {
    if (CONDITION_OPERATORS.has(key) && typeof matcher === 'object' && matcher !== null) {
      const isComparison = Object.keys(matcher).every((k) => COMPARISONS.has(k))
      if (key !== 'not' || !isComparison) {
        for (const sub of Array.isArray(matcher) ? matcher : [matcher]) condition(sub, add)
        continue
      }
    }
    if (Array.isArray(matcher)) add(key, ...matcher)
    else if (typeof matcher === 'object' && matcher !== null)
      for (const [op, v] of Object.entries(matcher))
        if (op !== 'exists') add(key, ...(Array.isArray(v) ? v : [v]))
        else add(key)
    else add(key, matcher)
  }
}

/** `set` and context values: their keys (nested ones dotted) and plain values. */
function values(record: Record<string, unknown> | undefined, add: Add, prefix = ''): void {
  for (const [key, value] of Object.entries(record ?? {})) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value))
      values(value as Record<string, unknown>, add, `${prefix}${key}.`)
    else if (typeof value === 'string' && value.includes('{{')) add(`${prefix}${key}`)
    else add(`${prefix}${key}`, ...(Array.isArray(value) ? value : [value]))
  }
}

/**
 * Names an entry can set (`set: { … }`), with known values: what trips understand (lost,
 * weather, fatigue, resources, stats), what discovery reads (terrain, tags, name, poi) and
 * what the loaded packs already set. Nested ones are dotted (resources.food).
 */
export function setSuggestions(registry: Registry): Record<string, string[]> {
  const out = new Map<string, Set<string>>()
  const add: Add = (key, ...values) => {
    if (!key) return
    if (!out.has(key)) out.set(key, new Set())
    for (const v of values)
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')
        out.get(key)!.add(String(v))
  }
  add('weather')
  add('terrain', ...Object.keys(genericTravelRules.terrains))
  add('tags')
  add('name')
  add('poi', false)
  const { systems } = travelSystems(registry)
  for (const { rules, bindings } of systems) {
    add('weather', ...Object.keys(rules.weather ?? {}))
    add('terrain', ...Object.keys(rules.terrains))
    for (const value of Object.keys(declaredValues(rules))) add(value, true)
    for (const resource of Object.keys(rules.resources ?? {})) add(`resources.${resource}`)
    for (const stat of Object.keys(bindings?.stats ?? {})) add(`stats.${stat}`)
  }
  for (const def of registry.definitions.values()) {
    const entries =
      def.kind === 'table'
        ? def.entries
        : def.kind === 'oracle'
          ? Object.values(def.variants).flatMap((v) => v.entries)
          : def.kind === 'deck'
            ? def.cards
            : []
    for (const entry of entries) values(entry.set, add)
  }
  return Object.fromEntries([...out].map(([key, values]) => [key, [...values].sort()]))
}

/**
 * Paths effects can change (`effects: { party.stats.morale: -1 }`): the party's declared
 * stats and its supplies, in every loaded system.
 */
export function effectSuggestions(registry: Registry): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const { rules, bindings } of travelSystems(registry).systems) {
    for (const stat of Object.keys(bindings?.stats ?? {})) out[`party.stats.${stat}`] = []
    for (const resource of Object.keys(rules.resources ?? {}))
      out[`party.resources.${resource}`] = []
  }
  return out
}
