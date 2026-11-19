import { readAheadYaml } from '@open-tabletop/oracle-engine'
import { groupBundled, type PackSource } from './packs'

/**
 * Packs bundled at build time, for every app: open ones from packs/ and, locally,
 * personal-use ones from packs-private/ (git-ignored; the glob is simply empty when it's
 * missing, see vite.packs.ts). Definitions and SVG images come as text, the other images as
 * `data:` URLs (`images.ts`). Their YAML is read at build time too (`?documents`, see
 * vite.packs.ts), so starting an app doesn't read it again.
 */
const open = {
  ...import.meta.glob('../../../packs/**/*.{yaml,yml,json,svg}', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  ...import.meta.glob('../../../packs/**/*.{png,webp,jpg,jpeg}', {
    query: '?inline',
    import: 'default',
    eager: true,
  }),
} as Record<string, string>
const personal = {
  ...import.meta.glob('@personal-packs/**/*.{yaml,yml,json,svg}', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  ...import.meta.glob('@personal-packs/**/*.{png,webp,jpg,jpeg}', {
    query: '?inline',
    import: 'default',
    eager: true,
  }),
} as Record<string, string>

const documents = {
  ...import.meta.glob('../../../packs/**/*.{yaml,yml}', {
    query: '?documents',
    import: 'default',
    eager: true,
  }),
  ...import.meta.glob('@personal-packs/**/*.{yaml,yml}', {
    query: '?documents',
    import: 'default',
    eager: true,
  }),
} as Record<string, string | null>
for (const [path, read] of Object.entries(documents)) {
  const text = open[path] ?? personal[path]
  if (read !== null && text !== undefined) readAheadYaml(text, read)
}

export const bundledPacks: PackSource[] = [
  ...groupBundled(open, 'packs'),
  ...groupBundled(personal, 'packs-private', true),
]
