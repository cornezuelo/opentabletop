/**
 * External note apps an entity can link to. Entities only store a provider-agnostic
 * path (`noteRef`); the user's chosen provider turns it into a URL. To add one,
 * implement NoteProvider and register it in `providers`.
 *
 * No i18n here: UIs label settings by `<provider id>.<setting key>`.
 */
export interface NoteProviderSetting {
  key: string
  placeholder: string
  default: string
}

export interface NoteProvider {
  id: string
  name: string
  settings: NoteProviderSetting[]
  /** Null when settings or path are missing. */
  url(path: string, settings: Record<string, string>): string | null
}

/** Trims slashes and a `.md` suffix so paths copied from either app work. */
export function cleanPath(path: string): string {
  return path
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .replace(/\.md$/i, '')
}

/**
 * OpenTabletop's own Notes app. It has no settings of its own: the app that asks gives
 * `appUrl` (where Notes is), and may give `campaign` (where the thing linking is, so the
 * page is looked for, or made, among that campaign's) and `from` (the thing, as a link into
 * the games: `character:kael`, so a page made for it links back).
 */
const opentabletop: NoteProvider = {
  id: 'opentabletop',
  name: 'OpenTabletop Notes',
  settings: [],
  url(path, settings) {
    const base = settings.appUrl ?? ''
    const page = cleanPath(path)
    if (!base || !page) return null
    const query = new URLSearchParams()
    if (settings.campaign) query.set('in', settings.campaign)
    if (settings.from) query.set('from', settings.from)
    const tail = query.size ? `?${query}` : ''
    return `${base}#/ref/${page.split('/').map(encodeURIComponent).join('/')}${tail}`
  },
}

const silverbullet: NoteProvider = {
  id: 'silverbullet',
  name: 'SilverBullet',
  settings: [
    {
      key: 'baseUrl',
      placeholder: 'http://localhost:3001',
      default: 'http://localhost:3001',
    },
  ],
  url(path, settings) {
    const base = (settings.baseUrl ?? '').trim().replace(/\/+$/, '')
    const page = cleanPath(path)
    if (!base || !page) return null
    return `${base}/${page.split('/').map(encodeURIComponent).join('/')}`
  },
}

const obsidian: NoteProvider = {
  id: 'obsidian',
  name: 'Obsidian',
  settings: [{ key: 'vault', placeholder: 'My campaign', default: '' }],
  url(path, settings) {
    const vault = (settings.vault ?? '').trim()
    const file = cleanPath(path)
    if (!vault || !file) return null
    return `obsidian://open?vault=${encodeURIComponent(vault)}&file=${encodeURIComponent(file)}`
  },
}

/** The first is the default. */
export const providers: readonly NoteProvider[] = [opentabletop, silverbullet, obsidian]

export function getProvider(id: string): NoteProvider {
  return providers.find((p) => p.id === id) ?? providers[0]
}

/** Settings for a provider with defaults filled in. */
export function providerSettings(
  provider: NoteProvider,
  stored: Record<string, string> | undefined,
): Record<string, string> {
  return Object.fromEntries(provider.settings.map((s) => [s.key, stored?.[s.key] ?? s.default]))
}
