import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import { emptyKept, isPack, isRecord, isTrip, characterIdOf, type Kept } from './kept'
import { keyOf } from './items'

/**
 * An export: a .zip holding `opentabletop-export.json` (what it holds, and the names and
 * times of library entries), each pack in `packs/<root>/` as pack folders are (so the
 * Oracle's **Import .zip** reads them too), and one JSON file per map (`maps/`, as the map
 * library keeps it), campaign (`campaigns/`), trip (`trips/`) and character
 * (`characters/`, its roster entry). Each keeps its own format's version, migrated by its
 * app when read.
 */
export const EXPORT_FORMAT = 'opentabletop-export'
export const EXPORT_VERSION = 1
export const EXPORT_MANIFEST = 'opentabletop-export.json'

interface Manifest {
  format: typeof EXPORT_FORMAT
  version: number
  created: string
  packs: { root: string; basedOn?: Record<string, string> }[]
  maps: { id: string; name: string; modified: string }[]
  campaigns: { id: string; name: string; modified: string }[]
}

const file = (id: string) => `${encodeURIComponent(id)}.json`

/** The chosen things of `kept` (by item key) as an export's .zip. */
export function writeExport(
  kept: Kept,
  chosen: ReadonlySet<string>,
  created: string = new Date().toISOString(),
): Uint8Array {
  const files: Record<string, Uint8Array> = {}
  const packs = kept.packs.filter((p) => chosen.has(keyOf('pack', p.root)))
  const maps = kept.maps.filter((m) => chosen.has(keyOf('map', m.id)))
  const campaigns = kept.campaigns.filter((c) => chosen.has(keyOf('campaign', c.id)))
  for (const pack of packs)
    for (const f of pack.files) files[`packs/${pack.root}/${f.path}`] = strToU8(f.content)
  for (const map of maps) files[`maps/${file(map.id)}`] = strToU8(map.json)
  for (const campaign of campaigns) files[`campaigns/${file(campaign.id)}`] = strToU8(campaign.json)
  for (const trip of kept.trips)
    if (chosen.has(keyOf('trip', trip.id as string)))
      files[`trips/${file(trip.id as string)}`] = strToU8(JSON.stringify(trip))
  for (const entry of kept.characters) {
    const id = characterIdOf(entry)!
    if (chosen.has(keyOf('character', id)))
      files[`characters/${file(id)}`] = strToU8(JSON.stringify(entry))
  }
  const manifest: Manifest = {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    created,
    packs: packs.map((p) => ({ root: p.root, ...(p.basedOn && { basedOn: p.basedOn }) })),
    maps: maps.map(({ id, name, modified }) => ({ id, name, modified })),
    campaigns: campaigns.map(({ id, name, modified }) => ({ id, name, modified })),
  }
  files[EXPORT_MANIFEST] = strToU8(JSON.stringify(manifest, null, 2))
  return zipSync(files)
}

export type ExportError = 'invalid' | 'newer'

/** Reads an export's .zip back into what it holds. */
export function readExport(data: Uint8Array): {
  kept?: Kept
  created?: string
  error?: ExportError
} {
  let entries: Record<string, Uint8Array>
  try {
    entries = unzipSync(data)
  } catch {
    return { error: 'invalid' }
  }
  const text = (path: string) => (entries[path] ? strFromU8(entries[path]) : undefined)
  let manifest: unknown
  try {
    manifest = JSON.parse(text(EXPORT_MANIFEST) ?? '')
  } catch {
    return { error: 'invalid' }
  }
  if (
    !isRecord(manifest) ||
    manifest.format !== EXPORT_FORMAT ||
    typeof manifest.version !== 'number'
  )
    return { error: 'invalid' }
  if (manifest.version > EXPORT_VERSION) return { error: 'newer' }
  const list = (value: unknown) => (Array.isArray(value) ? value.filter(isRecord) : [])
  const json = (path: string): unknown => {
    try {
      return JSON.parse(text(path) ?? '')
    } catch {
      return undefined
    }
  }
  const kept = emptyKept()
  for (const p of list(manifest.packs)) {
    if (typeof p.root !== 'string' || !p.root) continue
    const base = `packs/${p.root}/`
    const pack = {
      root: p.root,
      files: Object.keys(entries)
        .filter((path) => path.startsWith(base) && !path.endsWith('/'))
        .map((path) => ({ path: path.slice(base.length), content: text(path)! })),
      ...(isRecord(p.basedOn) && { basedOn: p.basedOn as Record<string, string> }),
    }
    if (isPack(pack) && pack.files.length) kept.packs.push(pack)
  }
  const library = (folder: string, rows: unknown) =>
    list(rows).flatMap((row) => {
      if (typeof row.id !== 'string' || !row.id) return []
      const content = text(`${folder}/${file(row.id)}`)
      if (content === undefined) return []
      const name = typeof row.name === 'string' ? row.name : ''
      const modified = typeof row.modified === 'string' ? row.modified : ''
      return [{ id: row.id, name, modified, json: content }]
    })
  kept.maps = library('maps', manifest.maps)
  kept.campaigns = library('campaigns', manifest.campaigns)
  for (const path of Object.keys(entries).sort()) {
    if (path.startsWith('trips/') && path.endsWith('.json')) {
      const trip = json(path)
      if (isTrip(trip)) kept.trips.push(trip)
    } else if (path.startsWith('characters/') && path.endsWith('.json')) {
      const entry = json(path)
      if (characterIdOf(entry)) kept.characters.push(entry as Record<string, unknown>)
    }
  }
  return { kept, created: typeof manifest.created === 'string' ? manifest.created : '' }
}

/** The file name of an export made at `created`, by the local date. */
export function exportFileName(created: string): string {
  const date = new Date(created)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${EXPORT_FORMAT}-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.zip`
}
