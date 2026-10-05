import type { GridSettings, HexMap, MapMeta, PrintSettings } from '../model/types'
import type { Command, MapChange } from './command'

export interface SettingsPatch {
  grid?: Partial<GridSettings>
  print?: Partial<PrintSettings>
}

/**
 * Changes grid and/or print settings in one undoable step (paper changes resize the
 * grid). Hex data outside the new bounds is kept, so undoing a shrink loses nothing.
 */
export class SetSettingsCommand implements Command {
  private before: Required<SettingsPatch> = { grid: {}, print: {} }

  constructor(private patch: SettingsPatch) {}

  apply(map: HexMap): MapChange {
    this.before = {
      grid: pick(map.grid, this.patch.grid),
      print: pick(map.print, this.patch.print),
    }
    Object.assign(map.grid, this.patch.grid)
    Object.assign(map.print, structuredClone(this.patch.print))
    return { kind: 'grid' }
  }

  revert(map: HexMap): MapChange {
    Object.assign(map.grid, this.before.grid)
    Object.assign(map.print, this.before.print)
    return { kind: 'grid' }
  }
}

/** Copies from `source` the current values of the keys present in `patch`. */
function pick<T extends object>(source: T, patch: Partial<T> | undefined): Partial<T> {
  const out: Partial<T> = {}
  for (const key of Object.keys(patch ?? {}) as (keyof T)[]) out[key] = structuredClone(source[key])
  return out
}

export class SetMetaCommand implements Command {
  private before: Partial<MapMeta> = {}

  constructor(private patch: Partial<Pick<MapMeta, 'name'>>) {}

  apply(map: HexMap): MapChange {
    this.before = { name: map.meta.name }
    Object.assign(map.meta, this.patch)
    return { kind: 'meta' }
  }

  revert(map: HexMap): MapChange {
    Object.assign(map.meta, this.before)
    return { kind: 'meta' }
  }
}
