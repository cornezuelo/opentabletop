import { formatCoord, parseKey, type HexKey } from '@open-tabletop/hex'
import type { NoteContext } from '@open-tabletop/ui-kit'
import { editor } from './store/editor.svelte'

/**
 * Where a note of the open map is, for the notes app (OpenTabletop's Notes looks for the page
 * among the map's campaign's, and makes it linking back): the map, or one of its cells by its
 * label (`map:<id>#0608`).
 */
export function noteContext(hex?: HexKey): NoteContext {
  const map = editor.map
  const label = hex ? formatCoord(parseKey(hex), 'CCRR', map.grid) : undefined
  return {
    ...(map.meta.campaign ? { campaign: map.meta.campaign } : {}),
    from: `map:${map.meta.id}${label ? `#${label}` : ''}`,
  }
}
