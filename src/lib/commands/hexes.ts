import type { HexData, HexKey, HexMap } from '../model/types'
import type { Command, MapChange } from './command'

interface HexEdit {
  key: HexKey
  before: HexData | undefined
  after: HexData | undefined
}

function isEmpty(hex: HexData): boolean {
  return Object.values(hex).every((v) => v === undefined)
}

function write(map: HexMap, key: HexKey, hex: HexData | undefined): void {
  if (hex === undefined || isEmpty(hex)) delete map.hexes[key]
  else map.hexes[key] = hex
}

/**
 * Collects hex edits and applies them immediately, so a brush stroke shows up live.
 * `finish()` returns a single command for the whole stroke (or null if nothing changed).
 */
export class HexEditBatch {
  private edits = new Map<HexKey, HexEdit>()

  constructor(private map: HexMap) {}

  /** Applies `update` to a hex. Returns true if the hex actually changed. */
  edit(key: HexKey, update: (hex: HexData) => HexData): boolean {
    const current = this.map.hexes[key]
    const next = update({ ...current })
    if (sameHex(current, next)) return false
    const existing = this.edits.get(key)
    this.edits.set(key, { key, before: existing ? existing.before : current, after: next })
    write(this.map, key, next)
    return true
  }

  finish(): Command | null {
    const edits = [...this.edits.values()].filter((e) => !sameHex(e.before, e.after))
    return edits.length > 0 ? new EditHexesCommand(edits) : null
  }
}

export class EditHexesCommand implements Command {
  constructor(private edits: HexEdit[]) {}

  apply(map: HexMap): MapChange {
    for (const e of this.edits) write(map, e.key, e.after)
    return { kind: 'hexes', keys: this.edits.map((e) => e.key) }
  }

  revert(map: HexMap): MapChange {
    for (const e of this.edits) write(map, e.key, e.before)
    return { kind: 'hexes', keys: this.edits.map((e) => e.key) }
  }
}

function sameHex(a: HexData | undefined, b: HexData | undefined): boolean {
  const ea = a === undefined || isEmpty(a)
  const eb = b === undefined || isEmpty(b)
  if (ea || eb) return ea === eb
  return a!.terrain === b!.terrain
}
