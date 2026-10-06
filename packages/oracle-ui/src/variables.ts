import type { Compiled, EntryList, Ref, Registry } from '@open-tabletop/oracle-engine'

/** A context variable a definition (or anything it delegates to) reads. */
export interface Variable {
  name: string
  /** Values seen in conditions, offered as suggestions. */
  suggestions: string[]
}

const TEMPLATE = /\{\{\s*([\w.]+)\s*\}\}/g
const DICE = /^\d*d(\d+|%|f)(k[hl]\d*)?$/i
const OPERATORS = new Set(['all', 'any', 'not'])
const COMPARISONS = new Set(['eq', 'not', 'in', 'gt', 'gte', 'lt', 'lte', 'exists'])

/**
 * Collects the context variables used by a definition: roll and reference templates
 * ("{{season}}") and condition keys ("when: { terrain: forest }"), following static
 * references. Values the definition sets itself (generator fields, `set`) are left out.
 */
export function contextVariables(registry: Registry, id: string): Variable[] {
  const used = new Map<string, Set<string>>()
  const produced = new Set<string>()
  const visited = new Set<string>()
  const use = (name: string) => {
    if (!used.has(name)) used.set(name, new Set())
    return used.get(name)!
  }
  const scanText = (text: unknown) => {
    if (typeof text !== 'string') return
    // Inline dice ({{2d6}}) are rolled, not asked for.
    for (const m of text.matchAll(TEMPLATE)) if (!DICE.test(m[1])) use(m[1])
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
    scanText(list.roll)
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
          scanText(field.roll)
          scanCondition(field.when)
          follow(field.ref)
          for (const value of Object.values(field.context ?? {})) scanText(value)
          if (typeof field.value === 'string') scanText(field.value)
          produced.add(field.name)
        }
        break
      case 'deck':
        for (const card of def.cards) follow(card.ref)
        break
    }
  }
  visit(registry.definitions.get(id))
  return (
    [...used]
      // Dotted names (token.fare, who.text) are produced when their root is.
      .filter(([name]) => !produced.has(name.split('.')[0]))
      .map(([name, values]) => ({ name, suggestions: [...values].sort() }))
      .sort((a, b) => a.name.localeCompare(b.name))
  )
}

/** Turns typed input into context values: numbers and booleans are parsed, blanks dropped. */
export function parseContext(raw: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(raw)) {
    const v = value.trim()
    if (!v) continue
    const parsed = /^-?\d+(\.\d+)?$/.test(v)
      ? Number(v)
      : v === 'true' || v === 'false'
        ? v === 'true'
        : v
    // Dotted names nest: token.fare → { token: { fare } }, as the host's values come.
    const path = key.split('.')
    let node = out
    for (const part of path.slice(0, -1)) {
      if (typeof node[part] !== 'object' || node[part] === null) node[part] = {}
      node = node[part] as Record<string, unknown>
    }
    node[path.at(-1)!] = parsed
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
