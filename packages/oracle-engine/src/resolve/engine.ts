import { matches, resolvePath } from '@open-tabletop/conditions'
import { parseDice, roll, type DiceExpression, type DiceResult } from '@open-tabletop/dice'
import { shuffled, weightedIndex, type RandomSource } from '@open-tabletop/random'
import {
  resolveRef,
  type RollMode,
  type Compiled,
  type CompiledCard,
  type CompiledDeck,
  type CompiledEntry,
  type EntryList,
  type Ref,
  type Registry,
} from '../compile/compile'

/** Mutable session data kept outside definitions (serializable, goes into the OTD bundle). */
export interface OracleState {
  decks: Record<string, { draw: string[]; discard: string[] }>
  /** '<pack>/<id>#<entry>' → times it came up (once / maxOccurrences). */
  occurrences: Record<string, number>
  vars: Record<string, unknown>
}

export function emptyState(): OracleState {
  return { decks: {}, occurrences: {}, vars: {} }
}

export interface Resolution {
  source: string
  kind: Compiled['kind']
  /** Structured data: `set` values, delegated results, generator fields… */
  value: Record<string, unknown>
  /** Rendered text in the requested locale, when there is one. */
  text?: string
  /** Chosen entry or card key. */
  entry?: string
  /** Dice rolled at this node (sub-results keep their own). */
  rolls: DiceResult[]
  /** The roll mode its roll was made with (full id), if any. */
  mode?: string
  children: Resolution[]
  context: Record<string, unknown>
}

export interface HistoryRecord {
  at: string
  source: string
  context: Record<string, unknown>
  value: Record<string, unknown>
  text?: string
  /** Every roll of the resolution, depth-first, for replays and debugging. */
  rolls: DiceResult[]
}

export interface ResolveOutcome {
  resolution: Resolution
  state: OracleState
  record: HistoryRecord
}

export interface ResolveOptions {
  locale?: string
  /** A roll mode the definition offers (full id), chosen by hand for the top-level roll. */
  mode?: string
}

export type OracleEvent =
  | {
      type: 'TABLE_RESOLVED' | 'ORACLE_RESOLVED' | 'GENERATOR_COMPLETED' | 'DECK_DRAWN'
      source: string
    }
  | { type: 'DECK_RESHUFFLED'; source: string }

export interface EngineOptions {
  registry: Registry
  random: RandomSource
  /** Default locale for texts; falls back to each pack's base locale. */
  locale?: string
  maxDepth?: number
  now?: () => string
  onEvent?: (event: OracleEvent) => void
}

export class OracleError extends Error {}

const DICE = /^\s*\d*d(\d+|%|f)(k[hl]\d*)?(\s*[+-]\s*\d+)?\s*$/i
const MAX_REROLLS = 20

export interface OracleEngine {
  resolve(
    id: string,
    context?: Record<string, unknown>,
    state?: OracleState,
    options?: ResolveOptions,
  ): ResolveOutcome
  draw(
    id: string,
    state?: OracleState,
    context?: Record<string, unknown>,
    options?: ResolveOptions,
  ): ResolveOutcome
  shuffle(id: string, state: OracleState): OracleState
  reset(id: string, state: OracleState): OracleState
  get(id: string): Compiled | undefined
  list(filter?: { kind?: Compiled['kind']; tag?: string; pack?: string }): Compiled[]
}

