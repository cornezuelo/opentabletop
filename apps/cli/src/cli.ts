import {
  createOracleEngine,
  resolveRef,
  formatDiagnostic,
  loadPacks,
  type Compiled,
  type OracleState,
  type PackFile,
  type Resolution,
} from '@open-tabletop/oracle-engine'
import { mathRandom, seeded } from '@open-tabletop/random'
import { travelSystems } from '@open-tabletop/session'

/** What the command line touches, so it can be tested without a disk or a terminal. */
export interface Io {
  /** Every pack file under a folder (paths relative to it), or null if there is none. */
  readFolder(path: string): PackFile[] | null
  out(text: string): void
  err(text: string): void
}

export const USAGE = `opentabletop — OpenTabletop packs from the command line

Usage:
  opentabletop validate [--packs <dir>]…           Check packs: errors and warnings
  opentabletop list [--kind <kind>] [--pack <id>]  Tables, oracles, generators and decks
  opentabletop roll <id> [key=value]… [options]    Roll one (a deck draws a card)

Options:
  --packs <dir>     A folder of packs (repeatable; default: packs/ and packs-private/)
  --seed <text>     Roll with a seed: the same seed gives the same results
  --times <n>       Roll n times
  --mode <id>       Roll with one of the roll modes the table offers (e.g. advantage)
  --locale <code>   Texts in this language when the pack has it (en, es…)
  --json            Print the whole result as JSON
  --help            This help

Context values: key=value pairs a table reads (terrain=forest danger=3 party.stats.morale=2);
numbers and true/false are read as such.
`

interface Parsed {
  command?: string
  positional: string[]
  packs: string[]
  options: Record<string, string | true>
}

function parseArgs(args: readonly string[]): Parsed {
  const parsed: Parsed = { positional: [], packs: [], options: {} }
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg.startsWith('--')) {
      const name = arg.slice(2)
      const flag = name === 'json' || name === 'help'
      const value = flag ? true : (args[++i] ?? '')
      if (name === 'packs') parsed.packs.push(String(value))
      else parsed.options[name] = value
    } else if (!parsed.command) parsed.command = arg
    else parsed.positional.push(arg)
  }
  return parsed
}

/** `a.b=3` pairs into a context: numbers and booleans read as such, dotted names nest. */
export function contextOf(pairs: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const pair of pairs) {
    const cut = pair.indexOf('=')
    if (cut <= 0) continue
    const raw = pair.slice(cut + 1)
    const value = /^-?\d+(\.\d+)?$/.test(raw)
      ? Number(raw)
      : raw === 'true' || raw === 'false'
        ? raw === 'true'
        : raw
    const path = pair.slice(0, cut).split('.')
    let node = out
    for (const part of path.slice(0, -1)) {
      if (typeof node[part] !== 'object' || node[part] === null) node[part] = {}
      node = node[part] as Record<string, unknown>
    }
    node[path.at(-1)!] = value
  }
  return out
}

/** Runs a command; returns the exit code (0 fine, 1 problems, 2 bad usage). */
export function run(args: readonly string[], io: Io): number {
  const { command, positional, packs, options } = parseArgs(args)
  if (!command || options.help || command === 'help') {
    io.out(USAGE)
    return command || options.help ? 0 : 2
  }
  const folders = packs.length ? packs : ['packs', 'packs-private']
  const files: PackFile[] = []
  for (const folder of folders) {
    const found = io.readFolder(folder)
    if (found) files.push(...found)
    else if (packs.length) {
      io.err(`No such folder: ${folder}`)
      return 2
    }
  }
  const { registry, diagnostics } = loadPacks(files)

  if (command === 'validate') {
    const problems = [...diagnostics, ...travelSystems(registry).problems]
    for (const d of problems) io.out(formatDiagnostic(d))
    const errors = problems.filter((d) => d.severity === 'error').length
    io.out(
      `${registry.packs.size} packs, ${registry.definitions.size} definitions: ` +
        `${errors} errors, ${problems.length - errors} warnings`,
    )
    return errors ? 1 : 0
  }

  if (command === 'list') {
    const kind = typeof options.kind === 'string' ? options.kind : undefined
    const pack = typeof options.pack === 'string' ? options.pack : undefined
    const engine = createOracleEngine({ registry, random: mathRandom() })
    const defs = engine
      .list({ kind: kind as Compiled['kind'] | undefined, pack })
      .sort((a, b) => a.id.localeCompare(b.id))
    for (const def of defs) io.out(`${def.id}\t${def.kind}\t${def.name ?? ''}`)
    return 0
  }

  if (command === 'roll') {
    const [id, ...pairs] = positional
    if (!id) {
      io.err('roll: which one? e.g. opentabletop roll core/action')
      return 2
    }
    const seed = typeof options.seed === 'string' ? options.seed : undefined
    const engine = createOracleEngine({
      registry,
      random: seed !== undefined ? seeded(seed) : mathRandom(),
    })
    const def = engine.get(id) ?? engine.list().find((d) => d.localId === id)
    if (!def) {
      io.err(`roll: no table, oracle, generator or deck "${id}" (see: opentabletop list)`)
      return 1
    }
    const locale = typeof options.locale === 'string' ? options.locale : undefined
    const times = Math.max(1, Number(options.times) || 1)
    const context = contextOf(pairs)
    // A roll mode found like any reference from the table's pack (its own, then its dependencies').
    const modeRef = typeof options.mode === 'string' ? options.mode : undefined
    const mode = modeRef
      ? (resolveRef(registry, def.pack, modeRef, (x) => registry.rollModes.has(x)) ?? modeRef)
      : undefined
    if (mode && !((def.kind === 'table' || def.kind === 'oracle') && def.modes.includes(mode))) {
      io.err(`roll: "${def.id}" doesn't offer the roll mode "${modeRef}"`)
      return 1
    }
    let state: OracleState | undefined
    for (let i = 0; i < times; i++) {
      try {
        const outcome =
          def.kind === 'deck'
            ? engine.draw(def.id, state, context, { locale })
            : engine.resolve(def.id, context, state, { locale, mode })
        state = outcome.state
        io.out(options.json ? JSON.stringify(outcome.resolution) : describe(outcome.resolution))
      } catch (error) {
        io.err(`roll: ${(error as Error).message}`)
        return 1
      }
    }
    return 0
  }

  io.err(`Unknown command "${command}".\n\n${USAGE}`)
  return 2
}

/** A result as one line: its text, or its values when it has none, with the dice. */
function describe(resolution: Resolution): string {
  const dice = flatten(resolution)
    .flatMap((r) =>
      r.rolls.map((roll) => {
        // Rolled with a roll mode: which one, and the totals not kept.
        const others = roll.discarded?.map((d) => d.total).join(', ')
        const mode = r.mode ? ` (${r.mode}${others ? `; not kept: ${others}` : ''})` : ''
        return `${roll.expression} = ${roll.total}${mode}`
      }),
    )
    .join(', ')
  const text =
    resolution.text ??
    (Object.keys(resolution.value).length ? JSON.stringify(resolution.value) : '—')
  return dice ? `${text}  [${dice}]` : text
}

function flatten(resolution: Resolution): Resolution[] {
  return [resolution, ...resolution.children.flatMap(flatten)]
}
