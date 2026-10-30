import { describe, expect, it } from 'vitest'
import { CURRENT_CAMPAIGN_KEY, readCurrentCampaign, rememberCampaign } from './currentCampaign'

describe('the campaign being played', () => {
  it('is remembered in this browser, and forgotten', () => {
    const items = new Map<string, string>()
    const storage = {
      getItem: (k: string) => items.get(k) ?? null,
      setItem: (k: string, v: string) => void items.set(k, v),
      removeItem: (k: string) => void items.delete(k),
    }
    expect(readCurrentCampaign(storage)).toBeUndefined()
    rememberCampaign('winter', storage)
    expect(items.get(CURRENT_CAMPAIGN_KEY)).toBe('winter')
    expect(readCurrentCampaign(storage)).toBe('winter')
    rememberCampaign(undefined, storage)
    expect(readCurrentCampaign(storage)).toBeUndefined()
  })

  it('reads nothing where storage is blocked', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked')
      },
    }
    expect(readCurrentCampaign(broken)).toBeUndefined()
  })
})

describe('links that put a map or trip in a campaign', () => {
  it('make a new one, or bring one kept there, and read back', async () => {
    const { inCampaignUrl, parseInCampaign } = await import('./apps')
    const fresh = inCampaignUrl('map', 'winter')
    expect(fresh).toMatch(/map\/#\/in-campaign\/winter$/)
    expect(parseInCampaign(fresh.slice(fresh.indexOf('#')))).toEqual({ campaign: 'winter' })
    const join = inCampaignUrl('travel', 'winter', 'trip1')
    expect(parseInCampaign(join.slice(join.indexOf('#')))).toEqual({
      campaign: 'winter',
      id: 'trip1',
    })
    // A map's own link is never read as one.
    expect(parseInCampaign('#/baaxk4h7qdfl/0304')).toBeNull()
  })
})
