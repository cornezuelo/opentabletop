/**
 * Styled spans in the texts a pack writes (results, cards, templates, descriptions):
 * `[the text]{red}`, `[the text]{red underline}`. Bold and italics are basic Markdown
 * (`**bold**`, `_italics_`); a span adds what Markdown lacks, a colour and underlining,
 * never raw HTML (packs may come from third parties). Colours are names from a small
 * palette the theme draws readable, not codes.
 */

/** The colours a span may name, drawn by the theme (`--ink-<name>`). */
export const COLOURS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'grey'] as const

/** Every style a span may name: the colours, and `underline`. */
export const STYLES = [...COLOURS, 'underline'] as const

export type Style = (typeof STYLES)[number]

export function isStyle(name: string): name is Style {
  return (STYLES as readonly string[]).includes(name)
}

/**
 * A span: its text in brackets (which may hold a `[link]` or a `[[link]]` itself) and right after it, in braces, one or more names separated by spaces.
 */
const SPAN_SOURCE = String.raw`\[((?:[^[\]]|\[\[[^[\]]*\]\]|\[[^[\]]*\])+)\]\{([a-z][a-z-]*(?:\s+[a-z][a-z-]*)*)\}`

/** A span at the very start of a text (for a tokenizer reading the text bit by bit). */
export const SPAN_AT_START = new RegExp(`^${SPAN_SOURCE}`)

export interface Span {
  /** The text in brackets, as written (it may hold Markdown). */
  text: string
  /** The names in braces, known or not. */
  styles: string[]
  /** Where the whole span starts and ends in the text. */
  start: number
  end: number
}

/** A span read from a match of its pattern. */
export function spanOf(match: RegExpExecArray): Span {
  return {
    text: match[1],
    styles: match[2].trim().split(/\s+/),
    start: match.index,
    end: match.index + match[0].length,
  }
}

/** Every span written in a text, in order. */
export function findSpans(text: string): Span[] {
  if (!text.includes(']{')) return []
  return [...text.matchAll(new RegExp(SPAN_SOURCE, 'g'))].map((m) => spanOf(m as RegExpExecArray))
}

/** The names a text's spans give that aren't styles (to warn about: they're drawn as plain text). */
export function unknownStyles(text: string): string[] {
  return [
    ...new Set(
      findSpans(text)
        .flatMap((span) => span.styles)
        .filter((name) => !isStyle(name)),
    ),
  ]
}

/** The text with its spans' styles taken off, their text kept (Markdown left as it is). */
export function withoutSpans(text: string): string {
  if (!text.includes(']{')) return text
  return text.replace(new RegExp(SPAN_SOURCE, 'g'), (_whole, inner: string) => inner)
}

/**
 * The text as plain text: no spans, and no Markdown marks for bold, italics, struck text
 * or code (for screen readers' labels, the command line, plain exports).
 */
export function plainText(text: string): string {
  return withoutSpans(text)
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/(^|[^\w])__(.+?)__(?!\w)/g, '$1$2')
    .replace(/(^|[^\w*])\*(?!\s)([^*]+?)\*(?!\w)/g, '$1$2')
    .replace(/(^|[^\w])_(?!\s)([^_]+?)_(?!\w)/g, '$1$2')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
}
