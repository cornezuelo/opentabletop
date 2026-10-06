import type { GridSettings, HexMap, MapMeta, PrintSettings } from '../model/types'
import type { Command, MapChange } from './command'

export interface SettingsPatch {
  grid?: Partial<GridSettings>
  print?: Partial<PrintSettings>
  scale?: Partial<HexMap['scale']>
}

/**
 * Changes grid and/or print settings in one undoable step (paper changes resize the
 * grid). Hex data outside the new bounds is kept, so undoing a shrink loses nothing.
 */
export class SetSettingsCommand implements Command {
  private before: Required<SettingsPatch> = { grid: {}, print: {}, scale: {} }

  constructor(private patch: SettingsPatch) {}

  apply(map: HexMap): MapChange {
    this.before = {
      grid: pick(map.grid, this.patch.grid),
      print: pick(map.print, this.patch.print),
      scale: pick(map.scale, this.patch.scale),
    }
    Object.assign(map.grid, this.patch.grid)
    Object.assign(map.print, structuredClone(this.patch.print))
    Object.assign(map.scale, this.patch.scale)
    return { kind: 'grid' }
  }

  revert(map: HexMap): MapChange {
    Object.assign(map.grid, this.before.grid)
    Object.assign(map.print, this.before.print)
    Object.assign(map.scale, this.before.scale)
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

/** Terrain glyph opacity (0 hides them). Restyles without rebuilding the grid. */
export class SetGlyphOpacityCommand implements Command {
  constructor(
    private before: number,
    private after: number,
  ) {}

  apply(map: HexMap): MapChange {
    map.grid.glyphs = this.after
    return { kind: 'style' }
  }

  revert(map: HexMap): MapChange {
    map.grid.glyphs = this.before
    return { kind: 'style' }
  }
}

/** Styles of the map's texts (hex, region and token names). Restyles without a rebuild. */
export class SetCaptionsCommand implements Command {
  constructor(
    private before: HexMap['captions'],
    private after: HexMap['captions'],
  ) {}

  apply(map: HexMap): MapChange {
    map.captions = structuredClone(this.after)
    return { kind: 'style' }
  }

  revert(map: HexMap): MapChange {
    map.captions = structuredClone(this.before)
    return { kind: 'style' }
  }
}
