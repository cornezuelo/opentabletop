/**
 * What the main area shows, mirrored in the URL hash so views can be linked:
 * #/system/<id>/play (older links to the editing tabs, now in the Systems app, open play);
 * #/trip/<id> opens a saved trip (the Characters app's links), then shows its system.
 */
export type View =
  { name: 'welcome' } | { name: 'system'; id: string } | { name: 'trip'; id: string }

function parse(hash: string): View {
  const [name, id] = hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent)
  if ((name === 'system' || name === 'trip') && id) return { name, id }
  return { name: 'welcome' }
}

const format = (view: View): string =>
  view.name === 'system'
    ? `#/system/${encodeURIComponent(view.id)}/play`
    : view.name === 'trip'
      ? `#/trip/${encodeURIComponent(view.id)}`
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
