/**
 * The manual's summary of the Markdown Notes reads (`<!-- markdown-summary -->` in Notes'
 * Getting started), written once there and read wherever it's shown: the welcome page, the
 * writing bar's **Markdown** in the help column.
 */
const manuals = import.meta.glob('../../../docs/manual/*/notes/01-getting-started.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

export const SUMMARY_MARK = '<!-- markdown-summary -->'

/** What a manual page's summary of Markdown says, links within the manual made plain. */
export function summaryOf(manual: string): string {
  const from = manual.indexOf(SUMMARY_MARK)
  const to = manual.indexOf('<!-- /markdown-summary -->')
  if (from < 0 || to < from) return ''
  return manual
    .slice(from + SUMMARY_MARK.length, to)
    .replace(/\[([^\]]+)\]\((?:#|\.\.?\/)[^)]*\)/g, '$1')
    .trim()
}

/** The summary of Markdown in `locale` (English where the manual has none). */
export function markdownSummary(locale: string): string {
  const of = (l: string) =>
    Object.entries(manuals).find(([p]) => p.endsWith(`/${l}/notes/01-getting-started.md`))?.[1]
  return summaryOf(of(locale) ?? of('en') ?? '')
}
