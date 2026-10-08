import type { Registry } from '@open-tabletop/oracle-engine'
import {
  contextSuggestions,
  effectSuggestions,
  setSuggestions,
  travelSystems,
} from '@open-tabletop/session'
import { availableActions, CHECK_MOMENTS } from '@open-tabletop/travel-engine'
import { choicesFor, typingAt, type Suggestions } from '@open-tabletop/ui-kit'

/** What the YAML editor can suggest: from the loaded packs, the map and trips. */
export interface YamlHints {
  /** Tables and generators a reference can point at (local ids and pack/id). */
  refs: readonly string[]
  /** Everything a check can be resolved by (`resolve:`): also oracles and decks. */
  rollable?: readonly string[]
  /** Names conditions and context can read, with their values. */
  context: Suggestions
  /** Names an entry can set, with their values. */
  set: Suggestions
  /** Paths effects can change (`party.stats.fatigue`), with their values. */
  effects?: Suggestions
  /** The travel system's actions (`do:`, `on:`, `at:`, `night:`): the pack's own first. */
  actions?: readonly string[]
  /** The travel system's check events (`roll:`). */
  events?: readonly string[]
}

/** Hints from the loaded packs; `pack` lists its own definitions first, by local id. */
export function yamlHints(registry: Registry, pack?: string): YamlHints {
  const all = [...registry.definitions.values()]
  const ids = (defs: typeof all) => [
    ...defs.filter((d) => d.pack === pack).map((d) => d.localId),
    ...defs.filter((d) => d.pack !== pack).map((d) => d.id),
  ]
  // The pack's own travel system first, then every other one.
  const systems = travelSystems(registry).systems.sort(
    (a, b) => Number(b.pack === pack) - Number(a.pack === pack),
  )
  const unique = (list: string[]) => [...new Set(list)]
  return {
    refs: ids(all.filter((d) => d.kind === 'table' || d.kind === 'generator')),
    rollable: ids(all),
    context: contextSuggestions(registry),
    set: setSuggestions(registry),
    effects: effectSuggestions(registry),
    actions: unique(systems.flatMap((s) => Object.keys(availableActions(s.rules).all))),
    events: unique(systems.flatMap((s) => (s.rules.checks ?? []).map((c) => c.event))),
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
    'system',
  ],
  keep: ['highest', 'lowest', 'middle'],
  onExhausted: ['reroll', 'next', 'none'],
  reshuffle: ['when-empty', 'manual', 'after-draw'],
  time: ['dawn', 'nightfall', '60', '120', '180'],
  reveal: ['neighbors', 'entered'],
  clamp: ['true', 'false'],
  once: ['true', 'false'],
  pause: ['true', 'false'],
  passable: ['false', 'true'],
  oncePerDay: ['true', 'false'],
}
/** Keys whose value is a reference to a table or generator. */
const REF_KEYS = new Set(['table', 'generator', 'resolve'])
/** Keys whose value is a condition, or values (one line of `key: value` pairs). */
const CONDITION_KEYS = new Set(['when', 'unless', 'through'])

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
  'modeUnless',
  'reads',
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
  'effects',
  'pause',
  'when',
  'unless',
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
  // Travel rules and bindings.
  'day',
  'start',
  'nightfall',
  'night',
  'travel',
  'hoursPerDay',
  'terrains',
  'multiplier',
  'passable',
  'water',
  'defaultTerrain',
  'edges',
  'kmPerDay',
  'through',
  'resources',
  'min',
  'max',
  'weather',
  'speed',
  'values',
  'blocks',
  'actions',
  'on',
  'do',
  'time',
  'oncePerDay',
  'nothing',
  'checks',
  'event',
  'at',
  'stats',
  'default',
  'discover',
  'resolve',
  // Systems.
  'bindings',
  'calendar',
  'packs',
  'maps',
]

export interface Completion {
  /** Offset in the line where the word being completed starts. */
  from: number
  options: string[]
}

/** What to suggest for the text of a line up to the cursor, or null for nothing. */
export function completeYaml(before: string, hints: YamlHints): Completion | null {
  // Inside a one-line condition or values: `when: { terrain: fo`.
  // The last one opened on the line: `{ when: { … }, effects: { party.st`.
  const flow = [...before.matchAll(/\b(when|unless|through|set|context|effects)\s*:\s*/g)].at(-1)
  if (flow) {
    const start = flow.index! + flow[0].length
    const text = before.slice(start)
    const suggestions = CONDITION_KEYS.has(flow[1])
      ? hints.context
      : flow[1] === 'effects'
        ? (hints.effects ?? {})
        : hints.set
    const typing = typingAt(text, text.length)
    const options = choicesFor(typing, suggestions, 30)
    return options.length ? { from: start + typing.start, options } : null
  }
  // A value after a key: `kind: ta`, `table: wea`, `at: ca`.
  const pair = /([\w-]+)\s*:\s+([\w./-]*)$/.exec(before)
  if (pair) {
    const [, key, typed] = pair
    const actions = hints.actions ?? []
    const pool =
      key === 'resolve'
        ? (hints.rollable ?? hints.refs)
        : REF_KEYS.has(key)
          ? hints.refs
          : key === 'do'
            ? actions
            : key === 'on' || key === 'at'
              ? [...CHECK_MOMENTS, ...actions]
              : key === 'night'
                ? [...actions, 'false']
                : key === 'roll'
                  ? (hints.events ?? [])
                  : (ENUMS[key] ?? hints.context[key] ?? [])
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
