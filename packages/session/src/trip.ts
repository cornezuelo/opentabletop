import {
  findRef,
  isDynamicRef,
  refProblem,
  refScope,
  ROLLABLE_KINDS,
  type Diagnostic,
  type OracleEngine,
  type RefScope,
  type Registry,
} from '@open-tabletop/oracle-engine'
import type { RandomSource } from '@open-tabletop/random'
import { validateWeather, type WeatherModel } from '@open-tabletop/weather-engine'
import {
  calendarFrom,
  defaultCalendar,
  seasonsOf,
  seasonStartDay,
  validateCalendar,
  type Calendar,
  type CalendarDef,
  type DataCalendar,
} from '@open-tabletop/time'
import {
  actionSteps,
  createTravelEngine,
  isHostMoment,
  momentsOf,
  type Moments,
  refId,
  tripStart,
  partRefsOf,
  findPartRef,
  initialTravelState,
  parseTravelRules,
  type TravelAction,
  type TravelRules,
  type TravelWorld,
  type Unavailable,
} from '@open-tabletop/travel-engine'
import {
  ITEM_KEYS,
  lookupItems,
  parseCatalogue,
  parseSheet,
  type Catalogue,
  type CharacterState,
  type Sheet,
} from '@open-tabletop/character-engine'
import { parseFactions } from '@open-tabletop/faction-engine'
import {
  clockFullMoment,
  fullClockOf,
  parseClocks,
  parseWorldRules,
} from '@open-tabletop/world-engine'
import type { SystemFactions } from './factions'
import type { SystemClocks } from './clocks'
import type { SystemWorld } from './world'
import { definitionId } from './refs'
import {
  MEMBER_PATH,
  partyBlocks,
  refreshParty,
  relatedWorld,
  keptNumbers,
  type PartyRules,
} from './party'
import { createDiscovery, type DiscoveredHex, type RevealMode } from './discovery'
import {
  createSession,
  initialSessionState,
  parseBindings,
  type Bindings,
  localize,
  type JournalEntry,
  type LocalizedText,
  type SessionState,
  tripContext,
} from './index'

/**
 * A game system: what a pack declares it brings (`kind: system`), or, for older packs,
 * its travel rules and bindings.
 */
export interface TravelSystem {
  /**
   * The pack id for a pack's `default` system (and an older pack's implicit one);
   * `pack/id` for any other system a pack declares.
   */
  id: string
  /** The pack that declares it (absent for a system that isn't loaded: `missingSystem`). */
  pack?: string
  /** Its name; texts by language when translated. */
  name: LocalizedText
  description?: LocalizedText
  /** The base language of its pack, the fallback for its texts. */
  locale?: string
  /** Its travel rules (`NO_TRAVEL` when it names none: see `travels`). */
  rules: TravelRules
  bindings?: Bindings
  /**
   * Where its parts are written: travel rules (absent: it doesn't travel), bindings, and
   * the `kind: system` naming them (absent for an older pack's implicit system).
   */
  sources?: { rules?: SystemSource; bindings?: SystemSource; system?: SystemSource }
  /** The calendar its trips and world clock use (`kind: calendar`), if it has one. */
  calendar?: DataCalendar
  /** Weather models its bindings may name, by pack/id. */
  weather?: Record<string, WeatherModel>
  /** Packs whose tables, oracles and decks it brings: its own first. */
  packs: string[]
  /** The sheet its party's members are made with (`sheet` in `kind: system`), by `pack/id`. */
  sheet?: { id: string; def: Sheet }
  /** The party's own sheet (`partySheet` in `kind: system`): the party itself, beside its members. */
  partySheet?: { id: string; def: Sheet }
  /** Its factions (`factions` in `kind: system`): who they are and the sheet they're made with. */
  factions?: SystemFactions
  /** Its progress clocks (`clocks` in `kind: system`): the ones its world clock starts with. */
  clocks?: SystemClocks
  /** Its world's rules (`world` in `kind: system`): what the world does by itself. */
  world?: SystemWorld
  /** Its item catalogues (`items` in `kind: system`), by `pack/id`, in the order it lists them. */
  items?: { id: string; def: Catalogue }[]
  /**
   * Its example maps: OTD bundles (`*.otd.json`) in its own pack, by path in the pack
   * (`maps/frontier.otd.json`), in the order it lists them.
   */
  maps?: string[]
}

/** Where a system's part is defined: a definition of a pack. */
export interface SystemSource {
  pack: string
  id: string
  file: string
}

/** The calendar a system's trips use: its own, or the default one. */
export const calendarOf = (system: TravelSystem): Calendar => system.calendar ?? defaultCalendar

/** A system's name in a language. */
export const systemName = (system: TravelSystem, locale: string): string =>
  localize(system.name, locale, system.locale) ?? system.id

/**
 * Every pack a system needs, to take it elsewhere as a whole: its own first, then the
 * packs it brings and those its parts are written in (a declared system's weather models
 * included), and every dependency of each, as far as they go. Packs that aren't loaded are
 * left out.
 */
export function systemPackIds(system: TravelSystem, registry: Registry): string[] {
  const out: string[] = []
  const add = (id: string | undefined) => {
    if (!id || out.includes(id) || !registry.packs.has(id)) return
    out.push(id)
    for (const dependency of registry.packs.get(id)!.dependencies) add(dependency)
  }
  if (!system.pack) return out
  add(system.pack)
  for (const id of system.packs) add(id)
  for (const source of Object.values(system.sources ?? {})) add(source?.pack)
  // An older pack's implicit system sees every pack's weather: only a declared one names its own.
  if (system.sources?.system)
    for (const key of Object.keys(system.weather ?? {})) add(key.split('/')[0])
  return out
}

/**
 * The system a map or a trip plays when it names none: Core's (the Generic rules,
 * `packs/core/system.yaml`). Older maps and trips that named `generic` read as it.
 */
export const DEFAULT_SYSTEM = 'core'

