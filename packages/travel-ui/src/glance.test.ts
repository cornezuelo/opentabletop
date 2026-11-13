import { describe, expect, it } from 'vitest'
import type { Sheet } from '@open-tabletop/character-engine'
import type { SessionState } from '@open-tabletop/session'
import { mainChanges } from './glance'

describe("what the last step did to each one's main value", () => {
  const sheet = { values: { health: { max: 6 } }, main: 'health' } as unknown as Sheet
  const change = (n: number, path: string, from: number, to: number) => ({
    id: `j${n}`,
    time: 0,
    at: '',
    source: 'travel',
    code: 'CHANGED',
    data: { path, from, to },
  })

  it("adds up the step's changes, the party's own sheet and each character's", () => {
    const session = {
      lastStep: 2,
      journal: [
        change(1, 'characters.kael.values.health', 6, 5),
        change(2, 'characters.kael.values.health', 5, 3),
        change(3, 'characters.kael.values.health', 3, 4),
        change(4, 'party.values.health', 4, 2),
        change(5, 'characters.mara.values.wits', 2, 1),
      ],
    } as unknown as SessionState
    expect(
      mainChanges(session, [
        { id: 'kael', sheet },
        { id: 'party', sheet },
        { id: 'mara', sheet },
        { id: 'nobody', sheet: undefined },
      ]),
    ).toEqual({ kael: -1, party: -2 })
  })
})
