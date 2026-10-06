import {
  createOracleEngine,
  formatDiagnostic,
  loadPacks,
  type OracleEngine,
} from '@open-tabletop/oracle-engine'
import { mathRandom } from '@open-tabletop/random'
import { parseBindings, type Bindings } from '@open-tabletop/session'
import {
  genericTravelRules,
  parseTravelRules,
  type TravelRules,
} from '@open-tabletop/travel-engine'

/**
 * Packs bundled at build time: open ones from packs/ and, locally, personal-use ones
 * from packs-private/ (git-ignored; the glob is simply empty when it's missing).
 */
const files = {
  ...import.meta.glob('../../../../../packs/**/*.{yaml,yml,json}', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  ...import.meta.glob('../../../../../packs-private/**/*.{yaml,yml,json}', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
} as Record<string, string>

export interface PlaySystem {
  /** Pack id, or 'generic' for the built-in rules. */
  id: string
  name: string
  rules: TravelRules
  bindings?: Bindings
}

interface Loaded {
  systems: PlaySystem[]
  oracle: OracleEngine
  locale: Record<string, string>
}

let loaded: Loaded | null = null

function load(): Loaded {
  if (loaded) return loaded
  const packFiles = Object.entries(files).map(([path, content]) => ({
    path: path.replace(/^.*\/packs(-private)?\//, ''),
    content,
  }))
  const { registry, diagnostics } = loadPacks(packFiles)
  for (const d of diagnostics) console.warn(`[packs] ${formatDiagnostic(d)}`)
  const systems: PlaySystem[] = [{ id: 'generic', name: '', rules: genericTravelRules }]
  const locale: Record<string, string> = {}
  for (const [id, pack] of registry.packs) {
    locale[id] = pack.manifest.locale
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
  loaded = { systems, oracle: createOracleEngine({ registry, random: mathRandom() }), locale }
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
  return load().oracle
}
