import {
  encounterView,
  participantName,
  type SessionState,
  type TripAction,
} from '@open-tabletop/session'
import type { Translate } from './i18n'
import { entryText, eventName, type JournalContext } from './journal'

/**
 * What the trip waits for (a check, a step's pause, a roll of the player's), in words, and
 * what goes on from it when it isn't a choice (a choice or a roll is made in the trip's panel).
 */
export function tripWaits(
  session: SessionState,
  context: JournalContext,
  t: Translate,
): { text: string; go?: TripAction; label?: 'next' } | null {
  const travel = session.travel
  const check = travel.pendingChecks[0]
  if (check) {
    const yours = session.yours?.find((y) => y.id === check.id)
    if (yours) {
      const event = eventName(t, check.event, context.checkName)
      const who = yours.who !== undefined ? participantName(session, yours.who) : ''
      return { text: (who ? `${who}: ` : '') + t('journal.yours', { event, dice: yours.dice }) }
    }
    const asks = session.asking?.includes(check.id)
    const key = asks ? 'journal.asks' : check.rolled ? 'journal.paused' : 'journal.pending'
    return {
      text: t(key, { event: eventName(t, check.event, context.checkName) }),
      ...(!asks && { go: { type: 'resolveCheck', id: check.id } }),
    }
  }
  const fight = session.encounter
  // A foe's turn done, read before the next: Next goes on.
  if (fight?.stage === 'shown') {
    const id = fight.order[fight.turn] ?? ''
    const next = encounterView(session)?.next
    return {
      text: t('fight.shown', {
        name: participantName(session, id),
        next: next ? participantName(session, next) : '',
      }),
      go: { type: 'encounter', what: 'next' },
      label: 'next',
    }
  }
  const waiting = travel.waiting
  if (!waiting) return null
  const line = { id: '', at: '', time: waiting.time, source: 'travel' as const, code: 'HELD' }
  return {
    text: entryText({ ...line, data: { waiting } }, context),
    ...(!waiting.ask && { go: { type: 'resume' } }),
  }
}
