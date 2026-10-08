import { describe, expect, it } from 'vitest'
import { NOTES_KEY, readNotePreferences } from './notes.svelte'

const storage = (items: Record<string, string>) => ({
  getItem: (key: string) => items[key] ?? null,
})

describe('the notes app preference', () => {
  it('defaults to SilverBullet with no settings', () => {
    expect(readNotePreferences(storage({}))).toEqual({ provider: 'silverbullet', settings: {} })
  })

  it('reads what the Hexmapper kept before every app shared it', () => {
    const legacy = { noteProvider: 'obsidian', noteSettings: { obsidian: { vault: 'Marches' } } }
    expect(
      readNotePreferences(storage({ 'hexmapper.preferences': JSON.stringify(legacy) })),
    ).toEqual({ provider: 'obsidian', settings: { obsidian: { vault: 'Marches' } } })
  })

  it('prefers the shared key, and survives broken storage', () => {
    const shared = { provider: 'obsidian', settings: {} }
    const legacy = { noteProvider: 'silverbullet' }
    expect(
      readNotePreferences(
        storage({
          [NOTES_KEY]: JSON.stringify(shared),
          'hexmapper.preferences': JSON.stringify(legacy),
        }),
      ).provider,
    ).toBe('obsidian')
    expect(readNotePreferences(storage({ [NOTES_KEY]: '{oops' })).provider).toBe('silverbullet')
  })
})