export function createOracleEngine(options: EngineOptions): OracleEngine {
  const { registry, random } = options
  const maxDepth = options.maxDepth ?? 16
  const now = options.now ?? (() => new Date().toISOString())

  const lookup = (id: string): Compiled => {
    const def =
      registry.definitions.get(id) ??
      registry.definitions.get(resolveRef(registry, id.split('/')[0], id) ?? '')
    if (!def) throw new OracleError(`Unknown definition "${id}"`)
    return def
  }

  const run = (
    id: string,
    context: Record<string, unknown>,
    state: OracleState,
    opts: ResolveOptions,
    deckOnly: boolean,
  ): ResolveOutcome => {
    const def = lookup(id)
    if (deckOnly && def.kind !== 'deck') throw new OracleError(`"${id}" is not a deck`)
    const session = new Run(
      registry,
      random,
      structuredClone(state),
      opts.locale ?? options.locale,
      maxDepth,
      options.onEvent,
    )
    const resolution = session.resolve(def, context, 0, opts.mode)
    return {
      resolution,
      state: session.state,
      record: {
        at: now(),
        source: def.id,
        context,
        value: resolution.value,
        text: resolution.text,
        rolls: flattenRolls(resolution),
      },
    }
  }

  return {
    resolve: (id, context = {}, state = emptyState(), opts = {}) =>
      run(id, context, state, opts, false),
    draw: (id, state = emptyState(), context = {}, opts = {}) =>
      run(id, context, state, opts, true),
    shuffle(id, state) {
      const deck = lookup(id)
      if (deck.kind !== 'deck') throw new OracleError(`"${id}" is not a deck`)
      const next = structuredClone(state)
      next.decks[deck.id] = { draw: shuffled(random, allCards(deck)), discard: [] }
      options.onEvent?.({ type: 'DECK_RESHUFFLED', source: deck.id })
      return next
    },
    reset(id, state) {
      const def = lookup(id)
      const next = structuredClone(state)
      delete next.decks[def.id]
      for (const key of Object.keys(next.occurrences))
        if (key.startsWith(`${def.id}#`)) delete next.occurrences[key]
      return next
    },
    get: (id) => registry.definitions.get(id),
    list: (filter = {}) =>
      [...registry.definitions.values()].filter(
        (d) =>
          (!filter.kind || d.kind === filter.kind) &&
          (!filter.tag || d.tags.includes(filter.tag)) &&
          (!filter.pack || d.pack === filter.pack),
      ),
  }
}

/** One resolution: owns a working copy of the state and the depth guard. */
class Run {
  constructor(
    private registry: Registry,
    private random: RandomSource,
    public state: OracleState,
    private locale: string | undefined,
    private maxDepth: number,
    private onEvent?: (event: OracleEvent) => void,
  ) {}

  resolve(
    def: Compiled,
    context: Record<string, unknown>,
    depth: number,
    /** Roll mode chosen by hand (top level only). */
    chosen?: string,
  ): Resolution {
    if (depth > this.maxDepth)
      throw new OracleError(`Maximum depth (${this.maxDepth}) exceeded at "${def.id}"`)
    switch (def.kind) {
      case 'table': {
        const res = this.resolveList(def, def, context, depth, chosen, '')
        this.onEvent?.({ type: 'TABLE_RESOLVED', source: def.id })
        return res
      }
      case 'oracle': {
        const first = Object.entries(def.inputs)[0]
        if (!first) throw new OracleError(`"${def.id}" has no input`)
        const [input, spec] = first
        const requested = context[input]
        const option =
          typeof requested === 'string' && def.variants[requested]
            ? requested
            : (spec.default ?? spec.options[0])
        const variant = def.variants[option]
        if (!variant) throw new OracleError(`"${def.id}" has no variant "${option}"`)
        const res = this.resolveList(
          def,
          variant,
          { ...context, [input]: option },
          depth,
          chosen,
          option,
        )
        res.value = { [input]: option, ...res.value }
        this.onEvent?.({ type: 'ORACLE_RESOLVED', source: def.id })
        return res
      }
      case 'generator': {
        const scope: Record<string, unknown> = { ...context }
        const node = this.node(def, context)
        for (const field of def.fields) {
          if (field.when && !matches(field.when, scope)) continue
          const fieldContext = { ...scope, ...this.evalValues(field.context, scope, node) }
          let value: unknown
          if (field.kind === 'table' || field.kind === 'generator') {
            const child = this.follow(def, field.ref!, fieldContext, depth)
            node.children.push(child)
            value = child.text !== undefined ? { ...child.value, text: child.text } : child.value
          } else if (field.kind === 'roll') {
            value = this.roll(field.parsedRoll ?? field.roll!, fieldContext, node).total
          } else {
            value =
              typeof field.value === 'string'
                ? this.evalValue(field.value, scope, node)
                : field.value
          }
          node.value[field.name] = value
          scope[field.name] = value
        }
        const template = this.text(def.id, 'template') ?? def.template
        if (template) node.text = this.render(template, scope, node)
        this.onEvent?.({ type: 'GENERATOR_COMPLETED', source: def.id })
        return node
      }
      case 'deck':
        return this.draw(def, context, depth)
    }
  }

