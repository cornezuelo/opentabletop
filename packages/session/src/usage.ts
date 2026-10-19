import type { Compiled, CompiledEntry, Registry } from '@open-tabletop/oracle-engine'
import { FACT_PATHS } from '@open-tabletop/travel-engine'
import { isRoll } from '@open-tabletop/variables'
import { systemPackIds, type TravelSystem } from './trip'

/**
 * Where a system's names are used: every place in its packs that reads, changes, sets or
 * derives a name, so the apps can say where a stat, a role, a value… is used ("Used by")
 * and find any name. Design: `docs/used-by.md`.
 */

/**
 * How a place uses a name: `reads` it (a condition, a `{{…}}`), `changes` it (effects),
 * `sets` it (`set`, a value of the day) or `derives` something from it (a stat's `from`, a
 * supply carried by the members).
 */
export type UseHow = 'reads' | 'changes' | 'sets' | 'derives'

/** A place in a system's packs: a definition, and the path inside it. */
export interface UsePlace {
  /** The definition's kind: `travel-rules`, `bindings`, `table`, `sheet`, `clocks`… */
  kind: string
  pack: string
  /** The definition's id in its pack (`getting-lost`, `default`). */
  id: string
  file: string
  /** Where inside it: `actions.march.when`, `modeWhen.advantage`, `entries.bandits.effects`. */
  path: string
}

export interface Use {
  /** The name as written (`morale`, `party.stats.morale`). */
  written: string
  /** Its full name: short names resolved (`morale` → `party.stats.morale`, `weather` → `trip.weather`). */
  name: string
  how: UseHow
  at: UsePlace
  /** In a condition, the values it's compared with (`party.conditions: shaken` → `shaken`). */
  values?: string[]
}

/** What a system declares that others use: the things that get a "Used by". */
export type Declared =
  | { kind: 'stat'; id: string }
  | { kind: 'role'; id: string }
  | { kind: 'supply'; id: string }
  | { kind: 'day-value'; id: string }
  | { kind: 'read'; id: string }
  | { kind: 'clock'; id: string }
  /** A value or condition of one of its sheets: the members', the party's or the factions'. */
  | { kind: 'sheet-value' | 'sheet-condition'; sheet: SheetScope; id: string }

export type SheetScope = 'members' | 'party' | 'factions'

const COMPARISONS = new Set(['eq', 'not', 'in', 'gt', 'gte', 'lt', 'lte', 'exists'])
const TEMPLATE = /\{\{\s*([^}]+?)\s*\}\}/g
/** Names no system declares: an action's parameters, a list's roll. */
const OWN = /^(params\.|roll$)/

