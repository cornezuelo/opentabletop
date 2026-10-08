import { formatDiagnostic, type OracleEngine, type Registry } from '@open-tabletop/oracle-engine'
import { travelSystems, type TravelSystem } from '@open-tabletop/session'
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

/** The systems a map can be played with: the generic one and every loaded pack's. */
export function playSystems(): TravelSystem[] {
  return load()
}

export function getSystem(id: string): TravelSystem {
  const systems = load()
  return systems.find((s) => s.id === id) ?? systems[0]
}

/** The id of the system the map is played with (Map settings → Map → System). */
export const mapSystemId = (): string => editor.meta.system ?? 'generic'

/** The system the map is played with (the generic one if its pack isn't loaded). */
export const mapSystem = (): TravelSystem => getSystem(mapSystemId())

/**
 * The system in use now: the trip's (the one it was started with), or the map's when no
 * trip has started.
 */
export const activeSystem = (): TravelSystem =>
  getSystem(editor.play?.rules?.system ?? mapSystemId())

/**
 * The packs the map works with: its system's and the ones it adds (Map settings → Map);
 * undefined = every loaded pack.
 */
export function mapPacks(): string[] | undefined {
  const extra = editor.meta.packs
  if (!extra) return undefined
  return [...new Set([...mapSystem().packs, ...extra])]
}

export function oracle(): OracleEngine {
  return library.engine
}
