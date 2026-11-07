import type { HexKey, MapStart } from '@open-tabletop/map'

/** What the New map dialog answers: a map to start, and the cell of the open map it hangs from. */
export interface NewMapAnswer {
  name: string
  start: MapStart
  under?: HexKey
}

/** How it's asked. */
export interface NewMapAsked {
  /** The open map's cell a sub-map may hang from. */
  place?: HexKey
  /** It starts ticked. */
  under?: boolean
  /** Only a sub-map of `place`: a cell asked for one. */
  subMap?: boolean
  name?: string
}

/** The dialog open now. */
export const newMapDialog = $state<{
  asked: NewMapAsked | null
  answer: (answer: NewMapAnswer | null) => void
}>({ asked: null, answer: () => {} })

/** Opens New map (App mounts it): what to start, or null if cancelled. */
export function askNewMap(asked: NewMapAsked = {}): Promise<NewMapAnswer | null> {
  return new Promise((resolve) => {
    newMapDialog.answer = (answer) => {
      newMapDialog.asked = null
      resolve(answer)
    }
    newMapDialog.asked = asked
  })
}