/** Every use of a name in the system's packs (its own and those it depends on). */
export function systemUses(registry: Registry, system: TravelSystem): Use[] {
  const out: Use[] = []
  const stats = new Set(Object.keys(system.bindings?.stats ?? {}))
  const fullName = (written: string): string => {
    const name = written.trim()
    if (stats.has(name)) return `party.stats.${name}`
    const [first, ...rest] = name.split('.')
    const full = FACT_PATHS[first]
    return full ? [full, ...rest].join('.') : name
  }

  /** Records uses inside one definition. */
  /**
   * `ownValues`: a sheet's values, read by their short name inside it. `produced`: names the
   * definition gives itself (a generator's fields), not the system's.
   */
  const recorder = (
    at: Omit<UsePlace, 'path'>,
    ownValues: Set<string> = new Set(),
    produced: Set<string> = new Set(),
  ) => {
    const use = (written: string, how: UseHow, path: string, values?: string[]) => {
      if (OWN.test(written.trim()) || produced.has(written.trim().split('.')[0])) return
      // A sheet's own values (`max: '{{maxHealth}}'`, or `'{{values.maxHealth}}'`).
      const own = written.trim().replace(/^values\./, '')
      const name = ownValues.has(own) ? `self.values.${own}` : fullName(written)
      out.push({
        written: written.trim(),
        name,
        how,
        at: { ...at, path },
        ...(values && { values }),
      })
    }
    const text = (value: unknown, path: string) => {
      if (typeof value !== 'string') return
      for (const m of value.matchAll(TEMPLATE)) if (!isRoll(m[1])) use(m[1], 'reads', path)
    }
    /** Every `{{…}}` in any text inside a value. */
    const deep = (value: unknown, path: string): void => {
      if (typeof value === 'string') text(value, path)
      else if (Array.isArray(value)) value.forEach((v, i) => deep(v, `${path}[${i}]`))
      else if (isObject(value)) for (const [k, v] of Object.entries(value)) deep(v, join(path, k))
    }
    const condition = (cond: unknown, path: string, prefix = ''): void => {
      if (!isObject(cond)) return
      for (const [key, value] of Object.entries(cond)) {
        if (key === 'all' || key === 'any') {
          if (Array.isArray(value)) value.forEach((c) => condition(c, path, prefix))
          continue
        }
        if (key === 'not' && isObject(value) && !isComparison(value)) {
          condition(value, path, prefix)
          continue
        }
        use(prefix + key, 'reads', path, compared(value))
        // Variables it's compared with (`lt: '{{party.stats.endurance}}'`), read by the same condition.
        for (const v of Array.isArray(value)
          ? value
          : isObject(value)
            ? Object.values(value)
            : [value])
          for (const w of Array.isArray(v) ? v : [v]) text(w, path)
      }
    }
    const changes = (effects: unknown, path: string) => {
      if (!isObject(effects)) return
      for (const [key, value] of Object.entries(effects)) {
        use(key, 'changes', path)
        text(value, path)
      }
    }
    const sets = (values: unknown, path: string) => {
      if (!isObject(values)) return
      for (const [key, value] of Object.entries(values)) {
        use(key.includes('.') ? key : `today.${key}`, 'sets', path)
        deep(value, path)
      }
    }
    /** Any part of a definition as written: conditions, effects, sets and texts wherever they are. */
    const walk = (node: unknown, path: string): void => {
      if (typeof node === 'string') return text(node, path)
      if (Array.isArray(node)) return node.forEach((v, i) => walk(v, `${path}[${i}]`))
      if (!isObject(node)) return
      for (const [key, value] of Object.entries(node)) {
        const at = join(path, key)
        // A `wait:` step waits for its condition.
        if ((key === 'when' || key === 'unless' || key === 'wait') && isObject(value))
          condition(value, at)
        else if (key === 'effects' && isObject(value)) changes(value, at)
        // A `travel.mode` step changes the way of travelling.
        else if (key === 'travel.mode') {
          use('trip.mode', 'sets', at)
          text(value, at)
        } else if (key === 'set' && isObject(value)) sets(value, at)
        else walk(value, at)
      }
    }
    return { use, text, deep, condition, changes, sets, walk }
  }

  const packs = systemPackIds(system, registry)
  const extra = (kind: string, fullId: string | undefined) => {
    if (!fullId) return undefined
    const [pack, id] = fullId.includes('/') ? fullId.split('/') : [system.pack ?? '', fullId]
    const found = (registry.extras.get(pack) ?? []).find(
      (e) => e.kind === kind && (e.id ?? 'default') === id,
    )
    return found && { pack, id, file: found.file, data: found.data }
  }

  // The travel rules: actions, checks, the day, values of the day…
  const rules = system.sources?.rules
  const rulesDef = rules && extra('travel-rules', `${rules.pack}/${rules.id}`)
  if (rulesDef) recorder({ kind: 'travel-rules', ...place(rulesDef) }).walk(rulesDef.data, '')

  // The bindings: stats made of the members' values, supplies they carry, checks' context.
  const bindings = system.sources?.bindings
  const bindingsDef = bindings && extra('bindings', `${bindings.pack}/${bindings.id}`)
  if (bindingsDef) {
    const r = recorder({ kind: 'bindings', ...place(bindingsDef) })
    const data = bindingsDef.data
    for (const [id, stat] of Object.entries(asObject(data.stats))) {
      const from = asObject(asObject(stat).from)
      const path = `stats.${id}.from`
      for (const how of ['pick', 'max', 'min', 'sum'] as const)
        if (typeof from[how] === 'string')
          r.use(`party.members.values.${from[how]}`, 'derives', path)
      if (typeof from.party === 'string') r.use(`party.values.${from.party}`, 'derives', path)
      // Its conditions are on each member: `{ conditions: wounded }`.
      for (const key of ['when', 'unless'] as const)
        r.condition(from[key], `${path}.${key}`, 'party.members.')
    }
    for (const [id, supply] of Object.entries(asObject(data.resources))) {
      const carried = asObject(supply).carried
      if (typeof carried === 'string')
        r.use(`party.members.values.${carried}`, 'derives', `resources.${id}.carried`)
    }
    // The rest as written (stats, supplies and reads are declarations, done above).
    for (const [key, value] of Object.entries(data))
      if (!['stats', 'resources', 'reads'].includes(key)) r.walk(value, key)
  }

  // Its sheets: a bound may read another value of the same sheet (`max: '{{maxHealth}}'`).
  const sheets = [system.sheet?.id, system.partySheet?.id, system.factions?.sheet.id]
  for (const id of new Set(sheets.filter((s): s is string => !!s))) {
    const def = extra('sheet', id)
    if (!def) continue
    const own = new Set(Object.keys(asObject(def.data.values)))
    recorder({ kind: 'sheet', ...place(def) }, own).walk(def.data, '')
  }
  for (const [kind, id] of [
    ['factions', system.factions?.id],
    ['clocks', system.clocks?.id],
  ] as const) {
    const def = extra(kind, id)
    if (def) recorder({ kind, ...place(def) }).walk(def.data, '')
  }
  for (const id of Object.keys(system.weather ?? {})) {
    const def = extra('weather', id)
    if (def && packs.includes(def.pack))
      recorder({ kind: 'weather', ...place(def) }).walk(def.data, '')
  }

  // Tables, oracles, generators and decks of its packs.
  for (const def of registry.definitions.values())
    if (packs.includes(def.pack)) definitionUses(def, recorder)

  return out
}

