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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Saved Oracle state, with any broken part (hand-edited or older storage) reset. */
export function oracleState(raw: unknown): OracleState {
  const state = isRecord(raw) ? raw : {}
  return {
    decks: isRecord(state.decks) ? (state.decks as OracleState['decks']) : {},
    occurrences: isRecord(state.occurrences)
      ? (state.occurrences as OracleState['occurrences'])
      : {},
    vars: isRecord(state.vars) ? state.vars : {},
  }
}

/** Where a Roller keeps its Oracle state and history. */
export interface RollerStore {
  load(): { state: OracleState; history: HistoryItem[] } | undefined
  save(data: { state: OracleState; history: HistoryItem[] }): void
}

/** The default store: localStorage (`<key>.state`, `<key>.history`). */
export function localRollerStore(storageKey: string): RollerStore {
  const keys = { state: `${storageKey}.state`, history: `${storageKey}.history` }
  return {
    load: () => ({
      state: oracleState(read(keys.state, null)),
      history: read<unknown>(keys.history, []) as HistoryItem[],
    }),
    save({ state, history }) {
      write(keys.state, state)
      write(keys.history, history)
    },
  }
}

export interface RollerOptions {
  library: PackLibrary
  locale: () => string
  store: RollerStore
  t: Translate
  onResult?: (item: HistoryItem, def: Compiled | undefined) => void
}

/** Session of rolls: Oracle state (decks, once-only entries) and history. */
export class Roller {
  state = $state.raw<OracleState>(emptyState())
  history = $state.raw<HistoryItem[]>([])
  /** Typed context per definition id. */
  contexts = $state<Record<string, Record<string, string>>>({})
  /** Advantage chosen in the roll panel (1, 0 or -1), remembered between rolls. */
  advantage = $state(0)
  /** Result being shown per definition id. */
  shown = $state.raw<Record<string, HistoryItem>>({})

  private nextId = 1
  private options: RollerOptions

  constructor(options: RollerOptions) {
    this.options = options
    this.reload()
  }

  /** Reads the store again (e.g. the host opened another map). */
  reload(): void {
    const data = this.options.store.load()
    this.state = data?.state ?? emptyState()
    this.history = Array.isArray(data?.history) ? data.history : []
    this.shown = {}
    this.nextId = Math.max(0, ...this.history.map((h) => h.id)) + 1
  }

  private save(): void {
    this.options.store.save({ state: this.state, history: this.history })
  }

  run(
    source: string,
    context: Record<string, unknown>,
    mode: 'resolve' | 'draw' = 'resolve',
    /** 1 advantage, -1 disadvantage. */
    advantage = 0,
  ): void {
    const { library, locale, t, onResult } = this.options
    const engine = library.engine
    const options = { locale: locale(), advantage }
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
      this.save()
      onResult?.(item, library.registry.definitions.get(source))
    } catch (error) {
      showToast(t('roll.error', { message: (error as Error).message }), 'error', 8000)
    }
  }

  shuffle(source: string): void {
    try {
      this.state = this.options.library.engine.shuffle(source, this.state)
      this.save()
    } catch (error) {
      showToast(this.options.t('roll.error', { message: (error as Error).message }), 'error', 8000)
    }
  }

  /** Forget once-only entries and deck draws (a new session). */
  resetState(): void {
    this.state = emptyState()
    this.save()
  }

  clearHistory(): void {
    this.history = []
    this.shown = {}
    this.save()
  }

  show(item: HistoryItem): void {
    this.shown = { ...this.shown, [item.source]: item }
  }
}
