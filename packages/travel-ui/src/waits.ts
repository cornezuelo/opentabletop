import { participantName, type SessionState } from '@open-tabletop/session'
import type { TravelAction } from '@open-tabletop/travel-engine'
import type { Translate } from './i18n'
import { entryText, eventName, type JournalContext } from './journal'

/**
 * What the trip waits for (a check, a step's pause, a foe's roll by hand), in words, and what
 * goes on from it when it isn't a choice (a choice is made in the trip's panel).
 */
export function tripWaits(
  session: SessionState,
  context: JournalContext,
  t: Translate,
): { text: string; go?: TravelAction } | null {
  const travel = session.travel
  const check = travel.pendingChecks[0]
  if (check) {
    const asks = session.asking?.includes(check.id)
    const key = asks ? 'journal.asks' : check.rolled ? 'journal.paused' : 'journal.pending'
    return {
      text: t(key, { event: eventName(t, check.event, context.checkName) }),
      ...(!asks && { go: { type: 'resolveCheck', id: check.id } }),
    }
  }
  // A foe's turn waiting for the player to roll its table: chosen in the trip's panel.
  const fight = session.encounter
  if (fight?.stage === 'rolling') {
    const id = fight.order[fight.turn] ?? ''
    const line = { id: '', at: '', time: travel.time, source: 'travel' as const }
    const data = { id, name: participantName(session, id), table: fight.rolling }
    return { text: entryText({ ...line, code: 'ENCOUNTER_ROLLS', data }, context) }
  }
  const waiting = travel.waiting
  if (!waiting) return null
  const line = { id: '', at: '', time: waiting.time, source: 'travel' as const, code: 'HELD' }
  return {
    text: entryText({ ...line, data: { waiting } }, context),
    ...(!waiting.ask && { go: { type: 'resume' } }),
  }
}
