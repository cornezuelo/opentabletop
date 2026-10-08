import { PACK_FORMAT } from '@open-tabletop/oracle-engine'
import {
  localize,
  olderPauseChecks,
  parseBindings,
  type LocalizedText,
  type TravelSystem,
} from '@open-tabletop/session'
import { genericTravelRules, parseTravelRules } from '@open-tabletop/travel-engine'
import { manifestOf, SYSTEM_TEMPLATES } from '@open-tabletop/pack-ui'
import { appendDefinition, freeId, readDefinition, setIn } from '@open-tabletop/pack-ui/yaml'
import { parseDocument, stringify } from 'yaml'
import { getLocale } from './i18n'
import { library } from './packs.svelte'
import type { PartSource } from './partDoc.svelte'
import type { DocSource } from './systemDoc.svelte'

/** "My Rules!" → "my-rules" (a pack id). */
export const slugify = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'my-system'

/**
 * A new pack of the user's that is a travel system: a `kind: system` naming the generic
 * rules to start from and empty bindings. Returns its id (also its folder), or null if
 * that id is taken.
 */
export function createSystem(name: string): string | null {
  const id = slugify(name)
  if (library.pack(id) || library.rootOf(id)) return null
  const manifest = stringify({
    id,
    name: name.trim() || id,
    version: '0.1.0',
    format: PACK_FORMAT,
    locale: getLocale(),
    license: 'CC-BY-4.0',
  })
  const system = stringify({
    kind: 'system',
    id: 'default',
    travel: 'default',
    bindings: 'default',
  })
  const rules = stringify({ kind: 'travel-rules', ...genericTravelRules, id: 'default' })
  const bindings = stringify({ kind: 'bindings', id: 'default', on: {}, stats: {} })
  library.addPack({
    root: id,
    origin: 'user',
    files: [
      { path: 'pack.yaml', content: manifest },
      { path: 'system.yaml', content: system },
      { path: 'travel.yaml', content: `${rules}---\n${bindings}` },
    ],
  })
  return id
}

/**
 * Where a system's travel rules (and its bindings, when they're in the same pack) are
 * written, to edit them; null for a system without travel rules of its own (the generic ones).
 */
export function rulesFile(system: TravelSystem): DocSource | null {
  const rules = system.sources?.rules
  const root = rules && library.rootOf(rules.pack)
  if (!rules || !root) return null
  const local = (file: string) => file.slice(root.length + 1)
  const bindings = system.sources?.bindings
  const declared = system.sources?.system
  return {
    root,
    path: local(rules.file),
    rulesId: rules.id,
    ...(bindings &&
      bindings.pack === rules.pack && {
        bindings: { path: local(bindings.file), id: bindings.id },
      }),
    ...(declared &&
      declared.pack === rules.pack && { system: { path: local(declared.file), id: declared.id } }),
  }
}

/** The pack a system is declared in, by its root (undefined for the generic system). */
export const systemRoot = (system: TravelSystem): string | undefined =>
  system.pack ? library.rootOf(system.pack) : undefined

/**
 * Where a system's `kind: system` is written, to edit it on its page, with its travel rules
 * and bindings when they're in its own pack; null for the generic system and an older
 * pack's implicit one (which has none: see `declareSystem`).
 */
export function systemFile(system: TravelSystem): DocSource | null {
  const declared = system.sources?.system
  const root = systemRoot(system)
  if (!declared || !root) return null
  const local = (file: string) => file.slice(root.length + 1)
  const own = rulesFile(system)
  return {
    ...(own?.root === root ? own : { root, path: local(declared.file) }),
    system: { path: local(declared.file), id: declared.id },
  }
}

/** The parts a system can name, by kind: its pack's by id, its dependencies' as `pack/id`. */
export type PartKind = 'travel-rules' | 'bindings' | 'calendar' | 'weather'

export function partChoices(system: TravelSystem, kind: PartKind): string[] {
  const pack = system.pack
  if (!pack) return []
  return [pack, ...dependencies(system)].flatMap((owner) =>
    (library.registry.extras.get(owner) ?? [])
      .filter((e) => e.kind === kind)
      .map((e) => {
        const id = e.id ?? 'default'
        return owner === pack ? id : `${owner}/${id}`
      }),
  )
}

/**
 * The name of one of `partChoices` (a calendar's, a weather model's…) in the UI's
 * language, or undefined when the definition has none.
 */
