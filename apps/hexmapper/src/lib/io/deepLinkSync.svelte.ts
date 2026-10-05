import { formatCoord, keyOf, parseKey } from '@open-tabletop/hex'
import { t } from '../i18n/index.svelte'
import { editor } from '../store/editor.svelte'
import { showToast } from '../store/toasts.svelte'
import { view } from '../store/view'
import { openLibraryMap } from './actions.svelte'
import { formatDeepLink, parseDeepLink, resolveHexLabel } from './deepLink'

/** Shareable URL of the open map, or of one of its hexes (CCRR/axial label). */
export function deepLinkUrl(hexLabel?: string): string {
  return `${location.origin}${location.pathname}${formatDeepLink(editor.map.meta.id, hexLabel)}`
}

/** Opens the map (and hex) a `#/<mapId>/<hex>` link points to. */
async function follow(hash: string): Promise<void> {
  const link = parseDeepLink(hash)
  if (!link) return
  if (link.mapId !== editor.map.meta.id && !(await openLibraryMap(link.mapId))) {
    showToast(t('library.notFound', { id: link.mapId }), 'error', 8000)
    editor.panelView = 'library'
    // Point the URL back at the map that is actually open.
    history.replaceState(null, '', formatDeepLink(editor.map.meta.id))
    return
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
