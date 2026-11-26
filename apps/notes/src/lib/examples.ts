/**
 * The example pages the open packs bring (`<pack>/notes/**.md`, translated in
 * `<pack>/locales/<lang>/notes/`): Notes offers to add them to the campaign being played.
 */
const files = import.meta.glob('../../../../packs/*/notes/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const translated = import.meta.glob('../../../../packs/*/locales/*/notes/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const manifests = import.meta.glob('../../../../packs/*/pack.yaml', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

export interface ExamplePages {
  pack: string
  /** The pack's name, as its manifest says it. */
  name: string
  /** Each page's text by its path (`places/Ashford.md`). */
  files: Record<string, string>
}

const packOf = (path: string) => /packs\/([^/]+)\//.exec(path)?.[1] ?? ''

/** The packs that bring example pages, each page in `locale` where it's translated. */
export function examplePages(locale: string): ExamplePages[] {
  const packs = new Map<string, ExamplePages>()
  for (const [path, text] of Object.entries(files)) {
    const pack = packOf(path)
    const inside = path.slice(path.indexOf('/notes/') + '/notes/'.length)
    const local = translated[path.replace('/notes/', `/locales/${locale}/notes/`)]
    const manifest = Object.entries(manifests).find(([p]) => packOf(p) === pack)?.[1] ?? ''
    const name = (/^name:\s*(.+?)\s*$/m.exec(manifest)?.[1] ?? pack).replace(/^['"]|['"]$/g, '')
    if (!packs.has(pack)) packs.set(pack, { pack, name, files: {} })
    packs.get(pack)!.files[inside] = local ?? text
  }
  return [...packs.values()]
}
