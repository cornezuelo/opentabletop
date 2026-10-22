import { JOURNAL_LEVELS, JOURNAL_TOPICS, type JournalLevel } from '@open-tabletop/session'
import type { JournalTopic } from '@open-tabletop/session'
import type { JournalFilter } from './journal'

/**
 * What the Journal tab shows (its level and topics): a preference of this browser
 * (`opentabletop.trip.journal`), shared by every app that shows a trip. The search isn't
 * kept: it's for the moment.
 */
const FILTER_KEY = 'opentabletop.trip.journal'

class Filter {
  /** Up to which level (the journal as it always was: the story and the rules). */
  level = $state<JournalLevel>('mechanics')
  /** The topics left out (none: every one). */
  hidden = $state<JournalTopic[]>([])
  search = $state('')

  constructor() {
    const kept = readFilter()
    if (kept.level) this.level = kept.level
    if (kept.hidden) this.hidden = kept.hidden
  }

  /** The filter as `filterJournal` takes it. */
  get current(): JournalFilter {
    return {
      level: this.level,
      ...(this.hidden.length && { topics: JOURNAL_TOPICS.filter((t) => !this.hidden.includes(t)) }),
      search: this.search,
    }
  }

  setLevel(level: JournalLevel): void {
    this.level = level
    this.keep()
  }

  toggle(topic: JournalTopic): void {
    this.hidden = this.hidden.includes(topic)
      ? this.hidden.filter((t) => t !== topic)
      : [...this.hidden, topic]
    this.keep()
  }

  private keep(): void {
    try {
      localStorage.setItem(FILTER_KEY, JSON.stringify({ level: this.level, hidden: this.hidden }))
    } catch {
      // No storage: it stays until the page reloads.
    }
  }
}

function readFilter(): { level?: JournalLevel; hidden?: JournalTopic[] } {
  try {
    const raw = JSON.parse(localStorage.getItem(FILTER_KEY) ?? '{}') as Record<string, unknown>
    return {
      ...(JOURNAL_LEVELS.includes(raw.level as JournalLevel) && {
        level: raw.level as JournalLevel,
      }),
      ...(Array.isArray(raw.hidden) && {
        hidden: raw.hidden.filter((t): t is JournalTopic =>
          JOURNAL_TOPICS.includes(t as JournalTopic),
        ),
      }),
    }
  } catch {
    return {}
  }
}

export const journalFilter = new Filter()
