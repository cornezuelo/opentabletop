import { getProvider, providerSettings } from '@open-tabletop/note-refs'
import { appName, appUrl } from './apps'

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
/** OpenTabletop's own Notes, unless the player chose another notes app. */
export const DEFAULT_PROVIDER = 'opentabletop'
/** Where Map kept them before every app shared them. */
const LEGACY_KEY = 'hexmapper.preferences'

export function readNotePreferences(storage: Pick<Storage, 'getItem'>): NotePreferences {
  const prefs: NotePreferences = { provider: DEFAULT_PROVIDER, settings: {} }
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
    ? { provider: DEFAULT_PROVIDER, settings: {} }
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

/** Whether the player's notes app is OpenTabletop's own Notes. */
export const usesOwnNotes = (): boolean =>
  getProvider(notePreferences.provider).id === 'opentabletop'

/** The name of the user's notes app, e.g. for "Open in SilverBullet" (Notes in `locale`). */
export function noteProviderName(locale = 'en'): string {
  return usesOwnNotes() ? appName('notes', locale) : getProvider(notePreferences.provider).name
}

/** Where a `noteRef` is: the campaign of the thing, and the thing as a link into the games. */
export interface NoteContext {
  campaign?: string
  /** `character:kael`, `map:<id>#0608`, `faction:<campaign>/<id>`, `campaign:<id>`. */
  from?: string
}

/**
 * URL of a linked note (`noteRef`) in the user's notes app, or null if it isn't set up. In
 * OpenTabletop's Notes, `context` finds (or makes) the page among the thing's campaign's.
 */
export function noteUrl(path: string, context: NoteContext = {}): string | null {
  const provider = getProvider(notePreferences.provider)
  const settings = providerSettings(provider, notePreferences.settings[provider.id])
  return provider.url(
    path,
    provider.id === 'opentabletop'
      ? {
          appUrl: appUrl('notes'),
          ...(context.campaign ? { campaign: context.campaign } : {}),
          ...(context.from ? { from: context.from } : {}),
        }
      : settings,
  )
}
