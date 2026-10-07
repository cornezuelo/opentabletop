import { Marked, type Tokens } from 'marked'

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/**
 * Basic Markdown for pack texts (packs can come from third parties): paragraphs, bold,
 * italics, code, lists, quotes and links to the web. HTML written in the text stays
 * text, images show their description, headings read as bold paragraphs.
 */
const markdown = new Marked({
  async: false,
  gfm: true,
  renderer: {
    html: ({ text }: Tokens.HTML | Tokens.Tag) => escapeHtml(text),
    heading(token: Tokens.Heading) {
      return `<p><strong>${this.parser.parseInline(token.tokens)}</strong></p>\n`
    },
    image: ({ text }: Tokens.Image) => escapeHtml(text),
    link(token: Tokens.Link) {
      const inner = this.parser.parseInline(token.tokens)
      return /^https?:\/\//i.test(token.href)
        ? `<a href="${escapeHtml(token.href)}" target="_blank" rel="noopener noreferrer">${inner}</a>`
        : inner
    },
  },
})

/** A pack text (a description…) in basic Markdown as safe HTML. */
export function renderMarkdown(text: string): string {
  return markdown.parse(text) as string
}

/** The same text without formatting (for screen-reader labels). */
export function markdownText(text: string): string {
  return renderMarkdown(text)
    .replace(/<\/(p|li|blockquote)>/g, '\n')
    .replace(/<br>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\n{2,}/g, '\n')
    .trim()
}
