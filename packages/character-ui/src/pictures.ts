import type { CharacterState, ItemState } from '@open-tabletop/character-engine'
import { definitionPicture, definitionRef } from '@open-tabletop/ui-kit'

/**
 * The pictures shown for characters and items: their own, else the one chosen for what they
 * were made from (a bestiary's template, a catalogue's entry), kept in this browser, never in
 * the pack (ui-kit's `definitionPicture`). Read where they're drawn, so a choice shows at once.
 */

/** A template's reference among the definitions' pictures (`templates:<bestiary>#<id>`). */
export const templatePictureRef = (template: { id: string; from: string }) =>
  definitionRef('templates', template.from, template.id)

/** A catalogue entry's reference among the definitions' pictures (`items:<catalogue>#<id>`). */
export const itemPictureRef = (item: { id: string; from?: string }) =>
  item.from ? definitionRef('items', item.from, item.id) : undefined

/** A character's picture: its portrait, else its template's. */
export const characterPicture = (character: CharacterState | undefined): string | undefined =>
  character?.picture ??
  (character?.template ? definitionPicture(templatePictureRef(character.template)) : undefined)

/** An item's picture: its own, else its catalogue entry's. */
export const itemPicture = (item: ItemState): string | undefined =>
  item.picture ?? definitionPicture(itemPictureRef(item))
