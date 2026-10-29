import type { Sheet } from '@open-tabletop/character-engine'
import { groupBundled, PackLibrary } from '@open-tabletop/pack-ui'
import { travelSystems, type TravelSystem } from '@open-tabletop/session'
import { showToast } from '@open-tabletop/ui-kit'
import { t } from './i18n'

/**
 * Packs bundled at build time: open ones from packs/ and, locally, personal-use ones
 * from packs-private/ (git-ignored; the glob is simply empty when it's missing).
 */
const open = import.meta.glob('../../../../packs/**/*.{yaml,yml,json}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>
const personal = import.meta.glob('@personal-packs/**/*.{yaml,yml,json}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/** Bundled packs plus the user's (shared with the other apps on the same site). */
export const library = new PackLibrary(
  [...groupBundled(open, 'packs'), ...groupBundled(personal, 'packs-private', true)],
  {
    onStorageFull: () => showToast(t('storage.full'), 'error', 8000),
    extraDiagnostics: (registry) => travelSystems(registry).problems,
  },
)

/** A system that has a sheet for its characters. */
export type CharacterSystem = TravelSystem & { sheet: NonNullable<TravelSystem['sheet']> }

/** The systems that have a sheet for their characters: characters are made with theirs. */
class Systems {
  list: CharacterSystem[] = $derived(
    travelSystems(library.registry).systems.filter((s): s is CharacterSystem => !!s.sheet),
  )

  /**
   * The system a sheet (`pack/id`) belongs to, and the sheet: any of its sheets (its
   * characters', its party's, its factions', its templates'), so a copy of a template on a
   * sheet of its own (a beast's) is found too. Systems whose characters use it come first.
   */
  sheetOf(sheet: string): { system: CharacterSystem; def: Sheet } | undefined {
    const own = this.list.find((s) => s.sheet.id === sheet)
    if (own) return { system: own, def: own.sheet.def }
    for (const system of this.list) {
      const def = sheetsOf(system)[sheet]
      if (def) return { system, def }
    }
    return undefined
  }

  /** The system a sheet (`pack/id`) belongs to. */
  ofSheet(sheet: string) {
    return this.sheetOf(sheet)?.system
  }
}

/** Every sheet of a system, by `pack/id`. */
function sheetsOf(system: TravelSystem): Record<string, Sheet> {
  return {
    ...system.templateSheets,
    ...(system.factions && { [system.factions.sheet.id]: system.factions.sheet.def }),
    ...(system.partySheet && { [system.partySheet.id]: system.partySheet.def }),
    ...(system.sheet && { [system.sheet.id]: system.sheet.def }),
  }
}

export const systems = new Systems()
