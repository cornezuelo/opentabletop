/**
 * The links of a page (or of any Markdown: a note in the campaign's journal):
 *
 * - to a page: `[[Old Tobin]]`, `[[npcs/Old Tobin]]`, `[[Old Tobin|the ferryman]]`,
 *   `[[Old Tobin#Secrets]]`;
 * - into the games, a kind and an id before a colon, always these English words:
 *   `[[character:kael]]`, `[[campaign:vale]]`, `[[faction:vale/iron-clans]]` (the campaign
 *   and the faction), `[[map:a1b2#0608]]` (a map, and a cell of it by its label).
 *
 * Links inside code (`` `[[…]]` `` and fenced blocks) aren't links.
 */

/** What a link may point at besides a page. Written as they are, never translated. */
export const GAME_LINK_KINDS = ['character', 'map', 'campaign', 'faction'] as const
export type GameLinkKind = (typeof GAME_LINK_KINDS)[number]
export type LinkKind = 'page' | GameLinkKind

export interface NoteLink {
  kind: LinkKind
  /** A page's path or title; a game thing's id (a faction's `<campaign>/<id>`). */
  target: string
  /** After `#`: a heading of the page, a cell of the map. */
  heading?: string
  /** After `|`: the text shown instead. */
  alias?: string
  /** Where it is in the text: `[[` to `]]`. */
  from: number
  to: number
}

/** Stretches of `text` that are code (fenced blocks and `inline` spans), `[from, to)`. */
export function codeRanges(text: string): [number, number][] {
  const ranges: [number, number][] = []
  const fence = /^(```|~~~)[^\n]*\n[\s\S]*?(?:^\1[^\n]*$|(?![\s\S]))/gm
  for (const m of text.matchAll(fence)) ranges.push([m.index, m.index + m[0].length])
  const inline = /`[^`\n]+`/g
  for (const m of text.matchAll(inline))
    if (!ranges.some(([a, b]) => m.index >= a && m.index < b))
      ranges.push([m.index, m.index + m[0].length])
  return ranges
}

const inside = (at: number, ranges: [number, number][]) =>
  ranges.some(([a, b]) => at >= a && at < b)

/** A link's inside (what's between `[[` and `]]`) read; null if it's empty. */
export function readLink(inner: string): Omit<NoteLink, 'from' | 'to'> | null {
  const bar = inner.indexOf('|')
  const alias = bar >= 0 ? inner.slice(bar + 1).trim() : ''
  let rest = (bar >= 0 ? inner.slice(0, bar) : inner).trim()
  let kind: LinkKind = 'page'
  const colon = /^([a-z]+):/.exec(rest)
  if (colon && (GAME_LINK_KINDS as readonly string[]).includes(colon[1])) {
    kind = colon[1] as GameLinkKind
    rest = rest.slice(colon[0].length).trim()
  }
  const hash = rest.indexOf('#')
  const heading = hash >= 0 ? rest.slice(hash + 1).trim() : ''
  const target = (hash >= 0 ? rest.slice(0, hash) : rest).trim()
  if (!target && !(kind === 'page' && heading)) return null
  return { kind, target, ...(heading ? { heading } : {}), ...(alias ? { alias } : {}) }
}

/** A link written back as `[[…]]`. */
export function formatLink(link: Omit<NoteLink, 'from' | 'to'>): string {
  const head = link.kind === 'page' ? '' : `${link.kind}:`
  return `[[${head}${link.target}${link.heading ? `#${link.heading}` : ''}${link.alias ? `|${link.alias}` : ''}]]`
}

/** Every link of a text, in order, outside code. */
export function parseLinks(text: string): NoteLink[] {
  const code = codeRanges(text)
  const links: NoteLink[] = []
  for (const m of text.matchAll(/\[\[([^[\]\n]+?)\]\]/g)) {
    if (inside(m.index, code)) continue
    const link = readLink(m[1])
    if (link) links.push({ ...link, from: m.index, to: m.index + m[0].length })
  }
  return links
}

/** The links of a text that point into the games. */
export const gameLinks = (text: string): NoteLink[] =>
  parseLinks(text).filter((l) => l.kind !== 'page')

/** A text with some of its links replaced (`replace` gives the new text, or null to keep it). */
export function rewriteLinks(text: string, replace: (link: NoteLink) => string | null): string {
  let out = ''
  let at = 0
  for (const link of parseLinks(text)) {
    const next = replace(link)
    if (next === null) continue
    out += text.slice(at, link.from) + next
    at = link.to
  }
  return out + text.slice(at)
}