  /**
   * The roll mode a table or oracle is rolled with: the one chosen by hand (if it offers
   * it) and those whose `modeWhen` holds. Modes that cancel each other drop out; of the
   * rest, the first (chosen, then in `modeWhen` order) is used.
   */
  private modeFor(
    def: Compiled,
    context: Record<string, unknown>,
    chosen: string | undefined,
  ): RollMode | undefined {
    if (def.kind !== 'table' && def.kind !== 'oracle') return undefined
    const active = [
      ...(chosen && def.modes.includes(chosen) ? [chosen] : []),
      ...Object.entries(def.modeWhen)
        .filter(([, when]) => matches(when, context))
        .map(([id]) => id),
    ]
      .filter((id, i, all) => all.indexOf(id) === i)
      .map((id) => this.registry.rollModes.get(id))
      .filter((m): m is RollMode => !!m)
    const cancel = (a: RollMode, b: RollMode) =>
      a.cancels.includes(b.id) || b.cancels.includes(a.id)
    return active.find((m) => !active.some((other) => other !== m && cancel(m, other)))
  }

  private resolveList(
    def: Compiled & { clamp?: boolean; onExhausted?: 'reroll' | 'next' | 'none' },
    list: EntryList,
    context: Record<string, unknown>,
    depth: number,
    chosen: string | undefined,
    /** The oracle variant the list belongs to ('' for tables). */
    variant: string,
  ): Resolution {
    const node = this.node(def, context)
    const exhausted = (e: CompiledEntry) => this.exhausted(def.id, variant, e)
    const candidates = list.entries.filter((e) => !e.when || matches(e.when, context))
    if (candidates.length === 0) return node

    const mode = this.modeFor(def, context, chosen)
    if (mode) node.mode = mode.id
    let entry = this.pick(list, candidates, context, node, mode, def.clamp ?? true)
    if (entry && exhausted(entry)) {
      const policy = def.onExhausted ?? 'reroll'
      const available = candidates.filter((e) => !exhausted(e))
      if (policy === 'none' || available.length === 0) entry = undefined
      else if (policy === 'next') {
        const start = candidates.indexOf(entry)
        entry = [...candidates.slice(start + 1), ...candidates.slice(0, start)].find(
          (e) => !exhausted(e),
        )
      } else {
        let tries = 0
        while (entry && exhausted(entry) && tries++ < MAX_REROLLS)
          entry = this.pick(
            list,
            list.roll ? candidates : available,
            context,
            node,
            mode,
            def.clamp ?? true,
          )
        if (entry && exhausted(entry)) entry = available[0]
      }
    }
    if (!entry) return node
    if (entry.limit) {
      const key = occurrenceKey(def.id, variant, entry)
      this.state.occurrences[key] = (this.state.occurrences[key] ?? 0) + 1
    }
    this.applyEntry(
      def,
      entry,
      this.text(def.id, 'entries', entry.key) ?? entry.result,
      context,
      depth,
      node,
    )
    return node
  }

  private pick(
    list: EntryList,
    candidates: CompiledEntry[],
    context: Record<string, unknown>,
    node: Resolution,
    mode: RollMode | undefined,
    clamp: boolean,
  ): CompiledEntry | undefined {
    if (!list.roll) {
      const index = weightedIndex(
        this.random,
        candidates.map((e) => e.weight),
      )
      return candidates[index]
    }
    const total = this.roll(list.parsedRoll ?? list.roll, context, node, mode).total
    const hit = candidates.find((e) => total >= e.min! && total <= e.max!)
    if (hit || !clamp) return hit
    const lowest = candidates.reduce((a, b) => (b.min! < a.min! ? b : a))
    const highest = candidates.reduce((a, b) => (b.max! > a.max! ? b : a))
    if (total < lowest.min!) return lowest
    if (total > highest.max!) return highest
    return undefined
  }

  private exhausted(defId: string, variant: string, entry: CompiledEntry): boolean {
    return (
      !!entry.limit &&
      (this.state.occurrences[occurrenceKey(defId, variant, entry)] ?? 0) >= entry.limit
    )
  }

