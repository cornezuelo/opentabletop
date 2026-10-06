/**
 * Definitions pinned as favorites: a per-browser preference shared by every app on the
 * same site (the Oracle app and the Hexmapper's Oracle panel), kept in step across tabs.
 */
const KEY = 'opentabletop.favorites'

function read(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(raw) ? raw.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

class Favorites {
  ids = $state<string[]>(read())

  constructor() {
    if (typeof window !== 'undefined')
      window.addEventListener('storage', (e) => {
        if (e.key === KEY) this.ids = read()
      })
  }

  has(id: string): boolean {
    return this.ids.includes(id)
  }

  toggle(id: string): void {
    this.ids = this.has(id) ? this.ids.filter((i) => i !== id) : [...this.ids, id]
    try {
      localStorage.setItem(KEY, JSON.stringify(this.ids))
    } catch {
      // Not remembered; it still applies now.
    }
  }
}

export const favorites = new Favorites()