/** A system id as saved: `generic` (the built-in rules before they were Core's) is Core's. */
export const systemIdOf = (id: string | undefined): string =>
  !id || id === 'generic' ? DEFAULT_SYSTEM : id

/**
 * The travel rules of a system that names none (`travel:` absent in its `kind: system`):
 * nothing to travel with. Such a system doesn't travel (`travels`); its world, oracle and
 * factions still play.
 */
export const NO_TRAVEL: TravelRules = {
  id: 'none',
  travel: { hoursPerDay: 0, hexKm: 10 },
  terrains: {},
  water: { passable: false },
  edges: {},
  modes: {},
  checks: [],
  values: {},
  actions: {},
}

/** Whether a system has travel rules to play trips with (`travel:` in its `kind: system`). */
export const travels = (system: TravelSystem): boolean => !!system.sources?.rules

/**
 * In place of a system that isn't loaded (its pack missing, or a copy of it without it):
 * one that doesn't travel, so the host says so instead of playing another.
 */
export const missingSystem = (id: string): TravelSystem => ({
  id,
  name: id,
  rules: NO_TRAVEL,
  packs: [],
})

/**
 * A trip's characters made with the built-in sheets before they were Core's
 * (`generic/character`, `generic/party`) now have Core's (in place-free copies).
 */
export function migrateGenericSheets<
  S extends { party?: CharacterState; members?: CharacterState[] },
>(session: S): S {
  const sheet = (c: CharacterState): CharacterState =>
    c.sheet.startsWith('generic/') ? { ...c, sheet: `core/${c.sheet.slice(8)}` } : c
  if (
    !session.party?.sheet.startsWith('generic/') &&
    !session.members?.some((m) => m.sheet.startsWith('generic/'))
  )
    return session
  return {
    ...session,
    ...(session.party && { party: sheet(session.party) }),
    ...(session.members && { members: session.members.map(sheet) }),
  }
}

/**
 * The system a pack belongs to, for an app that shows packs (the Oracle) to follow the
 * system last chosen elsewhere: `last` when that pack declares it, else the pack's default
 * system, else the first it declares; undefined for a pack with no system.
 */
export function systemOfPack(
  systems: TravelSystem[],
  pack: string,
  last?: string,
): TravelSystem | undefined {
  const own = systems.filter((s) => s.pack === pack)
  return own.find((s) => s.id === last) ?? own.find((s) => s.id === pack) ?? own[0]
}

/**
 * "checks.2.event: Expected …" → a diagnostic pointing at that path of the definition,
 * found by its kind and id (`@travel-rules/default.checks.2.event`).
 */
function problem(
  pack: string,
  file: string,
  kind: string,
  error: string,
  id = 'default',
  severity: Diagnostic['severity'] = 'error',
): Diagnostic {
  const cut = error.indexOf(': ')
  const path = cut > 0 ? error.slice(0, cut).replace(/^(rules|bindings)\.?/, '') : ''
  const message = cut > 0 ? error.slice(cut + 2) : error
  return {
    severity,
    message,
    pack,
    file,
    // `@kind/id` locates the definition (rules and bindings often share an id).
    at: `@${kind}/${id}${path ? `.${path}` : ''}`,
  }
}

type Extra = Registry['extras'] extends Map<string, (infer E)[]> ? E : never
const isText = (v: unknown): v is LocalizedText =>
  typeof v === 'string' ||
  (typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    Object.values(v).every((x) => typeof x === 'string'))
/** How a system's parts are named in its problems. */
const PART_NAMES: Record<string, string> = {
  sheet: 'sheet',
  partySheet: 'sheet',
  factions: 'factions',
  clocks: 'clocks',
  world: 'world rules',
  'travel-rules': 'travel rules',
  bindings: 'bindings',
  calendar: 'calendar',
  weather: 'weather model',
  items: 'item catalogue',
}
const SYSTEM_KEYS = new Set([
  'kind',
  'id',
  'name',
  'description',
  'travel',
  'bindings',
  'calendar',
  'weather',
  'packs',
  'maps',
  'sheet',
  'partySheet',
  'factions',
  'clocks',
  'world',
  'items',
])

/**
 * Travel systems of the loaded packs, the default one (Core's) first. A pack declares its own with
 * `kind: system` (which travel rules, bindings, calendar, weather models and packs each
 * brings); an older pack without one has an implicit system from its travel rules, its
 * bindings, its calendar and every pack's weather models. Broken parts are reported, and
 * a system whose travel rules are broken isn't loaded.
 */
