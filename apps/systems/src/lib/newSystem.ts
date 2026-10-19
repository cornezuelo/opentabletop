import { PACK_FORMAT, writeRef } from '@open-tabletop/oracle-engine'
import {
  DEFAULT_SYSTEM,
  definitionId,
  localize,
  NO_TRAVEL,
  type LocalizedText,
  type TravelSystem,
} from '@open-tabletop/session'
import { FACTION_SHEET, manifestOf, PARTY_SHEET, SYSTEM_TEMPLATES } from '@open-tabletop/pack-ui'
import { appendDefinition, freeId, readDefinition, setIn } from '@open-tabletop/pack-ui/yaml'
import { stringify } from 'yaml'
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
 * The Generic rules' travel rules as Core writes them (`core/travel.yaml`), without kind
 * and id: what a new system starts from, to see and change. Their day is named by parts of
 * Core's calendar, so a system that takes them names that calendar too.
 */
function coreRules(): Record<string, unknown> {
  const root = library.rootOf(DEFAULT_SYSTEM)
  const text = root ? library.readFile(root, 'travel.yaml') : undefined
  const raw = (text && readDefinition(text, '@travel-rules/default')) || { ...NO_TRAVEL }
  const rest: Record<string, unknown> = { ...raw }
  delete rest.kind
  delete rest.id
  return rest
}

/** Core as a dependency (`core: '>=<its version>'`), for a pack that takes its calendar. */
function coreDependency(): Record<string, string> {
  const version = library.registry.packs.get(DEFAULT_SYSTEM)?.manifest.version
  return version ? { [DEFAULT_SYSTEM]: `>=${version}` } : {}
}

/**
 * A new pack of the user's that is a travel system: a `kind: system` naming a copy of the
 * Generic rules to start from, Core's calendar (their day is named by its parts) and empty
 * bindings. Returns its id (also its folder), or null if that id is taken.
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
    ...(Object.keys(coreDependency()).length && { dependencies: coreDependency() }),
  })
  const system = stringify({
    kind: 'system',
    id: 'default',
    travel: 'travel-rules.default',
    bindings: 'bindings.default',
    ...(Object.keys(coreDependency()).length && { calendar: CORE_CALENDAR }),
  })
  const rules = stringify({ kind: 'travel-rules', id: 'default', ...coreRules() })
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
 * written, to edit them; null for a system without travel rules (or another pack's).
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

/** The pack a system is declared in, by its root (undefined for one that isn't loaded). */
export const systemRoot = (system: TravelSystem): string | undefined =>
  system.pack ? library.rootOf(system.pack) : undefined

/**
 * Where a system's `kind: system` is written, to edit it on its page, with its travel rules
 * and bindings when they're in its own pack; null for an older pack's implicit one (which
 * has none: see `declareSystem`).
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

/** Core's calendar, as a system names it: the Generic rules' day is named by its parts. */
const CORE_CALENDAR = writeRef('calendar', 'default', DEFAULT_SYSTEM)

/**
 * The parts a system can name, by kind, as it names them: its pack's as `kind.id`, its
 * dependencies' as `pack/kind.id`.
 */
export type PartKind = 'travel-rules' | 'bindings' | 'calendar' | 'weather'

export function partChoices(system: TravelSystem, kind: PartKind): string[] {
  const pack = system.pack
  if (!pack) return []
  return [pack, ...dependencies(system)].flatMap((owner) =>
    (library.registry.extras.get(owner) ?? [])
      .filter((e) => e.kind === kind)
      .map((e) => writeRef(kind, e.id ?? 'default', owner === pack ? undefined : owner)),
  )
}

/**
 * The name of one of `partChoices` (a calendar's, a weather model's…) in the UI's
 * language, or undefined when the definition has none.
 */
export function partName(system: TravelSystem, kind: PartKind, choice: string): string | undefined {
  const [owner, id] = definitionId(choice, system.pack).split('/', 2)
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
 * New parts for a system: a copy of the Generic rules to start from, or empty bindings,
 * appended to its pack's `travel.yaml` (created if missing) under a free id, and named in
 * the system. Returns the id, or null when the system has no `kind: system` to name it.
 */
export function createPart(system: TravelSystem, kind: 'travel-rules' | 'bindings'): string | null {
  const source = systemFile(system)
  if (!source?.system) return null
  const { root } = source
  const taken = partChoices(system, kind)
    .filter((ref) => !ref.includes('/'))
    .map((ref) => ref.slice(kind.length + 1))
  const id = freeId('default', taken)
  const definition =
    kind === 'travel-rules' ? { kind, id, ...coreRules() } : { kind, id, on: {}, stats: {} }
  const file = 'travel.yaml'
  const named = source.system
  // One step for ↶: the new part and its name in the system.
  library.batch(() => {
    library.writeFile(root, file, appendDefinition(library.readFile(root, file) ?? '', definition))
    const declared = library.readFile(root, named.path) ?? ''
    let next = setIn(
      declared,
      `@system/${named.id}`,
      [kind === 'travel-rules' ? 'travel' : 'bindings'],
      writeRef(kind, id),
    )
    // The Generic rules' day is named by parts of Core's calendar: a system with no
    // calendar that can take Core's names it.
    if (
      kind === 'travel-rules' &&
      !system.calendar &&
      dependencies(system).includes(DEFAULT_SYSTEM)
    )
      next = setIn(next, `@system/${named.id}`, ['calendar'], CORE_CALENDAR)
    library.writeFile(root, named.path, next)
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
        const written = writeRef('weather', id, owner === pack ? undefined : owner)
        return owner === pack || deps.includes(owner) ? [written] : []
      }),
    ),
  ]
  const definition: Record<string, unknown> = { kind: 'system', id: 'default' }
  const travel = idOf('travel-rules')
  const bindings = idOf('bindings')
  const calendar = idOf('calendar')
  if (travel) definition.travel = writeRef('travel-rules', travel)
  if (bindings) definition.bindings = writeRef('bindings', bindings)
  if (calendar) definition.calendar = writeRef('calendar', calendar)
  if (weather.length) definition.weather = weather
  const file = 'system.yaml'
  library.writeFile(root, file, appendDefinition(library.readFile(root, file) ?? '', definition))
  return true
}

