import type { WorldWords } from '@open-tabletop/campaign'
import { factionName, type ReactionLine } from '@open-tabletop/session'
import { translate, vocabulary } from '@open-tabletop/ui-kit'

type WorldKey = keyof typeof vocabulary.en.world

/**
 * What the world clock writes in its timeline (a full clock, a faction's turn, the world's
 * reactions), in the UI's language: the words every app that plays a campaign's world gives it.
 */
export function worldWords(locale: () => string): WorldWords {
  const say = (key: WorldKey, params?: Record<string, string | number>) =>
    translate((vocabulary[locale() as keyof typeof vocabulary] ?? vocabulary.en).world, key, params)
  /** What a reaction's steps said: their words, what their rolls came up with. */
  const lines = (said: ReactionLine[]) =>
    said
      .map((l) =>
        'say' in l ? l.say : l.error ? say('clockRollFailed', { error: l.error }) : (l.text ?? ''),
      )
      .filter(Boolean)
      .join(' ')
  return {
    clockFull: (full) =>
      [
        lines(full.lines),
        full.then === 'reset' ? say('clockStartsOver') : '',
        full.then === 'remove' ? say('clockGone') : '',
      ]
        .filter(Boolean)
        .join(' '),
    reaction: (said) => lines(said),
    reactionsStopped: (max) => say('reactionsStopped', { max }),
    answered: (question, choice) => say('answered', { question, choice }),
    factionLine: (system, line) => {
      const name = factionName(system, line.faction, locale())
      if (line.error) return say('turnFailed', { name, error: line.error })
      const gained = line.territory?.filter((e) => e.type === 'TERRITORY_GAINED').length ?? 0
      const lost = line.territory?.filter((e) => e.type === 'TERRITORY_LOST').length ?? 0
      const land = [
        gained ? say('gained', { n: gained }) : '',
        lost ? say('lost', { n: lost }) : '',
      ]
        .filter(Boolean)
        .join(', ')
      return say('factionLine', { name, text: line.text ?? '' }) + (land ? ` (${land})` : '')
    },
  }
}

/** A full clock's notice: "The siege: filled! …". */
export function clockFilledText(locale: string, clock: string, text: string): string {
  const words = (vocabulary[locale as keyof typeof vocabulary] ?? vocabulary.en).world
  return `${translate(words, 'clockFilled', { name: clock })} ${text}`.trim()
}
