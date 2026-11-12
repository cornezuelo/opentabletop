import type { Roller } from '@open-tabletop/variables'
import type { SessionState } from './index'

/**
 * Whom a result aims at, written short in its `set:` (`target: party.members.random`), as
 * the id of one of the party's members, read by its effects as `characters[target]`
 * (docs/conflicts.md, _Foes that act_). The short forms:
 * • `party.members.random` — one of them, rolled
 * • `party.members.lowest.values.health` / `party.members.highest.values.health` — the one
 *   with the least or the most of a value (the first of them on a tie)
 * Anything else is kept as written (an id, a variable already read). Without members there's
 * nobody to aim at: none.
 */
export function chooseTarget(
  written: string,
  s: Pick<SessionState, 'members'>,
  roll: Roller,
): string | undefined {
  const members = s.members ?? []
  if (written === 'party.members.random') {
    if (!members.length) return undefined
    const n = roll(`1d${members.length}`) ?? 1
    return members[Math.min(Math.max(n, 1), members.length) - 1].id
  }
  const by = /^party\.members\.(lowest|highest)\.values\.(.+)$/.exec(written)
  if (by) {
    const [, way, value] = by
    let best: { id: string; n: number } | undefined
    for (const m of members) {
      const n = m.values[value]
      if (typeof n !== 'number') continue
      if (!best || (way === 'lowest' ? n < best.n : n > best.n)) best = { id: m.id, n }
    }
    return best?.id
  }
  return written
}

/** Whether a written target is one of the short forms (`party.members.…`). */
export const isTargetForm = (written: unknown): written is string =>
  typeof written === 'string' && written.startsWith('party.members.')