/** The kinds of definition a system's tabs edit besides its rules and bindings. */
export type PartTabKind = 'calendar' | 'weather' | 'roll-modes' | 'sheet' | 'factions' | 'clocks'

/** Where a part named `ref` (`kind.id` of the system's pack, or `pack/kind.id`) is written. */
function partSource(pack: string, kind: string, ref: string): PartSource | null {
  const [owner, id] = definitionId(ref, pack).split('/', 2)
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
      .map((e) => writeRef(kind, e.id ?? 'default', owner))
  const data = systemData(system)
  let refs: string[]
  if (kind === 'roll-modes') refs = system.packs.flatMap(ownOfKind)
  else if (kind === 'sheet')
    // Its characters' sheet, then the party's own.
    refs = data
      ? (['sheet', 'partySheet'] as const).flatMap((key) =>
          typeof data[key] === 'string' ? [data[key] as string] : [],
        )
      : ownOfKind(pack).slice(0, 1)
  else if (kind === 'calendar' || kind === 'factions' || kind === 'clocks')
    refs = data
      ? typeof data[kind] === 'string'
        ? [data[kind] as string]
        : []
      : ownOfKind(pack).slice(0, 1)
  else
    refs = data ? (Array.isArray(data.weather) ? (data.weather as string[]) : []) : ownOfKind(pack)
  return refs.flatMap((ref) => partSource(pack, kind, ref) ?? [])
}

/**
 * A new definition of a kind for a system, from its template (calendar, weather model,
 * roll modes or sheet), in its pack's file for that kind (`calendar.yaml`, `weather.yaml`,
 * `roll-modes.yaml`, `sheet.yaml`); a calendar, weather model or sheet is named by its
 * system. One undo step.
 */
export function createSystemPart(
  system: TravelSystem,
  kind: PartTabKind,
  /** A sheet for the party itself (`partySheet`), not for its characters. */
  party = false,
): string | null {
  const root = systemRoot(system)
  if (!root || !library.isEditable(root)) return null
  const pack = system.pack!
  const taken = (library.registry.extras.get(pack) ?? [])
    .filter((e) => e.kind === kind)
    .map((e) => e.id ?? 'default')
  const base = party
    ? 'party'
    : kind === 'calendar' || kind === 'weather' || kind === 'sheet'
      ? kind
      : 'default'
  const id = freeId(base, taken)
  const file = `${kind}.yaml`
  const declared = systemFile(system)?.system
  library.batch(() => {
    library.writeFile(
      root,
      file,
      appendDefinition(
        library.readFile(root, file) ?? '',
        party ? PARTY_SHEET(id) : SYSTEM_TEMPLATES[kind](id),
      ),
    )
    // New factions name a sheet `faction`: written beside them when the pack has none.
    if (
      kind === 'factions' &&
      !(library.registry.extras.get(pack) ?? []).some(
        (e) => e.kind === 'sheet' && e.id === 'faction',
      )
    )
      library.writeFile(
        root,
        file,
        appendDefinition(library.readFile(root, file) ?? '', FACTION_SHEET()),
      )
    if (!declared || kind === 'roll-modes') return
    const text = library.readFile(root, declared.path) ?? ''
    const selector = `@system/${declared.id}`
    const current = readDefinition(text, selector) ?? {}
    const value =
      kind === 'calendar' || kind === 'sheet' || kind === 'factions' || kind === 'clocks'
        ? writeRef(kind, id)
        : [
            ...(Array.isArray(current.weather) ? (current.weather as string[]) : []),
            writeRef(kind, id),
          ]
    library.writeFile(
      root,
      declared.path,
      setIn(text, selector, [party ? 'partySheet' : kind], value),
    )
  })
  return id
}

/** The pack format a pack was written for (`format` in its pack.yaml; absent: today's). */
export function packFormat(root: string): number {
  const pack = library.pack(root)
  return (pack && manifestOf(pack).format) ?? PACK_FORMAT
}
