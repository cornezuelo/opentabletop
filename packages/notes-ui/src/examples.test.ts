import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { addMissingExamples, examplePages } from './examples'
import { loadPages, savePages } from './browser'

describe('the packs’ example pages', () => {
  it('lists the Grey Marches’ in the language asked for', () => {
    const marches = examplePages('es').find((e) => e.pack === 'grey-marches')!
    expect(marches.files['places/Ashford.md']).toBeDefined()
    expect(marches.files['places/The ferry.md']).toContain('# La barca')
  })

  it('adds those a campaign hasn’t yet, leaving the ones there as they are', async () => {
    const added = await addMissingExamples('grey-marches', 'vale', 'en')
    expect(added).toBeGreaterThanOrEqual(6)
    const pages = await loadPages()
    const ashford = pages.find((p) => p.path === 'places/Ashford' && p.campaign === 'vale')!
    await savePages([{ ...ashford, body: 'Mine now' }])
    expect(await addMissingExamples('grey-marches', 'vale', 'en')).toBe(0)
    const again = await loadPages()
    expect(again.find((p) => p.id === ashford.id)?.body).toBe('Mine now')
    // Another campaign gets its own.
    expect(await addMissingExamples('grey-marches', 'other', 'en')).toBe(added)
    expect(await addMissingExamples('no-such-pack', 'vale', 'en')).toBe(0)
  })
})
