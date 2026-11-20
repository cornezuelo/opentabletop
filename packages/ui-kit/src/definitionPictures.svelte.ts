/**
 * Pictures you chose for a pack's definitions (an item of a catalogue, a bestiary's template):
 * packs hold no pictures (docs/character-pictures.md §6), so each is yours, a picture of the
 * image library kept in this browser by the definition's reference (`items:core/gear#rope`,
 * `templates:grey-marches/bestiary#wolf`), shown wherever the definition is, unless a thing
 * made from it has its own. A preference, under `opentabletop.`, so backups keep it.
 */
export const DEFINITION_PICTURES_KEY = 'opentabletop.definitionPictures'

type Store = Pick<Storage, 'getItem' | 'setItem'>

/** The pictures kept, by reference (empty when there are none or they can't be read). */
export function readDefinitionPictures(
  storage: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage,
): Record<string, string> {
  try {
    const raw = JSON.parse(storage?.getItem(DEFINITION_PICTURES_KEY) ?? '{}') as unknown
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {}
    return Object.fromEntries(
      Object.entries(raw).filter((e): e is [string, string] => typeof e[1] === 'string'),
    )
  } catch {
    return {}
  }
}

/** A definition's reference: its kind, where it is (`pack/id` of its file) and its id. */
export const definitionRef = (kind: string, from: string, id: string) => `${kind}:${from}#${id}`

const pictures = $state<{ all: Record<string, string> }>({ all: readDefinitionPictures() })

if (typeof window !== 'undefined')
  // Chosen in another app (Packs while a trip plays in Map): seen here too.
  window.addEventListener('storage', (e) => {
    if (e.key === DEFINITION_PICTURES_KEY) pictures.all = readDefinitionPictures()
  })

/** The picture chosen for a definition, by reference (undefined: none). */
export function definitionPicture(ref: string | undefined): string | undefined {
  return ref ? pictures.all[ref] : undefined
}

/** Chooses a definition's picture, or forgets it (`undefined`). */
export function setDefinitionPicture(
  ref: string,
  picture: string | undefined,
  storage: Store | undefined = globalThis.localStorage,
): void {
  const next = { ...pictures.all }
  if (picture) next[ref] = picture
  else delete next[ref]
  pictures.all = next
  try {
    storage?.setItem(DEFINITION_PICTURES_KEY, JSON.stringify(next))
  } catch {
    // Kept while the page lives; nothing else depends on it.
  }
}
