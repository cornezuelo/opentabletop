import type { Registry } from '@open-tabletop/oracle-engine'
import { contextSuggestions, setSuggestions } from '@open-tabletop/session'
import { choicesFor, typingAt, type Suggestions } from '@open-tabletop/ui-kit'

/** What the YAML editor can suggest: from the loaded packs, the map and trips. */
export interface YamlHints {
  /** Tables and generators a reference can point at (local ids and pack/id). */
  refs: readonly string[]
  /** Names conditions and context can read, with their values. */
  context: Suggestions
  /** Names an entry can set, with their values. */
  set: Suggestions
}

/** Hints from the loaded packs; `pack` lists its own definitions first, by local id. */
export function yamlHints(registry: Registry, pack?: string): YamlHints {
  const defs = [...registry.definitions.values()].filter(
    (d) => d.kind === 'table' || d.kind === 'generator',
  )
  const local = defs.filter((d) => d.pack === pack).map((d) => d.localId)
  return {
    refs: [...local, ...defs.filter((d) => d.pack !== pack).map((d) => d.id)],
    context: contextSuggestions(registry),
    set: setSuggestions(registry),
  }
}

/** Keys with a fixed set of values. */
const ENUMS: Record<string, readonly string[]> = {
  kind: [
    'table',
    'oracle',
    'generator',
    'deck',
    'roll-modes',
    'travel-rules',
    'bindings',
    'calendar',
    'weather',
  ],
  keep: ['highest', 'lowest', 'middle'],
  onExhausted: ['reroll', 'next', 'none'],
  reshuffle: ['when-empty', 'manual', 'after-draw'],
  at: ['day-start', 'hex-enter', 'camp'],
  reveal: ['neighbors', 'entered'],
  clamp: ['true', 'false'],
  once: ['true', 'false'],
  passable: ['false', 'true'],
  oncePerDay: ['true', 'false'],
}
/** Keys whose value is a reference to a table or generator. */
const REF_KEYS = new Set(['table', 'generator', 'resolve'])
/** Keys whose value is a condition, or values (one line of `key: value` pairs). */
const CONDITION_KEYS = new Set(['when', 'unless'])

/** Keys a definition, its entries and its fields use. */
const KEYS = [
  'kind',
  'id',
  'name',
  'description',
  'tags',
  'roll',
  'modes',
  'modeWhen',
  'repeat',
  'keep',
  'cancels',
  'clamp',
  'onExhausted',
  'entries',
  'range',
  'weight',
  'result',
  'table',
  'generator',
  'set',
  'when',
  'once',
  'maxOccurrences',
  'inputs',
  'variants',
  'fields',
  'value',
  'context',
  'template',
  'cards',
  'count',
  'reshuffle',
]

export interface Completion {
  /** Offset in the line where the word being completed starts. */
  from: number
  options: string[]
}

/** What to suggest for the text of a line up to the cursor, or null for nothing. */
export function completeYaml(before: string, hints: YamlHints): Completion | null {
  // Inside a one-line condition or values: `when: { terrain: fo`.
  const flow = /\b(when|unless|set|context)\s*:\s*/.exec(before)
  if (flow) {
    const start = flow.index + flow[0].length
    const text = before.slice(start)
    const suggestions = CONDITION_KEYS.has(flow[1]) ? hints.context : hints.set
    const typing = typingAt(text, text.length)
    const options = choicesFor(typing, suggestions, 30)
    return options.length ? { from: start + typing.start, options } : null
  }
  // A value after a key: `kind: ta`, `table: wea`, `at: ca`.
  const pair = /([\w-]+)\s*:\s+([\w./-]*)$/.exec(before)
  if (pair) {
    const [, key, typed] = pair
    const pool = REF_KEYS.has(key) ? hints.refs : (ENUMS[key] ?? hints.context[key] ?? [])
    const options = filter(pool, typed)
    return options.length ? { from: before.length - typed.length, options } : null
  }
  // A key at the start of a line (or a list item).
  const key = /^\s*(?:-\s+)?([\w-]*)$/.exec(before)
  if (key) {
    const options = filter(KEYS, key[1])
    return options.length ? { from: before.length - key[1].length, options } : null
  }
  return null
}

function filter(pool: readonly string[], typed: string): string[] {
  const lower = typed.toLowerCase()
  const starts = pool.filter((p) => p.toLowerCase().startsWith(lower) && p !== typed)
  const contains = pool.filter((p) => !starts.includes(p) && p.toLowerCase().includes(lower))
  return [...new Set([...starts, ...contains])].slice(0, 30)
}
