import {
  emptyState,
  type Compiled,
  type OracleState,
  type Resolution,
} from '@open-tabletop/oracle-engine'
import { fromState, mathRandom, seeded, type SeededRandom } from '@open-tabletop/random'
import { qualify } from '@open-tabletop/session'
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

/** A seeded session: its seed and where its sequence has got to. */
export interface SeededSession {
  seed: string
  state: number
}

/** What a Roller keeps: Oracle state, history and, in a seeded session, its sequence. */
export interface RollerData {
  state: OracleState
  history: HistoryItem[]
  random?: SeededSession
}

/** Where a Roller keeps its Oracle state and history. */
export interface RollerStore {
  load(): RollerData | undefined
  save(data: RollerData): void
}

/** A saved seeded session, or undefined when it's missing or broken. */
export function seededSession(raw: unknown): SeededSession | undefined {
  if (!isRecord(raw) || typeof raw.seed !== 'string' || !raw.seed) return undefined
  return typeof raw.state === 'number' && Number.isFinite(raw.state)
    ? { seed: raw.seed, state: raw.state }
    : undefined
}

/** The default store: localStorage (`<key>.state`, `<key>.history`, `<key>.random`). */
export function localRollerStore(storageKey: string): RollerStore {
  const keys = {
    state: `${storageKey}.state`,
    history: `${storageKey}.history`,
    random: `${storageKey}.random`,
  }
  return {
    load: () => ({
      state: oracleState(read(keys.state, null)),
      history: read<unknown>(keys.history, []) as HistoryItem[],
      random: seededSession(read(keys.random, null)),
    }),
    save({ state, history, random }) {
      write(keys.state, state)
      write(keys.history, history)
      write(keys.random, random ?? null)
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
  /** Roll mode chosen in the roll panel (full id, '' = normal), remembered between rolls. */
  mode = $state('')
  /** Result being shown per definition id. */
  shown = $state.raw<Record<string, HistoryItem>>({})
  /** The seed the session's rolls follow ('' = unseeded): the same seed, the same rolls. */
  seed = $state('')

  private rng: SeededRandom | null = null
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
    const random = seededSession(data?.random)
    this.seed = random?.seed ?? ''
    this.useRandom(random ? fromState(random.state) : null)
  }

  private useRandom(rng: SeededRandom | null): void {
    this.rng = rng
    this.options.library.setRandom(rng ?? mathRandom())
  }

  private save(): void {
    this.options.store.save({
      state: this.state,
      history: this.history,
      random: this.rng ? { seed: this.seed, state: this.rng.state } : undefined,
    })
  }

  /**
   * Rolls from now on follow this seed ('' = random again). The same seed from a new
   * session gives the same results to the same rolls: to replay or share a session.
   */
  setSeed(seed: string): void {
    this.seed = seed.trim()
    this.useRandom(this.seed ? seeded(this.seed) : null)
    this.save()
  }

  run(
    source: string,
    context: Record<string, unknown>,
    mode: 'resolve' | 'draw' = 'resolve',
    /** A roll mode the definition offers (full id). */
    rollMode?: string,
  ): void {
    const { library, locale, t, onResult } = this.options
    const engine = library.engine
    const options = { locale: locale(), mode: rollMode || undefined }
    // Short names set their full names too (`terrain: forest` is `hex.terrain` as well).
    context = qualify(context)
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

  /** Forget once-only entries and deck draws (a new session); a seeded one starts over. */
  resetState(): void {
    this.state = emptyState()
    if (this.seed) this.useRandom(seeded(this.seed))
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
