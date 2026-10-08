import { parseAllDocuments } from 'yaml'
import type { z } from 'zod'
import {
  definitionSchema,
  manifestSchema,
  overlaySchema,
  PACK_FORMAT,
  type Definition,
  type Manifest,
  type Overlay,
} from '../definitions/schema'

/** A file handed over by an adapter (browser, Node, CLI). The engine never touches disks. */
export interface PackFile {
  /** Path relative to some packs root, e.g. "kal-arath/tables/encounters.yaml". */
  path: string
  content: string
}

export interface Diagnostic {
  severity: 'error' | 'warning'
  message: string
  pack?: string
  file?: string
  /** Location inside the file, e.g. "encounters.entries[3].range". */
  at?: string
  /** Line in the file (1-based) when known directly, e.g. YAML syntax errors. */
  line?: number
}

export interface LoadedPack {
  manifest: Manifest
  /** Folder that contains pack.yaml. */
  root: string
  definitions: { definition: Definition; file: string; index: number }[]
  /** Translation overlays by locale. */
  overlays: Record<string, { overlay: Overlay; file: string }[]>
  /**
   * Translations of definitions that aren't tables, by locale: keyed `<kind>/<id>` in the
   * overlay file (`travel-rules/default:`), folded into those definitions when compiling.
   */
  systemTexts: Record<string, { key: string; texts: unknown; file: string }[]>
  /** Definitions for other engines (e.g. kind: travel-rules, bindings), passed through untouched. */
  extras: { kind: string; id?: string; data: Record<string, unknown>; file: string }[]
  /**
   * OTD bundles (`*.otd.json`, e.g. a system's example maps) inside the pack, by path
   * relative to its folder: not definitions, so they're only listed, never parsed here.
   */
  bundles: string[]
}

/** Kinds this engine owns; anything else is kept as an extra for other engines. */
const ORACLE_KINDS = new Set(['table', 'oracle', 'generator', 'deck'])

export interface LoadResult {
  packs: LoadedPack[]
  diagnostics: Diagnostic[]
}

const MANIFEST = /(^|\/)pack\.(ya?ml|json)$/
const DATA_FILE = /\.(ya?ml|json)$/
/** OTD bundles (maps and the like) a pack may carry besides its definitions. */
export const BUNDLE_FILE = /\.otd\.json$/

