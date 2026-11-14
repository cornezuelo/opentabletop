import type { Beat, JournalEntry } from '@open-tabletop/session'
import type { TooltipText } from '@open-tabletop/ui-kit'
import { diceOf, type Dice } from './beats'
import { entryText, type JournalContext } from './journal'

/**
 * A turn of a fight told in one sentence (docs/fight-ux.md, C): who acted, what they did, on
 * whom, and what it left; with the dice it was rolled with.
 */
export interface TurnTold {
  /** The moment's id (its first line's): a new turn is a new id. */
  id: string
  /** Who acted (whoever's turn it was); '' when it can't be said. */
  who: string
  /** What they did: the action's own words (`told:`), else its name; a foe's, its table's result. */
  what: string
  /** On whom: the foe chosen, or the one a foe went for (`encounter.target`); '' for none. */
  on: string
  /** What it left, each in words: _Pack leader: Health 8 → 4_, _The pack leader falls_. */
  results: string[]
  /** The dice it was rolled with, each table's. */
  dice: Dice
  /** Whose side acted. */
  side?: 'party' | 'foes'
}

/** An action taken on a foe, on its card (a turn of the party's): a click takes it on that one. */
export interface CardAction {
  id: string
  name: string
  /** What it does, for its tooltip. */
  tip?: TooltipText
  /** Why it can't be taken now, in words ('' or absent: it can). */
  disabled?: string
  /** The foes it can be taken on, by id. */
  foes: readonly string[]
}

/** What a turn left that's told: values and conditions of the fighters, those who went. */
const LEFT = new Set(['CHANGED', 'PRESENT_LEFT', 'MEMBER_LEFT'])

/**
 * A moment of a fight as a turn, if it is one: a foe's turn (its `ENCOUNTER_TURN` and what its
 * table rolled), or an action taken on a turn of the party's. `before` is the journal before
 * it (whose turn it was when the action was taken); `whoName` names a fighter by id.
 */
export function tellTurn(
  beat: Beat<JournalEntry>,
  before: readonly JournalEntry[],
  context: JournalContext,
  whoName: (id: string) => string | undefined,
): TurnTold | undefined {
  const entries = beat.entries
  const taken = entries.find((e) => e.code === 'ACTION_TAKEN' && !e.data?.on)
  const turn = entries.findLast((e) => e.code === 'ENCOUNTER_TURN')
  const textOf = context.textOf ?? ((v: unknown) => String(v ?? ''))
  const results = entries
    .filter((e) => LEFT.has(e.code) && (e.code !== 'CHANGED' || isFighterPath(e.data?.path)))
    .map((e) => entryText(e, context))
  const dice = [...diceOf(entries).values()].flat()
  if (taken) {
    // The party's: whose turn it was as it was taken, the foe it was given or asked for.
    const id = String(taken.data?.action)
    const at = [...before, ...entries.slice(0, entries.indexOf(taken))]
    const whose = at.findLast((e) => e.code === 'ENCOUNTER_TURN')
    const told = entries.find((e) => e.code === 'ACTION_TOLD' && e.data?.action === id)
    const given = Object.values((taken.data?.params ?? {}) as Record<string, unknown>)
    const chosen = entries.find((e) => e.code === 'RESUMED' && e.data?.action === id)?.data?.choice
    const on = [chosen, ...given]
      .map((v) => (typeof v === 'string' ? whoName(v) : undefined))
      .find((n) => n !== undefined)
    return {
      id: beat.id,
      who: whose ? String(whose.data?.name || '') : '',
      what: told ? textOf(told.data?.text) : (context.actionName?.(id) ?? id),
      // The system's own words say whom already.
      on: told ? '' : (on ?? ''),
      results,
      dice,
      side: 'party',
    }
  }
  if (turn?.data?.side === 'foes') {
    const after = entries.slice(entries.indexOf(turn))
    const result = after.find((e) => e.code === 'ORACLE_RESULT')
    const skipped = after.find((e) => e.code === 'ENCOUNTER_SKIPPED')
    return {
      id: beat.id,
      who: String(turn.data?.name || ''),
      what: skipped ? entryText(skipped, context) : (result?.text ?? context.t('fight.nothing')),
      on: turn.data?.target !== undefined ? String(turn.data.targetName || turn.data.target) : '',
      results,
      dice,
      side: 'foes',
    }
  }
  return undefined
}

/** A path of a fighter: a character's (`characters.<id>.…`), not the party's own nor the map's. */
const isFighterPath = (path: unknown) =>
  typeof path === 'string' && /^characters\.[^.]+\.(values|conditions)\./.test(path)