export function travelSystems(registry: Registry): {
  systems: TravelSystem[]
  problems: Diagnostic[]
} {
  const systems: TravelSystem[] = []
  const problems: Diagnostic[] = []
  const extrasOf = (pack: string) => registry.extras.get(pack) ?? []
  // Weather models of every pack (`kind: weather`), by pack/id.
  const weather: Record<string, WeatherModel> = {}
  for (const [id] of registry.packs)
    for (const extra of extrasOf(id)) {
      if (extra.kind !== 'weather') continue
      const errors = extra.id ? validateWeather(extra.data) : ['id: a weather model needs one']
      problems.push(...errors.map((e) => problem(id, extra.file, 'weather', e, extra.id)))
      if (!errors.length) weather[`${id}/${extra.id}`] = extra.data as unknown as WeatherModel
    }
  // Every pack's bindings, parsed once; their tables checked.
  const bindingsOf = new Map<Extra, ReturnType<typeof parseBindings>>()
  for (const [id] of registry.packs)
    for (const extra of extrasOf(id)) {
      if (extra.kind !== 'bindings') continue
      const parsed = parseBindings(extra.data, id)
      bindingsOf.set(extra, parsed)
      problems.push(...parsed.errors.map((e) => problem(id, extra.file, 'bindings', e, extra.id)))
      // What they roll, as written: something the Oracle rolls (`table.encounter`).
      const raw = extra.data as {
        on?: Record<string, { resolve?: unknown }>
        discover?: Record<string, { resolve?: unknown }>
      }
      const rolled: [string, unknown][] = [
        ...(['terrain', 'contents'] as const).map((key): [string, unknown] => [
          `discover.${key}.resolve`,
          raw.discover?.[key]?.resolve,
        ]),
        ...Object.entries(raw.on ?? {}).map(([event, b]): [string, unknown] => [
          `on.${event}.resolve`,
          b?.resolve,
        ]),
      ]
      for (const [path, ref] of rolled) {
        const message = typeof ref === 'string' && rollableProblem(id, ref)
        if (message)
          problems.push(problem(id, extra.file, 'bindings', `${path}: ${message}`, extra.id))
      }
    }

  /** Where a pack's references to other engines' definitions are looked for (`sheet.companion`). */
  function extrasScope(pack: string, kind: string): RefScope {
    const scope = refScope(registry, pack, (k, full) => {
      const [owner, id] = full.split('/', 2)
      return extrasOf(owner).some((e) => e.kind === k && (e.id ?? 'default') === id)
    })
    return { ...scope, kinds: [kind] }
  }
  /** Why a reference to something the Oracle rolls names nothing (none: it's fine, or built when rolled). */
  function rollableProblem(pack: string, ref: string): string | undefined {
    if (isDynamicRef(ref)) return undefined
    const scope = refScope(registry, pack)
    return findRef(scope, ref) ? undefined : refProblem(scope, ref, 'table', ROLLABLE_KINDS)
  }

  /** A system made of these parts; undefined (and reported) when its rules are broken. */
  function build(
    pack: string,
    base: Omit<TravelSystem, 'rules' | 'bindings' | 'calendar' | 'weather' | 'sources'>,
    parts: {
      rules?: Extra
      bindings?: Extra
      calendar?: Extra
      weather: Record<string, WeatherModel>
      /** The `kind: system` naming these parts (absent for an implicit system). */
      system?: Extra
      sheet?: Extra
      partySheet?: Extra
      factions?: Extra
      clocks?: Extra
      world?: Extra
      items?: Extra[]
    },
  ): TravelSystem | undefined {
    let rules = NO_TRAVEL
    if (parts.rules) {
      const parsed = parseTravelRules(parts.rules.data)
      if (!parsed.rules) {
        problems.push(
          ...parsed.errors.map((e) =>
            problem(
              ownerOf(parts.rules!) ?? pack,
              parts.rules!.file,
              'travel-rules',
              e,
              parts.rules!.id,
            ),
          ),
        )
        return undefined
      }
      rules = parsed.rules
    }
    const bindings = parts.bindings ? bindingsOf.get(parts.bindings)?.bindings : undefined
    for (const [event, binding] of Object.entries(bindings?.on ?? {})) {
      if (!binding.weather || parts.weather[binding.weather]) continue
      const owner = ownerOf(parts.bindings!) ?? pack
      const written = (parts.bindings!.data as { on?: Record<string, { weather?: string }> }).on?.[
        event
      ]?.weather
      const scope = extrasScope(owner, 'weather')
      const known = written !== undefined && findRef(scope, written)
      problems.push(
        problem(
          owner,
          parts.bindings!.file,
          'bindings',
          `on.${event}.weather: ${
            known
              ? `The system doesn't bring the weather model "${written}" (weather: in kind: system)`
              : refProblem(scope, written ?? binding.weather, 'weather model', ['weather'])
          }`,
          parts.bindings!.id,
        ),
      )
    }
    let calendar: DataCalendar | undefined
    if (parts.calendar) {
      const errors = validateCalendar(parts.calendar.data)
      problems.push(
        ...errors.map((e) =>
          problem(
            ownerOf(parts.calendar!) ?? pack,
            parts.calendar!.file,
            'calendar',
            e,
            parts.calendar!.id,
          ),
        ),
      )
      if (!errors.length) calendar = calendarFrom(parts.calendar.data as unknown as CalendarDef)
    }
    // Parts of the day the rules name (`day.start: meal.breakfast`, `at: watch.middle`): the
    // calendar's own.
    if (parts.rules)
      for (const [path, ref] of partRefsOf(rules))
        if (!findPartRef((calendar ?? defaultCalendar).divisions ?? [], ref))
          problems.push(
            problem(
              ownerOf(parts.rules) ?? pack,
              parts.rules.file,
              'travel-rules',
              `${path}: the calendar has no part of the day "${ref}"`,
              parts.rules.id,
            ),
          )
    let sheet: TravelSystem['sheet']
    if (parts.sheet) {
      const owner = ownerOf(parts.sheet) ?? pack
      const parsed = parseSheet(parts.sheet.data)
      problems.push(
        ...parsed.errors.map((e) => problem(owner, parts.sheet!.file, 'sheet', e, parts.sheet!.id)),
      )
      if (parsed.sheet) sheet = { id: `${owner}/${parts.sheet.id ?? 'default'}`, def: parsed.sheet }
    }
    let partySheet: TravelSystem['partySheet']
    if (parts.partySheet) {
      const owner = ownerOf(parts.partySheet) ?? pack
      const parsed = parseSheet(parts.partySheet.data)
      problems.push(
        ...parsed.errors.map((e) =>
          problem(owner, parts.partySheet!.file, 'sheet', e, parts.partySheet!.id),
        ),
      )
      if (parsed.sheet)
        partySheet = { id: `${owner}/${parts.partySheet.id ?? 'default'}`, def: parsed.sheet }
    }
    let factions: SystemFactions | undefined
    if (parts.factions) {
      const owner = ownerOf(parts.factions) ?? pack
      const report = (e: string) =>
        problems.push(problem(owner, parts.factions!.file, 'factions', e, parts.factions!.id))
      const parsed = parseFactions(parts.factions.data)
      parsed.errors.forEach(report)
      if (parsed.factions) {
        const ref = parsed.factions.sheet
        const scope = extrasScope(owner, 'sheet')
        const [sheetPack, sheetId] = (findRef(scope, ref) ?? definitionId(ref, owner)).split('/', 2)
        const extra = extrasOf(sheetPack).find(
          (e) => e.kind === 'sheet' && (e.id ?? 'default') === sheetId,
        )
        const read = extra && parseSheet(extra.data)
        if (!extra) report(`sheet: ${refProblem(scope, ref, 'sheet', ['sheet'])}`)
        else
          read!.errors.forEach((e) =>
            problems.push(problem(sheetPack, extra.file, 'sheet', e, extra.id)),
          )
        // What each faction rolls on its turn must be something to roll.
        const tables = [
          ['turn', parsed.factions.turn],
          ...Object.entries(parsed.factions.factions).map(([id, f]) => [
            `factions.${id}.turn`,
            f.turn,
          ]),
        ] as const
        for (const [at, table] of tables) {
          if (!table) continue
          const full = definitionId(table, owner)
          // Another pack's that isn't loaded: the missing dependency is reported already.
          if (full.includes('/') && !registry.packs.has(full.split('/')[0])) continue
          const message = rollableProblem(owner, table)
          if (!message) continue
          const other = full.split('/')[0]
          // Another pack loaded without it: most likely an older version, or a copy of it.
          const older =
            full.includes('/') && other !== owner && !registry.definitions.has(full)
              ? ` (the loaded pack "${other}" has none: an older version of it, or your own copy made before it had one?)`
              : ''
          report(`${at}: ${message}${older}`)
        }
        // The map a faction's starting hexes are on must be one of the pack's.
        const bundles = registry.packs.get(owner)?.bundles ?? []
        for (const [id, f] of Object.entries(parsed.factions.factions))
          if (f.territory?.map && !bundles.includes(f.territory.map))
            report(`factions.${id}.territory.map: No map "${f.territory.map}" in this pack`)
        if (read?.sheet)
          factions = {
            id: `${owner}/${parts.factions.id ?? 'default'}`,
            pack: owner,
            def: parsed.factions,
            sheet: { id: `${sheetPack}/${sheetId}`, def: read.sheet },
          }
      }
    }
    let clocks: SystemClocks | undefined
    if (parts.clocks) {
      const owner = ownerOf(parts.clocks) ?? pack
      const report = (e: string) =>
        problems.push(problem(owner, parts.clocks!.file, 'clocks', e, parts.clocks!.id))
      const parsed = parseClocks(parts.clocks.data)
      parsed.errors.forEach(report)
      if (parsed.clocks) {
        clocks = { id: `${owner}/${parts.clocks.id ?? 'default'}`, pack: owner, def: parsed.clocks }
      }
    }
    let world: SystemWorld | undefined
    if (parts.world) {
      const owner = ownerOf(parts.world) ?? pack
      const report = (e: string, severity?: Diagnostic['severity']) =>
        problems.push(problem(owner, parts.world!.file, 'world', e, parts.world!.id, severity))
      const parsed = parseWorldRules(parts.world.data)
      parsed.errors.forEach((e) => report(e))
      if (parsed.rules) {
        const declared = Object.keys(clocks?.def.clocks ?? {})
        for (const [id, r] of Object.entries(parsed.rules.reactions)) {
          // What a step rolls must be something to roll.
          r.do.forEach((st, i) => {
            if (st.roll === undefined) return
            const full = definitionId(st.roll, owner)
            if (full.includes('/') && !registry.packs.has(full.split('/')[0])) return
            const message = rollableProblem(owner, st.roll)
            if (message) report(`reactions.${id}.do.${i}.roll: ${message}`)
          })
          // A clock the system doesn't declare may be made by hand (named by its name as an id).
          const list = Array.isArray(r.on) ? r.on : [r.on]
          list.forEach((m, j) => {
            const clock = typeof m === 'string' ? fullClockOf(m) : undefined
            if (clock && !declared.includes(clock))
              report(
                `reactions.${id}.on${Array.isArray(r.on) ? `.${j}` : ''}: the system declares no clock "${clock}": heard only if a clock made by hand has this name${declared.length ? ` (it declares ${declared.map(clockFullMoment).join(', ')})` : ''}`,
                'warning',
              )
          })
        }
        world = { id: `${owner}/${parts.world.id ?? 'default'}`, pack: owner, def: parsed.rules }
      }
    }
    if (parts.rules) {
      const owner = ownerOf(parts.rules) ?? pack
      const report = (path: string, e: string, severity?: Diagnostic['severity']) =>
        problems.push(
          problem(
            owner,
            parts.rules!.file,
            'travel-rules',
            `${path}: ${e}`,
            parts.rules!.id,
            severity,
          ),
        )
      // What a step rolls besides the system's checks must be something to roll.
      for (const [id, a] of Object.entries(rules.actions ?? {}))
        actionSteps(a).forEach((st, i) => {
          if (st.roll === undefined || refId('checks', st.roll)) return
          const full = definitionId(st.roll, owner)
          if (full.includes('/') && !registry.packs.has(full.split('/')[0])) return
          const message = rollableProblem(owner, st.roll)
          if (message) report(`actions.${id}.do.${i}.roll`, message)
        })
      // The moments of the world a trip hears: a clock filling. One the system doesn't
      // declare may be made by hand (named by its name as an id): only a warning.
      const declared = Object.keys(clocks?.def.clocks ?? {})
      const worldMoments = (value: Moments | undefined, path: string) =>
        momentsOf(value).forEach((m, j) => {
          if (!isHostMoment(m)) return
          const at = Array.isArray(value) ? `${path}.${j}` : path
          const id = /^world\.clocks\.(.+)\.full$/.exec(m)?.[1]
          if (!id)
            report(at, `expected world.clocks.<id>.full (the moments of the world a trip hears)`)
          else if (!declared.includes(id))
            report(
              at,
              `the system declares no clock "${id}": heard only if a clock made by hand has this name${declared.length ? ` (it declares ${declared.map((d) => `world.clocks.${d}.full`).join(', ')})` : ''}`,
              'warning',
            )
        })
      for (const [id, a] of Object.entries(rules.actions ?? {}))
        worldMoments(a.on, `actions.${id}.on`)
      ;(rules.checks ?? []).forEach((c, i) => worldMoments(c.at, `checks.${i}.at`))
    }
    if (parts.bindings && bindings)
      problems.push(
        ...membersBindings(bindings, sheet?.def, partySheet?.def).map((e) =>
          problem(
            ownerOf(parts.bindings!) ?? pack,
            parts.bindings!.file,
            'bindings',
            e,
            parts.bindings!.id,
          ),
        ),
      )
    if (parts.rules)
      problems.push(
        ...undeclaredEffects(
          registry,
          pack,
          rules,
          bindings,
          parts.rules.file,
          parts.rules.id,
          sheet?.def,
          factions,
          partySheet?.def,
          (parts.items ?? []).flatMap((e) =>
            typeof e.data.items === 'object' && e.data.items !== null
              ? Object.keys(e.data.items)
              : [],
          ),
        ),
      )
    // Its item catalogues, each field one its sheet declares.
    const items: { id: string; def: Catalogue }[] = []
    for (const extra of parts.items ?? []) {
      const owner = ownerOf(extra) ?? pack
      const report = (e: string, severity?: Diagnostic['severity']) =>
        problems.push(problem(owner, extra.file, 'items', e, extra.id, severity))
      const parsed = parseCatalogue(extra.data)
      parsed.errors.forEach((e) => report(e))
      if (!parsed.catalogue) continue
      const fields = sheet?.def.items?.fields ?? {}
      for (const [id, item] of Object.entries(parsed.catalogue.items))
        for (const key of Object.keys(item))
          if (!(ITEM_KEYS as readonly string[]).includes(key) && !(key in fields))
            report(
              `items.${id}.${key}: the sheet declares no item field "${key}" (items.fields in the sheet)`,
              'warning',
            )
      items.push({ id: `${owner}/${extra.id ?? 'default'}`, def: parsed.catalogue })
    }
    const source = (extra: Extra | undefined, owner: string): SystemSource | undefined =>
      extra && { pack: owner, id: extra.id ?? 'default', file: extra.file }
    return {
      ...base,
      rules,
      ...(bindings && { bindings: withPartyBounds(bindings, partySheet?.def) }),
      sources: {
        ...(parts.rules && { rules: source(parts.rules, ownerOf(parts.rules) ?? pack) }),
        ...(parts.bindings && {
          bindings: source(parts.bindings, ownerOf(parts.bindings) ?? pack),
        }),
        ...(parts.system && { system: source(parts.system, pack) }),
      },
      ...(calendar && { calendar }),
      ...(Object.keys(parts.weather).length && { weather: parts.weather }),
      ...(sheet && { sheet }),
      ...(partySheet && { partySheet }),
      ...(factions && { factions }),
      ...(clocks && { clocks }),
      ...(world && { world }),
      ...(items.length && { items }),
    }
  }
  const owners = new Map<Extra, string>()
  for (const [id] of registry.packs) for (const extra of extrasOf(id)) owners.set(extra, id)
  const ownerOf = (extra: Extra) => owners.get(extra)

  for (const [id, pack] of registry.packs) {
    const extras = extrasOf(id)
    const packName = typeof pack.manifest.name === 'string' ? pack.manifest.name : id
    const locale = typeof pack.manifest.locale === 'string' ? pack.manifest.locale : undefined
    const declared = extras.filter((e) => e.kind === 'system')
    if (!declared.length) {
      // An older pack: its travel rules make a system, with every pack's weather.
      const rules = extras.find((e) => e.kind === 'travel-rules')
      if (!rules) continue
      const system = build(
        id,
        { id, pack: id, name: packName, ...(locale && { locale }), packs: [id] },
        {
          rules,
          bindings: extras.find((e) => e.kind === 'bindings'),
          calendar: extras.find((e) => e.kind === 'calendar'),
          weather,
          sheet: extras.find((e) => e.kind === 'sheet'),
          factions: extras.find((e) => e.kind === 'factions'),
          clocks: extras.find((e) => e.kind === 'clocks'),
          world: extras.find((e) => e.kind === 'world'),
          items: extras.filter((e) => e.kind === 'items'),
        },
      )
      if (system) systems.push(system)
      continue
    }
    const dependencies = Object.keys(pack.manifest.dependencies ?? {})
    for (const def of declared) {
      const report = (path: string, message: string) =>
        problems.push(problem(id, def.file, 'system', `${path}: ${message}`, def.id))
      const data = def.data
      const localId = def.id ?? 'default'
      for (const key of Object.keys(data))
        if (!SYSTEM_KEYS.has(key)) report(key, `Unknown key "${key}" in a system`)
      /** A part named `kind.id` (this pack's) or `pack/kind.id` (a dependency's). */
      const part = (key: string, kind: string, ref: unknown): Extra | undefined => {
        if (ref === undefined) return undefined
        if (typeof ref !== 'string' || !ref)
          return void report(key, `Expected ${PART_NAMES[kind]} (${kind}.<id>)`)
        const scope = extrasScope(id, kind)
        const owner = definitionId(ref, id).split('/')[0]
        if (ref.includes('/') && owner !== id && !dependencies.includes(owner))
          return void report(key, `"${owner}" isn't a dependency of this pack`)
        const full = findRef(scope, ref)
        if (!full) return void report(key, refProblem(scope, ref, PART_NAMES[kind], [kind]))
        const [from, partId] = full.split('/', 2)
        return extrasOf(from).find((e) => e.kind === kind && (e.id ?? 'default') === partId)
      }
      const list = (key: string, value: unknown): string[] => {
        if (value === undefined) return []
        if (Array.isArray(value) && value.every((v) => typeof v === 'string')) return value
        report(key, 'Expected a list of ids')
        return []
      }
      const own: Record<string, WeatherModel> = {}
      list('weather', data.weather).forEach((ref, i) => {
        const model = part(`weather.${i}`, 'weather', ref)
        const key = definitionId(ref, id)
        if (model && weather[key]) own[key] = weather[key]
      })
      const packs = [id]
      list('packs', data.packs).forEach((other, i) => {
        if (other !== id && !dependencies.includes(other))
          report(`packs.${i}`, `"${other}" isn't a dependency of this pack`)
        else if (!packs.includes(other)) packs.push(other)
      })
      const bundles = registry.packs.get(id)?.bundles ?? []
      const maps = list('maps', data.maps).filter((path, i) => {
        if (bundles.includes(path)) return true
        report(
          `maps.${i}`,
          /\.otd\.json$/.test(path)
            ? `No map "${path}" in this pack`
            : `Expected the path of an OTD bundle in this pack (…/name.otd.json)`,
        )
        return false
      })
      for (const key of ['name', 'description'] as const)
        if (data[key] !== undefined && !isText(data[key])) report(key, 'Expected a text')
      const rules = part('travel', 'travel-rules', data.travel)
      if (data.travel !== undefined && !rules) continue
      const system = build(
        id,
        {
          id: localId === 'default' ? id : `${id}/${localId}`,
          pack: id,
          name: isText(data.name) ? data.name : packName,
          ...(isText(data.description) && { description: data.description }),
          ...(locale && { locale }),
          packs,
          ...(maps.length && { maps }),
        },
        {
          rules,
          bindings: part('bindings', 'bindings', data.bindings),
          calendar: part('calendar', 'calendar', data.calendar),
          weather: own,
          system: def,
          sheet: part('sheet', 'sheet', data.sheet),
          partySheet: part('partySheet', 'sheet', data.partySheet),
          factions: part('factions', 'factions', data.factions),
          clocks: part('clocks', 'clocks', data.clocks),
          world: part('world', 'world', data.world),
          items: list('items', data.items).flatMap(
            (ref, i) => part(`items.${i}`, 'items', ref) ?? [],
          ),
        },
      )
      if (system) systems.push(system)
    }
  }
  // The default system first: lists show it before the others, as the one a map plays
  // when it chooses none.
  const first = systems.findIndex((s) => s.id === DEFAULT_SYSTEM)
  if (first > 0) systems.unshift(...systems.splice(first, 1))
  return { systems, problems }
}

