import {
  createOracleEngine,
  loadPacks,
  type Diagnostic,
  type OracleEngine,
  type Registry,
} from '@open-tabletop/oracle-engine'
import { mathRandom, type RandomSource } from '@open-tabletop/random'
import {
  bundledChanges,
  effectivePacks,
  engineFiles,
  fingerprints,
  updateCopy,
  type BundledChange,
  manifestOf,
  MANIFEST_FILE,
  readUserPacks,
  USER_PACKS_KEY,
  writeUserPacks,
  type PackSource,
  type WorkspacePack,
} from './packs'

/**
 * The packs an app sees: the ones it bundles plus the user packs stored in this browser
 * (shared by every OpenTabletop app on the same origin), compiled into one registry.
 * Changes made in another tab show up live. Bundled packs are read-only; editing one
 * starts from a user copy that overrides it.
 */
/** Changes to one file closer than this make one undo step. */
const GROUP_MS = 1000
const MAX_UNDO = 100

export class PackLibrary {
  /** Never changes after construction. */
  private bundled: PackSource[] = []
  private onStorageFull?: () => void
  private extraDiagnostics?: (registry: Registry) => Diagnostic[]
  user = $state.raw<PackSource[]>([])
  packs: WorkspacePack[] = $derived(effectivePacks(this.bundled, this.user))
  loaded = $derived(loadPacks(engineFiles(this.packs)))
  /** The Oracle Engine's diagnostics plus other engines' (travel rules, bindings…). */
  problems: Diagnostic[] = $derived([
    ...this.loaded.diagnostics,
    ...(this.extraDiagnostics?.(this.loaded.registry) ?? []),
  ])
  registry = $derived(this.loaded.registry)
  /** Where the engine's rolls come from; `setRandom` swaps it (e.g. a seeded session). */
  private source: RandomSource = mathRandom()
  private readonly random: RandomSource = { next: () => this.source.next() }
  engine: OracleEngine = $derived(
    createOracleEngine({ registry: this.registry, random: this.random }),
  )
  /** Earlier and undone states of the user packs, for undo/redo of edits made here. */
  private past = $state.raw<PackSource[][]>([])
  private future = $state.raw<PackSource[][]>([])
  /** The last change, so quick changes to one file (typing) make one undo step. */
  private last: { key: string; at: number } | null = null
  private batching = false
  canUndo = $derived(this.past.length > 0)
  canRedo = $derived(this.future.length > 0)

  constructor(
    bundled: PackSource[],
    options: {
      onStorageFull?: () => void
      /** Problems other engines find in the packs' definitions for them. */
      extraDiagnostics?: (registry: Registry) => Diagnostic[]
    } = {},
  ) {
    this.bundled = bundled
    this.onStorageFull = options.onStorageFull
    this.extraDiagnostics = options.extraDiagnostics
    this.user = readUserPacks()
    if (typeof window !== 'undefined')
      window.addEventListener('storage', (e) => {
        if (e.key !== USER_PACKS_KEY) return
        this.user = readUserPacks()
        // Another tab changed the packs: earlier states here no longer apply.
        this.past = []
        this.future = []
      })
  }

  /** Rolls from now on come from this source (a seeded one repeats a session). */
  setRandom(source: RandomSource): void {
    this.source = source
  }

  pack(root: string): WorkspacePack | undefined {
    return this.packs.find((p) => p.root === root)
  }

  /** Folder of the pack with that manifest id. */
  rootOf(packId: string): string | undefined {
    return this.packs.find((p) => manifestOf(p).id === packId)?.root
  }

  /** Engine diagnostics of a pack (by folder), optionally of one file. */
  diagnostics(root: string, file?: string): Diagnostic[] {
    const id = manifestOf(this.pack(root) ?? { root, origin: 'user', files: [] }).id
    const prefix = `${root}/`
    return this.problems.filter((d) =>
      file
        ? d.file === `${root}/${file}`
        : d.file?.startsWith(prefix) || (d.pack !== undefined && d.pack === id),
    )
  }

  isEditable(root: string): boolean {
    return this.pack(root)?.origin === 'user'
  }

  /**
   * Replaces the user packs; returns false if they couldn't be saved (storage full).
   * The change can be undone; `group` joins it to the previous change with the same
   * group made less than a second before (e.g. typing in one file).
   */
  setUserPacks(user: PackSource[], group?: string): boolean {
    if (this.batching) return this.store(user)
    const now = Date.now()
    const joined = group !== undefined && this.last?.key === group && now - this.last.at < GROUP_MS
    if (!joined) this.past = [...this.past, this.user].slice(-MAX_UNDO)
    this.future = []
    this.last = { key: group ?? '', at: now }
    return this.store(user)
  }

