import { download, importZip, packsToZip, type PackSource } from '@open-tabletop/pack-ui'
import { systemPackIds, type TravelSystem } from '@open-tabletop/session'
import { getLocale } from './i18n'
import { library, systems } from './packs.svelte'

/** The packs a system's .zip holds: its own first, then every pack it needs. */
export function systemZipPacks(system: TravelSystem): PackSource[] {
  return systemPackIds(system, library.registry)
    .map((id) => library.pack(library.rootOf(id) ?? ''))
    .filter((p): p is NonNullable<typeof p> => !!p)
}

/**
 * The packs a system needs (Core…) that are your copies of a bundled pack the bundled
 * version changed since: a copy replaces the whole bundled pack, so what the newer one
 * added (a table the system names) is missing until you take it. Its own pack left out.
 */
export function staleCopies(system: TravelSystem): string[] {
  return systemPackIds(system, library.registry)
    .slice(1)
    .map((id) => library.rootOf(id) ?? '')
    .filter((root) => library.pack(root)?.overrides && library.bundledChanges(root).length)
}

/** Saves a system as one .zip, to import it whole elsewhere. */
export function exportSystem(system: TravelSystem): void {
  const packs = systemZipPacks(system)
  if (packs.length)
    download(packsToZip(packs), `${system.id.replace(/\//g, '-')}.zip`, 'application/zip')
}

/**
 * The system a .zip brought: the first of its packs (its own comes first) that declares one,
 * its `default` system before the others.
 */
export function importedSystem(packs: PackSource[]): TravelSystem | undefined {
  for (const pack of packs) {
    const declared = systems.list.filter((s) => s.pack && library.rootOf(s.pack) === pack.root)
    if (declared.length) return declared.find((s) => s.id === s.pack) ?? declared[0]
  }
  return undefined
}

/** Asks for a system's .zip and imports its packs; returns the system it brought, if any. */
export async function importSystem(): Promise<TravelSystem | undefined> {
  const packs = await importZip(library, getLocale())
  return packs ? importedSystem(packs) : undefined
}
