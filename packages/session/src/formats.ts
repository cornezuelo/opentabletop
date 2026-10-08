import type { TravelRules } from '@open-tabletop/travel-engine'
import type { Bindings } from './index'

/**
 * The checks of travel rules that pack format 1 stopped the trip for without saying so:
 * nothing resolves them (no binding), they have no effects and no `pause`. Their indexes.
 */
export function olderPauseChecks(rules: TravelRules, bindings: Bindings | undefined): number[] {
  return (rules.checks ?? []).flatMap((check, i) =>
    check.pause === undefined && !check.effects && !bindings?.on[check.event] ? [i] : [],
  )
}

/**
 * Travel rules of a pack written for an older format (`format` in pack.yaml), with their
 * old meaning in today's syntax: format 1's tableless checks pause.
 */
export function migrateRules(
  rules: TravelRules,
  bindings: Bindings | undefined,
  format: number,
): TravelRules {
  if (format >= 2) return rules
  const pausing = olderPauseChecks(rules, bindings)
  if (!pausing.length) return rules
  return {
    ...rules,
    checks: rules.checks!.map((check, i) =>
      pausing.includes(i) ? { ...check, pause: true } : check,
    ),
  }
}
