import { formatDiagnostic, type OracleEngine, type Registry } from '@open-tabletop/oracle-engine'
import { travelSystems, type TravelSystem } from '@open-tabletop/session'
import { library } from './packs'

export type PlaySystem = TravelSystem

let loaded: { registry: Registry; systems: TravelSystem[] } | null = null

/** Systems of the loaded packs, recomputed when the packs change (e.g. a user pack). */
function load(): TravelSystem[] {
  const registry = library.registry
  if (loaded?.registry === registry) return loaded.systems
  for (const d of library.loaded.diagnostics) console.warn(`[packs] ${formatDiagnostic(d)}`)
  const { systems, problems } = travelSystems(registry)
  for (const p of problems) console.warn(`[packs] ${p}`)
  loaded = { registry, systems }
  return systems
}

export function playSystems(): TravelSystem[] {
  return load()
}

export function getSystem(id: string): TravelSystem {
  const systems = load()
  return systems.find((s) => s.id === id) ?? systems[0]
}

export function oracle(): OracleEngine {
  return library.engine
}
