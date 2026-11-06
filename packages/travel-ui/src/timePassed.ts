import { type SessionState } from '@open-tabletop/session'
import type { Calendar } from '@open-tabletop/time'
import { ask, vocabulary } from '@open-tabletop/ui-kit'
import { durationText } from './journal'

/**
 * Whether the campaign's clock went on without the trip: asked before its next step, unless
 * the trip is stopped for the player (going on from that comes first).
 */
export const timeBehind = (session: SessionState, time: number | undefined): time is number =>
  time !== undefined &&
  session.travel.time < time &&
  !session.travel.pendingChecks.length &&
  !session.travel.waiting

/** Asks whether the party lives the time that passed or skips it; null: not now. */
export async function askTimePassed(
  locale: string,
  session: SessionState,
  time: number,
  calendar: Calendar,
): Promise<'live' | 'skip' | null> {
  const words = (vocabulary[locale as keyof typeof vocabulary] ?? vocabulary.en).campaign.timePassed
  const days = calendar.describe(time).day - session.travel.day
  const passed = days
    ? words.days.replace('{n}', String(days))
    : durationText(time - session.travel.time)
  const choice = await ask(words.title, words.text.replace('{time}', passed), [
    { value: 'cancel', label: words.notNow },
    { value: 'skip', label: words.skip },
    { value: 'live', label: words.live, kind: 'primary' },
  ])
  return choice === 'cancel' ? null : choice
}
