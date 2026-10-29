import { hasTags } from '@open-tabletop/ui-kit'

/** An entry of the left column's lists: a character of the roster or a template of a bestiary. */
export interface ListEntry {
  /** Its id in the list (a character's id; `<bestiary>:<template>`). */
  key: string
  name: string
  tags: readonly string[]
  /** Its system (`''`: none loaded) and the sheet it's made with, with their names. */
  system: string
  systemTitle: string
  sheet: string
  sheetTitle: string
}

/** A system's entries, by the sheets they're made with. */
export interface ListGroup {
  system: string
  title: string
  sheets: { sheet: string; title: string; entries: ListEntry[] }[]
}

/** The entries whose name, id or tags hold what's searched, and that have every tag chosen. */
export function filterEntries(
  entries: readonly ListEntry[],
  search: string,
  chosen: readonly string[],
): ListEntry[] {
  const wanted = search.trim().toLowerCase()
  return entries.filter(
    (e) =>
      hasTags(e.tags, chosen) &&
      (!wanted || `${e.name} ${e.key} ${e.tags.join(' ')}`.toLowerCase().includes(wanted)),
  )
}

/**
 * The entries by system, in `systemOrder` (no system last), then by sheet: the system's
 * first sheet (`firstSheet`, its characters') first, the rest by name.
 */
export function groupEntries(
  entries: readonly ListEntry[],
  systemOrder: (system: string) => number,
  firstSheet: (system: string) => string | undefined,
): ListGroup[] {
  const groups: ListGroup[] = []
  for (const e of entries) {
    let group = groups.find((g) => g.system === e.system)
    if (!group) groups.push((group = { system: e.system, title: e.systemTitle, sheets: [] }))
    let sheet = group.sheets.find((s) => s.sheet === e.sheet)
    if (!sheet) group.sheets.push((sheet = { sheet: e.sheet, title: e.sheetTitle, entries: [] }))
    sheet.entries.push(e)
  }
  const order = (system: string) => (system === '' ? Infinity : systemOrder(system))
  for (const g of groups) {
    const first = firstSheet(g.system)
    g.sheets.sort(
      (a, b) =>
        Number(b.sheet === first) - Number(a.sheet === first) || a.title.localeCompare(b.title),
    )
  }
  return groups.sort((a, b) => order(a.system) - order(b.system))
}
