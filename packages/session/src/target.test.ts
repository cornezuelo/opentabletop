import { describe, expect, it } from 'vitest'
import { chooseTarget, isTargetForm } from './target'

const member = (id: string, health: number) =>
  ({ id, values: { health } }) as unknown as NonNullable<
    Parameters<typeof chooseTarget>[1]['members']
  >[number]

describe('whom a result aims at', () => {
  const s = { members: [member('kael', 5), member('mara', 2), member('odo', 5)] }

  it('the one with the least or the most of a value, the first on a tie', () => {
    expect(chooseTarget('party.members.lowest.values.health', s, () => 1)).toBe('mara')
    expect(chooseTarget('party.members.highest.values.health', s, () => 1)).toBe('kael')
    expect(chooseTarget('party.members.lowest.values.wits', s, () => 1)).toBeUndefined()
  })

  it('one of them rolled, an id kept as written, nobody without members', () => {
    expect(chooseTarget('party.members.random', s, () => 3)).toBe('odo')
    expect(chooseTarget('party.members.random', s, () => 1)).toBe('kael')
    expect(chooseTarget('mara', s, () => 1)).toBe('mara')
    expect(chooseTarget('party.members.random', {}, () => 1)).toBeUndefined()
    expect(isTargetForm('party.members.random')).toBe(true)
    expect(isTargetForm('kael')).toBe(false)
  })
})