/**
 * What the bindings take from the members that their sheet doesn't have: a stat `from` a
 * value the sheet doesn't declare. Paths as `bindings.<…>: message`.
 */
function membersBindings(bindings: Bindings, sheet?: Sheet, partySheet?: Sheet): string[] {
  const out: string[] = []
  for (const [id, stat] of Object.entries(bindings.stats ?? {})) {
    const value = stat.from?.party
    if (value === undefined) continue
    if (!partySheet)
      out.push(
        `stats.${id}.from.party: the system has no party sheet (partySheet: in kind: system)`,
      )
    else if (!partySheet.values[value])
      out.push(`stats.${id}.from.party: The party sheet has no value "${value}"`)
  }
  const usesMembers =
    Object.values(bindings.stats ?? {}).some((s) => s.from && !s.from.party) ||
    Object.keys(bindings.roles ?? {}).length > 0
  if (usesMembers && !sheet)
    out.push(
      `bindings: Members' values are named, but the system has no sheet (sheet: in kind: system)`,
    )
  for (const [id, stat] of Object.entries(bindings.stats ?? {})) {
    const value = stat.from?.max ?? stat.from?.min ?? stat.from?.sum
    if (sheet && value !== undefined && !sheet.values[value])
      out.push(`stats.${id}.from: The members' sheet has no value "${value}"`)
  }
  return out
}

