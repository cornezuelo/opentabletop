import { pageHash } from '@open-tabletop/notes-ui'

/**
 * What the main area shows, mirrored in the URL hash so pages can be linked: #/page/<id>;
 * #/ref/<path>[?in=<campaign>&from=<thing>], a `noteRef` of another app (note-refs'
 * OpenTabletop Notes provider), opened as the page it reaches, or made.
 */
export type View =
  | { name: 'welcome' }
  | { name: 'page'; id: string; heading?: string }
  | { name: 'ref'; path: string; campaign?: string; from?: string }

export function parseView(hash: string): View {
  const raw = hash.replace(/^#\/?/, '')
  const [route, query = ''] = raw.split('?')
  const parts = route.split('/')
  try {
    if (parts[0] === 'page' && parts[1]) return { name: 'page', id: decodeURIComponent(parts[1]) }
    if (parts[0] === 'ref' && parts.length > 1) {
      const path = parts.slice(1).map(decodeURIComponent).join('/')
      // eslint-disable-next-line svelte/prefer-svelte-reactivity -- read once, never state
      const params = new URLSearchParams(query)
      const campaign = params.get('in') || undefined
      const from = params.get('from') || undefined
      if (path)
        return {
          name: 'ref',
          path,
          ...(campaign ? { campaign } : {}),
          ...(from ? { from } : {}),
        }
    }
  } catch {
    // A broken link: the welcome.
  }
  return { name: 'welcome' }
}

export const formatView = (view: View): string =>
  view.name === 'page'
    ? pageHash(view.id)
    : view.name === 'ref'
      ? `#/ref/${view.path.split('/').map(encodeURIComponent).join('/')}`
      : '#/'

export const nav = $state<{ view: View }>({
  view: typeof location === 'undefined' ? { name: 'welcome' } : parseView(location.hash),
})

/** Shows a view; `replace` takes the place of the current history entry instead of adding one. */
export function go(view: View, replace = false): void {
  nav.view = view
  const hash = formatView(view)
  if (location.hash === hash) return
  if (replace) history.replaceState(null, '', hash)
  else history.pushState(null, '', hash)
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    nav.view = parseView(location.hash)
  })
  // Another app opening a page in this tab (its link's address changes only the hash).
  window.addEventListener('hashchange', () => {
    nav.view = parseView(location.hash)
  })
}
