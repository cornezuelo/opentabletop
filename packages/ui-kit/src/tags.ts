/**
 * Lists of words edited as pills (`TagInput`): what typing adds, and the suggestions
 * grouped by the part of the name before its first dot (`time`, `trip`, `actions`…).
 */

/** What separates the words typed: commas (`dark, meal`), or spaces when a word holds commas (`15,9 16,9`). */
export type TagSeparator = 'comma' | 'space'

/** The list with what was typed added: split on its separator, trimmed, each word once. */
export function addTags(
  list: readonly string[],
  typed: string,
  separator: TagSeparator = 'comma',
): string[] {
  const out = [...list]
  for (const word of typed.split(separator === 'comma' ? ',' : /\s+/).map((w) => w.trim())) {
    if (word && !out.includes(word)) out.push(word)
  }
  return out
}

export interface TagGroup {
  /** What the names in it start with (`time`), or '' for names without a dot. */
  group: string
  items: string[]
}

/**
 * The choices that fit what's being typed and aren't taken yet, those starting with it
 * first, grouped by their first part in the order the groups first appear.
 */
export function tagChoices(
  choices: readonly string[],
  typed: string,
  taken: readonly string[],
  limit = 40,
): TagGroup[] {
  const prefix = typed.trim().toLowerCase()
  const free = [...new Set(choices)].filter((c) => !taken.includes(c))
  const starts = free.filter((c) => c.toLowerCase().startsWith(prefix))
  const contains = free.filter((c) => !starts.includes(c) && c.toLowerCase().includes(prefix))
  const groups: TagGroup[] = []
  for (const item of [...starts, ...contains].slice(0, limit)) {
    const dot = item.indexOf('.')
    const group = dot > 0 ? item.slice(0, dot) : ''
    const found = groups.find((g) => g.group === group)
    if (found) found.items.push(item)
    else groups.push({ group, items: [item] })
  }
  return groups
}
