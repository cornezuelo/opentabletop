/**
 * What the main area shows, mirrored in the URL hash so views can be linked (the other
 * apps' **Open in Campaign**): #/campaign/<id> (its Overview), #/campaign/<id>/<tab>,
 * #/campaign/<id>/factions/<faction> (that faction's card open), #/new.
 */
export const TABS = [
  'overview',
  'world',
  'maps',
  'trips',
  'characters',
  'factions',
  'timeline',
] as const
export type Tab = (typeof TABS)[number]

export type View =
  | { name: 'welcome' }
  | { name: 'new' }
  | { name: 'campaign'; id: string; tab: Tab; faction?: string }

const isTab = (value: string | undefined): value is Tab => TABS.includes(value as Tab)

export function parseView(hash: string): View {
  const [name, id, tab, faction] = hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent)
  if (name === 'campaign' && id)
    return tab === 'factions' && faction
      ? { name, id, tab, faction }
      : // Older links: `places` was its maps and trips together.
        { name, id, tab: tab === 'places' ? 'maps' : isTab(tab) ? tab : 'overview' }
  if (name === 'new') return { name }
  return { name: 'welcome' }
}

export const formatView = (view: View): string =>
  view.name === 'campaign'
    ? `#/campaign/${encodeURIComponent(view.id)}${view.tab === 'overview' ? '' : `/${view.tab}`}${
        view.faction ? `/${encodeURIComponent(view.faction)}` : ''
      }`
    : view.name === 'new'
      ? '#/new'
      : '#/'

export const nav = $state<{ view: View }>({ view: parseView(location.hash) })

/** Shows a view; `replace` takes the place of the current history entry instead of adding one. */
export function go(view: View, replace = false): void {
  nav.view = view
  const hash = formatView(view)
  if (location.hash === hash) return
  if (replace) history.replaceState(null, '', hash)
  else history.pushState(null, '', hash)
}

window.addEventListener('popstate', () => {
  nav.view = parseView(location.hash)
})
