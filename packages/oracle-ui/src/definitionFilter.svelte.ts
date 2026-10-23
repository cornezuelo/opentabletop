/**
 * What the lists of definitions show: some kinds only, and definitions with (or without)
 * some tags. A per-browser preference shared by the Oracle app and the Hexmapper's Oracle
 * panel, kept in step across tabs, as favorites are.
 */
const KEY = 'opentabletop.oracle.filter'

/** A tag chosen: only definitions with it, or only those without it. */
export type TagMode = 'only' | 'not'

export interface FilterState {
  /** Kinds shown; none chosen shows every kind. */
  kinds: string[]
  tags: Record<string, TagMode>
}

/** Whether a definition passes: one of the chosen kinds, every `only` tag, no `not` tag. */
export function passesFilter(def: { kind: string; tags: readonly string[] }, filter: FilterState) {
  if (filter.kinds.length && !filter.kinds.includes(def.kind)) return false
  return Object.entries(filter.tags).every(([tag, mode]) =>
    mode === 'only' ? def.tags.includes(tag) : !def.tags.includes(tag),
  )
}

/** Off → only these → all but these → off. */
export function nextTagMode(mode: TagMode | undefined): TagMode | undefined {
  return mode === undefined ? 'only' : mode === 'only' ? 'not' : undefined
}

function read(): FilterState {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    const kinds = Array.isArray(raw.kinds)
      ? raw.kinds.filter((k: unknown): k is string => typeof k === 'string')
      : []
    const tags: Record<string, TagMode> = {}
    for (const [tag, mode] of Object.entries(raw.tags ?? {}))
      if (mode === 'only' || mode === 'not') tags[tag] = mode
    return { kinds, tags }
  } catch {
    return { kinds: [], tags: {} }
  }
}

class DefinitionFilter {
  state = $state<FilterState>(read())

  constructor() {
    if (typeof window !== 'undefined')
      window.addEventListener('storage', (e) => {
        if (e.key === KEY) this.state = read()
      })
  }

  /** How many choices are made (kinds and tags). */
  get count(): number {
    return this.state.kinds.length + Object.keys(this.state.tags).length
  }

  passes(def: { kind: string; tags: readonly string[] }): boolean {
    return passesFilter(def, this.state)
  }

  toggleKind(kind: string): void {
    const { kinds } = this.state
    this.save({
      ...this.state,
      kinds: kinds.includes(kind) ? kinds.filter((k) => k !== kind) : [...kinds, kind],
    })
  }

  cycleTag(tag: string): void {
    const tags = { ...this.state.tags }
    const mode = nextTagMode(tags[tag])
    if (mode) tags[tag] = mode
    else delete tags[tag]
    this.save({ ...this.state, tags })
  }

  clear(): void {
    this.save({ kinds: [], tags: {} })
  }

  private save(state: FilterState): void {
    this.state = state
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      // Not remembered; it still applies now.
    }
  }
}

export const definitionFilter = new DefinitionFilter()
