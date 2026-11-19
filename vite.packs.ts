import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'
import { parseAllDocuments } from 'yaml'

/**
 * Where the apps' bundled packs come from. Open packs (packs/) are always built in.
 * Personal-use packs (packs-private/, a private checkout whose licences forbid
 * redistribution) are only built in for this machine: in development, in tests, and in
 * builds with OTT_PERSONAL_PACKS=1 (`make serve`). Any other build (`make site`, a
 * release, CI) leaves them out, and fails if anything still tries to load one.
 *
 * Apps glob `@personal-packs/**`: the alias points at packs-private/ or at a folder that
 * doesn't exist (an empty glob).
 *
 * A YAML file imported with `?documents` is read here, at build time: its documents as the
 * JSON of their list (or `null` when it has errors or holds what JSON can't), so the apps
 * don't read every bundled pack's YAML as they start (oracle-engine's `readAheadYaml`).
 */
const PRIVATE = fileURLToPath(new URL('./packs-private', import.meta.url))
const NONE = fileURLToPath(new URL('./.no-personal-packs', import.meta.url))

export function packSources(): Plugin {
  let include = true
  return {
    name: 'opentabletop-pack-sources',
    enforce: 'pre',
    config(_, { command, mode }) {
      include = command === 'serve' || mode === 'test' || process.env.OTT_PERSONAL_PACKS === '1'
      return { resolve: { alias: { '@personal-packs': include ? PRIVATE : NONE } } }
    },
    load(id) {
      if (!include && id.replaceAll('\\', '/').includes('/packs-private/'))
        this.error(`Personal-use pack in a build without them: ${id}`)
      const [file, query] = id.split('?')
      if (query !== 'documents') return
      this.addWatchFile(file)
      return `export default ${JSON.stringify(documentsOf(readFileSync(file, 'utf8')))}`
    },
  }
}

/** A YAML text's documents as the JSON of their list, or null when it can't be told so. */
export function documentsOf(text: string): string | null {
  const docs = parseAllDocuments(text)
  const list = Array.isArray(docs) ? docs : [docs]
  if (list.some((doc) => doc.errors.length)) return null
  const values = list.filter((doc) => doc.contents !== null).map((doc) => doc.toJS() as unknown)
  return values.every(jsonSafe) ? JSON.stringify(values) : null
}

/** Whether JSON keeps a value as it is (no `.inf`, `.nan`, dates or maps). */
function jsonSafe(value: unknown): boolean {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true
  if (typeof value === 'number') return Number.isFinite(value)
  if (Array.isArray(value)) return value.every(jsonSafe)
  if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype)
    return Object.values(value).every(jsonSafe)
  return false
}
