import type { ListDoc } from './partDoc.svelte'

type Item = Record<string, unknown>
const list = (data: Item, key: string) => (Array.isArray(data[key]) ? (data[key] as Item[]) : [])

/**
 * Renames a calendar's month, and everything that names it along with it: its
 * translations, the holidays in it and the month day 1 falls in. False if the id is taken.
 */
export function renameMonth(doc: ListDoc, index: number, to: string): boolean {
  const data = doc.data('')
  const months = list(data, 'months')
  const from = String(months[index]?.id ?? '')
  if (!to || to === from) return true
  if (months.some((m) => m?.id === to)) return false
  doc.edit('', ['months', index, 'id'], to)
  if (from) doc.renameTranslations('', ['months'], from, to)
  list(data, 'holidays').forEach((h, i) => {
    if (h?.month === from) doc.edit('', ['holidays', i, 'month'], to)
  })
  if ((data.start as Item | undefined)?.month === from) doc.edit('', ['start', 'month'], to)
  return true
}
