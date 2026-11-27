import { isDiceTerm } from '@open-tabletop/dice'
import { namesIn } from '@open-tabletop/variables'
import type { Compiled, EntryList, Ref, Registry } from '@open-tabletop/oracle-engine'

/** A context variable a definition (or anything it delegates to) reads. */
export interface Variable {
  name: string
  /** Values seen in conditions, offered as suggestions. */
  suggestions: string[]
  /**
   * Read by a roll (a die's size `1d{{…}}`, a modifier, the number it's rolled against):
   * without it the roll can't be made, so the Oracle asks for it before rolling.
   */
  needed?: true
}

const TEMPLATE = /\{\{\s*([\w.]+)\s*\}\}/g
const OPERATORS = new Set(['all', 'any', 'not'])
const COMPARISONS = new Set(['eq', 'not', 'in', 'gt', 'gte', 'lt', 'lte', 'exists'])

/**
 * Collects the context variables used by a definition: roll and reference templates
 * ("{{season}}") and condition keys ("when: { terrain: forest }"), following static
 * references. Values the definition sets itself (generator fields, `set`) are left out.
 */
export function contextVariables(registry: Registry, id: string): Variable[] {
  const used = new Map<string, Set<string>>()
  const needed = new Set<string>()
  const produced = new Set<string>()
  const visited = new Set<string>()
  const use = (name: string) => {
    if (!used.has(name)) used.set(name, new Set())
    return used.get(name)!
  }
  const scanText = (text: unknown) => {
    if (typeof text !== 'string') return
    // Inline dice ({{2d6}}) are rolled, not asked for.
    for (const m of text.matchAll(TEMPLATE)) if (!isDiceTerm(m[1])) use(m[1])
  }
  /**
   * A roll, or the number it's rolled against: every name it reads, even worked out
   * (`1d{{max(map.values.finds, 4)}}`, `{{strength + 2}}`), is needed to roll it.
   */
  const scanRoll = (text: unknown) => {
    if (typeof text !== 'string') return
    for (const m of text.matchAll(/\{\{([^}]*)\}\}/g))
      for (const name of namesIn(m[1]!)) {
        use(name)
        needed.add(name)
      }
  }
  const scanCondition = (cond: unknown): void => {
    if (typeof cond !== 'object' || cond === null) return
    for (const [key, value] of Object.entries(cond as Record<string, unknown>)) {
      if (OPERATORS.has(key)) {
        for (const sub of Array.isArray(value) ? value : [value]) scanCondition(sub)
        continue
      }
      const set = use(key)
      const add = (v: unknown) => {
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')
          set.add(String(v))
      }
      if (Array.isArray(value)) value.forEach(add)
      else if (typeof value === 'object' && value !== null) {
        for (const [op, v] of Object.entries(value))
          if (COMPARISONS.has(op)) (Array.isArray(v) ? v : [v]).forEach(add)
      } else add(value)
    }
  }
  const follow = (ref: Ref | undefined) => {
    if (!ref) return
    if (ref.dynamic) scanText(ref.target)
    else visit(registry.definitions.get(ref.target))
  }
  const entries = (list: EntryList) => {
    scanRoll(list.roll)
    // A list with a roll gives its entries its total as `roll`, and what its dice show; one
    // rolled against a number, how it went (`against.*`), the number read from the context.
    if (list.roll) produced.add('roll').add('dice')
    if (list.against) {
      scanRoll(String(list.against.value))
      produced.add('against')
    }
    for (const e of list.entries) {
      scanCondition(e.when)
      follow(e.ref)
      for (const key of Object.keys(e.set ?? {})) produced.add(key)
    }
  }
  const visit = (def: Compiled | undefined): void => {
    if (!def || visited.has(def.id)) return
    visited.add(def.id)
    switch (def.kind) {
      case 'table':
        entries(def)
        break
      case 'oracle':
        for (const name of Object.keys(def.inputs)) produced.add(name)
        for (const variant of Object.values(def.variants)) entries(variant)
        break
      case 'generator':
        for (const field of def.fields) {
          scanRoll(field.roll)
          scanCondition(field.when)
          follow(field.ref)
          for (const value of Object.values(field.context ?? {})) scanText(value)
          if (typeof field.value === 'string') scanText(field.value)
          produced.add(field.name)
        }
        break
      case 'deck':
        for (const card of def.cards) {
          follow(card.ref)
          for (const key of Object.keys(card.set ?? {})) produced.add(key)
        }
        // A reversible deck's card says which way up it came, for what it leads to.
        if (def.reversible !== undefined) produced.add('reversed')
        break
    }
  }
  visit(registry.definitions.get(id))
  return (
    [...used]
      // Dotted names (token.fare, who.text) are produced when their root is.
      .filter(([name]) => !produced.has(name.split('.')[0]))
      // A whole object (party) is asked for through its values (party.stats.morale).
      .filter(([name]) => ![...used.keys()].some((other) => other.startsWith(`${name}.`)))
      .map(([name, values]) => ({
        name,
        suggestions: [...values].sort(),
        ...(needed.has(name) && { needed: true as const }),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  )
}

/** What a part named by another value stands for when only the whole was typed. */
const STAND_IN = 'typed'

/**
 * Turns typed input into context values: numbers and booleans are parsed, blanks dropped.
 * A name with a part named by another (`acting.items[params.piece].wear`, as a roll reads it)
 * is given whole: the part's name takes a stand-in, unless it was typed too.
 */
export function parseContext(raw: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const entries = Object.entries(raw)
  // Plain names first, so a part typed by itself (`params.piece`) names the whole's.
  entries.sort(([a], [b]) => Number(a.includes('[')) - Number(b.includes('[')))
  const put = (key: string, parsed: unknown) => {
    const path = key.split('.')
    let node = out
    for (const part of path.slice(0, -1)) {
      if (typeof node[part] !== 'object' || node[part] === null) node[part] = {}
      node = node[part] as Record<string, unknown>
    }
    node[path.at(-1)!] = parsed
  }
  for (const [key, value] of entries) {
    const v = value.trim()
    if (!v) continue
    const parsed = /^-?\d+(\.\d+)?$/.test(v)
      ? Number(v)
      : v === 'true' || v === 'false'
        ? v === 'true'
        : v
    // Dotted names nest: token.fare → { token: { fare } }, as the host's values come.
    const named = key.replace(/\[([^\]]+)\]/g, (_, inner: string) => {
      const part = valueAt(out, inner.trim())
      if (typeof part === 'string' || typeof part === 'number') return `.${part}`
      put(inner.trim(), STAND_IN)
      return `.${STAND_IN}`
    })
    put(named, parsed)
  }
  return out
}

/** The host's values with the typed ones on top; nested objects (token, icon…) merge. */
export function mergeContext(
  host: Record<string, unknown>,
  typed: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...host }
  for (const [key, value] of Object.entries(typed)) {
    const base = out[key]
    out[key] =
      isPlain(value) && isPlain(base)
        ? mergeContext(base as Record<string, unknown>, value as Record<string, unknown>)
        : value
  }
  return out
}

const isPlain = (v: unknown) => typeof v === 'object' && v !== null && !Array.isArray(v)

/** A value at a dotted path (token.fare). */
export function valueAt(context: Record<string, unknown>, path: string): unknown {
  let node: unknown = context
  for (const part of path.split('.')) node = (node as Record<string, unknown> | undefined)?.[part]
  return node
}
