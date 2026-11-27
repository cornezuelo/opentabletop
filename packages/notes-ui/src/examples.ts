/// <reference types="vite/client" />
/**
 * The example pages the open packs bring (`<pack>/notes/**.md`, translated in
 * `<pack>/locales/<lang>/notes/`): Notes offers to add them to the campaign being played, and
 * Map adds them to an example map's campaign as it's opened.
 */
import { filesToPages, GENERAL_FOLDER } from '@open-tabletop/notes'
import { loadPages, newPageId, savePages } from './browser'
import { linkFromUrl } from './game'

const files = import.meta.glob('../../../packs/*/notes/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const translated = import.meta.glob('../../../packs/*/locales/*/notes/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const manifests = import.meta.glob('../../../packs/*/pack.yaml', {
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

/**
 * Adds a pack's example pages to a campaign (those in a folder `General` to General), only
 * those it hasn't yet: a page already there, changed or not, stays as it is. How many were added.
 */
export async function addMissingExamples(
  pack: string,
  campaign: string,
  locale: string,
): Promise<number> {
  const files = examplePages(locale).find((e) => e.pack === pack)?.files
  if (!files) return 0
  const kept = await loadPages()
  const key = (c: string | undefined, path: string) => `${c ?? ''}|${path.toLocaleLowerCase()}`
  const there = new Set(kept.map((p) => key(p.campaign, p.path)))
  const pages = filesToPages(files, {
    campaignOfFolder: (folder) =>
      folder.toLocaleLowerCase() === GENERAL_FOLDER.toLocaleLowerCase() ? '' : null,
    into: campaign,
    gameLinkOf: linkFromUrl,
    newId: newPageId,
    now: new Date().toISOString(),
  }).filter((p) => !there.has(key(p.campaign, p.path)))
  if (pages.length) await savePages(pages)
  return pages.length
}
