import { formatDiagnostic, type Registry } from '@open-tabletop/oracle-engine'
import { mapStyles, styleOf, type MapStyle, type NamedStyle } from '@open-tabletop/map'
import { library } from './play/packs'
import { editor } from './store/editor.svelte'

let loaded: { registry: Registry; styles: NamedStyle[] } | null = null

/** The styles of the loaded packs (`kind: style`), recomputed when the packs change. */
export function loadedStyles(): NamedStyle[] {
  const registry = library.registry
  if (loaded?.registry === registry) return loaded.styles
  const { styles, problems } = mapStyles(registry)
  for (const p of problems) console.warn(`[packs] ${formatDiagnostic(p)}`)
  loaded = { registry, styles }
  return styles
}

/** The style the open map is drawn in (Core's Schematic when it names none, or one not loaded). */
export const mapStyle = (): MapStyle => styleOf(editor.map, loadedStyles())
