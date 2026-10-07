import { validateCondition, type Condition } from '@open-tabletop/conditions'
import { parseDice, possibleTotals, type DiceExpression } from '@open-tabletop/dice'
import {
  rollModesSchema,
  type CardDef,
  type Definition,
  type Entry,
  type Manifest,
  type Overlay,
} from '../definitions/schema'
import type { Diagnostic, LoadedPack } from '../loader/load'
import { foldSystemTexts } from './systemTexts'

export interface Ref {
  kind: 'table' | 'generator'
  /** Resolved full id (`pack/id`), or the raw template for dynamic references. */
  target: string
  dynamic: boolean
}

export interface CompiledEntry {
  /** Explicit entry id, or its index. Used for translations and once/max state. */
  key: string
  explicitId: boolean
  min?: number
  max?: number
  weight: number
  when?: Condition
  result?: string
  ref?: Ref
  set?: Record<string, unknown>
  /** Changes to declared values (`party.stats.morale: -1`), applied by the host. */
  effects?: Record<string, number | string>
  /** Comes up as `pause: true` in the result: the host stops to let the player act. */
  pause?: boolean
  /** Max times it may come up per session (once = 1). */
  limit?: number
}

export interface EntryList {
  roll?: string
  /** Pre-parsed roll when it has no templates. */
  parsedRoll?: DiceExpression
  entries: CompiledEntry[]
}

interface Base {
  id: string // full id: pack/id
  localId: string
  pack: string
  file: string
  name?: string
  description?: string
  tags: string[]
}

/** Text in one or several languages. */
export type LocalizedText = string | Record<string, string>

/** A system's way of rolling (`kind: roll-modes`): the roll made `repeat` times, one kept. */
export interface RollMode {
  /** Full id: `pack/mode`. */
  id: string
  pack: string
  localId: string
  name?: LocalizedText
  description?: LocalizedText
  repeat: number
  keep: 'highest' | 'lowest' | 'middle'
  /** Full ids of the modes it cancels out with. */
  cancels: string[]
}

/** How a table or oracle may be rolled: modes offered by hand, and modes that apply alone. */
export interface WithRollModes {
  /** Full ids of the modes offered when rolling by hand, in order. */
  modes: string[]
  /** Full mode id → when it applies by itself. */
  modeWhen: Record<string, Condition>
  /** Full mode id → when it doesn't apply by itself (otherwise it does, unless in `modeWhen`). */
  modeUnless: Record<string, Condition>
}

export interface CompiledTable extends Base, EntryList, WithRollModes {
  kind: 'table'
  clamp: boolean
  onExhausted: 'reroll' | 'next' | 'none'
}

export interface CompiledOracle extends Base, WithRollModes {
  kind: 'oracle'
  inputs: Record<
    string,
    { options: string[]; default?: string; label?: string; labels?: Record<string, string> }
  >
  clamp: boolean
  onExhausted: 'reroll' | 'next' | 'none'
  variants: Record<string, EntryList>
}

export interface CompiledField {
  name: string
  kind: 'table' | 'generator' | 'roll' | 'value'
  ref?: Ref
  roll?: string
  parsedRoll?: DiceExpression
  value?: unknown
  when?: Condition
  context?: Record<string, unknown>
}

export interface CompiledGenerator extends Base {
  kind: 'generator'
  fields: CompiledField[]
  template?: string
}

export interface CompiledCard {
  key: string
  count: number
  result?: string
  ref?: Ref
  set?: Record<string, unknown>
  effects?: Record<string, number | string>
  pause?: boolean
}

export interface CompiledDeck extends Base {
  kind: 'deck'
  cards: CompiledCard[]
  reshuffle: 'when-empty' | 'manual' | 'after-draw'
}

export type Compiled = CompiledTable | CompiledOracle | CompiledGenerator | CompiledDeck

export interface Registry {
  definitions: Map<string, Compiled>
  packs: Map<
    string,
    { manifest: Manifest; dependencies: string[]; aliases: Record<string, string> }
  >
  /** locale → full definition id → overlay. */
  overlays: Map<string, Map<string, Overlay[string]>>
  /** Per pack, definitions owned by other engines (travel-rules, bindings…), untouched. */
  extras: Map<string, LoadedPack['extras']>
  /** The roll modes packs declare (`kind: roll-modes`), by full id. */
  rollModes: Map<string, RollMode>
  diagnostics: Diagnostic[]
}

