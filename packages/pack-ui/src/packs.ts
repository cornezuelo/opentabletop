import type { PackFile as EngineFile } from '@open-tabletop/oracle-engine'
import { parse } from 'yaml'

/** A file inside a pack; `path` is relative to the pack folder (e.g. "tables/weather.yaml"). */
export interface PackFile {
  path: string
  content: string
}

/**
 * A pack folder. Bundled packs come with the app (read-only); user packs live in the
 * browser. A user pack with the same folder as a bundled one overrides it ("edited").
 */
export interface PackSource {
  root: string
  origin: 'bundled' | 'user'
  /** From packs-private/: personal-use content, never redistributed. */
  personal?: boolean
  files: PackFile[]
}

export interface WorkspacePack extends PackSource {
  /** A user pack replacing a bundled one. */
  overrides?: boolean
}

export interface ManifestInfo {
  id?: string
  name?: string
  version?: string
  locale?: string
  license?: string
}

export const MANIFEST_FILE = 'pack.yaml'

/**
 * User packs are stored in the browser under an ecosystem-wide key, so apps served from
 * the same origin (hexmapper, oracle…) see the same packs.
 */
export const USER_PACKS_KEY = 'opentabletop.userPacks'

/**
 * Groups files found under a packs folder (e.g. a Vite `import.meta.glob` of
 * `packs/**`) into bundled packs. Keys are paths containing `/<folder>/<root>/…`;
 * folders without a `pack.yaml` are skipped.
 */
export function groupBundled(
  files: Record<string, string>,
  folder: string,
  personal = false,
): PackSource[] {
  const packs = new Map<string, PackSource>()
  for (const [fullPath, content] of Object.entries(files)) {
    const relative = fullPath.split(`/${folder}/`)[1]
    if (!relative) continue
    const [root, ...rest] = relative.split('/')
    if (!rest.length) continue
    if (!packs.has(root))
      packs.set(root, { root, origin: 'bundled', personal: personal || undefined, files: [] })
    packs.get(root)!.files.push({ path: rest.join('/'), content })
  }
  return [...packs.values()].filter((p) => p.files.some((f) => f.path === MANIFEST_FILE))
}

/** User packs replace bundled packs with the same folder; the rest are listed side by side. */
export function effectivePacks(bundled: PackSource[], user: PackSource[]): WorkspacePack[] {
  const userRoots = new Set(user.map((p) => p.root))
  const bundledRoots = new Set(bundled.map((p) => p.root))
  return [
    ...bundled.filter((p) => !userRoots.has(p.root)),
    ...user.map((p) => ({ ...p, overrides: bundledRoots.has(p.root) })),
  ].sort((a, b) => a.root.localeCompare(b.root))
}

/** Files as the engine expects them (paths relative to the packs root). */
export function engineFiles(packs: PackSource[]): EngineFile[] {
  return packs.flatMap((p) =>
    p.files.map((f) => ({ path: `${p.root}/${f.path}`, content: f.content })),
  )
}

/** Lenient read of pack.yaml for display; validation errors come from the engine. */
export function manifestOf(pack: PackSource): ManifestInfo {
  const file = pack.files.find((f) => f.path === MANIFEST_FILE)
  try {
    const data = file ? (parse(file.content) as Record<string, unknown>) : {}
    const text = (v: unknown) => (typeof v === 'string' ? v : undefined)
    const name =
      typeof data?.name === 'object' && data.name !== null
        ? Object.values(data.name as Record<string, string>)[0]
        : text(data?.name)
    return {
      id: text(data?.id),
      name,
      version: text(data?.version),
      locale: text(data?.locale),
      license: text(data?.license),
    }
  } catch {
    return {}
  }
}

/** User packs saved in this browser (empty when storage is unavailable or broken). */
export function readUserPacks(storage: Pick<Storage, 'getItem'> = localStorage): PackSource[] {
  try {
    const raw = storage.getItem(USER_PACKS_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    // Skip anything that isn't a pack (hand-edited or half-written storage).
    return parsed
      .filter(
        (p): p is PackSource =>
          typeof p?.root === 'string' &&
          Array.isArray(p.files) &&
          p.files.every(
            (f: unknown) =>
              typeof (f as PackFile)?.path === 'string' &&
              typeof (f as PackFile).content === 'string',
          ),
      )
      .map((p) => ({ ...p, origin: 'user' as const }))
  } catch {
    return []
  }
}

/** Saves the user packs; returns false when storage is full or unavailable. */
export function writeUserPacks(
  packs: PackSource[],
  storage: Pick<Storage, 'setItem'> = localStorage,
): boolean {
  try {
    storage.setItem(USER_PACKS_KEY, JSON.stringify(packs))
    return true
  } catch {
    return false
  }
}
