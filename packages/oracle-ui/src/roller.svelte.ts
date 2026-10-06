import {
  emptyState,
  type Compiled,
  type OracleState,
  type Resolution,
} from '@open-tabletop/oracle-engine'
import { showToast } from '@open-tabletop/ui-kit'
import type { Translate } from './i18n'
import type { PackLibrary } from '@open-tabletop/pack-ui'

export interface HistoryItem {
  id: number
  at: string
  source: string
  resolution: Resolution
}

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

export interface RollerOptions {
  library: PackLibrary
  locale: () => string
  storageKey: string
  t: Translate
  onResult?: (item: HistoryItem, def: Compiled | undefined) => void
}

/** Session of rolls: Oracle state (decks, once-only entries) and history. */
export class Roller {
  state = $state.raw<OracleState>(emptyState())
  history = $state.raw<HistoryItem[]>([])
  /** Typed context per definition id. */
  contexts = $state<Record<string, Record<string, string>>>({})
  advantage = $state(0)
  /** Result being shown per definition id. */
  shown = $state.raw<Record<string, HistoryItem>>({})

  private nextId: number
  private keys: { state: string; history: string }
  private options: RollerOptions

  constructor(options: RollerOptions) {
    this.options = options
    this.keys = { state: `${options.storageKey}.state`, history: `${options.storageKey}.history` }
    this.state = read(this.keys.state, emptyState())
    this.history = read(this.keys.history, [])
    this.nextId = (this.history[0]?.id ?? 0) + 1
  }

  run(
    source: string,
    context: Record<string, unknown>,
    mode: 'resolve' | 'draw' = 'resolve',
  ): void {
    const { library, locale, t, onResult } = this.options
    const engine = library.engine
    const options = { locale: locale(), advantage: this.advantage }
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
      write(this.keys.state, this.state)
      write(this.keys.history, this.history)
      onResult?.(item, library.registry.definitions.get(source))
    } catch (error) {
      showToast(t('roll.error', { message: (error as Error).message }), 'error', 8000)
    }
  }

  shuffle(source: string): void {
    this.state = this.options.library.engine.shuffle(source, this.state)
    write(this.keys.state, this.state)
  }

  /** Forget once-only entries and deck draws (a new session). */
  resetState(): void {
    this.state = emptyState()
    write(this.keys.state, this.state)
  }

  clearHistory(): void {
    this.history = []
    this.shown = {}
    write(this.keys.history, [])
  }

  show(item: HistoryItem): void {
    this.shown = { ...this.shown, [item.source]: item }
  }
}
