import { compilePacks, type Registry } from './compile/compile'
import { loadPackFiles, type Diagnostic, type PackFile } from './loader/load'

export { compilePacks, resolveRef } from './compile/compile'
export type {
  Compiled,
  CompiledDeck,
  CompiledEntry,
  EntryList,
  Ref,
  CompiledGenerator,
  CompiledOracle,
  CompiledTable,
  LocalizedText,
  Registry,
  RollMode,
  WithRollModes,
} from './compile/compile'
export * from './definitions/schema'
export { loadPackFiles } from './loader/load'
export type { Diagnostic, LoadedPack, LoadResult, PackFile } from './loader/load'
export {
  createOracleEngine,
  emptyState,
  mergeEffects,
  OracleError,
  type EngineOptions,
  type HistoryRecord,
  type OracleEngine,
  type OracleEvent,
  type OracleState,
  type Resolution,
  type ResolveOptions,
  type ResolveOutcome,
} from './resolve/engine'

export interface PackLoadResult {
  registry: Registry
  diagnostics: Diagnostic[]
  /** True when there are no errors (warnings are fine). */
  ok: boolean
}

/** Parses, validates and compiles pack files in one go. */
export function loadPacks(files: PackFile[]): PackLoadResult {
  const { packs, diagnostics } = loadPackFiles(files)
  const registry = compilePacks(packs, diagnostics)
  return { registry, diagnostics, ok: !diagnostics.some((d) => d.severity === 'error') }
}

/** Validates packs without keeping the compiled registry (editors, CLI `validate`). */
export function validatePacks(files: PackFile[]): Diagnostic[] {
  return loadPacks(files).diagnostics
}

/** "pack/file: at: message" for logs and CLIs. */
export function formatDiagnostic(d: Diagnostic): string {
  const where = [d.file ?? d.pack, d.at].filter(Boolean).join(': ')
  return `${d.severity === 'error' ? 'error' : 'warning'}${where ? ` ${where}` : ''}: ${d.message}`
}
