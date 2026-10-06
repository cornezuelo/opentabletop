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
const ID = /^[a-z0-9][a-z0-9-]*$/

export const isValidId = (id: string): boolean => ID.test(id)

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

export function newPack(id: string, name: string, locale: string): PackSource {
  const manifest = [
    `id: ${id}`,
    `name: ${JSON.stringify(name || id)}`,
    'version: 0.1.0',
    `locale: ${locale}`,
    'license: CC-BY-4.0',
    '',
  ].join('\n')
  return {
    root: id,
    origin: 'user',
    files: [
      { path: MANIFEST_FILE, content: manifest },
      { path: 'tables.yaml', content: '' },
    ],
  }
}

/** Normalizes a user-typed file path: relative, forward slashes, .yaml by default. */
export function cleanFilePath(path: string): string | null {
  const clean = path
    .trim()
    .replaceAll('\\', '/')
    .replace(/^\/+/, '')
    .split('/')
    .filter((part) => part && part !== '.' && part !== '..')
    .join('/')
  if (!clean) return null
  return /\.(ya?ml|json)$/.test(clean) ? clean : `${clean}.yaml`
}

/** The translation file for a data file, e.g. ("en", "travel.yaml") → "locales/en/travel.yaml". */
export const overlayPath = (locale: string, file: string): string => `locales/${locale}/${file}`

/** Locales that have translation files in a pack. */
export function overlayLocales(pack: PackSource): string[] {
  const set = new Set<string>()
  for (const f of pack.files) {
    const m = /^locales\/([^/]+)\//.exec(f.path)
    if (m) set.add(m[1])
  }
  return [...set].sort()
}