const TEMPLATE = /\{\{/

/** Compiles loaded packs into an immutable registry and reports semantic problems. */
export function compilePacks(loaded: LoadedPack[], diagnostics: Diagnostic[] = []): Registry {
  const registry: Registry = {
    definitions: new Map(),
    packs: new Map(),
    overlays: new Map(),
    extras: new Map(),
    rollModes: new Map(),
    diagnostics,
  }
  foldSystemTexts(loaded, diagnostics)
  for (const pack of loaded) {
    registry.extras.set(pack.manifest.id, pack.extras)
    const deps = Object.keys(pack.manifest.dependencies ?? {})
    registry.packs.set(pack.manifest.id, {
      manifest: pack.manifest,
      dependencies: deps,
      aliases: pack.manifest.aliases ?? {},
    })
  }
  for (const pack of loaded) {
    for (const dep of Object.keys(pack.manifest.dependencies ?? {}))
      if (!registry.packs.has(dep))
        diagnostics.push({
          severity: 'error',
          message: `Missing dependency "${dep}"`,
          pack: pack.manifest.id,
        })
  }

  compileRollModes(loaded, registry, diagnostics)

  // First pass: register ids so references can be resolved in any order.
  const raw = new Map<string, { definition: Definition; pack: string; file: string }>()
  for (const pack of loaded)
    for (const { definition, file } of pack.definitions) {
      const id = `${pack.manifest.id}/${definition.id}`
      if (raw.has(id)) {
        diagnostics.push({
          severity: 'error',
          message: `Duplicate id "${definition.id}"`,
          pack: pack.manifest.id,
          file,
        })
        continue
      }
      raw.set(id, { definition, pack: pack.manifest.id, file })
    }

  for (const [id, { definition, pack, file }] of raw) {
    const ctx = new CompileContext(registry, raw, pack, file, definition.id, diagnostics)
    registry.definitions.set(id, ctx.compile(id, definition))
  }

  detectCycles(registry, diagnostics)
  compileOverlays(loaded, registry, diagnostics)
  return registry
}

class CompileContext {
  constructor(
    private registry: Registry,
    private raw: Map<string, unknown>,
    private pack: string,
    private file: string,
    private localId: string,
    private diagnostics: Diagnostic[],
  ) {}

  compile(id: string, d: Definition): Compiled {
    const base: Base = {
      id,
      localId: d.id,
      pack: this.pack,
      file: this.file,
      name: d.name,
      description: d.description,
      tags: d.tags ?? [],
    }
    switch (d.kind) {
      case 'table':
        return {
          ...base,
          kind: 'table',
          ...this.rollModes(d),
          clamp: d.clamp ?? true,
          onExhausted: d.onExhausted ?? 'reroll',
          ...this.entryList(d.roll, d.entries, 'entries'),
        }
      case 'oracle': {
        const variants: Record<string, EntryList> = {}
        const declared = Object.values(d.inputs)[0]?.options ?? []
        for (const [name, variant] of Object.entries(d.variants)) {
          if (declared.length && !declared.includes(name))
            this.warn(`variants.${name}`, `Variant "${name}" is not one of the input options`)
          variants[name] = this.entryList(
            variant.roll ?? d.roll,
            variant.entries,
            `variants.${name}.entries`,
          )
        }
        for (const option of declared)
          if (!variants[option])
            this.error('variants', `Missing variant for input option "${option}"`)
        if (Object.keys(d.inputs).length !== 1)
          this.error('inputs', 'An oracle has exactly one input that selects the variant')
        for (const [name, input] of Object.entries(d.inputs))
          for (const option of Object.keys(input.labels ?? {}))
            if (!input.options.includes(option))
              this.warn(`inputs.${name}.labels.${option}`, `Label for unknown option "${option}"`)
        return {
          ...base,
          kind: 'oracle',
          ...this.rollModes(d),
          inputs: d.inputs,
          clamp: d.clamp ?? true,
          onExhausted: d.onExhausted ?? 'reroll',
          variants,
        }
      }
      case 'generator':
        return {
          ...base,
          kind: 'generator',
          template: d.template,
          fields: Object.entries(d.fields).map(([name, f]): CompiledField => {
            const at = `fields.${name}`
            if (f.when) this.conditions(f.when, `${at}.when`)
            if (f.table)
              return {
                name,
                kind: 'table',
                ref: this.ref('table', f.table, at),
                when: f.when as Condition,
                context: f.context,
              }
            if (f.generator)
              return {
                name,
                kind: 'generator',
                ref: this.ref('generator', f.generator, at),
                when: f.when as Condition,
                context: f.context,
              }
            if (f.roll !== undefined)
              return {
                name,
                kind: 'roll',
                ...this.roll(f.roll, `${at}.roll`),
                when: f.when as Condition,
                context: f.context,
              }
            return {
              name,
              kind: 'value',
              value: f.value,
              when: f.when as Condition,
              context: f.context,
            }
          }),
        }
      case 'deck':
        return {
          ...base,
          kind: 'deck',
          reshuffle: d.reshuffle ?? 'when-empty',
          cards: d.cards.map((c: CardDef, i): CompiledCard => ({
            key: c.id,
            count: c.count ?? 1,
            result: c.result,
            ref: c.table
              ? this.ref('table', c.table, `cards[${i}]`)
              : c.generator
                ? this.ref('generator', c.generator, `cards[${i}]`)
                : undefined,
            set: c.set,
            effects: c.effects,
            ...(c.pause && { pause: true }),
          })),
        }
    }
  }

  private entryList(roll: string | undefined, entries: Entry[], at: string): EntryList {
    const rolled: { roll?: string; parsedRoll?: DiceExpression } =
      roll !== undefined
        ? this.roll(roll, at === 'entries' ? 'roll' : at.replace(/\.entries$/, '.roll'))
        : {}
    const compiled = entries.map((e, i): CompiledEntry => {
      const where = `${at}[${i}]`
      if (roll !== undefined && e.weight !== undefined)
        this.error(where, 'Rolled tables use ranges, not weights')
      if (roll !== undefined && e.range === undefined)
        this.error(where, 'Missing range (the table has a roll)')
      if (roll === undefined && e.range !== undefined)
        this.error(where, 'Ranges need a roll on the table')
      if (e.when) this.conditions(e.when, `${where}.when`)
      const [min, max] = e.range !== undefined ? parseRange(e.range) : [undefined, undefined]
      if (min !== undefined && max !== undefined && min > max)
        this.error(`${where}.range`, `Range ${min}-${max} is reversed`)
      return {
        key: e.id ?? String(i),
        explicitId: e.id !== undefined,
        min,
        max,
        weight: e.weight ?? 1,
        when: e.when as Condition | undefined,
        result: e.result,
        ref: e.table
          ? this.ref('table', e.table, where)
          : e.generator
            ? this.ref('generator', e.generator, where)
            : undefined,
        set: e.set,
        effects: e.effects,
        ...(e.pause && { pause: true }),
        limit: e.once ? 1 : e.maxOccurrences,
      }
    })
    const ids = compiled.filter((e) => e.explicitId).map((e) => e.key)
    for (const dup of ids.filter((id, i) => ids.indexOf(id) !== i))
      this.error(at, `Duplicate entry id "${dup}"`)
    if (rolled.parsedRoll) this.checkCoverage(rolled.parsedRoll, compiled, at)
    return { ...rolled, entries: compiled }
  }

  /** Overlapping unconditional ranges are errors; unreachable entries and gaps are warnings. */
  private checkCoverage(roll: DiceExpression, entries: CompiledEntry[], at: string): void {
    const unconditional = entries.filter((e) => !e.when && e.min !== undefined)
    for (let i = 0; i < unconditional.length; i++)
      for (let j = i + 1; j < unconditional.length; j++) {
        const a = unconditional[i]
        const b = unconditional[j]
        if (a.min! <= b.max! && b.min! <= a.max!)
          this.error(at, `Ranges of entries "${a.key}" and "${b.key}" overlap`)
      }
    const totals = possibleTotals(roll)
    if (!totals) return
    for (const e of entries)
      if (e.min !== undefined && !totals.some((t) => t >= e.min! && t <= e.max!))
        this.warn(at, `Entry "${e.key}" can never come up with ${roll.source}`)
    if (entries.some((e) => e.when)) return
    const missing = totals.filter((t) => !unconditional.some((e) => t >= e.min! && t <= e.max!))
    if (missing.length) this.warn(at, `No entry for roll results: ${summarize(missing)}`)
  }

  private roll(roll: string, at: string): { roll: string; parsedRoll?: DiceExpression } {
    // Templates ({{pre}}) are filled with numbers at runtime; validate with 0.
    const probe = roll.replace(/\{\{\s*[\w.]+\s*\}\}/g, '0')
    try {
      const parsed = parseDice(probe)
      return TEMPLATE.test(roll) ? { roll } : { roll, parsedRoll: parsed }
    } catch (error) {
      this.error(at, (error as Error).message)
      return { roll }
    }
  }

  private ref(kind: 'table' | 'generator', ref: string, at: string): Ref {
    if (TEMPLATE.test(ref)) return { kind, target: ref, dynamic: true }
    const target = resolveRef(this.registry, this.pack, ref, (id) => this.raw.has(id))
    if (!target) {
      this.error(at, `Unknown ${kind} "${ref}"`)
      return { kind, target: ref, dynamic: false }
    }
    return { kind, target, dynamic: false }
  }

  private conditions(condition: unknown, at: string): void {
    for (const problem of validateCondition(condition, at)) this.error(at, problem)
  }

  /** `modes`, `modeWhen` and `modeUnless`: references to roll modes, and their conditions. */
  private rollModes(d: {
    modes?: string[]
    modeWhen?: Record<string, unknown>
    modeUnless?: Record<string, unknown>
    advantage?: boolean
  }): WithRollModes {
    if (d.advantage !== undefined)
      this.warn(
        'advantage',
        '"advantage" no longer does anything: declare the ways of rolling in a "kind: roll-modes" definition and list them in "modes" (e.g. modes: [advantage, disadvantage])',
      )
    const mode = (ref: string, at: string): string | undefined => {
      const id = resolveRef(this.registry, this.pack, ref, (x) => this.registry.rollModes.has(x))
      if (!id) this.error(at, `Unknown roll mode "${ref}"`)
      return id ?? undefined
    }
    const modes = (d.modes ?? []).flatMap((ref, i) => mode(ref, `modes[${i}]`) ?? [])
    const conditional = (key: 'modeWhen' | 'modeUnless') => {
      const out: Record<string, Condition> = {}
      for (const [ref, condition] of Object.entries(d[key] ?? {})) {
        const id = mode(ref, `${key}.${ref}`)
        this.conditions(condition, `${key}.${ref}`)
        if (id) out[id] = condition as Condition
      }
      return out
    }
    return { modes, modeWhen: conditional('modeWhen'), modeUnless: conditional('modeUnless') }
  }

  private error(at: string, message: string): void {
    this.diagnostics.push({
      severity: 'error',
      message,
      pack: this.pack,
      file: this.file,
      at: `${this.localId}.${at}`,
    })
  }

  private warn(at: string, message: string): void {
    this.diagnostics.push({
      severity: 'warning',
      message,
      pack: this.pack,
      file: this.file,
      at: `${this.localId}.${at}`,
    })
  }
}

/** Reads every pack's `kind: roll-modes` into the registry, then resolves their `cancels`. */
function compileRollModes(loaded: LoadedPack[], registry: Registry, diagnostics: Diagnostic[]) {
  const pending: { mode: RollMode; cancels: string[]; file: string }[] = []
  for (const pack of loaded)
    for (const extra of pack.extras) {
      if (extra.kind !== 'roll-modes') continue
      const parsed = rollModesSchema.safeParse(extra.data)
      if (!parsed.success) {
        for (const issue of parsed.error.issues)
          diagnostics.push({
            severity: 'error',
            message: issue.message,
            pack: pack.manifest.id,
            file: extra.file,
            at: ['roll-modes', ...issue.path.map(String)].join('.'),
          })
        continue
      }
      for (const [localId, m] of Object.entries(parsed.data.modes)) {
        const id = `${pack.manifest.id}/${localId}`
        if (registry.rollModes.has(id))
          diagnostics.push({
            severity: 'error',
            message: `Duplicate roll mode "${localId}"`,
            pack: pack.manifest.id,
            file: extra.file,
          })
        const mode: RollMode = {
          id,
          pack: pack.manifest.id,
          localId,
          name: m.name,
          description: m.description,
          repeat: m.repeat,
          keep: m.keep,
          cancels: [],
        }
        registry.rollModes.set(id, mode)
        const cancels = m.cancels === undefined ? [] : [m.cancels].flat()
        pending.push({ mode, cancels, file: extra.file })
      }
    }
  for (const { mode, cancels, file } of pending)
    for (const ref of cancels) {
      const target = resolveRef(registry, mode.pack, ref, (x) => registry.rollModes.has(x))
      if (target) mode.cancels.push(target)
      else
        diagnostics.push({
          severity: 'error',
          message: `Unknown roll mode "${ref}"`,
          pack: mode.pack,
          file,
          at: `roll-modes.modes.${mode.localId}.cancels`,
        })
    }
}

/**
 * Resolves a reference from inside `pack`: aliases, then `pack/id` as written, then the
 * pack's own namespace, then its dependencies'.
 */
export function resolveRef(
  registry: Registry,
  pack: string,
  ref: string,
  exists: (id: string) => boolean = (id) => registry.definitions.has(id),
): string | null {
  const info = registry.packs.get(pack)
  const aliased = info?.aliases[ref] ?? ref
  if (aliased.includes('/')) return exists(aliased) ? aliased : null
  for (const scope of [pack, ...(info?.dependencies ?? [])]) {
    const id = `${scope}/${aliased}`
    if (exists(id)) return id
  }
  return null
}

function parseRange(range: number | string): [number, number] {
  if (typeof range === 'number') return [range, range]
  const match = /^\s*(-?\d+)\s*(?:-\s*(-?\d+)\s*)?$/.exec(range)!
  const min = Number(match[1])
  return [min, match[2] !== undefined ? Number(match[2]) : min]
}

function summarize(values: number[]): string {
  return values.length > 8
    ? `${values.slice(0, 8).join(', ')}… (${values.length})`
    : values.join(', ')
}

function detectCycles(registry: Registry, diagnostics: Diagnostic[]): void {
  const edges = (c: Compiled): string[] => {
    const refs: (Ref | undefined)[] =
      c.kind === 'table'
        ? c.entries.map((e) => e.ref)
        : c.kind === 'oracle'
          ? Object.values(c.variants).flatMap((v) => v.entries.map((e) => e.ref))
          : c.kind === 'generator'
            ? c.fields.map((f) => f.ref)
            : c.cards.map((card) => card.ref)
    return refs.filter((r): r is Ref => !!r && !r.dynamic).map((r) => r.target)
  }
  const state = new Map<string, 'visiting' | 'done'>()
  const visit = (id: string, path: string[]): void => {
    if (state.get(id) === 'done') return
    if (state.get(id) === 'visiting') {
      const cycle = [...path.slice(path.indexOf(id)), id]
      const def = registry.definitions.get(id)
      diagnostics.push({
        severity: 'error',
        message: `Circular reference: ${cycle.join(' → ')}`,
        pack: def?.pack,
        file: def?.file,
      })
      return
    }
    state.set(id, 'visiting')
    const def = registry.definitions.get(id)
    if (def)
      for (const next of edges(def)) if (registry.definitions.has(next)) visit(next, [...path, id])
    state.set(id, 'done')
  }
  for (const id of registry.definitions.keys()) visit(id, [])
}

function compileOverlays(
  loaded: LoadedPack[],
  registry: Registry,
  diagnostics: Diagnostic[],
): void {
  for (const pack of loaded) {
    for (const [locale, overlays] of Object.entries(pack.overlays)) {
      const byId = registry.overlays.get(locale) ?? new Map()
      registry.overlays.set(locale, byId)
      for (const { overlay, file } of overlays) {
        for (const [localId, texts] of Object.entries(overlay)) {
          const id = `${pack.manifest.id}/${localId}`
          const def = registry.definitions.get(id)
          if (!def) {
            diagnostics.push({
              severity: 'warning',
              message: `Translation for unknown definition "${localId}"`,
              pack: pack.manifest.id,
              file,
            })
            continue
          }
          const known = new Set(entryKeys(def))
          for (const key of [
            ...Object.keys(texts.entries ?? {}),
            ...Object.keys(texts.cards ?? {}),
          ])
            if (!known.has(key))
              diagnostics.push({
                severity: 'warning',
                message: `Translation for unknown entry "${key}" of "${localId}"`,
                pack: pack.manifest.id,
                file,
              })
          if (Object.keys(texts.entries ?? {}).length && entryKeysWithoutId(def) > 0)
            diagnostics.push({
              severity: 'warning',
              message: `"${localId}" has entries without an id; they can't be translated`,
              pack: pack.manifest.id,
              file,
            })
          byId.set(id, { ...byId.get(id), ...texts })
        }
      }
    }
  }
}

function entryKeys(def: Compiled): string[] {
  if (def.kind === 'table') return def.entries.filter((e) => e.explicitId).map((e) => e.key)
  if (def.kind === 'oracle')
    return Object.values(def.variants).flatMap((v) =>
      v.entries.filter((e) => e.explicitId).map((e) => e.key),
    )
  if (def.kind === 'deck') return def.cards.map((c) => c.key)
  return []
}

function entryKeysWithoutId(def: Compiled): number {
  if (def.kind === 'table') return def.entries.filter((e) => !e.explicitId).length
  if (def.kind === 'oracle')
    return Object.values(def.variants)
      .flatMap((v) => v.entries)
      .filter((e) => !e.explicitId).length
  return 0
}
