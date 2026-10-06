import {
  createOracleEngine,
  loadPacks,
  type Diagnostic,
  type OracleEngine,
  type Registry,
} from '@open-tabletop/oracle-engine'
import { mathRandom } from '@open-tabletop/random'
import {
  effectivePacks,
  engineFiles,
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
  engine: OracleEngine = $derived(
    createOracleEngine({ registry: this.registry, random: mathRandom() }),
  )

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
        if (e.key === USER_PACKS_KEY) this.user = readUserPacks()
      })
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

  /** Replaces the user packs; returns false if they couldn't be saved (storage full). */
  setUserPacks(user: PackSource[]): boolean {
    this.user = user
    const saved = writeUserPacks(user)
    if (!saved) this.onStorageFull?.()
    return saved
  }

  private update(root: string, change: (pack: PackSource) => PackSource): void {
    this.setUserPacks(this.user.map((p) => (p.root === root ? change(p) : p)))
  }

  addPack(pack: PackSource): void {
    this.setUserPacks([
      ...this.user.filter((p) => p.root !== pack.root),
      { ...pack, origin: 'user' },
    ])
  }

  /** Copies a bundled pack into the user's packs, overriding it. */
  editCopy(root: string): void {
    const pack = this.pack(root)
    if (!pack || pack.origin === 'user') return
    this.addPack({ ...pack, origin: 'user', files: pack.files.map((f) => ({ ...f })) })
  }

  /** Deletes a user pack (for an edited bundled pack, this reverts to the bundled one). */
  removePack(root: string): void {
    this.setUserPacks(this.user.filter((p) => p.root !== root))
  }

  readFile(root: string, path: string): string | undefined {
    return this.pack(root)?.files.find((f) => f.path === path)?.content
  }

  writeFile(root: string, path: string, content: string): void {
    this.update(root, (p) => ({
      ...p,
      files: p.files.some((f) => f.path === path)
        ? p.files.map((f) => (f.path === path ? { path, content } : f))
        : [...p.files, { path, content }].sort((a, b) => a.path.localeCompare(b.path)),
    }))
  }

  renameFile(root: string, from: string, to: string): void {
    if (from === MANIFEST_FILE) return
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