/**
 * Effects of a system (its actions, rests and checks, and its pack's tables, oracles and
 * decks) on values it doesn't declare: a stat missing from its bindings, a value or item
 * its sheets or catalogues don't have. Warnings: the effect still applies, but nobody names the value.
 */
function undeclaredEffects(
  registry: Registry,
  pack: string,
  rules: TravelRules,
  bindings: Bindings | undefined,
  file: string,
  rulesId = 'default',
  sheet?: Sheet,
  factions?: SystemFactions,
  partySheet?: Sheet,
  /** The ids of the items its catalogues have. */
  itemIds: string[] = [],
): Diagnostic[] {
  const out: Diagnostic[] = []
  const check = (effects: unknown, where: { file: string; at: string }) => {
    if (typeof effects !== 'object' || effects === null) return
    for (const path of Object.keys(effects)) {
      const statId = /^party\.stats\.(.+)$/.exec(path)?.[1]
      // A member's value or condition: its sheet's.
      const [, who, part, partId] = MEMBER_PATH.exec(path) ?? []
      // The party's own (`party.values.morale`): its party sheet's.
      const own = who === 'party' ? partySheet : sheet
      // A faction's (on a world turn): its sheet's values and conditions, and its
      // territory, which every faction has (Core's turn table, in a system without factions).
      const [, factionPart, factionId] =
        /^(?:faction|factions\.[^.]+)\.(values|conditions|territory)(?:\.(.+))?$/.exec(path) ?? []
      if (/^world\.clocks\./.test(path)) continue
      const factionKnown =
        factionPart === 'territory' ||
        (factions &&
          !!factionPart &&
          !!factions.sheet.def[factionPart as 'values' | 'conditions'][factionId ?? ''])
      if (factionKnown) continue
      // An item: one of its catalogues', or a field of it the sheet declares (the party's
      // items are its own and its members': either sheet's).
      const [itemId, field] = part === 'items' ? partId.split('.', 2) : []
      const fieldKnown = (f: string) =>
        !!own?.items?.fields?.[f] || (who === 'party' && !!sheet?.items?.fields?.[f])
      const known = part
        ? part === 'items'
          ? itemIds.includes(itemId) && (field === undefined || fieldKnown(field))
          : !!own?.[part as 'values' | 'conditions'][partId]
        : statId !== undefined
          ? !!bindings?.stats?.[statId]
          : false
      if (!known)
        out.push({
          severity: 'warning',
          message: part
            ? who === 'party'
              ? `Effect on "${path}", which the party sheet doesn't declare`
              : `Effect on "${path}", which the members' sheet doesn't declare`
            : `Effect on "${path}", which this system doesn't declare (stats in its bindings)`,
          pack,
          ...where,
        })
    }
  }
  for (const [action, own] of Object.entries(rules.actions ?? {}))
    if (own && typeof own === 'object' && 'effects' in own)
      check(own.effects, { file, at: `@travel-rules/${rulesId}.actions.${action}.effects` })
  ;(rules.checks ?? []).forEach((c, i) =>
    check(c.effects, { file, at: `@travel-rules/${rulesId}.checks.${i}.effects` }),
  )
  for (const def of registry.definitions.values()) {
    if (def.pack !== pack) continue
    const lists =
      def.kind === 'table'
        ? [def.entries]
        : def.kind === 'oracle'
          ? Object.values(def.variants).map((v) => v.entries)
          : def.kind === 'deck'
            ? [def.cards]
            : []
    for (const items of lists)
      for (const item of items)
        check(item.effects, { file: def.file, at: `${def.localId}.${item.key}.effects` })
  }
  return out
}

