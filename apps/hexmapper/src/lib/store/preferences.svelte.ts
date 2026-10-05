import { getProvider, providerSettings } from '@open-tabletop/note-refs'

/** Per-user preferences, kept in localStorage (never in the map file). */
export interface Preferences {
  noteProvider: string
  /** Settings per provider id, so switching providers keeps each one's values. */
  noteSettings: Record<string, Record<string, string>>
}

const STORAGE_KEY = 'hexmapper.preferences'

function load(): Preferences {
  const prefs: Preferences = { noteProvider: 'silverbullet', noteSettings: {} }
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    if (typeof stored?.noteProvider === 'string') prefs.noteProvider = stored.noteProvider
    if (typeof stored?.noteSettings === 'object' && stored.noteSettings)
      prefs.noteSettings = stored.noteSettings
  } catch {
    // Corrupt or unavailable storage: use defaults.
  }
  return prefs
}

export const preferences = $state<Preferences>(load())

function save(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
  } catch {
    // Not persisted; still applies to this session.
  }
}

export function setNoteProvider(id: string): void {
  preferences.noteProvider = id
  save()
}

export function setNoteSetting(providerId: string, key: string, value: string): void {
  preferences.noteSettings[providerId] = { ...preferences.noteSettings[providerId], [key]: value }
  save()
}

/** URL for a hex's linked note with the user's current provider, or null. */
export function noteUrl(path: string): string | null {
  const provider = getProvider(preferences.noteProvider)
  return provider.url(path, providerSettings(provider, preferences.noteSettings[provider.id]))
}
