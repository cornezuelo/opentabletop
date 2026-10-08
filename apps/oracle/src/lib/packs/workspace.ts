import { PACK_FORMAT } from '@open-tabletop/oracle-engine'
import { MANIFEST_FILE, type PackSource } from '@open-tabletop/pack-ui/packs'

export {
  effectivePacks,
  engineFiles,
  manifestOf,
  MANIFEST_FILE,
  type ManifestInfo,
  type PackFile,
  type PackSource,
  type WorkspacePack,
} from '@open-tabletop/pack-ui/packs'

const ID = /^[a-z0-9][a-z0-9-]*$/

export const isValidId = (id: string): boolean => ID.test(id)

export function newPack(id: string, name: string, locale: string): PackSource {
  const manifest = [
    `id: ${id}`,
    `name: ${JSON.stringify(name || id)}`,
    'version: 0.1.0',
    `format: ${PACK_FORMAT}`,
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
