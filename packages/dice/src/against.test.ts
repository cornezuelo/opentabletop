import { describe, expect, it } from 'vitest'
import { againstOutcome } from './against'

describe('againstOutcome', () => {
  it('a roll-under makes it at or under the number (lte), or only under it (lt)', () => {
    expect(againstOutcome({ op: 'lte', target: 4 }, 4)).toMatchObject({ success: true, margin: 0 })
    expect(againstOutcome({ op: 'lt', target: 4 }, 4)).toMatchObject({ success: false, margin: 0 })
    expect(againstOutcome({ op: 'lte', target: 4 }, 1)).toMatchObject({ success: true, margin: 3 })
    expect(againstOutcome({ op: 'lte', target: 4 }, 6)).toMatchObject({
      success: false,
      margin: -2,
    })
  })

  it('a roll to beat makes it at or over the number (gte), or only over it (gt)', () => {
    expect(againstOutcome({ op: 'gte', target: 8 }, 8)).toMatchObject({ success: true, margin: 0 })
    expect(againstOutcome({ op: 'gt', target: 8 }, 8)).toMatchObject({ success: false })
    expect(againstOutcome({ op: 'gt', target: 8 }, 11)).toEqual({
      op: 'gt',
      target: 8,
      total: 11,
      success: true,
      margin: 3,
    })
  })
})
