import { validateBundle } from '@open-tabletop/schema'
import type { TravelSystem } from '@open-tabletop/session'
import { library } from './packs.svelte'
import { systemRoot } from './newSystem'

/** An example map a system lists: its file in the pack and the map's name, or what's wrong. */
export interface SystemMap {
  path: string
  name?: string
  /** Set when the file isn't an OTD bundle with a map. */
  error?: string
}

/** What a file holds: the name of its first map, or why it isn't a map file. */
export function readMap(json: string): { name: string } | { error: string } {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    return { error: 'notJson' }
  }
  if (validateBundle(raw).errors.length) return { error: 'notBundle' }
  const map = (raw as { maps?: { id: string; name?: string }[] }).maps?.[0]
  return map ? { name: map.name || map.id } : { error: 'noMap' }
}

/** The maps a system's definition lists (`maps:`), as written (missing ones included). */
export function systemMaps(system: TravelSystem, listed: string[]): SystemMap[] {
  const root = systemRoot(system)
  return listed.map((path) => {
    const json = root === undefined ? undefined : library.readFile(root, path)
    if (json === undefined) return { path, error: 'missing' }
    return { path, ...readMap(json) }
  })
}

/**
 * Where a map file goes in a pack: `maps/<its name>.otd.json`, with a number when the
 * pack already has a file there.
 */
export function mapPath(fileName: string, taken: (path: string) => boolean): string {
  const base =
    fileName
      .replace(/\.otd\.json$|\.json$/i, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'map'
  for (let n = 1; ; n++) {
    const path = `maps/${base}${n > 1 ? `-${n}` : ''}.otd.json`
    if (!taken(path)) return path
  }
}