/** First day of each season in the default calendar. */
export const SEASON_START_DAYS = { spring: 1, summer: 91, autumn: 181, winter: 271 } as const
/** A season id: spring… in the default calendar; a system's calendar may have others. */
export type Season = string

/** The seasons trips of a system can start in, in order. */
export const seasonsFor = (system: TravelSystem): string[] =>
  system.calendar ? seasonsOf(system.calendar) : Object.keys(SEASON_START_DAYS)

/** The first day of a season in a system's calendar. */
export function seasonStart(system: TravelSystem, season: Season): number {
  if (system.calendar) return seasonStartDay(system.calendar, season)
  return SEASON_START_DAYS[season as keyof typeof SEASON_START_DAYS] ?? 1
}

/**
 * A new trip at `location`: first travel mode of the rules, dawn of the season's first
 * day, and the system's declared stats (values in `stats` win; any
 * stat the system doesn't declare, e.g. kept from a trip with another system, is dropped).
 */
export function startTrip(options: {
  system: TravelSystem
  location: string
  season?: Season
  stats?: Record<string, number>
  /** Start at this moment instead (e.g. the world clock's), whatever the season. */
  time?: number
  /** Seeds the trip's rolls in conditions and effects (`'{{1d20}}'`); the host picks one. */
  seed?: string
  /** The party's characters (of the system's sheet), in order. */
  members?: CharacterState[]
}): { startDay: number; session: SessionState } {
  const { rules, bindings } = options.system
  const calendar = calendarOf(options.system)
  const startDay =
    options.time !== undefined
      ? calendar.describe(options.time).day
      : seasonStart(options.system, options.season ?? seasonsFor(options.system)[0])
  const travel = initialTravelState({
    location: options.location,
    mode: Object.keys(rules.modes)[0],
    calendar,
    // When the system's trips start (`travel.start`; older rules: their dawn), else midnight.
    time: options.time ?? calendar.at(startDay, tripStart(rules, calendar)),
    ...(options.seed !== undefined && { seed: options.seed }),
  })
  const stats = Object.fromEntries(
    Object.entries(bindings?.stats ?? {}).map(([k, v]) => [
      k,
      options.stats?.[k] ?? v.default ?? 0,
    ]),
  )
  const session = initialSessionState(travel, stats)
  if (options.members?.length) session.members = structuredClone(options.members)
  // Its members, and the party's own sheet when the system has one.
  refreshParty(session, partyOf(options.system))
  return { startDay, session }
}

