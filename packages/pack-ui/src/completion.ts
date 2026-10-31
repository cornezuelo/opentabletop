import { writeRef, type Registry } from '@open-tabletop/oracle-engine'
import {
  contextSuggestions,
  effectSuggestions,
  setSuggestions,
  travelSystems,
} from '@open-tabletop/session'
import { availableActions, CHECK_MOMENTS, ref } from '@open-tabletop/travel-engine'
import { choicesFor, typingAt, type Suggestions } from '@open-tabletop/ui-kit'

/** What the YAML editor can suggest: from the loaded packs, the map and trips. */
export interface YamlHints {
  /** Tables and generators a reference can point at (`table.ruins`, `core/generator.npc`). */
  refs: readonly string[]
  /** Everything a check can be resolved by (`resolve:`): also oracles and decks. */
  rollable?: readonly string[]
  /**
   * Other engines' definitions by the kind that names them (`sheet.companion`,
   * `roll-modes.advantage`), for `sheet:`, `calendar:`, `cancels:`…
   */
  named?: Readonly<Record<string, readonly string[]>>
  /** Names conditions and context can read, with their values. */
  context: Suggestions
  /** Names an entry can set, with their values. */
  set: Suggestions
  /** Paths effects can change (`party.stats.fatigue`), with their values. */
  effects?: Suggestions
  /** The travel system's actions by full name (`actions.camp`: `do:`, `on:`, `at:`): the pack's own first. */
  actions?: readonly string[]
  /** The travel system's checks by full name (`checks.ENCOUNTER`: `roll:`). */
  events?: readonly string[]
  /** The parts of its calendar's day (`time.meal.elevenses`): moments, time steps, the day. */
  parts?: readonly string[]
}

/**
 * Hints from the loaded packs; `pack` lists its own definitions first, as it writes them
 * (`table.ruins`), then the others' (`core/table.twists`).
 */
export function yamlHints(registry: Registry, pack?: string): YamlHints {
  const all = [...registry.definitions.values()]
  const own = (owner: string) => (owner === pack ? undefined : owner)
  const ids = (defs: typeof all) => [
    ...defs.filter((d) => d.pack === pack).map((d) => writeRef(d.kind, d.localId)),
    ...defs.filter((d) => d.pack !== pack).map((d) => writeRef(d.kind, d.localId, d.pack)),
  ]
  const named: Record<string, string[]> = {}
  for (const [owner, extras] of registry.extras)
    for (const e of extras)
      (named[e.kind] ??= []).push(writeRef(e.kind, e.id ?? 'default', own(owner)))
  named['roll-modes'] = [...registry.rollModes.values()].map((m) =>
    writeRef('roll-modes', m.localId, own(m.pack)),
  )
  // The pack's own travel system first, then every other one.
  const systems = travelSystems(registry).systems.sort(
    (a, b) => Number(b.pack === pack) - Number(a.pack === pack),
  )
  const unique = (list: string[]) => [...new Set(list)]
  return {
    refs: ids(all),
    rollable: ids(all),
    named,
    context: contextSuggestions(registry),
    set: setSuggestions(registry),
    effects: effectSuggestions(registry),
    actions: unique(
      systems.flatMap((s) =>
        Object.keys(availableActions(s.rules).all).map((a) => ref('actions', a)),
      ),
    ),
    events: unique(
      systems.flatMap((s) => (s.rules.checks ?? []).map((c) => ref('checks', c.event))),
    ),
    parts: unique(
      systems.flatMap((s) =>
        (s.calendar?.divisions ?? []).flatMap((d) => d.parts.map((p) => `time.${d.id}.${p.id}`)),
      ),
    ),
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
    'land',
    'system',
    'sheet',
    'factions',
    'clocks',
    'world',
    'items',
    'bestiary',
    'places',
  ],
  keep: ['highest', 'lowest', 'middle'],
  onExhausted: ['reroll', 'next', 'none'],
  reshuffle: ['when-empty', 'manual', 'after-draw'],
  time: ['60', '120', '180', '06:00'],
  limit: ['60', '180', '18:00'],
  reveal: ['neighbors', 'entered'],
  clamp: ['true', 'false'],
  once: ['true', 'false'],
  pause: ['true', 'false'],
  then: ['keep', 'reset', 'remove'],
  passable: ['false', 'true'],
  oncePerDay: ['true', 'false'],
  hideWhenUnavailable: ['true', 'false'],
  share: ['even', 'order'],
  track: ['true', 'false'],
  display: ['number', 'of', 'bar', 'boxes', 'pips', 'dial', 'levels'],
  behind: ['stay', 'leave'],
  leaves: ['true', 'false'],
}
/** Keys whose value is a reference to something rolled: a table, oracle, generator or deck. */
const REF_KEYS = new Set(['table', 'generator', 'resolve', 'turn'])
/** Keys whose value names another engine's definition, by the kind it names. */
const NAMED_KEYS: Record<string, string> = {
  sheet: 'sheet',
  partySheet: 'sheet',
  calendar: 'calendar',
  bindings: 'bindings',
  factions: 'factions',
  clocks: 'clocks',
  world: 'world',
  land: 'land',
  cancels: 'roll-modes',
}
/** Keys whose value is a condition, or values (one line of `key: value` pairs). */
const CONDITION_KEYS = new Set(['when', 'unless', 'through', 'wait', 'fits', 'where'])

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
  'travel',
  'start',
  'halt',
  'hoursPerDay',
  'terrains',
  'multiplier',
  'passable',
  'water',
  'defaultTerrain',
  'connections',
  'crossing',
  'kmPerDay',
  'through',
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
  'travel.move',
  'travel.speed',
  'travel.advance',
  'travel.mode',
  'say',
  'pause',
  'ask',
  'wait',
  'limit',
  'with',
  'params',
  'choices',
  'onward',
  'oncePerDay',
  'hideWhenUnavailable',
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
  'sheet',
  // Sheets, and the party made of their characters (bindings' stats).
  'conditions',
  'relations',
  'track',
  'display',
  'levels',
  'tones',
  'group',
  'groups',
  'from',
  'sum',
  // Items: the sheet's fields and places, a catalogue's items.
  'items',
  'fields',
  'places',
  'room',
  'size',
  'spent',
  'fits',
  'holds',
  'where',
  'none',
  'roles',
  'factions',
  'every',
  'turn',
  'territory',
  'regions',
  'map',
  'hexes',
  'color',
  'share',
  // Progress clocks.
  'clocks',
  'segments',
  'filled',
  'then',
  // The world's rules.
  'world',
  'reactions',
  // Land models.
  'land',
  'next',
  'weights',
  // Bestiaries: templates of characters, and what takes a copy off.
  'bestiary',
  'templates',
  'like',
  'names',
  'token',
  'icon',
  'behind',
  'leaves',
  // Catalogues of places: the places, what each gives its point of interest and its hex.
  'places',
  'fields',
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
      key === 'resolve' || key === 'turn'
        ? (hints.rollable ?? hints.refs)
        : NAMED_KEYS[key] && hints.named?.[NAMED_KEYS[key]]
          ? hints.named[NAMED_KEYS[key]]
          : REF_KEYS.has(key)
            ? hints.refs
            : key === 'do'
              ? actions
              : key === 'on' || key === 'at'
                ? [...CHECK_MOMENTS, ...(hints.parts ?? []), ...actions]
                : key === 'roll'
                  ? (hints.events ?? [])
                  : key === 'time' || key === 'limit'
                    ? [...ENUMS.time, ...(hints.parts ?? [])]
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
