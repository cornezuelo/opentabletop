import { localize } from '@open-tabletop/session'
import type { Calendar } from '@open-tabletop/time'
import type { TimelineEntry } from '@open-tabletop/world-engine'
import { translator, type CampaignUiKey } from './i18n'
import { shortTime } from './when'

/** What a calendar declares that a timeline line names by id: its holidays and moons. */
type Named = { def?: { holidays?: Declared[]; moons?: Declared[] } }
type Declared = { id: string; name?: Parameters<typeof localize>[0] }

/**
 * A line of the world's timeline in words: an event's or a note's text, a holiday or a moon
 * by the calendar's name for it, a clock with how full it is, a clock filled, time rewound.
 */
export function timelineText(entry: TimelineEntry, calendar: Calendar, locale: string): string {
  const t = translator(() => locale)
  const def = (calendar as Named).def
  const name = (list: Declared[] | undefined, id: unknown) =>
    localize(list?.find((d) => d.id === id)?.name, locale, 'en') ?? String(id)
  switch (entry.code) {
    case 'HOLIDAY':
      return name(def?.holidays, entry.data?.holiday)
    case 'MOON': {
      const text = t('world.moonLine', {
        moon: name(def?.moons, entry.data?.moon),
        phase: t(`world.moon.${entry.data?.phase}` as CampaignUiKey),
      })
      // A line that starts with a moon's name ("the Pale Moon is full") starts in capitals.
      return text.charAt(0).toUpperCase() + text.slice(1)
    }
    case 'CLOCK':
      return `${entry.text} ${entry.data?.filled}/${entry.data?.segments}`
    case 'CLOCK_FILLED':
      return t('world.clockFilled', { name: entry.text ?? '' })
    case 'REWOUND':
      return t('world.rewound', { from: shortTime(calendar, Number(entry.data?.from), locale) })
  }
  return entry.text ?? ''
}
