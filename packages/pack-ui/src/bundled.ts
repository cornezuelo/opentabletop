import { groupBundled, type PackSource } from './packs'

/**
 * Packs bundled at build time, for every app: open ones from packs/ and, locally,
 * personal-use ones from packs-private/ (git-ignored; the glob is simply empty when it's
 * missing, see vite.packs.ts). Definitions and SVG images come as text, the other images as
 * `data:` URLs (`images.ts`).
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

export const bundledPacks: PackSource[] = [
  ...groupBundled(open, 'packs'),
  ...groupBundled(personal, 'packs-private', true),
]