/** What a system says of its party's members: their sheet and its bindings. */
export const partyOf = (system: TravelSystem): PartyRules => ({
  sheet: system.sheet,
  partySheet: system.partySheet,
  bindings: system.bindings,
  ...(system.items && {
    items: lookupItems(system.items),
    itemIds: [...new Set(system.items.flatMap((c) => Object.keys(c.def.items)))],
  }),
})

/**
 * The host's facts with what the members' conditions block (`party.blocked`), for the
 * travel engine.
 */
function withBlocks(
  system: TravelSystem,
  session: SessionState,
  facts: Record<string, unknown>,
): Record<string, unknown> {
  const blocked = partyBlocks(session, partyOf(system))
  if (!Object.keys(blocked).length) return facts
  const party = facts.party
  return {
    ...facts,
    party: {
      ...(typeof party === 'object' && party !== null && !Array.isArray(party) ? party : {}),
      blocked,
    },
  }
}

/**
 * Runs one travel action through the session; bound checks are resolved by the Oracle.
 * With `discover` (and a system whose bindings have `discover`), empty hexes are decided
 * on the way: `discovered` is what the host should write on its map.
 */
export function stepTrip(
  options: {
    system: TravelSystem
    world: TravelWorld
    oracle?: OracleEngine
    locale?: string
    /** Turn discovery on, revealing the entered hex only or its neighbours too. */
    discover?: RevealMode
    /** For the weather (tables roll with the Oracle's own); seeded in tests and replays. */
    random?: RandomSource
    /** The host's facts for conditions and tables (the world clock's `clocks`, `events`). */
    facts?: Record<string, unknown>
  },
  session: SessionState,
  action: TravelAction,
): { state: SessionState; entries: JournalEntry[]; discovered: Record<string, DiscoveredHex> } {
  const { system } = options
  // The members' relations to the places they come to (`hex.related`).
  const world = relatedWorld(options.world, session.members)
  const discover = system.bindings?.discover
  const discovery =
    options.discover && discover && options.oracle
      ? createDiscovery({
          world,
          oracle: options.oracle,
          discover,
          reveal: options.discover,
          locale: options.locale,
        })
      : undefined
  const result = createSession({
    travel: createTravelEngine({
      world: discovery?.world ?? world,
      rules: system.rules,
      calendar: calendarOf(system),
      stats: system.bindings?.stats,
      // The party's values and items, so an action's later steps see what earlier ones did.
      kept: keptNumbers(session, partyOf(system)),
    }),
    oracle: options.oracle,
    bindings: system.bindings,
    pack: system.sources?.rules?.pack ?? system.pack,
    rules: system.rules,
    locale: options.locale,
    discovery,
    weather: system.weather,
    random: options.random,
    facts: options.facts,
    sheet: system.sheet,
    partySheet: system.partySheet,
    items: partyOf(system).items,
  }).step(session, action)
  return { ...result, discovered: Object.fromEntries(discovery?.found ?? []) }
}

