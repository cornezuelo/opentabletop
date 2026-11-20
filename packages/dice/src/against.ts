/** How a roll's total is compared with the number it's rolled against (`lte`: at or under it). */
export type AgainstOp = 'lte' | 'lt' | 'gte' | 'gt'

/** A number to beat: how the total is compared, and with what. */
export interface AgainstTarget {
  op: AgainstOp
  target: number
}

/**
 * A roll against a number, come out: whether it made it, and by how much (`margin`: how far
 * under the number a roll-under was, or over it a roll to beat; negative when it failed).
 */
export interface AgainstOutcome extends AgainstTarget {
  total: number
  success: boolean
  margin: number
}

/** How a total does against a number. */
export function againstOutcome({ op, target }: AgainstTarget, total: number): AgainstOutcome {
  const under = op === 'lte' || op === 'lt'
  const margin = under ? target - total : total - target
  const success = op === 'lte' || op === 'gte' ? margin >= 0 : margin > 0
  return { op, target, total, success, margin }
}
