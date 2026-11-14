import type {
  Compiled,
  CompiledEntry,
  LocalizedText,
  Registry,
  RollMode,
} from '@open-tabletop/oracle-engine'

/**
 * Pack texts in the UI language when the pack has a translation overlay for it,
 * otherwise in the pack's base locale.
 */
export function packTexts(registry: () => Registry, locale: () => string) {
  const overlay = (id: string) => registry().overlays.get(locale())?.get(id)
  /** One language of a text written in one or several (the pack's own words). */
  const local = (text: LocalizedText | undefined): string | undefined =>
    text === undefined || typeof text === 'string'
      ? text
      : (text[locale()] ?? text.en ?? Object.values(text)[0])
  const displayName = (def: Compiled | undefined, fallback = ''): string =>
    def ? (overlay(def.id)?.name ?? def.name ?? def.localId) : fallback
  return {
    displayName,
    /** A roll mode's name in the UI language, or its id. */
    modeName: (mode: RollMode): string => local(mode.name) ?? mode.localId,
    /** What a roll mode does: its description, if the pack gives one. */
    modeDescription: (mode: RollMode): string | undefined => local(mode.description),
    displayDescription: (def: Compiled): string | undefined =>
      overlay(def.id)?.description ?? def.description,
    entryText: (def: Compiled, entry: CompiledEntry): string | undefined =>
      overlay(def.id)?.entries?.[entry.key] ?? entry.result,
    /** An oracle input's label ("Odds"), translated when the pack has it. */
    inputLabel: (def: Compiled, input: string): string =>
      overlay(def.id)?.inputs?.[input]?.label ??
      (def.kind === 'oracle' ? def.inputs[input]?.label : undefined) ??
      input,
    /** An oracle option's label ("Very unlikely"), translated when the pack has it. */
    optionLabel: (def: Compiled, input: string, option: string): string =>
      overlay(def.id)?.inputs?.[input]?.labels?.[option] ??
      (def.kind === 'oracle' ? def.inputs[input]?.labels?.[option] : undefined) ??
      option,
    /**
     * A table's rows as a roll falls on them (their ranges, their texts in the UI language),
     * for showing what a roll can give; undefined for anything that isn't a table.
     */
    rowsOf: (
      id: string,
    ): { key: string; min?: number; max?: number; when?: unknown; text?: string }[] | undefined => {
      const def = registry().definitions.get(id)
      if (def?.kind !== 'table') return undefined
      return def.entries.map((e) => ({
        key: e.key,
        ...(e.min !== undefined && { min: e.min }),
        ...(e.max !== undefined && { max: e.max }),
        ...(e.when !== undefined && { when: e.when }),
        text: overlay(def.id)?.entries?.[e.key] ?? e.result,
      }))
    },
    /** Display name of a definition or a roll mode by id (the id itself if neither exists). */
    nameOf: (id: string): string => {
      const mode = registry().rollModes.get(id)
      return mode
        ? (local(mode.name) ?? mode.localId)
        : displayName(registry().definitions.get(id), id)
    },
  }
}

export type PackTexts = ReturnType<typeof packTexts>

export const KIND_ORDER: Compiled['kind'][] = ['table', 'oracle', 'generator', 'deck']
