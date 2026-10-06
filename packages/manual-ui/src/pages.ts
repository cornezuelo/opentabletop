/**
 * The user manual: Markdown pages in docs/manual/<locale>/<app>/<NN-slug>.md. The first
 * `# heading` is the page title, `## headings` are its sections (search results point
 * at them). The number prefix orders the pages. Missing translations fall back to English.
 */
export interface ManualSection {
  /** Anchor id, from the heading. */
  id: string
  title: string
  /** Plain text of the section, for search. */
  text: string
}

export interface ManualPage {
  app: string
  locale: string
  slug: string
  /** File name ("02-terrain.md"): what links between pages point at. */
  file: string
  title: string
  order: number
  /** Markdown without the title line. */
  body: string
  sections: ManualSection[]
}

export const BASE_LOCALE = 'en'

/** "Roads & rivers!" → "roads-rivers" (heading anchors). */
export function anchorOf(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Markdown to plain text for searching (no syntax, links reduced to their text). */
function plain(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/^\s*(?:[-+*]|\d+\.)\s+/gm, '')
    .replace(/[`*_]/g, '')
    .replace(/[>#|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Parses one page file. `path` ends in `<locale>/<app>/<NN-slug>.md`. */
export function parsePage(path: string, source: string): ManualPage | null {
  const m = /([^/]+)\/([^/]+)\/(?:(\d+)-)?([^/]+)\.md$/.exec(path)
  if (!m) return null
  const [, locale, app, order, slug] = m
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const titleIndex = lines.findIndex((l) => l.startsWith('# '))
  const title = titleIndex >= 0 ? lines[titleIndex].slice(2).trim() : slug
  const body = lines
    .filter((_, i) => i !== titleIndex)
    .join('\n')
    .trim()
  const sections: ManualSection[] = []
  let current: { title: string; lines: string[] } = { title: '', lines: [] }
  const flush = () => {
    const text = plain(current.lines.join('\n'))
    if (current.title || text)
      sections.push({ id: anchorOf(current.title), title: current.title, text })
  }
  for (const line of body.split('\n')) {
    if (line.startsWith('## ')) {
      flush()
      current = { title: line.slice(3).trim(), lines: [] }
    } else current.lines.push(line)
  }
  flush()
  const file = path.split('/').at(-1)!
  return { app, locale, slug, file, title, order: Number(order ?? 99), body, sections }
}

export interface Manual {
  /** Apps with pages, in a stable order. */
  apps: string[]
  pages(app: string, locale: string): ManualPage[]
  page(app: string, slug: string, locale: string): ManualPage | undefined
  search(query: string, locale: string, app?: string): SearchResult[]
}

export interface SearchResult {
  page: ManualPage
  section: ManualSection
  /** Text around the first match. */
  snippet: string
  score: number
}

/** Builds the manual from `{ path: markdown }` (e.g. a Vite glob of docs/manual). */
export function createManual(files: Record<string, string>, appOrder: string[] = []): Manual {
  const all = Object.entries(files).flatMap(([path, source]) => parsePage(path, source) ?? [])
  const apps = [...new Set(all.map((p) => p.app))].sort(
    (a, b) =>
      (appOrder.indexOf(a) + 1 || 99) - (appOrder.indexOf(b) + 1 || 99) || a.localeCompare(b),
  )

  /** A locale's pages of an app, with English pages filling the gaps. */
  const pages = (app: string, locale: string): ManualPage[] => {
    const own = all.filter((p) => p.app === app && p.locale === locale)
    const base = all.filter(
      (p) => p.app === app && p.locale === BASE_LOCALE && !own.some((o) => o.slug === p.slug),
    )
    return [...own, ...base].sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug))
  }

  return {
    apps,
    pages,
    page: (app, slug, locale) => pages(app, locale).find((p) => p.slug === slug),
    search(query, locale, app) {
      const words = anchorOf(query)
        .split('-')
        .filter((w) => w.length > 1)
      if (!words.length) return []
      const results: SearchResult[] = []
      for (const a of app ? [app] : apps)
        for (const page of pages(a, locale))
          for (const section of page.sections) {
            const title = anchorOf(`${page.title} ${section.title}`)
            const text = anchorOf(section.text)
            // Every word must appear; titles weigh more than text.
            if (!words.every((w) => title.includes(w) || text.includes(w))) continue
            const score = words.reduce(
              (s, w) => s + (title.includes(w) ? 5 : 0) + (text.split(w).length - 1),
              0,
            )
            results.push({ page, section, snippet: snippet(section.text, words), score })
          }
      return results.sort((a, b) => b.score - a.score).slice(0, 30)
    },
  }
}

/** ~140 characters around the first word found. */
function snippet(text: string, words: string[]): string {
  // Same length as `text` (accents dropped one by one), so positions line up.
  const lower = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  let at = -1
  for (const w of words) {
    at = lower.indexOf(w)
    if (at >= 0) break
  }
  const start = Math.max(0, at - 50)
  const out = text.slice(start, start + 140).trim()
  return `${start > 0 ? '…' : ''}${out}${start + 140 < text.length ? '…' : ''}`
}
