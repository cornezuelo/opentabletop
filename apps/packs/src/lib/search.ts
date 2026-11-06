/** Lowercase and without accents, so `camp` finds _Acampar_ and `dia` finds _día_. */
const plain = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * Whether a card's texts hold every word of a search (in any order, any of the texts):
 * `night camp` finds a check named _Night encounter_ rolled at `actions.camp`. An empty
 * search holds for every card.
 */
export function matches(query: string, texts: readonly unknown[]): boolean {
  const words = plain(query).split(/\s+/).filter(Boolean)
  if (!words.length) return true
  const haystack = plain(
    texts
      .filter((x) => x !== undefined && x !== null)
      .map((x) => (typeof x === 'string' ? x : JSON.stringify(x)))
      .join(' '),
  )
  return words.every((w) => haystack.includes(w))
}
