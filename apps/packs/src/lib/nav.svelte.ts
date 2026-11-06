import { TABS } from './tabs'

/**
 * What the main area shows, mirrored in the URL hash so views can be linked:
 * #/system/<id>/<tab>[/<item>] (an item of the tab, unfolded: a template of the bestiary),
 * #/style/<pack>/<id> (a map style), #/pack/<folder> (a pack), #/file/<folder>/<path> (a file),
 * #/def/<folder>/<kind>/<id>[/<tab>] (a definition of a pack).
 */
export type Tab =
  | 'overview'
  | 'rules'
  | 'checks'
  | 'sheet'
  | 'items'
  | 'bestiary'
  | 'places'
  | 'factions'
  | 'clocks'
  | 'world'
  | 'calendar'
  | 'weather'
  | 'land'
  | 'modes'
  | 'try'
  | 'yaml'
/** A definition's tabs. */
export type DefTab = 'form' | 'yaml' | 'used'
const DEF_TABS: DefTab[] = ['form', 'yaml', 'used']

export type View =
  | { name: 'welcome' }
  | { name: 'system'; id: string; tab: Tab; item?: string }
  /** A map style, by its full id (`core/parchment`). */
  | { name: 'style'; ref: string }
  /** A pack's page, at its images if `at` says so. */
  | { name: 'pack'; root: string; at?: 'images' }
  | { name: 'def'; root: string; kind: string; id: string; tab: DefTab }
  | { name: 'file'; root: string; path: string; line?: number }

function parse(hash: string): View {
  const [name, id, tab, item, ...rest] = hash
    .replace(/^#\/?/, '')
    .split('/')
    .map(decodeURIComponent)
  if (name === 'pack' && id) return { name, root: id, ...(tab === 'images' && { at: tab }) }
  if (name === 'def' && id && tab && item)
    return {
      name,
      root: id,
      kind: tab,
      id: item,
      tab: DEF_TABS.includes(rest[0] as DefTab) ? (rest[0] as DefTab) : 'form',
    }
  if (name === 'file' && id && tab)
    return { name, root: id, path: [tab, item, ...rest].filter(Boolean).join('/') }
  if (name === 'style' && id && tab) return { name, ref: `${id}/${tab}` }
  if (name === 'system' && id)
    return {
      name,
      id,
      tab: TABS.includes(tab as Tab) ? (tab as Tab) : 'overview',
      ...(item && { item }),
    }
  return { name: 'welcome' }
}

function format(view: View): string {
  switch (view.name) {
    case 'style':
      return `#/style/${view.ref.split('/').map(encodeURIComponent).join('/')}`
    case 'system':
      return `#/system/${encodeURIComponent(view.id)}/${view.tab}${view.item ? `/${encodeURIComponent(view.item)}` : ''}`
    case 'pack':
      return `#/pack/${encodeURIComponent(view.root)}${view.at ? `/${view.at}` : ''}`
    case 'def':
      return `#/def/${[view.root, view.kind, view.id].map(encodeURIComponent).join('/')}${view.tab === 'form' ? '' : `/${view.tab}`}`
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
  // What a pack holds is found in the Packs list.
  if (IN_PACKS.includes(view.name)) side.view = 'packs'
  const hash = format(view)
  if (location.hash === hash) return
  if (replace) history.replaceState(null, '', hash)
  else history.pushState(null, '', hash)
}

window.addEventListener('popstate', () => {
  nav.view = parse(location.hash)
  if (IN_PACKS.includes(nav.view.name)) side.view = 'packs'
})

const IN_PACKS: View['name'][] = ['pack', 'def', 'file', 'style']

/** Which of the left column's lists shows: a preference of this browser. */
export type SideView = 'systems' | 'packs'
const SIDE = 'opentabletop.packs.side'
function readSide(): SideView {
  // What a link opened decides; otherwise the list last shown here.
  if (IN_PACKS.includes(nav.view.name)) return 'packs'
  try {
    return localStorage.getItem(SIDE) === 'packs' ? 'packs' : 'systems'
  } catch {
    return 'systems'
  }
}
export const side = $state<{ view: SideView }>({ view: readSide() })

export function showSide(view: SideView): void {
  side.view = view
  try {
    localStorage.setItem(SIDE, view)
  } catch {
    // Not remembered; it still shows now.
  }
}
