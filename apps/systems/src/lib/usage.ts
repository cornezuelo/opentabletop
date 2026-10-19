import { packTexts } from '@open-tabletop/oracle-ui'
import {
  declaredOf,
  localize,
  systemUses,
  usesOf,
  type Declared,
  type LocalizedText,
  type SheetScope,
  type TravelSystem,
  type Use,
} from '@open-tabletop/session'
import { FACT_GROUPS } from '@open-tabletop/travel-engine'
import { appUrl } from '@open-tabletop/ui-kit'
import { getLocale } from './i18n'
import type { Tab } from './nav.svelte'
import { library } from './packs.svelte'

/** Where a system's names are used (`docs/used-by.md`): the index, and how to show a use. */

const cache = new WeakMap<TravelSystem, Use[]>()

/** Every use of a name in the system's packs (systems are made again when packs change). */
export function usesIn(system: TravelSystem): Use[] {
  let uses = cache.get(system)
  if (!uses) {
    uses = systemUses(library.registry, system)
    cache.set(system, uses)
  }
  return uses
}

/** The uses of one thing the system declares. */
export const usesFor = (system: TravelSystem, declared: Declared): Use[] =>
  usesOf(usesIn(system), declared, system)

/** Which of a system's sheets a sheet definition is (by `pack/id`, or its id in a pack). */
export function sheetScope(system: TravelSystem, id: string): SheetScope | undefined {
  const is = (full: string | undefined) => !!full && (full === id || full.endsWith(`/${id}`))
  if (is(system.sheet?.id)) return 'members'
  if (is(system.partySheet?.id)) return 'party'
  if (is(system.factions?.sheet.id)) return 'factions'
  return undefined
}

/**
 * The names the system's own parts declare, as full names (`party.stats.morale`), and those
 * the engines give every system (`hex.*`, `trip.*`…): a name in neither is likely a typo.
 */
export function knownName(system: TravelSystem, name: string): boolean {
  const first = name.split('.')[0]
  if ((FACT_GROUPS as readonly string[]).includes(first)) return true
  if (['from', 'around', 'token', 'icon', 'params'].includes(first)) return true
  const uses = usesIn(system)
  return declaredOf(library.registry, system).some((d) =>
    usesOf(uses, d, system).some((u) => u.name === name || u.written === name),
  )
}

/** What a place is, as the list names it (`uses.kinds` in the dictionaries). */
export type PlaceKind =
  | 'action'
  | 'check'
  | 'rules'
  | 'stat'
  | 'carried'
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
  /** A tab of this system, or a link to another app. */
  tab?: Tab
  href?: string
}

const ROLLABLE = ['table', 'oracle', 'generator', 'deck']

export function shownPlace(system: TravelSystem, use: Use): UsePlaceShown {
  const locale = getLocale()
  const text = (t: LocalizedText | undefined) => localize(t, locale, system.locale)
  const { kind, pack, id, path } = use.at
  if (ROLLABLE.includes(kind)) {
    const def = library.registry.definitions.get(`${pack}/${id}`)
    const names = packTexts(
      () => library.registry,
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
  const named = (kindKey: PlaceKind, name: LocalizedText | undefined, tab: Tab) => ({
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
      if (head === 'resources' && key) return named('carried', undefined, 'checks')
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
