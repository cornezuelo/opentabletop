import { isStyle, SPAN_AT_START, spanOf } from '@open-tabletop/styled-text'
import { Marked, type TokenizerAndRendererExtension, type Tokens } from 'marked'

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/**
 * A styled span, `[text]{red underline}` (`@open-tabletop/styled-text`): its text drawn in
 * the theme's colour of that name (`.ink-red`) or underlined (`.ink-underline`). Names it
 * doesn't know are dropped, the text kept.
 */
const styledSpan: TokenizerAndRendererExtension = {
  name: 'styled',
  level: 'inline',
  start: (src: string) => {
    const at = src.indexOf('[')
    return at < 0 ? undefined : at
  },
  tokenizer(src: string) {
    const match = SPAN_AT_START.exec(src)
    if (!match) return undefined
    const span = spanOf(match)
    return {
      type: 'styled',
      raw: match[0],
      styles: span.styles.filter(isStyle),
      tokens: this.lexer.inlineTokens(span.text),
    }
  },
  renderer(token) {
    const inner = this.parser.parseInline(token.tokens ?? [])
    const styles = token.styles as string[]
    return styles.length
      ? `<span class="${styles.map((name) => `ink-${name}`).join(' ')}">${inner}</span>`
      : inner
  },
}

/**
 * Basic Markdown for pack texts (packs can come from third parties): paragraphs, bold,
 * italics, code, lists, quotes, links to the web and styled spans (`[text]{red}`). HTML
 * written in the text stays text, images show their description, headings read as bold
 * paragraphs.
 */
const markdown = new Marked({
  async: false,
  gfm: true,
  extensions: [styledSpan],
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

/**
 * A short pack text shown inline (a result, a card, a line of the journal) as safe HTML:
 * bold, italics, code, links to the web and styled spans, no paragraphs or lists; its
 * line breaks kept.
 */
export function renderInline(text: string): string {
  return (markdown.parseInline(text, { breaks: true }) as string).replace(/\n/g, '<br>')
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

/**
 * A help text as Markdown: each line its own paragraph and lines starting with "• " a
 * list, so texts written one example per line keep their shape; the rest is basic
 * Markdown (`code`, **bold**, _italics_).
 */
export function helpMarkdown(text: string): string {
  const out: string[] = []
  let listing = false
  for (const line of text.split('\n')) {
    const item = /^\s*•\s*(.*)$/.exec(line)
    if (item) {
      if (!listing && out.length) out.push('')
      out.push(`- ${item[1]}`)
      listing = true
    } else if (line.trim()) {
      if (out.length) out.push('')
      out.push(line)
      listing = false
    }
  }
  return out.join('\n')
}
