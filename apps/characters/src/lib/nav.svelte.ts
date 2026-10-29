/**
 * What the main area shows, mirrored in the URL hash so views can be linked (the trip panel's
 * **Open in Characters**): #/character/<id>, #/new, #/bestiary[/<bestiary>/<template>],
 * #/new-template.
 */
export type View =
  | { name: 'welcome' }
  | { name: 'new' }
  | { name: 'newTemplate' }
  | { name: 'bestiary'; bestiary?: string; template?: string }
  | { name: 'character'; id: string }

function parse(hash: string): View {
  const [name, id, template] = hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent)
  if (name === 'character' && id) return { name, id }
  if (name === 'bestiary' && id && template) return { name, bestiary: id, template }
  if (name === 'new' || name === 'bestiary') return { name }
  if (name === 'new-template') return { name: 'newTemplate' }
  return { name: 'welcome' }
}

const format = (view: View): string =>
  view.name === 'character'
    ? `#/character/${encodeURIComponent(view.id)}`
    : view.name === 'new'
      ? '#/new'
      : view.name === 'newTemplate'
        ? '#/new-template'
        : view.name === 'bestiary'
          ? view.bestiary && view.template
            ? `#/bestiary/${encodeURIComponent(view.bestiary)}/${encodeURIComponent(view.template)}`
            : '#/bestiary'
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
