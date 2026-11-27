import { bounds } from '@open-tabletop/dice'
import type { DrawnCard, WantedDraw, WantedRoll } from '@open-tabletop/oracle-engine'
import type { Roller } from '@open-tabletop/variables'

/** A roll of the player's: its dice, what rolls them and, for an effect aimed at someone, whom. */
export type HandRoll = WantedRoll & { target?: string }

/** What the player gave for each of their rolls and draws, in order: a total, a card, or `null` (the computer's). */
export type Given = number | DrawnCard | null

/**
 * A roll the player hasn't given yet: the step stops there until they roll it. A draw from a
 * deck waits the same way (`draw`), its `roll` naming the deck alone.
 */
export class Wanted extends Error {
  constructor(
    readonly roll: HandRoll,
    readonly draw?: WantedDraw,
  ) {
    super(
      draw
        ? `Waiting for the player's draw from ${draw.deck}`
        : `Waiting for the player's roll of ${roll.dice}`,
    )
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
  /** A draw from a deck: the card the player drew, or a stop at it (`Wanted`), or the computer's. */
  card(draw: WantedDraw): DrawnCard | undefined
  /** A copy going on from where this one is, to look ahead without using it. */
  fork(): Hand
}

export function handOf(given: readonly Given[], asks: boolean, from = 0): Hand {
  let at = from
  return {
    next(roll) {
      if (!hasChance(roll.dice)) return undefined
      if (at < given.length) {
        const total = given[at++]
        return typeof total === 'number' ? total : undefined
      }
      if (asks) throw new Wanted(roll)
      return undefined
    },
    card(draw) {
      // A deck with one card left has nothing to choose.
      if (draw.cards.length < 2 && draw.reversible === undefined) return undefined
      if (at < given.length) {
        const card = given[at++]
        return card !== null && typeof card === 'object' ? card : undefined
      }
      if (asks) throw new Wanted({ dice: '', source: draw.deck }, draw)
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
