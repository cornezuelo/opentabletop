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

/** The systems this map can be played with: the generic one and its packs' (Map settings → Map). */
export function playSystems(): TravelSystem[] {
  const packs = editor.meta.packs
  return load().filter((s) => !s.pack || !packs || packs.includes(s.pack))
}

export function getSystem(id: string): TravelSystem {
  const systems = load()
  return systems.find((s) => s.id === id) ?? systems[0]
}

export function oracle(): OracleEngine {
  return library.engine
}
