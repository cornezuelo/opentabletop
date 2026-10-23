import type { Registry } from '@open-tabletop/oracle-engine'
import {
  localize,
  systemPackIds,
  systemUses,
  travelSystems,
  usesOf,
  type LocalizedText,
  type SheetScope,
  type TravelSystem,
  type Use,
} from '@open-tabletop/session'
import { appUrl } from '@open-tabletop/ui-kit'
import { packTexts } from './names'

/**
 * Where a use is, as the apps show it (Systems' **Used by**, the Oracle's **Rolled by**): what
 * the place is, its name in the UI's language, the part of it, and where it's edited.
 */

/** Which of a system's sheets a sheet definition is (by `pack/id`, or its id in a pack). */
export function sheetScope(system: TravelSystem, id: string): SheetScope | undefined {
  const is = (full: string | undefined) => !!full && (full === id || full.endsWith(`/${id}`))
  if (is(system.sheet?.id)) return 'members'
  if (is(system.partySheet?.id)) return 'party'
  if (is(system.factions?.sheet.id)) return 'factions'
  return undefined
}

/** What a place is, as the list names it (`uses.kinds` in the dictionaries). */
export type PlaceKind =
  | 'action'
  | 'check'
  | 'rules'
  | 'stat'
  | 'bindings'
  | 'sheet'
  | 'clock'
  | 'clocks'
  | 'faction'
  | 'factions'
  | 'weather'
  | 'table'
  | 'oracle'
  | 'generator'
  | 'deck'

/** A use as the list shows it: what the place is, its name, the part of it, and where to edit it. */
export interface UsePlaceShown {
  kind: PlaceKind
  name: string
  /** The rest of the path inside it (`when`, `modeWhen.advantage`, `entries.bandits.effects`). */
  part: string
  /** A tab of the system's page in Systems (`rules`, `checks`…), or a link to another app. */
  tab?: SystemTab
  href?: string
}

const ROLLABLE = ['table', 'oracle', 'generator', 'deck']

/** The tabs of a system's page in Systems that hold a use. */
export type SystemTab = 'rules' | 'checks' | 'sheet' | 'clocks' | 'factions' | 'weather'

/** A tab of a system's page in Systems, as a link from another app. */
export const systemTabUrl = (system: TravelSystem, tab: SystemTab) =>
  `${appUrl('systems')}#/system/${encodeURIComponent(system.id)}/${tab}`

export function shownPlace(
  system: TravelSystem,
  use: Use,
  registry: Registry,
  locale: string,
): UsePlaceShown {
  const text = (t: LocalizedText | undefined) => localize(t, locale, system.locale)
  const { kind, pack, id, path } = use.at
  if (ROLLABLE.includes(kind)) {
    const def = registry.definitions.get(`${pack}/${id}`)
    const names = packTexts(
      () => registry,
      () => locale,
    )
    return {
      kind: kind as PlaceKind,
      name: names.displayName(def, id),
      part: path,
      href: `${appUrl('oracle')}#/def/${encodeURIComponent(pack)}/${encodeURIComponent(id)}/edit`,
    }
  }
  // The first part of the path names the thing inside the definition (`actions.march`).
  const [, head, key, index, rest = ''] =
    /^([^.[]+)(?:\.([^.[]+)|\[(\d+)\])?(?:\.?(.*))?$/.exec(path) ?? []
  const part = rest.replace(/^\./, '')
  const named = (kindKey: PlaceKind, name: LocalizedText | undefined, tab: SystemTab) => ({
    kind: kindKey,
    name: text(name) ?? key ?? head,
    part,
    tab,
  })
  switch (kind) {
    case 'travel-rules': {
      if (head === 'actions' && key) {
        const action = system.rules.actions?.[key] as { name?: LocalizedText } | undefined
        return named('action', action?.name, 'rules')
      }
      if (head === 'checks' && index !== undefined) {
        const check = system.rules.checks?.[Number(index)]
        return {
          ...named('check', check?.name, 'checks'),
          name: text(check?.name) ?? check?.event ?? '',
        }
      }
      return { kind: 'rules', name: head, part: path.slice(head.length + 1), tab: 'rules' }
    }
    case 'bindings':
      if (head === 'stats' && key)
        return named('stat', system.bindings?.stats?.[key]?.name, 'checks')
      return { kind: 'bindings', name: key ?? head, part, tab: 'checks' }
    case 'sheet': {
      const scope = sheetScope(system, id)
      const sheet = {
        members: system.sheet,
        party: system.partySheet,
        factions: system.factions?.sheet,
      }[scope ?? 'members']?.def
      const value = head === 'values' && key ? sheet?.values[key] : undefined
      return named('sheet', value?.name, 'sheet')
    }
    case 'clocks':
      if (head === 'clocks' && key)
        return named('clock', system.clocks?.def.clocks[key]?.name, 'clocks')
      return { kind: 'clocks', name: id, part: path, tab: 'clocks' }
    case 'factions':
      if (head === 'factions' && key)
        return named('faction', system.factions?.def.factions[key]?.name, 'factions')
      return { kind: 'factions', name: id, part: path, tab: 'factions' }
    case 'weather':
      return { kind: 'weather', name: id, part: path, tab: 'weather' }
    default:
      return { kind: 'rules', name: id, part: path }
  }
}

const indexes = new WeakMap<Registry, Map<string, Use[]>>()

/**
 * Who rolls a table, oracle, generator or deck: the places that name it in every system
 * whose packs hold it (its steps, checks' bindings, clocks, other tables), each with its
 * system, a place shared by several systems (Core's) once.
 */
export function rolledBy(
  registry: Registry,
  def: { pack: string; kind: string; localId: string },
): { system: TravelSystem; use: Use }[] {
  let index = indexes.get(registry)
  if (!index) indexes.set(registry, (index = new Map()))
  const out: { system: TravelSystem; use: Use }[] = []
  const seen = new Set<string>()
  for (const system of travelSystems(registry).systems) {
    if (!systemPackIds(system, registry).includes(def.pack)) continue
    let uses = index.get(system.id)
    if (!uses) index.set(system.id, (uses = systemUses(registry, system)))
    const declared = { kind: 'rollable', id: `${def.kind}.${def.localId}`, pack: def.pack } as const
    for (const use of usesOf(uses, declared, system)) {
      const key = `${use.at.pack}/${use.at.kind}/${use.at.id}/${use.at.path}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ system, use })
    }
  }
  return out
}
