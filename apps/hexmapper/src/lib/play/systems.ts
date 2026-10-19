import { formatDiagnostic, type OracleEngine, type Registry } from '@open-tabletop/oracle-engine'
import {
  missingSystem,
  systemIdOf,
  systemUses,
  travelSystems,
  type TravelSystem,
  type Use,
} from '@open-tabletop/session'
import { editor } from '../store/editor.svelte'
import { library } from './packs'

export type PlaySystem = TravelSystem

let loaded: { registry: Registry; systems: TravelSystem[] } | null = null

/** Systems of the loaded packs, recomputed when the packs change (e.g. a user pack). */
function load(): TravelSystem[] {
  const registry = library.registry
  if (loaded?.registry === registry) return loaded.systems
  for (const d of library.loaded.diagnostics) console.warn(`[packs] ${formatDiagnostic(d)}`)
  const { systems, problems } = travelSystems(registry)
  for (const p of problems) console.warn(`[packs] ${formatDiagnostic(p)}`)
  loaded = { registry, systems }
  return systems
}

/** The systems a map can be played with: every loaded pack's, Core's (the default) first. */
export function playSystems(): TravelSystem[] {
  return load()
}

/** A system by id (`generic` is Core's); one that doesn't travel if its pack isn't loaded. */
export function getSystem(id: string): TravelSystem {
  const wanted = systemIdOf(id)
  return load().find((s) => s.id === wanted) ?? missingSystem(wanted)
}

/**
 * The id of the system the map is played with: its campaign's (Map settings → Campaign →
 * System; none: Core's).
 */
export const mapSystemId = (): string => systemIdOf(editor.setup.system)

/** The system the map is played with (one that doesn't travel if its pack isn't loaded). */
export const mapSystem = (): TravelSystem => getSystem(mapSystemId())

/**
 * The system in use now: the trip's (the one it was started with), or the map's when no
 * trip has started.
 */
export const activeSystem = (): TravelSystem =>
  getSystem(editor.play?.rules?.system ?? mapSystemId())

/**
 * The packs the map works with: its system's and the ones its campaign adds (Map settings);
 * undefined = every loaded pack.
 */
export function mapPacks(): string[] | undefined {
  const extra = editor.setup.packs
  if (!extra) return undefined
  return [...new Set([...mapSystem().packs, ...extra])]
}

export function oracle(): OracleEngine {
  return library.engine
}

const uses = new WeakMap<TravelSystem, Use[]>()

/** Where a system's names are used (for the trip panel's help), once per loaded system. */
export function systemUsesOf(system: TravelSystem): Use[] {
  let found = uses.get(system)
  if (!found) {
    found = system.pack ? systemUses(library.registry, system) : []
    uses.set(system, found)
  }
  return found
}
