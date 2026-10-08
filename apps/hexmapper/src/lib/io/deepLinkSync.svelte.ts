import { formatCoord, keyOf, parseKey } from '@open-tabletop/hex'
import { t } from '../i18n/index.svelte'
import { editor } from '../store/editor.svelte'
import { showToast } from '@open-tabletop/ui-kit'
import { view } from '../store/view'
import { openExampleMap, openLibraryMap, openMapFile } from './actions.svelte'
import { exampleMaps } from './examples'
import { ask } from '@open-tabletop/ui-kit'
import { formatDeepLink, parseDeepLink, parseExampleLink, resolveHexLabel } from './deepLink'

/** Shareable URL of the open map, or of one of its hexes (CCRR/axial label). */
export function deepLinkUrl(hexLabel?: string): string {
  return `${location.origin}${location.pathname}${formatDeepLink(editor.map.meta.id, hexLabel)}`
}

/** Opens the map (and hex) a `#/<mapId>/<hex>` link points to. */
async function follow(hash: string): Promise<void> {
  const example = parseExampleLink(hash)
  if (example) {
    // A system's example map (e.g. from its page in the Systems app).
    const found = exampleMaps().find((m) => m.pack === example.pack && m.path === example.path)
    if (found) await openExampleMap(found)
    else
      showToast(t('library.exampleMissing', { path: `${example.pack}/${example.path}` }), 'error')
    history.replaceState(null, '', formatDeepLink(editor.map.meta.id))
    return
  }
  const link = parseDeepLink(hash)
  if (!link) return
  if (link.mapId !== editor.map.meta.id && !(await openLibraryMap(link.mapId))) {
    // Not in this browser (another device, or its data was cleared): the link's id names
    // the file to open, and once it's loaded the link is followed.
    const choice = await ask(
      t('library.notFoundTitle'),
      t('library.notFound', { id: link.mapId }),
      [
        { value: 'cancel', label: t('newMap.cancel') },
        { value: 'open', label: t('library.openFile', { id: link.mapId }), kind: 'primary' },
      ],
    )
    const loaded = choice === 'open' ? await openMapFile() : null
    if (loaded !== link.mapId) {
      if (loaded) showToast(t('library.otherMap', { id: link.mapId }), 'error', 8000)
      // Point the URL back at the map that is actually open.
      history.replaceState(null, '', formatDeepLink(editor.map.meta.id))
      return
    }
  }
  if (!link.hex) return
  const cell = resolveHexLabel(link.hex, editor.map.grid)
  if (!cell) {
    showToast(t('library.hexNotFound', { hex: link.hex }), 'error')
    return
  }
  editor.tool = 'select'
  editor.panelView = 'tool'
  editor.selected = keyOf(cell)
  view.centerOn(cell)
}

/**
 * Follows the link in the URL now and on every hash change, and keeps the hash in
 * sync with the open map and selected hex so it can be copied into notes.
 */
export async function startDeepLinks(): Promise<() => void> {
  await follow(location.hash)
  const onHash = () => follow(location.hash)
  window.addEventListener('hashchange', onHash)
  const stopSync = $effect.root(() => {
    $effect(() => {
      const selected = editor.selected
      const label = selected
        ? formatCoord(parseKey(selected), editor.grid.coordFormat, editor.grid)
        : undefined
      const hash = formatDeepLink(editor.meta.id, label)
      // replaceState doesn't fire hashchange, so this never loops back into follow().
      if (location.hash !== hash) history.replaceState(null, '', hash)
    })
  })
  return () => {
    window.removeEventListener('hashchange', onHash)
    stopSync()
  }
}
