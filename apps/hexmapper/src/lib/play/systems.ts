import { formatDiagnostic, type OracleEngine, type Registry } from '@open-tabletop/oracle-engine'
import { parseBindings, type Bindings } from '@open-tabletop/session'
import {
  genericTravelRules,
  parseTravelRules,
  type TravelRules,
} from '@open-tabletop/travel-engine'
import { library } from './packs'

export interface PlaySystem {
  /** Pack id, or 'generic' for the built-in rules. */
  id: string
  name: string
  rules: TravelRules
  bindings?: Bindings
}

interface Loaded {
  registry: Registry
  systems: PlaySystem[]
}

let loaded: Loaded | null = null

/** Systems of the loaded packs, recomputed when the packs change (e.g. a user pack). */
function load(): Loaded {
  const registry = library.registry
  if (loaded?.registry === registry) return loaded
  for (const d of library.loaded.diagnostics) console.warn(`[packs] ${formatDiagnostic(d)}`)
  const systems: PlaySystem[] = [{ id: 'generic', name: '', rules: genericTravelRules }]
  for (const [id, pack] of registry.packs) {
    const extras = registry.extras.get(id) ?? []
    const rulesRaw = extras.find((e) => e.kind === 'travel-rules')
    if (!rulesRaw) continue
    const { rules, errors } = parseTravelRules(rulesRaw.data)
    if (!rules) {
      for (const e of errors) console.warn(`[packs] ${id} travel-rules: ${e}`)
      continue
    }
    const bindingsRaw = extras.find((e) => e.kind === 'bindings')
    const bindings = bindingsRaw ? parseBindings(bindingsRaw.data, id).bindings : undefined
    const name = typeof pack.manifest.name === 'string' ? pack.manifest.name : id
    systems.push({ id, name, rules, bindings })
  }
  loaded = { registry, systems }
  return loaded
}

export function playSystems(): PlaySystem[] {
  return load().systems
}

export function getSystem(id: string): PlaySystem {
  const systems = load().systems
  return systems.find((s) => s.id === id) ?? systems[0]
}

export function oracle(): OracleEngine {
  return library.engine
}
