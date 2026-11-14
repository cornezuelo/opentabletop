import type { SessionState } from '@open-tabletop/session'
import { dicePreferences } from '@open-tabletop/ui-kit'
import { describe, expect, it } from 'vitest'
import { followRollWay, setRollWay } from './rollWay'

const session = { rollWay: 'all' } as SessionState

describe('who rolls the dice: the player’s preference, every trip following it', () => {
  it('a trip, saved with another way, takes the preference before it steps', () => {
    dicePreferences.setRolls('matters')
    expect(followRollWay(session).rollWay).toBe('matters')
    dicePreferences.setRolls('computer')
    expect(followRollWay(session)).not.toHaveProperty('rollWay')
  })

  it('a trip’s Rolls changes the preference itself', () => {
    expect(setRollWay({} as SessionState, 'all').rollWay).toBe('all')
    expect(dicePreferences.rolls).toBe('all')
    expect(followRollWay({} as SessionState).rollWay).toBe('all')
  })
})