function definitionUses(
  def: Compiled,
  recorder: (
    at: Omit<UsePlace, 'path'>,
    ownValues?: Set<string>,
    produced?: Set<string>,
  ) => {
    text: (value: unknown, path: string) => void
    deep: (value: unknown, path: string) => void
    condition: (cond: unknown, path: string) => void
    changes: (effects: unknown, path: string) => void
    sets: (values: unknown, path: string) => void
  },
): void {
  const produced = new Set(def.kind === 'generator' ? def.fields.map((f) => f.name) : [])
  const r = recorder(
    { kind: def.kind, pack: def.pack, id: def.localId, file: def.file },
    undefined,
    produced,
  )
  const local = (mode: string) => mode.split('/').pop()!
  const entry = (e: CompiledEntry, path: string) => {
    r.condition(e.when, `${path}.when`)
    r.text(e.result, `${path}.result`)
    if (e.ref?.dynamic) r.text(e.ref.target, `${path}.ref`)
    r.sets(e.set, `${path}.set`)
    r.changes(e.effects, `${path}.effects`)
  }
  const list = (l: { roll?: string; entries: CompiledEntry[] }, path: string) => {
    r.text(l.roll, join(path, 'roll'))
    l.entries.forEach((e, i) =>
      entry(e, join(path, e.explicitId ? `entries.${e.key}` : `entries[${i}]`)),
    )
  }
  if (def.kind === 'table' || def.kind === 'oracle') {
    for (const [mode, cond] of Object.entries(def.modeWhen))
      r.condition(cond, `modeWhen.${local(mode)}`)
    for (const [mode, cond] of Object.entries(def.modeUnless))
      r.condition(cond, `modeUnless.${local(mode)}`)
  }
  switch (def.kind) {
    case 'table':
      list(def, '')
      break
    case 'oracle':
      for (const [name, variant] of Object.entries(def.variants)) list(variant, `variants.${name}`)
      break
    case 'generator':
      for (const field of def.fields) {
        const path = `fields.${field.name}`
        r.condition(field.when, `${path}.when`)
        r.text(field.roll, `${path}.roll`)
        if (field.ref?.dynamic) r.text(field.ref.target, `${path}.ref`)
        r.deep(field.value, `${path}.value`)
        r.deep(field.context, `${path}.context`)
      }
      r.text(def.template, 'template')
      break
    case 'deck':
      for (const card of def.cards) {
        const path = `cards.${card.key}`
        r.text(card.result, `${path}.result`)
        if (card.ref?.dynamic) r.text(card.ref.target, `${path}.ref`)
        r.sets(card.set, `${path}.set`)
        r.changes(card.effects, `${path}.effects`)
      }
      break
  }
}

/** Where the members of a party are named: the party's, a character's, who acts, a role's holder, a token. */
const MEMBER = String.raw`(?:party\.members|characters\.[^.]+|acting|roles\.[^.]+|token)`
const FACTION = String.raw`(?:faction|factions\.[^.]+)`
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * The uses of one thing the system declares, by the names that point at it (`docs/used-by.md`
 * §3). A party sheet's value also gets the uses of the stats made of it (`from: { party }`):
 * they're the same number.
 */
