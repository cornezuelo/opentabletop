import type { MessageKey } from '../i18n/types'

/**
 * External note apps a hex can link to. The hex only stores a provider-agnostic page
 * path (`HexData.note`); the user's chosen provider turns it into a URL. To add one,
 * implement NoteProvider and register it in `providers`.
 */
export interface NoteProviderSetting {
  key: string
  label: MessageKey
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

const silverbullet: NoteProvider = {
  id: 'silverbullet',
  name: 'SilverBullet',
  settings: [
    {
      key: 'baseUrl',
      label: 'preferences.silverbulletUrl',
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
  settings: [
    { key: 'vault', label: 'preferences.obsidianVault', placeholder: 'Kal-Arath', default: '' },
  ],
  url(path, settings) {
    const vault = (settings.vault ?? '').trim()
    const file = cleanPath(path)
    if (!vault || !file) return null
    return `obsidian://open?vault=${encodeURIComponent(vault)}&file=${encodeURIComponent(file)}`
  },
}

export const providers: readonly NoteProvider[] = [silverbullet, obsidian]

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