export function partName(system: TravelSystem, kind: PartKind, choice: string): string | undefined {
  const [owner, id] = choice.includes('/')
    ? [choice.slice(0, choice.indexOf('/')), choice.slice(choice.indexOf('/') + 1)]
    : [system.pack ?? '', choice]
  const extra = (library.registry.extras.get(owner) ?? []).find(
    (e) => e.kind === kind && (e.id ?? 'default') === id,
  )
  const locale = library.registry.packs.get(owner)?.manifest.locale
  return localize(extra?.data.name as LocalizedText | undefined, getLocale(), locale) || undefined
}

/** The packs a system's pack depends on (the only ones it can bring or take parts from). */
export function dependencies(system: TravelSystem): string[] {
  const manifest = system.pack ? library.registry.packs.get(system.pack)?.manifest : undefined
  return Object.keys(manifest?.dependencies ?? {})
}

/**
 * New parts for a system: the generic travel rules to start from, or empty bindings,
 * appended to its pack's `travel.yaml` (created if missing) under a free id, and named in
 * the system. Returns the id, or null when the system has no `kind: system` to name it.
 */
export function createPart(system: TravelSystem, kind: 'travel-rules' | 'bindings'): string | null {
  const source = systemFile(system)
  if (!source?.system) return null
  const { root } = source
  const taken = partChoices(system, kind).filter((id) => !id.includes('/'))
  const id = freeId('default', taken)
  const definition =
    kind === 'travel-rules' ? { kind, ...genericTravelRules, id } : { kind, id, on: {}, stats: {} }
  const file = 'travel.yaml'
  const named = source.system
  // One step for ↶: the new part and its name in the system.
  library.batch(() => {
    library.writeFile(root, file, appendDefinition(library.readFile(root, file) ?? '', definition))
    const declared = library.readFile(root, named.path) ?? ''
    library.writeFile(
      root,
      named.path,
      setIn(declared, `@system/${named.id}`, [kind === 'travel-rules' ? 'travel' : 'bindings'], id),
    )
  })
  return id
}

/**
 * Writes an older pack's implicit system as a `kind: system` (in `system.yaml`), naming
 * what it uses today: its travel rules, bindings and calendar, and the weather models its
 * bindings resolve checks with (its own or its dependencies'). Plays the same afterwards.
 */
export function declareSystem(system: TravelSystem): boolean {
  const root = systemRoot(system)
  const pack = system.pack
  if (!root || !pack || system.sources?.system) return false
  const extras = library.registry.extras.get(pack) ?? []
  const idOf = (kind: string) => {
    const found = extras.find((e) => e.kind === kind)
    return found && (found.id ?? 'default')
  }
  const deps = dependencies(system)
  const weather = [
    ...new Set(
      Object.values(system.bindings?.on ?? {}).flatMap((b) => {
        const ref = b.weather
        if (!ref) return []
        const [owner, id] = ref.includes('/') ? ref.split('/', 2) : [pack, ref]
        return owner === pack ? [id] : deps.includes(owner) ? [ref] : []
      }),
    ),
  ]
  const definition: Record<string, unknown> = { kind: 'system', id: 'default' }
  const travel = idOf('travel-rules')
  const bindings = idOf('bindings')
  const calendar = idOf('calendar')
  if (travel) definition.travel = travel
  if (bindings) definition.bindings = bindings
  if (calendar) definition.calendar = calendar
  if (weather.length) definition.weather = weather
  const file = 'system.yaml'
  library.writeFile(root, file, appendDefinition(library.readFile(root, file) ?? '', definition))
  return true
}

/** The kinds of definition a system's tabs edit besides its rules and bindings. */
export type PartTabKind = 'calendar' | 'weather' | 'roll-modes'

/** Where a part named `ref` (`id` of the system's pack, or `pack/id`) is written. */
function partSource(pack: string, kind: string, ref: string): PartSource | null {
  const [owner, id] = ref.includes('/') ? ref.split('/', 2) : [pack, ref]
  const extra = (library.registry.extras.get(owner) ?? []).find(
    (e) => e.kind === kind && (e.id ?? 'default') === id,
  )
  const root = library.rootOf(owner)
  if (!extra || !root || !extra.file.startsWith(`${root}/`)) return null
  return { root, path: extra.file.slice(root.length + 1), kind, id }
}