/** Groups files into packs and parses + structurally validates every document. */
export function loadPackFiles(files: PackFile[]): LoadResult {
  const diagnostics: Diagnostic[] = []
  const roots = files
    .filter((f) => MANIFEST.test(f.path))
    .map((f) => ({ file: f, root: f.path.replace(MANIFEST, '').replace(/\/$/, '') }))
    // Deepest roots first, so nested packs win over their parents.
    .sort((a, b) => b.root.length - a.root.length)

  const packs: LoadedPack[] = []
  const byRoot = new Map<string, LoadedPack>()
  for (const { file, root } of roots) {
    const [doc] = parseDocuments(file, diagnostics)
    const parsed = manifestSchema.safeParse(doc)
    if (!parsed.success) {
      report(diagnostics, parsed.error, { file: file.path, at: 'pack' })
      continue
    }
    if ((parsed.data.format ?? 1) > PACK_FORMAT)
      diagnostics.push({
        severity: 'warning',
        message: `Written for pack format ${parsed.data.format}, newer than this version reads (${PACK_FORMAT}): update OpenTabletop`,
        file: file.path,
      })
    if (packs.some((p) => p.manifest.id === parsed.data.id)) {
      diagnostics.push({
        severity: 'error',
        message: `Duplicate pack id "${parsed.data.id}"`,
        file: file.path,
      })
      continue
    }
    const pack: LoadedPack = {
      manifest: parsed.data,
      root,
      definitions: [],
      overlays: {},
      systemTexts: {},
      extras: [],
      bundles: [],
    }
    packs.push(pack)
    byRoot.set(root, pack)
  }

  for (const file of files) {
    if (MANIFEST.test(file.path) || !DATA_FILE.test(file.path)) continue
    const root = roots.find(({ root }) => root === '' || file.path.startsWith(`${root}/`))?.root
    const pack = root === undefined ? undefined : byRoot.get(root)
    if (!pack) {
      if (root === undefined)
        diagnostics.push({
          severity: 'warning',
          message: 'File is not inside any pack (no pack.yaml)',
          file: file.path,
        })
      continue
    }
    const relative = root ? file.path.slice(root.length + 1) : file.path
    if (BUNDLE_FILE.test(relative)) {
      pack.bundles.push(relative)
      continue
    }
    const locale = /^locales\/([^/]+)\//.exec(relative)?.[1]
    const docs = parseDocuments(file, diagnostics, pack.manifest.id)
    if (locale) {
      for (const whole of docs) {
        // `<kind>/<id>` keys translate definitions that aren't tables; the rest are tables'.
        const doc = isRecord(whole) ? { ...whole } : whole
        if (isRecord(doc))
          for (const key of Object.keys(doc).filter((k) => k.includes('/'))) {
            ;(pack.systemTexts[locale] ??= []).push({ key, texts: doc[key], file: file.path })
            delete doc[key]
          }
        const parsed = overlaySchema.safeParse(doc)
        if (parsed.success)
          (pack.overlays[locale] ??= []).push({ overlay: parsed.data, file: file.path })
        else report(diagnostics, parsed.error, { pack: pack.manifest.id, file: file.path })
      }
      continue
    }
    docs
      .flatMap((doc) => (Array.isArray(doc) ? doc : [doc]))
      .forEach((doc, index) => {
        if (isRecord(doc) && typeof doc.kind === 'string' && !ORACLE_KINDS.has(doc.kind)) {
          const id = typeof doc.id === 'string' ? doc.id : undefined
          pack.extras.push({ kind: doc.kind, id, data: doc, file: file.path })
          return
        }
        const parsed = definitionSchema.safeParse(doc)
        if (parsed.success)
          pack.definitions.push({ definition: parsed.data, file: file.path, index })
        else {
          const label = isRecord(doc) && typeof doc.id === 'string' ? doc.id : `#${index}`
          report(diagnostics, parsed.error, { pack: pack.manifest.id, file: file.path, at: label })
        }
      })
  }
  return { packs, diagnostics }
}

function parseDocuments(file: PackFile, diagnostics: Diagnostic[], pack?: string): unknown[] {
  if (file.path.endsWith('.json')) {
    try {
      return [JSON.parse(file.content)]
    } catch (error) {
      diagnostics.push({
        severity: 'error',
        message: `Invalid JSON: ${(error as Error).message}`,
        pack,
        file: file.path,
      })
      return []
    }
  }
  const docs = parseAllDocuments(file.content)
  const list = Array.isArray(docs) ? docs : [docs]
  const out: unknown[] = []
  // Errors found at the end (an unclosed quote or bracket) belong to the last line with text.
  const lastLine = file.content.trimEnd().split('\n').length
  const seen = new Set<string>()
  for (const doc of list) {
    for (const error of doc.errors) {
      const message = `Invalid YAML: ${error.message.split('\n')[0].replace(/ at line \d+, column \d+:?$/, '')}`
      const line = error.linePos && Math.min(error.linePos[0].line, lastLine)
      // The parser may say the same thing twice about one spot.
      if (seen.has(`${line}:${message}`)) continue
      seen.add(`${line}:${message}`)
      diagnostics.push({
        severity: 'error',
        // The first line says what's wrong; the position and the code excerpt go to `line`.
        message,
        pack,
        file: file.path,
        ...(line && { line }),
      })
    }
    if (doc.errors.length === 0 && doc.contents !== null) out.push(doc.toJS())
  }
  return out
}

function report(
  diagnostics: Diagnostic[],
  error: z.ZodError,
  where: { pack?: string; file?: string; at?: string },
): void {
  for (const issue of error.issues) {
    const path = issue.path
      .map((p) => (typeof p === 'number' ? `[${p}]` : `.${String(p)}`))
      .join('')
    diagnostics.push({
      severity: 'error',
      message: issue.message,
      pack: where.pack,
      file: where.file,
      at: `${where.at ?? ''}${path}`.replace(/^\./, '') || undefined,
    })
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
