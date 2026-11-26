import { gameLinks, findPage, type NotePage } from '@open-tabletop/notes'
import { gameUrl, linkedThing, type GameIndex, type GameThing } from './game'

/** A thing of the games a page has to do with: the page links to it, or it links here. */
export interface PageThing {
  thing: GameThing
  url: string | null
  /** The page links to it. */
  named: boolean
  /** Its `noteRef` is this page. */
  linksHere: boolean
}

/**
 * What of the games a page names (`[[character:kael]]`) and what of them points at it (a
 * thing whose `noteRef` reaches it, from the thing's campaign), once each, in the order met.
 */
export function pageThings(
  pages: readonly NotePage[],
  index: GameIndex,
  page: NotePage,
): PageThing[] {
  const out = new Map<string, PageThing>()
  for (const link of gameLinks(page.body)) {
    const thing = linkedThing(index, link) ?? {
      kind: link.kind as GameThing['kind'],
      link: `${link.kind}:${link.target}${link.heading ? `#${link.heading}` : ''}`,
      name: link.alias ?? link.target,
    }
    if (!out.has(thing.link))
      out.set(thing.link, { thing, url: gameUrl(link), named: true, linksHere: false })
  }
  for (const thing of index.things) {
    if (!thing.noteRef) continue
    if (findPage(pages, thing.noteRef, thing.campaign)?.id !== page.id) continue
    const key = `${thing.link}|${thing.name}`
    const same = out.get(thing.link)
    if (same && (same.thing.name === thing.name || !thing.only)) same.linksHere = true
    else if (!out.has(key)) {
      const [kind, rest] = [thing.kind, thing.link.slice(thing.kind.length + 1)]
      const [target, heading] = rest.split('#')
      out.set(key, {
        thing,
        url: gameUrl({ kind, target, ...(heading ? { heading } : {}) }),
        named: false,
        linksHere: true,
      })
    }
  }
  return [...out.values()]
}
