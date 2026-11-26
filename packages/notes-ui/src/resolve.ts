import { findPage, pageTitle, type NoteLink, type NotePage } from '@open-tabletop/notes'
import { gameUrl, linkedThing, type GameIndex } from './game'
import type { LinkResolver, LinkView } from './render'

/**
 * How the links of a text written in `campaign` (a page's, `from`; a journal's note) show:
 * a page by its title (or the link's text), a page that doesn't exist yet by what it's
 * called, a thing of the games by its name now.
 */
export function linkResolver(
  pages: readonly NotePage[],
  index: GameIndex,
  from: { campaign?: string; id?: string },
): LinkResolver {
  return (link): LinkView => {
    if (link.kind === 'page') {
      const page = link.target
        ? findPage(pages, link.target, from.campaign)
        : pages.find((p) => p.id === from.id)
      const shown = link.alias ?? (link.target || '') + (link.heading ? ` › ${link.heading}` : '')
      if (page)
        return {
          kind: 'page',
          id: page.id,
          text:
            link.alias ??
            `${link.target ? pageTitle(page) : ''}${link.heading ? `${link.target ? ' › ' : ''}${link.heading}` : ''}`,
          ...(link.heading ? { heading: link.heading } : {}),
        }
      return { kind: 'new', path: link.target, text: shown }
    }
    const thing = linkedThing(index, link as NoteLink)
    return {
      kind: 'game',
      game: link.kind,
      url: gameUrl(link),
      text: link.alias ?? thing?.name ?? `${link.target}${link.heading ? `#${link.heading}` : ''}`,
      ...(thing ? {} : { missing: true }),
    }
  }
}
