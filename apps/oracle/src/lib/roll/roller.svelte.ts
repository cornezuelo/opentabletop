import { emptyState, type OracleState, type Resolution } from '@open-tabletop/oracle-engine'
import { showToast } from '@open-tabletop/ui-kit'
import { getLocale, t } from '../i18n'
import { workspace } from '../packs/workspace.svelte'

export interface HistoryItem {
  id: number
  at: string
  source: string
  resolution: Resolution
}

const STATE = 'opentabletop.oracle.state'
const HISTORY = 'opentabletop.oracle.history'
const MAX_HISTORY = 100

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // History is a convenience; losing it is fine.
  }
}

/** Session of rolls: Oracle state (decks, once-only entries) and history. */
class Roller {
  state = $state.raw<OracleState>(read(STATE, emptyState()))
  history = $state.raw<HistoryItem[]>(read(HISTORY, []))
  /** Typed context per definition id. */
  contexts = $state<Record<string, Record<string, string>>>({})
  advantage = $state(0)
  /** Result being shown per definition id. */
  shown = $state.raw<Record<string, HistoryItem>>({})

  private nextId = (this.history[0]?.id ?? 0) + 1

  run(
    source: string,
    context: Record<string, unknown>,
    mode: 'resolve' | 'draw' = 'resolve',
  ): void {
    const engine = workspace.engine
    const options = { locale: getLocale(), advantage: this.advantage }
    try {
      const outcome =
        mode === 'draw'
          ? engine.draw(source, this.state, context, options)
          : engine.resolve(source, context, this.state, options)
      const item: HistoryItem = {
        id: this.nextId++,
        at: outcome.record.at,
        source,
        resolution: outcome.resolution,
      }
      this.state = outcome.state
      this.history = [item, ...this.history].slice(0, MAX_HISTORY)
      this.shown = { ...this.shown, [source]: item }
      write(STATE, this.state)
      write(HISTORY, this.history)
    } catch (error) {
      showToast(t('roll.error', { message: (error as Error).message }), 'error', 8000)
    }
  }

  shuffle(source: string): void {
    this.state = workspace.engine.shuffle(source, this.state)
    write(STATE, this.state)
  }

  /** Forget once-only entries and deck draws (a new session). */
  resetState(): void {
    this.state = emptyState()
    write(STATE, this.state)
  }

  clearHistory(): void {
    this.history = []
    this.shown = {}
    write(HISTORY, [])
  }

  show(item: HistoryItem): void {
    this.shown = { ...this.shown, [item.source]: item }
  }
}

export const roller = new Roller()
