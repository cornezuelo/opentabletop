import type { RollWay, SessionState } from '@open-tabletop/session'
import { dicePreferences, type DiceRolls } from '@open-tabletop/ui-kit'

/**
 * Who rolls a trip's dice is the player's preference (ui-kit's `dicePreferences.rolls`, in
 * **Preferences** of every app), not the trip's: every trip and scene follows it, saved ones
 * too. The session still carries it (`rollWay`), for the engine to read: a host gives it the
 * preference before every step (`followRollWay`).
 */

/** The session with the way of rolling the player prefers (none: the computer rolls). */
export function followRollWay(session: SessionState): SessionState {
  const way: RollWay | undefined =
    dicePreferences.rolls === 'matters' || dicePreferences.rolls === 'all'
      ? dicePreferences.rolls
      : undefined
  if (session.rollWay === way) return session
  const next = { ...session }
  if (way) next.rollWay = way
  else delete next.rollWay
  return next
}

/** The player's way of rolling changed (in a trip's **Rolls**): kept, and the session follows. */
export function setRollWay(session: SessionState, way: DiceRolls): SessionState {
  dicePreferences.setRolls(way)
  return followRollWay(session)
}
