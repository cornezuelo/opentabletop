import type { LocalizedText, Registry } from '@open-tabletop/oracle-engine'

/** What a value a table reads is called, and what it is, for people. */
export interface ValueInfo {
  name?: string
  description?: string
}

/**
 * The facts maps and trips give tables (see the manual's "What tables see"), keyed for the
 * dictionary (`values.<key>`, dots as `_`); prefixes cover families (`moons.pale`…).
 */
export const BUILT_IN_VALUES = [
  'hex',
  'terrain',
  'water',
  'tags',
  'region',
  'name',
  'icon.id',
  'token.name',
  'token.kind',
  'season',
  'weather',
  'mode',
  'day',
  'month',
  'year',
  'weekday',
  'holidays',
  'edges',
  'party.fatigue',
  'party.mode',
  'yesterday.lost',
  'from',
  'aroundCount',
  'common',
  'commonCount',
] as const
const BUILT_IN_FAMILIES = [
  'moons',
  'party.stats',
  'party.resources',
  'yesterday',
  'around',
  'icon',
  'token',
]

type Text = LocalizedText | undefined
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * Names for the values tables read, from three places: the facts the apps give (named by
 * the app's dictionary), each system's stats and supplies, and the values its bindings
 * declare it reads (`reads: { icon.guards: { name, description } }`), translated like the
 * rest of the pack. Undefined when nobody names it: the key is shown as it is.
 */
export function valueNames(
  registry: () => Registry,
  locale: () => string,
  dictionary: (key: string) => string | undefined,
): (key: string) => ValueInfo {
  const local = (text: Text) =>
    text === undefined || typeof text === 'string'
      ? text
      : (text[locale()] ?? text.en ?? Object.values(text)[0])
  const declared = () => {
    const out = new Map<string, { name?: Text; description?: Text }>()
    for (const extras of registry().extras.values())
      for (const extra of extras) {
        const data = extra.data
        if (extra.kind === 'bindings') {
          for (const [id, stat] of Object.entries(isRecord(data.stats) ? data.stats : {}))
            if (isRecord(stat)) {
              const info = { name: stat.name as Text, description: stat.description as Text }
              out.set(id, info)
              out.set(`party.stats.${id}`, info)
            }
          for (const [key, info] of Object.entries(isRecord(data.reads) ? data.reads : {}))
            if (isRecord(info))
              out.set(key, { name: info.name as Text, description: info.description as Text })
        }
        if (extra.kind === 'travel-rules')
          for (const [id, r] of Object.entries(isRecord(data.resources) ? data.resources : {}))
            if (isRecord(r) && r.name !== undefined)
              out.set(`party.resources.${id}`, {
                name: r.name as Text,
                description: r.description as Text,
              })
      }
    return out
  }
  return (key) => {
    const fromPack = declared().get(key)
    if (fromPack?.name !== undefined)
      return { name: local(fromPack.name), description: local(fromPack.description) }
    const word = key.replaceAll('.', '_')
    const name = dictionary(`values.${word}`)
    if (name) return { name, description: dictionary(`valueHelp.${word}`) }
    // A family: "Moon: pale", "Yesterday: fordModifier"…
    const family = BUILT_IN_FAMILIES.find((f) => key.startsWith(`${f}.`))
    const familyName = family && dictionary(`values.${family.replaceAll('.', '_')}`)
    if (family && familyName) {
      const rest = key.slice(family.length + 1)
      const inner = rest && declared().get(rest)
      return {
        name: `${familyName}: ${(inner && local(inner.name)) || rest}`,
        description: dictionary(`valueHelp.${family.replaceAll('.', '_')}`),
      }
    }
    return {}
  }
}