/**
 * Settles what holds by itself in the trip's world as it is now, after a change by hand (a
 * member's card, the party's sheet): conditions that read the world (`trip.mode`, `time.*`,
 * `hex.*`) set or cleared, with their journal lines. The options are `stepTrip`'s.
 */
export function settleTrip(
  options: Omit<Parameters<typeof stepTrip>[0], 'discover' | 'oracle' | 'random'>,
  session: SessionState,
): { state: SessionState; entries: JournalEntry[] } {
  return handSession(options, session).settle(session)
}

/**
 * Answers the first share waiting (**Ask who gives**): what each member gives (negative)
 * or takes instead of the system's rule (absent: the rule's share stands), with its journal
 * line, then settled as after a change by hand. The options are `settleTrip`'s.
 */
export function shareTrip(
  options: Omit<Parameters<typeof stepTrip>[0], 'discover' | 'oracle' | 'random'>,
  session: SessionState,
  moved?: Record<string, number>,
): { state: SessionState; entries: JournalEntry[] } {
  return handSession(options, session).share(session, moved)
}

/** A session for changes by hand: no Oracle, no discovery. */
function handSession(
  options: Omit<Parameters<typeof stepTrip>[0], 'discover' | 'oracle' | 'random'>,
  session: SessionState,
) {
  const { system } = options
  return createSession({
    travel: createTravelEngine({
      world: relatedWorld(options.world, session.members),
      rules: system.rules,
      calendar: calendarOf(system),
      stats: system.bindings?.stats,
      kept: keptNumbers(session, partyOf(system)),
    }),
    bindings: system.bindings,
    pack: system.sources?.rules?.pack ?? system.pack,
    rules: system.rules,
    locale: options.locale,
    weather: system.weather,
    facts: options.facts,
    sheet: system.sheet,
    partySheet: system.partySheet,
    items: partyOf(system).items,
  })
}

/**
 * Bindings whose stats made of a party sheet's value have that value's bounds and default
 * (unless they give their own): so effects on `party.stats.<id>` keep within them.
 */
function withPartyBounds(bindings: Bindings, partySheet?: Sheet): Bindings {
  if (!partySheet || !bindings.stats) return bindings
  const stats = Object.fromEntries(
    Object.entries(bindings.stats).map(([id, stat]) => {
      const value = stat.from?.party ? partySheet.values[stat.from.party] : undefined
      if (!value) return [id, stat]
      const num = (v: unknown) => (typeof v === 'number' ? v : undefined)
      const min = stat.min ?? num(value.min)
      const max = stat.max ?? num(value.max)
      const fallback = stat.default ?? num(value.default)
      return [
        id,
        {
          ...stat,
          ...(min !== undefined && { min }),
          ...(max !== undefined && { max }),
          ...(fallback !== undefined && { default: fallback }),
        },
      ]
    }),
  )
  return { ...bindings, stats }
}

/** A world that knows nothing (for questions that don't need the map). */
const NO_WORLD: TravelWorld = {
  hexKm: 1,
  cell: () => null,
  neighbors: () => [],
  distance: () => 0,
  edges: () => [],
}

/**
 * A copy of a trip to work on. The UI may hand its reactive state (a proxy, which
 * `structuredClone` refuses); a trip is plain data, so JSON copies it whole.
 */
const copyOf = (session: SessionState): SessionState => JSON.parse(JSON.stringify(session))

/**
 * What the party can't do now and why, for the trip's buttons: `travel` and each action
 * by id (absent: available). A declared value blocks (`lost`), an action was done today,
 * or its `when` / `unless` (which see the map, the party and today's values).
 */
export function tripAvailability(
  options: { system: TravelSystem; world?: TravelWorld; facts?: Record<string, unknown> },
  session: SessionState,
): Record<string, Unavailable> {
  const engine = createTravelEngine({
    world: relatedWorld(options.world ?? NO_WORLD, session.members),
    rules: options.system.rules,
    calendar: calendarOf(options.system),
    stats: options.system.bindings?.stats,
    kept: keptNumbers(session, partyOf(options.system)),
  })
  const current = copyOf(session)
  refreshParty(current, partyOf(options.system))
  return engine.availability(
    current.travel,
    tripContext(
      current,
      withBlocks(options.system, current, options.facts ?? {}),
      {},
      partyOf(options.system),
    ),
  )
}

/**
 * What conditions and tables see now in a trip, as its checks would: the hex, the moment
 * (season, hour, daylight, the calendar), the trip, the party, today's values and the
 * host's facts. For rolls by hand during a trip.
 */
export function tripFacts(
  options: { system: TravelSystem; world?: TravelWorld; facts?: Record<string, unknown> },
  session: SessionState,
): Record<string, unknown> {
  const engine = createTravelEngine({
    world: relatedWorld(options.world ?? NO_WORLD, session.members),
    rules: options.system.rules,
    calendar: calendarOf(options.system),
    stats: options.system.bindings?.stats,
    kept: keptNumbers(session, partyOf(options.system)),
  })
  const current = copyOf(session)
  refreshParty(current, partyOf(options.system))
  const party = partyOf(options.system)
  const context = tripContext(current, options.facts ?? {}, {}, party)
  return tripContext(current, engine.context(current.travel, context), {}, party)
}