/** The raw `kind: system` of a declared system, as loaded. */
function systemData(system: TravelSystem): Record<string, unknown> | undefined {
  const declared = system.sources?.system
  if (!declared) return undefined
  return (library.registry.extras.get(declared.pack) ?? []).find(
    (e) => e.kind === 'system' && (e.id ?? 'default') === declared.id,
  )?.data
}

/**
 * The definitions of a kind a system uses, to edit in its tabs: its calendar and weather
 * models (named by its `kind: system`; an older pack's implicit system uses its pack's),
 * and the roll modes of the packs it brings.
 */
export function systemParts(system: TravelSystem, kind: PartTabKind): PartSource[] {
  const pack = system.pack
  if (!pack) return []
  const ownOfKind = (owner: string) =>
    (library.registry.extras.get(owner) ?? [])
      .filter((e) => e.kind === kind)
      .map((e) => `${owner}/${e.id ?? 'default'}`)
  const data = systemData(system)
  let refs: string[]
  if (kind === 'roll-modes') refs = system.packs.flatMap(ownOfKind)
  else if (kind === 'calendar')
    refs = data
      ? typeof data.calendar === 'string'
        ? [data.calendar]
        : []
      : ownOfKind(pack).slice(0, 1)
  else
    refs = data ? (Array.isArray(data.weather) ? (data.weather as string[]) : []) : ownOfKind(pack)
  return refs.flatMap((ref) => partSource(pack, kind, ref) ?? [])
}

/**
 * A new definition of a kind for a system, from its template (calendar, weather model or
 * roll modes), in its pack's file for that kind (`calendar.yaml`, `weather.yaml`,
 * `roll-modes.yaml`); a calendar or weather model is named by its system. One undo step.
 */
export function createSystemPart(system: TravelSystem, kind: PartTabKind): string | null {
  const root = systemRoot(system)
  if (!root || !library.isEditable(root)) return null
  const pack = system.pack!
  const taken = (library.registry.extras.get(pack) ?? [])
    .filter((e) => e.kind === kind)
    .map((e) => e.id ?? 'default')
  const base = kind === 'calendar' ? 'calendar' : kind === 'weather' ? 'weather' : 'default'
  const id = freeId(base, taken)
  const file = `${kind}.yaml`
  const declared = systemFile(system)?.system
  library.batch(() => {
    library.writeFile(
      root,
      file,
      appendDefinition(library.readFile(root, file) ?? '', SYSTEM_TEMPLATES[kind](id)),
    )
    if (!declared || kind === 'roll-modes') return
    const text = library.readFile(root, declared.path) ?? ''
    const selector = `@system/${declared.id}`
    const current = readDefinition(text, selector) ?? {}
    const value =
      kind === 'calendar'
        ? id
        : [...(Array.isArray(current.weather) ? (current.weather as string[]) : []), id]
    library.writeFile(root, declared.path, setIn(text, selector, [kind], value))
  })
  return id
}

/** The pack format a pack was written for (`format` in its pack.yaml; absent: 1). */
export function packFormat(root: string): number {
  const pack = library.pack(root)
  return (pack && manifestOf(pack).format) ?? 1
}

/**
 * What updating raw rules from an older pack format to today's changes: the checks that
 * format 1 paused without saying so (each gets `pause: true`).
 */
export function olderFormatChecks(
  rules: Record<string, unknown>,
  bindings: Record<string, unknown> | undefined,
): number[] {
  const parsed = parseTravelRules(rules).rules
  return parsed ? olderPauseChecks(parsed, bindings && parseBindings(bindings).bindings) : []
}

/**
 * Brings a system's pack to today's format, keeping what it does: its checks that paused
 * by themselves say `pause: true`, and its pack.yaml says `format`. One undo step.
 */
export function updateFormat(doc: {
  root: string
  rules: Record<string, unknown>
  bindings?: Record<string, unknown>
  edit: (kind: 'travel-rules', at: (string | number)[], value: unknown) => void
}): void {
  const checks = olderFormatChecks(doc.rules, doc.bindings)
  library.batch(() => {
    for (const i of checks) doc.edit('travel-rules', ['checks', i, 'pause'], true)
    const manifest = parseDocument(library.readFile(doc.root, 'pack.yaml') ?? '')
    manifest.set('format', PACK_FORMAT)
    library.writeFile(doc.root, 'pack.yaml', manifest.toString())
  })
}