  /** Runs several changes (e.g. a definition and its translations) as one undo step. */
  batch(changes: () => void): void {
    this.past = [...this.past, this.user].slice(-MAX_UNDO)
    this.future = []
    this.last = null
    this.batching = true
    try {
      changes()
    } finally {
      this.batching = false
    }
  }

  undo(): void {
    const previous = this.past.at(-1)
    if (!previous) return
    this.past = this.past.slice(0, -1)
    this.future = [...this.future, this.user]
    this.last = null
    this.store(previous)
  }

  redo(): void {
    const next = this.future.at(-1)
    if (!next) return
    this.future = this.future.slice(0, -1)
    this.past = [...this.past, this.user]
    this.last = null
    this.store(next)
  }

  private store(user: PackSource[]): boolean {
    this.user = user
    const saved = writeUserPacks(user)
    if (!saved) this.onStorageFull?.()
    return saved
  }

  private update(root: string, change: (pack: PackSource) => PackSource, group?: string): void {
    this.setUserPacks(
      this.user.map((p) => (p.root === root ? change(p) : p)),
      group,
    )
  }

  addPack(pack: PackSource): void {
    this.setUserPacks([
      ...this.user.filter((p) => p.root !== pack.root),
      { ...pack, origin: 'user' },
    ])
  }

  /** Adds several packs (e.g. a system imported with the packs it brings) as one undo step. */
  addPacks(packs: PackSource[]): void {
    this.setUserPacks([
      ...this.user.filter((p) => !packs.some((q) => q.root === p.root)),
      ...packs.map((p) => ({ ...p, origin: 'user' as const })),
    ])
  }

  /** Copies a bundled pack into the user's packs, overriding it. */
  editCopy(root: string): void {
    const pack = this.pack(root)
    if (!pack || pack.origin === 'user') return
    this.addPack({
      ...pack,
      origin: 'user',
      files: pack.files.map((f) => ({ ...f })),
      basedOn: fingerprints(pack),
    })
  }

  /** The bundled pack in a folder, even when a user copy overrides it. */
  bundledPack(root: string): PackSource | undefined {
    return this.bundled.find((p) => p.root === root)
  }

  /** What the bundled pack changed since the user copy of it was made ([] if not a copy). */
  bundledChanges(root: string): BundledChange[] {
    const bundled = this.bundledPack(root)
    const copy = this.user.find((p) => p.root === root)
    return bundled && copy ? bundledChanges(bundled, copy) : []
  }

  /**
   * Brings files of a user copy up to date: `take` gets the bundled version, `keep`
   * stays as it is (both stop being reported). Undoable.
   */
  updateFromBundled(root: string, change: { take?: string[]; keep?: string[] }): void {
    const bundled = this.bundledPack(root)
    if (!bundled) return
    this.update(root, (copy) => updateCopy(bundled, copy, change))
  }

  /** Deletes a user pack (for an edited bundled pack, this reverts to the bundled one). */
  removePack(root: string): void {
    this.setUserPacks(this.user.filter((p) => p.root !== root))
  }

  readFile(root: string, path: string): string | undefined {
    return this.pack(root)?.files.find((f) => f.path === path)?.content
  }

  /** `typing`: quick writes to the same file (a text editor) make one undo step. */
  writeFile(root: string, path: string, content: string, typing = false): void {
    this.update(
      root,
      (p) => ({
        ...p,
        files: p.files.some((f) => f.path === path)
          ? p.files.map((f) => (f.path === path ? { path, content } : f))
          : [...p.files, { path, content }].sort((a, b) => a.path.localeCompare(b.path)),
      }),
      typing ? `${root}/${path}` : undefined,
    )
  }

  renameFile(root: string, from: string, to: string): void {
    if (from === MANIFEST_FILE || to === MANIFEST_FILE || this.readFile(root, to) !== undefined)
      return
    this.update(root, (p) => ({
      ...p,
      files: p.files.map((f) => (f.path === from ? { ...f, path: to } : f)),
    }))
  }

  deleteFile(root: string, path: string): void {
    if (path === MANIFEST_FILE) return
    this.update(root, (p) => ({ ...p, files: p.files.filter((f) => f.path !== path) }))
  }
}
