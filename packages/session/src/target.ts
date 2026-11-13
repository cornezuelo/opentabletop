import type { Roller } from '@open-tabletop/variables'
import type { SessionState } from './index'

/**
 * Whom a result aims at, written short in its `set:` (`target: party.members.random`), as
 * the id of one of the party's members, read by its effects as `characters[target]`
 * (docs/conflicts.md, _Foes that act_). The short forms:
 * • `party.members.random` — one of them, rolled
 * • `party.members.lowest.values.health` / `party.members.highest.values.health` — the one
 *   with the least or the most of a value (the first of them on a tie)
 * • `party.members.all` — each of them, the result played once for each (`targetsOf`)
 * Anything else is kept as written (an id, a variable already read). A party played as a
 * whole (no members) is aimed at itself, through its own sheet (`characters.party`); without
 * one either, there's nobody to aim at: none.
 */
export function chooseTarget(
  written: string,
  s: Pick<SessionState, 'members' | 'party'>,
  roll: Roller,
): string | undefined {
  const members = s.members?.length ? s.members : s.party ? [s.party] : []
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

/**
 * Whom a result aims at, as a list: each member for `party.members.all` (the party itself,
 * played as a whole), else the one `chooseTarget` picks; `[undefined]` with nobody to aim at.
 */
export function targetsOf(
  written: string,
  s: Pick<SessionState, 'members' | 'party'>,
  roll: Roller,
): (string | undefined)[] {
  if (written !== 'party.members.all') return [chooseTarget(written, s, roll)]
  const members = s.members?.length ? s.members : s.party ? [s.party] : []
  return members.length ? members.map((m) => m.id) : [undefined]
}

/** Whether a written target is one of the short forms (`party.members.…`). */
export const isTargetForm = (written: unknown): written is string =>
  typeof written === 'string' && written.startsWith('party.members.')

/**
 * A result with its target chosen: `target` the id, or, with nobody to aim at, none, and the
 * effects that name it (`characters[target].…`) left out, so they neither apply nor show.
 */
export function aimed(
  value: Record<string, unknown>,
  target: string | undefined,
): Record<string, unknown> {
  if (target !== undefined) return { ...value, target }
  const rest = { ...value }
  delete rest.target
  const effects = value.effects as Record<string, unknown> | undefined
  if (!effects) return rest
  const kept = Object.entries(effects).filter(([path]) => !/\[target\]/.test(path))
  if (kept.length) rest.effects = Object.fromEntries(kept)
  else delete rest.effects
  return rest
}
