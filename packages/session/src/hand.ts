import { bounds } from '@open-tabletop/dice'
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
 * Whether a roll has any chance in it: more than one total can come of it (`1d1`, a plain
 * number: none). One that can't be read is taken to have it.
 */
export function hasChance(dice: string): boolean {
  try {
    const { min, max } = bounds(dice)
    return min !== max
  } catch {
    return true
  }
}

/**
 * The player's rolls for one check (`rollWay`), in the order they're made: the totals given so
 * far (`null`, one the computer rolled), then, while the player rolls (`asks`), a stop at the
 * next one (`Wanted`); otherwise the computer rolls the rest (undefined). A roll without
 * chance (`hasChance`) is never the player's: it's not asked for, nor counted among theirs.
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
      if (!hasChance(roll.dice)) return undefined
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
