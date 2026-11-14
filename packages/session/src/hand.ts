import type { WantedRoll } from '@open-tabletop/oracle-engine'
import type { Roller } from '@open-tabletop/variables'

/** A roll of the player's: its dice, what rolls them and, for an effect aimed at someone, whom. */
export type HandRoll = WantedRoll & { target?: string }

/** A roll the player hasn't given yet: the step stops there until they roll it. */
export class Wanted extends Error {
  constructor(readonly roll: HandRoll) {
    super(`Waiting for the player's roll of ${roll.dice}`)
  }
}

/**
 * The player's rolls for one check (`rollWay`), in the order they're made: the totals given so
 * far (`null`, one the computer rolled), then, while the player rolls (`asks`), a stop at the
 * next one (`Wanted`); otherwise the computer rolls the rest (undefined).
 */
export interface Hand {
  next(roll: HandRoll): number | undefined
  /** A copy going on from where this one is, to look ahead without using it. */
  fork(): Hand
}

export function handOf(given: readonly (number | null)[], asks: boolean, from = 0): Hand {
  let at = from
  return {
    next(roll) {
      if (at < given.length) return given[at++] ?? undefined
      if (asks) throw new Wanted(roll)
      return undefined
    },
    fork: () => handOf(given, asks, at),
  }
}

/**
 * The dice of effects read by the host (`'-{{1d3}}'` on whom a result aims at) from the
 * player's hand, else rolled by `otherwise`.
 */
export function handRoller(
  hand: Hand,
  roll: Omit<HandRoll, 'dice'>,
  otherwise: Roller | undefined,
): Roller {
  return (dice) => hand.next({ ...roll, dice: dice.trim() }) ?? otherwise?.(dice)
}
