/**
 * References to a pack's definitions, as packs write them: `[pack/]kind.id`. The prefix is
 * the definition's `kind` as written (`table.ruins`, `generator.npc`, `roll-modes.advantage`,
 * `sheet.companion`), the pack goes first when it's another one (`core/table.twists`), and a
 * dynamic one keeps its template (`'table.weather-{{time.season}}'`). Ids have no dots, so
 * a reference reads one way.
 *
 * Inside the apps, a definition is still known by `pack/id` (history, journals and saved
 * maps keep that); only what packs write says the kind.
 */

/** What a reference names. */
export interface DefinitionRef {
  /** The pack, when the reference names another one's. */
  pack?: string
  kind: string
  id: string
}

/** Kinds of definition the Oracle rolls: they share one namespace of ids in a pack. */
export const ROLLABLE_KINDS = ['table', 'oracle', 'generator', 'deck'] as const

const REF = /^(?:([a-z0-9][a-z0-9-]*)\/)?([a-z][a-z-]*)\.([^/]+)$/

/** What `[pack/]kind.id` names, or undefined when it doesn't say its kind. */
export function parseRef(ref: string): DefinitionRef | undefined {
  const m = REF.exec(ref)
  if (!m) return undefined
  return { ...(m[1] && { pack: m[1] }), kind: m[2], id: m[3] }
}

/** A reference as packs write it: `writeRef('table', 'ruins', 'core')` is `core/table.ruins`. */
export const writeRef = (kind: string, id: string, pack?: string): string =>
  `${pack ? `${pack}/` : ''}${kind}.${id}`

/**
 * The definition a reference names from inside `pack`, as the apps know it (`pack/id`),
 * without checking it exists: undefined when it doesn't say its kind.
 */
export function refTarget(ref: string, pack: string): { kind: string; id: string } | undefined {
  const parsed = parseRef(ref)
  return parsed && { kind: parsed.kind, id: `${parsed.pack ?? pack}/${parsed.id}` }
}

/** Whether a reference is built at the moment it's rolled (`'table.weather-{{time.season}}'`). */
export const isDynamicRef = (ref: string): boolean => ref.includes('{{')

/** Whether a dynamic reference says its kind before its template (`table.weather-{{…}}`). */
export function dynamicKind(ref: string): string | undefined {
  return /^(?:[a-z0-9][a-z0-9-]*\/)?([a-z][a-z-]*)\.[^{]*\{\{/.exec(ref)?.[1]
}

/** Where references are looked for: a pack, its aliases and its dependencies. */
export interface RefScope {
  pack: string
  aliases?: Record<string, string>
  dependencies?: string[]
  /** Whether a definition of this kind exists with this full id (`pack/id`). */
  has: (kind: string, id: string) => boolean
  /** The kinds the field accepts (absent: any `has` knows). */
  kinds?: readonly string[]
}

/**
 * The full id (`pack/id`) a reference names from inside a pack: its aliases first, then the
 * pack named, or the pack's own and then its dependencies'. Null when nothing of that kind
 * has that id, or the reference doesn't say its kind.
 */
export function findRef(scope: RefScope, ref: string): string | null {
  const parsed = parseRef(scope.aliases?.[ref] ?? ref)
  if (!parsed || (scope.kinds && !scope.kinds.includes(parsed.kind))) return null
  const packs = parsed.pack ? [parsed.pack] : [scope.pack, ...(scope.dependencies ?? [])]
  for (const pack of packs) {
    const id = `${pack}/${parsed.id}`
    if (scope.has(parsed.kind, id)) return id
  }
  return null
}

/**
 * Why a reference names nothing, for a pack's author: it doesn't say its kind (and which
 * one it meant, if one fits), it names the wrong kind (and what the definition is), or
 * nothing has that id. `noun` names what was expected ("table", "sheet"); `kinds` are the
 * kinds the field accepts.
 */
export function refProblem(
  scope: RefScope,
  ref: string,
  noun: string,
  kinds: readonly string[],
): string {
  const written = scope.aliases?.[ref] ?? ref
  const parsed = parseRef(written)
  const [pack, id] = parsed
    ? [parsed.pack, parsed.id]
    : written.includes('/')
      ? written.split('/', 2)
      : [undefined, written]
  const packs = pack ? [pack] : [scope.pack, ...(scope.dependencies ?? [])]
  const found = (kind: string) => packs.find((p) => scope.has(kind, `${p}/${id}`))
  const fits = kinds.filter((k) => found(k) !== undefined)
  const meant = (kind: string) => writeRef(kind, id, pack)
  if (!parsed) {
    const example = meant(fits[0] ?? kinds[0])
    return fits.length
      ? `"${ref}" doesn't say what it names: write ${example}`
      : `Unknown ${noun} "${ref}": a reference says what it names (${example})`
  }
  if (!kinds.includes(parsed.kind)) {
    const what = fits.length ? `: write ${meant(fits[0])}` : ` (expected ${kinds.join(', ')})`
    return `"${ref}" names a ${parsed.kind}, which can't be used here${what}`
  }
  if (fits.length) return `"${ref}" is a ${fits[0]}: write ${meant(fits[0])}`
  return `Unknown ${noun} "${ref}"`
}
