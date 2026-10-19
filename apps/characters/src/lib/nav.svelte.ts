/**
 * What the main area shows, mirrored in the URL hash so views can be linked (the trip panel's
 * **Open in Characters**): #/character/<id>, #/new.
 */
export type View = { name: 'welcome' } | { name: 'new' } | { name: 'character'; id: string }

function parse(hash: string): View {
  const [name, id] = hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent)
  if (name === 'character' && id) return { name, id }
  if (name === 'new') return { name }
  return { name: 'welcome' }
}

const format = (view: View): string =>
  view.name === 'character'
    ? `#/character/${encodeURIComponent(view.id)}`
    : view.name === 'new'
      ? '#/new'
      : '#/'

export const nav = $state<{ view: View }>({ view: parse(location.hash) })

/** Shows a view; `replace` takes the place of the current history entry instead of adding one. */
export function go(view: View, replace = false): void {
  nav.view = view
  const hash = format(view)
  if (location.hash === hash) return
  if (replace) history.replaceState(null, '', hash)
  else history.pushState(null, '', hash)
}

window.addEventListener('popstate', () => {
  nav.view = parse(location.hash)
})
