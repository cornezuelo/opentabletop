import { distribution } from '@open-tabletop/dice'
import { createOracleEngine, type Registry } from '@open-tabletop/oracle-engine'
import { seeded } from '@open-tabletop/random'

/** How often each entry comes up, and how often none does. */
export interface Odds {
  /** Entry key → share of the rolls (0–1). */
  entries: Map<string, number>
  /** Share of the rolls where no entry applied. */
  nothing: number
  runs: number
}

/**
 * How likely each entry of a table (or of an oracle's variant) is with this context and
 * roll mode: the definition is rolled `runs` times by the engine itself, so conditions,
 * ranges, clamping, weights and modes count exactly as in play (limits like `once` don't:
 * each roll starts afresh). An estimate, within a percent or so.
 */
export function entryOdds(
  registry: Registry,
  id: string,
  context: Record<string, unknown>,
  mode?: string,
  runs = 4000,
): Odds {
  const engine = createOracleEngine({ registry, random: seeded(`odds:${id}`), now: () => '' })
  const counts = new Map<string, number>()
  let nothing = 0
  for (let i = 0; i < runs; i++) {
    const { entry } = engine.resolve(id, context, undefined, mode ? { mode } : {}).resolution
    if (entry === undefined) nothing++
    else counts.set(entry, (counts.get(entry) ?? 0) + 1)
  }
  return {
    entries: new Map([...counts].map(([k, n]) => [k, n / runs])),
    nothing: nothing / runs,
    runs,
  }
}

/**
 * The exact chances of each total of a roll (`'1d6 + {{survival}}'`), its variables read
 * from the context (missing ones count as 0, as when rolling), with a roll mode's repeat
 * and keep. Null when it can't be counted.
 */
export function rollOdds(
  roll: string,
  context: Record<string, unknown>,
  mode?: { repeat: number; keep: 'highest' | 'lowest' | 'middle' },
): Map<number, number> | null {
  const read = (path: string): unknown =>
    path
      .split('.')
      .reduce<unknown>(
        (v, k) => (v && typeof v === 'object' ? (v as Record<string, unknown>)[k] : undefined),
        context,
      )
  const expression = roll.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path: string) => {
    const v = read(path)
    const n =
      typeof v === 'number' ? v : typeof v === 'string' && /^-?\d+$/.test(v.trim()) ? Number(v) : 0
    return n < 0 ? `0 - ${-n}` : String(n)
  })
  try {
    return distribution(expression, mode ?? {})
  } catch {
    return null
  }
}
