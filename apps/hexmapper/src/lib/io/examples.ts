import { systemName, type TravelSystem } from '@open-tabletop/session'
import { library } from '../play/packs'
import { playSystems } from '../play/systems'

/**
 * Example maps: the OTD bundles each loaded system lists under `maps:` (files of its
 * pack, like any saved map). They open as maps of the library, so play and changes are
 * kept like on any other map.
 */
export interface ExampleMap {
  /** Map id inside the bundle (also its id in the library). */
  id: string
  name: string
  json: string
  /** The pack it comes in and its path there (`maps/frontier.otd.json`). */
  pack: string
  path: string
  /** The system that lists it. */
  system: TravelSystem
}

/**
 * The maps the systems list, each once (the first system that lists it), read with
 * `read` (a file of a pack by its id and path); files missing or not a map are left out.
 */
export function examplesOf(
  systems: TravelSystem[],
  read: (pack: string, path: string) => string | undefined,
): ExampleMap[] {
  const out: ExampleMap[] = []
  for (const system of systems)
    for (const path of system.maps ?? []) {
      const pack = system.pack!
      if (out.some((m) => m.pack === pack && m.path === path)) continue
      const json = read(pack, path)
      if (!json) continue
      try {
        const map = (JSON.parse(json) as { maps?: { id: string; name?: string }[] }).maps?.[0]
        if (map) out.push({ id: map.id, name: map.name ?? map.id, json, pack, path, system })
      } catch {
        // Not JSON: the system's page in the Systems app says what's wrong with it.
      }
    }
  return out
}

/** The example maps of the loaded packs (bundled and the user's). */
export function exampleMaps(): ExampleMap[] {
  return examplesOf(playSystems(), (pack, path) => {
    const root = library.rootOf(pack)
    return root === undefined ? undefined : library.readFile(root, path)
  })
}

/** The name of the system an example map comes with, in a language. */
export const exampleSystemName = (example: ExampleMap, locale: string): string =>
  systemName(example.system, locale)
