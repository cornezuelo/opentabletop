import { describe, expect, it } from 'vitest'
import { groupByCampaign } from './campaignGroups'

describe('maps and trips grouped by campaign', () => {
  const items = [
    { id: 'm1', campaign: 'winter' },
    { id: 'm2', campaign: 'autumn' },
    { id: 'm3', campaign: 'm3' },
    { id: 'm4', campaign: 'winter' },
    { id: 'm5' },
  ]
  const names = { winter: 'Winter', autumn: 'Autumn', m3: 'Map three' }

  it('puts the campaign being played first, the others by name, and those alone last', () => {
    const groups = groupByCampaign(items, (i) => i.campaign, names, 'winter')
    expect(groups.map((g) => [g.name, g.items.map((i) => i.id)])).toEqual([
      ['Winter', ['m1', 'm4']],
      ['Autumn', ['m2']],
      ['', ['m3', 'm5']],
    ])
  })

  it('shows a campaign of its own as a group when it is the one being played', () => {
    const groups = groupByCampaign(items, (i) => i.campaign, names, 'm3')
    expect(groups[0]).toEqual({ campaign: 'm3', name: 'Map three', items: [items[2]] })
    expect(groups.at(-1)?.items.map((i) => i.id)).toEqual(['m5'])
  })
})