  /** Shared by table entries and deck cards: `set` values, delegation, text. */
  private applyEntry(
    def: Compiled,
    entry: Pick<CompiledEntry, 'key' | 'ref' | 'set' | 'effects' | 'pause'>,
    template: string | undefined,
    context: Record<string, unknown>,
    depth: number,
    node: Resolution,
  ): void {
    node.entry = entry.key
    const set = this.evalValues(entry.set, context, node)
    let child: Resolution | undefined
    if (entry.ref) {
      child = this.follow(def, entry.ref, { ...context, ...set }, depth)
      node.children.push(child)
    }
    node.value = { ...child?.value, ...set }
    // Effects add up with the ones of the table it rolled ('=value' sets: the last wins).
    const effects = mergeEffects(
      child?.value.effects as Record<string, number | string> | undefined,
      this.evalValues(entry.effects, { ...context, ...set }, node) as Record<
        string,
        number | string
      >,
    )
    if (Object.keys(effects).length) node.value.effects = effects
    else delete node.value.effects
    // A pause anywhere in what was rolled stops the host (a trip waits for the player).
    if (entry.pause) node.value.pause = true
    node.text = template
      ? this.render(template, { ...context, ...node.value, result: child?.text }, node)
      : child?.text
  }

  private draw(deck: CompiledDeck, context: Record<string, unknown>, depth: number): Resolution {
    const node = this.node(deck, context)
    const saved = this.state.decks[deck.id]
    const current = saved
      ? reconcile(deck, saved, this.random)
      : { draw: shuffled(this.random, allCards(deck)), discard: [] }
    let { draw, discard } = current
    if (draw.length === 0) {
      if (deck.reshuffle === 'manual') {
        this.state.decks[deck.id] = current
        node.value = { empty: true }
        return node
      }
      draw = shuffled(this.random, discard.length ? discard : allCards(deck))
      discard = []
      this.onEvent?.({ type: 'DECK_RESHUFFLED', source: deck.id })
    }
    const [key, ...rest] = draw
    draw = rest
    if (deck.reshuffle === 'after-draw') draw = shuffled(this.random, [...draw, key])
    else discard = [...discard, key]
    this.state.decks[deck.id] = { draw, discard }
    const card = deck.cards.find((c) => c.key === key) as CompiledCard // reconciled above
    this.applyEntry(
      deck,
      card,
      this.text(deck.id, 'cards', card.key) ?? card.result,
      context,
      depth,
      node,
    )
    node.value = { ...node.value, card: card.key, remaining: draw.length }
    this.onEvent?.({ type: 'DECK_DRAWN', source: deck.id })
    return node
  }

  private follow(
    from: Compiled,
    ref: Ref,
    context: Record<string, unknown>,
    depth: number,
  ): Resolution {
    let target = ref.target
    if (ref.dynamic) {
      const rendered = this.render(target, context, undefined)
      target = resolveRef(this.registry, from.pack, rendered) ?? rendered
    }
    const def = this.registry.definitions.get(target)
    if (!def) throw new OracleError(`Unknown ${ref.kind} "${target}" referenced by "${from.id}"`)
    return this.resolve(def, context, depth + 1)
  }

