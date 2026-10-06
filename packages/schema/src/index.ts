import { z } from 'zod'

/**
 * OpenTabletop Data (OTD) v0.1 — the common format for campaign data shared by the
 * ecosystem's tools (see docs/otd.md). Tools read the parts they know and must keep
 * everything else (`ext` namespaces, unknown entities) intact when saving.
 */
export const OTD_VERSION = '0.1.0'

const id = z.string().min(1)
/** Offset hex coordinates "col,row". */
const hexKey = z.string().regex(/^\d+,\d+$/, 'hex keys look like "col,row"')
/** Free per-namespace extension data: ext.hexmapper, ext['kal-arath']… */
const ext = z.record(z.string(), z.unknown())

const entity = {
  id,
  name: z.string().optional(),
  tags: z.array(z.string()).optional(),
  noteRef: z.string().optional(),
  refs: z.array(z.string()).optional(),
  ext: ext.optional(),
}

export const location = z.object({ map: id, hex: hexKey })

export const hex = z
  .object({
    terrain: z.string().optional(),
    name: z.string().optional(),
    /** Short, optional GM notes (Markdown); lore lives behind noteRef. */
    notes: z.string().optional(),
    noteRef: z.string().optional(),
    tags: z.array(z.string()).optional(),
    stats: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
    elevation: z.number().optional(),
    danger: z.number().optional(),
    region: z.string().optional(),
    ext: ext.optional(),
  })
  .loose()

export const terrain = z
  .object({
    id,
    name: z.string().optional(),
    color: z.string(),
    water: z.boolean().optional(),
    biome: z.string().optional(),
    tags: z.array(z.string()).optional(),
  })
  .loose()

export const path = z
  .object({
    id,
    kind: z.string().min(1),
    /** Every hex crossed, in order (consecutive hexes are neighbors: travel edges). */
    hexes: z.array(hexKey).min(2),
    /** Indices of drawn vertices; absent = every hex. */
    nodes: z.array(z.number().int().nonnegative()).optional(),
    offsets: z.array(z.tuple([z.number(), z.number()]).nullable()).optional(),
    straight: z.boolean().optional(),
    ext: ext.optional(),
  })
  .loose()

export const map = z
  .object({
    ...entity,
    type: z.literal('map'),
    grid: z.object({
      orientation: z.enum(['flat', 'pointy']),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
      coordFormat: z.enum(['CCRR', 'axial']).optional(),
    }),
    scale: z.object({ hexKm: z.number().positive() }).optional(),
    terrains: z.array(terrain),
    hexes: z.record(hexKey, hex),
    paths: z.array(path).optional(),
  })
  .loose()

export const poi = z
  .object({
    ...entity,
    type: z.literal('poi'),
    location,
    kind: z.string().optional(),
    description: z.string().optional(),
    discovered: z.boolean().optional(),
  })
  .loose()

export const party = z
  .object({
    ...entity,
    type: z.literal('party'),
    location: location.optional(),
    members: z.array(z.string()).optional(),
    stats: z.record(z.string(), z.number()).optional(),
    /** Travel Engine state (see docs/travel-engine.md); owned by that engine. */
    travel: z.record(z.string(), z.unknown()).optional(),
  })
  .loose()

export const character = z
  .object({
    ...entity,
    type: z.literal('character'),
    stats: z.record(z.string(), z.unknown()).optional(),
  })
  .loose()

export const faction = z
  .object({
    ...entity,
    type: z.literal('faction'),
    stats: z.record(z.string(), z.unknown()).optional(),
    clocks: z.array(z.string()).optional(),
  })
  .loose()

export const clock = z
  .object({
    ...entity,
    type: z.literal('clock'),
    segments: z.number().int().positive(),
    filled: z.number().int().nonnegative(),
    kind: z.string().optional(),
  })
  .loose()

export const logEntry = z
  .object({
    id,
    /** Game time in minutes since the campaign start. */
    time: z.number().nonnegative(),
    /** Real-world ISO timestamp. */
    at: z.string(),
    source: z.string(),
    code: z.string(),
    text: z.string().optional(),
    data: z.record(z.string(), z.unknown()).optional(),
    refs: z.array(z.string()).optional(),
  })
  .loose()

export const campaign = z
  .object({
    ...entity,
    type: z.literal('campaign'),
    system: z.string().optional(),
    packs: z.array(z.object({ id: z.string(), version: z.string().optional() })).optional(),
    calendar: z.record(z.string(), z.unknown()).optional(),
    time: z.number().nonnegative().optional(),
  })
  .loose()

export const bundle = z
  .object({
    otd: z.string().regex(/^\d+\.\d+\.\d+$/),
    campaign: campaign.nullable().optional(),
    maps: z.array(map).default([]),
    pois: z.array(poi).default([]),
    parties: z.array(party).default([]),
    characters: z.array(character).default([]),
    factions: z.array(faction).default([]),
    clocks: z.array(clock).default([]),
    log: z.array(logEntry).default([]),
    /** Engine runtime state, keyed by engine (oracle, weather…). */
    state: z.record(z.string(), z.unknown()).default({}),
  })
  .loose()

export type OtdBundle = z.infer<typeof bundle>
export type OtdMap = z.infer<typeof map>
export type OtdHex = z.infer<typeof hex>
export type OtdPath = z.infer<typeof path>
export type OtdTerrain = z.infer<typeof terrain>
export type OtdPoi = z.infer<typeof poi>
export type OtdParty = z.infer<typeof party>
export type OtdLogEntry = z.infer<typeof logEntry>
export type OtdCampaign = z.infer<typeof campaign>

export interface ValidationResult {
  bundle?: OtdBundle
  /** "maps[0].hexes.3,4.terrain: Expected string" */
  errors: string[]
}

/** Validates (and fills defaults of) an OTD bundle. Newer major versions are rejected. */
export function validateBundle(raw: unknown): ValidationResult {
  const parsed = bundle.safeParse(raw)
  if (!parsed.success)
    return {
      errors: parsed.error.issues.map(
        (i) => `${i.path.map(String).join('.') || 'bundle'}: ${i.message}`,
      ),
    }
  const [major] = parsed.data.otd.split('.').map(Number)
  const [current] = OTD_VERSION.split('.').map(Number)
  if (major > current)
    return { errors: [`otd: version ${parsed.data.otd} is newer than supported ${OTD_VERSION}`] }
  return { bundle: parsed.data, errors: [] }
}

export function isBundle(raw: unknown): boolean {
  return (
    typeof raw === 'object' && raw !== null && typeof (raw as { otd?: unknown }).otd === 'string'
  )
}

/** JSON Schema of the bundle, for other languages and tools. */
export function bundleJsonSchema(): unknown {
  return z.toJSONSchema(bundle, { io: 'input' })
}

export const FILE_EXTENSION = '.otd.json'
