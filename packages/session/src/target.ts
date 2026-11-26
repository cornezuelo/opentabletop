import type { Roller } from '@open-tabletop/variables'
import type { CharacterState } from '@open-tabletop/character-engine'
import type { SessionState } from './index'
import { alliesHere, fightersHere } from './present'

/** What choosing a target reads of a trip: its members, the party, and those present. */
export type TargetState = Pick<SessionState, 'members' | 'party'> &
  Partial<Pick<SessionState, 'present' | 'travel'>>

/**
 * Whom a result aims at, written short in its `set:` (`target: party.members.random`), or a
 * fight's turn (the system's `encounter.aim` and `encounter.alliesAim`), as the id of one
 * taking part, read by its effects as `characters[target]` (docs/conflicts.md, _Foes that
 * act_). Three groups, each in the same short forms:
 * • `party.members` — the party's members (the party itself, played as a whole)
 * • `party.fighters` — its members, then its allies here (`party.allies`)
 * • `present.fighters` — those here that fight the party (not things, nor its allies)
 * and the forms:
 * • `<group>.random` — one of them, rolled
 * • `<group>.lowest.values.health` / `.highest.values.health` — the one with the least or the
 *   most of a value (the first of them on a tie)
 * • `<group>.spread` — one each, in order: the one acting (`acting`) aims at the one of the
 *   other side in its own place in its side; one of the foes past the end of the party's
 *   fighters aims at a member (members before allies), round again
 * • `party.members.all` — each of them, the result played once for each (`targetsOf`)
 * Anything else is kept as written (an id, a variable already read). With nobody to aim at,
 * none.
 */
export function chooseTarget(
  written: string,
  s: TargetState,
  roll: Roller,
  /** Who is acting, for `spread`. */
  acting?: string,
  /**
   * The fight's order, for `spread`: the foes' places in it, kept while one of them falls
   * (one set against a foe gone takes the next one standing). Absent: as they are here.
   */
  order?: string[],
): string | undefined {
  const form = TARGET_FORM.exec(written)
  if (!form) return written
  const [, group, how, way, value] = form
  const members = membersOf(s)
  const allies = s.travel ? alliesHere({ present: s.present, travel: s.travel }) : []
  const foes = s.travel ? fightersHere({ present: s.present, travel: s.travel }) : []
  const party = [...members, ...allies.map((p) => p.character)]
  const among: CharacterState[] =
    group === 'party.members'
      ? members
      : group === 'party.fighters'
        ? party
        : foes.map((p) => p.character)
  if (!among.length) return undefined
  if (how === 'random') {
    const n = roll(`1d${among.length}`) ?? 1
    return among[Math.min(Math.max(n, 1), among.length) - 1].id
  }
  if (how === 'spread') {
    const partyIds = party.map((c) => c.id)
    // The party's side members first, then allies; the foes in the fight's order.
    const sides = {
      party: partyIds,
      foes: order
        ? order.filter((id, i) => !partyIds.includes(id) && order.indexOf(id) === i)
        : foes.map((p) => p.character.id),
    }
    const ids = among.map((c) => c.id)
    /** The one at a place in a list, or the next one standing after it. */
    const standing = (list: string[], at: number): string | undefined => {
      for (let n = 0; n < list.length; n++) {
        const id = list[(at + n) % list.length]
        if (ids.includes(id)) return id
      }
      return among[0].id
    }
    if (group === 'present.fighters') {
      // One of the party's side aims at the foe in its own place among them.
      const i = Math.max(0, sides.party.indexOf(acting ?? ''))
      return standing(sides.foes.length ? sides.foes : ids, i)
    }
    // A foe aims at the one of the party's side in its own place among the foes; past them,
    // at a member.
    const k = Math.max(0, sides.foes.indexOf(acting ?? ''))
    const list = sides.party.filter((id) => group !== 'party.members' || ids.includes(id))
    if (k < list.length) return standing(list, k)
    const first = members.length ? members.map((m) => m.id) : ids
    return standing(first, (k - list.length) % first.length)
  }
  let best: { id: string; n: number } | undefined
  for (const c of among) {
    const n = c.values[value]
    if (typeof n !== 'number') continue
    if (!best || (way === 'lowest' ? n < best.n : n > best.n)) best = { id: c.id, n }
  }
  return best?.id
}

/** The party's members, or the party itself when it's played as a whole. */
const membersOf = (s: TargetState): CharacterState[] =>
  s.members?.length ? s.members : s.party ? [s.party] : []

/**
 * Whom a result aims at, as a list: each member for `party.members.all` (the party itself,
 * played as a whole), else the one `chooseTarget` picks; `[undefined]` with nobody to aim at.
 */
export function targetsOf(written: string, s: TargetState, roll: Roller): (string | undefined)[] {
  if (written !== 'party.members.all') return [chooseTarget(written, s, roll)]
  const members = membersOf(s)
  return members.length ? members.map((m) => m.id) : [undefined]
}

/** A short form naming one of them: its group, and how (with the way and value of `lowest`). */
const TARGET_FORM =
  /^(party\.members|party\.fighters|present\.fighters)\.(?:(random|spread)|(?:(lowest|highest)\.values\.([\w-]+)))$/

/** A short form naming one of them (not `party.members.all`). */
export const ONE_TARGET = TARGET_FORM

/** Whether a written target is one of the short forms (`party.members.…`, `present.fighters.…`). */
export const isTargetForm = (written: unknown): written is string =>
  typeof written === 'string' && (written === 'party.members.all' || TARGET_FORM.test(written))

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
