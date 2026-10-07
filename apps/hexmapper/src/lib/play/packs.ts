import { groupBundled, PackLibrary } from '@open-tabletop/pack-ui'

/**
 * Packs bundled at build time: open ones from packs/ and, locally, personal-use ones
 * from packs-private/ (git-ignored; the glob is simply empty when it's missing).
 */
const open = import.meta.glob('../../../../../packs/**/*.{yaml,yml,json}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>
const personal = import.meta.glob('@personal-packs/**/*.{yaml,yml,json}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/**
 * Bundled packs plus the user packs made in the Oracle app (shared browser storage when
 * both apps are served from the same origin).
 */
export const library = new PackLibrary([
  ...groupBundled(open, 'packs'),
  ...groupBundled(personal, 'packs-private', true),
])
