import type { AgainstOutcome, AgainstTarget } from '@open-tabletop/dice'

/**
 * A roll against a number in words, in the UI's language: what it needs (_You need 4 or
 * less_), and how it came out (_Success_ / _Failure_). One place for the dice table, a roll
 * waiting for the player and a result's card.
 */
const TEXT = {
  en: {
    lte: 'You need {n} or less',
    lt: 'You need less than {n}',
    gte: 'You need {n} or more',
    gt: 'You need more than {n}',
    success: 'Success',
    failure: 'Failure',
    against: 'Against {n}: {verdict}',
  },
  es: {
    lte: 'Necesitas {n} o menos',
    lt: 'Necesitas menos de {n}',
    gte: 'Necesitas {n} o más',
    gt: 'Necesitas más de {n}',
    success: 'Éxito',
    failure: 'Fallo',
    against: 'Contra {n}: {verdict}',
  },
}
const text = (locale: string) => TEXT[locale as keyof typeof TEXT] ?? TEXT.en

/** What a roll needs (_You need 4 or less_). */
export function againstNeeds({ op, target }: AgainstTarget, locale: string): string {
  return text(locale)[op].replace('{n}', String(target))
}

/** _Success_ or _Failure_. */
export function againstVerdict(success: boolean, locale: string): string {
  return text(locale)[success ? 'success' : 'failure']
}

/** How it came out, in one line (_Against 4: Success_), for a result already rolled. */
export function againstLine(outcome: AgainstOutcome, locale: string): string {
  return text(locale)
    .against.replace('{n}', String(outcome.target))
    .replace('{verdict}', againstVerdict(outcome.success, locale))
}
