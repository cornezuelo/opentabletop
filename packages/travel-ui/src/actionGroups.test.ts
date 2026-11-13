import { describe, expect, it } from 'vitest'
import { buttonGroups } from './actionGroups'

describe("the party's buttons by group", () => {
  const movers = new Set(['march'])

  it('are as before when the system declares no groups: those that move first', () => {
    expect(buttonGroups(['march', 'camp', 'forage'], { actions: {} }, movers)).toEqual([
      { ids: ['march'] },
      { ids: ['camp', 'forage'] },
    ])
  })

  it('follow the groups in the order declared, the ones outside every group around them', () => {
    const rules = {
      groups: { road: {}, camp: { name: 'Time' }, empty: {} },
      actions: {
        march: { group: 'groups.road' },
        rest: { group: 'groups.camp' },
        camp: { group: 'groups.camp' },
        scout: {},
        // A group the system doesn't declare (refused when the pack loads) counts as none.
        odd: { group: 'groups.nowhere' },
      },
    }
    expect(buttonGroups(['march', 'camp', 'scout', 'rest', 'odd'], rules, movers)).toEqual([
      { group: 'road', ids: ['march'] },
      { group: 'camp', ids: ['camp', 'rest'] },
      { ids: ['scout', 'odd'] },
    ])
  })
})
