import { groupBundled, type PackSource } from '@open-tabletop/pack-ui/packs'

/**
 * Packs bundled at build time: open ones from packs/ and, locally, personal-use ones from
 * packs-private/ (git-ignored; the glob is simply empty when it's missing).
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

export const bundledPacks: PackSource[] = [
  ...groupBundled(open, 'packs'),
  ...groupBundled(personal, 'packs-private', true),
]
