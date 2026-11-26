import { Marked, type Tokens, type TokenizerAndRendererExtension } from 'marked'
import { readLink, type NoteLink } from '@open-tabletop/notes'

/**
 * A page's Markdown as safe HTML (pages may come from an imported folder): headings,
 * lists, tasks, tables, quotes, code and links; HTML written in the text stays text, images
 * show their description. `[[links]]` become links the page's view follows: to a page
 * (`data-page`, or `data-new` for one that doesn't exist yet) or into the games (the app's
 * address, with the kind's sign).
 */

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** What a link shows and reaches, as the host resolves it. */
export type LinkView =
  | { kind: 'page'; id: string; text: string; heading?: string }
  | { kind: 'new'; path: string; text: string }
  | { kind: 'game'; game: NoteLink['kind']; url: string | null; text: string; missing?: boolean }

export type LinkResolver = (link: Omit<NoteLink, 'from' | 'to'>) => LinkView

/** A heading's anchor in the page (`## Secrets` → `secrets`), for `[[Page#Secrets]]`. */
export const headingAnchor = (text: string): string =>
  'h-' +
  text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '')

function linkHtml(view: LinkView): string {
  const text = escapeHtml(view.text)
  if (view.kind === 'page')
    return `<a href="#" class="note-link" data-page="${escapeHtml(view.id)}"${view.heading ? ` data-heading="${escapeHtml(headingAnchor(view.heading))}"` : ''}>${text}</a>`
  if (view.kind === 'new')
    return `<a href="#" class="note-link new" data-new="${escapeHtml(view.path)}">${text}</a>`
  const sign = `<span class="sign sign-${view.game}" aria-hidden="true"></span>`
  return view.url && !view.missing
    ? `<a href="${escapeHtml(view.url)}" class="game-link" target="_blank" rel="noopener">${sign}${text}</a>`
    : `<span class="game-link missing">${sign}${text}</span>`
}

/** Renders `body`, its links resolved by `resolve`. */
export function renderPage(body: string, resolve: LinkResolver): string {
  const wikilink: TokenizerAndRendererExtension = {
    name: 'wikilink',
    level: 'inline',
    start: (src) => src.indexOf('[['),
    tokenizer(src) {
      const m = /^\[\[([^[\]\n]+?)\]\]/.exec(src)
      const link = m && readLink(m[1])
      return m && link ? { type: 'wikilink', raw: m[0], link } : undefined
    },
    renderer: (token) => linkHtml(resolve((token as unknown as { link: NoteLink }).link)),
  }
  const markdown = new Marked({
    async: false,
    gfm: true,
    extensions: [wikilink],
    renderer: {
      html: ({ text }: Tokens.HTML | Tokens.Tag) => escapeHtml(text),
      image: ({ text }: Tokens.Image) => escapeHtml(text),
      heading(token: Tokens.Heading) {
        const level = Math.min(6, Math.max(1, token.depth))
        return `<h${level} id="${headingAnchor(token.text)}">${this.parser.parseInline(token.tokens)}</h${level}>\n`
      },
      link(token: Tokens.Link) {
        const inner = this.parser.parseInline(token.tokens)
        return /^(https?:|mailto:|\.\.?\/|#)/i.test(token.href)
          ? `<a href="${escapeHtml(token.href)}" target="_blank" rel="noopener noreferrer">${inner}</a>`
          : inner
      },
    },
  })
  return markdown.parse(body) as string
}
