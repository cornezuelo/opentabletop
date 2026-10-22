import {
  isClock,
  isPartRef,
  refId,
  STEP_KINDS,
  type ActionStep,
} from '@open-tabletop/travel-engine'
import { flowText } from '@open-tabletop/pack-ui/flow'
import { t } from './i18n'

/** What a step can do: one of the engine's step kinds. */
export type StepKind = (typeof STEP_KINDS)[number]

/** Keys of a step that go with what it does, not a kind of their own. */
const COMPANIONS = ['with', 'limit']

/** What a step does (its one kind), if it does one thing the engine knows. */
export function stepKind(step: ActionStep): StepKind | undefined {
  const kinds = STEP_KINDS.filter((k) => (step as Record<string, unknown>)[k] !== undefined)
  return kinds.length === 1 ? kinds[0] : undefined
}

/**
 * The same step doing something else: its condition and `id` kept, what it did before (and
 * a `do:`'s `with:`, a `wait:`'s `limit:`) dropped, the new kind with a value that works.
 */
export function withKind(step: ActionStep, kind: StepKind, value: unknown): ActionStep {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(step))
    if (!(STEP_KINDS as readonly string[]).includes(k) && !COMPANIONS.includes(k)) out[k] = v
  out[kind] = value
  if (kind === 'wait') out.limit = 60
  return out as ActionStep
}

/** Minutes as players read them: 180 → "3 h", 90 → "1 h 30 min", 45 → "45 min". */
export function minutesText(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h && m ? `${h} h ${m} min` : h ? `${h} h` : `${m} min`
}

/** How the summary names the system's things: by their names, else as written. */
export interface StepNames {
  action: (id: string) => string
  check: (event: string) => string
  /** What else a step rolls (`table.ruins`), by its definition's name. */
  rolled: (ref: string) => string
  mode: (id: string) => string
  param: (id: string) => string
  part: (ref: string) => string
  /** A condition in words (the rows' reading, else its YAML). */
  condition: (condition: unknown) => string
}

/** A map without braces: `party.stats.fatigue: 1, party.resources.food: -1`. */
const bare = (value: unknown) => flowText(value).replace(/^\{\s*|\s*\}$/g, '')

/** A time or limit (`180`, `'14:00'`, `time.part.morning`) in words. */
function timeText(value: unknown, names: StepNames): { until: boolean; text: string } {
  if (typeof value === 'number') return { until: false, text: minutesText(value) }
  if (isClock(value)) return { until: true, text: value }
  if (isPartRef(value))
    return { until: true, text: t('steps.partBegins', { part: names.part(value) }) }
  return { until: false, text: String(value) }
}

/**
 * A step in one line of words, as its folded card's title: "Pass 3 h", "Take March (until:
 * hex)", "Wait until today.ferry is true (at most 18:00)". Its condition is said apart.
 */
export function stepSummary(step: ActionStep, names: StepNames): string {
  const s = step as Record<string, unknown>
  const kind = stepKind(step)
  const v = kind && s[kind]
  switch (kind) {
    case 'time': {
      const time = timeText(v, names)
      return t(time.until ? 'steps.say.timeUntil' : 'steps.say.time', { time: time.text })
    }
    case 'travel.move':
      return v === 'destination'
        ? t('steps.say.moveDestination')
        : v === 'hex'
          ? t('steps.say.moveHex')
          : typeof v === 'number'
            ? t('steps.say.moveHexes', { count: v })
            : t('steps.say.move', { value: String(v) })
    case 'travel.speed':
      return t('steps.say.speed', { value: String(v) })
    case 'travel.advance':
      return t('steps.say.advance', { value: String(v) })
    case 'travel.mode':
      return t('steps.say.mode', {
        mode: refId('modes', v) ? names.mode(refId('modes', v)!) : String(v),
      })
    case 'effects':
      return t('steps.say.effects', { changes: bare(v) || '—' })
    case 'set':
      return t('steps.say.set', { values: bare(v) || '—' })
    case 'do': {
      const action = refId('actions', v) ? names.action(refId('actions', v)!) : String(v)
      return s.with
        ? t('steps.say.doWith', { action, with: bare(s.with) })
        : t('steps.say.do', { action })
    }
    case 'roll':
      return t('steps.say.roll', {
        check: refId('checks', v) ? names.check(refId('checks', v)!) : names.rolled(String(v)),
      })
    case 'say':
      return t('steps.say.say', { text: String(v) })
    case 'pause':
      return v === true ? t('steps.say.pause') : t('steps.say.pauseText', { text: String(v) })
    case 'ask':
      return t('steps.say.ask', {
        param: refId('params', v) ? names.param(refId('params', v)!) : String(v),
      })
    case 'wait':
      return t('steps.say.wait', {
        condition: names.condition(v),
        limit: timeText(s.limit, names).text,
      })
    default:
      return t('steps.say.unknown', { step: bare(step) })
  }
}

/** What a step's card offers: the system's things it may name, with their names. */
export interface StepContext {
  /** The actions a `do:` step can take (not this one), each with its parameters' choices. */
  actions: { id: string; name: string; params: { id: string; name: string; choices: string[] }[] }[]
  /** This action's parameters: what `ask:` asks and `'{{params.<id>}}'` reads. */
  params: { id: string; name: string }[]
  modes: { id: string; name: string }[]
  checks: { event: string; name: string }[]
  /** What the Oracle rolls in the system's packs (`table.ruins`, `core/table.twists`). */
  rollables: { ref: string; name: string }[]
  /** The values of the day the system declares. */
  values: string[]
  /** What effects can change. */
  effectKeys: string[]
  /** Times and limits to suggest: minutes, clocks, parts of the day. */
  times: string[]
  /** What conditions can read here, with their values. */
  conditions: Record<string, readonly string[]>
  names: StepNames
}

/** A value for a step of a new kind that works with what the system has. */
export function kindValue(kind: StepKind, ctx: StepContext): unknown {
  switch (kind) {
    case 'time':
      return 60
    case 'travel.move':
      return 'destination'
    case 'travel.speed':
      return 0.5
    case 'travel.advance':
      return 1
    case 'travel.mode':
      return ctx.modes[0] ? `modes.${ctx.modes[0].id}` : ''
    case 'effects':
      return ctx.effectKeys[0] ? { [ctx.effectKeys[0]]: 1 } : {}
    case 'set':
      return ctx.values[0] ? { [ctx.values[0]]: true } : {}
    case 'do':
      return ctx.actions[0] ? `actions.${ctx.actions[0].id}` : ''
    case 'roll':
      return ctx.checks[0] ? `checks.${ctx.checks[0].event}` : ''
    case 'say':
      return '…'
    case 'pause':
      return true
    case 'ask':
      return ctx.params[0] ? `params.${ctx.params[0].id}` : ''
    case 'wait':
      return {}
  }
}
