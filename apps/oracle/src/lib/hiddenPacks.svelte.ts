/**
 * Packs the user doesn't want in the Oracle's list (a preference of this browser, by pack
 * id). Hidden packs still load: other packs' tables and every app can use them.
 */
const KEY = 'opentabletop.oracle.hiddenPacks'

function load(): string[] {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(stored) ? stored.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

export const hiddenPacks = $state({ ids: load() })

export function isHidden(packId: string | undefined): boolean {
  return !!packId && hiddenPacks.ids.includes(packId)
}

export function setHidden(packId: string, hidden: boolean): void {
  const others = hiddenPacks.ids.filter((id) => id !== packId)
  hiddenPacks.ids = hidden ? [...others, packId] : others
  try {
    localStorage.setItem(KEY, JSON.stringify(hiddenPacks.ids))
  } catch {
    // Not remembered; it still applies now.
  }
}
