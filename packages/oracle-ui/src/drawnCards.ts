import type { DrawnFace, Resolution } from '@open-tabletop/oracle-engine'

/**
 * The cards a result's fields drew (a generator's hand or spread): each card drawn from a deck,
 * with its face, or an empty one when its deck gives none (a card of words alone is drawn with
 * its words on it), its text and its place.
 */
export const drawnCards = (r: Resolution) =>
  r.children
    .filter((c) => c.kind === 'deck')
    .map((c) => ({ face: c.face ?? ({} as DrawnFace), text: c.text, place: c.place }))
