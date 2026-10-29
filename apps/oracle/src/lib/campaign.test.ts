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

  it('rolls in the campaign being played, chosen in another app, and brings its old choice', async () => {
    vi.resetModules()
    const c = await import('@open-tabletop/campaign')
    for (const [id, name] of [
      ['m1', 'The Frontier'],
      ['m2', 'The Coast'],
    ]) {
      const campaign = c.createCampaign(id, name)
      kept.set(id, { id, name, modified: campaign.modified, json: c.serializeCampaign(campaign) })
    }
    // The Oracle remembered a campaign of its own before the bar's **Playing**.
    localStorage.setItem('opentabletop.oracle.campaign', 'm1')
    const { campaignChoice, oracleUi } = await import('./oracle.svelte')
    const { playIn, playing, CURRENT_CAMPAIGN_KEY } = await import('@open-tabletop/ui-kit')
    expect(playing.id).toBe('m1')
    expect(campaignChoice.id).toBe('m1')
    expect(localStorage.getItem(CURRENT_CAMPAIGN_KEY)).toBe('m1')
    expect(localStorage.getItem('opentabletop.oracle.campaign')).toBeNull()

    // Another app plays in the Coast: the Oracle's draws go there.
    playIn('m2')
    await settle()
    oracleUi.roller.run(DECK, {}, 'draw')
    await settle()
    expect(c.deserializeCampaign(kept.get('m2')!.json).oracle?.history).toHaveLength(1)
    expect(c.deserializeCampaign(kept.get('m1')!.json).oracle?.history ?? []).toHaveLength(0)
  })
})