  private roll(
    expression: string | DiceExpression,
    context: Record<string, unknown>,
    node: Resolution | undefined,
    mode?: RollMode,
  ): DiceResult {
    const parsed =
      typeof expression === 'string'
        ? parseDice(
            expression.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path: string) => {
              // Missing values count as 0 (e.g. no weather modifier today); wrong types are errors.
              const value = resolvePath(context, path) ?? 0
              if (typeof value !== 'number' || !Number.isFinite(value))
                throw new OracleError(`Roll "${expression}" needs a number for "${path}"`)
              // Negative numbers become "- n" so the dice grammar stays simple.
              return value < 0 ? `0 - ${-value}` : String(value)
            }),
          )
        : expression
    const result = roll(parsed, this.random, mode && { repeat: mode.repeat, keep: mode.keep })
    node?.rolls.push(result)
    return result
  }

  /** `{{field}}`, `{{field.sub}}` and inline dice `{{2d6}}`. No logic, ever. */
  private render(
    template: string,
    scope: Record<string, unknown>,
    node: Resolution | undefined,
  ): string {
    return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, expr: string) => {
      const value = this.lookupValue(expr, scope, node)
      if (value === undefined || value === null) return ''
      if (typeof value === 'object') {
        const text = (value as Record<string, unknown>).text
        return typeof text === 'string' ? text : ''
      }
      return String(value)
    })
  }

  private lookupValue(
    expr: string,
    scope: Record<string, unknown>,
    node: Resolution | undefined,
  ): unknown {
    if (DICE.test(expr)) return this.roll(expr, scope, node).total
    return resolvePath(scope, expr)
  }

  /** A whole-template string keeps the raw value (numbers stay numbers); mixed text renders. */
  private evalValue(
    value: string,
    scope: Record<string, unknown>,
    node: Resolution | undefined,
  ): unknown {
    const whole = /^\{\{\s*([^}]+?)\s*\}\}$/.exec(value)
    if (whole) return this.lookupValue(whole[1], scope, node)
    return /\{\{/.test(value) ? this.render(value, scope, node) : value
  }

  private evalValues(
    values: Record<string, unknown> | undefined,
    scope: Record<string, unknown>,
    node: Resolution | undefined,
  ): Record<string, unknown> {
    if (!values) return {}
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(values))
      out[key] =
        typeof value === 'string'
          ? this.evalValue(value, { ...scope, ...out }, node)
          : // Nested values ({ resources: { food: '{{1d3}}' } }) are filled in too.
            isRecord(value)
            ? this.evalValues(value, { ...scope, ...out }, node)
            : value
    return out
  }

  /** Localized text with per-string fallback to the base locale (the definition itself). */
  private text(id: string, field: 'template' | 'name'): string | undefined
  private text(id: string, field: 'entries' | 'cards', key: string): string | undefined
  private text(
    id: string,
    field: 'template' | 'name' | 'entries' | 'cards',
    key?: string,
  ): string | undefined {
    if (!this.locale) return undefined
    const overlay = this.registry.overlays.get(this.locale)?.get(id)
    if (!overlay) return undefined
    if (field === 'entries' || field === 'cards') return overlay[field]?.[key!]
    return overlay[field]
  }

  private node(def: Compiled, context: Record<string, unknown>): Resolution {
    return { source: def.id, kind: def.kind, value: {}, rolls: [], children: [], context }
  }
}

/**
 * '<pack>/<id>#<entry>'. Entries of an oracle without an explicit id are numbered per
 * variant ('#likely.0'), so each variant counts its own; explicit ids count across variants.
 */
function occurrenceKey(defId: string, variant: string, entry: CompiledEntry): string {
  return variant && !entry.explicitId ? `${defId}#${variant}.${entry.key}` : `${defId}#${entry.key}`
}

/**
 * Brings saved piles in line with the deck as it is now (it may have been edited since):
 * unknown cards are dropped, extra copies removed, and missing copies shuffled into the draw pile.
 */
function reconcile(
  deck: CompiledDeck,
  piles: { draw: string[]; discard: string[] },
  random: RandomSource,
): { draw: string[]; discard: string[] } {
  const left = new Map(deck.cards.map((c) => [c.key, c.count]))
  const keep = (key: string) => {
    const n = left.get(key) ?? 0
    if (n <= 0) return false
    left.set(key, n - 1)
    return true
  }
  const discard = piles.discard.filter(keep)
  let draw = piles.draw.filter(keep)
  const missing = [...left].flatMap(([key, n]) => Array.from({ length: n }, () => key))
  if (missing.length) draw = shuffled(random, [...draw, ...missing])
  return { draw, discard }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function allCards(deck: CompiledDeck): string[] {
  return deck.cards.flatMap((card) => Array.from({ length: card.count }, () => card.key))
}

function flattenRolls(resolution: Resolution): DiceResult[] {
  return [...resolution.rolls, ...resolution.children.flatMap(flattenRolls)]
}

/**
 * Two lists of effects as one: numbers on the same path add up (numbers written as text,
 * like '+2', too); a setting ('=3') replaces what came before.
 */
export function mergeEffects(
  a: Record<string, number | string> | undefined,
  b: Record<string, number | string> | undefined,
): Record<string, number | string> {
  const out: Record<string, number | string> = { ...a }
  for (const [path, change] of Object.entries(b ?? {})) {
    const before = out[path]
    const number = (v: unknown) =>
      typeof v === 'number'
        ? v
        : typeof v === 'string' && /^[+-]?\d+(\.\d+)?$/.test(v.trim())
          ? Number(v)
          : undefined
    const x = number(before)
    const y = number(change)
    out[path] = x !== undefined && y !== undefined ? x + y : change
  }
  return out
}
