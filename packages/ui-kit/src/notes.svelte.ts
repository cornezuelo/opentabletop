import { getProvider, providerSettings } from '@open-tabletop/note-refs'

/**
 * The user's notes app (SilverBullet, Obsidian…) and its settings: a preference of this
 * browser shared by every app, never saved with a map or a trip.
 */
export interface NotePreferences {
  provider: string
  /** Settings per provider id, so switching providers keeps each one's values. */
  settings: Record<string, Record<string, string>>
}

export const NOTES_KEY = 'opentabletop.notes'
/** Where the Hexmapper kept them before every app shared them. */
const LEGACY_KEY = 'hexmapper.preferences'

export function readNotePreferences(storage: Pick<Storage, 'getItem'>): NotePreferences {
  const prefs: NotePreferences = { provider: 'silverbullet', settings: {} }
  try {
    const raw = storage.getItem(NOTES_KEY)
    if (raw) {
      const stored = JSON.parse(raw)
      if (typeof stored?.provider === 'string') prefs.provider = stored.provider
      if (typeof stored?.settings === 'object' && stored.settings) prefs.settings = stored.settings
      return prefs
    }
    const legacy = JSON.parse(storage.getItem(LEGACY_KEY) ?? '{}')
    if (typeof legacy?.noteProvider === 'string') prefs.provider = legacy.noteProvider
    if (typeof legacy?.noteSettings === 'object' && legacy.noteSettings)
      prefs.settings = legacy.noteSettings
  } catch {
    // Corrupt or unavailable storage: use defaults.
  }
  return prefs
}

function load(): NotePreferences {
  return typeof localStorage === 'undefined'
    ? { provider: 'silverbullet', settings: {} }
    : readNotePreferences(localStorage)
}

export const notePreferences = $state<NotePreferences>(load())

function save(): void {
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notePreferences))
  } catch {
    // Not persisted; still applies to this session.
  }
}

if (typeof window !== 'undefined')
  window.addEventListener('storage', (e) => {
    if (e.key !== NOTES_KEY) return
    Object.assign(notePreferences, load())
  })

export function setNoteProvider(id: string): void {
  notePreferences.provider = id
  save()
}

export function setNoteSetting(providerId: string, key: string, value: string): void {
  notePreferences.settings[providerId] = { ...notePreferences.settings[providerId], [key]: value }
  save()
}

/** The name of the user's notes app, e.g. for "Open in SilverBullet". */
export function noteProviderName(): string {
  return getProvider(notePreferences.provider).name
}

/** URL of a linked note (`noteRef`) in the user's notes app, or null if it isn't set up. */
export function noteUrl(path: string): string | null {
  const provider = getProvider(notePreferences.provider)
  return provider.url(path, providerSettings(provider, notePreferences.settings[provider.id]))
}
