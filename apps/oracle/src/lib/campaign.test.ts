import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LibraryChange, LibraryEntry } from '@open-tabletop/storage'

/**
 * The Oracle rolling in a campaign: its decks and history are the campaign's (shared with
 * its maps and trips), and without one, its own state as before.
 */

// Where campaigns are kept: in memory here (IndexedDB in a browser).
const kept = new Map<string, LibraryEntry>()
let hear: ((change: LibraryChange) => void) | undefined
vi.mock('@open-tabletop/storage', async (original) => ({
  ...(await original<typeof import('@open-tabletop/storage')>()),
  getCampaign: async (id: string) => kept.get(id) ?? null,
  putCampaign: async (entry: LibraryEntry) => void kept.set(entry.id, entry),
  listCampaigns: async () =>
    [...kept.values()].map(({ id, name, modified }) => ({ id, name, modified })),
  onCampaignChange: (listener: (change: LibraryChange) => void) => {
    hear = listener
    return () => {}
  },
}))

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))
const DECK = 'core/complications'

describe('the Oracle in a campaign', () => {
  beforeEach(() => {
    localStorage.clear()
    kept.clear()
  })

  it('draws from the campaign’s decks and keeps its history there', async () => {
    vi.resetModules()
    const c = await import('@open-tabletop/campaign')
    const frontier = c.createCampaign('m1', 'The Frontier')
    kept.set('m1', {
      id: 'm1',
      name: 'The Frontier',
      modified: frontier.modified,
      json: c.serializeCampaign(frontier),
    })
    const { oracleUi, chooseCampaign, campaignChoice } = await import('./oracle.svelte')
    const roller = oracleUi.roller

    // Without a campaign: the Oracle's own state.
    roller.run(DECK, {}, 'draw')
    expect(roller.history).toHaveLength(1)
    expect(kept.get('m1')!.json).not.toMatch(/complications/)

    // In the map's campaign: its (empty) history, and the draw goes there.
    chooseCampaign('m1')
    await settle()
    expect(campaignChoice.id).toBe('m1')
    expect(roller.history).toHaveLength(0)
    roller.run(DECK, {}, 'draw')
    await settle()
    const after = c.deserializeCampaign(kept.get('m1')!.json)
    expect(after.oracle?.history).toHaveLength(1)
    expect(Object.keys(after.oracle!.state.decks)).toContain(DECK)

    // A map of it drew a card meanwhile (the Hexmapper wrote it): the Oracle reads it again.
    const drawn = after.oracle!.state.decks[DECK]
    const moved = {
      ...after,
      oracle: { ...after.oracle!, history: [...after.oracle!.history, ...after.oracle!.history] },
    }
    kept.set('m1', { ...kept.get('m1')!, json: c.serializeCampaign(moved) })
    hear?.({ type: 'put', id: 'm1', modified: 'later' })
    await settle()
    expect(roller.history).toHaveLength(2)
    expect(roller.state.decks[DECK]).toEqual(drawn)

    // Back to no campaign: its own state, with its one roll.
    chooseCampaign('')
    expect(roller.history).toHaveLength(1)
  })
})
