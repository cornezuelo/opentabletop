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
  /**
   * On a user copy of a bundled pack: the fingerprint of each bundled file when the copy
   * was made (or last brought up to date), to tell what the bundled pack changed since.
   */
  basedOn?: Record<string, string>
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

/** A short fingerprint of a text (FNV-1a, 32 bits), to tell whether a file changed. */
export function fingerprint(text: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/** Every file of a pack by path, as fingerprints. */
export function fingerprints(pack: PackSource): Record<string, string> {
  return Object.fromEntries(pack.files.map((f) => [f.path, fingerprint(f.content)]))
}

/** A file of a copy made before updates were tracked: whether it was edited can't be told. */
const UNKNOWN = '?'

/**
 * What a copy is based on: what it recorded, or for copies made before that, the bundled
 * files it still has unchanged (any other file differs for a reason that can't be told).
 */
export function baseOf(bundled: PackSource, copy: PackSource): Record<string, string> {
  if (copy.basedOn) return copy.basedOn
  const now = fingerprints(bundled)
  const mine = fingerprints(copy)
  return Object.fromEntries(
    Object.entries(now).map(([path, print]) => [path, mine[path] === print ? print : UNKNOWN]),
  )
}

/** A file the bundled pack changed since a user copy of it was made. */
export interface BundledChange {
  path: string
  /** What happened to it in the bundled pack. */
  bundled: 'added' | 'changed' | 'removed'
  /** The copy changed it too (or, in copies made before tracking, it differs). */
  mine: boolean
}

/** What the bundled pack changed since the copy was made, by path ([] when nothing). */
export function bundledChanges(bundled: PackSource, copy: PackSource): BundledChange[] {
  const now = fingerprints(bundled)
  const mine = fingerprints(copy)
  const base = baseOf(bundled, copy)
  return [...new Set([...Object.keys(now), ...Object.keys(base)])]
    .sort()
    .filter((path) => base[path] !== now[path])
    .map((path) => ({
      path,
      bundled: base[path] === undefined ? 'added' : now[path] === undefined ? 'removed' : 'changed',
      mine: mine[path] !== base[path],
    }))
}

/**
 * Brings some files of a copy up to date with the bundled pack: `take` gets the bundled
 * version (a file it removed goes too), `keep` stays as it is; both count as seen.
 */
export function updateCopy(
  bundled: PackSource,
  copy: PackSource,
  { take = [], keep = [] }: { take?: string[]; keep?: string[] },
): PackSource {
  const now = fingerprints(bundled)
  const basedOn = { ...baseOf(bundled, copy) }
  for (const path of [...take, ...keep]) {
    if (now[path] === undefined) delete basedOn[path]
    else basedOn[path] = now[path]
  }
  const taken = new Set(take)
  const files = [
    ...copy.files.filter((f) => !taken.has(f.path)),
    ...bundled.files.filter((f) => taken.has(f.path)).map((f) => ({ ...f })),
  ].sort((a, b) => a.path.localeCompare(b.path))
  return { ...copy, files, basedOn }
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
