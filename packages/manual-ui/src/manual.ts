import { createManual } from './pages'

/** Every page of docs/manual, bundled at build time. */
const files = import.meta.glob('../../../docs/manual/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/** Its pictures (`en/systems/hex-flower.svg`, by path from docs/manual/) and their URLs. */
export const pictures: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob('../../../docs/manual/**/*.svg', {
      query: '?url',
      import: 'default',
      eager: true,
    }) as Record<string, string>,
  ).map(([path, url]) => [path.replace(/^.*docs\/manual\//, ''), url]),
)

export const manual = createManual(files, [
  'map',
  'campaign',
  'oracle',
  'travel',
  'characters',
  'systems',
  'packs',
  'technical',
])
