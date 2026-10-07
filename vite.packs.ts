import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'

/**
 * Where the apps' bundled packs come from. Open packs (packs/) are always built in.
 * Personal-use packs (packs-private/, a private checkout whose licences forbid
 * redistribution) are only built in for this machine: in development, in tests, and in
 * builds with OTT_PERSONAL_PACKS=1 (`make serve`). Any other build (`make site`, a
 * release, CI) leaves them out, and fails if anything still tries to load one.
 *
 * Apps glob `@personal-packs/**`: the alias points at packs-private/ or at a folder that
 * doesn't exist (an empty glob).
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
    },
  }
}
