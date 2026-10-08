/**
 * What the main area shows, mirrored in the URL hash so views can be linked:
 * #/def/<pack>/<id>, #/pack/<folder>, #/file/<folder>/<path>.
 */
export type View =
  | { name: 'welcome' }
  | { name: 'def'; id: string; tab: 'roll' | 'edit' }
  | { name: 'pack'; root: string }
  | { name: 'file'; root: string; path: string; line?: number }

function parse(hash: string): View {
  const [name, ...rest] = hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent)
  if (name === 'def' && rest.length >= 2)
    return { name, id: `${rest[0]}/${rest[1]}`, tab: rest[2] === 'edit' ? 'edit' : 'roll' }
  if (name === 'pack' && rest[0]) return { name, root: rest[0] }
  if (name === 'file' && rest.length >= 2)
    return { name, root: rest[0], path: rest.slice(1).join('/') }
  return { name: 'welcome' }
}

function format(view: View): string {
  switch (view.name) {
    case 'def':
      return `#/def/${view.id}${view.tab === 'edit' ? '/edit' : ''}`
    case 'pack':
      return `#/pack/${encodeURIComponent(view.root)}`
    case 'file':
      return `#/file/${encodeURIComponent(view.root)}/${view.path}`
    default:
      return '#/'
  }
}

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
