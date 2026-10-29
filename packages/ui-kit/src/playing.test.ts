import { describe, expect, it } from 'vitest'
import type { LibraryChange, LibraryEntry } from '@open-tabletop/storage'
import { forgetGoneCampaigns, playIn, playing } from './playing.svelte'

/** Campaigns kept in memory, their changes heard as an app hears them. */
function keptCampaigns(ids: string[]) {
  const kept = new Set(ids)
  const listeners = new Set<(change: LibraryChange) => void>()
  return {
    getCampaign: async (id: string) =>
      kept.has(id) ? ({ id, name: id, modified: '', json: '{}' } as LibraryEntry) : null,
    onAnyCampaignChange: (listener: (change: LibraryChange) => void) => {
      listeners.add(listener)
      return () => void listeners.delete(listener)
    },
    remove(id: string) {
      kept.delete(id)
      for (const listener of listeners) listener({ type: 'delete', id })
    },
  }
}
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('the campaign played, once it is gone', () => {
  it('plays in no campaign when the one played is deleted (the last map of it removed)', () => {
    const kept = keptCampaigns(['north', 'south'])
    playIn('north')
    const stop = forgetGoneCampaigns(kept)
    kept.remove('south')
    expect(playing.id).toBe('north')
    kept.remove('north')
    expect(playing.id).toBeUndefined()
    stop()
  })

  it('forgets one already gone when the app opens', async () => {
    playIn('gone')
    const stop = forgetGoneCampaigns(keptCampaigns(['north']))
    await settle()
    expect(playing.id).toBeUndefined()
    stop()
    playIn('north')
    forgetGoneCampaigns(keptCampaigns(['north']))()
    await settle()
    expect(playing.id).toBe('north')
  })
})