export function usesOf(uses: readonly Use[], declared: Declared, system?: TravelSystem): Use[] {
  const id = escape(declared.id)
  const has = (u: Use) => !!u.values?.includes(declared.id)
  let match: (u: Use) => boolean
  switch (declared.kind) {
    case 'stat':
      match = (u) => u.name === `party.stats.${declared.id}`
      break
    case 'role':
      match = (u) => u.name === `roles.${declared.id}` || u.name.startsWith(`roles.${declared.id}.`)
      break
    case 'supply': {
      const named = new RegExp(`^(party\\.resources|trip\\.spent|trip\\.gained)\\.${id}$`)
      match = (u) => named.test(u.name) || (['trip.below', 'trip.above'].includes(u.name) && has(u))
      break
    }
    case 'day-value':
      // Also by its own name: what was set today is in the context as itself.
      match = (u) =>
        u.name === declared.id ||
        u.name === `today.${declared.id}` ||
        u.name === `yesterday.${declared.id}`
      break
    case 'read':
      match = (u) =>
        u.written === declared.id ||
        u.name === declared.id ||
        u.name === `hex.${declared.id}` ||
        // A value a table sets for later ones (`set: { fordModifier: -1 }`).
        u.name === `today.${declared.id}` ||
        u.name === `from.${declared.id}`
      break
    case 'clock':
      match = (u) => u.name === `world.clocks.${declared.id}`
      break
    default: {
      const part = { 'sheet-value': 'values', 'sheet-condition': 'conditions' }[declared.kind]
      const who = { members: MEMBER, party: 'party', factions: FACTION }[declared.sheet]
      const named = new RegExp(`^${who}\\.${part}\\.${id}$`)
      const listed = new RegExp(`^${who}\\.${part}$`)
      const sheetId = {
        members: system?.sheet?.id,
        party: system?.partySheet?.id,
        factions: system?.factions?.sheet.id,
      }[declared.sheet]
      const own = (u: Use) =>
        u.at.kind === 'sheet' &&
        `${u.at.pack}/${u.at.id}` === sheetId &&
        u.name === `self.${part}.${declared.id}`
      // The stats that are this party value (`from: { party: morale }`).
      const stats = Object.entries(system?.bindings?.stats ?? {})
        .filter(
          ([, s]) =>
            declared.sheet === 'party' && part === 'values' && s.from?.party === declared.id,
        )
        .map(([s]) => `party.stats.${s}`)
      match = (u) =>
        named.test(u.name) || (listed.test(u.name) && has(u)) || own(u) || stats.includes(u.name)
    }
  }
  return uses.filter(match)
}

/**
 * Everything a system declares that gets a "Used by", in the order Systems shows them: its
 * stats and roles, supplies and values of the day, what its tables read, its clocks, and the
 * values and conditions of its sheets.
 */
export function declaredOf(registry: Registry, system: TravelSystem): Declared[] {
  const out: Declared[] = []
  const ids = (o: unknown) => Object.keys(asObject(o))
  for (const id of ids(system.bindings?.stats)) out.push({ kind: 'stat', id })
  for (const id of ids(system.bindings?.roles)) out.push({ kind: 'role', id })
  for (const id of ids(system.rules.resources)) out.push({ kind: 'supply', id })
  for (const id of ids(system.rules.values)) out.push({ kind: 'day-value', id })
  const bindings = system.sources?.bindings
  const raw = bindings
    ? (registry.extras.get(bindings.pack) ?? []).find(
        (e) => e.kind === 'bindings' && (e.id ?? 'default') === bindings.id,
      )
    : undefined
  for (const id of ids(raw?.data.reads)) out.push({ kind: 'read', id })
  for (const id of ids(system.clocks?.def.clocks)) out.push({ kind: 'clock', id })
  const sheets: [SheetScope, { values?: unknown; conditions?: unknown } | undefined][] = [
    ['members', system.sheet?.def],
    ['party', system.partySheet?.def],
    ['factions', system.factions?.sheet.def],
  ]
  for (const [sheet, def] of sheets) {
    if (!def) continue
    for (const id of ids(def.values)) out.push({ kind: 'sheet-value', sheet, id })
    for (const id of ids(def.conditions)) out.push({ kind: 'sheet-condition', sheet, id })
  }
  return out
}

/** The uses of a name as written or by its full name (Find a name). */
export function usesNamed(uses: readonly Use[], name: string): Use[] {
  const n = name.trim()
  return uses.filter((u) => u.name === n || u.written === n || u.name.startsWith(`${n}.`))
}

function compared(value: unknown): string[] | undefined {
  const out: string[] = []
  const add = (v: unknown) => {
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')
      out.push(String(v))
  }
  if (Array.isArray(value)) value.forEach(add)
  else if (isObject(value)) {
    for (const [op, v] of Object.entries(value))
      if (COMPARISONS.has(op) && op !== 'exists') (Array.isArray(v) ? v : [v]).forEach(add)
  } else add(value)
  return out.length ? out : undefined
}

const place = (d: { pack: string; id: string; file: string }) => ({
  pack: d.pack,
  id: d.id,
  file: d.file,
})
const join = (path: string, key: string) => (path ? `${path}.${key}` : key)
const asObject = (v: unknown): Record<string, unknown> => (isObject(v) ? v : {})

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isComparison(value: Record<string, unknown>): boolean {
  const keys = Object.keys(value)
  return keys.length > 0 && keys.every((k) => COMPARISONS.has(k))
}
